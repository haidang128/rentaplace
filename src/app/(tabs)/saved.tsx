import { ScrollView, Text } from "react-native";

import { fonts, palette } from "@/constants/theme";
import { useLang } from "@/lib/i18n";

export default function SavedScreen() {
  const { t } = useLang();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={{ fontFamily: fonts.sansExtraBold, fontSize: 26, color: palette.ink }}>
        {t("tabs.saved")}
      </Text>
    </ScrollView>
  );
}
