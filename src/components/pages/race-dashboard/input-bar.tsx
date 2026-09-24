import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors, HUE } from "@/constants/theme";

export function InputBar({
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
  return (
    <View
      style={[styles.box, styles.inputBox, { borderColor: HUE[hue].border }]}
    >
      <View style={styles.inputHead}>
        <ThemedText
          type="data"
          style={[styles.boxLabel, { color: HUE[hue].label }]}
        >
          {label}
        </ThemedText>
        <ThemedText type="display" style={styles.inputValue}>
          {Math.round(value)}%
        </ThemedText>
      </View>
      <View style={styles.inputTrack}>
        <LinearGradient
          colors={colors}
          style={[
            styles.inputFill,
            { width: `${Math.max(0, Math.min(100, value))}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: "#0E1013",
    paddingHorizontal: 11,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 6,
  },
  boxLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.7,
  },
  inputBox: { flex: 1, gap: 7, paddingHorizontal: 10 },
  inputHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  inputValue: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 26,
    color: Colors.text,
  },
  inputTrack: {
    flex: 1,
    minHeight: 0,
    justifyContent: "flex-end",
    backgroundColor: "#15181C",
    borderWidth: 1,
    borderColor: "#23272C",
    overflow: "hidden",
  },
  inputFill: { height: "100%" },
});
