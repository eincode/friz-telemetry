import { matchPartial, matchTrack, nearestCenterlineDist, TrackData } from "./trackMatch";
import { GT7Telemetry } from "./types";

// Identifies the track mid-lap from a rolling trail of recent driving, so the
// proper map shows up a few hundred metres in rather than after a full lap.
//
// An early match is provisional: a layout missing from the track data can
// share tarmac with one that is there (Nürburgring 24h vs GP), so the match is
// dropped if the car leaves that layout, and the full-lap match (`confirm`)
// always has the final say.
//
// Matching is costly (every candidate track is fitted against the trail), so
// it stops once a track is held. Track changes go through GT7's menu, which
// resets the session and with it this detector. As fallbacks it also detects:
// - the car sitting far from the known track for a while (e.g. parked in a new
//   track's pits before driving);
// - after a full lap said "unknown", the rolling trail uniquely matching a
//   known track.

/** Spacing between trail samples, in metres. */
const SAMPLE_SPACING_M = 5;
/** Rolling window matched against, in samples (2 km). */
const WINDOW_SAMPLES = 400;
/** Try a partial match every this many new samples (50 m). */
const MATCH_EVERY_SAMPLES = 10;
/** A single step longer than this is a teleport (rewind, reset, restart). */
const MAX_JUMP_M = 60;
/** Further than this from the matched centerline counts as off the layout... */
const DROP_DIST_M = 40;
/** ...and this much driving off it drops a provisional match. */
const DROP_AFTER_M = 100;
/** Car further than this from the matched centerline counts as off the map. */
const OFF_MAP_DIST_M = 150;
/** Off the map this long means a different track: the session is reset. */
const OFF_MAP_RESET_MS = 5000;
/** Off-map check runs every this many packets, even while parked. */
const OFF_MAP_CHECK_EVERY = 30;

const DEBUG = __DEV__;
function log(msg: string) {
  if (DEBUG) console.log(`[trackDetector] ${msg}`);
}

export class TrackDetector {
  private trail: number[] = [];
  private sinceLastMatch = 0;
  private track: TrackData | null = null;
  /** Set once a full lap was matched; the match is no longer provisional. */
  private confirmed = false;
  /**
   * Provisional matches a full lap disagreed with: the layout being driven
   * shares tarmac with them but is not them, so they are not a track change.
   */
  private rejected = new Set<TrackData>();
  private offLayoutM = 0;
  private offMapSince: number | null = null;
  private packetTick = 0;

  /**
   * @param onTrackChange called when the car turns up on a different track,
   *   with that track when it is a known one. The callee resets the session
   *   (including this detector) and then `adopt`s the new track, if any.
   */
  constructor(private readonly onTrackChange: (next: TrackData | null) => void) {}

  /** Takes on a track found during a track change, after the reset. */
  adopt(track: TrackData) {
    this.track = track;
  }

  reset() {
    this.trail = [];
    this.sinceLastMatch = 0;
    this.track = null;
    this.confirmed = false;
    this.rejected.clear();
    this.offLayoutM = 0;
    this.offMapSince = null;
  }

  /** Feed one packet; returns the new track (or null) when it changed, else undefined. */
  feed(t: GT7Telemetry): TrackData | null | undefined {
    const { x, z } = t.position;
    // All-zero position is what GT7 sends outside of a session.
    if (x === 0 && t.position.y === 0 && z === 0) return undefined;

    if (this.track && ++this.packetTick % OFF_MAP_CHECK_EVERY === 0 && this.isOffMap(x, z)) {
      log(`off ${this.track.id} for ${OFF_MAP_RESET_MS} ms: track changed`);
      this.onTrackChange(null); // Resets this detector too.
      return undefined;
    }

    const n = this.trail.length;
    let step = 0;
    if (n > 0) {
      step = Math.hypot(x - this.trail[n - 2], z - this.trail[n - 1]);
      if (step < SAMPLE_SPACING_M) return undefined;
      if (step > MAX_JUMP_M) {
        this.trail = [];
        this.sinceLastMatch = 0;
        step = 0;
      }
    }
    this.trail.push(x, z);
    if (this.trail.length > WINDOW_SAMPLES * 2) this.trail.splice(0, 2);

    if (this.track && !this.confirmed && this.leftProvisionalLayout(x, z, step)) {
      log(`left ${this.track.id}: dropping provisional match`);
      this.track = null;
      return null;
    }

    // A held track is given up only by leaving its layout (above), going off
    // the map, or a menu visit resetting the session.
    if (this.track) return undefined;

    if (++this.sinceLastMatch < MATCH_EVERY_SAMPLES) return undefined;
    this.sinceLastMatch = 0;
    const found = matchPartial(this.trail);
    if (!found || this.rejected.has(found)) return undefined;

    if (this.confirmed) {
      // A full lap said "unknown", so a known track now means somewhere else.
      log(`now on ${found.id} (was unknown): track changed`);
      this.onTrackChange(found); // Resets this detector, then adopts `found`.
      return undefined;
    }
    this.track = found;
    this.offLayoutM = 0;
    this.offMapSince = null;
    return found;
  }

  /** True once the car has driven DROP_AFTER_M off the provisional layout. */
  private leftProvisionalLayout(x: number, z: number, step: number): boolean {
    if (nearestCenterlineDist(this.track!, x, z) <= DROP_DIST_M) {
      this.offLayoutM = 0;
      return false;
    }
    this.offLayoutM += step;
    if (this.offLayoutM < DROP_AFTER_M) return false;
    this.offLayoutM = 0;
    return true;
  }

  /** Full-lap match; overrides any provisional match, including to "unknown". */
  confirm(outline: number[]): TrackData | null {
    const lap = matchTrack(outline);
    if (this.track && this.track !== lap) {
      log(`full lap says ${lap?.id ?? "unknown"}, not ${this.track.id}`);
      this.rejected.add(this.track);
    }
    this.track = lap;
    this.confirmed = true;
    this.offMapSince = null;
    return this.track;
  }

  private isOffMap(x: number, z: number): boolean {
    if (nearestCenterlineDist(this.track!, x, z) <= OFF_MAP_DIST_M) {
      this.offMapSince = null;
      return false;
    }
    const now = Date.now();
    if (this.offMapSince === null) this.offMapSince = now;
    return now - this.offMapSince >= OFF_MAP_RESET_MS;
  }
}
