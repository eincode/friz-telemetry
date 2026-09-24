import { Platform, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Stat } from "@/components/ui/stat";
import { Colors } from "@/constants/theme";
import {
  ConnectionStatus,
  useConsoleConnectionStore,
} from "@/store/consoleConnectionStore";

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  idle: Colors.textFaint,
  connecting: Colors.warn,
  connected: Colors.success,
  error: Colors.error,
};

const STATUS_MESSAGE: Record<ConnectionStatus, string> = {
  idle: "IDLE",
  connecting: "CONNECTING",
  connected: "CONNECTED",
  error: "ERROR",
};

export function Branding() {
  const status = useConsoleConnectionStore((s) => s.status);
  return (
    <View style={styles.brandCol}>
      <View style={styles.row10}>
        <View style={styles.rule} />
        <ThemedText type="data" style={styles.kicker}>
          SYSTEM READY · v1.0.0
        </ThemedText>
      </View>

      <View style={styles.displayStack}>
        <ThemedText type="display" style={styles.display}>
          FRIZ{"\n"}
        </ThemedText>
        <ThemedText
          type="display"
          style={{
            fontSize: 66,
            color: Colors.accent,
            ...Platform.select({
              ios: { marginTop: "-36%" },
              android: { marginTop: -125 },
            }),
          }}
        >
          TELEMETRY
        </ThemedText>
      </View>

      <ThemedText type="body" style={styles.lede}>
        Live lap, tyre and throttle data read straight from your console
        session. No account, no setup.
      </ThemedText>

      <View style={styles.statRow}>
        <Stat
          label="LOCAL FEED"
          value={STATUS_MESSAGE[status]}
          dotColor={STATUS_COLOR[status]}
        />
        <Stat label="SAMPLE RATE" value="60 HZ" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandCol: {
    flex: 1.05,
    justifyContent: "center",
    gap: 16,
    paddingRight: 34,
    borderRightWidth: 1,
    borderRightColor: Colors.hairlineDim,
  },
  row10: { flexDirection: "row", alignItems: "center", gap: 10 },
  rule: { width: 26, height: 2, backgroundColor: Colors.accent },
  kicker: {
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.textTertiary,
  },
  displayStack: { marginTop: -30, marginBottom: -30 },
  display: {
    fontSize: 66,
    letterSpacing: 1,
    color: Colors.text,
  },
  lede: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: -20,
    color: Colors.textDim,
    maxWidth: 330,
  },
  statRow: { flexDirection: "row", gap: 26, marginTop: 6 },
});
