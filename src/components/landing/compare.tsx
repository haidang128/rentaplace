import { Text, View } from "react-native";

import { Seal } from "@/components/seal";
import { fonts, palette } from "@/constants/theme";
import { useLang } from "@/lib/i18n";

function PointRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          backgroundColor: ok ? palette.greenWash : palette.redWash,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontFamily: fonts.sansExtraBold,
            fontSize: 12,
            color: ok ? palette.green : palette.brick,
          }}
        >
          {ok ? "✓" : "✕"}
        </Text>
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: ok ? fonts.sansMedium : fonts.sans,
          fontSize: 13.5,
          color: ok ? palette.ink : "#5B5346",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function Compare({ isDesktop }: { isDesktop: boolean }) {
  const { t } = useLang();

  const anonCard = (
    <View
      style={{
        flex: isDesktop ? 1 : undefined,
        backgroundColor: "#F2EFE9",
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: "#C9BFAE",
        borderRadius: 18,
        borderCurve: "continuous",
        padding: 24,
        gap: 11,
        transform: isDesktop ? [{ rotate: "-0.6deg" }] : undefined,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            backgroundColor: "#D8D2C6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 16, color: "#9A917F" }}>?</Text>
        </View>
        <View>
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 14.5, color: "#5B5346" }}>
            {t("landing.compare.anonName")}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: "#9A917F" }}>
            {t("landing.compare.anonMeta")}
          </Text>
        </View>
      </View>
      <PointRow ok={false} label={t("landing.compare.anonPoint1")} />
      <PointRow ok={false} label={t("landing.compare.anonPoint2")} />
      <PointRow ok={false} label={t("landing.compare.anonPoint3")} />
      <View
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 13,
          paddingVertical: 7,
          borderRadius: 999,
          backgroundColor: palette.redWash,
          marginTop: 7,
        }}
      >
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 12.5, color: palette.brickDark }}>
          {t("landing.compare.anonRisk")}
        </Text>
      </View>
    </View>
  );

  const verifiedCard = (
    <View
      style={{
        flex: isDesktop ? 1 : undefined,
        backgroundColor: "#fff",
        borderWidth: 1.5,
        borderColor: palette.gold,
        borderRadius: 18,
        borderCurve: "continuous",
        padding: 24,
        gap: 11,
        boxShadow: "0 18px 44px rgba(178,58,46,0.10)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <Seal size={38} />
        <View>
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 14.5, color: palette.ink }}>
            {t("common.verifiedListing")}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: palette.inkMuted }}>
            {t("landing.compare.verifiedMeta")}
          </Text>
        </View>
      </View>
      <PointRow ok label={t("landing.compare.verifiedPoint1")} />
      <PointRow ok label={t("landing.compare.verifiedPoint2")} />
      <PointRow ok label={t("landing.compare.verifiedPoint3")} />
      <View
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 13,
          paddingVertical: 7,
          borderRadius: 999,
          backgroundColor: palette.greenWash,
          marginTop: 7,
        }}
      >
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 12.5, color: palette.green }}>
          {t("landing.compare.verifiedSafe")}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ paddingVertical: isDesktop ? 68 : 36, paddingHorizontal: isDesktop ? 48 : 22 }}>
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
          {t("landing.compare.title")}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: isDesktop ? 15.5 : 13.5, color: palette.inkMuted, textAlign: "center" }}>
          {t("landing.compare.sub")}
        </Text>
      </View>

      <View
        style={{
          flexDirection: isDesktop ? "row" : "column",
          alignItems: "center",
          gap: isDesktop ? 0 : 0,
          maxWidth: 1060,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {anonCard}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            backgroundColor: palette.ink,
            alignItems: "center",
            justifyContent: "center",
            marginHorizontal: isDesktop ? 6 : 0,
            marginVertical: isDesktop ? 0 : -11,
            zIndex: 2,
            boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
          }}
        >
          <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 11, color: palette.goldWash }}>VS</Text>
        </View>
        {verifiedCard}
      </View>
    </View>
  );
}
