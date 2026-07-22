import { useCallback, useState } from "react";
import { Text, View } from "react-native";

import { fonts, palette, radius } from "@/constants/theme";

export type NoticeState = { tone: "success" | "error"; message: string } | null;

/**
 * Inline success/error feedback. Alert.alert is a no-op on the web build, so
 * anything that only reported through it left web users staring at a screen
 * that gave no sign whether the action worked.
 */
export function useNotice() {
  const [notice, setNotice] = useState<NoticeState>(null);
  const showSuccess = useCallback((message: string) => setNotice({ tone: "success", message }), []);
  const showError = useCallback((message: string) => setNotice({ tone: "error", message }), []);
  const clearNotice = useCallback(() => setNotice(null), []);
  return { notice, showSuccess, showError, clearNotice };
}

export function Notice({ notice }: { notice: NoticeState }) {
  if (!notice) return null;
  const ok = notice.tone === "success";
  return (
    <View
      style={{
        backgroundColor: ok ? palette.greenWash : palette.redWash,
        borderRadius: radius.field,
        borderCurve: "continuous",
        padding: 12,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.sansSemiBold,
          fontSize: 13,
          lineHeight: 20,
          color: ok ? palette.green : palette.brickDark,
        }}
      >
        {ok ? "✓ " : "! "}
        {notice.message}
      </Text>
    </View>
  );
}
