// src/gt7/parseServerPacket.ts

import { ServerDriverPacket } from "@/constants/telemetry";
import { Buffer } from "buffer";

/** Decimal places floats are rounded to before sending. */
const FLOAT_DECIMALS = 3;
const FLOAT_SCALE = 10 ** FLOAT_DECIMALS;

/**
 * A float32 read rounded to FLOAT_DECIMALS (millimetres for positions).
 * Unrounded, JSON spells each float32 out to ~17 digits
 * ("123.45600128173828"), which made every packet ~2 KB; on a weak
 * connection that much upload backs up behind the WebSocket and the server
 * falls seconds behind.
 */
function readFloat(buf: Buffer, offset: number): number {
  return Math.round(buf.readFloatLE(offset) * FLOAT_SCALE) / FLOAT_SCALE;
}

function readVec3(buf: Buffer, offset: number): [number, number, number] {
  return [
    readFloat(buf, offset),
    readFloat(buf, offset + 4),
    readFloat(buf, offset + 8),
  ];
}

function readFloat4(
  buf: Buffer,
  offset: number,
): [number, number, number, number] {
  return [
    readFloat(buf, offset),
    readFloat(buf, offset + 4),
    readFloat(buf, offset + 8),
    readFloat(buf, offset + 12),
  ];
}

function readAscii(buf: Buffer, offset: number, length: number): string {
  return buf.toString("ascii", offset, offset + length).replace(/\0+$/, "");
}

export function parseServerPacket(buf: Buffer): ServerDriverPacket {
  // iv: the 4 raw individual bytes of the iv1 field at 0x40, as they
  // appear on the wire (pre-XOR). ASSUMPTION — confirm against server spec.
  const iv: [number, number, number, number] = [
    buf.readUInt8(0x40),
    buf.readUInt8(0x41),
    buf.readUInt8(0x42),
    buf.readUInt8(0x43),
  ];

  const flags1 = buf.readUInt8(0x8e);
  const flags2 = buf.readUInt8(0x8f);
  // Combined into one 16-bit value. ASSUMPTION — confirm packing scheme.
  const flags = flags1 | (flags2 << 8);

  const packet: ServerDriverPacket = {
    magic: buf.readUInt32LE(0x00),
    position: readVec3(buf, 0x04),
    worldVelocity: readVec3(buf, 0x10),
    rotation: readVec3(buf, 0x1c),
    orientationRelativeToNorth: readFloat(buf, 0x28),
    angularVelocity: readVec3(buf, 0x2c),
    bodyHeight: readFloat(buf, 0x38),
    EngineRPM: readFloat(buf, 0x3c),
    iv,
    fuelLevel: readFloat(buf, 0x44),
    fuelCapacity: readFloat(buf, 0x48),
    speed: readFloat(buf, 0x4c),
    boost: readFloat(buf, 0x50),
    oilPressure: readFloat(buf, 0x54),
    waterTemp: readFloat(buf, 0x58),
    oilTemp: readFloat(buf, 0x5c),
    tyreTemp: readFloat4(buf, 0x60),
    packetId: buf.readInt32LE(0x70),
    lapCount: buf.readInt16LE(0x74),
    totalLaps: buf.readInt16LE(0x76),
    bestLaptime: buf.readInt32LE(0x78),
    lastLaptime: buf.readInt32LE(0x7c),
    dayProgression: buf.readInt32LE(0x80),
    RaceStartPosition: buf.readInt16LE(0x84),
    preRaceNumCars: buf.readInt16LE(0x86),
    minAlertRPM: buf.readInt16LE(0x88),
    maxAlertRPM: buf.readInt16LE(0x8a),
    calcMaxSpeed: buf.readInt16LE(0x8c),
    flags,
    gears: buf.readUInt8(0x90), // raw byte, both nibbles — server splits if needed
    throttle: buf.readUInt8(0x91), // raw 0-255, not percent
    brake: buf.readUInt8(0x92), // raw 0-255, not percent
    roadPlane: readVec3(buf, 0x94),
    roadPlaneDistance: readFloat(buf, 0xa0),
    wheelRPS: readFloat4(buf, 0xa4),
    tyreRadius: readFloat4(buf, 0xb4),
    suspHeight: readFloat4(buf, 0xc4),
    clutch: readFloat(buf, 0xf4),
    clutchEngagement: readFloat(buf, 0xf8),
    RPMFromClutchToGearbox: readFloat(buf, 0xfc),
    transmissionTopSpeed: readFloat(buf, 0x100),
    gearRatios: [
      readFloat(buf, 0x104),
      readFloat(buf, 0x108),
      readFloat(buf, 0x10c),
      readFloat(buf, 0x110),
      readFloat(buf, 0x114),
      readFloat(buf, 0x118),
      readFloat(buf, 0x11c),
      readFloat(buf, 0x120),
    ],
    carCode: buf.readInt32LE(0x124),
  };

  // PacketB+ tail (>= 316 bytes)
  if (buf.length >= 0x138 + 4) {
    packet.wheelRotation = readFloat(buf, 0x128);
    packet.steeringAngularVelocity = readFloat(buf, 0x12c);
    packet.sway = readFloat(buf, 0x130);
    packet.heave = readFloat(buf, 0x134);
    packet.surge = readFloat(buf, 0x138);
  }

  // PacketTilda+ tail (>= 344 bytes)
  if (buf.length >= 0x158 + 4) {
    packet.throttleFiltered = buf.readUInt8(0x13c);
    packet.brakeFiltered = buf.readUInt8(0x13d);
    packet.torqueVectors = readFloat4(buf, 0x140);
    packet.energyRecovery = readFloat(buf, 0x150);
  }

  // PacketC-only tail (368 bytes)
  if (buf.length >= 0x16c + 4) {
    packet.surfaceType = readAscii(buf, 0x158, 4);
    packet.currentLap = buf.readInt32LE(0x15c);
    packet.wheelSteeringAngle = [
      readFloat(buf, 0x160),
      readFloat(buf, 0x164),
    ];
    packet.wheelBase = readFloat(buf, 0x168);
    packet.carCategory = readAscii(buf, 0x16c, 4);
  }

  return packet;
}
