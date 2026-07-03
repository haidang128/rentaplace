import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useLang } from "@/lib/i18n";

export default function TabsLayout() {
  const { t } = useLang();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="browse">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" />
        <NativeTabs.Trigger.Label>{t("tabs.browse")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Icon sf="heart" />
        <NativeTabs.Trigger.Label>{t("tabs.saved")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <NativeTabs.Trigger.Icon sf="message" />
        <NativeTabs.Trigger.Label>{t("tabs.messages")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person.crop.circle" />
        <NativeTabs.Trigger.Label>{t("tabs.profile")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
