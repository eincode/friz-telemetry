import { StyleSheet, Text, type TextProps } from "react-native";

import { ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextProps = TextProps & {
  type?: "default" | "display" | "heading" | "label" | "body" | "data";
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = "default",
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      // The dashboard is laid out to fixed sizes — readouts sit in tight boxes
      // with hand-tuned negative margins, so OS text scaling overflows them.
      // Placed before `rest` so a caller can still opt back in explicitly.
      allowFontScaling={false}
      style={[
        // Android pads every line with the font's full ascent/descent; iOS
        // doesn't. Saira's are tall (1.57 em), so the readouts — tuned on iOS
        // with tight negative margins — came out taller than their boxes.
        { color: theme[themeColor ?? "white"], includeFontPadding: false },
        type === "default" && styles.default,
        type === "heading" && styles.heading,
        type === "label" && styles.label,
        type === "display" && styles.display,
        type === "body" && styles.default,
        type === "data" && styles.data,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: "Barlow-Regular",
    fontSize: 14,
  },
  display: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 52,
  },
  heading: {
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 28,
  },
  label: {
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 13,
  },
  data: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 14,
  },
});
