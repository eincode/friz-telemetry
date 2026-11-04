import { Box } from "@/components/pages/race-dashboard/box";
import { ThemedText } from "@/components/themed-text";
import { Colors, HUE } from "@/constants/theme";
import { SessionMode, useOverlayStore } from "@/store/overlayStore";
import { useServerStore } from "@/store/serverStore";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
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

/** "+0.412" under a minute, "+1:02.345" above; "--" when there is no gap. */
export function formatGap(s: number | null): string {
  if (s === null) return "--";
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(3);
  return m > 0 ? `+${m}:${rest.padStart(6, "0")}` : `+${rest}`;
}

/**
 * Everyone in the server session, in the server's race order, with the gap to
 * the car ahead and to the leader. Gaps are on track in a race and on best
 * lap in qualifying and practice. Order and gaps refresh together once a
 * second, so drivers trading places don't keep reshuffling the rows. Reads
 * the overlay feed itself so its updates only redraw this box.
 */
export function LeaderboardBox() {
  const standings = useOverlayStore((s) => s.standings);
  const roster = useOverlayStore((s) => s.roster);
  const mode = useOverlayStore((s) => s.mode);
  const selfId = useServerStore((s) => s.driverId);
  const names = useMemo(() => new Map(roster.map((r) => [r.id, r.name])), [roster]);

  return (
    <Box
      hue="position"
      label="LEADERBOARD"
      right={
        mode ? (
          <ThemedText type="data" style={styles.mode}>
            {MODE_LABEL[mode]}
          </ThemedText>
        ) : null
      }
      style={styles.box}
    >
      {standings.length === 0 ? (
        <ThemedText type="data" style={styles.empty}>
          WAITING FOR DRIVERS
        </ThemedText>
      ) : (
        <>
          <View style={styles.headRow}>
            <ThemedText type="data" style={[styles.head, styles.posCol]}>
              P
            </ThemedText>
            <ThemedText type="data" style={[styles.head, styles.nameCol]}>
              DRIVER
            </ThemedText>
            <ThemedText type="data" style={[styles.head, styles.gapCol]}>
              INT
            </ThemedText>
            <ThemedText type="data" style={[styles.head, styles.gapCol]}>
              LEADER
            </ThemedText>
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {standings.map((c) => {
              const isUser = c.id === selfId;
              const isLeader = c.rank === 1;
              return (
                <Animated.View
                  key={c.id}
                  layout={rowLayout}
                  entering={FadeIn.duration(150)}
                  exiting={FadeOut.duration(150)}
                  style={[styles.row, isUser && styles.rowUser, !c.connected && styles.rowDisconnected]}
                >
                  <ThemedText
                    type="data"
                    style={[styles.pos, styles.posCol, isLeader && styles.leaderText, isUser && styles.userText]}
                  >
                    {c.rank}
                  </ThemedText>
                  <ThemedText
                    type="label"
                    numberOfLines={1}
                    style={[styles.name, styles.nameCol, isUser && styles.userText]}
                  >
                    {names.get(c.id) ?? `Driver ${c.id}`}
                  </ThemedText>
                  <ThemedText type="data" style={[styles.gap, styles.gapCol, isUser && styles.userText]}>
                    {isLeader ? "—" : formatGap(c.toAhead)}
                  </ThemedText>
                  <ThemedText
                    type="data"
                    style={[styles.gap, styles.gapCol, isLeader && styles.leaderText, isUser && styles.userText]}
                  >
                    {isLeader ? "LEADER" : formatGap(c.toLeader)}
                  </ThemedText>
                </Animated.View>
              );
            })}
          </ScrollView>
        </>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, minHeight: 0 },
  mode: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.7,
    color: Colors.textDim,
  },
  empty: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.textFaint,
  },
  list: { flex: 1, minHeight: 0 },
  listContent: { gap: 3 },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 9,
  },
  head: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.7,
    color: HUE.position.label,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: "#182028",
    backgroundColor: "#0A0C0F",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rowUser: { borderColor: Colors.primary },
  rowDisconnected: { opacity: DISCONNECTED_OPACITY },
  userText: { color: Colors.primary },
  leaderText: { color: LEADER },
  posCol: { width: 18 },
  nameCol: { flex: 1, minWidth: 0 },
  gapCol: { width: 66, textAlign: "right" },
  pos: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 12,
    color: "#8A929C",
  },
  name: {
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 14,
    color: "#C7CFD8",
  },
  gap: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 11,
    color: "#8A929C",
  },
});
