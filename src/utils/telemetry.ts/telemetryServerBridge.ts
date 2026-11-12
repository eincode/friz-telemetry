import { subscribeRawTelemetry } from "@/store/consoleConnectionStore";
import { useTelemetryServerStore } from "@/store/telemetryServerStore";

let unsubscribe: (() => void) | null = null;

/**
 * Shortest gap between two sends. GT7 sends ~60 packets/s (~17 ms apart), so
 * this forwards every third one, ~20 Hz. A WebSocket never drops anything:
 * on a weak connection every message waits its turn and the server falls
 * behind, so sending a third as many keeps that backlog from building. The
 * gap sits between two and three packet intervals (33 / 50 ms) so arrival
 * jitter doesn't knock the rate down to every fourth packet.
 */
const MIN_SEND_GAP_MS = 42;
let lastSentAt = 0;

/**
 * Wires the console (UDP) telemetry stream directly to the server WS store.
 * Listens to the raw packets (not the UI store) and forwards at most every
 * MIN_SEND_GAP_MS, always the newest packet, without triggering component
 * re-renders — this module has no UI.
 *
 * Each packet goes out as one binary frame holding the encrypted datagram
 * exactly as the PS5 sent it (296–368 bytes); the server decrypts and parses
 * it.
 */
export function startTelemetryBridge() {
  if (unsubscribe) {
    return; // already running
  }

  unsubscribe = subscribeRawTelemetry(forwardTelemetry);
}

export function stopTelemetryBridge() {
  unsubscribe?.();
  unsubscribe = null;
}

function forwardTelemetry(encrypted: Uint8Array) {
  const now = Date.now();
  if (now - lastSentAt < MIN_SEND_GAP_MS) return;
  lastSentAt = now;
  // sendIfOpen no-ops (drops) if the WS isn't OPEN — no queueing, no retry,
  // per the "freshest data or nothing" decision.
  useTelemetryServerStore.getState().sendIfOpen(encrypted);
}
