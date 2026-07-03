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

  let body: ArrayBuffer | Blob;
  if (process.env.EXPO_OS === "web") {
    body = await (await fetch(uri)).blob();
  } else {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
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

/** Short-lived signed URL for a private document (admin review). */
export async function signedDocUrl(
  bucket: "certificates" | "contracts",
  path: string,
): Promise<string> {
  const { data, error } = await supabase!.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
