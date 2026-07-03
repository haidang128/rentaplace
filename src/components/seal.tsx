import Svg, { Circle, Path } from "react-native-svg";

import { palette } from "@/constants/theme";

type SealProps = {
  size?: number;
  /** Fill of the 8-point seal body. */
  color?: string;
  /** Check + dashed ring accent; pass null to hide the ring. */
  accent?: string | null;
  checkColor?: string;
};

/**
 * The RentAPlace verification seal — an 8-point notary-style stamp with a
 * dashed gold ring and a check mark. Brand mark, repeated at every touchpoint.
 */
export function Seal({
  size = 24,
  color = palette.brick,
  accent = palette.gold,
  checkColor = "#fff",
}: SealProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 1l3.1 3.1h4.8v4.8L23 12l-3.1 3.1v4.8h-4.8L12 23l-3.1-3.1H4.1v-4.8L1 12l3.1-3.1V4.1h4.8z"
        fill={color}
      />
      {accent ? (
        <Circle
          cx={12}
          cy={12}
          r={7.6}
          fill="none"
          stroke={accent}
          strokeWidth={1}
          strokeDasharray="2.4 2.6"
          opacity={0.9}
        />
      ) : null}
      <Path
        d="M7.8 12.2l2.8 2.9 5.6-6.3"
        stroke={checkColor}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
