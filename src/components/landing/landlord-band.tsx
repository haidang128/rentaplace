import { Text, View } from "react-native";

import { Seal } from "@/components/seal";
import { fonts, palette } from "@/constants/theme";
import { useLang } from "@/lib/i18n";

export function LandlordBand({ isDesktop }: { isDesktop: boolean }) {
  const { t } = useLang();

  return (
    <View
      style={{
        backgroundColor: palette.brown,
        paddingVertical: isDesktop ? 68 : 36,
        paddingHorizontal: isDesktop ? 48 : 22,
      }}
    >
      <View
        style={{
          flexDirection: isDesktop ? "row" : "column",
          gap: isDesktop ? 56 : 28,
          maxWidth: 1100,
          width: "100%",
          alignSelf: "center",
          alignItems: "center",
        }}
      >
        <View style={{ flex: isDesktop ? 1.15 : undefined, alignSelf: "stretch" }}>
          <Text
            style={{
              fontFamily: fonts.sansBold,
              fontSize: isDesktop ? 12 : 11,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: palette.gold,
              marginBottom: 14,
            }}
          >
            {t("landing.landlordBand.eyebrow")}
          </Text>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: isDesktop ? 36 : 26,
              lineHeight: isDesktop ? 43 : 33,
              color: palette.paper,
              marginBottom: 10,
            }}
          >
            {t("landing.landlordBand.title")}
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: isDesktop ? 16 : 14,
              lineHeight: isDesktop ? 26 : 22,
              color: palette.brownText,
              maxWidth: 460,
              marginBottom: 24,
            }}
          >
            {t("landing.landlordBand.body")}
          </Text>
          <View style={{ gap: 12, marginBottom: 30 }}>
            {(["point1", "point2", "point3"] as const).map((key) => (
              <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Seal size={18} color={palette.gold} accent={null} checkColor={palette.brown} />
                <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: palette.brownTextHi }}>
                  {t(`landing.landlordBand.${key}`)}
                </Text>
              </View>
            ))}
          </View>
          <View
            style={{
              alignSelf: isDesktop ? "flex-start" : "stretch",
              paddingHorizontal: 26,
              paddingVertical: 15,
              borderRadius: 14,
              borderCurve: "continuous",
              backgroundColor: palette.gold,
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 15.5, color: palette.brown }}>
              {t("landing.landlordBand.cta")}
            </Text>
          </View>
        </View>

        {isDesktop ? (
          <View
            style={{
              width: 340,
              backgroundColor: palette.brownCard,
              borderWidth: 1,
              borderColor: palette.brownLine,
              borderRadius: 20,
              borderCurve: "continuous",
              padding: 28,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansBold,
                fontSize: 13,
                letterSpacing: 0.3,
                color: palette.brownText,
                marginBottom: 18,
              }}
            >
              {t("landing.landlordBand.profileTitle")}
            </Text>
            <View style={{ gap: 14 }}>
              {(["profileStep1", "profileStep2"] as const).map((key) => (
                <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      backgroundColor: palette.green,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 13, color: "#fff" }}>✓</Text>
                  </View>
                  <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 14.5, color: palette.brownTextHi }}>
                    {t(`landing.landlordBand.${key}`)}
                  </Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderStyle: "dashed",
                    borderColor: palette.goldDeep,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 12, color: palette.gold }}>…</Text>
                </View>
                <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 14.5, color: palette.brownTextHi }}>
                  {t("landing.landlordBand.profileStep3")}
                </Text>
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginTop: 22,
                borderTopWidth: 1,
                borderTopColor: palette.brownLine,
                paddingTop: 18,
              }}
            >
              <Seal size={34} color={palette.gold} accent={palette.brown} checkColor={palette.brown} />
              <Text
                style={{
                  flex: 1,
                  fontFamily: fonts.sans,
                  fontSize: 13.5,
                  lineHeight: 20,
                  color: palette.brownText,
                }}
              >
                {t("landing.landlordBand.profileHint")}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
