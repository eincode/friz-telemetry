import { Box } from "@/components/pages/race-dashboard/box";
import { formatGap } from "@/components/pages/race-dashboard/leaderboard-box";
import { ThemedText } from "@/components/themed-text";
import { Colors, HUE } from "@/constants/theme";
import { focusKey } from "@/service/directorCommand";
import { SessionMode, useOverlayStore } from "@/store/overlayStore";
import { useMemo } from "react";
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

/**
 * The session's standings sized for touch: tapping a row focuses the camera
 * on that place. Same feed and order as the dashboard leaderboard. The game
 * only has focus keys down to 16th, so rows past that can't be tapped.
 */
export function DirectorStandings({
  selectedId,
  onSelect,
}: {
  selectedId: number | null;
  onSelect: (id: number, rank: number) => void;
}) {
  const standings = useOverlayStore((s) => s.standings);
  const roster = useOverlayStore((s) => s.roster);
  const mode = useOverlayStore((s) => s.mode);
  const names = useMemo(() => new Map(roster.map((r) => [r.id, r.name])), [roster]);

  return (
    <Box
      hue="position"
      label="STANDINGS"
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
        <View style={styles.emptyWrap}>
          <ThemedText type="data" style={styles.empty}>
            WAITING FOR DRIVERS
          </ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {standings.map((c) => {
            const isSelected = c.id === selectedId;
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
                  onPress={() => onSelect(c.id, c.rank)}
                  disabled={!focusable}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: !focusable }}
                  style={({ pressed }) => [
                    styles.row,
                    isSelected && styles.rowSelected,
                    pressed && styles.rowPressed,
                    !c.connected && styles.rowDisconnected,
                  ]}
                >
                  <ThemedText
                    type="data"
                    style={[styles.pos, isLeader && styles.leaderText, isSelected && styles.selectedText]}
                  >
                    {c.rank}
                  </ThemedText>
                  <ThemedText
                    type="label"
                    numberOfLines={1}
                    style={[styles.name, isSelected && styles.selectedText]}
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
  rowSelected: { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
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
