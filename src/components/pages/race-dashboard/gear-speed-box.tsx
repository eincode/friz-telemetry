import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { HUE } from "@/constants/theme";

export function GearSpeedBox({
  currentSpeed,
  currentGear,
}: {
  currentSpeed: number;
  currentGear: number;
}) {
  return (
    <View
      style={[styles.box, styles.driveBox, { borderColor: HUE.drive.border }]}
    >
      <View style={{ alignItems: "center" }}>
        <ThemedText
          type="data"
          style={[styles.boxLabel, { color: HUE.drive.label }]}
        >
          GEAR
        </ThemedText>
        <ThemedText
          type="display"
          style={[styles.gear, { marginTop: "-16%", marginBottom: "-10%" }]}
        >
          {currentGear < 1 ? "R" : currentGear}
        </ThemedText>
      </View>
      <View style={{ alignItems: "center" }}>
        <ThemedText
          type="data"
          style={[styles.boxLabel, { color: HUE.drive.label }]}
        >
          SPEED
        </ThemedText>
        <View style={[styles.baseline, { gap: 7 }]}>
          <ThemedText type="display" style={styles.speed}>
            {Math.round(currentSpeed)}
          </ThemedText>
          <ThemedText type="label" style={styles.speedUnit}>
            KM/H
          </ThemedText>
        </View>
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
  driveBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 16,
  },
  gear: { fontFamily: "SairaCondensed-Bold", fontSize: 132, color: "#FFFFFF" },
  baseline: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  speed: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 64,
    marginTop: "-5%",
    marginBottom: "-100%",
    color: "#FFFFFF",
  },
  speedUnit: {
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 17,
    letterSpacing: 3.4,
    color: "#79828C",
  },
});
