import { MAGIC, SALSA_KEY } from "@/constants/telemetry";
import { Buffer } from "buffer";
import { Salsa20 } from "./salsa20";

// Key is a fixed 32-byte ASCII string, null-padded.
const KEY_BUFFER = Buffer.alloc(32);
Buffer.from(SALSA_KEY, "ascii").copy(KEY_BUFFER);

const IV_MASK = {
  A: 0xdeadbeaf,
  B: 0xdeadbeef,
  C: 0xdeadbeef,
  TILDE: 0x55fabb4f,
} as const;

export type PacketVersion = keyof typeof IV_MASK;

export function decryptPacket(
  raw: Uint8Array,
  version: PacketVersion,
): Buffer | null {
  const buf = Buffer.from(raw);

  // iv1 = 32-bit LE int at offset 0x40, read from the RAW/encrypted
  // buffer — it sits inside the ciphertext, so must be read pre-decrypt.
  const iv1 = buf.readUInt32LE(0x40);
  const iv2 = (iv1 ^ IV_MASK[version]) >>> 0; // unsigned

  const iv = Buffer.alloc(8);
  iv.writeUInt32LE(iv2, 0);
  iv.writeUInt32LE(iv1, 4);

  // Generate a keystream of the same length as the packet, then XOR.
  const cipher = new Salsa20(KEY_BUFFER, iv);
  const keystream = cipher.getBytes(buf.length);

  const plaintext = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) {
    plaintext[i] = buf[i] ^ keystream[i];
  }

  // Validate magic "G7S0" at offset 0x00.
  if (plaintext.readUInt32LE(0x00) !== MAGIC) {
    return null; // wrong key, wrong version, or not a GT7 packet
  }

  return plaintext;
}
