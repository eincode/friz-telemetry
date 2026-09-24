import { Buffer } from "buffer";
import { GT7Telemetry, Vec3 } from "./types";

function readVec3(buf: Buffer, offset: number): Vec3 {
  return {
    x: buf.readFloatLE(offset),
    y: buf.readFloatLE(offset + 4),
    z: buf.readFloatLE(offset + 8),
  };
}

function readFloat4(
  buf: Buffer,
  offset: number,
): [number, number, number, number] {
  return [
    buf.readFloatLE(offset),
    buf.readFloatLE(offset + 4),
    buf.readFloatLE(offset + 8),
    buf.readFloatLE(offset + 12),
  ];
}

function readAscii(buf: Buffer, offset: number, length: number): string {
  return buf.toString("ascii", offset, offset + length).replace(/\0+$/, "");
}

export function parseTelemetry(buf: Buffer): GT7Telemetry {
  const gearsByte = buf.readUInt8(0x90);

  const telemetry: GT7Telemetry = {
    position: readVec3(buf, 0x04),
    worldVelocity: readVec3(buf, 0x10),
    rotation: readVec3(buf, 0x1c),
    orientationRelativeToNorth: buf.readFloatLE(0x28),
    angularVelocity: readVec3(buf, 0x2c),
    bodyHeight: buf.readFloatLE(0x38),
    engineRpm: buf.readFloatLE(0x3c),
    fuelLevel: buf.readFloatLE(0x44),
    fuelCapacity: buf.readFloatLE(0x48),
    speed: buf.readFloatLE(0x4c),
    boost: buf.readFloatLE(0x50),
    oilPressure: buf.readFloatLE(0x54),
    waterTemp: buf.readFloatLE(0x58),
    oilTemp: buf.readFloatLE(0x5c),
    tyreTemp: readFloat4(buf, 0x60),
    packetId: buf.readInt32LE(0x70),
    lapCount: buf.readInt16LE(0x74),
    totalLaps: buf.readInt16LE(0x76),
    bestLapTimeMs: buf.readInt32LE(0x78),
    lastLapTimeMs: buf.readInt32LE(0x7c),
    dayProgressionMs: buf.readInt32LE(0x80),
    raceStartPosition: buf.readInt16LE(0x84),
    preRaceCarCount: buf.readInt16LE(0x86),
    minAlertRpm: buf.readInt16LE(0x88),
    maxAlertRpm: buf.readInt16LE(0x8a),
    calculatedMaxSpeed: buf.readInt16LE(0x8c),
    flags1: buf.readUInt8(0x8e),
    flags2: buf.readUInt8(0x8f),
    currentGear: gearsByte & 0x0f,
    suggestedGear: (gearsByte >> 4) & 0x0f,
    throttle: buf.readUInt8(0x91) / 2.55,
    brake: buf.readUInt8(0x92) / 2.55,
    roadPlane: readVec3(buf, 0x94),
    roadPlaneDistance: buf.readFloatLE(0xa0),
    wheelRpm: readFloat4(buf, 0xa4),
    tyreRadius: readFloat4(buf, 0xb4),
    suspensionHeight: readFloat4(buf, 0xc4),
    clutch: buf.readFloatLE(0xf4),
    clutchEngagement: buf.readFloatLE(0xf8),
    rpmFromClutchToGearbox: buf.readFloatLE(0xfc),
    transmissionTopSpeed: buf.readFloatLE(0x100),
    gearRatios: Array.from({ length: 8 }, (_, i) =>
      buf.readFloatLE(0x104 + i * 4),
    ),
    carCode: buf.readInt32LE(0x124),
  };

  // Version-dependent tail: only present when packet is >= 316 bytes (B+).
  if (buf.length >= 0x138 + 4) {
    telemetry.wheelRotation = buf.readFloatLE(0x128);
    telemetry.steeringAngularVelocity = buf.readFloatLE(0x12c);
    telemetry.sway = buf.readFloatLE(0x130);
    telemetry.heave = buf.readFloatLE(0x134);
    telemetry.surge = buf.readFloatLE(0x138);
  }

  // ~+ fields: present when packet is >= 344 bytes (TILDE/C).
  if (buf.length >= 0x158 + 4) {
    telemetry.throttleFiltered = buf.readUInt8(0x13c);
    telemetry.brakeFiltered = buf.readUInt8(0x13d);
    telemetry.torqueVectors = readFloat4(buf, 0x140);
    telemetry.energyRecovery = buf.readFloatLE(0x150);
    telemetry.surfaceType = readAscii(buf, 0x158, 4);
  }

  // C-only fields: present when packet is 368 bytes.
  if (buf.length >= 0x16c + 4) {
    telemetry.currentLap = buf.readInt32LE(0x15c);
    telemetry.wheelSteeringAngle = [
      buf.readFloatLE(0x160),
      buf.readFloatLE(0x164),
    ];
    telemetry.wheelBase = buf.readFloatLE(0x168);
    telemetry.carCategory = readAscii(buf, 0x16c, 4);
  }

  return telemetry;
}
