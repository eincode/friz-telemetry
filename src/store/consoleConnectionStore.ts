import { HeadingTracker } from "@/utils/telemetry.ts/heading";
import { LapDeltaTracker } from "@/utils/telemetry.ts/lapDelta";
import { FuelStats, FuelTracker } from "@/utils/telemetry.ts/fuelTracker";
import { inputHistory } from "@/utils/telemetry.ts/inputHistory";
import { fuelPercent } from "@/utils/telemetry.ts/mapToTelemetry";
import { EMPTY_SECTOR_TIMES, SectorTimer, SectorTimes } from "@/utils/telemetry.ts/sectorTimer";
import { TrackDetector } from "@/utils/telemetry.ts/trackDetector";
import { TrackData } from "@/utils/telemetry.ts/trackMatch";
import { EMPTY_TRACK_MAP, TrackMapRecorder, TrackMapSnapshot } from "@/utils/telemetry.ts/trackMap";
import { GT7Connection, startGT7Discovery } from "@/utils/telemetry.ts/socket";
import { GT7Telemetry } from "@/utils/telemetry.ts/types";
import { create } from "zustand";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface ConsoleConnectionState {
  status: ConnectionStatus;
  connectedIp: string | null;
  error: Error | null;
  telemetry: GT7Telemetry | null;
  /** Live gap to the previous lap at the same track point; − is faster. */
  lapDeltaMs: number | null;
  /** Track map traced from the car's path; complete after the first clean timed lap. */
  trackMap: TrackMapSnapshot;
  /**
   * Known track being driven: matched mid-lap (provisional), then confirmed or
   * corrected by the first full lap. Null until matched, or on an unknown track.
   */
  track: TrackData | null;
  /** Live sector times against the known track's sector gates. */
  sectorTimes: SectorTimes;
  /** Fuel burn rate and per-lap use; null until the first on-track packet. */
  fuelStats: FuelStats | null;
  /**
   * Bumped whenever the driver moves to a different track. Stateful views key
   * on it so their per-session history (fuel per lap, input traces) starts over.
   */
  sessionId: number;
  /**
   * Direction the car faces on the map, in radians: 0 is world +X (screen
   * right), positive turns towards +Z (screen down). See HeadingTracker.
   */
  carHeading: number;
  connect: (initialIp?: string) => void;
  disconnect: () => void;
  /** Starts a fresh session: clears the track map, lap delta and per-session history. */
  resetSession: () => void;
}

const FIRST_PACKET_TIMEOUT_MS = 8000;

/**
 * Fast-changing values reach React once per display frame, with the newest
 * packet's values. GT7 sends ~60 packets/s, so on a 60 Hz screen that is
 * every packet; but when the phone falls behind and several packets arrive
 * within one frame, the whole dashboard re-renders once for all of them
 * instead of once per packet, which would only push it further behind.
 * Packets are still processed (and forwarded) one by one.
 */
type LiveFields = Partial<Pick<ConsoleConnectionState, "telemetry" | "carHeading" | "lapDeltaMs">>;
let pendingLive: LiveFields | null = null;
let frameHandle: number | null = null;

function flushLive() {
  frameHandle = null;
  if (!pendingLive) return;
  const patch = pendingLive;
  pendingLive = null;
  useConsoleConnectionStore.setState(patch);
}

/** Queues per-packet values for the UI; published on the next frame. */
function publishLive(patch: LiveFields) {
  pendingLive = pendingLive ? Object.assign(pendingLive, patch) : patch;
  frameHandle ??= requestAnimationFrame(flushLive);
}

function cancelLive() {
  if (frameHandle !== null) cancelAnimationFrame(frameHandle);
  frameHandle = null;
  pendingLive = null;
}

type RawTelemetryListener = (encrypted: Uint8Array) => void;
const rawListeners = new Set<RawTelemetryListener>();

/**
 * Every valid packet as the original encrypted datagram from the console, at
 * full rate and outside React state (the store itself is throttled for the
 * UI). Returns the unsubscribe function.
 */
export function subscribeRawTelemetry(listener: RawTelemetryListener): () => void {
  rawListeners.add(listener);
  return () => {
    rawListeners.delete(listener);
  };
}

let conn: GT7Connection | null = null;
let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
const lapDelta = new LapDeltaTracker();
const heading = new HeadingTracker();
const sectorTimer = new SectorTimer();
const fuelTracker = new FuelTracker();
// Session boundaries: primarily GT7's menu packets (see isMenuPacket). As a
// fallback, a track change is also inferred from the car's path: a different
// known track matching, or the car far from the known track / traced outline.
const onTrackChange = (next: TrackData | null = null) => {
  useConsoleConnectionStore.getState().resetSession();
  if (next) {
    trackDetector.adopt(next);
    useConsoleConnectionStore.setState({ track: next });
  }
};
const trackMap = new TrackMapRecorder(() => onTrackChange());
const trackDetector = new TrackDetector(onTrackChange);

/** GT7 sends lap -1 and position -1 while the player is in a menu, not on track. */
const isMenuPacket = (t: GT7Telemetry) => t.lapCount === -1 && t.raceStartPosition === -1;
/** True while GT7 reports the menu, so the session resets once on the way in. */
let inMenu = false;

/** Feeds one on-track packet through every session tracker. */
function feedSession(data: GT7Telemetry) {
  const { getState: get, setState: set } = useConsoleConnectionStore;
  // Before lapDelta: a track change detected here resets it for this packet.
  // Either feed may reset the session; results from before that are stale.
  const session = get().sessionId;
  const map = trackMap.feed(data);
  const found = trackDetector.feed(data);
  const fresh = get().sessionId === session;
  publishLive({ telemetry: data, carHeading: heading.feed(data), lapDeltaMs: lapDelta.feed(data) });
  // Map and track changes are rare, so they go out right away.
  if (fresh && (map || found !== undefined)) {
    set({
      ...(map && { trackMap: map }),
      ...(found !== undefined && { track: found }),
      // A snapshot is complete only once, when the lap closes: the full-lap
      // match confirms or corrects the mid-lap one.
      ...(map?.complete && { track: trackDetector.confirm(map.points) }),
    });
  }
  // After the track is settled for this packet, so gates match the track shown.
  const sectors = sectorTimer.feed(data, get().track);
  if (sectors) set({ sectorTimes: sectors });
  // Recorded here rather than in the components showing them, so they keep
  // building while those pages are not rendered.
  const now = Date.now();
  inputHistory.feed(Math.round(data.throttle), Math.round(data.brake), now);
  const fuelStats = fuelTracker.feed(fuelPercent(data), Math.max(0, data.lapCount), now);
  if (fuelStats) set({ fuelStats });
}

export const useConsoleConnectionStore = create<ConsoleConnectionState>(
  (set, get) => ({
    status: "idle",
    connectedIp: null,
    error: null,
    telemetry: null,
    lapDeltaMs: null,
    trackMap: EMPTY_TRACK_MAP,
    track: null,
    sectorTimes: EMPTY_SECTOR_TIMES,
    fuelStats: null,
    sessionId: 0,
    carHeading: 0,

    connect: () => {
      if (conn) return;

      set({ status: "connecting", error: null });

      conn = startGT7Discovery(
        (data) => {
          if (isMenuPacket(data)) {
            // Left the track (session end, track or car change, restart via
            // menu): everything session-scoped starts over. Trackers are not
            // fed while in the menu; positions there are meaningless.
            if (!inMenu) get().resetSession();
            inMenu = true;
            publishLive({ telemetry: data });
          } else {
            inMenu = false;
            feedSession(data);
          }
          if (get().status === "connecting") {
            set({ status: "connected" });
          }
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
          }
        },
        (encrypted) => {
          rawListeners.forEach((listener) => listener(encrypted));
        },
        (ip) => {
          set({ connectedIp: ip });
        },
        (err) => {
          set({ error: err, status: "error" });
        },
      );

      conn.start();

      timeoutHandle = setTimeout(() => {
        if (get().status === "connecting") {
          set({
            status: "error",
            error: new Error(
              "No response from GT7 — check the console is on track and telemetry is enabled.",
            ),
          });
        }
      }, FIRST_PACKET_TIMEOUT_MS);
    },

    disconnect: () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      conn?.close();
      conn = null;
      // A queued UI update would otherwise land after the reset below.
      cancelLive();
      lapDelta.reset();
      trackMap.reset();
      trackDetector.reset();
      sectorTimer.reset();
      fuelTracker.reset();
      inputHistory.reset();
      inMenu = false;
      set({
        status: "idle",
        connectedIp: null,
        telemetry: null,
        lapDeltaMs: null,
        trackMap: EMPTY_TRACK_MAP,
        track: null,
        sectorTimes: EMPTY_SECTOR_TIMES,
        fuelStats: null,
        sessionId: get().sessionId + 1,
        error: null,
      });
    },

    resetSession: () => {
      lapDelta.reset("session reset");
      trackMap.reset();
      trackDetector.reset();
      sectorTimer.reset();
      fuelTracker.reset();
      inputHistory.reset();
      // Don't let a queued pre-reset delta overwrite the cleared one.
      if (pendingLive && "lapDeltaMs" in pendingLive) pendingLive.lapDeltaMs = null;
      set((s) => ({
        lapDeltaMs: null,
        trackMap: EMPTY_TRACK_MAP,
        track: null,
        sectorTimes: EMPTY_SECTOR_TIMES,
        fuelStats: null,
        sessionId: s.sessionId + 1,
      }));
    },
  }),
);
