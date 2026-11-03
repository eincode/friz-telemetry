import { TrackData, TrackSector } from "./trackMatch";
import { GT7Telemetry } from "./types";

// Live sector times, ported from gt7-telemetry-server's recorder sector tester
// (src/recorder/sector-tester.ts).
//
// Each sector boundary is a finite gate across the track (left edge -> right
// edge). Every packet, the car's movement since the previous packet is
// intersected with the next gate in XZ. A hit going along the track's forward
// direction is a crossing; its exact lap time is interpolated between the two
// packets. A finite gate, unlike an infinite plane, cannot be "crossed" by a
// different part of the track that happens to line up with it.
//
// The last sector has no gate: it is closed with the game's own lap time when
// the lap count goes up.

/** GT7 sends at 60 Hz; used to derive elapsed time on packets without currentLap. */
const PACKET_MS = 1000 / 60;
/** Drop gaps bigger than this (pause, menu) instead of counting them as lap time. */
const MAX_PACKET_GAP = 30;
/** A lastLapTimeMs at or beyond this is treated as junk, like the tester does. */
const MAX_LAP_MS = 600_000;
/**
 * Gates are cut at the tarmac edges (some only ~6 m wide), so a car on a kerb
 * or running wide passes beside them. Each end is stretched by this, in metres.
 */
const GATE_MARGIN_M = 8;

/** Allowed u range along a gate, including GATE_MARGIN_M past each end. */
function gateURange(g: TrackSector): [number, number] {
  const len = Math.hypot(g.right[0] - g.left[0], g.right[1] - g.left[1]);
  const pad = len > 0 ? GATE_MARGIN_M / len : 0;
  return [-pad, 1 + pad];
}

// TEMP diagnostics for missed sector crossings; remove once verified on track.
const DEBUG = __DEV__;
/** Approach logging starts this close to the next gate's midpoint, in metres. */
const DEBUG_ZONE_M = 30;
function log(msg: string) {
  if (DEBUG) console.log(`[sectorTimer] ${msg}`);
}
const f1 = (v: number) => v.toFixed(1);

/** Unclamped line-line parameters: t along the move, u along the gate (0–1 = on it). */
function intersectionParams(ax: number, az: number, bx: number, bz: number, g: TrackSector) {
  const rX = bx - ax;
  const rZ = bz - az;
  const sX = g.right[0] - g.left[0];
  const sZ = g.right[1] - g.left[1];
  const denom = cross2(rX, rZ, sX, sZ);
  if (Math.abs(denom) < 1e-8) return null;
  const caX = g.left[0] - ax;
  const caZ = g.left[1] - az;
  return { t: cross2(caX, caZ, sX, sZ) / denom, u: cross2(caX, caZ, rX, rZ) / denom };
}

export interface SectorTimes {
  /** Sectors in a lap; 0 when no known track is matched. */
  count: number;
  /** Index of the sector being driven. */
  current: number;
  /** Times of the sectors completed so far this lap, ms. */
  lap: number[];
  /** Lap time when the current sector started, ms. */
  sectorStartMs: number;
  /** Sector times of the last full lap, or null. */
  lastLap: number[] | null;
  /** Best time per sector over full laps this session, ms. */
  best: (number | null)[];
}

export const EMPTY_SECTOR_TIMES: SectorTimes = {
  count: 0,
  current: 0,
  lap: [],
  sectorStartMs: 0,
  lastLap: null,
  best: [],
};

function cross2(ax: number, az: number, bx: number, bz: number): number {
  return ax * bz - az * bx;
}

/**
 * Intersects segment AB (car movement) with the sector gate, widened by
 * GATE_MARGIN_M at each end, in XZ. Returns the fraction along AB where they
 * meet, or null if they don't.
 */
function gateIntersection(ax: number, az: number, bx: number, bz: number, g: TrackSector): number | null {
  const p = intersectionParams(ax, az, bx, bz, g);
  if (!p) return null;
  const [uMin, uMax] = gateURange(g);
  if (p.t < 0 || p.t > 1 || p.u < uMin || p.u > uMax) return null;
  return p.t;
}

/** Signed distance from the gate along the track's forward direction. */
function signedDist(x: number, z: number, g: TrackSector): number {
  const px = (g.left[0] + g.right[0]) / 2;
  const pz = (g.left[1] + g.right[1]) / 2;
  return (x - px) * g.normal[0] + (z - pz) * g.normal[1];
}

export class SectorTimer {
  private track: TrackData | null = null;
  private lapCount: number | null = null;
  private current = 0;
  private sectorStartMs = 0;
  private lap: number[] = [];
  private lastLap: number[] | null = null;
  private best: (number | null)[] = [];
  private elapsedMs = 0;
  private lastPacketId: number | null = null;
  private prevX: number | null = null;
  private prevZ = 0;
  private prevMs = 0;
  /** Debug: car is inside DEBUG_ZONE_M of the next gate; closest distance seen. */
  private inZone = false;
  private zoneMinDist = Infinity;

  reset() {
    if (this.track) log(`reset (was ${this.track.id})`);
    this.track = null;
    this.lapCount = null;
    this.lastLap = null;
    this.best = [];
    this.lastPacketId = null;
    this.startLap();
  }

  /** Feed one packet; returns new sector times when they changed, else null. */
  feed(t: GT7Telemetry, track: TrackData | null): SectorTimes | null {
    let changed = false;

    if (track !== this.track) {
      // New or corrected track: its gates and history don't carry over.
      this.reset();
      this.track = track;
      log(`track -> ${track?.id ?? "none"} at lapCount=${t.lapCount} currentLap=${t.currentLap} (${track?.sectors.length ?? 0} gates)`);
      this.best = track ? new Array(track.sectorTimesMs.length).fill(null) : [];
      changed = true;
    }

    const packetGap = this.lastPacketId === null ? 0 : t.packetId - this.lastPacketId;
    this.lastPacketId = t.packetId;

    if (this.lapCount !== null && t.lapCount < this.lapCount) {
      // Restart / rewind: the lap in progress is void.
      log(`lapCount went back ${this.lapCount} -> ${t.lapCount}: lap void`);
      this.startLap();
      changed = true;
    } else if (this.lapCount !== null && t.lapCount > this.lapCount) {
      this.finishLap(t);
      changed = true;
    }
    this.lapCount = t.lapCount;

    // Lap clock: prefer the game's own counter, fall back to packet counting.
    if (t.currentLap !== undefined && t.currentLap >= 0) {
      this.elapsedMs = t.currentLap;
    } else if (packetGap > 0 && packetGap <= MAX_PACKET_GAP) {
      this.elapsedMs += packetGap * PACKET_MS;
    }

    if (this.track && this.checkCrossing(t.position.x, t.position.z)) changed = true;

    this.prevX = t.position.x;
    this.prevZ = t.position.z;
    this.prevMs = this.elapsedMs;
    return changed ? this.snapshot() : null;
  }

  private snapshot(): SectorTimes {
    if (!this.track) return EMPTY_SECTOR_TIMES;
    return {
      count: this.track.sectorTimesMs.length,
      current: this.current,
      lap: this.lap.slice(),
      sectorStartMs: this.sectorStartMs,
      lastLap: this.lastLap,
      best: this.best.slice(),
    };
  }

  private startLap() {
    this.current = 0;
    this.sectorStartMs = 0;
    this.lap = [];
    this.elapsedMs = 0;
    this.prevX = null;
  }

  private finishLap(t: GT7Telemetry) {
    // Close the last sector with the game's lap time.
    if (t.lastLapTimeMs > 0 && t.lastLapTimeMs < MAX_LAP_MS) {
      const lastSectorMs = t.lastLapTimeMs - this.sectorStartMs;
      if (lastSectorMs > 0) this.lap.push(lastSectorMs);
    }
    // Only a lap with every sector timed counts; joining mid-lap, or the track
    // being matched mid-lap, leaves gates unseen.
    log(
      `lap ${this.lapCount} done: lastLapTimeMs=${t.lastLapTimeMs} sectors=[${this.lap.map((v) => v.toFixed(0))}] ` +
        `need ${this.track?.sectorTimesMs.length ?? "?"}`,
    );
    if (this.track && this.lap.length === this.track.sectorTimesMs.length) {
      this.lastLap = this.lap;
      this.best = this.best.map((b, i) => (b === null || this.lap[i] < b ? this.lap[i] : b));
    }
    this.startLap();
  }

  /** Checks the move since the last packet against the next gate. */
  private checkCrossing(x: number, z: number): boolean {
    const gate = this.track!.sectors[this.current];
    if (DEBUG && gate) this.debugApproach(x, z, gate);
    // Past the last gate, or no previous position, or the clock jumped back
    // (stale previous-lap value): nothing to interpolate against.
    if (!gate || this.prevX === null || this.elapsedMs < this.prevMs) return false;

    const f = gateIntersection(this.prevX, this.prevZ, x, z, gate);
    if (f === null) return false;
    // Must cross forwards: behind the gate before, on or past it now.
    if (!(signedDist(this.prevX, this.prevZ, gate) < 0 && signedDist(x, z, gate) >= 0)) return false;

    const crossingMs = this.prevMs + f * (this.elapsedMs - this.prevMs);
    this.lap.push(crossingMs - this.sectorStartMs);
    this.sectorStartMs = crossingMs;
    log(`S${this.current + 1} done at ${crossingMs.toFixed(0)} ms: ${this.lap[this.lap.length - 1].toFixed(0)} ms`);
    this.current++;
    this.inZone = false;
    return true;
  }

  /** Debug: logs the approach to the next gate, and why a pass did not count. */
  private debugApproach(x: number, z: number, gate: TrackSector) {
    const mx = (gate.left[0] + gate.right[0]) / 2;
    const mz = (gate.left[1] + gate.right[1]) / 2;
    const dist = Math.hypot(x - mx, z - mz);
    const name = `gate ${this.current + 1}/${this.track!.sectors.length}`;

    if (dist > DEBUG_ZONE_M) {
      if (this.inZone) log(`${name}: left zone without crossing, closest ${f1(this.zoneMinDist)} m to midpoint`);
      this.inZone = false;
      return;
    }
    if (!this.inZone) {
      this.inZone = true;
      this.zoneMinDist = Infinity;
      log(`${name}: approaching on ${this.track!.id}, lapCount=${this.lapCount} elapsed=${this.elapsedMs.toFixed(0)} ms`);
    }
    this.zoneMinDist = Math.min(this.zoneMinDist, dist);

    if (this.prevX === null) {
      log(`${name}: no previous position (lap just started?)`);
      return;
    }
    const before = signedDist(this.prevX, this.prevZ, gate);
    const after = signedDist(x, z, gate);
    // Only report packets where the car changed side of the gate's line.
    if ((before < 0) === (after < 0)) return;
    const p = intersectionParams(this.prevX, this.prevZ, x, z, gate);
    const [uMin, uMax] = gateURange(gate);
    log(
      `${name}: side change ${f1(before)} -> ${f1(after)} m, ` +
        `t=${p ? p.t.toFixed(2) : "parallel"} u=${p ? p.u.toFixed(2) : "-"} ` +
        `(u 0–1 = on tarmac, ${uMin.toFixed(2)}–${uMax.toFixed(2)} accepted), ` +
        `move ${f1(Math.hypot(x - this.prevX, z - this.prevZ))} m, ms ${this.prevMs.toFixed(0)} -> ${this.elapsedMs.toFixed(0)}, ` +
        `car (${f1(x)}, ${f1(z)}) gate L(${gate.left}) R(${gate.right}) n(${gate.normal})`,
    );
  }
}
