import TRACKS_JSON from "@/data/tracks.generated.json";

// Identifies which known track a completed lap was driven on. GT7 sends no
// track id, but every track has its own fixed world coordinates, so a lap
// outline is matched geometrically against reference centerlines from
// assets/tracks (bundled by `npm run tracks`).

export interface TrackSector {
  /** Position along the centerline, 0–1 from the start/finish line. */
  arcFraction: number;
  /** Boundary line across the track, world XZ. */
  left: [number, number];
  right: [number, number];
  /** Unit track-forward direction in XZ; crossings must go along it. */
  normal: [number, number];
}

export interface TrackData {
  id: string;
  name: string;
  lengthM: number;
  /** Flat world XZ polylines, [x0, z0, x1, z1, ...], starting at start/finish. */
  centerline: number[];
  leftEdge: number[];
  rightEdge: number[];
  idealLine: number[];
  sectors: TrackSector[];
  sectorTimesMs: number[];
}

export const TRACKS = TRACKS_JSON as unknown as TrackData[];

interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function bounds(p: number[]): Bounds {
  const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < p.length; i += 2) {
    if (p[i] < b.minX) b.minX = p[i];
    if (p[i] > b.maxX) b.maxX = p[i];
    if (p[i + 1] < b.minZ) b.minZ = p[i + 1];
    if (p[i + 1] > b.maxZ) b.maxZ = p[i + 1];
  }
  return b;
}

const TRACK_BOUNDS = new Map<TrackData, Bounds>(
  TRACKS.map((t) => [t, bounds([...t.leftEdge, ...t.rightEdge])]),
);

/** A lap this much shorter/longer than the reference length cannot match. */
const LENGTH_TOLERANCE = 0.15;
/** Mean distance (m) allowed between the lap and the centerline, both ways. */
const MAX_MEAN_DIST_M = 12;
/** Share of the lap that must run the same way as the centerline. */
const MIN_FORWARD_RATIO = 0.8;
/** Points sampled from each polyline when comparing. */
const MATCH_SAMPLES = 200;

// Partial (mid-lap) matching is stricter: a short stretch fits more places.
/** Trail needed before a partial match is attempted, in metres. */
const PARTIAL_MIN_M = 500;
/** Mean / worst distance (m) allowed between the trail and the centerline. */
const PARTIAL_MAX_MEAN_DIST_M = 8;
const PARTIAL_MAX_DIST_M = 25;
const PARTIAL_MIN_FORWARD_RATIO = 0.9;
/** Bounding-box slack (m) for the cheap pre-filter. */
const BOUNDS_SLACK_M = 30;
const DEBUG = __DEV__;
function log(msg: string) {
  if (DEBUG) console.log(`[trackMatch] ${msg}`);
}

function openLength(p: number[]): number {
  let len = 0;
  for (let i = 2; i < p.length; i += 2) len += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
  return len;
}

function closedLength(p: number[]): number {
  let len = 0;
  const n = p.length;
  for (let i = 0; i < n; i += 2) {
    const j = (i + 2) % n;
    len += Math.hypot(p[j] - p[i], p[j + 1] - p[i + 1]);
  }
  return len;
}

/** Nearest segment of closed polyline `line` to (x, z). */
function nearestSegment(line: number[], x: number, z: number) {
  const n = line.length;
  let distSq = Infinity;
  let sx = 0;
  let sz = 0;
  for (let i = 0; i < n; i += 2) {
    const j = (i + 2) % n;
    const ax = line[i];
    const az = line[i + 1];
    const dx = line[j] - ax;
    const dz = line[j + 1] - az;
    const lenSq = dx * dx + dz * dz;
    let u = lenSq > 0 ? ((x - ax) * dx + (z - az) * dz) / lenSq : 0;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    const ex = ax + dx * u - x;
    const ez = az + dz * u - z;
    const d = ex * ex + ez * ez;
    if (d < distSq) {
      distSq = d;
      sx = dx;
      sz = dz;
    }
  }
  return { dist: Math.sqrt(distSq), sx, sz };
}

/** Distance (m) from (x, z) to a track's centerline. */
export function nearestCenterlineDist(track: TrackData, x: number, z: number): number {
  return nearestSegment(track.centerline, x, z).dist;
}

/**
 * How well `from` lies on `to`: mean and worst distance of sampled points,
 * and the share of them heading the same way as the nearest segment of `to`.
 * `from` is treated as closed (a lap) unless `open` is set (a partial trail).
 */
function directedFit(from: number[], to: number[], open = false) {
  const count = from.length / 2;
  const last = open ? count - 1 : count;
  const step = Math.max(1, Math.floor(last / MATCH_SAMPLES));
  let total = 0;
  let maxDist = 0;
  let forward = 0;
  let samples = 0;
  for (let k = 0; k < last; k += step) {
    const i = k * 2;
    const j = ((k + 1) % count) * 2;
    const seg = nearestSegment(to, from[i], from[i + 1]);
    total += seg.dist;
    if (seg.dist > maxDist) maxDist = seg.dist;
    if ((from[j] - from[i]) * seg.sx + (from[j + 1] - from[i + 1]) * seg.sz > 0) forward++;
    samples++;
  }
  return { meanDist: total / samples, maxDist, forwardRatio: forward / samples };
}

/**
 * The known track a partial trail (flat world XZ, oldest first) lies on, or
 * null. Only answers when exactly one track fits: while the trail runs along
 * a stretch shared by several layouts, it waits for more.
 */
export function matchPartial(trail: number[]): TrackData | null {
  if (trail.length < 4 || openLength(trail) < PARTIAL_MIN_M) return null;
  const b = bounds(trail);

  let found: TrackData | null = null;
  for (const track of TRACKS) {
    const tb = TRACK_BOUNDS.get(track)!;
    if (
      b.minX < tb.minX - BOUNDS_SLACK_M ||
      b.maxX > tb.maxX + BOUNDS_SLACK_M ||
      b.minZ < tb.minZ - BOUNDS_SLACK_M ||
      b.maxZ > tb.maxZ + BOUNDS_SLACK_M
    ) {
      continue;
    }
    const fit = directedFit(trail, track.centerline, true);
    if (
      fit.meanDist > PARTIAL_MAX_MEAN_DIST_M ||
      fit.maxDist > PARTIAL_MAX_DIST_M ||
      fit.forwardRatio < PARTIAL_MIN_FORWARD_RATIO
    ) {
      continue;
    }
    if (found) return null; // Ambiguous: shared stretch of several layouts.
    found = track;
  }
  if (found) log(`partial ${openLength(trail).toFixed(0)}m -> ${found.id}`);
  return found;
}

/** The known track a full-lap outline (flat world XZ) was driven on, or null. */
export function matchTrack(outline: number[]): TrackData | null {
  if (outline.length < 6) return null;
  const lapLength = closedLength(outline);

  let best: TrackData | null = null;
  let bestScore = Infinity;
  for (const track of TRACKS) {
    if (Math.abs(lapLength - track.lengthM) / track.lengthM > LENGTH_TOLERANCE) continue;

    // Lap onto track: right place and right direction (reverse layouts).
    const onto = directedFit(outline, track.centerline);
    // Track onto lap: the lap covers the whole layout, not just part of it
    // (e.g. Brands Hatch Indy is a subset of GP).
    const cover = directedFit(track.centerline, outline);
    log(
      `${track.id}: lap→track ${onto.meanDist.toFixed(1)}m fwd ${(onto.forwardRatio * 100).toFixed(0)}%, ` +
        `track→lap ${cover.meanDist.toFixed(1)}m`,
    );
    if (onto.meanDist > MAX_MEAN_DIST_M || cover.meanDist > MAX_MEAN_DIST_M) continue;
    if (onto.forwardRatio < MIN_FORWARD_RATIO) continue;

    const score = onto.meanDist + cover.meanDist;
    if (score < bestScore) {
      bestScore = score;
      best = track;
    }
  }
  log(`lap ${lapLength.toFixed(0)}m -> ${best ? best.id : "no match"}`);
  return best;
}
