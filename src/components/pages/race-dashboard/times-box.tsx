import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { HUE } from "@/constants/theme";
import { formatLapTime } from "@/utils/formatLapTime";

export function TimesBox({
  currentLapMs,
  lastLapMs,
  bestLapMs,
}: {
  currentLapMs: number;
  lastLapMs: number | null;
  bestLapMs: number | null;
}) {
  return (
    <View
      style={[styles.box, styles.timesBox, { borderColor: HUE.times.border }]}
    >
      <View style={styles.timeCell}>
        <ThemedText
          type="data"
          style={[styles.boxLabel, { color: HUE.times.label }]}
        >
          CURRENT
        </ThemedText>
        <ThemedText type="display" style={styles.timeValue}>
          {formatLapTime(currentLapMs)}
        </ThemedText>
      </View>
      <View style={[styles.timeCell, styles.timeDivider]}>
        <ThemedText type="data" style={[styles.boxLabel, { color: "#8A929C" }]}>
          LAST
        </ThemedText>
        <ThemedText
          type="display"
          style={[styles.timeValue, { color: "#C7CFD8" }]}
        >
          {formatLapTime(lastLapMs)}
        </ThemedText>
      </View>
      <View style={[styles.timeCell, styles.timeDivider]}>
        <ThemedText type="data" style={[styles.boxLabel, { color: "#B77FD0" }]}>
          BEST
        </ThemedText>
        <ThemedText
          type="display"
          style={[styles.timeValue, { color: "#E4C7F0" }]}
        >
          {formatLapTime(bestLapMs)}
        </ThemedText>
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
  timesBox: { flexDirection: "row", gap: 12, paddingHorizontal: 12 },
  timeCell: { flex: 1, gap: 1 },
  timeDivider: {
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: "#182028",
  },
  timeValue: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 19,
    color: "#FFFFFF",
  },
});
