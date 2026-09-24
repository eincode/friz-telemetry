import { ThemedText } from "@/components/themed-text";
import { HUE } from "@/constants/theme";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Layout,
} from "react-native-reanimated";
import { ScrollView, StyleSheet, View } from "react-native";

export interface LeaderboardRow {
  /** Stable per-driver id — lets layout animations track drivers across slots. */
  id: string;
  pos: number;
  name: string;
  gap: string;
  isUser: boolean;
}

export function buildLeaderboard(
  currentPosition: number,
  totalPlayers: number,
): LeaderboardRow[] {
  const rows: LeaderboardRow[] = [];
  let dummy = 0;
  for (let pos = 1; pos <= totalPlayers; pos++) {
    const isUser = pos === currentPosition;
    rows.push({
      id: isUser ? "user" : `driver-${++dummy}`,
      pos,
      name: "Driver",
      gap: pos === 1 ? "—" : "+0.125",
      isUser,
    });
  }
  return rows;
}

// Timing-based ease-out: settles exactly on target, no spring overshoot/jiggle.
const rowLayout = Layout.duration(220).easing(Easing.out(Easing.cubic));

export function LeaderboardBox({
  currentPosition,
  totalPlayers,
}: {
  currentPosition: number;
  totalPlayers: number;
}) {
  const rows = buildLeaderboard(currentPosition, totalPlayers);

  return (
    <View style={[styles.box, { borderColor: HUE.position.border }]}>
      <ThemedText
        type="data"
        style={[styles.label, { color: HUE.position.label }]}
      >
        LEADERBOARD
      </ThemedText>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row) => (
          <Animated.View
            key={row.id}
            layout={rowLayout}
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
            style={[styles.row, row.isUser && styles.rowUser]}
          >
            <ThemedText
              type="data"
              style={[styles.pos, row.isUser && styles.rowUserText]}
            >
              {row.pos}
            </ThemedText>
            <ThemedText
              type="label"
              style={[styles.name, row.isUser && styles.rowUserText]}
            >
              {row.name}
            </ThemedText>
            <ThemedText
              type="data"
              style={[styles.gap, row.isUser && styles.rowUserText]}
            >
              {row.gap}
            </ThemedText>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: "#0E1013",
    paddingHorizontal: 11,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 6,
    minHeight: 0,
  },
  label: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.7,
  },
  list: { flex: 1, minHeight: 0 },
  listContent: { gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: "#182028",
    backgroundColor: "#0A0C0F",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rowUser: { borderColor: "#FFFFFF" },
  rowUserText: { color: "#FFFFFF" },
  pos: {
    width: 22,
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 12,
    color: "#8A929C",
  },
  name: {
    flex: 1,
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 15,
    color: "#C7CFD8",
  },
  gap: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 12,
    color: "#8A929C",
  },
});
