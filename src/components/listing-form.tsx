import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ChipSelect, LabeledInput, PrimaryButton, ToggleRow } from "@/components/form";
import { fonts, palette, radius } from "@/constants/theme";
import type { ListingEdit } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import type { Listing, RoomType } from "@/lib/types";

/** Tenant Fees Act cap: 5 weeks' rent (annual rent < £50k). */
function depositCap(pricePcm: number): number {
  return Math.floor(((pricePcm * 12) / 52) * 5);
}

/**
 * The listing fields, shared by the new-listing and edit screens. Photos are
 * only picked here when creating — an existing listing manages them from
 * My listings, where they upload one at a time against a real listing id.
 */
export function ListingForm({
  heading,
  submitLabel,
  initial,
  withPhotos = false,
  busy = false,
  banner,
  onSubmit,
}: {
  heading: string;
  submitLabel: string;
  initial?: Listing;
  withPhotos?: boolean;
  busy?: boolean;
  /** Feedback rendered just above the submit button (see components/notice). */
  banner?: React.ReactNode;
  onSubmit: (values: ListingEdit, photos: string[]) => void;
}) {
  const { t } = useLang();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [area, setArea] = useState(initial?.area ?? "");
  const [city, setCity] = useState(initial?.city ?? "Manchester");
  const [price, setPrice] = useState(initial ? String(initial.pricePcm) : "");
  const [deposit, setDeposit] = useState(initial ? String(initial.depositAmount) : "");
  const [roomType, setRoomType] = useState<RoomType>(initial?.roomType ?? "double");
  const [bills, setBills] = useState(initial?.billsIncluded ?? true);
  const [flatmates, setFlatmates] = useState(String(initial?.vietnameseFlatmates ?? 0));
  const [liveIn, setLiveIn] = useState(initial?.liveInLandlord ?? false);
  const [availableFrom, setAvailableFrom] = useState(initial?.availableFrom ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [photos, setPhotos] = useState<string[]>([]);

  const priceNum = parseInt(price, 10) || 0;
  const depositNum = parseInt(deposit, 10) || 0;
  const cap = priceNum > 0 ? depositCap(priceNum) : null;
  const depositTooHigh = cap != null && depositNum > cap;
  const valid = title.trim() && area.trim() && priceNum > 0 && depositNum >= 0 && !depositTooHigh;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 640, width: "100%", alignSelf: "center" }}
    >
      <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 22, color: palette.ink }}>{heading}</Text>

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

      {withPhotos ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: palette.inkSoft }}>
            {t("listingForm.photosLabel")}
          </Text>
          {photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {photos.map((uri) => (
                <Pressable key={uri} onPress={() => setPhotos((prev) => prev.filter((p) => p !== uri))}>
                  <Image
                    source={{ uri }}
                    style={{ width: 84, height: 84, borderRadius: 10 }}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <PrimaryButton
            label={
              photos.length > 0
                ? `${t("listingForm.addPhotos")} · ${t("listingForm.photosCount", { count: photos.length })}`
                : t("listingForm.addPhotos")
            }
            tone="gold"
            onPress={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsMultipleSelection: true,
                selectionLimit: 8,
                quality: 0.7,
              });
              if (!result.canceled) {
                setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 8));
              }
            }}
          />
        </View>
      ) : null}

      {banner}

      <PrimaryButton
        label={busy ? t("onboarding.uploading") : submitLabel}
        disabled={!valid || busy}
        onPress={() =>
          onSubmit(
            {
              title: title.trim(),
              city: city.trim(),
              area: area.trim(),
              roomType,
              pricePcm: priceNum,
              depositAmount: depositNum,
              billsIncluded: bills,
              vietnameseFlatmates: parseInt(flatmates, 10) || 0,
              nearUniversity: initial?.nearUniversity ?? null,
              liveInLandlord: liveIn,
              availableFrom: availableFrom.trim() || null,
              description: description.trim(),
            },
            photos,
          )
        }
      />
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
