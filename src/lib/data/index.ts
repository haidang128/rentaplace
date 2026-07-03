import { demoLandlords, demoListings, demoReviews } from "@/lib/data/demo-data";
import { isDemoMode, supabase } from "@/lib/supabase";
import type { Landlord, Listing, Review, TrustTier } from "@/lib/types";

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
  if (isDemoMode) return demoListings.filter((l) => l.status === "live");
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
