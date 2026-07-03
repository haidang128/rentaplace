// Supabase Edge Function: extract a structured tenancy-contract summary with Claude.
// Flow: landlord uploads contract PDF to the private `contracts` bucket and inserts a
// contract_summaries row -> client invokes this function -> Claude extracts the fields
// -> row updated with extracted jsonb (status stays ai_draft) -> review_queue item for
// admin approval. Nothing is renter-visible until an admin approves.
//
// Secrets required: ANTHROPIC_API_KEY (supabase secrets set ANTHROPIC_API_KEY=...)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "rent_pcm",
    "rent_due_day",
    "bills_included",
    "deposit_amount",
    "scheme_mentioned",
    "notice_months",
    "term_type",
    "is_lodger_agreement",
    "unusual_clauses",
  ],
  properties: {
    rent_pcm: { type: ["number", "null"], description: "Monthly rent in GBP" },
    rent_due_day: { type: ["integer", "null"], description: "Day of month rent is due" },
    bills_included: { type: ["boolean", "null"] },
    deposit_amount: { type: ["number", "null"], description: "Deposit in GBP" },
    scheme_mentioned: {
      type: ["string", "null"],
      enum: ["dps", "mydeposits", "tds", null],
      description: "Deposit protection scheme named in the contract, if any",
    },
    notice_months: { type: ["number", "null"], description: "Tenant notice period in months" },
    term_type: {
      type: ["string", "null"],
      enum: ["periodic", "fixed", null],
      description:
        "Periodic assured tenancy (England standard since May 2026) or a fixed term (flag if fixed — likely outdated for new lets)",
    },
    is_lodger_agreement: {
      type: ["boolean", "null"],
      description: "True if this is a lodger/licence agreement with a live-in landlord (deposit protection law does not apply)",
    },
    unusual_clauses: {
      type: "array",
      description: "Clauses a tenant should be warned about, in plain English (empty if none)",
      items: { type: "string" },
    },
  },
} as const;

Deno.serve(async (req) => {
  try {
    const { summary_id } = await req.json();
    if (!summary_id) {
      return Response.json({ error: "summary_id required" }, { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: summary, error: summaryError } = await supabase
      .from("contract_summaries")
      .select("id, listing_id, contract_file, status")
      .eq("id", summary_id)
      .single();
    if (summaryError || !summary) {
      return Response.json({ error: "summary not found" }, { status: 404 });
    }

    const { data: pdf, error: downloadError } = await supabase.storage
      .from("contracts")
      .download(summary.contract_file);
    if (downloadError || !pdf) {
      return Response.json({ error: "contract file not found" }, { status: 404 });
    }

    // Base64 without newlines, chunked to avoid call-stack limits on large files.
    const bytes = new Uint8Array(await pdf.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const pdfBase64 = btoa(binary);

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { format: { type: "json_schema", schema: extractionSchema } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            {
              type: "text",
              text: [
                "Extract the tenancy contract fields defined by the output schema from this UK rental contract.",
                "Context: England, post-Renters' Rights Act 2025 (ASTs no longer exist for new lets; the standard is a periodic assured tenancy with 2 months' tenant notice; deposits capped at 5 weeks' rent and must be protected with DPS, mydeposits or TDS within 30 days — unless this is a lodger/licence agreement with a live-in landlord, where deposit protection law does not apply).",
                "For unusual_clauses: list, in plain English, any clause a tenant should be warned about — prohibited fees, deposit above the legal cap, fixed terms, unfair deductions, clauses that contradict statute. Empty array if none.",
                "Use null for any field the contract does not state.",
              ].join("\n"),
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ error: "extraction refused" }, { status: 422 });
    }
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "no extraction output" }, { status: 502 });
    }
    const extracted = JSON.parse(textBlock.text);

    // The client created the review_queue item at upload time; this function only
    // pre-fills the draft. Admin approval flips status via the reflection trigger.
    const { error: updateError } = await supabase
      .from("contract_summaries")
      .update({ extracted, status: "ai_draft" })
      .eq("id", summary.id);
    if (updateError) throw updateError;

    return Response.json({ ok: true, extracted });
  } catch (err) {
    console.error(err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
});
