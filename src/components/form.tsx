import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

import { fonts, palette, radius } from "@/constants/theme";

export function LabeledInput({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: palette.inkSoft }}>{label}</Text>
      <TextInput
        placeholderTextColor={palette.inkMuted}
        {...props}
        style={[
          {
            paddingHorizontal: 16,
            paddingVertical: 13,
            borderRadius: radius.field,
            borderWidth: 1.5,
            borderColor: palette.lineStrong,
            backgroundColor: "#fff",
            fontFamily: fonts.sans,
            fontSize: 15,
            color: palette.ink,
          },
          props.style,
        ]}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = "brick",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "brick" | "gold" | "green";
}) {
  const bg = tone === "gold" ? palette.gold : tone === "green" ? palette.green : palette.brick;
  const fg = tone === "gold" ? palette.brown : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingVertical: 15,
        paddingHorizontal: 24,
        borderRadius: radius.field,
        borderCurve: "continuous",
        backgroundColor: bg,
        opacity: disabled ? 0.45 : 1,
        alignItems: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 15.5, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: active ? palette.brick : palette.lineStrong,
              backgroundColor: active ? palette.brick : "#fff",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansBold,
                fontSize: 13,
                color: active ? "#fff" : palette.inkSoft,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        backgroundColor: "#fff",
        borderWidth: 1.5,
        borderColor: value ? palette.gold : palette.lineStrong,
        borderRadius: radius.field,
        borderCurve: "continuous",
        padding: 14,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: value ? palette.brick : palette.lineStrong,
          backgroundColor: value ? palette.brick : "#fff",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        {value ? <Text style={{ color: "#fff", fontFamily: fonts.sansExtraBold, fontSize: 13 }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14.5, color: palette.ink }}>{label}</Text>
        {hint && value ? (
          <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, color: palette.goldInk }}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
