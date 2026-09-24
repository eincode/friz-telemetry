import { useConsoleConnectionStore } from "@/store/consoleConnectionStore";
import { useTelemetryServerStore } from "@/store/telemetryServerStore";
import { Buffer } from "buffer";
import { parseServerPacket } from "./parseServerPacket";

let unsubscribe: (() => void) | null = null;

/**
 * Wires the console (UDP) telemetry stream directly to the server WS store.
 * Uses store.subscribe (not a React hook) so this can run at up to 60Hz
 * without triggering component re-renders — this module has no UI.
 *
 * Message schema is a placeholder (raw GT7Telemetry) until the real
 * server contract is decided.
 */
export function startTelemetryBridge() {
  if (unsubscribe) {
    return; // already running
  }

  unsubscribe = useConsoleConnectionStore.subscribe((state, prevState) => {
    const telemetry = state.rawTelemetry;

    if (!telemetry || telemetry === prevState.rawTelemetry) {
      return;
    }

    forwardTelemetry(telemetry);
  });
}

export function stopTelemetryBridge() {
  unsubscribe?.();
  unsubscribe = null;
}

function forwardTelemetry(telemetry: Buffer) {
  // sendIfOpen no-ops (drops) if the WS isn't OPEN — no queueing, no retry,
  // per the "freshest data or nothing" decision.
  useTelemetryServerStore
    .getState()
    .sendIfOpen(JSON.stringify(parseServerPacket(telemetry)));
}
