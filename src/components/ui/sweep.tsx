import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { DimensionValue, StyleSheet } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "@/constants/theme";

/** Left-to-right HUD scan pass. Linear, looping — no easing curve, no bounce. */
export function Sweep({
  active,
  width = "34%",
  height,
  colors = ["transparent", Colors.accentSoft, "transparent"],
}: {
  active: boolean;
  width?: DimensionValue;
  height?: DimensionValue;
  colors?: readonly [string, string, ...string[]];
}) {
  const x = useSharedValue(-1);

  useEffect(() => {
    if (active) {
      x.value = -1;
      x.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(x);
    }
    return () => cancelAnimation(x);
  }, [active]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: `${x.value * 300}%` }],
  }));

  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.sweep, { width, height }, style]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sweep: { position: "absolute", left: 0, top: 0, bottom: 0 },
});
