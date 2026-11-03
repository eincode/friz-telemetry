import { RosterEntry } from "@/service/getSession";
import { create } from "zustand";

// Live race state for everyone in the session, read from the server's
// `/overlay` WebSocket (the same feed the broadcast overlay uses). Only the
// bits the map needs are kept: who is where, and in which order.

export type OverlayConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting";

export type SessionMode = "race" | "qualifying" | "practice";

/** Where one driver is on track, as the server last reported them. */
export interface OverlayCar {
  id: number;
  /** World XZ, same space as local telemetry; null until they send a packet on track. */
  position: [number, number] | null;
}

/** One row of the standings snapshot. */
export interface OverlayStanding {
  id: number;
  /** 1-based place in the server's race order. */
  rank: number;
  /** False while the driver's telemetry link is down. */
  connected: boolean;
  /**
   * Seconds behind the leader and the car ahead: on track in a race, on best
   * lap otherwise. Null for the leader, for drivers outside the race order,
   * and while the server has nothing to compare yet.
   */
  toLeader: number | null;
  toAhead: number | null;
}

interface OverlayStore {
  status: OverlayConnectionStatus;
  roster: RosterEntry[];
  /** Track the session runs on; matches the ids in TRACKS. */
  trackId: string | null;
  mode: SessionMode | null;
  /** Live car positions, ~15 Hz. */
  cars: OverlayCar[];
  /**
   * Places and gaps, leader first, refreshed once a second so two drivers
   * swapping back and forth don't keep reshuffling the leaderboard.
   */
  standings: OverlayStanding[];
  connect: (url: string) => void;
  disconnect: () => void;
}

/** Wire shapes, trimmed to the fields read here. */
interface RosterMessage {
  type: "roster";
  roster: RosterEntry[];
}

interface StateMessage {
  type: "state";
  raceState: { mode: SessionMode; trackId: string | null; order: number[] };
  drivers: Record<
    string,
    {
      connected: boolean;
      telemetry: { position: [number, number, number] } | null;
      derived: { gapToLeader: number; gapToAhead: number };
    }
  >;
}

/**
 * The server broadcasts up to 60 Hz; the map only needs ~15. State frames
 * arriving sooner than this after the last one are dropped unparsed.
 */
const PUBLISH_INTERVAL_MS = 66;
/** Standings are republished at most this often, independent of positions. */
const STANDINGS_INTERVAL_MS = 1000;
/** JSON.stringify keeps key order, so every state frame starts like this. */
const STATE_PREFIX = '{"type":"state"';

/** Reconnect backoff: 1s, 2s, 4s, … capped at RECONNECT_MAX_MS. */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 10000;

let target: string | null = null;
let ws: WebSocket | null = null;
let retryAttempt = 0;
let retryHandle: ReturnType<typeof setTimeout> | null = null;
let lastStateAt = 0;
let lastStandingsAt = 0;

function clearRetryTimer() {
  if (retryHandle) {
    clearTimeout(retryHandle);
    retryHandle = null;
  }
}

function detach(socket: WebSocket) {
  socket.onopen = null;
  socket.onmessage = null;
  socket.onerror = null;
  socket.onclose = null;
  socket.close();
}

/** The server sends 0 where it has no gap; only a positive one is real. */
const gapOrNull = (ranked: boolean, gap: number | undefined) => (ranked && gap && gap > 0 ? gap : null);

/** Race order, then anyone the order leaves out; a driver's rank is their place in this list. */
function rankedIds(msg: StateMessage): number[] {
  const { order } = msg.raceState;
  return [...order, ...Object.keys(msg.drivers).map(Number).filter((id) => !order.includes(id))];
}

function toCars(msg: StateMessage): OverlayCar[] {
  return Object.entries(msg.drivers).map(([id, d]) => {
    const p = d.telemetry?.position;
    // All-zero position is what GT7 sends outside of a session.
    const onTrack = p && !(p[0] === 0 && p[1] === 0 && p[2] === 0);
    return { id: Number(id), position: onTrack ? [p[0], p[2]] : null };
  });
}

function toStandings(msg: StateMessage): OverlayStanding[] {
  return rankedIds(msg).flatMap((id, i) => {
    const d = msg.drivers[id];
    if (!d) return [];
    // Behind the leader and in the server's order; everyone else has no gap.
    const ranked = i > 0 && i < msg.raceState.order.length;
    return [
      {
        id,
        rank: i + 1,
        connected: d.connected,
        toLeader: gapOrNull(ranked, d.derived?.gapToLeader),
        toAhead: gapOrNull(ranked, d.derived?.gapToAhead),
      },
    ];
  });
}

export const useOverlayStore = create<OverlayStore>()((set) => {
  const open = () => {
    if (!target) return;
    const socket = new WebSocket(target);
    ws = socket;

    socket.onopen = () => {
      retryAttempt = 0;
      set({ status: "connected" });
    };

    socket.onmessage = (e: WebSocketMessageEvent) => {
      if (typeof e.data !== "string") return;
      const now = Date.now();
      if (e.data.startsWith(STATE_PREFIX) && now - lastStateAt < PUBLISH_INTERVAL_MS) return;
      let msg: RosterMessage | StateMessage;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type === "roster") {
        set({ roster: msg.roster });
      } else if (msg.type === "state") {
        lastStateAt = now;
        const standingsDue = now - lastStandingsAt >= STANDINGS_INTERVAL_MS;
        if (standingsDue) lastStandingsAt = now;
        set({
          trackId: msg.raceState.trackId,
          mode: msg.raceState.mode,
          cars: toCars(msg),
          ...(standingsDue ? { standings: toStandings(msg) } : null),
        });
      }
    };

    // RN usually fires onerror then onclose; whichever comes first handles
    // the drop and detaches the socket so the other is a no-op.
    socket.onerror = () => onDrop(socket);
    socket.onclose = () => onDrop(socket);
  };

  const onDrop = (socket: WebSocket) => {
    if (ws !== socket) return;
    detach(socket);
    ws = null;
    if (!target) {
      set({ status: "idle" });
      return;
    }
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** retryAttempt, RECONNECT_MAX_MS);
    retryAttempt += 1;
    set({ status: "reconnecting" });
    retryHandle = setTimeout(() => {
      retryHandle = null;
      open();
    }, delay);
  };

  return {
    status: "idle",
    roster: [],
    trackId: null,
    mode: null,
    cars: [],
    standings: [],

    connect: (url) => {
      const sameTarget = target === url;
      target = url;
      if (sameTarget && ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
      }
      if (ws) detach(ws);
      ws = null;
      // An explicit connect (e.g. app back in the foreground) skips any
      // pending backoff and tries right away.
      clearRetryTimer();
      retryAttempt = 0;
      set({ status: "connecting" });
      open();
    },

    disconnect: () => {
      target = null;
      clearRetryTimer();
      retryAttempt = 0;
      // Handlers are detached first so the close isn't treated as a drop.
      if (ws) detach(ws);
      ws = null;
      lastStateAt = 0;
      lastStandingsAt = 0;
      set({ status: "idle", roster: [], trackId: null, mode: null, cars: [], standings: [] });
    },
  };
});
