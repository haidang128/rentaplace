import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View } from "react-native";

import { PrimaryButton } from "@/components/form";
import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import {
  addListingPhotos,
  getApprovedContractSummary,
  getListingPhotos,
  getMyListings,
  type ListingPhoto,
  removeListingPhoto,
  submitContract,
} from "@/lib/data";
import { demoStore } from "@/lib/data/demo-store";
import { useLang } from "@/lib/i18n";
import { isDemoMode } from "@/lib/supabase";
import type { Listing } from "@/lib/types";
import { uploadToBucket } from "@/lib/upload";

type ContractState = "none" | "pending" | "approved";

export default function MyListingsScreen() {
  const { t } = useLang();
  const { session } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [contractStates, setContractStates] = useState<Record<string, ContractState>>({});

  const refresh = useCallback(() => {
    if (!session) return;
    getMyListings(session.userId).then(async (rows) => {
      setListings(rows);
      const states: Record<string, ContractState> = {};
      for (const listing of rows) {
        if (isDemoMode) {
          const summary = await demoStore.getContractSummary(listing.id);
          states[listing.id] = summary ? (summary.status === "approved" ? "approved" : "pending") : "none";
        } else {
          const approved = await getApprovedContractSummary(listing.id);
          states[listing.id] = approved ? "approved" : "none";
        }
      }
      setContractStates(states);
    });
  }, [session]);

  useFocusEffect(refresh);

  if (!session || session.role !== "landlord") return <Redirect href="/(tabs)/profile" />;

  const statusLabels: Record<string, string> = {
    live: "● live",
    pending_review: t("onboarding.statusSubmitted"),
    draft: t("onboarding.statusNone"),
    let: "let",
    archived: "—",
  };

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 12, maxWidth: 640, width: "100%", alignSelf: "center" }}
      data={listings}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 22, color: palette.ink, paddingBottom: 4 }}>
          {t("onboarding.myListings")}
        </Text>
      }
      renderItem={({ item }) => {
        const contractState = contractStates[item.id] ?? "none";
        return (
          <View
            style={{
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: palette.cardLine,
              borderRadius: radius.card,
              borderCurve: "continuous",
              padding: 16,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 15, color: palette.ink, flexShrink: 1 }}>
                {item.title}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sansBold,
                  fontSize: 12,
                  color: item.status === "live" ? palette.green : palette.goldInk,
                }}
              >
                {statusLabels[item.status] ?? item.status}
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: palette.inkSoft }}>
              £{item.pricePcm}/{t("common.perMonth")} · {item.area}
            </Text>

            <PhotoManager listing={item} />

            <View style={{ borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10, gap: 8 }}>
              <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: palette.inkSoft }}>
                {t("contract.uploadTitle")}
              </Text>
              {contractState === "approved" ? (
                <Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: palette.green }}>
                  {t("contract.uploadApproved")}
                </Text>
              ) : contractState === "pending" ? (
                <Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: palette.goldInk }}>
                  {t("contract.uploadPending")}
                </Text>
              ) : (
                <>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, color: palette.inkSoft }}>
                    {t("contract.uploadBody")}
                  </Text>
                  <PrimaryButton
                    label={t("contract.uploadButton")}
                    onPress={async () => {
                      const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
                      if (result.canceled || !result.assets[0]) return;
                      try {
                        const storagePath = await uploadToBucket(
                          "contracts",
                          `${item.id}/${Date.now()}-contract.pdf`,
                          result.assets[0].uri,
                          "application/pdf",
                        );
                        await submitContract(item, storagePath);
                        Alert.alert("✓", t("onboarding.uploadSuccess"));
                        refresh();
                      } catch (e: any) {
                        Alert.alert("!", t("onboarding.uploadError", { message: String(e?.message ?? e) }));
                      }
                    }}
                  />
                </>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

const MAX_PHOTOS = 8;

function PhotoManager({ listing }: { listing: Listing }) {
  const { t } = useLang();
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getListingPhotos(listing.id).then(setPhotos).catch(() => {});
  }, [listing.id]);
  useEffect(load, [load]);

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10, gap: 8 }}>
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: palette.inkSoft }}>
        {t("listingForm.photosLabel")} ({photos.length}/{MAX_PHOTOS})
      </Text>
      {photos.length > 0 ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {photos.map((photo) => (
              <Pressable
                key={photo.id}
                disabled={busy}
                onPress={() => {
                  setBusy(true);
                  removeListingPhoto(listing, photo)
                    .catch((e: any) =>
                      Alert.alert("!", t("onboarding.uploadError", { message: String(e?.message ?? e) })),
                    )
                    .finally(() => {
                      load();
                      setBusy(false);
                    });
                }}
              >
                <Image
                  source={{ uri: photo.url }}
                  style={{ width: 72, height: 72, borderRadius: 10 }}
                  contentFit="cover"
                />
                <View
                  style={{
                    position: "absolute",
                    top: 3,
                    right: 3,
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 11, lineHeight: 13 }}>✕</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={{ fontFamily: fonts.sans, fontSize: 11.5, color: palette.inkMuted }}>
            {t("listingForm.photosEditHint")}
          </Text>
        </>
      ) : (
        <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, color: palette.inkSoft }}>
          {t("listingForm.photosEmpty")}
        </Text>
      )}
      {photos.length < MAX_PHOTOS ? (
        <PrimaryButton
          label={busy ? t("onboarding.uploading") : t("listingForm.addPhotos")}
          tone="gold"
          disabled={busy}
          onPress={async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsMultipleSelection: true,
              selectionLimit: MAX_PHOTOS - photos.length,
              quality: 0.7,
            });
            if (result.canceled || result.assets.length === 0) return;
            setBusy(true);
            try {
              await addListingPhotos(
                listing,
                result.assets.slice(0, MAX_PHOTOS - photos.length).map((a) => a.uri),
              );
              Alert.alert("✓", t("onboarding.uploadSuccess"));
            } catch (e: any) {
              Alert.alert("!", t("onboarding.uploadError", { message: String(e?.message ?? e) }));
            } finally {
              load();
              setBusy(false);
            }
          }}
        />
      ) : null}
    </View>
  );
}
