import { Box } from "@/components/pages/race-dashboard/box";
import { ThemedText } from "@/components/themed-text";
import { Colors, HUE } from "@/constants/theme";
import { Pressable, StyleSheet, View } from "react-native";

export type CameraView = "replay" | "cockpit" | "hood" | "normal" | "chase";
export type ReplayAction = "keyframe" | "back5" | "back10" | "back15";

/** Game key the server presses for each control. */
export const CAMERA_KEY: Record<CameraView, string> = {
  replay: "g",
  cockpit: "h",
  hood: "j",
  normal: "k",
  chase: "l",
};
export const REPLAY_KEY: Record<ReplayAction, string> = {
  keyframe: "z",
  back5: "x",
  back10: "c",
  back15: "v",
};

const CAMERAS: { id: CameraView; label: string }[] = [
  { id: "cockpit", label: "COCKPIT" },
  { id: "hood", label: "HOOD" },
  { id: "normal", label: "NORMAL" },
  { id: "chase", label: "CHASE" },
];

const REPLAY_SKIPS: { id: ReplayAction; label: string }[] = [
  { id: "back5", label: "5 SECONDS" },
  { id: "back10", label: "10 SECONDS" },
  { id: "back15", label: "15 SECONDS" },
];

function ControlButton({
  label,
  hue,
  onPress,
}: {
  label: string;
  hue: keyof typeof HUE;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { borderColor: HUE[hue].border },
        pressed && styles.buttonPressed,
      ]}
    >
      <ThemedText
        type="display"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={styles.buttonLabel}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function CameraControl({ onSelect }: { onSelect: (camera: CameraView) => void }) {
  return (
    <Box hue="times" label="CAMERA CONTROL" style={styles.box}>
      <View style={styles.row}>
        <ControlButton
          label="REPLAY CAMERA"
          hue="times"
          onPress={() => onSelect("replay")}
        />
      </View>
      <View style={styles.row}>
        {CAMERAS.map((c) => (
          <ControlButton
            key={c.id}
            label={c.label}
            hue="times"
            onPress={() => onSelect(c.id)}
          />
        ))}
      </View>
    </Box>
  );
}

export function ReplayControl({ onAction }: { onAction: (action: ReplayAction) => void }) {
  return (
    <Box hue="lap" label="REPLAY CONTROL" style={styles.box}>
      <View style={styles.row}>
        <ControlButton label="SET KEYFRAME" hue="lap" onPress={() => onAction("keyframe")} />
      </View>
      <View style={styles.row}>
        {REPLAY_SKIPS.map((r) => (
          <ControlButton key={r.id} label={r.label} hue="lap" onPress={() => onAction(r.id)} />
        ))}
      </View>
    </Box>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, minHeight: 0, gap: 8 },
  row: { flex: 1, flexDirection: "row", gap: 8 },
  button: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: "#0A0C0F",
  },
  buttonPressed: { opacity: 0.7 },
  buttonLabel: {
    fontFamily: "SairaCondensed-Bold",
    fontSize: 18,
    letterSpacing: 2,
    color: Colors.textMuted,
  },
});
