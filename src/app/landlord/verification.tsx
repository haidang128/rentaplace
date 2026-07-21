import * as DocumentPicker from "expo-document-picker";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { ChipSelect, LabeledInput, PrimaryButton } from "@/components/form";
import { Seal } from "@/components/seal";
import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import {
  declareScheme,
  getLandlordPhone,
  getMyVerification,
  setLandlordPhone,
  submitVerificationDoc,
} from "@/lib/data";
import type { VerificationState } from "@/lib/data/demo-store";
import { useLang } from "@/lib/i18n";
import type { DepositScheme } from "@/lib/types";

type DocKind = "identity" | "right_to_let" | "certificate";

/**
 * Best-effort E.164 normalisation of a typed phone number. Strips separators,
 * turns a leading "00" international prefix into "+", and prepends "+" when the
 * number already leads with a country code. A leading single "0" (a national
 * number) is left untouched — we can't know the country (UK 07… vs VN 09…), so
 * the caller rejects it and asks for international format.
 */
function normalizePhone(raw: string): string {
  const compact = raw.replace(/[\s()\-.]/g, "");
  if (!compact) return "";
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return "+" + compact.slice(2);
  if (/^[1-9]/.test(compact)) return "+" + compact;
  return compact;
}

export default function VerificationScreen() {
  const { t } = useLang();
  const { session } = useAuth();
  const [state, setState] = useState<VerificationState | null>(null);
  const [uploadingKind, setUploadingKind] = useState<DocKind | null>(null);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const refresh = useCallback(() => {
    if (session) {
      getMyVerification(session.userId).then(setState);
      getLandlordPhone(session.userId).then((p) => setPhone(p ?? ""));
    }
  }, [session]);

  useEffect(refresh, [refresh]);

  if (!session || session.role !== "landlord") return <Redirect href="/(tabs)/profile" />;

  const pickAndSubmit = async (kind: DocKind) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingKind(kind);
    try {
      await submitVerificationDoc(session.userId, session.displayName, kind, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? "application/octet-stream",
      });
      Alert.alert("✓", t("onboarding.uploadSuccess"));
      refresh();
    } catch (e: any) {
      Alert.alert("!", t("onboarding.uploadError", { message: String(e?.message ?? e) }));
    } finally {
      setUploadingKind(null);
    }
  };

  const savePhone = async () => {
    const normalized = normalizePhone(phone);
    // Empty clears the number. Otherwise require E.164 (leading +, country
    // code, up to 15 digits) so tel:/wa.me links resolve. normalizePhone
    // auto-adds + when the number already leads with a country code (or 00),
    // but a national "07700…" is ambiguous — Vietnamese mobiles also start
    // with 0 — so we can't guess the country and reject it with a hint.
    if (normalized && !/^\+[1-9]\d{7,14}$/.test(normalized)) {
      Alert.alert("!", t("onboarding.phoneInvalid"));
      return;
    }
    setSavingPhone(true);
    try {
      await setLandlordPhone(session.userId, normalized);
      setPhone(normalized);
      Alert.alert("✓", t("onboarding.phoneSaved"));
    } catch (e: any) {
      Alert.alert("!", t("onboarding.uploadError", { message: String(e?.message ?? e) }));
    } finally {
      setSavingPhone(false);
    }
  };

  const statusLabel = (s: string) =>
    t(
      s === "approved"
        ? "onboarding.statusApproved"
        : s === "submitted"
          ? "onboarding.statusSubmitted"
          : s === "rejected"
            ? "onboarding.statusRejected"
            : "onboarding.statusNone",
    );

  const statusColor = (s: string) =>
    s === "approved" ? palette.green : s === "submitted" ? palette.goldInk : s === "rejected" ? palette.brick : palette.inkMuted;

  if (!state) return null;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 640, width: "100%", alignSelf: "center" }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Seal size={28} />
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 22, color: palette.ink, flexShrink: 1 }}>
          {t("onboarding.title")}
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: palette.inkSoft }}>
        {t("onboarding.intro")}
      </Text>

      <View style={cardStyle}>
        <Text style={titleStyle}>{t("onboarding.phoneTitle")}</Text>
        <Text style={bodyStyle}>{t("onboarding.phoneBody")}</Text>
        <LabeledInput
          label={t("onboarding.phoneLabel")}
          value={phone}
          onChangeText={setPhone}
          placeholder="+44 7700 900000"
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <PrimaryButton
          label={savingPhone ? t("onboarding.phoneSaving") : t("onboarding.phoneSave")}
          onPress={savePhone}
          disabled={savingPhone}
        />
      </View>

      <DocCard
        title={t("onboarding.identityTitle")}
        body={t("onboarding.identityBody")}
        status={statusLabel(state.identityStatus)}
        statusColor={statusColor(state.identityStatus)}
        fileName={state.files?.identity}
        uploadedLabel={state.files?.identity ? t("onboarding.uploadedFile", { name: state.files.identity }) : undefined}
        actionLabel={uploadingKind === "identity" ? t("onboarding.uploading") : t("onboarding.upload")}
        onAction={
          state.identityStatus === "approved" || uploadingKind !== null
            ? undefined
            : () => pickAndSubmit("identity")
        }
      />
      <DocCard
        title={t("onboarding.rightToLetTitle")}
        body={t("onboarding.rightToLetBody")}
        status={statusLabel(state.rightToLetStatus)}
        statusColor={statusColor(state.rightToLetStatus)}
        fileName={state.files?.right_to_let}
        uploadedLabel={state.files?.right_to_let ? t("onboarding.uploadedFile", { name: state.files.right_to_let }) : undefined}
        actionLabel={uploadingKind === "right_to_let" ? t("onboarding.uploading") : t("onboarding.upload")}
        onAction={
          state.rightToLetStatus === "approved" || uploadingKind !== null
            ? undefined
            : () => pickAndSubmit("right_to_let")
        }
      />

      {/* Deposit pledge: declare scheme (tier 1), then certificate (tier 2) */}
      <View style={cardStyle}>
        <Text style={titleStyle}>{t("onboarding.schemeTitle")}</Text>
        <Text style={bodyStyle}>{t("onboarding.schemeBody")}</Text>
        <ChipSelect<DepositScheme>
          options={[
            { value: "dps", label: "DPS" },
            { value: "mydeposits", label: "mydeposits" },
            { value: "tds", label: "TDS" },
          ]}
          value={state.schemeDeclared}
          onChange={async (scheme) => {
            await declareScheme(session.userId, scheme);
            refresh();
          }}
        />
      </View>

      <DocCard
        title={t("onboarding.certificateTitle")}
        body={t("onboarding.certificateBody")}
        status={statusLabel(state.certificateStatus)}
        statusColor={statusColor(state.certificateStatus)}
        fileName={state.files?.certificate}
        uploadedLabel={state.files?.certificate ? t("onboarding.uploadedFile", { name: state.files.certificate }) : undefined}
        actionLabel={uploadingKind === "certificate" ? t("onboarding.uploading") : t("onboarding.upload")}
        onAction={
          state.certificateStatus === "approved" || uploadingKind !== null
            ? undefined
            : () => pickAndSubmit("certificate")
        }
      />
    </ScrollView>
  );
}

const cardStyle = {
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: palette.cardLine,
  borderRadius: radius.card,
  borderCurve: "continuous" as const,
  padding: 18,
  gap: 10,
};
const titleStyle = { fontFamily: fonts.sansBold, fontSize: 16, color: palette.ink };
const bodyStyle = { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 21, color: palette.inkSoft };

function DocCard({
  title,
  body,
  status,
  statusColor,
  actionLabel,
  onAction,
  fileName,
  uploadedLabel,
}: {
  title: string;
  body: string;
  status: string;
  statusColor: string;
  actionLabel: string;
  onAction?: () => void;
  fileName?: string;
  uploadedLabel?: string;
}) {
  return (
    <View style={cardStyle}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={[titleStyle, { flexShrink: 1 }]}>{title}</Text>
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 12.5, color: statusColor }}>{status}</Text>
      </View>
      <Text style={bodyStyle}>{body}</Text>
      {fileName && uploadedLabel ? (
        <Text
          numberOfLines={1}
          style={{ fontFamily: fonts.sansSemiBold, fontSize: 12.5, color: palette.green }}
        >
          📎 {uploadedLabel}
        </Text>
      ) : null}
      {onAction ? <PrimaryButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
