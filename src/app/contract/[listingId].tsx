import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { fonts, palette, radius } from "@/constants/theme";
import { getApprovedContractSummary, getListing } from "@/lib/data";
import type { ContractSummary } from "@/lib/data/demo-store";
import { useLang } from "@/lib/i18n";
import type { Listing } from "@/lib/types";

const schemeLabels = { dps: "DPS", mydeposits: "mydeposits", tds: "TDS" } as const;

/** Contract summary in plain Vietnamese (design 1f, revised periodic-tenancy copy). */
export default function ContractSummaryScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { t } = useLang();
  const [summary, setSummary] = useState<ContractSummary | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);

  useEffect(() => {
    if (!listingId) return;
    getApprovedContractSummary(listingId).then(setSummary);
    getListing(listingId).then(setListing);
  }, [listingId]);

  if (!summary) return null;
  const ex = summary.extracted;
  const scheme = ex.scheme ? schemeLabels[ex.scheme] : "DPS";
  const isLodger = ex.isLodgerAgreement || listing?.liveInLandlord;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 10, maxWidth: 560, width: "100%", alignSelf: "center" }}
    >
      <View style={{ gap: 2 }}>
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 20, color: palette.ink }}>
          {t("contract.title")}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 11.5, color: palette.inkMuted }}>
          {t("contract.subtitle")}
        </Text>
      </View>

      <View style={{ backgroundColor: palette.goldWash, borderRadius: radius.field, borderCurve: "continuous", padding: 13 }}>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, color: palette.goldInk }}>
          {t("contract.banner")}
        </Text>
      </View>

      {isLodger ? (
        <View style={{ backgroundColor: palette.redWash, borderRadius: radius.field, borderCurve: "continuous", padding: 13 }}>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12.5, lineHeight: 19, color: palette.brickDark }}>
            {t("contract.lodgerBanner")}
          </Text>
        </View>
      ) : null}

      {/* Rent */}
      {ex.rentPcm != null ? (
        <Card>
          <CardHeader label={t("contract.rentLabel")}>
            <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 19, color: palette.brick }}>
              £{ex.rentPcm}
              <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12, color: palette.inkMuted }}>
                /{t("common.perMonth")}
              </Text>
            </Text>
          </CardHeader>
          {ex.rentDueDay != null && ex.billsIncluded != null ? (
            <Text style={bodyStyle}>{t("contract.rentBody", { day: `0${ex.rentDueDay}`.slice(-2) })}</Text>
          ) : null}
        </Card>
      ) : null}

      {/* Deposit — the trust centerpiece */}
      {!isLodger && ex.depositAmount != null ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderWidth: 1.5,
            borderColor: palette.gold,
            borderRadius: radius.tile,
            borderCurve: "continuous",
            padding: 15,
            gap: 8,
            boxShadow: "0 6px 16px rgba(192,138,45,0.10)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={labelStyle}>{t("contract.depositLabel")}</Text>
            <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 19, color: palette.ink }}>
              £{ex.depositAmount}
            </Text>
          </View>
          <Text style={bodyStyle}>{t("contract.depositBody", { scheme })}</Text>
          {listing && ex.rentPcm != null && ex.depositAmount <= Math.floor(((ex.rentPcm * 12) / 52) * 5) ? (
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 18, color: palette.inkSoft }}>
              {t("contract.depositCapNote", { amount: ex.depositAmount })}
            </Text>
          ) : null}
          {/* Amber until the tenant confirms via the day-30 loop (tenancy screen) */}
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 11,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: palette.goldWash,
            }}
          >
            <Text style={{ fontFamily: fonts.sansBold, fontSize: 11.5, color: palette.goldInk }}>
              {t("contract.depositPending")}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Notice + term */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {ex.noticeMonths != null ? (
          <Card style={{ flex: 1 }}>
            <Text style={labelStyle}>{t("contract.noticeLabel")}</Text>
            <Text style={valueStyle}>{ex.noticeMonths} {t("contract.monthsUnit")}</Text>
            <Text style={smallBodyStyle}>{t("contract.noticeBody")}</Text>
          </Card>
        ) : null}
        {ex.termType ? (
          <Card style={{ flex: 1 }}>
            <Text style={labelStyle}>{t("contract.termLabel")}</Text>
            <Text style={valueStyle}>{ex.termType === "periodic" ? t("contract.termValue") : "⚠"}</Text>
            <Text style={smallBodyStyle}>{t("contract.termBody")}</Text>
          </Card>
        ) : null}
      </View>

      {/* Unusual clauses */}
      {ex.unusualClauses.length === 0 ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
            backgroundColor: palette.greenWash,
            borderRadius: radius.field,
            borderCurve: "continuous",
            padding: 13,
          }}
        >
          <View style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: palette.green, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 12, color: "#fff" }}>✓</Text>
          </View>
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: palette.green, flex: 1 }}>
            {t("contract.noOddClauses")}
          </Text>
        </View>
      ) : (
        <View style={{ backgroundColor: palette.redWash, borderRadius: radius.field, borderCurve: "continuous", padding: 13, gap: 6 }}>
          {ex.unusualClauses.map((clause) => (
            <Text key={clause} selectable style={{ fontFamily: fonts.sansSemiBold, fontSize: 12.5, lineHeight: 19, color: palette.brickDark }}>
              ⚠ {clause}
            </Text>
          ))}
        </View>
      )}

      <Text selectable style={{ fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 18, color: palette.inkMuted, paddingBottom: 24 }}>
        {t("contract.disclaimer")}
      </Text>
    </ScrollView>
  );
}

const labelStyle = {
  fontFamily: fonts.sansExtraBold,
  fontSize: 11,
  letterSpacing: 0.8,
  color: palette.inkMuted,
} as const;
const valueStyle = { fontFamily: fonts.sansExtraBold, fontSize: 19, color: palette.ink } as const;
const bodyStyle = { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, color: palette.inkSoft } as const;
const smallBodyStyle = { fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: palette.inkSoft } as const;

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={[
        {
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: palette.cardLine,
          borderRadius: radius.tile,
          borderCurve: "continuous",
          padding: 15,
          gap: 5,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function CardHeader({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={labelStyle}>{label}</Text>
      {children}
    </View>
  );
}
