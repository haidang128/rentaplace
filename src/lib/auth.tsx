import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

import { isDemoMode, supabase } from "@/lib/supabase";
import { purgeMyStorage } from "@/lib/upload";

export type Role = "renter" | "landlord" | "admin";

export type Session = {
  userId: string;
  role: Role;
  displayName: string;
};

/** Demo personas mirror supabase/seed.sql so both modes share ids. */
export const demoPersonas: Record<string, Session> = {
  renter: {
    userId: "00000000-0000-4000-8000-000000000003",
    role: "renter",
    displayName: "Mai Phạm",
  },
  landlord: {
    userId: "00000000-0000-4000-8000-000000000001",
    role: "landlord",
    displayName: "Hùng Trần",
  },
  landlordNew: {
    userId: "00000000-0000-4000-8000-000000000002",
    role: "landlord",
    displayName: "Lan Nguyễn",
  },
  admin: {
    userId: "00000000-0000-4000-8000-000000000004",
    role: "admin",
    displayName: "RentAPlace Admin",
  },
};

const DEMO_SESSION_KEY = "rentaplace.demo-session";

/** Where the confirmation email's link lands — the web app serves /confirmed. */
/** Sentinel thrown for a wrong password; the UI swaps it for a translated string. */
export const WRONG_PASSWORD = "auth.wrongPassword";

const RESET_REDIRECT = `${process.env.EXPO_PUBLIC_WEB_URL ?? "https://rentaplace.expo.app"}/reset-password`;

const CONFIRM_REDIRECT = `${process.env.EXPO_PUBLIC_WEB_URL ?? "https://rentaplace.expo.app"}/confirmed`;

/**
 * "confirm-email" means the account exists but the address is unverified —
 * only happens once "Confirm email" is switched on in Supabase (see README);
 * with auto-confirm the outcome is always "signed-in".
 */
export type SignInOutcome = "signed-in" | "confirm-email";

type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  /** Demo mode only: sign in as a seeded persona. */
  signInDemo: (persona: keyof typeof demoPersonas) => void;
  /** Real mode: email + password. Signs up automatically on first login. */
  signInWithPassword: (email: string, password: string) => Promise<SignInOutcome>;
  /** Email a recovery link. Resolves even for an unknown address, so the call
   *  cannot be used to find out which emails have accounts. */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Set a new password for the session the recovery link established. */
  updatePassword: (password: string) => Promise<void>;
  /** Re-send the signup confirmation email (rate-limited by Supabase). */
  resendConfirmation: (email: string) => Promise<void>;
  /** Real mode: renter -> landlord self-serve upgrade (server-enforced, never admin). */
  becomeLandlord: () => Promise<void>;
  signOut: () => void;
  /** Permanently delete the account and all its data. Admins are refused server-side. */
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      AsyncStorage.getItem(DEMO_SESSION_KEY).then((raw) => {
        if (raw) {
          try {
            setSession(JSON.parse(raw));
          } catch {}
        }
        setReady(true);
      });
      return;
    }

    supabase!.auth.getSession().then(async ({ data }) => {
      if (data.session) setSession(await loadProfile(data.session.user.id));
      setReady(true);
    });
    const { data: sub } = supabase!.auth.onAuthStateChange(async (_event, s) => {
      setSession(s ? await loadProfile(s.user.id) : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInDemo = useCallback((persona: keyof typeof demoPersonas) => {
    const s = demoPersonas[persona];
    setSession(s);
    AsyncStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(s)).catch(() => {});
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<SignInOutcome> => {
      if (isDemoMode) return "signed-in";
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (!error) return "signed-in";
      const message = error.message.toLowerCase();
      // Signed up earlier but never clicked the confirmation link.
      if (message.includes("email not confirmed")) return "confirm-email";
      // First visit: create the account.
      if (message.includes("invalid login credentials")) {
        const { data, error: signUpError } = await supabase!.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: CONFIRM_REDIRECT },
        });
        // The email is taken, so this was never a first visit — the sign-in
        // above failed because the password is wrong. Saying "User already
        // registered" here describes the signUp we attempted, not the problem
        // the person actually has, and leaves them with nothing to act on.
        if (
          signUpError?.code === "user_already_exists" ||
          signUpError?.message?.toLowerCase().includes("already registered")
        ) {
          throw new Error(WRONG_PASSWORD);
        }
        if (signUpError) throw signUpError;
        if (data.session) return "signed-in"; // auto-confirm on
        // Confirmation required: a genuinely new user carries identities; an
        // already-registered email comes back as an obfuscated stub without
        // any — which here means the password was wrong.
        if (data.user?.identities?.length) return "confirm-email";
        throw new Error(WRONG_PASSWORD);
      }
      throw error;
    },
    [],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    if (isDemoMode) return;
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_REDIRECT,
    });
    // Supabase does not reveal whether the address exists, and neither do we:
    // the screen says the same thing either way. Only surface real failures,
    // such as the rate limit on the shared mail sender.
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (isDemoMode) return;
    const { data, error } = await supabase!.auth.updateUser({ password });
    if (error) throw error;
    // The recovery link already signed them in, so refresh the profile rather
    // than making them log in again with the password they just set.
    if (data.user) setSession(await loadProfile(data.user.id));
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    if (isDemoMode) return;
    const { error } = await supabase!.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: CONFIRM_REDIRECT },
    });
    if (error) throw error;
  }, []);

  const becomeLandlord = useCallback(async () => {
    if (isDemoMode) return;
    const { error } = await supabase!.rpc("become_landlord");
    if (error) throw error;
    const { data } = await supabase!.auth.getSession();
    if (data.session) setSession(await loadProfile(data.session.user.id));
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    if (isDemoMode) {
      AsyncStorage.removeItem(DEMO_SESSION_KEY).catch(() => {});
    } else {
      supabase!.auth.signOut();
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    if (isDemoMode) {
      // Demo personas are shared seed data — just end the local session.
      setSession(null);
      AsyncStorage.removeItem(DEMO_SESSION_KEY).catch(() => {});
      return;
    }
    const { data } = await supabase!.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    // Free the storage blobs first (best-effort); the RPC then deletes the
    // auth user and everything cascades.
    await purgeMyStorage(userId);
    const { error } = await supabase!.rpc("delete_account");
    if (error) throw error;
    setSession(null);
    // Clear the now-orphaned local tokens; the server user is already gone.
    supabase!.auth.signOut().catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ session, ready, signInDemo, signInWithPassword, requestPasswordReset, updatePassword, resendConfirmation, becomeLandlord, signOut, deleteAccount }),
    [session, ready, signInDemo, signInWithPassword, requestPasswordReset, updatePassword, resendConfirmation, becomeLandlord, signOut, deleteAccount],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

async function loadProfile(userId: string): Promise<Session> {
  const { data } = await supabase!
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", userId)
    .single();
  return {
    userId,
    role: (data?.role ?? "renter") as Role,
    displayName: data?.display_name ?? "",
  };
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
