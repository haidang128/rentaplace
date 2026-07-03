import { Link } from "expo-router";
import { Text, View } from "react-native";

import { Seal } from "@/components/seal";
import { fonts, palette } from "@/constants/theme";
import { useLang } from "@/lib/i18n";

export function Footer({ isDesktop }: { isDesktop: boolean }) {
  const { t } = useLang();

  return (
    <View
      style={{
        paddingVertical: isDesktop ? 56 : 32,
        paddingHorizontal: isDesktop ? 48 : 22,
        alignItems: "center",
        gap: 12,
      }}
    >
      <Seal size={isDesktop ? 34 : 28} />
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: isDesktop ? 26 : 18,
          color: palette.ink,
          textAlign: "center",
        }}
      >
        {t("landing.footer.tagline")}
      </Text>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: isDesktop ? 14.5 : 12.5,
          lineHeight: isDesktop ? 24 : 20,
          color: palette.inkSoft,
          textAlign: "center",
          maxWidth: 640,
        }}
      >
        {t("landing.footer.body")}
      </Text>
      <Link href="/handbook" asChild>
        <Text
          style={{
            fontFamily: fonts.sansBold,
            fontSize: 14,
            color: palette.brick,
            textDecorationLine: "underline",
          }}
        >
          {t("handbook.title")} →
        </Text>
      </Link>
      <View
        style={{
          flexDirection: isDesktop ? "row" : "column",
          gap: isDesktop ? 24 : 4,
          alignItems: "center",
          marginTop: 12,
        }}
      >
        {["© 2026 RentAPlace", t("landing.footer.cities"), t("landing.footer.email"), t("landing.footer.zalo")].map(
          (item) => (
            <Text key={item} style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: palette.inkMuted }}>
              {item}
            </Text>
          ),
        )}
      </View>
    </View>
  );
}
