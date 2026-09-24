import { StyleSheet, View } from "react-native";
import Svg, { Line, Polygon } from "react-native-svg";

import { Colors } from "@/constants/theme";

export function AmbientGraph() {
  return (
    <View pointerEvents="none" style={styles.ambient}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
      >
        <Polygon
          points="0,40 6,25 14,31 22,13 30,22 38,7 47,18 56,10 64,25 73,16 82,28 91,19 100,26 100,40"
          fill={Colors.accentFaint}
        />
        <Line
          x1="0"
          y1="40"
          x2="100"
          y2="40"
          stroke={Colors.accentDim}
          strokeWidth="0.4"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  ambient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "8%",
    height: "52%",
    opacity: 0.9,
  },
});
