import { useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";

import { Box } from "@/components/pages/race-dashboard/box";
import { InputTrace, PEDAL_TRACE } from "@/components/pages/race-dashboard/input-trace";
import { VerticalInputBar } from "@/components/pages/race-dashboard/vertical-input-bar";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { INPUT_TRACE_SAMPLES, inputHistory } from "@/utils/telemetry.ts/inputHistory";

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText type="data" style={styles.legendLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

export function InputPanel({
  throttle,
  brake,
}: {
  throttle: number;
  brake: number;
}) {
  // Recorded from every packet by the connection store, so the trace is
  // already full when this page is swiped back into view.
  const history = useSyncExternalStore(inputHistory.subscribe, inputHistory.getSnapshot);

  return (
    <Box
      hue="steering"
      label="INPUT"
      style={styles.box}
      right={
        <View style={styles.legend}>
          <LegendDot color={PEDAL_TRACE.throttle.stroke} label="THRTL" />
          <LegendDot color={PEDAL_TRACE.brake.stroke} label="BRK" />
        </View>
      }
    >
      <View style={styles.row}>
        <InputTrace history={history} capacity={INPUT_TRACE_SAMPLES} />

        <View style={styles.bars}>
          <VerticalInputBar
            hue="throttle"
            label="THRTL"
            value={throttle}
            colors={["#57C489", "#1F7A4C"]}
          />
          <VerticalInputBar
            hue="brake"
            label="BRK"
            value={brake}
            colors={["#FF6E5E", "#C4241B"]}
          />
        </View>
      </View>
    </Box>
  );
}

const styles = StyleSheet.create({
  box: { height: 160 },
  row: { flex: 1, minHeight: 0, flexDirection: "row", gap: 10 },
  bars: { width: 104, flexDirection: "row", gap: 8 },
  legend: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.7,
    color: Colors.textDim,
  },
});
