import { demoLandlords, demoListings, demoReviews } from "@/lib/data/demo-data";
import { demoStore, type QueueItem, type VerificationState } from "@/lib/data/demo-store";
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
  if (isDemoMode) return demoLandlords.find((l) => l.id === id) ?? null;

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
  if (isDemoMode) return demoReviews[landlordId] ?? [];
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
