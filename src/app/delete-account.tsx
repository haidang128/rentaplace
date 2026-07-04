import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { LabeledInput, PrimaryButton } from "@/components/form";
import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

const CONFIRM_WORD = "DELETE";

export default function DeleteAccountScreen() {
  const { t, tr } = useLang();
  const { session, deleteAccount } = useAuth();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) return null;
  const isAdmin = session.role === "admin";

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 560, width: "100%", alignSelf: "center" }}
    >
      <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 24, color: palette.ink }}>
        {t("deleteAccount.title")}
      </Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: palette.inkSoft }}>
        {t("deleteAccount.intro")}
      </Text>

      <View
        style={{
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: palette.cardLine,
          borderRadius: radius.tile,
          borderCurve: "continuous",
          padding: 16,
          gap: 8,
        }}
      >
        {tr<string[]>("deleteAccount.consequences").map((line) => (
          <Text
            key={line}
            style={{ fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 20, color: palette.ink }}
          >
            {"•  "}
            {line}
          </Text>
        ))}
      </View>

      {isAdmin ? (
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 21, color: palette.inkSoft }}>
          {t("deleteAccount.adminBlocked")}
        </Text>
      ) : (
        <>
          <LabeledInput
            label={t("deleteAccount.confirmLabel", { word: CONFIRM_WORD })}
            value={confirm}
            onChangeText={setConfirm}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <PrimaryButton
            label={busy ? t("deleteAccount.deleting") : t("deleteAccount.button")}
            disabled={confirm.trim().toUpperCase() !== CONFIRM_WORD || busy}
            onPress={async () => {
              setBusy(true);
              setError(null);
              try {
                await deleteAccount();
                Alert.alert("✓", t("deleteAccount.done"));
                router.dismissTo("/(tabs)/profile");
              } catch (e: any) {
                setError(t("deleteAccount.error", { message: String(e?.message ?? e) }));
                setBusy(false);
              }
            }}
          />
          {error ? (
            <Text selectable style={{ fontFamily: fonts.sans, fontSize: 13, color: palette.brick }}>
              {error}
            </Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
