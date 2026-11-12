export const HEARTBEAT_PORT = 33739;
export const TELEMETRY_PORT = 33740;
export const HEARTBEAT_INTERVAL_MS = 10000;

// Heartbeat bytes per packet version
export const HEARTBEAT_BYTE = {
  A: 0x41, // 'A'
  B: 0x42, // 'B'
  C: 0x43, // 'C'
  TILDE: 0x7e, // '~' — latest packet version
} as const;

// Packet sizes in bytes, used to detect version from datagram length
export const PACKET_SIZE = {
  A: 296,
  B: 316,
  TILDE: 344,
  C: 368,
} as const;

export const MAGIC = 0x47375330; // "G7S0" little-endian

export const SALSA_KEY = "Simulator Interface Packet GT7 ver 0.0";
