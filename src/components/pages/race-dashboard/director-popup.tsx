import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { CornerCut } from "@/components/ui/corner-cut";
import { Colors, DIRECTOR_STYLE, DirectorKind } from "@/constants/theme";

export interface DirectorMessage {
  kind: DirectorKind;
  title: string;
  body: string;
  /** Auto-dismiss window in ms; the timer bar drains over this. Default 6000. */
  duration?: number;
}

export function DirectorPopup({
  message,
  lap,
  elapsed,
  onDismiss,
}: {
  message: DirectorMessage;
  lap: number;
  elapsed: string;
  onDismiss: () => void;
}) {
  const directorStyle = DIRECTOR_STYLE[message.kind];
  const duration = message.duration ?? 6000;
  const w = useSharedValue(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    w.value = 1;
    w.value = withTiming(0, { duration, easing: Easing.linear });
    timer.current = setTimeout(onDismiss, duration);
    return () => {
      cancelAnimation(w);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [message, duration]);

  const drain = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));

  return (
    <Pressable
      onPress={onDismiss}
      accessibilityRole="button"
      style={styles.overlay}
    >
      <View style={styles.scrim} />
      <View style={[styles.popup, { borderColor: directorStyle.border }]}>
        {/* flag stripe */}
        <View style={styles.stripeRow}>
          {Array.from({ length: 26 }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: i % 2 ? "#0E1013" : directorStyle.stripe,
              }}
            />
          ))}
        </View>

        <View style={styles.popupBody}>
          <View style={styles.popupGlyphCol}>
            <View
              style={[styles.chevron, { borderTopColor: directorStyle.color }]}
            />
            <ThemedText
              type="data"
              style={[styles.popupCode, { color: directorStyle.color }]}
            >
              {directorStyle.code}
            </ThemedText>
          </View>

          <View style={{ flex: 1, gap: 7, minWidth: 0 }}>
            <View style={styles.popupMetaRow}>
              <ThemedText type="data" style={styles.popupKicker}>
                RACE DIRECTOR
              </ThemedText>
              <ThemedText type="data" style={styles.popupMeta}>
                LAP {lap} · {elapsed} ELAPSED
              </ThemedText>
            </View>
            <ThemedText
              type="display"
              style={[styles.popupTitle, { color: directorStyle.color }]}
            >
              {message.title}
            </ThemedText>
            <ThemedText type="body" style={styles.popupText}>
              {message.body}
            </ThemedText>
            <View style={styles.popupFoot}>
              <View style={styles.drainTrack}>
                <Animated.View
                  style={[
                    { height: "100%", backgroundColor: directorStyle.color },
                    drain,
                  ]}
                />
              </View>
              <ThemedText type="data" style={styles.dismissHint}>
                TAP ANYWHERE TO DISMISS
              </ThemedText>
            </View>
          </View>
        </View>

        <CornerCut corner="tl" size={16} color={Colors.background} />
        <CornerCut corner="br" size={16} color={Colors.background} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 76,
    zIndex: 3,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(4,6,8,0.62)",
  },
  popup: {
    width: 566,
    maxWidth: "92%",
    backgroundColor: "#0C1014",
    borderWidth: 1,
    overflow: "hidden",
  },
  stripeRow: { height: 4, flexDirection: "row" },
  popupBody: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
  },
  popupGlyphCol: {
    alignItems: "center",
    gap: 7,
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: "#182028",
  },
  chevron: {
    width: 26,
    height: 0,
    borderTopWidth: 22,
    borderLeftWidth: 13,
    borderRightWidth: 13,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  popupCode: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.3,
  },
  popupMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  popupKicker: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 2.1,
    color: "#6B7580",
  },
  popupMeta: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.3,
    color: "#4E5761",
  },
  popupTitle: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 34,
    letterSpacing: 2,
  },
  popupText: {
    fontFamily: "Barlow-Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#B9C2CB",
  },
  popupFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 3,
  },
  drainTrack: {
    flex: 1,
    height: 2,
    backgroundColor: "#191E24",
    overflow: "hidden",
  },
  dismissHint: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 1.6,
    color: "#6B7580",
  },
});
