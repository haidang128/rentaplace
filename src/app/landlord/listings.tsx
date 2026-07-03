import * as DocumentPicker from "expo-document-picker";
import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";

import { PrimaryButton } from "@/components/form";
import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { getApprovedContractSummary, getMyListings, submitContract } from "@/lib/data";
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
