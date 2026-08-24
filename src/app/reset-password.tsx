import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { LabeledInput, PrimaryButton } from "@/components/form";
import { Notice, useNotice } from "@/components/notice";
import { fonts, palette } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

/**
 * Where the password-recovery email lands. On web the supabase client reads the
 * session straight out of the URL fragment, so by the time this renders the
 * person is signed in with a recovery session and can set a new password.
 *
 * Recovery links are single-use and expire, and Supabase reports both by
 * appending #error=... to the redirect — hence the explicit expired state
 * rather than a form that would silently fail to save.
 */
export default function ResetPasswordScreen() {
  const { t } = useLang();
  const { session, ready, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { notice, showError, clearNotice } = useNotice();

  const [linkError] = useState(
    () => typeof window !== "undefined" && window.location.hash.includes("error"),
  );

  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => router.replace("/(tabs)/profile"), 1800);
      return () => clearTimeout(timer);
    }
  }, [done]);

  const tooShort = password.length > 0 && password.length < 6;
  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = password.length >= 6 && confirm === password;

  const save = async () => {
    setBusy(true);
    clearNotice();
    try {
      await updatePassword(password);
      setDone(true);
    } catch (e: any) {
      showError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const body = () => {
    if (done) return t("auth.resetDoneBody");
    if (linkError) return t("auth.resetExpiredBody");
    if (!ready) return t("auth.resetCheckingBody");
    if (!session) return t("auth.resetNoSessionBody");
    return t("auth.resetBody");
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 560, width: "100%", alignSelf: "center" }}
    >
      <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 24, color: palette.ink }}>
        {done ? t("auth.resetDoneTitle") : linkError ? t("auth.resetExpiredTitle") : t("auth.resetTitle")}
      </Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: palette.inkSoft }}>
        {body()}
      </Text>

      <Notice notice={notice} />

      {!done && !linkError && ready && session ? (
        <View style={{ gap: 12 }}>
          <LabeledInput
            label={t("auth.resetNewPassword")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <LabeledInput
            label={t("auth.resetConfirmPassword")}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
          />
          {tooShort ? (
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: palette.brick }}>
              {t("auth.resetTooShort")}
            </Text>
          ) : null}
          {mismatch ? (
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: palette.brick }}>
              {t("auth.resetMismatch")}
            </Text>
          ) : null}
          <PrimaryButton label={t("auth.resetSave")} disabled={!valid || busy} onPress={save} />
        </View>
      ) : null}
    </ScrollView>
  );
}
