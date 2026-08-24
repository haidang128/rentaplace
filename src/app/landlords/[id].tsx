import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { ReportBlock } from "@/components/report-block";
import { ContactActions } from "@/components/contact-actions";
import { Seal } from "@/components/seal";
import { TrustChip } from "@/components/trust-chip";
import { fonts, palette, radius } from "@/constants/theme";
import { getLandlord, getLandlordReviews } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import type { Landlord, Review } from "@/lib/types";

export default function LandlordProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLang();
  const [landlord, setLandlord] = useState<Landlord | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!id) return;
    getLandlord(id).then(setLandlord);
    getLandlordReviews(id).then(setReviews);
  }, [id]);

  if (!landlord) return null;

  const showStats = landlord.stats.completedTenancies > 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 12, maxWidth: 640, width: "100%", alignSelf: "center" }}
    >
      {/* header */}
      <View style={{ alignItems: "center", gap: 8 }}>
        <View>
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 999,
              backgroundColor: palette.goldWash,
              borderWidth: 2.5,
              borderColor: palette.gold,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 28, color: palette.goldInk }}>
              {landlord.displayName.charAt(0)}
            </Text>
          </View>
          {landlord.identityVerified && landlord.rightToLetVerified ? (
            <View style={{ position: "absolute", right: -6, bottom: -2 }}>
              <Seal size={28} />
            </View>
          ) : null}
        </View>
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 19, color: palette.ink }}>
          {landlord.displayName}
          {landlord.nickname ? (
            <Text style={{ fontFamily: fonts.sansSemiBold, color: palette.inkMuted }}> ({landlord.nickname})</Text>
          ) : null}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: palette.inkSoft }}>
          {t("landlordProfile.memberSince", { city: landlord.city, year: landlord.memberSinceYear })}
        </Text>
        {landlord.identityVerified ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: palette.brick,
            }}
          >
            <Text style={{ fontFamily: fonts.sansBold, fontSize: 12.5, color: "#fff" }}>
              ✓ {t("common.identityVerified")}
            </Text>
          </View>
        ) : null}
        {/* Earned deposit badge — from tenant confirmations only */}
        {landlord.stats.depositConfirmations > 0 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: palette.greenWash,
              borderWidth: 1,
              borderColor: palette.green,
            }}
          >
            <Text style={{ fontFamily: fonts.sansBold, fontSize: 12.5, color: palette.green }}>
              {t("trust.profileBadge", { count: landlord.stats.depositConfirmations })}
            </Text>
          </View>
        ) : (
          <TrustChip tier={landlord.trustTier} scheme={landlord.depositSchemeDeclared} />
        )}
      </View>

      {/* stats — only after real tenancies; flywheel-fed, never hand-entered */}
      {showStats ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatTile value={String(landlord.stats.completedTenancies)} label={t("trust.statTenancies")} />
          {landlord.stats.depositsReturnedPct != null ? (
            <StatTile
              value={`${landlord.stats.depositsReturnedPct}%`}
              label={t("trust.statDepositsReturned")}
              caption={t("trust.statDepositsCaption")}
              tone="green"
            />
          ) : null}
          {landlord.stats.responseTimeHours != null ? (
            <StatTile value={`~${landlord.stats.responseTimeHours}h`} label={t("trust.statResponseTime")} />
          ) : null}
        </View>
      ) : null}

      {/* checks */}
      <View
        style={{
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: palette.cardLine,
          borderRadius: radius.tile,
          borderCurve: "continuous",
          padding: 16,
          gap: 8,
        }}
      >
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 11, letterSpacing: 0.8, color: palette.inkMuted }}>
          {t("landlordProfile.checksTitle")}
        </Text>
        {landlord.identityVerified ? <CheckLine label={t("landlordProfile.checkId")} /> : null}
        {landlord.rightToLetVerified ? <CheckLine label={t("landlordProfile.checkRightToLet")} /> : null}
        {landlord.certificateReviewed && landlord.depositSchemeDeclared ? (
          <CheckLine
            label={t("trust.profileCertificate", {
              scheme: { dps: "DPS", mydeposits: "mydeposits", tds: "TDS" }[landlord.depositSchemeDeclared],
            })}
          />
        ) : null}
      </View>

      {/* contact — Call / WhatsApp, shown to signed-in renters when a number exists */}
      <ContactActions landlordId={landlord.id} />

      {/* reviews */}
      {reviews.length > 0 ? (
        <>
          <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 11, letterSpacing: 0.8, color: palette.inkMuted }}>
            {t("landlordProfile.reviewsTitle")}
          </Text>
          {reviews.map((review) => (
            <View
              key={review.id}
              style={{
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: palette.cardLine,
                borderRadius: radius.tile,
                borderCurve: "continuous",
                padding: 15,
                gap: 5,
              }}
            >
              <Text style={{ color: palette.gold, fontSize: 13, letterSpacing: 2 }}>
                {"★".repeat(review.stars)}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 21, color: palette.ink }}>
                "{review.body}"
              </Text>
              {review.reviewerLabel ? (
                <Text style={{ fontFamily: fonts.sans, fontSize: 11.5, color: palette.inkMuted }}>
                  {review.reviewerLabel}
                </Text>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
      <ReportBlock targetType="user" targetId={landlord.id} blockId={landlord.id} blockLabel={landlord.displayName} />
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function StatTile({
  value,
  label,
  caption,
  tone,
}: {
  value: string;
  label: string;
  caption?: string;
  tone?: "green";
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: palette.cardLine,
        borderRadius: 14,
        borderCurve: "continuous",
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: "center",
        gap: 2,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.sansExtraBold,
          fontSize: 20,
          color: tone === "green" ? palette.green : palette.ink,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: fonts.sansSemiBold,
          fontSize: 10.5,
          lineHeight: 15,
          color: palette.inkSoft,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
      {caption ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: 9.5, color: palette.inkMuted, textAlign: "center" }}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function CheckLine({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          backgroundColor: palette.greenWash,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 11, color: palette.green }}>✓</Text>
      </View>
      <Text style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 13, color: palette.ink }}>{label}</Text>
    </View>
  );
}
