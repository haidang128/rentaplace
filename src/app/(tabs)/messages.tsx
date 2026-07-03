import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { getConversations } from "@/lib/data";
import type { Conversation } from "@/lib/data/demo-store";
import { useLang } from "@/lib/i18n";

export default function MessagesScreen() {
  const { t } = useLang();
  const { session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (session) getConversations(session.userId).then(setConversations);
      else setConversations([]);
    }, [session]),
  );

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20, gap: 10, maxWidth: 720, width: "100%", alignSelf: "center" }}
      data={conversations}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 26, color: palette.ink, paddingBottom: 6 }}>
          {t("tabs.messages")}
        </Text>
      }
      ListEmptyComponent={
        <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: palette.inkMuted }}>
          {session ? t("chat.empty") : t("chat.signInFirst")}
        </Text>
      }
      renderItem={({ item }) => {
        const otherName = session?.userId === item.renterId ? item.landlordName : item.renterName;
        return (
          <Link href={`/chat/${item.id}` as any} asChild>
            <Pressable
              style={{
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: palette.cardLine,
                borderRadius: radius.tile,
                borderCurve: "continuous",
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  backgroundColor: palette.goldWash,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 16, color: palette.goldInk }}>
                  {otherName.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansBold, fontSize: 14.5, color: palette.ink }}>{otherName}</Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: palette.inkMuted }} numberOfLines={1}>
                  {item.listingTitle}
                </Text>
              </View>
            </Pressable>
          </Link>
        );
      }}
    />
  );
}
