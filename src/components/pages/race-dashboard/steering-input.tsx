import { ThemedText } from "@/components/themed-text";
import { Colors, HUE } from "@/constants/theme";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export function SteeringPanel({ angle }: { angle: number }) {
  const rot = useSharedValue(angle);
  useEffect(() => {
    rot.value = withTiming(angle, { duration: 1, easing: Easing.linear });
  }, [angle, rot]);
  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  return (
    <View
      style={[
        styles.box,
        styles.inputBox,
        styles.steerBox,
        { borderColor: HUE.steering.border },
      ]}
    >
      <View style={styles.inputHead}>
        <ThemedText
          type="data"
          style={[styles.boxLabel, { color: HUE.steering.label }]}
        >
          STEERING
        </ThemedText>
      </View>
      <View style={styles.steerStage}>
        <View style={styles.steerCentreTick} />
        <Animated.View style={[styles.wheel, wheelStyle]}>
          <View style={styles.wheelRim} />
          <View style={[styles.wheelSpoke, styles.wheelSpokeLeft]} />
          <View style={[styles.wheelSpoke, styles.wheelSpokeRight]} />
          <View style={styles.wheelSpokeDown} />
          <View style={styles.wheelHub} />
          <View style={styles.wheelMark} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputValue: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 26,
    color: Colors.text,
  },
  inputHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  inputBox: { flex: 1, gap: 7, paddingHorizontal: 10 },
  box: {
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: "#0E1013",
    paddingHorizontal: 11,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 6,
  },
  boxLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.7,
  },
  steerBox: { flex: 1.15 },
  steerStage: {
    flex: 1,
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  steerCentreTick: {
    position: "absolute",
    top: 0,
    width: 2,
    height: 8,
    backgroundColor: "white",
  },
  wheel: { width: 74, height: 74 },
  wheelRim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: "white",
  },
  wheelSpoke: {
    position: "absolute",
    top: 34,
    height: 6,
    backgroundColor: "white",
  },
  wheelSpokeLeft: { left: 7, right: 37 },
  wheelSpokeRight: { right: 7, left: 37 },
  wheelSpokeDown: {
    position: "absolute",
    left: 34,
    top: 34,
    bottom: 7,
    width: 6,
    backgroundColor: "white",
  },
  wheelHub: {
    position: "absolute",
    left: 26,
    top: 26,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#39434D",
  },
  wheelMark: {
    position: "absolute",
    left: 32.5,
    top: 5,
    width: 9,
    height: 5,
    borderRadius: 1,
    backgroundColor: "#FF4638",
  },
});
