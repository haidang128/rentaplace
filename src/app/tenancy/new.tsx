import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";

import { LabeledInput, PrimaryButton } from "@/components/form";
import { fonts, palette } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { createTenancy, getLandlord, getListing } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { scheduleDepositReminders } from "@/lib/notifications";
import type { Landlord, Listing } from "@/lib/types";

export default function NewTenancyScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { t } = useLang();
  const { session, ready } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [landlord, setLandlord] = useState<Landlord | null>(null);
  const [moveIn, setMoveIn] = useState(new Date().toISOString().slice(0, 10));
  const [deposit, setDeposit] = useState("");

  useEffect(() => {
    if (!listingId) return;
    getListing(listingId).then(async (l) => {
      setListing(l);
      if (l) {
        setDeposit(String(l.depositAmount));
        setLandlord(await getLandlord(l.landlordId));
      }
    });
  }, [listingId]);

  if (ready && !session) return <Redirect href="/(tabs)/profile" />;
  if (!listing) return null;

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(moveIn) && (parseInt(deposit, 10) || 0) >= 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 560, width: "100%", alignSelf: "center" }}
    >
      <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 22, color: palette.ink }}>
        {t("tenancy.newTitle")}
      </Text>
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 14.5, color: palette.inkSoft }}>{listing.title}</Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: palette.inkSoft }}>
        {t("tenancy.newIntro")}
      </Text>
      {listing.liveInLandlord ? (
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 20, color: palette.goldInk }}>
          {t("tenancy.lodgerNote")}
        </Text>
      ) : null}

      <LabeledInput label={t("tenancy.fieldMoveIn")} value={moveIn} onChangeText={setMoveIn} autoCapitalize="none" />
      <LabeledInput label={t("tenancy.fieldDeposit")} value={deposit} onChangeText={setDeposit} inputMode="numeric" />

      <PrimaryButton
        label={t("tenancy.start")}
        disabled={!valid}
        onPress={async () => {
          const tenancy = await createTenancy({
            listingId: listing.id,
            listingTitle: listing.title,
            landlordId: listing.landlordId,
            renterId: session!.userId,
            moveInDate: moveIn,
            depositAmount: parseInt(deposit, 10) || 0,
            scheme: landlord?.depositSchemeDeclared ?? null,
            isLodger: listing.liveInLandlord,
          });
          if (!listing.liveInLandlord) {
            await scheduleDepositReminders(moveIn, {
              day7Title: t("day30.day7Title"),
              day7Body: t("day30.day7Body"),
              day25Title: t("day30.day25Title"),
              day25Body: t("day30.confirmPrompt", { scheme: landlord?.depositSchemeDeclared?.toUpperCase() ?? "DPS" }),
            });
          }
          router.replace(`/tenancy/${tenancy.id}` as any);
        }}
      />
    </ScrollView>
  );
}
