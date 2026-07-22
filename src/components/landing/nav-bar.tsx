import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Seal } from "@/components/seal";
import { fonts, palette } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

export type LandingSection = "how" | "safe" | "landlords";

export function NavBar({
  isDesktop,
  onNav,
}: {
  isDesktop: boolean;
  onNav?: (section: LandingSection) => void;
}) {
  const { t, toggleLang } = useLang();
  const { session, ready } = useAuth();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: isDesktop ? 16 : 14,
        paddingHorizontal: isDesktop ? 48 : 18,
        borderBottomWidth: 1,
        borderBottomColor: palette.line,
        backgroundColor: palette.paper,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: isDesktop ? 10 : 8 }}>
        <Seal size={isDesktop ? 30 : 26} />
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: isDesktop ? 20 : 18, color: palette.ink }}>
          {t("common.appName")}
        </Text>
      </View>

      {isDesktop ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 28 }}>
          {(["how", "safe", "landlords"] as const).map((key) => (
            <Pressable key={key} onPress={() => onNav?.(key)}>
              <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: palette.inkSoft }}>
                {t(`landing.nav.${key}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: isDesktop ? 12 : 8 }}>
        <Pressable
          onPress={toggleLang}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: palette.lineStrong,
            backgroundColor: palette.cream,
          }}
        >
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: palette.ink }}>
            {isDesktop ? t("landing.nav.langButton") : t("landing.nav.langButtonShort")}
          </Text>
        </Pressable>
        {/* Hidden until the session has loaded so signed-in visitors never see "Sign in" flash. */}
        {ready ? (
          <Link href="/profile" asChild>
            <Pressable
              style={{
                paddingHorizontal: isDesktop ? 18 : 14,
                paddingVertical: isDesktop ? 10 : 9,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: palette.brick,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: fonts.sansBold,
                  fontSize: 13.5,
                  color: palette.brick,
                  maxWidth: isDesktop ? 180 : 110,
                }}
              >
                {session
                  ? session.displayName || t("landing.nav.account")
                  : t("auth.signInTitle")}
              </Text>
            </Pressable>
          </Link>
        ) : null}
        {isDesktop ? (
          <Link href="/browse" asChild>
            <Pressable
              style={{
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: palette.brick,
              }}
            >
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 13.5, color: "#fff" }}>
                {t("landing.nav.cta")}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}
