import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Notice, useNotice } from "@/components/notice";
import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { getBlockedIds, getLandlord, unblockUser } from "@/lib/data";
import { useLang } from "@/lib/i18n";

/**
 * The other half of blocking: somewhere to undo it. Rendered on the profile
 * screen, and hidden entirely when the list is empty so it costs nothing to
 * anyone who has never blocked a person.
 */
export function BlockedList() {
  const { t } = useLang();
  const { session } = useAuth();
  const [blocked, setBlocked] = useState<{ id: string; name: string }[]>([]);
  const { notice, showSuccess, showError } = useNotice();

  const refresh = useCallback(() => {
    if (!session) {
      setBlocked([]);
      return;
    }
    getBlockedIds(session.userId)
      .then(async (ids) => {
        const rows = await Promise.all(
          ids.map(async (id) => ({ id, name: (await getLandlord(id))?.displayName ?? id })),
        );
        setBlocked(rows);
      })
      .catch(() => setBlocked([]));
  }, [session]);

  useEffect(refresh, [refresh]);

  // Keep the section mounted while a notice is showing: unblocking the last
  // person empties the list, and hiding it immediately would take the
  // "Unblocked." confirmation down with it before anyone could read it.
  if (!session || (blocked.length === 0 && !notice)) return null;

  return (
    <View style={{ gap: 10 }}>
      {blocked.length > 0 ? (
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: palette.inkSoft }}>
          {t("safety.blockedTitle")}
        </Text>
      ) : null}
      <Notice notice={notice} />
      {blocked.map((person) => (
        <View
          key={person.id}
          style={{
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: palette.cardLine,
            borderRadius: radius.field,
            borderCurve: "continuous",
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: palette.ink }}
          >
            {person.name}
          </Text>
          <Pressable
            onPress={async () => {
              try {
                await unblockUser(session.userId, person.id);
                showSuccess(t("safety.unblocked"));
                refresh();
              } catch {
                showError(t("safety.blockFailed"));
              }
            }}
            style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          >
            <Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: palette.brick }}>
              {t("safety.unblock")}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
