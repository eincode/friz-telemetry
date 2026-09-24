import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";

import { CornerCut, type Corner } from "@/components/ui/corner-cut";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";

export function PrimaryButton({
  text,
  onPress,
  cornerCuts = ["tl", "br"],
  children,
}: {
  text: string;
  onPress: () => void;
  cornerCuts?: Corner[];
  children?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ctaWrap,
        pressed && styles.ctaPressed,
      ]}
    >
      <LinearGradient
        colors={[Colors.accent, Colors.accentDeep]}
        style={styles.cta}
      >
        <ThemedText type="display" style={styles.ctaLabel}>
          {text}
        </ThemedText>
        {children}
      </LinearGradient>
      {cornerCuts.map((corner) => (
        <CornerCut key={corner} corner={corner} />
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ctaWrap: { position: "relative", overflow: "hidden" },
  ctaPressed: { transform: [{ translateY: 1 }], opacity: 0.92 },
  cta: {
    paddingVertical: 22,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaLabel: {
    fontSize: 26,
    letterSpacing: 4,
    color: Colors.accentFg,
  },
});
