import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";

import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

/**
 * Landing page for the Supabase email-confirmation link (web). On desktop the
 * supabase client also picks the session out of the redirect URL, so the user
 * arrives here already signed in.
 */
export default function ConfirmedScreen() {
  const { t } = useLang();
  const { session } = useAuth();
  // Supabase appends #error=...&error_description=... on expired/reused links.
  const [linkError] = useState(
    () => typeof window !== "undefined" && window.location.hash.includes("error"),
  );

  const failed = linkError && !session;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 560, width: "100%", alignSelf: "center" }}
    >
      <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 24, color: palette.ink }}>
        {failed ? t("auth.confirmedErrorTitle") : t("auth.confirmedTitle")}
      </Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: palette.inkSoft }}>
        {failed
          ? t("auth.confirmedErrorBody")
          : session
            ? t("auth.confirmedSignedInBody")
            : t("auth.confirmedBody")}
      </Text>
      <Link href="/(tabs)/profile" asChild>
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
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 15, color: palette.brick }}>
            {t("auth.confirmedGoProfile")} →
          </Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
