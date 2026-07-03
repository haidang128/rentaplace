import { demoLandlords, demoListings, demoReviews } from "@/lib/data/demo-data";
import {
  demoStore,
  type ChatMessage,
  type ContractExtract,
  type ContractSummary,
  type Conversation,
  type QueueItem,
  type Tenancy,
  type VerificationState,
} from "@/lib/data/demo-store";
import { isDemoMode, supabase } from "@/lib/supabase";
import type { DepositScheme, Landlord, Listing, Review, TrustTier } from "@/lib/types";

/**
 * Data access layer. Every screen goes through these functions; they hit
 * Supabase when configured and fall back to the demo dataset otherwise.
 */

function mapListing(row: any): Listing {
  return {
    id: row.id,
    landlordId: row.landlord_id,
    status: row.status,
    title: row.title,
    city: row.city,
    area: row.area,
    roomType: row.room_type,
    pricePcm: row.price_pcm,
    depositAmount: row.deposit_amount,
    billsIncluded: row.bills_included,
    vietnameseFlatmates: row.vietnamese_flatmates,
    nearUniversity: row.near_university,
    liveInLandlord: row.live_in_landlord,
    availableFrom: row.available_from,
    description: row.description,
    photosCheckedAt: row.photos_checked_at,
    photoUrls: (row.listing_photos ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((p: any) => p.path),
  };
}

export async function getLiveListings(): Promise<Listing[]> {
  if (isDemoMode) {
    const created = await demoStore.getCreatedListings();
    return [...demoListings, ...created].filter((l) => l.status === "live");
  }
  const { data, error } = await supabase!
    .from("listings")
    .select("*, listing_photos(path, sort_order)")
    .eq("status", "live")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapListing);
}

export async function getListing(id: string): Promise<Listing | null> {
  if (isDemoMode) return demoListings.find((l) => l.id === id) ?? null;
  const { data, error } = await supabase!
    .from("listings")
    .select("*, listing_photos(path, sort_order)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapListing(data) : null;
}

export async function getLandlord(id: string): Promise<Landlord | null> {
  if (isDemoMode) {
    const base = demoLandlords.find((l) => l.id === id);
    if (!base) return null;
    // Overlay live demo state so the trust ladder reacts to user actions.
    const overlay = await demoStore.getLandlordOverlay(id);
    const confirmations = base.stats.depositConfirmations + overlay.confirmations;
    const tier: TrustTier =
      confirmations > 0
        ? 3
        : overlay.verification.certificateStatus === "approved"
          ? 2
          : overlay.verification.schemeDeclared
            ? 1
            : 0;
    return {
      ...base,
      depositSchemeDeclared: overlay.verification.schemeDeclared,
      certificateReviewed: overlay.verification.certificateStatus === "approved",
      trustTier: tier,
      stats: { ...base.stats, depositConfirmations: confirmations },
    };
  }

  const [profileRes, publicRes, tierRes, statsRes] = await Promise.all([
    supabase!.from("profiles").select("id, display_name, city, created_at").eq("id", id).maybeSingle(),
    supabase!.from("landlord_public").select("*").eq("landlord_id", id).maybeSingle(),
    supabase!.rpc("deposit_trust_tier", { p_landlord_id: id }),
    supabase!.rpc("landlord_stats", { p_landlord_id: id }),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (!profileRes.data) return null;

  const pub = publicRes.data;
  const stats = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data;
  return {
    id: profileRes.data.id,
    displayName: profileRes.data.display_name,
    city: profileRes.data.city ?? "",
    memberSinceYear: new Date(profileRes.data.created_at).getFullYear(),
    identityVerified: pub?.identity_verified ?? false,
    rightToLetVerified: pub?.right_to_let_verified ?? false,
    depositSchemeDeclared: pub?.deposit_scheme_declared ?? null,
    certificateReviewed: pub?.certificate_reviewed ?? false,
    trustTier: (tierRes.data ?? 0) as TrustTier,
    stats: {
      completedTenancies: Number(stats?.completed_tenancies ?? 0),
      depositConfirmations: Number(stats?.deposit_confirmations ?? 0),
      depositsReturnedPct: stats?.deposits_returned_pct != null ? Number(stats.deposits_returned_pct) : null,
      responseTimeHours: null,
    },
  };
}

export async function getLandlordReviews(landlordId: string): Promise<Review[]> {
  if (isDemoMode) {
    const overlay = await demoStore.getLandlordOverlay(landlordId);
    const extra: Review[] = overlay.extraReviews.map((r, i) => ({
      id: `extra-${i}`,
      stars: r.stars,
      body: r.body,
      depositReturnedInFull: r.depositReturnedInFull,
      reviewerLabel: "",
    }));
    return [...extra, ...(demoReviews[landlordId] ?? [])];
  }
  const { data, error } = await supabase!
    .from("reviews")
    .select("id, stars, body, deposit_returned_in_full, tenancies!inner(listing_id, listings!inner(landlord_id))")
    .eq("tenancies.listings.landlord_id", landlordId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((r: any) => ({
    id: r.id,
    stars: r.stars,
    body: r.body,
    depositReturnedInFull: r.deposit_returned_in_full,
    reviewerLabel: "",
  }));
}

// ── M2: landlord verification, listings, admin queue ────────────────────────

export async function getMyVerification(landlordId: string): Promise<VerificationState> {
  if (isDemoMode) return demoStore.getVerification(landlordId);
  const { data, error } = await supabase!
    .from("landlord_verifications")
    .select("*")
    .eq("landlord_id", landlordId)
    .maybeSingle();
  if (error) throw error;
  return {
    identityStatus: data?.identity_status ?? "none",
    rightToLetStatus: data?.right_to_let_status ?? "none",
    schemeDeclared: data?.deposit_scheme_declared ?? null,
    certificateStatus: data?.certificate_status ?? "none",
  };
}

export async function submitVerificationDoc(
  landlordId: string,
  displayName: string,
  kind: "identity" | "right_to_let" | "certificate",
  filePath: string,
): Promise<void> {
  if (isDemoMode) {
    const patch: Partial<VerificationState> =
      kind === "identity"
        ? { identityStatus: "submitted" }
        : kind === "right_to_let"
          ? { rightToLetStatus: "submitted" }
          : { certificateStatus: "submitted" };
    await demoStore.updateVerification(landlordId, patch, displayName);
    return;
  }
  const column =
    kind === "identity"
      ? { identity_status: "submitted", identity_file: filePath }
      : kind === "right_to_let"
        ? { right_to_let_status: "submitted", right_to_let_file: filePath }
        : { certificate_status: "submitted", certificate_file: filePath };
  const { error } = await supabase!
    .from("landlord_verifications")
    .upsert({ landlord_id: landlordId, ...column });
  if (error) throw error;
  await supabase!.from("review_queue").insert({ type: kind, subject_id: landlordId });
}

export async function declareScheme(landlordId: string, scheme: DepositScheme): Promise<void> {
  if (isDemoMode) {
    await demoStore.updateVerification(landlordId, { schemeDeclared: scheme });
    return;
  }
  const { error } = await supabase!
    .from("landlord_verifications")
    .upsert({ landlord_id: landlordId, deposit_scheme_declared: scheme });
  if (error) throw error;
}

export type NewListingInput = Omit<Listing, "id" | "status" | "photosCheckedAt" | "photoUrls">;

export async function createListing(input: NewListingInput, landlordLabel: string): Promise<void> {
  if (isDemoMode) {
    await demoStore.addListing(
      {
        ...input,
        id: `demo-${Date.now()}`,
        status: "pending_review",
        photosCheckedAt: null,
        photoUrls: [],
      },
      `${input.title} — ${landlordLabel}`,
    );
    return;
  }
  const { data, error } = await supabase!
    .from("listings")
    .insert({
      landlord_id: input.landlordId,
      status: "pending_review",
      title: input.title,
      city: input.city,
      area: input.area,
      room_type: input.roomType,
      price_pcm: input.pricePcm,
      deposit_amount: input.depositAmount,
      bills_included: input.billsIncluded,
      vietnamese_flatmates: input.vietnameseFlatmates,
      near_university: input.nearUniversity,
      live_in_landlord: input.liveInLandlord,
      available_from: input.availableFrom,
      description: input.description,
    })
    .select("id")
    .single();
  if (error) throw error;
  await supabase!.from("review_queue").insert({ type: "photos", subject_id: data.id });
}

export async function getMyListings(landlordId: string): Promise<Listing[]> {
  if (isDemoMode) {
    const created = await demoStore.getCreatedListings(landlordId);
    return [...demoListings.filter((l) => l.landlordId === landlordId), ...created];
  }
  const { data, error } = await supabase!
    .from("listings")
    .select("*, listing_photos(path, sort_order)")
    .eq("landlord_id", landlordId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapListing);
}

export async function getSavedIds(userId: string | null): Promise<string[]> {
  if (isDemoMode || !userId) return demoStore.getSavedIds();
  const { data, error } = await supabase!.from("saved_listings").select("listing_id").eq("profile_id", userId);
  if (error) throw error;
  return data.map((r: any) => r.listing_id);
}

export async function toggleSaved(userId: string | null, listingId: string, saved: boolean): Promise<void> {
  if (isDemoMode || !userId) {
    await demoStore.toggleSaved(listingId);
    return;
  }
  if (saved) {
    await supabase!.from("saved_listings").delete().eq("profile_id", userId).eq("listing_id", listingId);
  } else {
    await supabase!.from("saved_listings").insert({ profile_id: userId, listing_id: listingId });
  }
}

export async function getReviewQueue(): Promise<QueueItem[]> {
  if (isDemoMode) return demoStore.getQueue();
  const { data, error } = await supabase!
    .from("review_queue")
    .select("id, type, subject_id, status, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((r: any) => ({
    id: r.id,
    type: r.type,
    subjectId: r.subject_id,
    subjectLabel: r.subject_id,
    status: r.status === "open" ? "open" : r.status,
    createdAt: r.created_at,
  }));
}

export async function resolveReview(id: string, resolution: "approved" | "rejected"): Promise<void> {
  if (isDemoMode) {
    await demoStore.resolveQueueItem(id, resolution);
    return;
  }
  const { error } = await supabase!
    .from("review_queue")
    .update({ status: resolution, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ── M5: tenancies, day-30 loop, reviews ──────────────────────────────────────

export async function getMyTenancies(renterId: string): Promise<Tenancy[]> {
  if (isDemoMode) return demoStore.getTenancies(renterId);
  const { data, error } = await supabase!
    .from("tenancies")
    .select("*, listings(title, landlord_id), deposit_confirmations(confirmed_at), reviews(id)")
    .eq("renter_id", renterId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((r: any) => ({
    id: r.id,
    listingId: r.listing_id,
    listingTitle: r.listings?.title ?? "",
    landlordId: r.listings?.landlord_id ?? "",
    renterId: r.renter_id,
    moveInDate: r.move_in_date,
    depositAmount: r.deposit_amount,
    scheme: r.scheme,
    isLodger: r.is_lodger,
    status: r.status,
    confirmedAt: r.deposit_confirmations?.confirmed_at ?? null,
    reviewed: (r.reviews ?? []).length > 0,
  }));
}

export async function createTenancy(
  input: Omit<Tenancy, "id" | "status" | "confirmedAt" | "reviewed">,
): Promise<Tenancy> {
  if (isDemoMode) return demoStore.createTenancy(input);
  const { data, error } = await supabase!
    .from("tenancies")
    .insert({
      listing_id: input.listingId,
      renter_id: input.renterId,
      move_in_date: input.moveInDate,
      deposit_amount: input.depositAmount,
      scheme: input.scheme,
      is_lodger: input.isLodger,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { ...input, id: data.id, status: "active", confirmedAt: null, reviewed: false };
}

export async function confirmDeposit(tenancyId: string, scheme: DepositScheme): Promise<void> {
  if (isDemoMode) {
    await demoStore.confirmDeposit(tenancyId);
    return;
  }
  const { error } = await supabase!.from("deposit_confirmations").insert({ tenancy_id: tenancyId, scheme });
  if (error) throw error;
}

export async function endTenancyWithReview(
  tenancyId: string,
  review: { stars: number; body: string; depositReturnedInFull: boolean },
): Promise<void> {
  if (isDemoMode) {
    await demoStore.endTenancyWithReview(tenancyId, review);
    return;
  }
  await supabase!.from("tenancies").update({ status: "ended" }).eq("id", tenancyId);
  const { error } = await supabase!.from("reviews").insert({
    tenancy_id: tenancyId,
    stars: review.stars,
    body: review.body,
    deposit_returned_in_full: review.depositReturnedInFull,
  });
  if (error) throw error;
}

// ── M6: contract summaries ───────────────────────────────────────────────────

function mapExtract(raw: any): ContractExtract {
  return {
    rentPcm: raw?.rent_pcm ?? raw?.rentPcm ?? null,
    rentDueDay: raw?.rent_due_day ?? raw?.rentDueDay ?? null,
    billsIncluded: raw?.bills_included ?? raw?.billsIncluded ?? null,
    depositAmount: raw?.deposit_amount ?? raw?.depositAmount ?? null,
    scheme: raw?.scheme_mentioned ?? raw?.scheme ?? null,
    noticeMonths: raw?.notice_months ?? raw?.noticeMonths ?? null,
    termType: raw?.term_type ?? raw?.termType ?? null,
    isLodgerAgreement: raw?.is_lodger_agreement ?? raw?.isLodgerAgreement ?? null,
    unusualClauses: raw?.unusual_clauses ?? raw?.unusualClauses ?? [],
  };
}

/** Approved-only for renters; landlord/admin see drafts via their own surfaces. */
export async function getApprovedContractSummary(listingId: string): Promise<ContractSummary | null> {
  if (isDemoMode) {
    const summary = await demoStore.getContractSummary(listingId);
    return summary?.status === "approved" ? summary : null;
  }
  const { data, error } = await supabase!
    .from("contract_summaries")
    .select("listing_id, status, extracted")
    .eq("listing_id", listingId)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  return data
    ? { listingId: data.listing_id, status: data.status, extracted: mapExtract(data.extracted) }
    : null;
}

export async function submitContract(
  listing: Listing,
  contractFilePath: string,
): Promise<void> {
  if (isDemoMode) {
    // Demo: fabricate a plausible draft from the listing (real mode runs Claude in the Edge Function).
    await demoStore.submitContract(listing.id, listing.title, {
      rentPcm: listing.pricePcm,
      rentDueDay: 1,
      billsIncluded: listing.billsIncluded,
      depositAmount: listing.depositAmount,
      scheme: null,
      noticeMonths: 2,
      termType: "periodic",
      isLodgerAgreement: listing.liveInLandlord,
      unusualClauses: [],
    });
    return;
  }
  const { data, error } = await supabase!
    .from("contract_summaries")
    .upsert({ listing_id: listing.id, contract_file: contractFilePath, status: "ai_draft" })
    .select("id")
    .single();
  if (error) throw error;
  const { error: fnError } = await supabase!.functions.invoke("summarize-contract", {
    body: { summary_id: data.id },
  });
  if (fnError) throw fnError;
}

// ── M4: chat ─────────────────────────────────────────────────────────────────

export async function getConversations(userId: string): Promise<Conversation[]> {
  if (isDemoMode) return demoStore.getConversations(userId);
  const { data, error } = await supabase!
    .from("conversations")
    .select(
      "id, listing_id, renter_id, landlord_id, created_at, listings(title), renter:profiles!conversations_renter_id_fkey(display_name), landlord:profiles!conversations_landlord_id_fkey(display_name)",
    )
    .or(`renter_id.eq.${userId},landlord_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((r: any) => ({
    id: r.id,
    listingId: r.listing_id,
    listingTitle: r.listings?.title ?? "",
    renterId: r.renter_id,
    renterName: r.renter?.display_name ?? "",
    landlordId: r.landlord_id,
    landlordName: r.landlord?.display_name ?? "",
    lastMessageAt: r.created_at,
  }));
}

export async function getOrCreateConversation(
  input: Omit<Conversation, "id" | "lastMessageAt">,
): Promise<Conversation> {
  if (isDemoMode) return demoStore.getOrCreateConversation(input);
  const { data: existing } = await supabase!
    .from("conversations")
    .select("id, created_at")
    .eq("listing_id", input.listingId)
    .eq("renter_id", input.renterId)
    .maybeSingle();
  if (existing) return { ...input, id: existing.id, lastMessageAt: existing.created_at };
  const { data, error } = await supabase!
    .from("conversations")
    .insert({ listing_id: input.listingId, renter_id: input.renterId, landlord_id: input.landlordId })
    .select("id, created_at")
    .single();
  if (error) throw error;
  return { ...input, id: data.id, lastMessageAt: data.created_at };
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  if (isDemoMode) return demoStore.getMessages(conversationId);
  const { data, error } = await supabase!
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((r: any) => ({
    id: r.id,
    conversationId: r.conversation_id,
    senderId: r.sender_id,
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<ChatMessage> {
  if (isDemoMode) return demoStore.sendMessage(conversationId, senderId, body);
  const { data, error } = await supabase!
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select("id, conversation_id, sender_id, body, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    body: data.body,
    createdAt: data.created_at,
  };
}

/** Live-mode realtime subscription; no-op unsubscribe in demo mode. */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
): () => void {
  if (isDemoMode) return () => {};
  const channel = supabase!
    .channel(`messages-${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        const r = payload.new as any;
        onMessage({
          id: r.id,
          conversationId: r.conversation_id,
          senderId: r.sender_id,
          body: r.body,
          createdAt: r.created_at,
        });
      },
    )
    .subscribe();
  return () => {
    supabase!.removeChannel(channel);
  };
}

export async function joinWaitlist(entry: {
  email?: string;
  zalo?: string;
  lang: string;
  city?: string;
}): Promise<{ ok: boolean }> {
  if (isDemoMode) return { ok: true };
  const { error } = await supabase!.from("waitlist").insert(entry);
  if (error) throw error;
  return { ok: true };
}
