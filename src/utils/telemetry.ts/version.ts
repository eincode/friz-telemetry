import { PACKET_SIZE } from "@/constants/telemetry";
import { PacketVersion } from "./decode";

export function detectVersion(byteLength: number): PacketVersion | null {
  switch (byteLength) {
    case PACKET_SIZE.A:
      return "A";
    case PACKET_SIZE.B:
      return "B";
    case PACKET_SIZE.TILDE:
      return "TILDE";
    case PACKET_SIZE.C:
      return "C";
    default:
      return null; // unrecognized size — not a GT7 packet, or a version we don't know
  }
}
