import { Link, Redirect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { LabeledInput, PrimaryButton, ToggleRow } from "@/components/form";
import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { confirmDeposit, endTenancyWithReview, getMyTenancies } from "@/lib/data";
import type { Tenancy } from "@/lib/data/demo-store";
import { useLang } from "@/lib/i18n";
import { dayOfLoop } from "@/lib/tenancy-utils";

const schemeLabels = { dps: "DPS", mydeposits: "mydeposits", tds: "TDS" } as const;

export default function TenancyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLang();
  const { session, ready } = useAuth();
  const [tenancy, setTenancy] = useState<Tenancy | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState("");
  const [returnedInFull, setReturnedInFull] = useState(true);
  const [reviewDone, setReviewDone] = useState(false);

  const refresh = useCallback(() => {
    if (session && id) {
      getMyTenancies(session.userId).then((all) => setTenancy(all.find((x) => x.id === id) ?? null));
    }
  }, [session, id]);

  useEffect(refresh, [refresh]);

  if (ready && !session) return <Redirect href="/(tabs)/profile" />;
  if (!tenancy) return null;

  const day = dayOfLoop(tenancy.moveInDate);
  const scheme = tenancy.scheme ? schemeLabels[tenancy.scheme] : "DPS";

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 560, width: "100%", alignSelf: "center" }}
    >
      <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 22, color: palette.ink }}>
        {tenancy.listingTitle}
      </Text>

      {tenancy.isLodger ? (
        <View style={{ backgroundColor: palette.goldWash, borderRadius: radius.field, borderCurve: "continuous", padding: 14 }}>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13.5, lineHeight: 21, color: palette.goldInk }}>
            {t("tenancy.lodgerNote")}
          </Text>
        </View>
      ) : (
        <>
          {/* Day counter */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: tenancy.confirmedAt ? palette.greenWash : day > 30 ? palette.redWash : palette.goldWash,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansExtraBold,
                  fontSize: 13,
                  color: tenancy.confirmedAt ? palette.green : day > 30 ? palette.brickDark : palette.goldInk,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {tenancy.confirmedAt ? "✓" : day > 30 ? t("tenancy.overdue") : t("tenancy.dayCount", { day: Math.max(day, 1) })}
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: palette.inkSoft }}>
              £{tenancy.depositAmount} · {scheme}
            </Text>
          </View>

          {/* The 30-day checklist */}
          <View
            style={{
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: palette.cardLine,
              borderRadius: radius.card,
              borderCurve: "continuous",
              padding: 18,
              gap: 12,
            }}
          >
            <StepRow index={1} label={t("tenancy.step1")} />
            <StepRow index={2} label={t("tenancy.step2")} />
            <StepRow index={3} label={t("tenancy.step3", { scheme })} />

            {tenancy.confirmedAt ? (
              <View style={{ backgroundColor: palette.greenWash, borderRadius: radius.field, borderCurve: "continuous", padding: 12 }}>
                <Text style={{ fontFamily: fonts.sansBold, fontSize: 13.5, color: palette.green }}>
                  {t("tenancy.confirmedAt", {
                    date: new Date(tenancy.confirmedAt).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                    }),
                  })}
                </Text>
              </View>
            ) : (
              <>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, color: palette.inkMuted }}>
                  {t("tenancy.confirmHint")}
                </Text>
                <PrimaryButton
                  label={t("tenancy.confirmCta")}
                  tone="green"
                  onPress={async () => {
                    await confirmDeposit(tenancy.id, tenancy.scheme ?? "dps");
                    refresh();
                  }}
                />
              </>
            )}
          </View>

          {day > 30 && !tenancy.confirmedAt ? (
            <View style={{ backgroundColor: palette.redWash, borderRadius: radius.field, borderCurve: "continuous", padding: 14, gap: 4 }}>
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 14, color: palette.brickDark }}>
                {t("day30.overdueTitle")}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: palette.brickDark }}>
                {t("day30.overdueBody")}
              </Text>
              <Link href="/handbook" asChild>
                <Pressable>
                  <Text style={{ fontFamily: fonts.sansBold, fontSize: 13.5, color: palette.brick, textDecorationLine: "underline" }}>
                    {t("handbook.title")} →
                  </Text>
                </Pressable>
              </Link>
            </View>
          ) : null}
        </>
      )}

      {/* End of tenancy → review */}
      {tenancy.status === "active" && !reviewing ? (
        <Pressable onPress={() => setReviewing(true)} style={{ paddingVertical: 6 }}>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: palette.brick }}>
            {t("tenancy.endCta")}
          </Text>
        </Pressable>
      ) : null}

      {reviewing && !reviewDone ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: palette.cardLine,
            borderRadius: radius.card,
            borderCurve: "continuous",
            padding: 18,
            gap: 12,
          }}
        >
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 16, color: palette.ink }}>
            {t("tenancy.reviewTitle")}
          </Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars(n)} hitSlop={4}>
                <Text style={{ fontSize: 26, color: n <= stars ? palette.gold : palette.lineStrong }}>★</Text>
              </Pressable>
            ))}
          </View>
          <LabeledInput
            label={t("tenancy.reviewBody")}
            value={body}
            onChangeText={setBody}
            multiline
            style={{ minHeight: 80, textAlignVertical: "top" }}
          />
          <ToggleRow label={t("tenancy.reviewReturned")} value={returnedInFull} onChange={setReturnedInFull} />
          <PrimaryButton
            label={t("tenancy.reviewSubmit")}
            onPress={async () => {
              await endTenancyWithReview(tenancy.id, { stars, body: body.trim(), depositReturnedInFull: returnedInFull });
              setReviewDone(true);
              refresh();
            }}
          />
        </View>
      ) : null}

      {reviewDone ? (
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 22, color: palette.green }}>
          {t("tenancy.reviewDone")}
        </Text>
      ) : null}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function StepRow({ index, label }: { index: number; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 999,
          backgroundColor: palette.goldWash,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 12, color: palette.goldInk }}>{index}</Text>
      </View>
      <Text style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 21, color: palette.ink }}>
        {label}
      </Text>
    </View>
  );
}
