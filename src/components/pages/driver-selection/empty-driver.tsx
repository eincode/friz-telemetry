import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";

export function EmptyDriver({ onUseLocal }: { onUseLocal?: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyBox}>
        <View style={styles.emptyGlyph}>
          <View style={styles.emptyGlyphInner} />
        </View>
        <View style={{ gap: 6, flexShrink: 1 }}>
          <ThemedText style={styles.emptyTitle}>
            NO DRIVERS REGISTERED
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            The server is reachable but has no drivers in its registry. Start a
            session on the console, or continue with a local feed.
          </ThemedText>
        </View>
        <Pressable
          onPress={onUseLocal}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.useLocal,
            pressed && { backgroundColor: "rgba(46,216,255,0.10)" },
          ]}
        >
          <ThemedText style={styles.useLocalLabel}>USE LOCAL</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 26,
    paddingVertical: 26,
    paddingHorizontal: 34,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.hairline,
    maxWidth: 640,
  },
  emptyGlyph: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: "#2A323A",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyGlyphInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3D464F",
  },
  emptyTitle: {
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 22,
    letterSpacing: 3,
    color: "#C7CFD8",
  },
  emptyText: {
    fontFamily: "Barlow-Regular",
    fontSize: 13,
    lineHeight: 19,
    color: "#79828C",
    maxWidth: 320,
  },
  useLocal: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  useLocalLabel: {
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 14,
    letterSpacing: 2.2,
    color: Colors.accent,
  },
});
