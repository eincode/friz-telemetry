import { GT7Telemetry } from "./types";

// Live delta vs the previous lap, via path projection: every lap is recorded
// as a polyline of XZ world positions stamped with lap-elapsed time. While
// driving, the car is projected onto the previous lap's polyline and the
// reference time at that point is interpolated.

/** GT7 sends at 60 Hz; used to derive elapsed time on packets without currentLap. */
const PACKET_MS = 1000 / 60;
/** Drop gaps bigger than this (pause, menu) instead of counting them as lap time. */
const MAX_PACKET_GAP = 30;
/** Minimum spacing between recorded samples, in metres. */
const MIN_SAMPLE_SPACING_M = 0.5;
/** Local search window around the cursor, in samples. */
const SEARCH_BACK = 20;
const SEARCH_AHEAD = 240;
/** Beyond this distance from the reference line the match is considered lost. */
const MAX_MATCH_DIST_M = 30;
/** A reference needs at least this many samples to be usable. */
const MIN_REF_SAMPLES = 50;
/**
 * A lap's clock counts as started once currentLap ticks into (0, this).
 * The upper bound ignores a stale previous-lap value lingering for a packet
 * or two after lapCount increments.
 */
const CLOCK_START_MAX_MS = 5000;

// flags1 bit. Only used to stop the packet-count fallback clock; the on-track
// and loading bits proved unreliable as gates (deltas never appeared).
const FLAG_PAUSED = 1 << 1;

interface Trace {
  x: number[];
  z: number[];
  t: number[];
}

const emptyTrace = (): Trace => ({ x: [], z: [], t: [] });

// TEMP diagnostics for on-track debugging; remove once the delta is verified.
const DEBUG = __DEV__;
let lastStatusLog = 0;
let loggedFirstPacket = false;
function log(msg: string) {
  if (DEBUG) console.log(`[lapDelta] ${msg}`);
}

export class LapDeltaTracker {
  private reference: Trace | null = null;
  private current: Trace = emptyTrace();
  /** True only when `current` started at a lap boundary, so it is a full lap. */
  private currentIsFullLap = false;
  /** False until the lap timer ticks; skips the rolling-start run-up to the line. */
  private clockStarted = false;
  private lapCount: number | null = null;
  private lastPacketId: number | null = null;
  private elapsedMs = 0;
  private cursor = 0;
  private lastDistSq = Infinity;

  reset(reason = "manual") {
    if (this.lapCount !== null || this.reference) log(`reset: ${reason}`);
    this.reference = null;
    this.current = emptyTrace();
    this.currentIsFullLap = false;
    this.lapCount = null;
    this.lastPacketId = null;
    this.elapsedMs = 0;
    this.cursor = 0;
  }

  /** Feed one packet; returns ms ahead (−) / behind (+) the previous lap, or null. */
  feed(t: GT7Telemetry): number | null {
    if (!loggedFirstPacket) {
      loggedFirstPacket = true;
      log(`first packet: lapCount=${t.lapCount} flags1=${t.flags1} currentLap=${t.currentLap} packetId=${t.packetId}`);
    }
    const paused = (t.flags1 & FLAG_PAUSED) !== 0;

    const packetGap = this.lastPacketId === null ? 0 : t.packetId - this.lastPacketId;
    this.lastPacketId = t.packetId;

    // Restart / rewind / new session: lap count went backwards.
    if (this.lapCount !== null && t.lapCount < this.lapCount) {
      this.reset(`lap count went backwards ${this.lapCount} -> ${t.lapCount}`);
      this.lastPacketId = t.packetId;
    }

    if (this.lapCount === null) {
      // Joined mid-lap: record, but never promote this partial lap to reference.
      log(`joined mid-lap at lapCount=${t.lapCount}, flags1=${t.flags1}, currentLap=${t.currentLap}`);
      this.lapCount = t.lapCount;
      this.startLap(false);
    } else if (t.lapCount > this.lapCount) {
      log(
        `lap ${this.lapCount} -> ${t.lapCount}: samples=${this.current.t.length}, ` +
          `full=${this.currentIsFullLap}, lastT=${this.current.t[this.current.t.length - 1]?.toFixed(0)}`,
      );
      this.finishLap(t.lapCount - this.lapCount === 1);
      log(`reference: ${this.reference ? `${this.reference.t.length} samples` : "none"}`);
      this.lapCount = t.lapCount;
      this.startLap(true);
    }

    if (!this.clockStarted) {
      // Without currentLap there is no way to tell, so start right away.
      if (t.currentLap === undefined || (t.currentLap > 0 && t.currentLap < CLOCK_START_MAX_MS)) {
        this.clockStarted = true;
        log(`lap ${t.lapCount} clock started at currentLap=${t.currentLap}`);
      } else {
        return null;
      }
    }

    // Elapsed time: prefer the game's own counter (it stops while paused),
    // fall back to packet counting.
    if (t.currentLap !== undefined && t.currentLap >= 0) {
      this.elapsedMs = t.currentLap;
    } else if (!paused && packetGap > 0 && packetGap <= MAX_PACKET_GAP) {
      this.elapsedMs += packetGap * PACKET_MS;
    }

    const x = t.position.x;
    const z = t.position.z;
    this.record(x, z, this.elapsedMs);

    const refMs = this.referenceTimeAt(x, z);
    const delta = refMs === null ? null : this.elapsedMs - refMs;

    const now = Date.now();
    if (DEBUG && now - lastStatusLog > 2000) {
      lastStatusLog = now;
      log(
        `lap=${t.lapCount} flags1=${t.flags1} elapsed=${this.elapsedMs.toFixed(0)} ` +
          `samples=${this.current.t.length} ref=${this.reference?.t.length ?? "none"} cursor=${this.cursor} ` +
          `matchDist=${Math.sqrt(this.lastDistSq).toFixed(1)}m delta=${delta?.toFixed(0) ?? "null"}`,
      );
    }
    return delta;
  }

  private startLap(isFullLap: boolean) {
    this.current = emptyTrace();
    this.currentIsFullLap = isFullLap;
    // Partial laps are never promoted, so there is nothing to gate.
    this.clockStarted = !isFullLap;
    this.elapsedMs = 0;
    this.cursor = 0;
  }

  private finishLap(consecutive: boolean) {
    if (this.currentIsFullLap && consecutive && this.current.t.length >= MIN_REF_SAMPLES) {
      this.reference = this.current;
    }
  }

  private record(x: number, z: number, ms: number) {
    const c = this.current;
    const n = c.t.length;
    if (n > 0) {
      const dx = x - c.x[n - 1];
      const dz = z - c.z[n - 1];
      if (dx * dx + dz * dz < MIN_SAMPLE_SPACING_M * MIN_SAMPLE_SPACING_M) return;
    }
    c.x.push(x);
    c.z.push(z);
    c.t.push(ms);
  }

  private referenceTimeAt(x: number, z: number): number | null {
    const ref = this.reference;
    if (!ref) return null;
    const segCount = ref.t.length - 1;

    // Search forward from the cursor first. Starting at 0 each lap keeps the
    // start/finish region from matching the end of the reference lap.
    let best = this.nearestSegment(
      ref,
      x,
      z,
      Math.max(0, this.cursor - SEARCH_BACK),
      Math.min(segCount, this.cursor + SEARCH_AHEAD),
    );
    if (best.distSq > MAX_MATCH_DIST_M * MAX_MATCH_DIST_M) {
      // Lost (spin, cut, big jump) — fall back to a full scan.
      best = this.nearestSegment(ref, x, z, 0, segCount);
      this.lastDistSq = best.distSq;
      if (best.distSq > MAX_MATCH_DIST_M * MAX_MATCH_DIST_M) return null;
    }

    this.lastDistSq = best.distSq;
    this.cursor = best.index;
    const i = best.index;
    return ref.t[i] + (ref.t[i + 1] - ref.t[i]) * best.u;
  }

  /** Nearest segment [i, i+1] in [from, to) to point (x, z), with projection param u ∈ [0, 1]. */
  private nearestSegment(ref: Trace, x: number, z: number, from: number, to: number) {
    let index = from;
    let u = 0;
    let distSq = Infinity;
    for (let i = from; i < to; i++) {
      const ax = ref.x[i];
      const az = ref.z[i];
      const sx = ref.x[i + 1] - ax;
      const sz = ref.z[i + 1] - az;
      const lenSq = sx * sx + sz * sz;
      let p = lenSq > 0 ? ((x - ax) * sx + (z - az) * sz) / lenSq : 0;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      const dx = ax + sx * p - x;
      const dz = az + sz * p - z;
      const d = dx * dx + dz * dz;
      if (d < distSq) {
        distSq = d;
        index = i;
        u = p;
      }
    }
    return { index, u, distSq };
  }
}
