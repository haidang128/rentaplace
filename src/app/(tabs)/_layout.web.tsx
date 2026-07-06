import { Link } from "expo-router";
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from "expo-router/ui";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { Seal } from "@/components/seal";
import { fonts, palette } from "@/constants/theme";
import { useLang } from "@/lib/i18n";

/**
 * Web tabs — NativeTabs has no real web tab bar, so render a top nav instead.
 * TabTriggers must stay direct children of the TabList view: the router only
 * unwraps one asChild layer when collecting screens.
 */
export default function TabsLayout() {
  const { t } = useLang();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  return (
    <Tabs style={{ flex: 1 }}>
      <TabList asChild>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: isDesktop ? 8 : 2,
            paddingVertical: isDesktop ? 12 : 8,
            paddingHorizontal: isDesktop ? 48 : 10,
            borderBottomWidth: 1,
            borderBottomColor: palette.line,
            backgroundColor: palette.paper,
          }}
        >
          <Link href="/" asChild>
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: isDesktop ? 10 : 7,
                marginRight: "auto",
              }}
            >
              <Seal size={isDesktop ? 28 : 24} />
              {isDesktop ? (
                <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 19, color: palette.ink }}>
                  {t("common.appName")}
                </Text>
              ) : null}
            </Pressable>
          </Link>
          <TabTrigger name="browse" href="/browse" asChild>
            <TopTab label={t("tabs.browse")} compact={!isDesktop} />
          </TabTrigger>
          <TabTrigger name="saved" href="/saved" asChild>
            <TopTab label={t("tabs.saved")} compact={!isDesktop} />
          </TabTrigger>
          <TabTrigger name="messages" href="/messages" asChild>
            <TopTab label={t("tabs.messages")} compact={!isDesktop} />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TopTab label={t("tabs.profile")} compact={!isDesktop} />
          </TabTrigger>
        </View>
      </TabList>
      <TabSlot />
    </Tabs>
  );
}

function TopTab({
  label,
  compact,
  isFocused,
  ...props
}: TabTriggerSlotProps & { label: string; compact: boolean }) {
  return (
    <Pressable
      {...props}
      style={{
        paddingHorizontal: compact ? 10 : 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: isFocused ? palette.cream : "transparent",
        borderWidth: 1.5,
        borderColor: isFocused ? palette.lineStrong : "transparent",
      }}
    >
      <Text
        style={{
          fontFamily: isFocused ? fonts.sansBold : fonts.sansSemiBold,
          fontSize: compact ? 12.5 : 14,
          color: isFocused ? palette.ink : palette.inkSoft,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
