import { Image } from "expo-image";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { ReportBlock } from "@/components/report-block";
import { ContactActions } from "@/components/contact-actions";
import { PrimaryButton } from "@/components/form";
import { Seal } from "@/components/seal";
import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { getApprovedContractSummary, getLandlord, getListing, getOrCreateConversation } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import type { Landlord, Listing } from "@/lib/types";

const schemeLabels = { dps: "DPS", mydeposits: "mydeposits", tds: "TDS" } as const;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLang();
  const { session } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const [listing, setListing] = useState<Listing | null>(null);
  const [landlord, setLandlord] = useState<Landlord | null>(null);
  const [hasContractSummary, setHasContractSummary] = useState(false);

  useEffect(() => {
    if (!id) return;
    getListing(id).then(async (l) => {
      setListing(l);
      if (l) setLandlord(await getLandlord(l.landlordId));
    });
    getApprovedContractSummary(id).then((s) => setHasContractSummary(!!s));
  }, [id]);

  if (!listing) return null;

  const scheme = landlord?.depositSchemeDeclared ? schemeLabels[landlord.depositSchemeDeclared] : null;
  const availableDate = listing.availableFrom
    ? new Date(listing.availableFrom).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", {
        day: "2-digit",
        month: "2-digit",
      })
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 16 }}>
        {/* photos */}
        <View style={{ height: 236, backgroundColor: palette.paperDeep, alignItems: "center", justifyContent: "center" }}>
          {listing.photoUrls.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
              {listing.photoUrls.map((uri) => (
                <Image key={uri} source={{ uri }} style={{ width: screenWidth, height: 236 }} contentFit="cover" transition={150} />
              ))}
            </ScrollView>
          ) : (
            <Text style={{ fontSize: 10, color: palette.inkFaint }}>{t("landing.hero.cardPhotoPlaceholder")}</Text>
          )}
          {listing.photosCheckedAt ? (
            <View
              style={{
                position: "absolute",
                bottom: 12,
                left: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(44,32,26,0.85)",
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 11.5, color: "#fff" }}>
                {t("listing.realPhotos", {
                  date: new Date(listing.photosCheckedAt).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                  }),
                })}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ padding: 20, gap: 12, maxWidth: 640, width: "100%", alignSelf: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 26, color: palette.ink }}>
              £{listing.pricePcm}
              <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: palette.inkMuted }}>
                /{t("common.perMonth")}
              </Text>
            </Text>
            {availableDate ? (
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 12.5, color: palette.green }}>
                {t("listing.availableFrom", { date: availableDate })}
              </Text>
            ) : null}
          </View>
          <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: palette.inkSoft }}>
            {listing.title} · {listing.area}, {listing.city}
            {listing.billsIncluded ? ` · ${t("listing.billsIncluded")}` : ""}
          </Text>

          {/* Approximate location on the map (area-level; exact address only after contact) */}
          <Pressable
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${listing.area}, ${listing.city}, UK`,
                )}`,
              )
            }
          >
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13.5, color: palette.brick }}>
              📍 {t("listing.mapLink")}
            </Text>
          </Pressable>

          {/* Verification checklist — the seal card. The seal header only appears
              when identity + right-to-let are actually approved. */}
          <View
            style={{
              backgroundColor: "#fff",
              borderWidth: 1.5,
              borderColor:
                landlord?.identityVerified && landlord?.rightToLetVerified ? palette.gold : palette.cardLine,
              borderRadius: radius.card,
              borderCurve: "continuous",
              padding: 18,
              gap: 10,
              boxShadow: "0 8px 22px rgba(178,58,46,0.08)",
            }}
          >
            {landlord?.identityVerified && landlord?.rightToLetVerified ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                <Seal size={26} />
                <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 15, color: palette.ink }}>
                  {t("trust.sealTitle")}
                </Text>
              </View>
            ) : (
              <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 20, color: palette.goldInk }}>
                {t("trust.pendingVerification")}
              </Text>
            )}

            {landlord?.identityVerified ? <CheckRow label={t("trust.checkIdentity")} /> : null}
            {listing.photosCheckedAt ? <CheckRow label={t("trust.checkPhotos")} /> : null}

            {listing.liveInLandlord ? (
              <Link href="/handbook" asChild>
                <Pressable>
                  <View
                    style={{
                      backgroundColor: palette.goldWash,
                      borderRadius: radius.field,
                      borderCurve: "continuous",
                      padding: 12,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 20, color: palette.goldInk }}>
                      {t("trust.lodgerRow")}
                    </Text>
                  </View>
                </Pressable>
              </Link>
            ) : scheme ? (
              <CheckRow
                label={
                  landlord?.certificateReviewed
                    ? t("trust.checkDepositPledge", { scheme })
                    : t("trust.checkDepositDeclaredOnly", { scheme })
                }
                tone={landlord?.certificateReviewed ? "check" : "pending"}
              />
            ) : null}

            {hasContractSummary ? (
              <Link href={`/contract/${listing.id}` as any} asChild>
                <Pressable>
                  <CheckRow label={t("trust.checkContract")} />
                </Pressable>
              </Link>
            ) : null}

            {/* Education row — read before you pay */}
            {!listing.liveInLandlord ? (
              <Link href="/handbook" asChild>
                <Pressable>
                  <Text
                    style={{
                      fontFamily: fonts.sansBold,
                      fontSize: 13.5,
                      color: palette.brick,
                      textDecorationLine: "underline",
                    }}
                  >
                    {t("trust.rightsRow")}
                  </Text>
                </Pressable>
              </Link>
            ) : null}
          </View>

          {/* landlord row */}
          {landlord ? (
            <Link href={`/landlords/${landlord.id}` as any} asChild>
              <Pressable
                style={{
                  backgroundColor: "#fff",
                  borderWidth: 1,
                  borderColor: palette.cardLine,
                  borderRadius: radius.card,
                  borderCurve: "continuous",
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    backgroundColor: palette.goldWash,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 17, color: palette.goldInk }}>
                    {landlord.displayName.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontFamily: fonts.sansBold, fontSize: 14.5, color: palette.ink }}>
                      {landlord.nickname ?? landlord.displayName}
                    </Text>
                    {landlord.identityVerified && landlord.rightToLetVerified ? (
                      <Seal size={15} accent={null} />
                    ) : null}
                  </View>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: palette.inkMuted }}>
                    {landlord.stats.completedTenancies} {t("trust.statTenancies")}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.sansBold, fontSize: 12.5, color: palette.brick }}>
                  {t("listing.viewProfile")}
                </Text>
              </Pressable>
            </Link>
          ) : null}

          {listing.description ? (
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 23, color: palette.inkSoft }}>
              {listing.description}
            </Text>
          ) : null}

          {session ? (
            <Link href={`/tenancy/new?listingId=${listing.id}` as any} asChild>
              <Pressable style={{ paddingVertical: 4 }}>
                <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13.5, color: palette.brick }}>
                  {t("tenancy.recordLink")}
                </Text>
              </Pressable>
            </Link>
          ) : null}
        </View>

        {/* Guideline 1.2: every piece of user-generated content needs a way to
            report it, listings included. */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <ReportBlock targetType="listing" targetId={listing.id} />
        </View>
      </ScrollView>

      {/* CTA */}
      <View
        style={{
          padding: 20,
          paddingBottom: 28,
          backgroundColor: palette.cream,
          borderTopWidth: 1,
          borderTopColor: palette.line,
          gap: 8,
        }}
      >
        {landlord ? <ContactActions landlordId={landlord.id} /> : null}
        <PrimaryButton
          label={t("listing.messageLandlord")}
          onPress={async () => {
            if (!session) {
              router.push("/(tabs)/profile");
              return;
            }
            if (!landlord) return;
            const conv = await getOrCreateConversation({
              listingId: listing.id,
              listingTitle: listing.title,
              renterId: session.userId,
              renterName: session.displayName,
              landlordId: landlord.id,
              landlordName: landlord.displayName,
            });
            router.push(`/chat/${conv.id}` as any);
          }}
        />
        <Text style={{ fontFamily: fonts.sans, fontSize: 11.5, color: palette.inkMuted, textAlign: "center" }}>
          {t("listing.noPayment")}
        </Text>
      </View>
    </View>
  );
}

function CheckRow({ label, tone = "check" }: { label: string; tone?: "check" | "pending" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
      <View
        style={{
          width: 21,
          height: 21,
          borderRadius: 999,
          backgroundColor: tone === "check" ? palette.greenWash : palette.goldWash,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontFamily: fonts.sansExtraBold,
            fontSize: 11,
            color: tone === "check" ? palette.green : palette.goldInk,
          }}
        >
          {tone === "check" ? "✓" : "…"}
        </Text>
      </View>
      <Text style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 13.5, color: palette.ink }}>{label}</Text>
    </View>
  );
}
