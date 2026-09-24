import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Colors } from "@/constants/theme";

export function Action({
  onStartTelemetry,
  onServerConnect,
}: {
  onStartTelemetry: () => void;
  onServerConnect: () => void;
}) {
  return (
    <View style={styles.actionCol}>
      <PrimaryButton
        text="START TELEMETRY"
        onPress={() => {
          onStartTelemetry();
        }}
      >
        <View style={styles.ctaArrow} />
      </PrimaryButton>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <ThemedText type="data" style={styles.dividerLabel}>
          OPTIONAL
        </ThemedText>
        <View style={styles.dividerLine} />
      </View>

      <SecondaryButton
        text="CONNECT TO SERVER"
        subtitle="MULTI-DRIVER"
        onPress={onServerConnect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actionCol: { flex: 1, justifyContent: "center", gap: 18, paddingLeft: 34 },
  ctaArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 12,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: Colors.accentFg,
  },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  dividerLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.textQuiet,
  },
});
