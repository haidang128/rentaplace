import { Text, View } from "react-native";

import { fonts, palette } from "@/constants/theme";
import { useLang } from "@/lib/i18n";

const stepKeys = ["s1", "s2", "s3"] as const;

export function Steps({ isDesktop }: { isDesktop: boolean }) {
  const { t } = useLang();

  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: palette.line,
        paddingVertical: isDesktop ? 68 : 36,
        paddingHorizontal: isDesktop ? 48 : 22,
      }}
    >
      <View style={{ alignItems: "center", marginBottom: isDesktop ? 44 : 20 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: isDesktop ? 34 : 24,
            color: palette.ink,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          {t("landing.steps.title")}
        </Text>
        {isDesktop ? (
          <Text style={{ fontFamily: fonts.sans, fontSize: 15.5, color: palette.inkMuted, textAlign: "center" }}>
            {t("landing.steps.sub")}
          </Text>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: isDesktop ? "row" : "column",
          gap: isDesktop ? 24 : 12,
          maxWidth: 1100,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {stepKeys.map((key, idx) => (
          <View
            key={key}
            style={{
              flex: isDesktop ? 1 : undefined,
              backgroundColor: palette.paper,
              borderWidth: 1,
              borderColor: palette.line,
              borderRadius: 20,
              borderCurve: "continuous",
              padding: isDesktop ? 30 : 20,
              gap: 8,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.serifItalic,
                fontSize: isDesktop ? 46 : 34,
                lineHeight: isDesktop ? 48 : 36,
                color: palette.gold,
              }}
            >
              {idx + 1}
            </Text>
            <Text style={{ fontFamily: fonts.sansBold, fontSize: isDesktop ? 19 : 15.5, color: palette.ink }}>
              {t(`landing.steps.${key}Title`)}
            </Text>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: isDesktop ? 14.5 : 13,
                lineHeight: isDesktop ? 24 : 20,
                color: palette.inkSoft,
              }}
            >
              {t(`landing.steps.${key}Body`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
