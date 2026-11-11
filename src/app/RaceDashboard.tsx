import { DirectorMessage, DirectorPopup } from "@/components/pages/race-dashboard/director-popup";
import { FuelBox } from "@/components/pages/race-dashboard/fuel-box";
import { GapBox } from "@/components/pages/race-dashboard/gap-box";
import { GearSpeedBox } from "@/components/pages/race-dashboard/gear-speed-box";
import { InputsBox } from "@/components/pages/race-dashboard/inputs-box";
import { LapBox } from "@/components/pages/race-dashboard/lap-box";
import { LeaderboardBox } from "@/components/pages/race-dashboard/leaderboard-box";
import { ManagerScreen } from "@/components/pages/race-dashboard/manager-screen";
import { MapBox } from "@/components/pages/race-dashboard/map-box";
import { PositionBox } from "@/components/pages/race-dashboard/position-box";
import { RpmBar } from "@/components/pages/race-dashboard/rpm-bar";
import { SectorBox } from "@/components/pages/race-dashboard/sector-box";
import { TimesBox } from "@/components/pages/race-dashboard/times-box";
import { TyreBox } from "@/components/pages/race-dashboard/tyre-box";
import { Colors } from "@/constants/theme";
import { useTelemetryMapped } from "@/hooks/use-telemetry-mapped";
import { useConsoleConnectionStore } from "@/store/consoleConnectionStore";
import { useOverlayStore } from "@/store/overlayStore";
import { useServerStore } from "@/store/serverStore";
import { useTelemetryServerStore } from "@/store/telemetryServerStore";
import { formatLapTime } from "@/utils/formatLapTime";
import { wsUrl } from "@/utils/serverUrl";
import { startTelemetryBridge, stopTelemetryBridge } from "@/utils/telemetry.ts/telemetryServerBridge";
import { TRACKS } from "@/utils/telemetry.ts/trackMatch";
import { Vec3 } from "@/utils/telemetry.ts/types";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { AppState, LayoutChangeEvent, StyleSheet, View, ViewStyle } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

export type TyreCorner = "FL" | "FR" | "RL" | "RR";

export interface Telemetry {
  position: number;
  positionOf: number;
  /** World position (x, y, z) from GT7 telemetry. */
  carPosition: Vec3;
  lap: number;
  lapOf: number;
  /** Degrees celsius, per corner. */
  tyreTemps: Record<TyreCorner, number>;
  /** 0–100. */
  brake: number;
  throttle: number;
  gear: number;
  /** km/h. */
  speed: number;
  rpm: number;
  minAlertRpm: number;
  maxAlertRpm: number;
  /** 0–100. */
  fuel: number;
  /** Milliseconds. */
  currentLapMs: number;
  lastLapMs: number | null;
  bestLapMs: number | null;
  /** Gap to the previous lap at the same track point; negative = faster. */
  lapDeltaMs: number | null;
  steeringWheelAngle: number | null;
}

export default function TelemetryDashboardScreen() {
  const router = useRouter();
  const {
    connect: connectTelemetryServer,
    disconnect: disconnectTelemetryServer,
    status: telemetryServerStatus,
  } = useTelemetryServerStore((s) => s);
  const { token, serverUrl } = useServerStore((s) => s);
  const connectOverlay = useOverlayStore((s) => s.connect);
  const disconnectOverlay = useOverlayStore((s) => s.disconnect);
  const disconnect = useConsoleConnectionStore((s) => s.disconnect);
  const onBack = () => {
    disconnect();
    router.back();
    if (telemetryServerStatus !== "idle") {
      disconnectTelemetryServer();
    }
  };
  const tripleTap = Gesture.Tap()
    .numberOfTaps(3)
    .onEnd((_, success) => {
      if (success) {
        scheduleOnRN(onBack);
      }
    });

  useEffect(() => {
    if (!token || !serverUrl) {
      return;
    }

    const connect = () => {
      connectTelemetryServer(wsUrl(serverUrl), token);
      startTelemetryBridge();
      // Everyone's live positions for the map.
      connectOverlay(`${wsUrl(serverUrl)}/overlay`);
    };

    connect();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        connect();
      }
    });

    return () => {
      subscription.remove();
      disconnectTelemetryServer();
      stopTelemetryBridge();
      disconnectOverlay();
    };
  }, [token, serverUrl, connectTelemetryServer, disconnectTelemetryServer, connectOverlay, disconnectOverlay]);

  const d = useTelemetryMapped();
  const trackMap = useConsoleConnectionStore((s) => s.trackMap);
  const resetSession = useConsoleConnectionStore((s) => s.resetSession);
  const carHeading = useConsoleConnectionStore((s) => s.carHeading);
  const track = useConsoleConnectionStore((s) => s.track);
  const sectorTimes = useConsoleConnectionStore((s) => s.sectorTimes);
  // In a server session the map is pinned to the session's track, so
  // everyone is drawn on the same layout whatever the local matcher thinks.
  // Falls back to the local match when the server's track isn't bundled here.
  const serverTrackId = useOverlayStore((s) => s.trackId);
  const serverTrack = useMemo(
    () => (serverTrackId ? (TRACKS.find((t) => t.id === serverTrackId) ?? null) : null),
    [serverTrackId],
  );

  // Exact viewport width, measured from the real container (not window dims),
  // so pages are pixel-exact and the dashboard never pokes past the right edge.
  // Pages: [0] Manager (left) | [1] Dashboard | [2] Map (right).
  // The pager opens on the dashboard (index 1), so translateX starts at -pageW.
  const pageW = useSharedValue(0);
  const translateX = useSharedValue(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (pageW.value === 0) {
      translateX.value = -w;
    }
    pageW.value = w;
  };
  // Only the page in view is rendered, so the others cost nothing per
  // packet; while a swipe is under way its neighbours are rendered too, so
  // they slide in with their content.
  const [page, setPage] = useState(1);
  const [swiping, setSwiping] = useState(false);
  const settle = (idx: number) => {
    setPage(idx);
    setSwiping(false);
  };
  const shows = (idx: number) => idx === page || (swiping && Math.abs(idx - page) === 1);

  const panStartX = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onStart(() => {
      panStartX.value = translateX.value;
      scheduleOnRN(setSwiping, true);
    })
    .onUpdate((e) => {
      translateX.value = Math.max(-pageW.value * 2, Math.min(0, panStartX.value + e.translationX));
    })
    .onEnd((e) => {
      const w = pageW.value;
      let idx = Math.round(-translateX.value / w);
      if (e.velocityX < -500) idx += 1;
      else if (e.velocityX > 500) idx -= 1;
      idx = Math.max(0, Math.min(2, idx));
      // withTiming + ease-out: settles exactly on target, no spring overshoot/jiggle.
      translateX.value = withTiming(
        -idx * w,
        {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          // Not finished means a new swipe took over; that one settles instead.
          if (finished) scheduleOnRN(settle, idx);
        },
      );
    });
  const pagerStyle = useAnimatedStyle(() => ({
    width: pageW.value * 3,
    transform: [{ translateX: translateX.value }],
  }));
  const [directorMessage] = useState<DirectorMessage>({
    kind: "info",
    title: "TIP",
    body: "You can triple-tap to go back to previous screen",
  });

  const insets = useSafeAreaInsets();
  const pad: ViewStyle = {
    paddingLeft: Math.max(26, insets.left),
    paddingRight: Math.max(26, insets.right),
  };

  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [directorMessage]);

  const dismiss = () => {
    setDismissed(true);
  };

  return (
    <GestureHandlerRootView>
      <GestureDetector gesture={Gesture.Simultaneous(tripleTap, pan)}>
        <View style={styles.swipeRoot} onLayout={onLayout}>
          <Animated.View style={[styles.pager, pagerStyle]}>
            {/* Swipe-left page — Manager */}
            <View style={[styles.root, pad]}>
              {shows(0) ? (
                <ManagerScreen
                  throttle={d.throttle}
                  brake={d.brake}
                  tyreTemps={d.tyreTemps}
                  fuel={d.fuel}
                  lastLapMs={d.lastLapMs}
                  bestLapMs={d.bestLapMs}
                />
              ) : null}
            </View>

            <View style={[styles.root, pad]}>
              {shows(1) ? (
                <>
                  <RpmBar rpm={d.rpm} minAlertRpm={d.minAlertRpm} maxAlertRpm={d.maxAlertRpm} />

                  <View style={styles.grid}>
                    {/* left column */}
                    <View style={styles.leftCol}>
                      <View style={styles.row9}>
                        <PositionBox currentPos={d.position} totalPlayers={d.positionOf} />
                        <LapBox currentLap={d.lap} totalLap={d.lapOf} />
                      </View>

                      <TyreBox
                        flTemp={d.tyreTemps.FL}
                        frTemp={d.tyreTemps.FR}
                        rrTemp={d.tyreTemps.RR}
                        rlTemp={d.tyreTemps.RL}
                      />

                      <FuelBox currentFuelPercent={d.fuel} />
                    </View>

                    {/* center column — gear over speed */}
                    <View style={styles.centerCol}>
                      <GearSpeedBox currentSpeed={d.speed} currentGear={d.gear} />

                      <TimesBox currentLapMs={d.currentLapMs} lastLapMs={d.lastLapMs} bestLapMs={d.bestLapMs} />
                    </View>

                    {/* right column — pedal inputs */}
                    <InputsBox throttle={d.throttle} brake={d.brake} angle={d.steeringWheelAngle || 0} />
                  </View>
                </>
              ) : null}

              {shows(1) && directorMessage && !dismissed ? (
                <DirectorPopup
                  message={directorMessage}
                  lap={d.lap}
                  elapsed={formatLapTime(d.currentLapMs).slice(0, 4)}
                  onDismiss={dismiss}
                />
              ) : null}
            </View>

            {/* Swipe-right page — Map, with the leaderboard in a server session. */}
            <View style={[styles.root, styles.mapPage, pad]}>
              {shows(2) ? (
                <>
                  <View style={styles.mapHalf}>
                    <MapBox
                      carPosition={d.carPosition}
                      carHeading={carHeading}
                      trackMap={trackMap}
                      track={(token ? serverTrack : null) ?? track}
                      onReset={resetSession}
                    />
                  </View>
                  <View style={styles.mapHalf}>
                    <TimesBox currentLapMs={d.currentLapMs} lastLapMs={d.lastLapMs} bestLapMs={d.bestLapMs} />
                    {token ? <LeaderboardBox /> : <SectorBox sectors={sectorTimes} currentLapMs={d.currentLapMs} />}
                    <GapBox gapMs={d.lapDeltaMs} />
                  </View>
                </>
              ) : null}
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  swipeRoot: { flex: 1, overflow: "hidden" },
  pager: { flex: 1, flexDirection: "row" },
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 9,
  },
  mapPage: { minHeight: 0, flexDirection: "row" },
  mapHalf: { flex: 1, minWidth: 0, gap: 9 },

  grid: { flex: 1, flexDirection: "row", gap: 9, minHeight: 0 },
  leftCol: { width: 216, gap: 9 },
  centerCol: { flex: 1, minWidth: 0, gap: 9 },
  row9: { flexDirection: "row", gap: 9 },
});
