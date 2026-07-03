import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

import { isDemoMode, supabase } from "@/lib/supabase";

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

type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  /** Demo mode only: sign in as a seeded persona. */
  signInDemo: (persona: keyof typeof demoPersonas) => void;
  /** Real mode: email + password. Signs up automatically on first login (auto-confirm is on). */
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /** Real mode: renter -> landlord self-serve upgrade (server-enforced, never admin). */
  becomeLandlord: () => Promise<void>;
  signOut: () => void;
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

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (isDemoMode) return;
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (!error) return;
    // First visit: create the account (auto-confirm returns a session immediately).
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      const { data, error: signUpError } = await supabase!.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      if (!data.session) throw error; // existing account, wrong password
      return;
    }
    throw error;
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

  const value = useMemo(
    () => ({ session, ready, signInDemo, signInWithPassword, becomeLandlord, signOut }),
    [session, ready, signInDemo, signInWithPassword, becomeLandlord, signOut],
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
