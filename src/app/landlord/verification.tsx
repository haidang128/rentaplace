import * as DocumentPicker from "expo-document-picker";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { ChipSelect, PrimaryButton } from "@/components/form";
import { Seal } from "@/components/seal";
import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { declareScheme, getMyVerification, submitVerificationDoc } from "@/lib/data";
import type { VerificationState } from "@/lib/data/demo-store";
import { useLang } from "@/lib/i18n";
import type { DepositScheme } from "@/lib/types";

type DocKind = "identity" | "right_to_let" | "certificate";

export default function VerificationScreen() {
  const { t } = useLang();
  const { session } = useAuth();
  const [state, setState] = useState<VerificationState | null>(null);

  const refresh = useCallback(() => {
    if (session) getMyVerification(session.userId).then(setState);
  }, [session]);

  useEffect(refresh, [refresh]);

  if (!session || session.role !== "landlord") return <Redirect href="/(tabs)/profile" />;

  const pickAndSubmit = async (kind: DocKind) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
    });
    if (result.canceled || !result.assets[0]) return;
    await submitVerificationDoc(session.userId, session.displayName, kind, result.assets[0].name);
    refresh();
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

      <DocCard
        title={t("onboarding.identityTitle")}
        body={t("onboarding.identityBody")}
        status={statusLabel(state.identityStatus)}
        statusColor={statusColor(state.identityStatus)}
        actionLabel={t("onboarding.upload")}
        onAction={state.identityStatus === "approved" ? undefined : () => pickAndSubmit("identity")}
      />
      <DocCard
        title={t("onboarding.rightToLetTitle")}
        body={t("onboarding.rightToLetBody")}
        status={statusLabel(state.rightToLetStatus)}
        statusColor={statusColor(state.rightToLetStatus)}
        actionLabel={t("onboarding.upload")}
        onAction={state.rightToLetStatus === "approved" ? undefined : () => pickAndSubmit("right_to_let")}
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
        actionLabel={t("onboarding.upload")}
        onAction={state.certificateStatus === "approved" ? undefined : () => pickAndSubmit("certificate")}
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
}: {
  title: string;
  body: string;
  status: string;
  statusColor: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <View style={cardStyle}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={[titleStyle, { flexShrink: 1 }]}>{title}</Text>
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 12.5, color: statusColor }}>{status}</Text>
      </View>
      <Text style={bodyStyle}>{body}</Text>
      {onAction ? <PrimaryButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
