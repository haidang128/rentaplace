import { Text, View } from "react-native";

import { fonts, trustTierColors } from "@/constants/theme";
import { useLang } from "@/lib/i18n";
import type { DepositScheme, TrustTier } from "@/lib/types";

const schemeLabels: Record<DepositScheme, string> = {
  dps: "DPS",
  mydeposits: "mydeposits",
  tds: "TDS",
};

type TrustChipProps = {
  tier: TrustTier;
  scheme: DepositScheme | null;
  size?: "sm" | "md";
};

/**
 * Deposit trust-ladder chip. Tier 1 = declared, tier 2 = certificate reviewed,
 * tier 3 = tenant-confirmed (the only green state). Tier 0 renders nothing.
 * Lodger listings must not render this — show the lodger guide row instead.
 */
export function TrustChip({ tier, scheme, size = "md" }: TrustChipProps) {
  const { t } = useLang();
  if (tier === 0 || (tier < 3 && !scheme)) return null;

  const colors = trustTierColors[tier as 1 | 2 | 3];
  const label =
    tier === 3
      ? t("trust.tier3Chip")
      : t(tier === 2 ? "trust.tier2Chip" : "trust.tier1Chip", {
          scheme: schemeLabels[scheme!],
        });

  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: size === "md" ? 11 : 9,
        paddingVertical: size === "md" ? 6 : 4,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.sansBold,
          fontSize: size === "md" ? 12.5 : 11,
          color: colors.fg,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
