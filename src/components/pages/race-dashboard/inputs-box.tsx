import { StyleSheet, View } from "react-native";

import { InputBar } from "@/components/pages/race-dashboard/input-bar";
import { SteeringPanel } from "./steering-input";

export function InputsBox({
  throttle,
  brake,
  angle,
}: {
  throttle: number;
  brake: number;
  angle: number;
}) {
  return (
    <View style={styles.rightCol}>
      <View style={{ flex: 1, gap: 9 }}>
        <InputBar
          hue="throttle"
          label="THRTL"
          value={throttle}
          colors={["#57C489", "#1F7A4C"]}
        />
        <InputBar
          hue="brake"
          label="BRK"
          value={brake}
          colors={["#FF6E5E", "#C4241B"]}
        />
      </View>
      <View style={{ flex: 1 }}>
        <SteeringPanel angle={angle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rightCol: { width: 230, gap: 9 },
});
