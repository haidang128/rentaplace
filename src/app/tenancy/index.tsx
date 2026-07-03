import { Link, Redirect, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { getMyTenancies } from "@/lib/data";
import type { Tenancy } from "@/lib/data/demo-store";
import { useLang } from "@/lib/i18n";
import { dayOfLoop } from "@/lib/tenancy-utils";

export default function TenancyListScreen() {
  const { t } = useLang();
  const { session, ready } = useAuth();
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (session) getMyTenancies(session.userId).then(setTenancies);
    }, [session]),
  );

  if (ready && !session) return <Redirect href="/(tabs)/profile" />;

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 12, maxWidth: 640, width: "100%", alignSelf: "center" }}
      data={tenancies}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 22, color: palette.ink, paddingBottom: 4 }}>
          {t("tenancy.listTitle")}
        </Text>
      }
      ListEmptyComponent={
        <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, lineHeight: 22, color: palette.inkMuted }}>
          {t("tenancy.empty")}
        </Text>
      }
      renderItem={({ item }) => {
        const day = dayOfLoop(item.moveInDate);
        return (
          <Link href={`/tenancy/${item.id}` as any} asChild>
            <Pressable
              style={{
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: palette.cardLine,
                borderRadius: radius.card,
                borderCurve: "continuous",
                padding: 16,
                gap: 6,
              }}
            >
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 15, color: palette.ink }}>
                {item.listingTitle}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: palette.inkSoft }}>
                  £{item.depositAmount}
                </Text>
                {item.confirmedAt ? (
                  <Text style={{ fontFamily: fonts.sansBold, fontSize: 12.5, color: palette.green }}>✓</Text>
                ) : item.isLodger || item.status === "ended" ? null : (
                  <Text style={{ fontFamily: fonts.sansBold, fontSize: 12.5, color: palette.goldInk }}>
                    {day > 30 ? t("tenancy.overdue") : t("tenancy.dayCount", { day })}
                  </Text>
                )}
              </View>
            </Pressable>
          </Link>
        );
      }}
    />
  );
}
