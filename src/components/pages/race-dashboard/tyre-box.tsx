import { StyleSheet, View } from "react-native";

import type { TyreCorner } from "@/app/RaceDashboard";
import { Box } from "@/components/pages/race-dashboard/box";
import { ThemedText } from "@/components/themed-text";
import { BANDS, Colors, tyreBand } from "@/constants/theme";

/** Laid out as the car sees it — front row above rear row. */
const ROWS: TyreCorner[][] = [
  ["FL", "FR"],
  ["RL", "RR"],
];

export function TyreBox({
  flTemp,
  frTemp,
  rrTemp,
  rlTemp,
  fill = false,
}: {
  flTemp: number;
  frTemp: number;
  rrTemp: number;
  rlTemp: number;
  /** Stretch to the height of the parent instead of hugging the 2×2 grid. */
  fill?: boolean;
}) {
  const temps: Record<TyreCorner, number> = {
    FL: flTemp,
    FR: frTemp,
    RR: rrTemp,
    RL: rlTemp,
  };
  const hottest = tyreBand(Math.max(flTemp, frTemp, rrTemp, rlTemp));

  return (
    <Box
      hue="tyres"
      label="TYRE TEMP °C"
      style={fill ? styles.boxFill : undefined}
      right={
        <ThemedText
          type="data"
          style={[styles.bandName, { color: BANDS[hottest].label }]}
        >
          {hottest}
        </ThemedText>
      }
    >
      <View style={[styles.tyreGrid, fill && styles.tyreGridFill]}>
        {ROWS.map((row) => (
          <View
            key={row.join("")}
            style={[styles.tyreRow, fill && styles.tyreRowFill]}
          >
            {row.map((c) => {
              const temp = temps[c];
              const b = BANDS[tyreBand(temp)];
              return (
                <View
                  key={c}
                  style={[
                    styles.tyreCell,
                    fill && styles.tyreCellFill,
                    { backgroundColor: b.bg, borderColor: b.border },
                  ]}
                >
                  <ThemedText
                    type="data"
                    style={[styles.tyreLabel, { color: b.label }]}
                  >
                    {c}
                  </ThemedText>
                  <ThemedText
                    type="label"
                    style={[styles.tyreTemp, fill && styles.tyreTempFill]}
                  >
                    {Math.round(temp)}°
                  </ThemedText>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </Box>
  );
}

const styles = StyleSheet.create({
  boxFill: { flex: 1, minHeight: 0 },
  bandName: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  tyreGrid: { gap: 6 },
  tyreGridFill: { flex: 1, minHeight: 0 },
  tyreRow: { flexDirection: "row", gap: 6 },
  tyreRowFill: { flex: 1, minHeight: 0 },
  tyreCell: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 8,
    borderWidth: 1,
  },
  tyreCellFill: { justifyContent: "center" },
  tyreLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.3,
  },
  tyreTemp: {
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 23,
    marginTop: "-15%",
    color: Colors.text,
  },
  tyreTempFill: { fontSize: 38, marginTop: 0 },
});
