import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";

const RPM_SEGMENTS = 44;

export function RpmBar({
  rpm,
  maxAlertRpm,
  minAlertRpm,
}: {
  rpm: number;
  maxAlertRpm: number;
  minAlertRpm: number;
}) {
  const pct = Math.max(0, Math.min(1, rpm / maxAlertRpm));
  const lit = Math.round(pct * RPM_SEGMENTS);
  const yellowFrac = minAlertRpm / maxAlertRpm;
  const redline = rpm > maxAlertRpm;

  return (
    <View style={styles.rpmRow}>
      <ThemedText type="data" style={styles.microLabel}>
        RPM
      </ThemedText>
      <View style={styles.rpmTrack}>
        {Array.from({ length: RPM_SEGMENTS }).map((_, i) => {
          const frac = (i + 1) / RPM_SEGMENTS;
          const on = i < lit;
          const color = redline
            ? "#FF4638"
            : frac > yellowFrac
              ? "#FFB03A"
              : "#EAF4F8";
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 10 + Math.round(frac * 16),
                backgroundColor: on ? color : "#191E24",
              }}
            />
          );
        })}
      </View>
      <ThemedText
        type="display"
        style={[
          styles.rpmValue,
          {
            color:
              pct > 0.92 ? "#FF6E5E" : pct > yellowFrac ? "#FFB03A" : "#DCE3EA",
          },
        ]}
      >
        {rpm.toLocaleString("en-US")}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  microLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.textFaint,
  },
  rpmRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  rpmTrack: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 26,
  },
  rpmValue: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 24,
    letterSpacing: 1,
    minWidth: 104,
    textAlign: "right",
  },
});
