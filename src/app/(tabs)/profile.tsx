import { Link } from "expo-router";
import { Pressable, ScrollView, Text } from "react-native";

import { fonts, palette, radius } from "@/constants/theme";
import { useLang } from "@/lib/i18n";

export default function ProfileScreen() {
  const { t, toggleLang } = useLang();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 26, color: palette.ink }}>
        {t("tabs.profile")}
      </Text>
      <Link href="/handbook" asChild>
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
            {t("handbook.title")} →
          </Text>
        </Pressable>
      </Link>
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
