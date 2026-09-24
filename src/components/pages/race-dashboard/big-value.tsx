import { StyleSheet, TextStyle, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";

export function BigValue({
  value,
  of,
  style,
}: {
  value: string;
  of?: string;
  style?: TextStyle;
}) {
  return (
    <View style={styles.baseline}>
      <ThemedText type="display" style={[styles.bigValue, style]}>
        {value}
      </ThemedText>
      {of ? (
        <ThemedText type="data" style={styles.ofValue}>
          /{of}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  baseline: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  bigValue: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 46,
    marginTop: "-20%",
    marginBottom: "-20%",
    color: Colors.text,
  },
  ofValue: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 12,
    color: "#6B7580",
  },
});
