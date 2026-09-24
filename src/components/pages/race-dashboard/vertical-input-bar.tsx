import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/theme";

/** Bottom-anchored pedal bar — the vertical sibling of {@link InputBar}. */
export function VerticalInputBar({
  hue,
  label,
  value,
  colors,
}: {
  hue: "brake" | "throttle";
  label: string;
  value: number;
  colors: [string, string];
}) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <View style={styles.col}>
      <View style={styles.track}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={[styles.fill, { height: `${pct}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { flex: 1, minWidth: 0, alignItems: "center", gap: 5 },
  value: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 20,
    color: Colors.text,
  },
  track: {
    flex: 1,
    minHeight: 0,
    alignSelf: "stretch",
    justifyContent: "flex-end",
    backgroundColor: "#15181C",
    borderWidth: 1,
    borderColor: "#23272C",
    overflow: "hidden",
  },
  fill: { width: "100%" },
  label: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.7,
  },
});
