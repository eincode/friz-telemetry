import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { PulseDot } from "@/components/ui/pulse-dot";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Colors } from "@/constants/theme";

export function TitleRow({
  onBack,
  isLoading,
  driverCount,
  selectedCountdown,
  joining,
}: {
  onBack: () => void;
  isLoading: boolean;
  driverCount: number;
  selectedCountdown: number | null;
  joining: boolean;
}) {
  return (
    <View style={styles.titleRow}>
      <View style={styles.row16}>
        <SecondaryButton
          text="BACK"
          onPress={onBack}
          containerStyle={{ paddingVertical: 4, paddingHorizontal: 8 }}
        >
          <View style={styles.backGlyph} />
        </SecondaryButton>
        <ThemedText style={styles.title} numberOfLines={1}>
          {joining
            ? "JOINING SESSION"
            : selectedCountdown != null
              ? `ENTERING DASHBOARD IN ${selectedCountdown}`
              : "SELECT DRIVER"}
        </ThemedText>
      </View>

      <View style={styles.row10}>
        <PulseDot color={Colors.accent} />
        <ThemedText style={styles.serverLine}>
          {"CONNECTED"} · {isLoading ? "—" : `${driverCount} DRIVERS`}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: "SairaCondensed-SemiBold",
    fontSize: 28,
    letterSpacing: 4.5,
    color: Colors.text,
  },
  serverLine: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 11,
    letterSpacing: 1.8,
    color: "#6B7580",
  },
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
  row10: { flexDirection: "row", alignItems: "center", gap: 10 },
  row16: { flexDirection: "row", alignItems: "center", gap: 16 },
});
