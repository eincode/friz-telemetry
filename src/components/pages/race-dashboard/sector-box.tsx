import { StyleSheet, View } from "react-native";

import { Box } from "@/components/pages/race-dashboard/box";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { SectorTimes } from "@/utils/telemetry.ts/sectorTimer";

const BEST = "#E4C7F0";
const BEST_LABEL = "#B77FD0";
const LAST = "#C7CFD8";
const LIVE = "#7BA6D6";

/** S.sss under a minute, M:SS.sss above. */
function formatSector(ms: number | null | undefined): string {
  if (ms == null) return "--.---";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const f = Math.floor(ms % 1000);
  const ss = `${m > 0 ? String(s).padStart(2, "0") : s}.${String(f).padStart(3, "0")}`;
  return m > 0 ? `${m}:${ss}` : ss;
}

/** Purple beats the session best, green beats the last lap. */
function sectorColor(ms: number, best: number | null, last: number | undefined): string {
  if (best === null || ms < best) return BEST;
  if (last !== undefined && ms < last) return Colors.success;
  return Colors.white;
}

export function SectorBox({ sectors, currentLapMs }: { sectors: SectorTimes; currentLapMs: number }) {
  const { count, current, lap, sectorStartMs, lastLap, best } = sectors;

  return (
    <Box hue="times" label="SECTORS" style={styles.box}>
      {count === 0 ? (
        <ThemedText type="data" style={styles.empty}>
          WAITING FOR TRACK MATCH
        </ThemedText>
      ) : (
        <View style={styles.table}>
          <View style={styles.row}>
            <ThemedText type="data" style={[styles.head, styles.nameCol]}>
              {" "}
            </ThemedText>
            <ThemedText type="data" style={[styles.head, styles.cell]}>
              THIS LAP
            </ThemedText>
            <ThemedText type="data" style={[styles.head, styles.cell, { color: "#8A929C" }]}>
              LAST
            </ThemedText>
            <ThemedText type="data" style={[styles.head, styles.cell, { color: BEST_LABEL }]}>
              BEST
            </ThemedText>
          </View>

          {Array.from({ length: count }, (_, i) => {
            const done = lap[i];
            const live = i === current ? Math.max(0, currentLapMs - sectorStartMs) : undefined;
            const color =
              done !== undefined ? sectorColor(done, best[i] ?? null, lastLap?.[i]) : live !== undefined ? LIVE : Colors.textFaint;
            return (
              <View key={i} style={[styles.row, i === current && styles.currentRow]}>
                <ThemedText type="data" style={[styles.name, styles.nameCol]}>
                  S{i + 1}
                </ThemedText>
                <ThemedText type="display" style={[styles.value, styles.cell, { color }]}>
                  {formatSector(done ?? live)}
                </ThemedText>
                <ThemedText type="display" style={[styles.value, styles.cell, { color: LAST }]}>
                  {formatSector(lastLap?.[i])}
                </ThemedText>
                <ThemedText type="display" style={[styles.value, styles.cell, { color: BEST }]}>
                  {formatSector(best[i])}
                </ThemedText>
              </View>
            );
          })}
        </View>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, minHeight: 0 },
  table: { gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  currentRow: { backgroundColor: "#151B22" },
  nameCol: { width: 28 },
  cell: { flex: 1, textAlign: "right" },
  head: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.7,
    color: "#7BA6D6",
  },
  name: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 11,
    color: "#8A929C",
  },
  value: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 17,
  },
  empty: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.textFaint,
  },
});
