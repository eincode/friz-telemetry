import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { PulseDot } from "@/components/ui/pulse-dot";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Colors } from "@/constants/theme";

export function TitleColumn({
  onBack,
  status,
}: {
  onBack: () => void;
  status: { text: string; color: string };
}) {
  return (
    <View style={styles.infoCol}>
      <View style={styles.infoStack}>
        <SecondaryButton
          text="BACK"
          onPress={onBack}
          containerStyle={{ paddingVertical: 4, paddingHorizontal: 8 }}
        >
          <View style={styles.backGlyph} />
        </SecondaryButton>

        <ThemedText type="heading" style={styles.title}>
          SERVER
        </ThemedText>
        <ThemedText type="heading" style={styles.titleAccent}>
          CONNECTION
        </ThemedText>
        <ThemedText type="body" style={styles.lede}>
          Sync with a shared session server to compare telemetry across
          registered drivers.
        </ThemedText>
      </View>

      <View style={styles.statusBlock}>
        <ThemedText type="data" style={styles.microLabel}>
          SERVER STATUS
        </ThemedText>
        <View style={styles.row10}>
          <PulseDot color={status.color} />
          <ThemedText
            type="label"
            style={[styles.statusText, { color: status.color }]}
          >
            {status.text}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  infoCol: {
    flex: 0.85,
    justifyContent: "space-between",
    paddingTop: 26,
    paddingBottom: 26,
    paddingRight: 34,
    borderRightWidth: 1,
    borderRightColor: Colors.hairlineDim,
  },
  infoStack: { gap: 14, alignItems: "flex-start" },
  backGlyph: {
    width: 0,
    height: 0,
    borderTopWidth: 4.5,
    borderBottomWidth: 4.5,
    borderRightWidth: 8,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: Colors.textDim,
  },
  title: {
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 38,
    letterSpacing: 1.9,
    color: Colors.text,
  },
  titleAccent: {
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 38,
    letterSpacing: 1.9,
    color: Colors.text,
    marginTop: -32,
  },
  lede: {
    fontFamily: "Barlow-Regular",
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSoft,
    maxWidth: 250,
  },
  microLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.textFaint,
  },
  statusText: {
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 20,
    letterSpacing: 2.4,
  },
  statusBlock: { gap: 8 },
  row10: { flexDirection: "row", alignItems: "center", gap: 10 },
});
