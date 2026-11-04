import {
  CAMERA_KEY,
  CameraControl,
  CameraView,
  REPLAY_KEY,
  ReplayAction,
  ReplayControl,
} from "@/components/pages/director/director-controls";
import { DirectorStandings } from "@/components/pages/director/director-standings";
import { ThemedText } from "@/components/themed-text";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Colors } from "@/constants/theme";
import { useDirectorCommand } from "@/hooks/api/useDirectorCommand";
import { focusKey } from "@/service/directorCommand";
import { useOverlayStore } from "@/store/overlayStore";
import { useServerStore } from "@/store/serverStore";
import { wsUrl } from "@/utils/serverUrl";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Director mode: the session's standings on the left, camera and replay
 * controls on the right. A director joins no driver slot and sends no
 * telemetry, so only the overlay feed is opened and none of the driver
 * telemetry pages are reachable from here.
 */
export default function DirectorScreen() {
  const router = useRouter();
  const serverUrl = useServerStore((s) => s.serverUrl);
  const connectOverlay = useOverlayStore((s) => s.connect);
  const disconnectOverlay = useOverlayStore((s) => s.disconnect);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [camera, setCamera] = useState<CameraView | null>(null);

  useEffect(() => {
    if (!serverUrl) return;

    const connect = () => connectOverlay(`${wsUrl(serverUrl)}/overlay`);
    connect();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") connect();
    });

    return () => {
      subscription.remove();
      disconnectOverlay();
    };
  }, [serverUrl, connectOverlay, disconnectOverlay]);

  const command = useDirectorCommand();
  const send = (key: string) => command.mutate({ key });

  const onSelectDriver = (id: number, rank: number) => {
    const key = focusKey(rank);
    if (!key) return;
    setSelectedId(id);
    send(key);
  };
  const onSelectCamera = (view: CameraView) => {
    setCamera(view);
    send(CAMERA_KEY[view]);
  };
  const onReplayAction = (action: ReplayAction) => send(REPLAY_KEY[action]);

  const insets = useSafeAreaInsets();
  const pad: ViewStyle = {
    paddingLeft: Math.max(26, insets.left),
    paddingRight: Math.max(26, insets.right),
  };

  return (
    <View style={[styles.root, pad]}>
      <View style={styles.header}>
        <SecondaryButton text="BACK" onPress={router.back} containerStyle={styles.back}>
          <View style={styles.backGlyph} />
        </SecondaryButton>
        <ThemedText type="heading" style={styles.title}>
          RACE DIRECTOR
        </ThemedText>
        {command.isError ? (
          <ThemedText type="data" numberOfLines={1} style={styles.error}>
            COMMAND FAILED · {command.error.message}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.half}>
          <DirectorStandings selectedId={selectedId} onSelect={onSelectDriver} />
        </View>
        <View style={styles.half}>
          <CameraControl active={camera} onSelect={onSelectCamera} />
          <ReplayControl onAction={onReplayAction} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 9,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  back: { paddingVertical: 4, paddingHorizontal: 8 },
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
    fontSize: 22,
    letterSpacing: 1.9,
    color: Colors.text,
  },
  error: {
    flex: 1,
    textAlign: "right",
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    letterSpacing: 1.4,
    color: Colors.error,
  },
  body: { flex: 1, flexDirection: "row", gap: 9, minHeight: 0 },
  half: { flex: 1, minWidth: 0, gap: 9 },
});
