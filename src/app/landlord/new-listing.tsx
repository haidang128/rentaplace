import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/form";
import { ListingForm } from "@/components/listing-form";
import { Notice, useNotice } from "@/components/notice";
import { fonts, palette } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { createListing, uploadListingPhotos } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export default function NewListingScreen() {
  const { t } = useLang();
  const { session, ready } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { notice, showError, clearNotice } = useNotice();

  if (ready && (!session || session.role !== "landlord")) return <Redirect href="/(tabs)/profile" />;
  if (!session) return null;

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.paper, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 24, color: palette.green }}>
          {t("listingForm.submittedTitle")}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 15, lineHeight: 24, color: palette.inkSoft, textAlign: "center", maxWidth: 420 }}>
          {t("listingForm.submittedBody")}
        </Text>
        <PrimaryButton label={t("common.back")} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ListingForm
      heading={t("listingForm.title")}
      submitLabel={t("listingForm.submit")}
      withPhotos
      busy={submitting}
      banner={<Notice notice={notice} />}
      onSubmit={async (values, photos) => {
        setSubmitting(true);
        clearNotice();
        try {
          const listingId = await createListing({ ...values, landlordId: session.userId }, session.displayName);
          if (photos.length > 0) await uploadListingPhotos(listingId, photos);
          setSubmitted(true);
        } catch (e: any) {
          showError(t("onboarding.uploadError", { message: String(e?.message ?? e) }));
        } finally {
          setSubmitting(false);
        }
      }}
    />
  );
}
