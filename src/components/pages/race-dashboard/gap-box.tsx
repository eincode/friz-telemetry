import { StyleSheet } from "react-native";

import { Box } from "@/components/pages/race-dashboard/box";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";

/** ±S.sss vs the previous lap. */
function formatGap(ms: number | null): string {
  if (ms == null) return "±-.---";
  const sign = ms <= 0 ? "−" : "+";
  return `${sign}${(Math.abs(ms) / 1000).toFixed(3)}`;
}

export function GapBox({ gapMs }: { gapMs: number | null }) {
  const color = gapMs == null ? Colors.textFaint : gapMs <= 0 ? Colors.success : Colors.error;
  return (
    <Box hue="times" label="GAP · PREV LAP">
      <ThemedText type="display" style={[styles.value, { color }]}>
        {formatGap(gapMs)}
      </ThemedText>
    </Box>
  );
}

const styles = StyleSheet.create({
  // Large and centred so it reads at a glance. Not BigValue: its percentage
  // margins resolve against width and break in a full-width box.
  value: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 40,
    textAlign: "center",
  },
});
