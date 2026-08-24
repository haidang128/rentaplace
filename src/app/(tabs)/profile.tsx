import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { LabeledInput, PrimaryButton } from "@/components/form";
import { Seal } from "@/components/seal";
import { BlockedList } from "@/components/blocked-list";
import { fonts, palette, radius } from "@/constants/theme";
import { useAuth, WRONG_PASSWORD } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { isDemoMode } from "@/lib/supabase";

export default function ProfileScreen() {
  const { t, toggleLang } = useLang();
  const { session, ready, signOut } = useAuth();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 560, width: "100%", alignSelf: "center" }}
    >
      <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 26, color: palette.ink }}>
        {t("tabs.profile")}
      </Text>

      {!ready ? null : session ? (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: palette.cardLine,
              borderRadius: radius.tile,
              borderCurve: "continuous",
              padding: 16,
            }}
          >
            <Seal size={28} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: palette.inkMuted }}>
                {t("auth.signedInAs")}
              </Text>
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 16, color: palette.ink }}>
                {session.displayName}
              </Text>
            </View>
          </View>

          {session.role === "landlord" ? (
            <>
              <MenuLink href="/landlord/verification" label={t("onboarding.title")} />
              <MenuLink href="/landlord/listings" label={t("onboarding.myListings")} />
              <MenuLink href="/landlord/new-listing" label={t("listingForm.title")} />
            </>
          ) : null}
          {session.role === "admin" ? <MenuLink href="/admin" label={t("admin.title")} /> : null}
          {session.role === "renter" ? <MenuLink href="/tenancy" label={t("tenancy.menuLink")} /> : null}
          <MenuLink href="/handbook" label={t("handbook.title")} />
          {session.role === "renter" && !isDemoMode ? <BecomeLandlord /> : null}

          <BlockedList />

          <Pressable onPress={signOut} style={{ paddingVertical: 10 }}>
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: palette.brick }}>
              {t("auth.signOut")}
            </Text>
          </Pressable>

          <Link href={"/delete-account" as any} asChild>
            <Pressable style={{ paddingVertical: 4 }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: palette.inkMuted }}>
                {t("deleteAccount.menuLink")}
              </Text>
            </Pressable>
          </Link>
        </>
      ) : isDemoMode ? (
        <DemoSignIn />
      ) : (
        <EmailPasswordSignIn />
      )}

      <Pressable
        onPress={toggleLang}
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: palette.lineStrong,
          backgroundColor: palette.cream,
        }}
      >
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: palette.ink }}>
          {t("landing.nav.langButton")}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable
        style={{
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: palette.cardLine,
          borderRadius: radius.tile,
          borderCurve: "continuous",
          padding: 16,
        }}
      >
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 15, color: palette.brick }}>{label} →</Text>
      </Pressable>
    </Link>
  );
}

function BecomeLandlord() {
  const { t } = useLang();
  const { becomeLandlord } = useAuth();
  const [busy, setBusy] = useState(false);

  return (
    <View
      style={{
        backgroundColor: palette.goldWash,
        borderRadius: radius.tile,
        borderCurve: "continuous",
        padding: 16,
        gap: 10,
      }}
    >
      <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: palette.goldInk }}>
        {t("auth.becomeLandlordHint")}
      </Text>
      <PrimaryButton
        label={t("auth.becomeLandlord")}
        tone="gold"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await becomeLandlord();
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}

function DemoSignIn() {
  const { t } = useLang();
  const { signInDemo } = useAuth();

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: palette.inkSoft }}>
        {t("auth.demoTitle")}
      </Text>
      <PrimaryButton label={t("auth.demoRenter")} onPress={() => signInDemo("renter")} />
      <PrimaryButton label={t("auth.demoLandlord")} tone="gold" onPress={() => signInDemo("landlord")} />
      <PrimaryButton label={t("auth.demoLandlordNew")} tone="gold" onPress={() => signInDemo("landlordNew")} />
      <PrimaryButton label={t("auth.demoAdmin")} tone="green" onPress={() => signInDemo("admin")} />
    </View>
  );
}

function EmailPasswordSignIn() {
  const { t } = useLang();
  const { signInWithPassword, requestPasswordReset, resendConfirmation } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the account exists but the email is still unverified (only
  // happens once "Confirm email" is enabled in Supabase).
  const [awaitingEmail, setAwaitingEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  // Forgot-password sub-form. Kept inline rather than on its own route so the
  // email already typed above carries straight over.
  const [forgot, setForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const submit = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e: any) {
      const raw = String(e?.message ?? e);
      setError(raw === WRONG_PASSWORD ? t("auth.wrongPassword") : raw);
    } finally {
      setBusy(false);
    }
  };

  if (awaitingEmail) {
    return (
      <View
        style={{
          backgroundColor: palette.goldWash,
          borderRadius: radius.tile,
          borderCurve: "continuous",
          padding: 16,
          gap: 12,
        }}
      >
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 16, color: palette.goldInk }}>
          {t("auth.confirmEmailTitle")}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: palette.goldInk }}>
          {t("auth.confirmEmailBody", { email: awaitingEmail })}
        </Text>
        <PrimaryButton
          label={t("auth.confirmEmailRetry")}
          disabled={busy}
          onPress={() =>
            submit(async () => {
              const outcome = await signInWithPassword(awaitingEmail, password);
              if (outcome === "confirm-email") setError(t("auth.confirmEmailStillPending"));
            })
          }
        />
        <Pressable
          disabled={busy || resent}
          onPress={() =>
            submit(async () => {
              await resendConfirmation(awaitingEmail);
              setResent(true);
            })
          }
          style={{ paddingVertical: 6 }}
        >
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: palette.goldInk }}>
            {resent ? t("auth.confirmEmailResent") : t("auth.confirmEmailResend")}
          </Text>
        </Pressable>
        {error ? (
          <Text selectable style={{ fontFamily: fonts.sans, fontSize: 13, color: palette.brick }}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {forgot ? (
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 17, color: palette.ink }}>
          {t("auth.forgotTitle")}
        </Text>
      ) : null}
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: palette.inkSoft }}>
        {forgot ? t("auth.forgotBody") : t("auth.signInBody")}
      </Text>

      <LabeledInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        inputMode="email"
        autoCapitalize="none"
      />

      {/* Resetting needs only the address, so the password field and the
          "we create your account on first sign-in" copy stay out of the way. */}
      {forgot ? (
        <>
          {forgotSent ? (
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13.5, lineHeight: 20, color: palette.green }}>
              {t("auth.forgotSent")}
            </Text>
          ) : (
            <PrimaryButton
              label={t("auth.forgotSend")}
              disabled={!email.includes("@") || busy}
              onPress={() =>
                submit(async () => {
                  await requestPasswordReset(email.trim());
                  setForgotSent(true);
                })
              }
            />
          )}
          <Pressable
            onPress={() => {
              setForgot(false);
              setForgotSent(false);
              setError(null);
            }}
            style={{ paddingVertical: 6 }}
          >
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13.5, color: palette.brick }}>
              {t("auth.forgotBack")}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <LabeledInput
            label={t("auth.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <PrimaryButton
            label={t("auth.signInTitle")}
            disabled={!email.includes("@") || password.length < 6 || busy}
            onPress={() =>
              submit(async () => {
                const outcome = await signInWithPassword(email.trim(), password);
                if (outcome === "confirm-email") setAwaitingEmail(email.trim());
              })
            }
          />
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: palette.inkMuted }}>
            {t("auth.passwordHint")}
          </Text>
          <Pressable onPress={() => setForgot(true)} style={{ paddingVertical: 4 }}>
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13.5, color: palette.brick }}>
              {t("auth.forgotLink")}
            </Text>
          </Pressable>
        </>
      )}

      {error ? (
        <Text selectable style={{ fontFamily: fonts.sans, fontSize: 13, color: palette.brick }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
