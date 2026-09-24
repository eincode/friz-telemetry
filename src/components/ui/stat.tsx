import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { PulseDot } from "@/components/ui/pulse-dot";
import { Colors } from "@/constants/theme";

export function Stat({
  label,
  value,
  dotColor,
}: {
  label: string;
  value: string;
  dotColor?: string;
}) {
  return (
    <View style={{ gap: 3 }}>
      <ThemedText type="data" style={styles.statLabel}>
        {label}
      </ThemedText>
      <View style={styles.valueRow}>
        {dotColor && <PulseDot color={dotColor} />}
        <ThemedText type="heading" style={styles.statValue}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  valueRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 1.8,
    color: Colors.textFaint,
  },
  statValue: {
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 19,
    letterSpacing: 1.1,
    color: Colors.textBright,
  },
});
