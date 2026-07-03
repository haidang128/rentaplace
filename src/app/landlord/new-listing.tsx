import { Redirect, router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { ChipSelect, LabeledInput, PrimaryButton, ToggleRow } from "@/components/form";
import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { createListing } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import type { RoomType } from "@/lib/types";

/** Tenant Fees Act cap: 5 weeks' rent (annual rent < £50k). */
function depositCap(pricePcm: number): number {
  return Math.floor(((pricePcm * 12) / 52) * 5);
}

export default function NewListingScreen() {
  const { t } = useLang();
  const { session } = useAuth();

  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Manchester");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [roomType, setRoomType] = useState<RoomType>("double");
  const [bills, setBills] = useState(true);
  const [flatmates, setFlatmates] = useState("0");
  const [liveIn, setLiveIn] = useState(false);
  const [availableFrom, setAvailableFrom] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!session || session.role !== "landlord") return <Redirect href="/(tabs)/profile" />;

  const priceNum = parseInt(price, 10) || 0;
  const depositNum = parseInt(deposit, 10) || 0;
  const cap = priceNum > 0 ? depositCap(priceNum) : null;
  const depositTooHigh = cap != null && depositNum > cap;
  const valid = title.trim() && area.trim() && priceNum > 0 && depositNum >= 0 && !depositTooHigh;

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.paper, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 24, color: palette.green }}>
          {t("listingForm.submittedTitle")}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 15, lineHeight: 24, color: palette.inkSoft, textAlign: "center", maxWidth: 420 }}>
          {t("listingForm.submittedBody")}
        </Text>
        <PrimaryButton label={t("common.back")} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 640, width: "100%", alignSelf: "center" }}
    >
      <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 22, color: palette.ink }}>
        {t("listingForm.title")}
      </Text>

      <LabeledInput label={t("listingForm.fieldTitle")} value={title} onChangeText={setTitle} />
      <LabeledInput label={t("listingForm.fieldArea")} value={area} onChangeText={setArea} />
      <LabeledInput label={t("listingForm.fieldCity")} value={city} onChangeText={setCity} />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <LabeledInput label={t("listingForm.fieldPrice")} value={price} onChangeText={setPrice} inputMode="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          <LabeledInput label={t("listingForm.fieldDeposit")} value={deposit} onChangeText={setDeposit} inputMode="numeric" />
        </View>
      </View>
      {depositTooHigh ? (
        <View style={{ backgroundColor: palette.redWash, borderRadius: radius.field, borderCurve: "continuous", padding: 12 }}>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 20, color: palette.brickDark }}>
            {t("listingForm.depositCapWarning", { max: cap })}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: palette.inkSoft }}>
          {t("listingForm.fieldRoomType")}
        </Text>
        <ChipSelect<RoomType>
          options={[
            { value: "single", label: t("listingForm.roomSingle") },
            { value: "double", label: t("listingForm.roomDouble") },
            { value: "ensuite", label: t("listingForm.roomEnsuite") },
            { value: "studio", label: t("listingForm.roomStudio") },
          ]}
          value={roomType}
          onChange={setRoomType}
        />
      </View>

      <ToggleRow label={t("listingForm.fieldBills")} value={bills} onChange={setBills} />
      <LabeledInput
        label={t("listingForm.fieldFlatmates")}
        value={flatmates}
        onChangeText={setFlatmates}
        inputMode="numeric"
      />

      {/* Lodger branch — transparent up front, drives the lodger guide on the listing */}
      <ToggleRow
        label={t("listingForm.fieldLiveIn")}
        hint={t("listingForm.liveInHint")}
        value={liveIn}
        onChange={setLiveIn}
      />

      <LabeledInput
        label={t("listingForm.fieldAvailableFrom")}
        value={availableFrom}
        onChangeText={setAvailableFrom}
        placeholder="2026-08-01"
        autoCapitalize="none"
      />
      <LabeledInput
        label={t("listingForm.fieldDescription")}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={{ minHeight: 100, textAlignVertical: "top" }}
      />

      <PrimaryButton
        label={t("listingForm.submit")}
        disabled={!valid}
        onPress={async () => {
          await createListing(
            {
              landlordId: session.userId,
              title: title.trim(),
              city: city.trim(),
              area: area.trim(),
              roomType,
              pricePcm: priceNum,
              depositAmount: depositNum,
              billsIncluded: bills,
              vietnameseFlatmates: parseInt(flatmates, 10) || 0,
              nearUniversity: null,
              liveInLandlord: liveIn,
              availableFrom: availableFrom.trim() || null,
              description: description.trim(),
            },
            session.displayName,
          );
          setSubmitted(true);
        }}
      />
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
