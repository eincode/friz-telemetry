import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Box } from "@/components/pages/race-dashboard/box";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";

/** How often the projections are recomputed. */
const TICK_MS = 10_000;
/** Rolling window for the live burn rate — 12 ticks is two minutes. */
const WINDOW_SAMPLES = 12;
/** How many recent laps the per-lap average is taken over. */
const ROLLING_LAPS = 5;
/** Below this many laps of fuel left, the projections turn red. */
const CRITICAL_LAPS = 2;
/** Fuel rising by more than this between samples means the car was refuelled. */
const REFUEL_EPSILON = 0.05;

const EMPTY = "--";

interface FuelSample {
  t: number;
  fuel: number;
}

/**
 * Burn rate in % per millisecond, measured over a rolling wall-clock window.
 *
 * Sampling on a 10 s clock rather than at lap boundaries means there is a usable
 * rate a few seconds into the first lap, and it keeps the readouts from
 * flickering at telemetry rate — they step once per tick.
 */
function useBurnRate(fuel: number) {
  const latest = useRef(fuel);
  useEffect(() => {
    latest.current = fuel;
  }, [fuel]);

  // Seeded at mount so the first tick already has something to measure against.
  const [samples, setSamples] = useState<FuelSample[]>(() => [
    { t: Date.now(), fuel },
  ]);

  useEffect(() => {
    const id = setInterval(() => {
      setSamples((prev) => {
        const next = { t: Date.now(), fuel: latest.current };
        const last = prev[prev.length - 1];
        // A refuel invalidates every sample before it.
        const base = last && next.fuel > last.fuel + REFUEL_EPSILON ? [] : prev;
        return [...base, next].slice(-WINDOW_SAMPLES);
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const first = samples[0];
  const last = samples[samples.length - 1];
  const elapsed = samples.length >= 2 ? last.t - first.t : 0;
  const burnt = samples.length >= 2 ? first.fuel - last.fuel : 0;

  return {
    /** % per ms, or null while the car is stationary or the window is short. */
    ratePerMs: elapsed > 0 && burnt > 0 ? burnt / elapsed : null,
    // `samples` is seeded at mount and never emptied, so `last` always exists.
    /** Tank level as of the last tick — projections step with it. */
    sampledFuel: last.fuel,
    /** When that level was read — the anchor the countdown runs down from. */
    sampledAt: last.t,
  };
}

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

/**
 * Fuel burnt per completed lap, averaged over the last few laps. More accurate
 * than the live rate because it covers exactly one lap's mix of corners and
 * straights, so it wins whenever a lap has actually been logged.
 */
function useFuelPerLap(fuel: number, lap: number) {
  const [prevLap, setPrevLap] = useState(lap);
  const [lapStartFuel, setLapStartFuel] = useState(fuel);
  const [usage, setUsage] = useState<number[]>([]);
  // Only laps seen start-to-finish count: the lap in progress at mount is
  // already part-run, and the 0 -> 1 change is the race starting, not a lap.
  const [armed, setArmed] = useState(false);

  // Adjusting state during render: the lap boundary is derived from the
  // incoming telemetry, so this settles before the frame is committed.
  if (lap !== prevLap) {
    const used = lapStartFuel - fuel;
    setPrevLap(lap);
    setLapStartFuel(fuel);

    if (lap < prevLap) {
      // Counter went backwards — new session, so the old rate is meaningless.
      setUsage([]);
      setArmed(false);
    } else if (prevLap === 0) {
      // Lights out. 0 -> 1 starts lap 1, it doesn't complete a lap: whatever
      // was burnt sitting on the grid says nothing about racing consumption.
      // Lap 1 is run in full from here, so it becomes the first measurement.
      setArmed(true);
    } else if (!armed) {
      // Joined mid-lap, so this boundary is the first whole lap's start.
      setArmed(true);
    } else if (used > 0) {
      // A negative delta means the car was refuelled; that lap tells us nothing.
      setUsage((prev) => [...prev, used].slice(-ROLLING_LAPS));
    }
  }

  const perLap =
    usage.length > 0
      ? usage.reduce((sum, u) => sum + u, 0) / usage.length
      : null;

  return { perLap, laps: usage.length };
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
  lap,
  lastLapMs,
  bestLapMs,
}: {
  /** Tank level, 0–100. */
  fuel: number;
  lap: number;
  lastLapMs: number | null;
  bestLapMs: number | null;
}) {
  const { perLap: lapAverage, laps } = useFuelPerLap(fuel, lap);
  const { ratePerMs, sampledFuel, sampledAt } = useBurnRate(fuel);
  const now = useSecondsTick();

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
