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

// Full packet to send to server
export interface ServerDriverPacket {
  // PacketA
  magic: number;
  position: [number, number, number];
  worldVelocity: [number, number, number];
  rotation: [number, number, number];
  orientationRelativeToNorth: number;
  angularVelocity: [number, number, number];
  bodyHeight: number;
  EngineRPM: number;
  iv: [number, number, number, number];
  fuelLevel: number;
  fuelCapacity: number;
  speed: number;
  boost: number;
  oilPressure: number;
  waterTemp: number;
  oilTemp: number;
  tyreTemp: [number, number, number, number];
  packetId: number;
  lapCount: number;
  totalLaps: number;
  bestLaptime: number;
  lastLaptime: number;
  dayProgression: number;
  RaceStartPosition: number;
  preRaceNumCars: number;
  minAlertRPM: number;
  maxAlertRPM: number;
  calcMaxSpeed: number;
  flags: number;
  gears: number;
  throttle: number;
  brake: number;
  roadPlane: [number, number, number];
  roadPlaneDistance: number;
  wheelRPS: [number, number, number, number];
  tyreRadius: [number, number, number, number];
  suspHeight: [number, number, number, number];
  clutch: number;
  clutchEngagement: number;
  RPMFromClutchToGearbox: number;
  transmissionTopSpeed: number;
  gearRatios: [number, number, number, number, number, number, number, number];
  carCode: number;
  // PacketB
  wheelRotation?: number;
  steeringAngularVelocity?: number;
  sway?: number;
  heave?: number;
  surge?: number;
  // PacketTilda
  throttleFiltered?: number;
  brakeFiltered?: number;
  torqueVectors?: [number, number, number, number];
  energyRecovery?: number;
  // PacketC
  surfaceType?: string;
  currentLap?: number;
  wheelSteeringAngle?: [number, number];
  wheelBase?: number;
  carCategory?: string;
}
