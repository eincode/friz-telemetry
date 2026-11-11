import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Box } from "@/components/pages/race-dashboard/box";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useConsoleConnectionStore } from "@/store/consoleConnectionStore";

/** Below this many laps of fuel left, the projections turn red. */
const CRITICAL_LAPS = 2;

const EMPTY = "--";

/**
 * Re-renders once a second so the countdown keeps moving between recalculations
 * rather than sitting frozen for ten seconds at a time. Kept off the telemetry
 * render path so the clock still runs if the feed stalls.
 */
function useSecondsTick() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** H:MM:SS, dropping the hour when there isn't one. */
function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function StatCell({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: string;
  note: string;
  color?: string;
}) {
  return (
    <View style={styles.cell}>
      <ThemedText type="data" style={styles.cellLabel}>
        {label}
      </ThemedText>
      <View style={styles.cellValueWrap}>
        <ThemedText
          type="display"
          style={[styles.cellValue, color ? { color } : null]}
        >
          {value}
        </ThemedText>
      </View>
      <ThemedText type="data" style={styles.cellNote}>
        {note}
      </ThemedText>
    </View>
  );
}

export function FuelManagementBox({
  fuel,
  lastLapMs,
  bestLapMs,
}: {
  /** Tank level, 0–100. */
  fuel: number;
  lastLapMs: number | null;
  bestLapMs: number | null;
}) {
  // Measured from every packet by the connection store (see FuelTracker), so
  // the figures keep building while this page is not rendered.
  const stats = useConsoleConnectionStore((s) => s.fuelStats);
  const now = useSecondsTick();
  const lapAverage = stats?.perLap ?? null;
  const laps = stats?.laps ?? 0;
  const ratePerMs = stats?.ratePerMs ?? null;
  const sampledFuel = stats?.sampledFuel ?? fuel;
  const sampledAt = stats?.sampledAt ?? now;

  // GT7 reports 0 for "no time set", so fall back to the best lap rather than
  // inventing a reference lap time.
  const refLapMs = lastLapMs || bestLapMs || null;

  // Completed laps are the better measurement; the live rate stands in until
  // one exists, which needs a lap length to convert into a per-lap figure.
  const liveEstimate =
    ratePerMs != null && refLapMs ? ratePerMs * refLapMs : null;
  const perLap = lapAverage ?? liveEstimate;

  const lapsLeft = perLap && perLap > 0 ? sampledFuel / perLap : null;

  // Time to empty comes straight from the clock-based rate when there is one —
  // it needs no lap length, so it reads out well before the first lap is done.
  const timeLeftMs =
    ratePerMs != null
      ? sampledFuel / ratePerMs
      : lapsLeft != null && refLapMs
        ? lapsLeft * refLapMs
        : null;

  // The projection is made at sample time, so run it down by however long ago
  // that was — the readout ticks every second and the 10 s recalculation only
  // nudges it back onto the latest burn rate.
  const countdownMs =
    timeLeftMs != null
      ? Math.max(0, timeLeftMs - Math.max(0, now - sampledAt))
      : null;

  const critical = lapsLeft != null && lapsLeft < CRITICAL_LAPS;
  const fuelColor = critical
    ? "#FF6E5E"
    : fuel <= 20
      ? "#FF6E5E"
      : fuel <= 35
        ? "#FFB03A"
        : Colors.text;
  const projectionColor = critical ? "#FF6E5E" : undefined;

  const perLapNote =
    lapAverage != null
      ? `${laps}L AVG`
      : liveEstimate != null
        ? "LIVE EST"
        : "MEASURING";

  return (
    <Box
      hue="fuel"
      label="FUEL MANAGEMENT"
      style={styles.box}
      right={
        <View style={styles.baseline}>
          <ThemedText
            type="display"
            style={[styles.total, { color: fuelColor }]}
          >
            {Math.round(fuel)}
          </ThemedText>
          <ThemedText type="data" style={styles.totalUnit}>
            %
          </ThemedText>
        </View>
      }
    >
      <View style={styles.fuelTrack}>
        <LinearGradient
          colors={["#8A7C2A", fuelColor]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            height: "100%",
            width: `${Math.max(0, Math.min(100, fuel))}%`,
          }}
        />
        <View style={styles.fuelReserve} />
      </View>

      <View style={styles.cells}>
        <StatCell
          label="% PER LAP"
          value={perLap != null ? perLap.toFixed(1) : EMPTY}
          note={perLapNote}
        />
        <StatCell
          label="LAPS LEFT"
          value={lapsLeft != null ? lapsLeft.toFixed(1) : EMPTY}
          note="REMAINING"
          color={projectionColor}
        />
        <StatCell
          label="TIME LEFT"
          value={countdownMs != null ? formatCountdown(countdownMs) : EMPTY}
          note="TO EMPTY"
          color={projectionColor}
        />
      </View>
    </Box>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, minHeight: 0, minWidth: 0 },
  baseline: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  total: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 30,
    marginTop: "-30%",
    marginBottom: "-20%",
  },
  totalUnit: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 12,
    color: Colors.textTertiary,
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
  cells: { flex: 1, minHeight: 0, flexDirection: "row", gap: 6 },
  cell: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: "#2A2718",
    backgroundColor: "rgba(198,178,74,0.06)",
  },
  cellLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.3,
    color: "#C6B24A",
  },
  cellValueWrap: { flex: 1, minHeight: 0, justifyContent: "center" },
  cellValue: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 34,
    color: Colors.text,
  },
  cellNote: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 8,
    letterSpacing: 1.2,
    color: Colors.textSubtle,
  },
});
