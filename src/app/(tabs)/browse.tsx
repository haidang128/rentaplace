import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { ListingCard } from "@/components/listing-card";
import { fonts, palette } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { getLandlord, getLiveListings, getSavedIds, toggleSaved } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import type { Landlord, Listing } from "@/lib/types";

type Filter = "flatmates" | "price" | "nearUni";

export default function BrowseScreen() {
  const { t } = useLang();
  const { session } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [landlords, setLandlords] = useState<Record<string, Landlord>>({});
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<Set<Filter>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([getLiveListings(), getSavedIds(session?.userId ?? null)]).then(async ([rows, saved]) => {
        if (!alive) return;
        setListings(rows);
        setSavedIds(saved);
        const ids = [...new Set(rows.map((l) => l.landlordId))];
        const loaded = await Promise.all(ids.map(getLandlord));
        if (alive) setLandlords(Object.fromEntries(loaded.filter(Boolean).map((l) => [l!.id, l!])));
      });
      return () => {
        alive = false;
      };
    }, [session?.userId]),
  );

  const toggleFilter = (f: Filter) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const visible = listings.filter((l) => {
    if (filters.has("flatmates") && l.vietnameseFlatmates === 0) return false;
    if (filters.has("price") && l.pricePcm > 600) return false;
    if (filters.has("nearUni") && !l.nearUniversity) return false;
    return true;
  });

  const onToggleSaved = async (listing: Listing) => {
    const isSaved = savedIds.includes(listing.id);
    setSavedIds((prev) => (isSaved ? prev.filter((id) => id !== listing.id) : [...prev, listing.id]));
    await toggleSaved(session?.userId ?? null, listing.id, isSaved);
  };

  const filterChips: { key: Filter; label: string }[] = [
    { key: "flatmates", label: t("browse.filterFlatmates") },
    { key: "price", label: t("browse.filterPrice") },
    { key: "nearUni", label: t("browse.filterNearUni") },
  ];

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 720, width: "100%", alignSelf: "center" }}
      data={visible}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={{ gap: 12, paddingBottom: 6 }}>
          <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 26, color: palette.ink }}>
            {t("browse.title")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {filterChips.map(({ key, label }) => {
              const active = filters.has(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => toggleFilter(key)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: active ? palette.brick : palette.lineStrong,
                    backgroundColor: active ? palette.brick : "#fff",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansBold,
                      fontSize: 13,
                      color: active ? "#fff" : palette.inkSoft,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={{ gap: 10, paddingTop: 20, alignItems: "flex-start" }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: palette.inkMuted }}>
            {t("browse.noMatches")}
          </Text>
          {filters.size > 0 ? (
            <Pressable
              onPress={() => setFilters(new Set())}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: palette.lineStrong,
                backgroundColor: "#fff",
              }}
            >
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: palette.inkSoft }}>
                {t("browse.clearFilters")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <ListingCard
          listing={item}
          landlord={landlords[item.landlordId]}
          saved={savedIds.includes(item.id)}
          onToggleSaved={() => onToggleSaved(item)}
        />
      )}
    />
  );
}
