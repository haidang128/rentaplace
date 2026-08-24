import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { LabeledInput, PrimaryButton } from "@/components/form";
import { Notice, useNotice } from "@/components/notice";
import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { blockUser, reportContent, type ReportTarget } from "@/lib/data";
import { useLang } from "@/lib/i18n";

/**
 * Report, and optionally block — the two controls App Store Guideline 1.2 asks
 * for on user-generated content. Rendered as a quiet text link that opens an
 * inline panel rather than a modal: Alert.prompt does not exist on web, and the
 * app already prefers inline notices over alerts everywhere else.
 *
 * `blockId` is the person to block. Omit it where blocking makes no sense (a
 * listing report), and only the report control shows.
 */
export function ReportBlock({
  targetType,
  targetId,
  blockId,
  blockLabel,
  onBlocked,
}: {
  targetType: ReportTarget;
  targetId: string;
  blockId?: string;
  /** Who the block is against, so the confirm line can name them. */
  blockLabel?: string;
  onBlocked?: () => void;
}) {
  const { t } = useLang();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const { notice, showSuccess, showError, clearNotice } = useNotice();

  // A signed-out visitor can still browse listings, so the report affordance
  // stays visible for them — it explains how to sign in rather than vanishing.
  const signedOut = !session;

  const submitReport = async () => {
    setBusy(true);
    clearNotice();
    try {
      await reportContent(session!.userId, targetType, targetId, reason);
      setOpen(false);
      setReason("");
      showSuccess(t("safety.reportSent"));
    } catch {
      showError(t("safety.reportFailed"));
    } finally {
      setBusy(false);
    }
  };

  const confirmBlock = async () => {
    if (!blockId) return;
    setBusy(true);
    clearNotice();
    try {
      await blockUser(session!.userId, blockId);
      setConfirmingBlock(false);
      setOpen(false);
      showSuccess(t("safety.blocked"));
      onBlocked?.();
    } catch {
      showError(t("safety.blockFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <Notice notice={notice} />

      {!open ? (
        <Pressable
          onPress={() => (signedOut ? showError(t("safety.signInToReport")) : setOpen(true))}
          style={{ alignSelf: "flex-start", paddingVertical: 6 }}
        >
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12.5, color: palette.inkMuted }}>
            {t("safety.reportLink")}
          </Text>
        </Pressable>
      ) : (
        <View
          style={{
            backgroundColor: palette.cream,
            borderWidth: 1,
            borderColor: palette.lineStrong,
            borderRadius: radius.field,
            borderCurve: "continuous",
            padding: 14,
            gap: 10,
          }}
        >
          {confirmingBlock ? (
            <>
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 14, color: palette.ink }}>
                {t("safety.blockConfirmTitle", { name: blockLabel ?? "" })}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: palette.inkSoft }}>
                {t("safety.blockConfirmBody")}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label={t("safety.blockConfirm")} disabled={busy} onPress={confirmBlock} />
                </View>
                <Pressable
                  disabled={busy}
                  onPress={() => setConfirmingBlock(false)}
                  style={{ paddingHorizontal: 14, justifyContent: "center" }}
                >
                  <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: palette.inkMuted }}>
                    {t("common.cancel")}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 14, color: palette.ink }}>
                {t("safety.reportTitle")}
              </Text>
              <LabeledInput
                label={t("safety.reasonLabel")}
                value={reason}
                onChangeText={setReason}
                placeholder={t("safety.reasonPlaceholder")}
                multiline
                numberOfLines={3}
                style={{ minHeight: 72, textAlignVertical: "top" }}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label={t("safety.reportSubmit")} disabled={busy} onPress={submitReport} />
                </View>
                <Pressable
                  disabled={busy}
                  onPress={() => {
                    setOpen(false);
                    setReason("");
                  }}
                  style={{ paddingHorizontal: 14, justifyContent: "center" }}
                >
                  <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: palette.inkMuted }}>
                    {t("common.cancel")}
                  </Text>
                </Pressable>
              </View>

              {blockId ? (
                <Pressable
                  onPress={() => setConfirmingBlock(true)}
                  style={{ alignSelf: "flex-start", paddingTop: 4 }}
                >
                  <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: palette.brick }}>
                    {t("safety.blockLink")}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      )}
    </View>
  );
}
