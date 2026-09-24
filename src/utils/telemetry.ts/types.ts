// src/gt7/types.ts

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GT7Telemetry {
  position: Vec3;
  worldVelocity: Vec3;
  rotation: Vec3;
  orientationRelativeToNorth: number;
  angularVelocity: Vec3;
  bodyHeight: number;
  engineRpm: number;
  fuelLevel: number;
  fuelCapacity: number;
  speed: number;
  boost: number;
  oilPressure: number;
  waterTemp: number;
  oilTemp: number;
  tyreTemp: [number, number, number, number]; // FL, FR, RL, RR
  packetId: number;
  lapCount: number;
  totalLaps: number;
  bestLapTimeMs: number;
  lastLapTimeMs: number;
  dayProgressionMs: number;
  raceStartPosition: number;
  preRaceCarCount: number;
  minAlertRpm: number;
  maxAlertRpm: number;
  calculatedMaxSpeed: number;
  flags1: number;
  flags2: number;
  currentGear: number;
  suggestedGear: number;
  throttle: number; // 0-100 %
  brake: number; // 0-100 %
  roadPlane: Vec3;
  roadPlaneDistance: number;
  wheelRpm: [number, number, number, number];
  tyreRadius: [number, number, number, number];
  suspensionHeight: [number, number, number, number];
  clutch: number;
  clutchEngagement: number;
  rpmFromClutchToGearbox: number;
  transmissionTopSpeed: number;
  gearRatios: number[]; // up to 8, trailing zeros trimmed
  carCode: number;

  // Version-dependent tail fields — undefined when packet is too short.
  wheelRotation?: number;
  steeringAngularVelocity?: number;
  sway?: number;
  heave?: number;
  surge?: number;
  throttleFiltered?: number;
  brakeFiltered?: number;
  torqueVectors?: [number, number, number, number];
  energyRecovery?: number;
  surfaceType?: string;
  currentLap?: number;
  wheelSteeringAngle?: [number, number];
  wheelBase?: number;
  carCategory?: string;
}
