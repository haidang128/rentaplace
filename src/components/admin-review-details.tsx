import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";

import { fonts, palette } from "@/constants/theme";
import { getContractFilePath, getListing, getVerificationDocPaths } from "@/lib/data";
import type { OpenedReason, QueueItem } from "@/lib/data/demo-store";
import { useLang } from "@/lib/i18n";
import { signedDocUrl } from "@/lib/upload";
import type { Listing } from "@/lib/types";

/** What the admin needs to SEE before approving: listing details or the uploaded document. */
export function AdminReviewDetails({ item }: { item: QueueItem }) {
  if (item.type === "photos") {
    return <ListingPreview listingId={item.subjectId} openedReason={item.openedReason} />;
  }
  if (["identity", "right_to_let", "certificate"].includes(item.type)) {
    return <VerificationDocLink landlordId={item.subjectId} kind={item.type as DocKind} />;
  }
  if (item.type === "contract_summary") return <ContractDocLink summaryId={item.subjectId} />;
  return null;
}

type DocKind = "identity" | "right_to_let" | "certificate";

const reasonKeys: Record<OpenedReason, string> = {
  new: "admin.reasonNew",
  photos: "admin.reasonPhotos",
  edit: "admin.reasonEdit",
  both: "admin.reasonBoth",
};

function ListingPreview({
  listingId,
  openedReason,
}: {
  listingId: string;
  openedReason: OpenedReason | null;
}) {
  const { t } = useLang();
  const [listing, setListing] = useState<Listing | null>(null);

  useEffect(() => {
    getListing(listingId).then(setListing);
  }, [listingId]);

  if (!listing) return null;

  return (
    <View style={{ gap: 8 }}>
      {/* What brought this back to the queue — a price edit must not read as
          "new photos". Older items carry no reason; fall back to the status. */}
      {openedReason ? (
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, color: palette.goldInk }}>
          {t(reasonKeys[openedReason])}
          {listing.status === "live" ? ` · ${t("admin.stillLive")}` : ""}
        </Text>
      ) : listing.status === "live" ? (
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, color: palette.green }}>
          {t("admin.liveReReview")}
        </Text>
      ) : null}
      {listing.photoUrls.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {listing.photoUrls.map((uri) => (
            <Image key={uri} source={{ uri }} style={{ width: 110, height: 110, borderRadius: 10 }} contentFit="cover" />
          ))}
        </ScrollView>
      ) : (
        <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: palette.inkMuted }}>
          {t("admin.noPhotos")}
        </Text>
      )}
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13.5, color: palette.ink }}>
        £{listing.pricePcm}/{t("common.perMonth")} · {t("listingForm.fieldDeposit")} £{listing.depositAmount} ·{" "}
        {listing.area}, {listing.city}
      </Text>
      {listing.liveInLandlord ? (
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 12.5, color: palette.goldInk }}>
          ⚠ {t("listingForm.fieldLiveIn")}
        </Text>
      ) : null}
      {listing.description ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: palette.inkSoft }}>
          {listing.description}
        </Text>
      ) : null}
    </View>
  );
}

function DocButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 4 }}>
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 13.5, color: palette.brick, textDecorationLine: "underline" }}>
        📄 {label}
      </Text>
    </Pressable>
  );
}

function VerificationDocLink({ landlordId, kind }: { landlordId: string; kind: DocKind }) {
  const { t } = useLang();
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    getVerificationDocPaths(landlordId).then((paths) => setPath(paths[kind] ?? null));
  }, [landlordId, kind]);

  if (!path) {
    return (
      <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: palette.inkMuted }}>
        {t("admin.noDocument")}
      </Text>
    );
  }
  const kindLabels: Record<DocKind, string> = {
    identity: t("admin.typeIdentity"),
    right_to_let: t("admin.typeRightToLet"),
    certificate: t("admin.typeCertificate"),
  };
  return (
    <DocButton
      label={t("admin.viewDocument", { kind: kindLabels[kind] })}
      onPress={async () => {
        const url = await signedDocUrl("certificates", path);
        Linking.openURL(url);
      }}
    />
  );
}

function ContractDocLink({ summaryId }: { summaryId: string }) {
  const { t } = useLang();
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    getContractFilePath(summaryId).then(setPath);
  }, [summaryId]);

  if (!path) return null;
  return (
    <DocButton
      label={t("admin.viewDocument", { kind: "PDF" })}
      onPress={async () => {
        const url = await signedDocUrl("contracts", path);
        Linking.openURL(url);
      }}
    />
  );
}
