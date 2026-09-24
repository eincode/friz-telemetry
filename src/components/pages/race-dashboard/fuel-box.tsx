import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { Box } from "@/components/pages/race-dashboard/box";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";

export function FuelBox({
  currentFuelPercent,
}: {
  currentFuelPercent: number;
}) {
  const fuelColor =
    currentFuelPercent <= 20
      ? "#FF6E5E"
      : currentFuelPercent <= 35
        ? "#FFB03A"
        : Colors.text;

  return (
    <Box
      hue="fuel"
      label="FUEL"
      right={
        <View style={styles.baseline}>
          <ThemedText
            type="display"
            style={[
              styles.fuelValue,
              { color: fuelColor, marginTop: "-30%", marginBottom: "-20%" },
            ]}
          >
            {Math.round(currentFuelPercent)}
          </ThemedText>
          <ThemedText type="data" style={styles.ofValue}>
            %
          </ThemedText>
        </View>
      }
      style={{ flex: 1, justifyContent: "space-between" }}
    >
      <View style={styles.fuelTrack}>
        <LinearGradient
          colors={["#8A7C2A", fuelColor]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            height: "100%",
            width: `${Math.max(0, Math.min(100, currentFuelPercent))}%`,
          }}
        />
        <View style={styles.fuelReserve} />
      </View>
    </Box>
  );
}

const styles = StyleSheet.create({
  baseline: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  fuelValue: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 30,
  },
  ofValue: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 12,
    color: "#6B7580",
  },
  fuelTrack: {
    height: 12,
    flexDirection: "row",
    backgroundColor: "#15181C",
    borderWidth: 1,
    borderColor: "#23272C",
    overflow: "hidden",
  },
  fuelReserve: {
    position: "absolute",
    left: "20%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
});
