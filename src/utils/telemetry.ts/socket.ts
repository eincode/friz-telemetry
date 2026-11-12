import {
  HEARTBEAT_BYTE,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_PORT,
  TELEMETRY_PORT,
} from "@/constants/telemetry";
import { Buffer } from "buffer";
import type { Socket } from "react-native-udp";
import dgram from "react-native-udp";
import { decryptPacket } from "./decode";
import { parseTelemetry } from "./parse";
import { getSubnetBroadcastAddress } from "./subnetBroadcast";
import { GT7Telemetry } from "./types";
import { detectVersion } from "./version";

export type OnTelemetry = (data: GT7Telemetry) => void;
/** The original encrypted datagram, called only for packets that decrypted and parsed. */
export type OnRawTelemetry = (encrypted: Uint8Array) => void;
export type OnError = (err: Error) => void;
export type OnDiscover = (ip: string) => void;

const BROADCAST_ADDR = "255.255.255.255";

// Small buffer to let the OS fully release the discovery socket's port
// before the telemetry socket binds to the same port. Native `close()` on
// react-native-udp completes async, and rebinding too eagerly risks a
// transient EADDRINUSE or the OS handing the first telemetry reply to the
// wrong (dying) socket.
const PORT_RELEASE_DELAY_MS = 150;

/**
 * Packets that reach JS later than this after the OS received them are
 * dropped unprocessed. If the JS thread falls behind (slow phone, heavy
 * screen), packets wait in a queue; processing old ones only shows old data
 * and keeps the queue from ever draining, so the lag grows without bound.
 * Skipping them lets it catch up to the live stream right away.
 */
const STALE_PACKET_MS = 100;

let droppedStale = 0;
let lastDropLogAt = 0;

/** True when a packet waited too long to be worth processing. */
function isStale(receivedAt: number | undefined): boolean {
  if (!receivedAt) return false;
  if (Date.now() - receivedAt <= STALE_PACKET_MS) return false;
  droppedStale++;
  if (__DEV__ && Date.now() - lastDropLogAt > 2000) {
    lastDropLogAt = Date.now();
    console.warn(`GT7: JS thread behind, dropped ${droppedStale} stale packets so far`);
  }
  return true;
}

export interface GT7Connection {
  start: () => void;
  getLockedIp: () => string | null;
  close: () => void;
}

function handleIncomingPacket(
  msg: Uint8Array,
  onTelemetry: OnTelemetry,
  onRawTelemetry: OnRawTelemetry,
  onError?: OnError,
) {
  const version = detectVersion(msg.length);
  if (!version) return;

  const plaintext = decryptPacket(msg, version);
  if (!plaintext) return;

  try {
    const telemetry = parseTelemetry(plaintext);
    onTelemetry(telemetry);
    onRawTelemetry(msg);
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}

export function startGT7Discovery(
  onTelemetry: OnTelemetry,
  onRawTelemetry: OnRawTelemetry,
  onDiscover?: OnDiscover,
  onError?: OnError,
): GT7Connection {
  let closed = false;
  let startRequested = false;
  let discoveryStarted = false;

  let lockedIp: string | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // Tracked at this outer scope so close() can tear down whichever socket
  // happens to be active, regardless of which phase we're in.
  let discoverySock: Socket | null = null;
  let telemetrySock: Socket | null = null;

  const sendOn = (
    sock: Socket,
    targetIp: string,
    byte: number = HEARTBEAT_BYTE.C,
  ) => {
    if (closed) return;
    const buf = Buffer.from([byte]);
    sock.send(buf, 0, buf.length, HEARTBEAT_PORT, targetIp, (err?: Error) => {
      if (closed) return;
      if (err) console.warn("GT7 heartbeat send error:", err);
    });
  };

  // --- Phase 2: telemetry socket — unicast only, NEVER calls setBroadcast.
  // This mirrors the proven-working "hardcoded IP" path exactly.
  const startTelemetrySocket = (ip: string) => {
    if (closed) return;

    const sock: Socket = dgram.createSocket({ type: "udp4" });
    telemetrySock = sock;

    sock.on("error", (err: Error) => {
      if (closed) return;
      onError?.(err);
    });

    sock.on("message", (msg: Uint8Array, rinfo) => {
      if (closed || isStale(rinfo.ts)) return;
      handleIncomingPacket(msg, onTelemetry, onRawTelemetry, onError);
    });

    sock.bind(TELEMETRY_PORT, "0.0.0.0", () => {
      if (closed) return;
      sendOn(sock, ip);
      heartbeatTimer = setInterval(() => {
        if (closed) return;
        sendOn(sock, ip);
      }, HEARTBEAT_INTERVAL_MS);
    });
  };

  // --- Phase 1: short-lived discovery socket — broadcast only, closed
  // immediately after the first reply so it never lingers in a
  // broadcast-tainted state.
  const runDiscovery = () => {
    if (discoveryStarted || closed) return;
    discoveryStarted = true;

    const sock: Socket = dgram.createSocket({ type: "udp4" });
    discoverySock = sock;
    let discoveryDone = false;

    const finishDiscovery = (ip: string, firstPacket: Uint8Array) => {
      if (discoveryDone) return;
      discoveryDone = true;

      lockedIp = ip;
      onDiscover?.(ip);

      sock.close(() => {
        discoverySock = null;
        if (closed) return;
        // The first reply is already valid telemetry — use it immediately
        // rather than discarding it.
        handleIncomingPacket(firstPacket, onTelemetry, onRawTelemetry, onError);
        setTimeout(() => startTelemetrySocket(ip), PORT_RELEASE_DELAY_MS);
      });
    };

    sock.on("error", (err: Error) => {
      if (closed || discoveryDone) return;
      onError?.(err);
    });

    sock.on("message", (msg: Uint8Array, rinfo) => {
      if (closed || discoveryDone) return;
      finishDiscovery(rinfo.address, msg);
    });

    sock.bind(TELEMETRY_PORT, "0.0.0.0", () => {
      if (closed) return;
      try {
        sock.setBroadcast(true);
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      getSubnetBroadcastAddress().then((addr) => {
        sendOn(sock, addr ?? BROADCAST_ADDR); // fall back to limited broadcast if IP lookup fails
      });
    });
  };

  return {
    start: () => {
      if (startRequested) return;
      startRequested = true;
      runDiscovery();
    },
    getLockedIp: () => lockedIp,
    close: () => {
      closed = true;
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      discoverySock?.close();
      discoverySock = null;
      telemetrySock?.close();
      telemetrySock = null;
    },
  };
}
