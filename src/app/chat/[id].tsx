import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from "react-native";

import { fonts, palette, radius } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { getConversations, getMessages, sendMessage, subscribeToMessages } from "@/lib/data";
import type { ChatMessage, Conversation } from "@/lib/data/demo-store";
import { useLang } from "@/lib/i18n";

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLang();
  const { session } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id || !session) return;
    getConversations(session.userId).then((all) => setConversation(all.find((c) => c.id === id) ?? null));
    getMessages(id).then(setMessages);
    const unsubscribe = subscribeToMessages(id, (msg) =>
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])),
    );
    return unsubscribe;
  }, [id, session]);

  if (!session || !id) return null;

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    const msg = await sendMessage(id, session.userId, body);
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.paper }}
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {conversation ? (
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 12.5,
            color: palette.inkMuted,
            paddingHorizontal: 20,
            paddingTop: 6,
          }}
          numberOfLines={1}
        >
          {t("chat.about", { title: conversation.listingTitle })}
        </Text>
      ) : null}

      {/* safety interstitial — education tie-in, always visible */}
      <View
        style={{
          margin: 16,
          marginBottom: 4,
          backgroundColor: palette.goldWash,
          borderRadius: radius.field,
          borderCurve: "continuous",
          padding: 12,
        }}
      >
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 18, color: palette.goldInk }}>
          {t("chat.safetyBanner")}
        </Text>
      </View>

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mine = item.senderId === session.userId;
          return (
            <View
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: "80%",
                backgroundColor: mine ? palette.brick : "#fff",
                borderWidth: mine ? 0 : 1,
                borderColor: palette.cardLine,
                borderRadius: 16,
                borderCurve: "continuous",
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text
                selectable
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 14.5,
                  lineHeight: 21,
                  color: mine ? "#fff" : palette.ink,
                }}
              >
                {item.body}
              </Text>
            </View>
          );
        }}
      />

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          padding: 16,
          paddingBottom: 28,
          backgroundColor: palette.cream,
          borderTopWidth: 1,
          borderTopColor: palette.line,
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t("chat.inputPlaceholder")}
          placeholderTextColor={palette.inkMuted}
          multiline
          style={{
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 11,
            borderRadius: radius.field,
            borderWidth: 1.5,
            borderColor: palette.lineStrong,
            backgroundColor: "#fff",
            fontFamily: fonts.sans,
            fontSize: 15,
            color: palette.ink,
            maxHeight: 120,
          }}
        />
        <Pressable
          onPress={send}
          disabled={!draft.trim()}
          style={{
            alignSelf: "flex-end",
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderRadius: radius.field,
            borderCurve: "continuous",
            backgroundColor: palette.brick,
            opacity: draft.trim() ? 1 : 0.45,
          }}
        >
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 14.5, color: "#fff" }}>{t("chat.send")}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
