import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";

export function TopBar({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={[Colors.panel, Colors.background]}
      style={[styles.header, style]}
    >
      <View style={styles.row10}>
        <View style={styles.diamond} />
        <ThemedText type="label" style={styles.headerTitle}>
          GT7 TELEMETRY COMPANION
        </ThemedText>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairlineDim,
  },
  headerTitle: {
    fontSize: 13,
    letterSpacing: 3,
    color: Colors.textMuted,
  },
  diamond: {
    width: 9,
    height: 9,
    backgroundColor: Colors.accent,
    transform: [{ rotate: "45deg" }],
  },
  row10: { flexDirection: "row", alignItems: "center", gap: 10 },
});
