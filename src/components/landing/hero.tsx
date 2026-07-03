import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Seal } from "@/components/seal";
import { fonts, palette } from "@/constants/theme";
import { joinWaitlist } from "@/lib/data";
import { useLang } from "@/lib/i18n";

const schemes = ["DPS", "mydeposits", "TDS"];

export function Hero({ isDesktop }: { isDesktop: boolean }) {
  const { t, tr, lang } = useLang();
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    try {
      await joinWaitlist({ email: email.trim(), lang });
      setJoined(true);
    } catch {
      // keep the form; the user can retry
    }
  };

  const titleLines = tr<string[]>("landing.hero.titleLines");

  return (
    <View
      style={{
        flexDirection: isDesktop ? "row" : "column",
        gap: isDesktop ? 56 : 36,
        paddingHorizontal: isDesktop ? 48 : 22,
        paddingTop: isDesktop ? 64 : 36,
        paddingBottom: isDesktop ? 72 : 48,
        alignItems: "center",
      }}
    >
      <View style={{ flex: isDesktop ? 1.08 : undefined, alignSelf: "stretch" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Seal size={17} color={palette.goldDeep} accent={null} />
          <Text
            style={{
              fontFamily: fonts.sansBold,
              fontSize: isDesktop ? 13 : 11,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: palette.goldDeep,
              flexShrink: 1,
            }}
          >
            {t("landing.hero.eyebrow")}
          </Text>
        </View>

        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: isDesktop ? 52 : 34,
            lineHeight: isDesktop ? 60 : 41,
            color: palette.ink,
            marginBottom: 14,
          }}
        >
          {titleLines.join("\n")}
          {"\n"}
          <Text style={{ fontFamily: fonts.serifItalic, color: palette.brick }}>
            {t("landing.hero.titleAccent")}
          </Text>
        </Text>

        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: isDesktop ? 19 : 15,
            color: palette.inkMuted,
            marginBottom: 12,
          }}
        >
          {t("landing.hero.subEcho")}
        </Text>

        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: isDesktop ? 16.5 : 14.5,
            lineHeight: isDesktop ? 27 : 23,
            color: palette.inkSoft,
            maxWidth: 520,
            marginBottom: 28,
          }}
        >
          {t("landing.hero.body")}
        </Text>

        <View style={{ flexDirection: isDesktop ? "row" : "column", gap: 10, maxWidth: 540 }}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t("landing.hero.emailPlaceholder")}
            placeholderTextColor={palette.inkMuted}
            inputMode="email"
            autoCapitalize="none"
            style={{
              flex: isDesktop ? 1 : undefined,
              paddingHorizontal: 18,
              paddingVertical: 16,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: palette.lineStrong,
              backgroundColor: "#fff",
              fontFamily: fonts.sans,
              fontSize: 15,
              color: palette.ink,
            }}
          />
          <Pressable
            onPress={submit}
            style={{
              paddingHorizontal: 26,
              paddingVertical: 16,
              borderRadius: 14,
              backgroundColor: joined ? palette.green : palette.brick,
              alignItems: "center",
              boxShadow: "0 6px 18px rgba(178,58,46,0.28)",
            }}
          >
            <Text style={{ fontFamily: fonts.sansBold, fontSize: 16, color: "#fff" }}>
              {joined ? "✓" : t("landing.hero.cta")}
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            marginTop: 14,
            flexWrap: "wrap",
            justifyContent: isDesktop ? "flex-start" : "center",
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 13.5,
              color: palette.brick,
              textDecorationLine: "underline",
            }}
          >
            {t("landing.hero.zaloLink")}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: palette.inkMuted }}>
            {t("landing.hero.privacy")}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginTop: 36,
            flexWrap: "wrap",
            justifyContent: isDesktop ? "flex-start" : "center",
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansBold,
              fontSize: isDesktop ? 11 : 10,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: palette.inkMuted,
            }}
          >
            {t("landing.hero.depositStrip")}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {schemes.map((s) => (
              <View
                key={s}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 7,
                  borderWidth: 1.5,
                  borderColor: palette.lineStrong,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.sansExtraBold,
                    fontSize: 11.5,
                    letterSpacing: 0.8,
                    color: palette.inkFaint,
                  }}
                >
                  {s}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {isDesktop ? <HeroCard /> : null}
    </View>
  );
}

function HeroCard() {
  const { t } = useLang();

  return (
    <View style={{ flex: 0.92, alignItems: "center" }}>
      <View style={{ position: "relative" }}>
        <View
          style={{
            width: 430,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: palette.cardLine,
            borderRadius: 22,
            borderCurve: "continuous",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(60,40,20,0.14)",
            transform: [{ rotate: "0.6deg" }],
          }}
        >
          <View
            style={{
              height: 250,
              backgroundColor: palette.paperDeep,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 11, color: palette.inkFaint }}>
              {t("landing.hero.cardPhotoPlaceholder")}
            </Text>
            <View
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                backgroundColor: "#fff",
                borderRadius: 999,
                paddingVertical: 7,
                paddingLeft: 9,
                paddingRight: 13,
                boxShadow: "0 3px 10px rgba(0,0,0,0.14)",
              }}
            >
              <Seal size={18} />
              <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 12.5, color: palette.ink }}>
                {t("common.verified")}
              </Text>
            </View>
          </View>
          <View style={{ padding: 22, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 22, color: palette.ink }}>
                £520
                <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: palette.inkMuted }}>
                  /{t("common.perMonth")}
                </Text>
              </Text>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: palette.goldWash,
                }}
              >
                <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, color: palette.goldInk }}>
                  {t("landing.hero.cardFlatmates")}
                </Text>
              </View>
            </View>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: palette.inkSoft, marginBottom: 10 }}>
              {t("landing.hero.cardRoom")}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 11,
                borderTopWidth: 1,
                borderTopColor: palette.line,
                paddingTop: 15,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  backgroundColor: palette.goldWash,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 14, color: palette.goldInk }}>H</Text>
              </View>
              <Text
                style={{
                  flex: 1,
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 13.5,
                  color: palette.ink,
                }}
              >
                {t("landing.hero.cardLandlord")}
              </Text>
              <Seal size={17} accent={null} />
            </View>
          </View>
        </View>

        {/* Attestation badge — gold, not green: it's a pledge, not a guarantee */}
        <View
          style={{
            position: "absolute",
            left: -26,
            bottom: -20,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: palette.goldWash,
            borderWidth: 1.5,
            borderColor: palette.gold,
            borderRadius: 12,
            borderCurve: "continuous",
            paddingHorizontal: 16,
            paddingVertical: 11,
            maxWidth: 320,
            boxShadow: "0 10px 26px rgba(192,138,45,0.3)",
            transform: [{ rotate: "-1.5deg" }],
          }}
        >
          <Seal size={15} color={palette.goldDeep} accent={null} checkColor={palette.goldWash} />
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: palette.goldInk, flexShrink: 1 }}>
            {t("landing.hero.cardBadge")}
          </Text>
        </View>
      </View>
    </View>
  );
}
