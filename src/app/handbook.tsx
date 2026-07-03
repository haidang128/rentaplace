import { ScrollView, Text, View } from "react-native";

import { Seal } from "@/components/seal";
import { fonts, palette, radius } from "@/constants/theme";
import { useLang } from "@/lib/i18n";

const sections = ["s1", "s2", "s3", "s4", "s5"] as const;

/**
 * The deposit handbook ("Cẩm nang tiền cọc") — renter education on the 30-day
 * rule, the 1–3× claim, the lodger exception, and moving out.
 */
export default function HandbookScreen() {
  const { t, tr } = useLang();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 720, width: "100%", alignSelf: "center" }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 8 }}>
        <Seal size={28} color={palette.goldDeep} />
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 24, color: palette.ink, flexShrink: 1 }}>
          {t("handbook.title")}
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: palette.inkSoft, lineHeight: 22 }}>
        {t("handbook.subtitle")}
      </Text>

      {sections.map((key, idx) => {
        const items = tr<string[]>(`handbook.${key}.items`);
        const isLodger = key === "s4";
        return (
          <View
            key={key}
            style={{
              backgroundColor: "#fff",
              borderWidth: isLodger ? 1.5 : 1,
              borderColor: isLodger ? palette.gold : palette.cardLine,
              borderRadius: radius.card,
              borderCurve: "continuous",
              padding: 18,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
              <Text style={{ fontFamily: fonts.serifItalic, fontSize: 32, color: palette.gold, lineHeight: 34 }}>
                {idx + 1}
              </Text>
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 17, color: palette.ink, flexShrink: 1 }}>
                {t(`handbook.${key}.title`)}
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: palette.inkSoft, lineHeight: 21 }}>
              {t(`handbook.${key}.intro`)}
            </Text>
            {items.map((item) => (
              <View key={item} style={{ flexDirection: "row", gap: 9 }}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    backgroundColor: isLodger ? palette.goldWash : palette.greenWash,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansExtraBold,
                      fontSize: 11,
                      color: isLodger ? palette.goldInk : palette.green,
                    }}
                  >
                    ✓
                  </Text>
                </View>
                <Text
                  selectable
                  style={{
                    flex: 1,
                    fontFamily: fonts.sansMedium,
                    fontSize: 13.5,
                    color: palette.ink,
                    lineHeight: 21,
                  }}
                >
                  {item}
                </Text>
              </View>
            ))}
            {key === "s2" ? (
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: palette.brick }}>
                {t("handbook.s2.checkerLinks")}
              </Text>
            ) : null}
          </View>
        );
      })}

      <Text
        selectable
        style={{
          fontFamily: fonts.sans,
          fontSize: 12,
          color: palette.inkMuted,
          lineHeight: 19,
          paddingBottom: 24,
        }}
      >
        {t("handbook.disclaimer")}
      </Text>
    </ScrollView>
  );
}
