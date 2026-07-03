import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { ChipSelect, LabeledInput, PrimaryButton, ToggleRow } from "@/components/form";
import { fonts, palette } from "@/constants/theme";
import { getContractDraft, saveContractDraft } from "@/lib/data";
import type { ContractExtract } from "@/lib/data/demo-store";
import { useLang } from "@/lib/i18n";
import type { DepositScheme } from "@/lib/types";

type SchemeOption = DepositScheme | "none";

/**
 * Admin manual-entry form for a contract summary. Prefilled from the AI draft
 * when the Edge Function ran; fully hand-typed otherwise (the zero-cost path).
 */
export function ContractReviewForm({
  subjectId,
  onApprove,
}: {
  subjectId: string;
  onApprove: () => Promise<void>;
}) {
  const { t } = useLang();
  const [rent, setRent] = useState("");
  const [rentDay, setRentDay] = useState("1");
  const [deposit, setDeposit] = useState("");
  const [notice, setNotice] = useState("2");
  const [scheme, setScheme] = useState<SchemeOption>("none");
  const [bills, setBills] = useState(true);
  const [periodic, setPeriodic] = useState(true);
  const [lodger, setLodger] = useState(false);
  const [clauses, setClauses] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getContractDraft(subjectId).then((draft) => {
      if (!draft) return;
      if (draft.rentPcm != null) setRent(String(draft.rentPcm));
      if (draft.rentDueDay != null) setRentDay(String(draft.rentDueDay));
      if (draft.depositAmount != null) setDeposit(String(draft.depositAmount));
      if (draft.noticeMonths != null) setNotice(String(draft.noticeMonths));
      setScheme(draft.scheme ?? "none");
      if (draft.billsIncluded != null) setBills(draft.billsIncluded);
      if (draft.termType != null) setPeriodic(draft.termType === "periodic");
      if (draft.isLodgerAgreement != null) setLodger(draft.isLodgerAgreement);
      setClauses(draft.unusualClauses.join("\n"));
    });
  }, [subjectId]);

  const valid = (parseInt(rent, 10) || 0) > 0 && (parseInt(deposit, 10) || 0) >= 0;

  const buildExtract = (): ContractExtract => ({
    rentPcm: parseInt(rent, 10) || null,
    rentDueDay: parseInt(rentDay, 10) || null,
    billsIncluded: bills,
    depositAmount: parseInt(deposit, 10) || null,
    scheme: scheme === "none" ? null : scheme,
    noticeMonths: parseFloat(notice) || null,
    termType: periodic ? "periodic" : "fixed",
    isLodgerAgreement: lodger,
    unusualClauses: clauses
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  });

  return (
    <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 12 }}>
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 14, color: palette.ink }}>
        {t("admin.contractFormTitle")}
      </Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, color: palette.inkSoft }}>
        {t("admin.contractFormHint")}
      </Text>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <LabeledInput label={t("admin.fieldRent")} value={rent} onChangeText={setRent} inputMode="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          <LabeledInput label={t("admin.fieldRentDay")} value={rentDay} onChangeText={setRentDay} inputMode="numeric" />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <LabeledInput label={t("admin.fieldDeposit")} value={deposit} onChangeText={setDeposit} inputMode="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          <LabeledInput label={t("admin.fieldNotice")} value={notice} onChangeText={setNotice} inputMode="numeric" />
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: palette.inkSoft }}>
          {t("admin.fieldScheme")}
        </Text>
        <ChipSelect<SchemeOption>
          options={[
            { value: "dps", label: "DPS" },
            { value: "mydeposits", label: "mydeposits" },
            { value: "tds", label: "TDS" },
            { value: "none", label: t("admin.schemeNone") },
          ]}
          value={scheme}
          onChange={setScheme}
        />
      </View>

      <ToggleRow label={t("admin.fieldBills")} value={bills} onChange={setBills} />
      <ToggleRow label={t("admin.fieldTermPeriodic")} value={periodic} onChange={setPeriodic} />
      <ToggleRow label={t("admin.fieldLodger")} value={lodger} onChange={setLodger} />

      <LabeledInput
        label={t("admin.fieldClauses")}
        value={clauses}
        onChangeText={setClauses}
        multiline
        style={{ minHeight: 70, textAlignVertical: "top" }}
      />

      <PrimaryButton
        label={t("admin.saveApprove")}
        tone="green"
        disabled={!valid || saving}
        onPress={async () => {
          setSaving(true);
          try {
            await saveContractDraft(subjectId, buildExtract());
            await onApprove();
          } finally {
            setSaving(false);
          }
        }}
      />
    </View>
  );
}
