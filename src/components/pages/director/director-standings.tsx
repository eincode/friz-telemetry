import { Box } from "@/components/pages/race-dashboard/box";
import { formatGap } from "@/components/pages/race-dashboard/leaderboard-box";
import { ThemedText } from "@/components/themed-text";
import { Colors, HUE } from "@/constants/theme";
import { FOCUS_POSITIONS, focusKey } from "@/service/directorCommand";
import { SessionMode, useOverlayStore } from "@/store/overlayStore";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

const MODE_LABEL: Record<SessionMode, string> = {
  race: "RACE",
  qualifying: "QUALIFYING",
  practice: "PRACTICE",
};
const LEADER = Colors.warn;
/** Dimming for a driver whose telemetry link is down. */
const DISCONNECTED_OPACITY = 0.4;

// Timing-based ease-out: settles exactly on target, no spring overshoot/jiggle.
const rowLayout = LinearTransition.duration(220).easing(Easing.out(Easing.cubic));

type ListView = "drivers" | "positions";

/** Places the game can focus, laid out four to a row. */
const POSITION_ROWS = Array.from({ length: Math.ceil(FOCUS_POSITIONS / 4) }, (_, r) =>
  Array.from({ length: 4 }, (_, c) => r * 4 + c + 1).filter((p) => p <= FOCUS_POSITIONS),
);

function ViewToggle({ value, onChange }: { value: ListView; onChange: (v: ListView) => void }) {
  return (
    <View style={styles.toggle}>
      {(["drivers", "positions"] as const).map((v) => {
        const on = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            hitSlop={6}
            style={[styles.toggleSeg, on && styles.toggleSegOn]}
          >
            <ThemedText type="data" style={[styles.toggleLabel, on && styles.selectedText]}>
              {v === "drivers" ? "DRIVERS" : `P1–${FOCUS_POSITIONS}`}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Every place the game can focus, whoever is in it. Not every driver in the
 * race is on the server, so its standings can skip places; this reaches them all.
 */
function PositionGrid({ onSelect }: { onSelect: (rank: number) => void }) {
  return (
    <View style={styles.grid}>
      {POSITION_ROWS.map((row, i) => (
        <View key={i} style={styles.gridRow}>
          {row.map((p) => {
            return (
              <Pressable
                key={p}
                onPress={() => onSelect(p)}
                accessibilityRole="button"
                accessibilityLabel={`Focus position ${p}`}
                style={({ pressed }) => [styles.cell, pressed && styles.rowPressed]}
              >
                <ThemedText
                  type="display"
                  style={[styles.cellLabel, p === 1 && styles.leaderText]}
                >
                  P{p}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * The session's standings sized for touch: tapping a row focuses the camera
 * on that place. Same feed and order as the dashboard leaderboard. The game
 * only has focus keys down to 16th, so rows past that can't be tapped. The
 * toggle swaps the list for a grid of raw places, for drivers not on the server.
 */
export function DirectorStandings({ onFocus }: { onFocus: (rank: number) => void }) {
  const [view, setView] = useState<ListView>("drivers");
  const standings = useOverlayStore((s) => s.standings);
  const roster = useOverlayStore((s) => s.roster);
  const mode = useOverlayStore((s) => s.mode);
  const names = useMemo(() => new Map(roster.map((r) => [r.id, r.name])), [roster]);

  return (
    <Box
      hue="position"
      label="STANDINGS"
      right={
        <View style={styles.headRight}>
          {mode ? (
            <ThemedText type="data" style={styles.mode}>
              {MODE_LABEL[mode]}
            </ThemedText>
          ) : null}
          <ViewToggle value={view} onChange={setView} />
        </View>
      }
      style={styles.box}
    >
      {view === "positions" ? (
        <PositionGrid onSelect={onFocus} />
      ) : standings.length === 0 ? (
        <View style={styles.emptyWrap}>
          <ThemedText type="data" style={styles.empty}>
            WAITING FOR DRIVERS
          </ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {standings.map((c) => {
            const isLeader = c.rank === 1;
            const focusable = focusKey(c.rank) !== null;
            return (
              <Animated.View
                key={c.id}
                layout={rowLayout}
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(150)}
              >
                <Pressable
                  onPress={() => onFocus(c.rank)}
                  disabled={!focusable}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !focusable }}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                    !c.connected && styles.rowDisconnected,
                  ]}
                >
                  <ThemedText
                    type="data"
                    style={[styles.pos, isLeader && styles.leaderText]}
                  >
                    {c.rank}
                  </ThemedText>
                  <ThemedText
                    type="label"
                    numberOfLines={1}
                    style={styles.name}
                  >
                    {names.get(c.id) ?? `Driver ${c.id}`}
                  </ThemedText>
                  <ThemedText type="data" style={[styles.gap, isLeader && styles.leaderText]}>
                    {isLeader ? "LEADER" : formatGap(c.toLeader)}
                  </ThemedText>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, minHeight: 0 },
  headRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 5,
    borderColor: "#182028",
    overflow: "hidden",
  },
  toggleSeg: {
    minHeight: 30,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A0C0F",
  },
  toggleSegOn: { backgroundColor: Colors.accentDim },
  toggleLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 11,
    letterSpacing: 1.4,
    color: Colors.textDim,
  },
  grid: { flex: 1, minHeight: 0, gap: 6 },
  gridRow: { flex: 1, flexDirection: "row", gap: 6 },
  cell: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 5,
    borderColor: "#182028",
    backgroundColor: "#0A0C0F",
  },
  cellLabel: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 28,
    letterSpacing: 1,
    color: Colors.textMuted,
  },
  mode: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.7,
    color: Colors.textDim,
  },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.textFaint,
  },
  list: { flex: 1, minHeight: 0 },
  listContent: { gap: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: "#182028",
    backgroundColor: "#0A0C0F",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowPressed: { borderColor: Colors.borderPressed },
  rowDisconnected: { opacity: DISCONNECTED_OPACITY },
  selectedText: { color: Colors.accent },
  leaderText: { color: LEADER },
  pos: {
    width: 30,
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 20,
    color: HUE.position.label,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 22,
    letterSpacing: 0.6,
    color: Colors.textMuted,
  },
  gap: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 14,
    color: Colors.textDim,
  },
});
