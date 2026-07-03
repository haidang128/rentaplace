import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";

import { PrimaryButton } from "@/components/form";
import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { getReviewQueue, resolveReview } from "@/lib/data";
import type { QueueItem } from "@/lib/data/demo-store";
import { useLang } from "@/lib/i18n";

const typeKeys: Record<QueueItem["type"], string> = {
  identity: "admin.typeIdentity",
  right_to_let: "admin.typeRightToLet",
  certificate: "admin.typeCertificate",
  photos: "admin.typePhotos",
  contract_summary: "admin.typeContract",
};

export default function AdminQueueScreen() {
  const { t } = useLang();
  const { session, ready } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);

  const refresh = useCallback(() => {
    getReviewQueue().then(setItems);
  }, []);

  useEffect(refresh, [refresh]);

  if (ready && (!session || session.role !== "admin")) return <Redirect href="/(tabs)/profile" />;

  const open = items.filter((i) => i.status === "open");
  const resolved = items.filter((i) => i.status !== "open");

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 12, maxWidth: 720, width: "100%", alignSelf: "center" }}
      data={open}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 22, color: palette.ink, paddingBottom: 4 }}>
          {t("admin.title")}
        </Text>
      }
      ListEmptyComponent={
        <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: palette.inkMuted }}>{t("admin.empty")}</Text>
      }
      ListFooterComponent={
        resolved.length > 0 ? (
          <View style={{ gap: 8, paddingTop: 16 }}>
            <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 0.8, color: palette.inkMuted }}>
              {t("admin.resolved").toUpperCase()}
            </Text>
            {resolved.map((item) => (
              <View key={item.id} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: fonts.sansBold,
                    fontSize: 12,
                    color: item.status === "approved" ? palette.green : palette.brick,
                  }}
                >
                  {item.status === "approved" ? "✓" : "✕"}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: palette.inkSoft, flex: 1 }}>
                  {t(typeKeys[item.type])} — {item.subjectLabel}
                </Text>
              </View>
            ))}
          </View>
        ) : null
      }
      renderItem={({ item }) => (
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
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 0.6, color: palette.goldInk }}>
            {t(typeKeys[item.type]).toUpperCase()}
          </Text>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: palette.ink }}>
            {item.subjectLabel}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={t("admin.approve")}
                tone="green"
                onPress={async () => {
                  await resolveReview(item.id, "approved");
                  refresh();
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={t("admin.reject")}
                onPress={async () => {
                  await resolveReview(item.id, "rejected");
                  refresh();
                }}
              />
            </View>
          </View>
        </View>
      )}
    />
  );
}
