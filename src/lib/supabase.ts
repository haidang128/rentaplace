import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when no Supabase project is configured — the app then serves demo data. */
export const isDemoMode = !url || !anonKey;

// On web (including Node static prerendering) let supabase use its SSR-safe
// default storage; AsyncStorage is native-only and touches `window` at import.
const isWeb = process.env.EXPO_OS === "web";
const isServer = typeof window === "undefined";

export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(url!, anonKey!, {
      auth: {
        ...(isWeb ? {} : { storage: AsyncStorage }),
        autoRefreshToken: !isServer,
        persistSession: !isServer,
        // On web, pick up the session from the email-confirmation redirect
        // (/confirmed) so desktop users land already signed in.
        detectSessionInUrl: isWeb && !isServer,
      },
    });
