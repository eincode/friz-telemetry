// src/gt7/parseServerPacket.ts

import { ServerDriverPacket } from "@/constants/telemetry";
import { Buffer } from "buffer";

function readVec3(buf: Buffer, offset: number): [number, number, number] {
  return [
    buf.readFloatLE(offset),
    buf.readFloatLE(offset + 4),
    buf.readFloatLE(offset + 8),
  ];
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
    orientationRelativeToNorth: buf.readFloatLE(0x28),
    angularVelocity: readVec3(buf, 0x2c),
    bodyHeight: buf.readFloatLE(0x38),
    EngineRPM: buf.readFloatLE(0x3c),
    iv,
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
    roadPlaneDistance: buf.readFloatLE(0xa0),
    wheelRPS: readFloat4(buf, 0xa4),
    tyreRadius: readFloat4(buf, 0xb4),
    suspHeight: readFloat4(buf, 0xc4),
    clutch: buf.readFloatLE(0xf4),
    clutchEngagement: buf.readFloatLE(0xf8),
    RPMFromClutchToGearbox: buf.readFloatLE(0xfc),
    transmissionTopSpeed: buf.readFloatLE(0x100),
    gearRatios: [
      buf.readFloatLE(0x104),
      buf.readFloatLE(0x108),
      buf.readFloatLE(0x10c),
      buf.readFloatLE(0x110),
      buf.readFloatLE(0x114),
      buf.readFloatLE(0x118),
      buf.readFloatLE(0x11c),
      buf.readFloatLE(0x120),
    ],
    carCode: buf.readInt32LE(0x124),
  };

  // PacketB+ tail (>= 316 bytes)
  if (buf.length >= 0x138 + 4) {
    packet.wheelRotation = buf.readFloatLE(0x128);
    packet.steeringAngularVelocity = buf.readFloatLE(0x12c);
    packet.sway = buf.readFloatLE(0x130);
    packet.heave = buf.readFloatLE(0x134);
    packet.surge = buf.readFloatLE(0x138);
  }

  // PacketTilda+ tail (>= 344 bytes)
  if (buf.length >= 0x158 + 4) {
    packet.throttleFiltered = buf.readUInt8(0x13c);
    packet.brakeFiltered = buf.readUInt8(0x13d);
    packet.torqueVectors = readFloat4(buf, 0x140);
    packet.energyRecovery = buf.readFloatLE(0x150);
  }

  // PacketC-only tail (368 bytes)
  if (buf.length >= 0x16c + 4) {
    packet.surfaceType = readAscii(buf, 0x158, 4);
    packet.currentLap = buf.readInt32LE(0x15c);
    packet.wheelSteeringAngle = [
      buf.readFloatLE(0x160),
      buf.readFloatLE(0x164),
    ];
    packet.wheelBase = buf.readFloatLE(0x168);
    packet.carCategory = readAscii(buf, 0x16c, 4);
  }

  return packet;
}
