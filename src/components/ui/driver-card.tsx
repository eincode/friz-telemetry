import { ThemedText } from "@/components/themed-text";
import { CornerCut } from "@/components/ui/corner-cut";
import { Sweep } from "@/components/ui/sweep";
import { Colors } from "@/constants/theme";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

export interface Driver {
  id: string;
  fullName: string;
  gamerId: string;
  hasJoinedSession: boolean;
}

const CARD_CUT = 14;

export function DriverCard({
  fullName,
  gamerId,
  hasJoinedSession,
  index,
  selected = false,
  disabled = false,
  onPress,
}: {
  fullName: string;
  gamerId: string;
  hasJoinedSession: boolean;
  index: number;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const accentText =
    selected || hasJoinedSession ? Colors.accent : Colors.textFaint;
  const driverNumber = String(index + 1).padStart(2, "0");
  const joinedText = hasJoinedSession ? "JOINED" : "NOT JOINED";
  const isDisabled = disabled || hasJoinedSession;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={() => setFocused(true)}
      onPressOut={() => setFocused(false)}
      accessibilityRole="button"
      accessibilityState={{
        selected: selected || hasJoinedSession,
        disabled: isDisabled,
      }}
      accessibilityLabel={`Driver ${driverNumber} ${fullName}, ${gamerId}, ${joinedText}`}
      style={[
        styles.card,
        hasJoinedSession
          ? { backgroundColor: "rgba(46,216,255,0.07)" }
          : selected
            ? {
                backgroundColor: "rgba(46,216,255,0.07)",
                borderColor: Colors.accent,
              }
            : focused
              ? { backgroundColor: "#0F141A", borderColor: "#39434D" }
              : { backgroundColor: "#0D1116", borderColor: "#1D242C" },
      ]}
    >
      {selected || hasJoinedSession ? (
        <View pointerEvents="none" style={styles.cardGlow} />
      ) : null}

      <View style={styles.cardTop}>
        <ThemedText style={[styles.cardNum, { color: accentText }]}>
          {driverNumber}
        </ThemedText>
        <View style={styles.row7}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: hasJoinedSession ? Colors.accent : "#3D464F",
              },
            ]}
          />
          <ThemedText style={styles.cardStatus}>{joinedText}</ThemedText>
        </View>
      </View>

      <View style={{ gap: 3 }}>
        <ThemedText style={styles.cardName} numberOfLines={1}>
          {fullName.toUpperCase()}
        </ThemedText>
        <ThemedText style={styles.cardGamerId} numberOfLines={1}>
          {gamerId}
        </ThemedText>
      </View>

      <View style={styles.cardFoot}>
        <ThemedText style={[styles.cardCta, { color: accentText }]}>
          {hasJoinedSession ? "IN SESSION" : selected ? "SELECTED" : "SELECT"}
        </ThemedText>
      </View>

      <CornerCut corner="tl" size={CARD_CUT} color={Colors.background} />
      <CornerCut corner="br" size={CARD_CUT} color={Colors.background} />
    </Pressable>
  );
}

export function SkeletonCard() {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: "#0D1116",
          borderColor: Colors.hairlineDim,
          overflow: "hidden",
        },
      ]}
    >
      <Sweep active />
      <View style={{ width: 44, height: 8, backgroundColor: "#191F26" }} />
      <View style={{ width: 104, height: 16, backgroundColor: "#1B222A" }} />
      <View style={{ width: 72, height: 8, backgroundColor: "#161C23" }} />
      <CornerCut corner="tl" size={CARD_CUT} color={Colors.background} />
      <CornerCut corner="br" size={CARD_CUT} color={Colors.background} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderWidth: 1,
  },
  cardGlow: {
    ...StyleSheet.absoluteFill,
    borderWidth: 6,
    borderColor: "rgba(46,216,255,0.06)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardNum: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 30,
    letterSpacing: 1.2,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  cardStatus: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.4,
    color: "#6B7580",
  },
  cardName: {
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 21,
    letterSpacing: 1.9,
    color: "#EAEFF4",
  },
  cardGamerId: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 1,
    color: "#79828C",
  },
  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.hairlineDim,
  },
  cardCta: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  row7: { flexDirection: "row", alignItems: "center", gap: 7 },
});
