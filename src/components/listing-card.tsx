import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Seal } from "@/components/seal";
import { TrustChip } from "@/components/trust-chip";
import { fonts, palette, radius } from "@/constants/theme";
import { useLang } from "@/lib/i18n";
import type { Landlord, Listing } from "@/lib/types";

export function ListingCard({
  listing,
  landlord,
  saved,
  onToggleSaved,
}: {
  listing: Listing;
  landlord?: Landlord;
  saved: boolean;
  onToggleSaved: () => void;
}) {
  const { t } = useLang();

  return (
    <Link href={`/listing/${listing.id}` as any} asChild>
      <Pressable
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
          {listing.photoUrls.length > 0 ? (
            <Image
              source={{ uri: listing.photoUrls[0] }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Text style={{ fontSize: 10, color: palette.inkFaint }}>
              {t("landing.hero.cardPhotoPlaceholder")}
            </Text>
          )}
          {/* The seal is earned: only when the landlord's identity AND right-to-let
              are admin-approved. Never decorative. */}
          {landlord?.identityVerified && landlord?.rightToLetVerified ? (
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
          ) : null}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleSaved();
            }}
            hitSlop={8}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 34,
              height: 34,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.94)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 16, color: saved ? palette.brick : palette.inkMuted }}>
              {saved ? "♥" : "♡"}
            </Text>
          </Pressable>
        </View>
        <View style={{ padding: 16, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 20, color: palette.ink }}>
              £{listing.pricePcm}
              <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: palette.inkMuted }}>
                /{t("common.perMonth")}
              </Text>
            </Text>
            {listing.vietnameseFlatmates > 0 ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: palette.goldWash,
                }}
              >
                <Text style={{ fontFamily: fonts.sansBold, fontSize: 11.5, color: palette.goldInk }}>
                  {t("listing.flatmatesVietnamese", { count: listing.vietnameseFlatmates })}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: palette.inkSoft }}>
            {listing.title} · {listing.area}
          </Text>
          {listing.liveInLandlord ? (
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12.5, color: palette.goldInk }}>
              {t("trust.lodgerRow")}
            </Text>
          ) : landlord ? (
            <TrustChip tier={landlord.trustTier} scheme={landlord.depositSchemeDeclared} size="sm" />
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
