import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { ListingForm } from "@/components/listing-form";
import { Notice, useNotice } from "@/components/notice";
import { palette } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { getListing, updateListing } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import type { Listing } from "@/lib/types";

export default function EditListingScreen() {
  const { t } = useLang();
  const { session, ready } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { notice, showError, clearNotice } = useNotice();

  useEffect(() => {
    if (!id) return;
    getListing(id)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (ready && (!session || session.role !== "landlord")) return <Redirect href="/(tabs)/profile" />;

  if (!session || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.paper, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={palette.brick} />
      </View>
    );
  }

  // Someone else's listing (or a stale link) — the row-level policy would refuse
  // the update anyway, so don't offer the form.
  if (!listing || listing.landlordId !== session.userId) return <Redirect href="/landlord/listings" />;

  return (
    <ListingForm
      heading={t("listingForm.editTitle")}
      submitLabel={t("listingForm.saveChanges")}
      initial={listing}
      busy={saving}
      banner={<Notice notice={notice} />}
      onSubmit={async (values) => {
        setSaving(true);
        clearNotice();
        try {
          await updateListing(listing.id, values);
          router.back();
        } catch (e: any) {
          showError(t("onboarding.uploadError", { message: String(e?.message ?? e) }));
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
