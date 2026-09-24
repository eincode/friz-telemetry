import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import type { ServerState } from "@/app/ServerConnect";
import { ThemedText } from "@/components/themed-text";
import { CornerCut } from "@/components/ui/corner-cut";
import { Sweep } from "@/components/ui/sweep";
import { Colors } from "@/constants/theme";

const CONNECT_LABEL: Record<ServerState, string> = {
  idle: "CONNECT",
  connecting: "CONNECTING…",
  error: "RETRY",
  success: "LINKED",
};

export function FormColumn({
  state,
  address,
  onChangeAddress,
  onConnect,
  errorCode,
  errorMessage,
}: {
  state: ServerState;
  address: string;
  onChangeAddress: (value: string) => void;
  onConnect: () => void;
  errorCode?: string;
  errorMessage?: string;
}) {
  const connecting = state === "connecting";
  const error = state === "error";
  const inputBorder = error
    ? Colors.error
    : connecting
      ? Colors.accent
      : Colors.hairline;

  return (
    <View style={styles.formCol}>
      <View style={styles.addressBlock}>
        <ThemedText type="data" style={styles.microLabel}>
          SERVER ADDRESS
        </ThemedText>
        <View style={[styles.inputWrap, { borderColor: inputBorder }]}>
          <View style={styles.node} />
          <TextInput
            value={address}
            onChangeText={onChangeAddress}
            placeholder="192.168.1.24:8080"
            placeholderTextColor={Colors.textQuiet}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="url"
            inputMode="url"
            returnKeyType="go"
            onSubmitEditing={onConnect}
            editable={!connecting}
            allowFontScaling={false}
            style={styles.input}
          />
          <ThemedText type="data" style={styles.inputHint}>
            HOST:PORT
          </ThemedText>
          <Sweep active={connecting} />
          <CornerCut corner="tl" size={12} />
          <CornerCut corner="br" size={12} />
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <ThemedText type="data" style={styles.errorCode}>
            {errorCode}
          </ThemedText>
          <ThemedText type="body" style={styles.errorText}>
            {errorMessage}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          onPress={onConnect}
          // disabled={connecting}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.connectWrap,
            pressed && !connecting && { opacity: 0.92 },
          ]}
        >
          {connecting || error ? (
            <View
              style={[
                styles.connect,
                {
                  borderWidth: 1,
                  borderColor: error ? Colors.error : Colors.accent,
                },
              ]}
            >
              <ThemedText
                type="display"
                style={[
                  styles.connectLabel,
                  { color: error ? Colors.errorBright : Colors.accent },
                ]}
              >
                {CONNECT_LABEL[state]}
              </ThemedText>
              <Sweep
                active={connecting}
                width="40%"
                height={2}
                colors={[Colors.accent, Colors.accent]}
              />
            </View>
          ) : (
            <LinearGradient
              colors={[Colors.accent, Colors.accentDeep]}
              style={styles.connect}
            >
              <ThemedText
                type="display"
                style={[styles.connectLabel, { color: Colors.accentFg }]}
              >
                {CONNECT_LABEL[state]}
              </ThemedText>
            </LinearGradient>
          )}
          <CornerCut corner="tl" size={12} />
          <CornerCut corner="br" size={12} />
        </Pressable>
      </View>

      <ThemedText type="data" style={styles.formHint}>
        {connecting
          ? "PROBING PORT · TIMEOUT 8S"
          : "IPV4 OR HOSTNAME · DEFAULT PORT 8080"}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  formCol: { flex: 1.15, justifyContent: "center", gap: 16, paddingLeft: 34 },
  addressBlock: { gap: 9 },
  microLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.textFaint,
  },

  inputWrap: {
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 18,
    backgroundColor: Colors.panel,
    borderWidth: 1,
  },
  node: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 17,
    letterSpacing: 0.7,
    color: Colors.textInput,
  },
  inputHint: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 1.6,
    color: Colors.textQuiet,
  },

  errorBox: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.errorFaint,
    borderLeftWidth: 2,
    borderLeftColor: Colors.error,
  },
  errorCode: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.error,
    paddingTop: 1,
  },
  errorText: {
    flex: 1,
    fontFamily: "Barlow-Regular",
    fontSize: 13,
    lineHeight: 19,
    color: Colors.errorMuted,
  },

  actionRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  connectWrap: { flex: 1, position: "relative", overflow: "hidden" },
  connect: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  connectLabel: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 19,
    letterSpacing: 3.4,
  },

  formHint: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 1.4,
    color: Colors.textSubtle,
  },
});
