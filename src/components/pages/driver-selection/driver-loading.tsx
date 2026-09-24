import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { SkeletonCard } from "@/components/ui/driver-card";
import { Sweep } from "@/components/ui/sweep";
import { Colors } from "@/constants/theme";

const COLUMNS = 4;

export function DriverLoading() {
  return (
    <>
      <View style={styles.grid}>
        {Array.from({ length: COLUMNS }).map((_, i) => (
          <View key={i} style={styles.gridCell}>
            <SkeletonCard />
          </View>
        ))}
      </View>
      <View style={styles.scanRow}>
        <ThemedText style={styles.microLabel}>SCANNING REGISTRY</ThemedText>
        <View style={styles.scanTrack}>
          <Sweep
            width="38%"
            height="100%"
            colors={[Colors.accent, Colors.accent]}
            active
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flex: 1, flexDirection: "row", gap: 14 },
  gridCell: { flex: 1 },
  microLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 1.8,
    color: Colors.textFaint,
  },
  scanRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  scanTrack: {
    flex: 1,
    height: 2,
    backgroundColor: "#141A20",
    overflow: "hidden",
  },
});
