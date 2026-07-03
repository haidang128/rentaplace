import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

import { useLang } from "@/lib/i18n";

export default function TabsLayout() {
  const { t } = useLang();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="browse">
        <Icon sf="magnifyingglass" />
        <Label>{t("tabs.browse")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <Icon sf="heart" />
        <Label>{t("tabs.saved")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <Icon sf="message" />
        <Label>{t("tabs.messages")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf="person.crop.circle" />
        <Label>{t("tabs.profile")}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
