import { demoLandlords, demoListings, demoReviews } from "@/lib/data/demo-data";
import {
  demoStore,
  type ChatMessage,
  type ContractExtract,
  type ContractSummary,
  type Conversation,
  type OpenedReason,
  type QueueItem,
  type Tenancy,
  type VerificationState,
} from "@/lib/data/demo-store";
import { isDemoMode, supabase } from "@/lib/supabase";
import type { DepositScheme, Landlord, Listing, Review, TrustTier } from "@/lib/types";
import { publicPhotoUrl, uploadToBucket } from "@/lib/upload";

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
      .map((p: any) => publicPhotoUrl(p.path)),
  };
}

/** Demo seed data is immutable, so edits and archives are kept as an overlay. */
async function withDemoOverrides(rows: Listing[]): Promise<Listing[]> {
  const overrides = await demoStore.getListingOverrides();
  return rows.map((l) => (overrides[l.id] ? { ...l, ...overrides[l.id] } : l));
}

export async function getLiveListings(): Promise<Listing[]> {
  if (isDemoMode) {
    const created = await demoStore.getCreatedListings();
    const all = await withDemoOverrides([...demoListings, ...created]);
    return all.filter((l) => l.status === "live");
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
  if (isDemoMode) {
    const created = await demoStore.getCreatedListings();
    const match = [...demoListings, ...created].find((l) => l.id === id);
    if (!match) return null;
    return (await withDemoOverrides([match]))[0];
  }
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

function fileLabel(path: string | null): string | undefined {
  return path ? path.split("/").pop() : undefined;
}

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
    files: {
      identity: fileLabel(data?.identity_file ?? null),
      right_to_let: fileLabel(data?.right_to_let_file ?? null),
      certificate: fileLabel(data?.certificate_file ?? null),
    },
  };
}

export async function submitVerificationDoc(
  landlordId: string,
  displayName: string,
  kind: "identity" | "right_to_let" | "certificate",
  file: { uri: string; name: string; mimeType: string },
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
  // Real upload to the private certificates bucket, then record the path.
  const storagePath = await uploadToBucket(
    "certificates",
    `${landlordId}/${kind}-${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`,
    file.uri,
    file.mimeType,
  );
  const column =
    kind === "identity"
      ? { identity_status: "submitted", identity_file: storagePath }
      : kind === "right_to_let"
        ? { right_to_let_status: "submitted", right_to_let_file: storagePath }
        : { certificate_status: "submitted", certificate_file: storagePath };
  const { error } = await supabase!
    .from("landlord_verifications")
    .upsert({ landlord_id: landlordId, ...column });
  if (error) throw error;
  await openReviewItem(kind, landlordId);
}

/** Admin: storage paths of a landlord's verification documents. */
export async function getVerificationDocPaths(
  landlordId: string,
): Promise<Partial<Record<"identity" | "right_to_let" | "certificate", string>>> {
  if (isDemoMode) return {};
  const { data, error } = await supabase!
    .from("landlord_verifications")
    .select("identity_file, right_to_let_file, certificate_file")
    .eq("landlord_id", landlordId)
    .maybeSingle();
  if (error) throw error;
  return {
    identity: data?.identity_file ?? undefined,
    right_to_let: data?.right_to_let_file ?? undefined,
    certificate: data?.certificate_file ?? undefined,
  };
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

/**
 * Landlord's contact number. Reads go through a signed-in-only RPC so anon
 * callers (who can read profiles) can't scrape numbers; writes hit the
 * owner-restricted landlord_contacts table. Returns null when unset or hidden.
 */
export async function getLandlordPhone(landlordId: string): Promise<string | null> {
  if (isDemoMode) return demoStore.getLandlordPhone(landlordId);
  const { data, error } = await supabase!.rpc("get_landlord_phone", { p_landlord_id: landlordId });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function setLandlordPhone(landlordId: string, phone: string): Promise<void> {
  if (isDemoMode) {
    await demoStore.setLandlordPhone(landlordId, phone);
    return;
  }
  const trimmed = phone.trim();
  const { error } = await supabase!
    .from("landlord_contacts")
    .upsert({ landlord_id: landlordId, phone: trimmed || null });
  if (error) throw error;
}

export type NewListingInput = Omit<Listing, "id" | "status" | "photosCheckedAt" | "photoUrls">;

export async function createListing(input: NewListingInput, landlordLabel: string): Promise<string> {
  if (isDemoMode) {
    const id = `demo-${Date.now()}`;
    await demoStore.addListing(
      {
        ...input,
        id,
        status: "pending_review",
        photosCheckedAt: null,
        photoUrls: [],
      },
      `${input.title} — ${landlordLabel}`,
    );
    return id;
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
  const { error: queueError } = await supabase!
    .from("review_queue")
    .insert({ type: "photos", subject_id: data.id, opened_reason: "new" });
  if (queueError) throw queueError;
  return data.id;
}

/** Upload listing photos (picked local uris) and attach them to the listing. */
export async function uploadListingPhotos(listingId: string, uris: string[], startOrder = 0): Promise<void> {
  if (isDemoMode) {
    await demoStore.setListingPhotos(listingId, uris);
    return;
  }
  // Compress before upload: ~300KB instead of 2-4MB per phone photo, a ~10x
  // saving on both storage and bandwidth (the two Supabase cost drivers).
  const { ImageManipulator, SaveFormat } = await import("expo-image-manipulator");
  for (let i = 0; i < uris.length; i++) {
    const context = ImageManipulator.manipulate(uris[i]);
    context.resize({ width: 1600 });
    const rendered = await context.renderAsync();
    const compressed = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    const path = await uploadToBucket(
      "listing-photos",
      `${listingId}/${Date.now()}-${i}.jpg`,
      compressed.uri,
      "image/jpeg",
    );
    const { error } = await supabase!
      .from("listing_photos")
      .insert({ listing_id: listingId, path, sort_order: startOrder + i });
    if (error) throw error;
  }
}

export type ListingPhoto = { id: string; path: string; url: string; sortOrder: number };

export async function getListingPhotos(listingId: string): Promise<ListingPhoto[]> {
  if (isDemoMode) {
    const created = await demoStore.getCreatedListings();
    const listing = created.find((l) => l.id === listingId) ?? demoListings.find((l) => l.id === listingId);
    return (listing?.photoUrls ?? []).map((url, i) => ({ id: url, path: url, url, sortOrder: i }));
  }
  const { data, error } = await supabase!
    .from("listing_photos")
    .select("id, path, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order");
  if (error) throw error;
  return data.map((r: any) => ({
    id: r.id,
    path: r.path,
    url: publicPhotoUrl(r.path),
    sortOrder: r.sort_order,
  }));
}

/** Append photos to an existing listing. Live listings get a fresh photos-review item. */
export async function addListingPhotos(listing: Listing, uris: string[]): Promise<void> {
  if (isDemoMode) {
    const existing = await getListingPhotos(listing.id);
    await demoStore.setListingPhotos(listing.id, [...existing.map((p) => p.url), ...uris]);
    return;
  }
  const existing = await getListingPhotos(listing.id);
  const startOrder = existing.length ? Math.max(...existing.map((p) => p.sortOrder)) + 1 : 0;
  await uploadListingPhotos(listing.id, uris, startOrder);
  if (listing.status === "live") {
    // Ad stays live; the new photos get re-reviewed alongside it. Dedupe so
    // adding photos one-at-a-time doesn't file the same item several times.
    await openReviewItem("photos", listing.id, "photos");
  }
}

export async function removeListingPhoto(listing: Listing, photo: ListingPhoto): Promise<void> {
  if (isDemoMode) {
    const existing = await getListingPhotos(listing.id);
    await demoStore.setListingPhotos(
      listing.id,
      existing.filter((p) => p.id !== photo.id).map((p) => p.url),
    );
    return;
  }
  const { error } = await supabase!.from("listing_photos").delete().eq("id", photo.id);
  if (error) throw error;
  // Also free the blob (needs the owner-delete storage policy from migration 5;
  // best-effort — the photo is already gone from the listing either way).
  try {
    await supabase!.storage.from("listing-photos").remove([photo.path]);
  } catch {}
}

export async function getMyListings(landlordId: string): Promise<Listing[]> {
  if (isDemoMode) {
    const created = await demoStore.getCreatedListings(landlordId);
    const mine = await withDemoOverrides([
      ...demoListings.filter((l) => l.landlordId === landlordId),
      ...created,
    ]);
    return mine.filter((l) => l.status !== "archived");
  }
  const { data, error } = await supabase!
    .from("listings")
    .select("*, listing_photos(path, sort_order)")
    .eq("landlord_id", landlordId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapListing);
}

/** Everything a landlord may change after publishing — never the owner or status. */
export type ListingEdit = Omit<NewListingInput, "landlordId">;

/**
 * Where the listing stands with the review team, from its latest photos item:
 * "open" = waiting on an admin, "rejected" = sent back, "none" = approved or
 * never submitted. Drives what My listings tells the landlord to do next.
 */
export type ListingReviewState = "none" | "open" | "rejected";

/** The state plus, when rejected, the admin's reason for the landlord to read. */
export type ListingReview = { state: ListingReviewState; note: string | null };

export async function getListingReview(listingId: string): Promise<ListingReview> {
  if (isDemoMode) return demoStore.getListingReview(listingId);
  const { data, error } = await supabase!
    .from("review_queue")
    .select("status, resolution_note")
    .eq("type", "photos")
    .eq("subject_id", listingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { state: "none", note: null };
  const state: ListingReviewState =
    data.status === "open" ? "open" : data.status === "rejected" ? "rejected" : "none";
  return { state, note: state === "rejected" ? (data.resolution_note ?? null) : null };
}

export async function updateListing(id: string, input: ListingEdit): Promise<void> {
  if (isDemoMode) {
    await demoStore.overrideListing(id, input);
    const current = await getListing(id);
    const { state } = await demoStore.getListingReview(id);
    if (state !== "open" && (current?.status === "draft" || state === "rejected")) {
      await demoStore.resubmitListing(id, input.title, current?.status !== "live", "edit");
    }
    return;
  }
  const { data, error } = await supabase!
    .from("listings")
    .update({
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
    .eq("id", id)
    .select("status")
    .single();
  if (error) throw error;

  // Saving an edit is how a landlord re-submits: after a rejection, or for a
  // listing that never made it past draft. Without this the listing sits there
  // with no queue item for an admin to pick up. A listing that is already live
  // stays live while the change is re-reviewed — same as adding photos to a live
  // ad — so a rejected edit never pulls the approved version off the market.
  const { state } = await getListingReview(id);
  if (state !== "open" && (data.status === "draft" || state === "rejected")) {
    if (data.status !== "live") {
      const { error: statusError } = await supabase!
        .from("listings")
        .update({ status: "pending_review" })
        .eq("id", id);
      if (statusError) throw statusError;
    }
    await openReviewItem("photos", id, "edit");
  }
}

/**
 * Landlord-facing "delete". Archiving rather than deleting keeps the tenancies,
 * reviews and deposit confirmations hanging off the listing intact — those are
 * the trust record, and a row delete would cascade them away.
 */
export async function archiveListing(id: string): Promise<void> {
  if (isDemoMode) {
    await demoStore.overrideListing(id, { status: "archived" });
    return;
  }
  const { error } = await supabase!.from("listings").update({ status: "archived" }).eq("id", id);
  if (error) throw error;
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

/**
 * Open a review item, but never a duplicate: if one is already open for this
 * subject+type it's a no-op. A partial unique index (migration 7) is the real
 * guard; the pre-check just avoids a noisy error on the common path, and we
 * swallow the unique-violation (23505) that a concurrent insert would raise.
 */
async function openReviewItem(
  type: QueueItem["type"],
  subjectId: string,
  reason?: OpenedReason,
): Promise<void> {
  const { data: existing } = await supabase!
    .from("review_queue")
    .select("id, opened_reason")
    .eq("type", type)
    .eq("subject_id", subjectId)
    .eq("status", "open")
    .maybeSingle();
  if (existing) {
    // Already queued. If this change is of a different kind than the one that
    // filed it, widen the reason so the admin isn't told "new photos" when the
    // price moved too.
    if (reason && existing.opened_reason && existing.opened_reason !== reason) {
      await supabase!.from("review_queue").update({ opened_reason: "both" }).eq("id", existing.id);
    }
    return;
  }
  const { error } = await supabase!
    .from("review_queue")
    .insert({ type, subject_id: subjectId, opened_reason: reason ?? null });
  if (error && error.code !== "23505") throw error;
}

export async function getReviewQueue(): Promise<QueueItem[]> {
  if (isDemoMode) return demoStore.getQueue();
  const { data, error } = await supabase!
    .from("review_queue")
    .select("id, type, subject_id, status, created_at, opened_reason, resolution_note")
    .order("created_at", { ascending: true });
  if (error) throw error;

  // Resolve human-readable labels: listing titles for photos, landlord names for
  // verification docs, listing titles (via summary) for contracts.
  const listingIds = data.filter((r: any) => r.type === "photos").map((r: any) => r.subject_id);
  const profileIds = data
    .filter((r: any) => ["identity", "right_to_let", "certificate"].includes(r.type))
    .map((r: any) => r.subject_id);
  const summaryIds = data.filter((r: any) => r.type === "contract_summary").map((r: any) => r.subject_id);

  const labels = new Map<string, string>();
  if (listingIds.length > 0) {
    const { data: rows } = await supabase!.from("listings").select("id, title").in("id", listingIds);
    rows?.forEach((row: any) => labels.set(row.id, row.title));
  }
  if (profileIds.length > 0) {
    const { data: rows } = await supabase!.from("profiles").select("id, display_name").in("id", profileIds);
    rows?.forEach((row: any) => labels.set(row.id, row.display_name));
  }
  if (summaryIds.length > 0) {
    const { data: rows } = await supabase!
      .from("contract_summaries")
      .select("id, listings(title)")
      .in("id", summaryIds);
    rows?.forEach((row: any) => labels.set(row.id, row.listings?.title ?? row.id));
  }

  return data.map((r: any) => ({
    id: r.id,
    type: r.type,
    subjectId: r.subject_id,
    subjectLabel: labels.get(r.subject_id) ?? r.subject_id,
    status: r.status === "open" ? "open" : r.status,
    createdAt: r.created_at,
    openedReason: r.opened_reason ?? null,
    resolutionNote: r.resolution_note ?? null,
  }));
}

export async function resolveReview(
  id: string,
  resolution: "approved" | "rejected",
  note?: string,
): Promise<void> {
  if (isDemoMode) {
    await demoStore.resolveQueueItem(id, resolution, note);
    return;
  }
  const { error } = await supabase!
    .from("review_queue")
    .update({
      status: resolution,
      resolved_at: new Date().toISOString(),
      resolution_note: resolution === "rejected" ? (note?.trim() || null) : null,
    })
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
  // Review first: if it fails the tenancy stays active, so the renter still has
  // the "end tenancy & review" entry point and can retry. Ending first would
  // hide the form for good and lose the rating.
  const { error } = await supabase!.from("reviews").insert({
    tenancy_id: tenancyId,
    stars: review.stars,
    body: review.body,
    deposit_returned_in_full: review.depositReturnedInFull,
  });
  if (error) throw error;
  const { error: endError } = await supabase!
    .from("tenancies")
    .update({ status: "ended" })
    .eq("id", tenancyId);
  if (endError) throw endError;
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
    // Demo: prefill a draft from the listing; the admin edits it in the review form.
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
  const { error: queueError } = await supabase!
    .from("review_queue")
    .insert({ type: "contract_summary", subject_id: data.id });
  if (queueError) throw queueError;
  // AI pre-fill is optional: if the Edge Function isn't deployed (no Anthropic key),
  // the admin fills the summary manually in the review form.
  try {
    await supabase!.functions.invoke("summarize-contract", { body: { summary_id: data.id } });
  } catch {
    // manual path — admin enters the fields in the queue
  }
}

/** Draft summary for the admin review form. subjectId = listing id (demo) / summary id (live). */
export async function getContractDraft(subjectId: string): Promise<ContractExtract | null> {
  if (isDemoMode) {
    const summary = await demoStore.getContractSummary(subjectId);
    return summary?.extracted ?? null;
  }
  const { data, error } = await supabase!
    .from("contract_summaries")
    .select("extracted")
    .eq("id", subjectId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapExtract(data.extracted) : null;
}

/** Admin: storage path of the uploaded contract PDF for a summary under review. */
export async function getContractFilePath(summaryId: string): Promise<string | null> {
  if (isDemoMode) return null;
  const { data, error } = await supabase!
    .from("contract_summaries")
    .select("contract_file")
    .eq("id", summaryId)
    .maybeSingle();
  if (error) throw error;
  return data?.contract_file ?? null;
}

export async function saveContractDraft(subjectId: string, extracted: ContractExtract): Promise<void> {
  if (isDemoMode) {
    await demoStore.updateContractDraft(subjectId, extracted);
    return;
  }
  const { error } = await supabase!
    .from("contract_summaries")
    .update({
      extracted: {
        rent_pcm: extracted.rentPcm,
        rent_due_day: extracted.rentDueDay,
        bills_included: extracted.billsIncluded,
        deposit_amount: extracted.depositAmount,
        scheme_mentioned: extracted.scheme,
        notice_months: extracted.noticeMonths,
        term_type: extracted.termType,
        is_lodger_agreement: extracted.isLodgerAgreement,
        unusual_clauses: extracted.unusualClauses,
      },
    })
    .eq("id", subjectId);
  if (error) throw error;
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
