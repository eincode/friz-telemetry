import { useEffect } from "react";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/** Status dot: 1.1s linear opacity pulse. */
export function PulseDot({ color, size = 8 }: { color: string; size?: number }) {
  const o = useSharedValue(1);

  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: 550, easing: Easing.linear }),
        withTiming(1, { duration: 550, easing: Easing.linear }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(o);
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
