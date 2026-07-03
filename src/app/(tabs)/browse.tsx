import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";

import { Seal } from "@/components/seal";
import { TrustChip } from "@/components/trust-chip";
import { fonts, palette, radius } from "@/constants/theme";
import { getLandlord, getLiveListings } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import type { Landlord, Listing } from "@/lib/types";

export default function BrowseScreen() {
  const { t } = useLang();
  const [listings, setListings] = useState<Listing[]>([]);
  const [landlords, setLandlords] = useState<Record<string, Landlord>>({});

  useEffect(() => {
    getLiveListings().then(async (rows) => {
      setListings(rows);
      const ids = [...new Set(rows.map((l) => l.landlordId))];
      const loaded = await Promise.all(ids.map(getLandlord));
      setLandlords(Object.fromEntries(loaded.filter(Boolean).map((l) => [l!.id, l!])));
    });
  }, []);

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 14 }}
      data={listings}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 26, color: palette.ink, paddingBottom: 6 }}>
          {t("browse.title")}
        </Text>
      }
      renderItem={({ item }) => {
        const landlord = landlords[item.landlordId];
        return (
          <View
            style={{
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: palette.cardLine,
              borderRadius: radius.card,
              borderCurve: "continuous",
              overflow: "hidden",
              boxShadow: "0 4px 14px rgba(60,40,20,0.06)",
            }}
          >
            <View
              style={{
                height: 150,
                backgroundColor: palette.paperDeep,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 10, color: palette.inkFaint }}>
                {t("landing.hero.cardPhotoPlaceholder")}
              </Text>
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "#fff",
                  borderRadius: 999,
                  paddingVertical: 6,
                  paddingLeft: 7,
                  paddingRight: 11,
                  boxShadow: "0 3px 10px rgba(0,0,0,0.14)",
                }}
              >
                <Seal size={16} />
                <Text style={{ fontFamily: fonts.sansBold, fontSize: 11.5, color: palette.ink }}>
                  {t("common.verified")}
                </Text>
              </View>
            </View>
            <View style={{ padding: 16, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 20, color: palette.ink }}>
                  £{item.pricePcm}
                  <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: palette.inkMuted }}>
                    /{t("common.perMonth")}
                  </Text>
                </Text>
                {item.vietnameseFlatmates > 0 ? (
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 999,
                      backgroundColor: palette.goldWash,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.sansBold, fontSize: 11.5, color: palette.goldInk }}>
                      {t("listing.flatmatesVietnamese", { count: item.vietnameseFlatmates })}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: palette.inkSoft }}>
                {item.title} · {item.area}
              </Text>
              {item.liveInLandlord ? (
                <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12.5, color: palette.goldInk }}>
                  {t("trust.lodgerRow")}
                </Text>
              ) : landlord ? (
                <TrustChip tier={landlord.trustTier} scheme={landlord.depositSchemeDeclared} size="sm" />
              ) : null}
            </View>
          </View>
        );
      }}
    />
  );
}
