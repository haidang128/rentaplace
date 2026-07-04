import * as FileSystem from "expo-file-system/legacy";

import { isDemoMode, supabase } from "@/lib/supabase";

/**
 * Upload a locally-picked file (DocumentPicker / ImagePicker uri) to a
 * Supabase Storage bucket. Returns the storage path. Demo mode: no-op echo.
 */
export async function uploadToBucket(
  bucket: "listing-photos" | "certificates" | "contracts",
  path: string,
  uri: string,
  contentType: string,
): Promise<string> {
  if (isDemoMode) return uri;

  const MAX_BYTES = 15 * 1024 * 1024; // keep storage costs bounded
  let body: ArrayBuffer | Blob;
  if (process.env.EXPO_OS === "web") {
    body = await (await fetch(uri)).blob();
    if (body.size > MAX_BYTES) throw new Error("File too large (max 15 MB)");
  } else {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    if (bytes.length > MAX_BYTES) throw new Error("File too large (max 15 MB)");
    body = bytes.buffer as ArrayBuffer;
  }

  const { error } = await supabase!.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

/** Public URL for a listing photo path (demo mode passes local uris through). */
export function publicPhotoUrl(path: string): string {
  if (isDemoMode || path.startsWith("http") || path.startsWith("file:") || path.startsWith("content:")) {
    return path;
  }
  return supabase!.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;
}

/**
 * Best-effort removal of every file a user uploaded, called before account
 * deletion so the actual blobs are freed (the delete_account RPC only removes
 * metadata rows as a fallback). Never throws — deletion must not be blocked
 * by a storage hiccup.
 */
export async function purgeMyStorage(userId: string): Promise<void> {
  if (isDemoMode) return;
  try {
    // Verification docs live under certificates/{userId}/…
    await removeFolder("certificates", userId);
    // Listing photos and contracts live under {bucket}/{listingId}/…
    const { data: listings } = await supabase!
      .from("listings")
      .select("id")
      .eq("landlord_id", userId);
    for (const { id } of listings ?? []) {
      await removeFolder("listing-photos", id);
      await removeFolder("contracts", id);
    }
  } catch {
    // fall through — the RPC's metadata cleanup keeps the files unreachable
  }
}

async function removeFolder(bucket: string, folder: string): Promise<void> {
  const { data } = await supabase!.storage.from(bucket).list(folder, { limit: 100 });
  const paths = (data ?? []).map((f) => `${folder}/${f.name}`);
  if (paths.length) await supabase!.storage.from(bucket).remove(paths);
}

/** Short-lived signed URL for a private document (admin review). */
export async function signedDocUrl(
  bucket: "certificates" | "contracts",
  path: string,
): Promise<string> {
  const { data, error } = await supabase!.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
