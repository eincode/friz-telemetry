import { GT7Telemetry } from "./types";

// Track map built from the car's own path: XZ world positions are traced over
// one clean timed lap, and when that lap finishes the trace becomes the track
// outline. Works on any track, with no per-track calibration.
//
// Recording only starts once the lap timer ticks up from 0 after a lap
// boundary, so a rolling start, the run-up to the line, or joining mid-lap
// never end up in the map.

/** Minimum spacing between traced samples, in metres. */
const SAMPLE_SPACING_M = 3;
/** A single step longer than this is a teleport (rewind, reset, restart). */
const MAX_JUMP_M = 60;
/** A finished lap needs at least this many samples to become the outline. */
const MIN_OUTLINE_SAMPLES = 100;
/**
 * A lap's clock counts as started once currentLap ticks into (0, this).
 * The upper bound ignores a stale previous-lap value lingering for a packet
 * or two after lapCount increments. Same rule as LapDeltaTracker.
 */
const CLOCK_START_MAX_MS = 5000;
/** Publish the in-progress trail every this many new samples. */
const PUBLISH_EVERY_SAMPLES = 3;
/** Car further than this from a finished outline counts as off the map. */
const OFF_MAP_DIST_M = 150;
/** Off the map this long means a different track: the session is reset. */
const OFF_MAP_RESET_MS = 5000;
/** Off-map check runs every this many packets (it scans the whole outline). */
const OFF_MAP_CHECK_EVERY = 30;

export interface TrackMapSnapshot {
  /** Flat world XZ points: [x0, z0, x1, z1, ...]. */
  points: number[];
  /** True once a full lap was traced; `points` is then the outline. */
  complete: boolean;
}

export const EMPTY_TRACK_MAP: TrackMapSnapshot = { points: [], complete: false };

/**
 * idle      — mid-lap or invalidated; wait for the next lap boundary.
 * armed     — a new lap began; wait for its timer to start from 0.
 * recording — tracing a clean lap from its very start.
 */
type Phase = "idle" | "armed" | "recording";

export class TrackMapRecorder {
  private trail: number[] = [];
  private outline: number[] | null = null;
  private phase: Phase = "idle";
  private lapCount: number | null = null;
  private sinceLastPublish = 0;
  private offMapSince: number | null = null;
  private packetTick = 0;

  /** @param onTrackChange called when the car turns up on a different track. */
  constructor(private readonly onTrackChange?: () => void) {}

  reset() {
    this.trail = [];
    this.outline = null;
    this.phase = "idle";
    this.lapCount = null;
    this.sinceLastPublish = 0;
    this.offMapSince = null;
  }

  /** Feed one packet; returns a new snapshot when the map changed, else null. */
  feed(t: GT7Telemetry): TrackMapSnapshot | null {
    const { x, z } = t.position;
    // All-zero position is what GT7 sends outside of a session.
    if (x === 0 && t.position.y === 0 && z === 0) return null;
    if (this.outline) return this.checkStillOnMap(x, z);

    let changed = false;

    if (this.lapCount === null) {
      // First packet: we are somewhere mid-lap, so wait for the next boundary.
      this.lapCount = t.lapCount;
    } else if (t.lapCount < this.lapCount) {
      // Restart / rewind / new session.
      changed = this.discardTrail("idle");
      this.lapCount = t.lapCount;
    } else if (t.lapCount > this.lapCount) {
      const consecutive = t.lapCount - this.lapCount === 1;
      this.lapCount = t.lapCount;
      if (this.phase === "recording" && consecutive && this.trail.length / 2 >= MIN_OUTLINE_SAMPLES) {
        this.outline = this.trail;
        this.trail = [];
        return this.snapshot();
      }
      changed = this.discardTrail("armed");
    }

    if (this.phase === "armed") {
      // Without currentLap there is no way to tell, so start right away.
      if (t.currentLap === undefined || (t.currentLap > 0 && t.currentLap < CLOCK_START_MAX_MS)) {
        this.phase = "recording";
      }
    }

    if (this.phase === "recording" && this.record(x, z)) changed = true;
    return changed ? this.snapshot() : null;
  }

  private snapshot(): TrackMapSnapshot {
    if (this.outline) return { points: this.outline, complete: true };
    return { points: this.trail.slice(), complete: false };
  }

  /** Drops the in-progress trail; returns true if there was one to drop. */
  private discardTrail(phase: Phase): boolean {
    const had = this.trail.length > 0;
    this.trail = [];
    this.sinceLastPublish = 0;
    this.phase = phase;
    return had;
  }

  /** Appends a sample; returns true when the trail should be republished. */
  private record(x: number, z: number): boolean {
    const n = this.trail.length;
    if (n > 0) {
      const step = Math.hypot(x - this.trail[n - 2], z - this.trail[n - 1]);
      if (step < SAMPLE_SPACING_M) return false;
      if (step > MAX_JUMP_M) {
        // Teleported: this lap is no longer one clean drive, wait for the next.
        return this.discardTrail("idle");
      }
    }
    this.trail.push(x, z);
    if (++this.sinceLastPublish >= PUBLISH_EVERY_SAMPLES) {
      this.sinceLastPublish = 0;
      return true;
    }
    return false;
  }

  private checkStillOnMap(x: number, z: number): TrackMapSnapshot | null {
    if (++this.packetTick % OFF_MAP_CHECK_EVERY !== 0) return null;

    const o = this.outline!;
    let minSq = Infinity;
    for (let i = 0; i < o.length; i += 2) {
      const dx = o[i] - x;
      const dz = o[i + 1] - z;
      const d = dx * dx + dz * dz;
      if (d < minSq) minSq = d;
    }
    if (minSq <= OFF_MAP_DIST_M * OFF_MAP_DIST_M) {
      this.offMapSince = null;
      return null;
    }

    const now = Date.now();
    if (this.offMapSince === null) this.offMapSince = now;
    if (now - this.offMapSince < OFF_MAP_RESET_MS) return null;

    // Different track. We are mid-lap there, so reset() waits for a boundary.
    this.reset();
    this.onTrackChange?.();
    return this.snapshot();
  }
}
