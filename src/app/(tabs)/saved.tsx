import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Text } from "react-native";

import { ListingCard } from "@/components/listing-card";
import { fonts, palette } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { getLandlord, getLiveListings, getSavedIds, toggleSaved } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import type { Landlord, Listing } from "@/lib/types";

export default function SavedScreen() {
  const { t } = useLang();
  const { session } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [landlords, setLandlords] = useState<Record<string, Landlord>>({});
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([getLiveListings(), getSavedIds(session?.userId ?? null)]).then(async ([rows, saved]) => {
        if (!alive) return;
        setSavedIds(saved);
        const savedListings = rows.filter((l) => saved.includes(l.id));
        setListings(savedListings);
        const ids = [...new Set(savedListings.map((l) => l.landlordId))];
        const loaded = await Promise.all(ids.map(getLandlord));
        if (alive) setLandlords(Object.fromEntries(loaded.filter(Boolean).map((l) => [l!.id, l!])));
      });
      return () => {
        alive = false;
      };
    }, [session?.userId]),
  );

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 720, width: "100%", alignSelf: "center" }}
      data={listings}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 26, color: palette.ink, paddingBottom: 6 }}>
          {t("tabs.saved")}
        </Text>
      }
      ListEmptyComponent={
        <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: palette.inkMuted }}>
          {t("savedTab.empty")}
        </Text>
      }
      renderItem={({ item }) => (
        <ListingCard
          listing={item}
          landlord={landlords[item.landlordId]}
          saved
          onToggleSaved={async () => {
            setListings((prev) => prev.filter((l) => l.id !== item.id));
            await toggleSaved(session?.userId ?? null, item.id, true);
          }}
        />
      )}
    />
  );
}
