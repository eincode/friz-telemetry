import { StyleSheet, View, ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { HUE } from "@/constants/theme";

export function Box({
  hue,
  label,
  right,
  children,
  style,
}: {
  hue: keyof typeof HUE;
  label: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.box, { borderColor: HUE[hue].border }, style]}>
      <View style={styles.boxHead}>
        <ThemedText
          type="data"
          style={[styles.boxLabel, { color: HUE[hue].label }]}
        >
          {label}
        </ThemedText>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: "#0E1013",
    paddingHorizontal: 11,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 6,
  },
  boxHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  boxLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.7,
  },
});
