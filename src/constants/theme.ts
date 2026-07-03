/**
 * RentAPlace design tokens — warm paper + white cards, brick red + seal gold.
 * Green is reserved for tier-3 "tenant-confirmed" deposit states only.
 */
export const palette = {
  brick: "#B23A2E",
  brickDark: "#8E2B21",
  gold: "#E8B54A",
  goldDeep: "#C08A2D",
  goldWash: "#F6EACB",
  goldInk: "#8A6215",
  paper: "#FBF6EE",
  paperDeep: "#EFE9DE",
  cream: "#FFFDF8",
  ink: "#2C201A",
  inkSoft: "#6E5D4F",
  inkMuted: "#A08B76",
  inkFaint: "#8A7860",
  line: "#F0E5D2",
  lineStrong: "#E2D4BC",
  cardLine: "#EFE3CF",
  green: "#2F7A55",
  greenWash: "#E4F0E7",
  redWash: "#EAD5D0",
  brown: "#33241C",
  brownCard: "#3E2C21",
  brownLine: "#57422F",
  brownText: "#C9B9A6",
  brownTextHi: "#EADFCF",
} as const;

export const fonts = {
  sans: "BeVietnamPro_400Regular",
  sansMedium: "BeVietnamPro_500Medium",
  sansSemiBold: "BeVietnamPro_600SemiBold",
  sansBold: "BeVietnamPro_700Bold",
  sansExtraBold: "BeVietnamPro_800ExtraBold",
  serif: "Lora_600SemiBold",
  serifMedium: "Lora_500Medium",
  serifItalic: "Lora_600SemiBold_Italic",
} as const;

export const radius = {
  chip: 999,
  card: 18,
  cardLg: 22,
  field: 14,
  tile: 16,
} as const;

export const MaxContentWidth = 1280;

/** Deposit trust ladder — single source of truth for chip colors (tier 3 is the only green). */
export const trustTierColors = {
  1: { bg: palette.cream, fg: palette.inkFaint, border: palette.lineStrong },
  2: { bg: palette.goldWash, fg: palette.goldInk, border: palette.gold },
  3: { bg: palette.greenWash, fg: palette.green, border: palette.green },
} as const;
