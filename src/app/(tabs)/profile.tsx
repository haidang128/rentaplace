import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { LabeledInput, PrimaryButton } from "@/components/form";
import { Seal } from "@/components/seal";
import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
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
              <MenuLink href="/landlord/new-listing" label={t("listingForm.title")} />
            </>
          ) : null}
          {session.role === "admin" ? <MenuLink href="/admin" label={t("admin.title")} /> : null}
          {session.role === "renter" ? <MenuLink href="/tenancy" label={t("tenancy.menuLink")} /> : null}
          <MenuLink href="/handbook" label={t("handbook.title")} />

          <Pressable onPress={signOut} style={{ paddingVertical: 10 }}>
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: palette.brick }}>
              {t("auth.signOut")}
            </Text>
          </Pressable>
        </>
      ) : isDemoMode ? (
        <DemoSignIn />
      ) : (
        <EmailOtpSignIn />
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

function EmailOtpSignIn() {
  const { t } = useLang();
  const { sendOtp, verifyOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: palette.inkSoft }}>
        {t("auth.signInBody")}
      </Text>
      {stage === "email" ? (
        <>
          <LabeledInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            inputMode="email"
            autoCapitalize="none"
          />
          <PrimaryButton
            label={t("auth.sendCode")}
            disabled={!email.includes("@")}
            onPress={async () => {
              try {
                setError(null);
                await sendOtp(email.trim());
                setStage("code");
              } catch (e: any) {
                setError(String(e?.message ?? e));
              }
            }}
          />
        </>
      ) : (
        <>
          <LabeledInput
            label={t("auth.codePlaceholder")}
            value={code}
            onChangeText={setCode}
            inputMode="numeric"
            maxLength={6}
          />
          <PrimaryButton
            label={t("auth.verify")}
            disabled={code.length !== 6}
            onPress={async () => {
              try {
                setError(null);
                await verifyOtp(email.trim(), code.trim());
              } catch (e: any) {
                setError(String(e?.message ?? e));
              }
            }}
          />
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
