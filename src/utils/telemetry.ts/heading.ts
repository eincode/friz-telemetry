import { GT7Telemetry } from "./types";

// Car heading on the map, in radians: atan2(z, x) of a world-space direction,
// so 0 is world +X (screen right) and positive turns towards +Z (screen down).
//
// The true facing direction comes from the rotation quaternion, which shows
// spins and slides. GT7 does not document which local axis is "forward", so
// it is learned: on straights, where facing ≈ direction of travel, each
// candidate axis is scored against the velocity and the one that consistently
// lines up wins. Until then (or if none does) the heading falls back to the
// direction of travel.

/** Below this speed (m/s) the velocity direction is noise; the heading is held. */
const MIN_HEADING_SPEED = 2;
/** Calibration samples are only taken above this speed (m/s)... */
const CALIBRATE_MIN_SPEED = 15;
/** ...and below this yaw rate (rad/s), i.e. on a straight, not sliding. */
const CALIBRATE_MAX_YAW_RATE = 0.1;
/** Qualifying samples (60 Hz) before an axis is picked: ~10 s of straights. */
const CALIBRATE_SAMPLES = 600;
/** Mean cos(angle to velocity) an axis needs to be accepted as forward. */
const ACCEPT_ALIGNMENT = 0.95;
/** Running alignment below this means the axis was wrong; re-learn it. */
const REJECT_ALIGNMENT = 0.8;
/** Smoothing factor for the running alignment check once calibrated. */
const ALIGNMENT_EMA = 0.01;

/** Candidate local forward axes: +Z, −Z, +X, −X. */
const AXES = ["+z", "-z", "+x", "-x"] as const;
type Axis = (typeof AXES)[number];

const DEBUG = __DEV__;
function log(msg: string) {
  if (DEBUG) console.log(`[heading] ${msg}`);
}

/** World XZ direction of each candidate local axis under quaternion q. */
function rotatedAxes(t: GT7Telemetry): Record<Axis, [number, number]> {
  // GT7: rotation = quaternion (x, y, z), orientationRelativeToNorth = w.
  const { x, y, z } = t.rotation;
  const w = t.orientationRelativeToNorth;
  // Columns of the rotation matrix, XZ components only (Y is up).
  const zx = 2 * (x * z + w * y);
  const zz = 1 - 2 * (x * x + y * y);
  const xx = 1 - 2 * (y * y + z * z);
  const xz = 2 * (x * z - w * y);
  return { "+z": [zx, zz], "-z": [-zx, -zz], "+x": [xx, xz], "-x": [-xx, -xz] };
}

function alignment([ax, az]: [number, number], vx: number, vz: number, speed: number): number {
  const len = Math.hypot(ax, az);
  return len > 0 ? (ax * vx + az * vz) / (len * speed) : 0;
}

export class HeadingTracker {
  private heading = 0;
  private axis: Axis | null = null;
  private sums: Record<Axis, number> = { "+z": 0, "-z": 0, "+x": 0, "-x": 0 };
  private samples = 0;
  private runningAlignment = 1;

  /** Feed one packet; returns the current heading in radians. */
  feed(t: GT7Telemetry): number {
    const { x: vx, z: vz } = t.worldVelocity;
    const speed = Math.hypot(vx, vz);
    const axes = rotatedAxes(t);
    const straight = speed >= CALIBRATE_MIN_SPEED && Math.abs(t.angularVelocity.y) <= CALIBRATE_MAX_YAW_RATE;

    if (this.axis === null) {
      if (straight) this.calibrate(axes, vx, vz, speed);
    } else if (straight) {
      const a = alignment(axes[this.axis], vx, vz, speed);
      this.runningAlignment += (a - this.runningAlignment) * ALIGNMENT_EMA;
      if (this.runningAlignment < REJECT_ALIGNMENT) {
        log(`axis ${this.axis} drifted (alignment ${this.runningAlignment.toFixed(2)}), re-learning`);
        this.axis = null;
      }
    }

    if (this.axis !== null) {
      const [fx, fz] = axes[this.axis];
      if (fx !== 0 || fz !== 0) this.heading = Math.atan2(fz, fx);
    } else if (speed >= MIN_HEADING_SPEED) {
      this.heading = Math.atan2(vz, vx);
    }
    return this.heading;
  }

  private calibrate(axes: Record<Axis, [number, number]>, vx: number, vz: number, speed: number) {
    for (const a of AXES) this.sums[a] += alignment(axes[a], vx, vz, speed);
    if (++this.samples < CALIBRATE_SAMPLES) return;

    const best = AXES.reduce((b, a) => (this.sums[a] > this.sums[b] ? a : b));
    const mean = this.sums[best] / this.samples;
    log(
      `calibration: ${AXES.map((a) => `${a}=${(this.sums[a] / this.samples).toFixed(3)}`).join(" ")} -> ` +
        (mean >= ACCEPT_ALIGNMENT ? `using ${best}` : "no axis fits, using direction of travel"),
    );
    if (mean >= ACCEPT_ALIGNMENT) {
      this.axis = best;
      this.runningAlignment = mean;
    }
    this.sums = { "+z": 0, "-z": 0, "+x": 0, "-x": 0 };
    this.samples = 0;
  }
}
