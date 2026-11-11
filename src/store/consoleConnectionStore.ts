import { HeadingTracker } from "@/utils/telemetry.ts/heading";
import { LapDeltaTracker } from "@/utils/telemetry.ts/lapDelta";
import { EMPTY_SECTOR_TIMES, SectorTimer, SectorTimes } from "@/utils/telemetry.ts/sectorTimer";
import { TrackDetector } from "@/utils/telemetry.ts/trackDetector";
import { TrackData } from "@/utils/telemetry.ts/trackMatch";
import { EMPTY_TRACK_MAP, TrackMapRecorder, TrackMapSnapshot } from "@/utils/telemetry.ts/trackMap";
import { GT7Connection, startGT7Discovery } from "@/utils/telemetry.ts/socket";
import { GT7Telemetry } from "@/utils/telemetry.ts/types";
import { Buffer } from "buffer";
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

type RawTelemetryListener = (raw: Buffer) => void;
const rawListeners = new Set<RawTelemetryListener>();

/**
 * Every decrypted packet, at full rate and outside React state (the store
 * itself is throttled for the UI). Returns the unsubscribe function.
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
  set({
    telemetry: data,
    carHeading: heading.feed(data),
    lapDeltaMs: lapDelta.feed(data),
    ...(fresh && map && { trackMap: map }),
    ...(fresh && found !== undefined && { track: found }),
    // A snapshot is complete only once, when the lap closes: the full-lap
    // match confirms or corrects the mid-lap one.
    ...(fresh && map?.complete && { track: trackDetector.confirm(map.points) }),
  });
  // After the track is settled for this packet, so gates match the track shown.
  const sectors = sectorTimer.feed(data, get().track);
  if (sectors) set({ sectorTimes: sectors });
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
            set({ telemetry: data });
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
        (rawTelemetry) => {
          rawListeners.forEach((listener) => listener(rawTelemetry));
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
      lapDelta.reset();
      trackMap.reset();
      trackDetector.reset();
      sectorTimer.reset();
      inMenu = false;
      set({
        status: "idle",
        connectedIp: null,
        telemetry: null,
        lapDeltaMs: null,
        trackMap: EMPTY_TRACK_MAP,
        track: null,
        sectorTimes: EMPTY_SECTOR_TIMES,
        sessionId: get().sessionId + 1,
        error: null,
      });
    },

    resetSession: () => {
      lapDelta.reset("session reset");
      trackMap.reset();
      trackDetector.reset();
      sectorTimer.reset();
      set((s) => ({
        lapDeltaMs: null,
        trackMap: EMPTY_TRACK_MAP,
        track: null,
        sectorTimes: EMPTY_SECTOR_TIMES,
        sessionId: s.sessionId + 1,
      }));
    },
  }),
);
