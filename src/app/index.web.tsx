import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Seal } from "@/components/seal";
import { fonts, palette } from "@/constants/theme";
import { useLang } from "@/lib/i18n";

/**
 * Web landing — placeholder shell for M0; the full design (1a/1b) lands in M1.
 */
export default function Landing() {
  const { t, toggleLang } = useLang();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }}>
      <View style={{ maxWidth: 1280, width: "100%", alignSelf: "center", padding: 48, gap: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Seal size={30} />
            <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 20, color: palette.ink }}>
              {t("common.appName")}
            </Text>
          </View>
          <Pressable
            onPress={toggleLang}
            style={{
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
        </View>

        <View style={{ gap: 12, paddingVertical: 40 }}>
          {(useLangTitleLines()).map((line) => (
            <Text key={line} style={{ fontFamily: fonts.serif, fontSize: 52, color: palette.ink, lineHeight: 60 }}>
              {line}
            </Text>
          ))}
          <Text style={{ fontFamily: fonts.serifItalic, fontSize: 52, color: palette.brick, lineHeight: 60 }}>
            {t("landing.hero.titleAccent")}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 16.5, color: palette.inkSoft, maxWidth: 520, lineHeight: 27 }}>
            {t("landing.hero.body")}
          </Text>
          <Link href="/(tabs)/browse" asChild>
            <Pressable
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 26,
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: palette.brick,
                boxShadow: "0 6px 18px rgba(178,58,46,0.28)",
              }}
            >
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 16, color: "#fff" }}>
                {t("landing.hero.cta")}
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

function useLangTitleLines(): string[] {
  const { tr } = useLang();
  return tr<string[]>("landing.hero.titleLines");
}
