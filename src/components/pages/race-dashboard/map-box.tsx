import { Box } from "@/components/pages/race-dashboard/box";
import { ThemedText } from "@/components/themed-text";
import { PulseDot } from "@/components/ui/pulse-dot";
import { Colors, HUE } from "@/constants/theme";
import { useOverlayStore } from "@/store/overlayStore";
import { useServerStore } from "@/store/serverStore";
import { useTelemetryServerStore } from "@/store/telemetryServerStore";
import { TrackMapSnapshot } from "@/utils/telemetry.ts/trackMap";
import { TrackData } from "@/utils/telemetry.ts/trackMatch";
import { Vec3 } from "@/utils/telemetry.ts/types";
import { Fragment, memo, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

/** Inset between the map and the box edges, in px. */
const PADDING = 12;
/** Wider inset in a multi-driver session, leaving room for the driver tags. */
const SESSION_PADDING = 28;
/**
 * Upper bound on zoom, in px per metre. Early in the trace the bounds are
 * tiny; without a cap the first few metres would fill the whole box.
 */
const MAX_SCALE = 1;
const TRACK_EDGE = "#2A333C";
const TRACK_SURFACE = "#5B6976";
/** Known-track rendering: road fill, kerb lines, start/finish and sector marks. */
const ROAD_FILL = "#3A4651";
const ROAD_EDGE = "#7A8996";
const START_FINISH = Colors.white;
const SECTOR_MARK = Colors.warn;
/** Narrowest the road is drawn, in px, so it stays visible on big tracks. */
const MIN_ROAD_PX = 3;
/** Start/finish and sector marks stick out this far past each edge, in px. */
const MARK_OVERHANG_PX = 3;
/** Shortest half-length of a start/finish or sector mark, in px. */
const MIN_MARK_HALF_PX = 7;
/** Car marker: an arrowhead pointing along +x, centred on the car position. */
const CAR_ARROW = "M10 0 L-6 -7 L-2.5 0 L-6 7 Z";

/**
 * Driver markers, after gt7-race-overlay's STTrackMap: each other car is a
 * dot with a leader line out to a tag showing its place and a short name.
 * Our own car keeps its arrow and gets a tag in the primary colour.
 */
const LEADER_COLOR = Colors.warn;
const OPPONENT_COLOR = "#ff3344";
const TAG_BG = Colors.background;
const TAG_INK = Colors.text;
const TAG_INK_DIM = "rgba(242,245,248,0.4)";
const LEADER_LINE = "rgba(242,245,248,0.55)";
/** Dimming for a driver whose telemetry link is down. */
const DISCONNECTED_OPACITY = 0.4;
const DOT_R = 4.5;
/** Room kept clear around our own arrow when placing tags. */
const SELF_R = 9;
const TAG_H = 15;
const TAG_STRIP_W = 2;
const TAG_PAD_X = 4;
const TAG_GAP = 4;
const TAG_RANK_SIZE = 8;
const TAG_NAME_SIZE = 9;
/** Glyph advance of IBM Plex Mono, as a fraction of the font size. */
const MONO_ADVANCE = 0.6;
/** Leader-line lengths tried for each tag, shortest first, in px. */
const LEADER_LENGTHS = [14, 26, 40];
/** Turns off the outward direction tried for each tag, in degrees. */
const LEADER_TURNS = [0, 35, -35, 70, -70, 110, -110, 180];

interface Fit {
  minX: number;
  minZ: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Fits the points' XZ bounds into the box, centred, keeping aspect ratio. */
function computeFit(points: number[], w: number, h: number, padding: number): Fit | null {
  if (points.length < 2 || w <= 0 || h <= 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const z = points[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const innerW = Math.max(1, w - padding * 2);
  const innerH = Math.max(1, h - padding * 2);
  const spanX = Math.max(maxX - minX, 1e-3);
  const spanZ = Math.max(maxZ - minZ, 1e-3);
  const scale = Math.min(innerW / spanX, innerH / spanZ, MAX_SCALE);
  return {
    minX,
    minZ,
    scale,
    offsetX: (w - spanX * scale) / 2,
    offsetY: (h - spanZ * scale) / 2,
  };
}

// World +X is screen right and world +Z is screen down, which matches the
// in-game map orientation.
const projectX = (f: Fit, x: number) => f.offsetX + (x - f.minX) * f.scale;
const projectY = (f: Fit, z: number) => f.offsetY + (z - f.minZ) * f.scale;

const pt = (f: Fit, x: number, z: number) => `${projectX(f, x).toFixed(1)} ${projectY(f, z).toFixed(1)}`;

function buildPath(points: number[], f: Fit, closed: boolean): string {
  let d = "";
  for (let i = 0; i < points.length; i += 2) {
    d += `${i === 0 ? "M" : "L"}${projectX(f, points[i]).toFixed(1)} ${projectY(f, points[i + 1]).toFixed(1)}`;
  }
  return closed ? `${d}Z` : d;
}

/**
 * The road surface as one quad per centerline step, between matching left
 * and right edge points. Drawn as separate subpaths with the same winding and
 * filled nonzero, so crossovers (Suzuka's bridge) stay solid instead of
 * cancelling out the way an even-odd ring between the two edges would.
 */
function buildRoad(t: TrackData, f: Fit): string {
  const l = t.leftEdge;
  const r = t.rightEdge;
  const n = Math.min(l.length, r.length);
  let d = "";
  // No wrap-around quad: the recorded edges already end back on their first
  // point, and joining last to first would add a flipped, zero-width quad.
  for (let i = 0; i + 2 < n; i += 2) {
    const j = i + 2;
    d += `M${pt(f, l[i], l[i + 1])}L${pt(f, l[j], l[j + 1])}L${pt(f, r[j], r[j + 1])}L${pt(f, r[i], r[i + 1])}Z`;
  }
  return d;
}

/** A mark across the track from edge to edge, overhanging both sides a little. */
function buildMark(f: Fit, [lx, lz]: [number, number], [rx, rz]: [number, number]): string {
  const ax = projectX(f, lx);
  const ay = projectY(f, lz);
  const bx = projectX(f, rx);
  const by = projectY(f, rz);
  const len = Math.hypot(bx - ax, by - ay);
  if (len === 0) return "";
  const half = Math.max(len / 2 + MARK_OVERHANG_PX, MIN_MARK_HALF_PX);
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const ux = ((bx - ax) / len) * half;
  const uy = ((by - ay) / len) * half;
  return `M${(mx - ux).toFixed(1)} ${(my - uy).toFixed(1)}L${(mx + ux).toFixed(1)} ${(my + uy).toFixed(1)}`;
}

function KnownTrack({ track, fit }: { track: TrackData; fit: Fit }) {
  const paths = useMemo(() => {
    const l = track.leftEdge;
    const r = track.rightEdge;
    return {
      road: buildRoad(track, fit),
      center: buildPath(track.centerline, fit, true),
      left: buildPath(l, fit, true),
      right: buildPath(r, fit, true),
      start: buildMark(fit, [l[0], l[1]], [r[0], r[1]]),
      sectors: track.sectors.map((s) => buildMark(fit, s.left, s.right)).join(""),
    };
  }, [track, fit]);

  return (
    <>
      <Path d={paths.road} fill={ROAD_FILL} stroke={ROAD_FILL} strokeWidth={0.75} strokeLinejoin="round" />
      <Path d={paths.center} stroke={ROAD_FILL} strokeWidth={MIN_ROAD_PX} fill="none" strokeLinejoin="round" />
      <Path d={paths.left} stroke={ROAD_EDGE} strokeWidth={1} fill="none" strokeLinejoin="round" />
      <Path d={paths.right} stroke={ROAD_EDGE} strokeWidth={1} fill="none" strokeLinejoin="round" />
      <Path d={paths.sectors} stroke={SECTOR_MARK} strokeWidth={2} strokeLinecap="round" />
      <Path d={paths.start} stroke={START_FINISH} strokeWidth={2.5} strokeLinecap="round" />
    </>
  );
}

/**
 * The track itself, on its own canvas under the moving markers. A known
 * track is hundreds of road quads, and react-native-svg repaints a whole
 * canvas whenever any shape in it changes; sharing one with the car arrow
 * meant repainting the road on every telemetry packet. Memoised so it only
 * redraws when the track, the fit or the traced outline actually changes.
 */
const TrackLayer = memo(function TrackLayer({
  width,
  height,
  fit,
  track,
  path,
  complete,
}: {
  width: number;
  height: number;
  fit: Fit;
  track: TrackData | null;
  /** Traced outline, used when there is no known track. */
  path: string;
  complete: boolean;
}) {
  return (
    <Svg width={width} height={height}>
      {track ? (
        <KnownTrack track={track} fit={fit} />
      ) : complete ? (
        <>
          <Path d={path} stroke={TRACK_EDGE} strokeWidth={7} fill="none" strokeLinejoin="round" />
          <Path d={path} stroke={TRACK_SURFACE} strokeWidth={4} fill="none" strokeLinejoin="round" />
        </>
      ) : (
        <Path
          d={path}
          stroke={Colors.primary}
          strokeOpacity={0.55}
          strokeWidth={3}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
});

/** "M. VERSTAPPEN" → "VER"; falls back to the driver id when there is no name. */
function shortName(name: string | null | undefined, id: number): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const last = words[words.length - 1]?.replace(/[^\p{L}\p{N}]/gu, "");
  return last ? last.slice(0, 3).toUpperCase() : `#${id}`;
}

interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Area, b: Area) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Tag box at the end of a `len` px leader from (cx, cy) along (dx, dy). Mostly
 * sideways leaders put the tag beside the end point, mostly vertical ones
 * centre it above or below, so the tag always sits clear of its own car.
 */
function tagBox(cx: number, cy: number, dx: number, dy: number, len: number, w: number): Area {
  const ax = cx + dx * len;
  const ay = cy + dy * len;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: dx >= 0 ? ax : ax - w, y: ay - TAG_H / 2, w, h: TAG_H };
  }
  return { x: ax - w / 2, y: dy >= 0 ? ay : ay - TAG_H, w, h: TAG_H };
}

/**
 * Last chosen [length, turn] per driver; tried first so tags hold still.
 * Module-level rather than a ref since placement runs during render; there
 * is only ever one map on screen.
 */
const lastTagSpot = new Map<number, [number, number]>();

interface Marker {
  id: number;
  rank: number;
  self: boolean;
  connected: boolean;
  /** Screen position, px. */
  x: number;
  y: number;
  label: string;
}

interface PlacedTag extends Marker {
  box: Area;
  /** Where the leader line meets the tag. */
  ex: number;
  ey: number;
  rankW: number;
  color: string;
}

/**
 * Each tag tries directions fanning out from "away from the map centre" at a
 * few lengths, and takes the first spot that stays inside the map without
 * covering an earlier tag or any car. A tag keeps last time's spot while it
 * is still clear, so tags don't flicker. Markers are placed in order, so the
 * leader's tag goes first and never moves.
 */
function placeTags(markers: Marker[], width: number, height: number): PlacedTag[] {
  const inside = (b: Area) => b.x >= 2 && b.y >= 2 && b.x + b.w <= width - 2 && b.y + b.h <= height - 2;
  const clampArea = (b: Area): Area => ({
    ...b,
    x: Math.min(Math.max(b.x, 2), width - b.w - 2),
    y: Math.min(Math.max(b.y, 2), height - b.h - 2),
  });

  const carRects: Area[] = markers.map((m) => {
    const r = m.self ? SELF_R : DOT_R;
    return { x: m.x - r, y: m.y - r, w: r * 2, h: r * 2 };
  });
  const placed: Area[] = [];
  return markers.map((m) => {
    const out = Math.atan2(m.y - height / 2, m.x - width / 2);
    const rankW = String(m.rank).length * TAG_RANK_SIZE * MONO_ADVANCE;
    const nameW = m.label.length * TAG_NAME_SIZE * MONO_ADVANCE;
    const w = TAG_STRIP_W + TAG_PAD_X + rankW + TAG_GAP + nameW + TAG_PAD_X;
    const clashes = (b: Area) =>
      placed.filter((p) => overlaps(p, b)).length + carRects.filter((d) => overlaps(d, b)).length;

    const prev = lastTagSpot.get(m.id);
    const spots: [number, number][] = [
      ...(prev ? [prev] : []),
      ...LEADER_LENGTHS.flatMap((len) => LEADER_TURNS.map((turn): [number, number] => [len, turn])),
    ];

    let box: Area | null = null;
    let fallback: { box: Area; clashes: number } | null = null;
    for (const [len, turn] of spots) {
      const a = out + (turn * Math.PI) / 180;
      const b = tagBox(m.x, m.y, Math.cos(a), Math.sin(a), len, w);
      if (!inside(b)) continue;
      const n = clashes(b);
      if (n === 0) {
        box = b;
        lastTagSpot.set(m.id, [len, turn]);
        break;
      }
      if (!fallback || n < fallback.clashes) fallback = { box: b, clashes: n };
    }
    // Nowhere clear: least-crowded in-bounds spot, else straight out and clamped.
    box ??= fallback?.box ?? clampArea(tagBox(m.x, m.y, Math.cos(out), Math.sin(out), LEADER_LENGTHS[0], w));
    placed.push(box);
    // Leader line ends on the tag edge nearest the car.
    const ex = Math.min(Math.max(m.x, box.x), box.x + box.w);
    const ey = Math.min(Math.max(m.y, box.y), box.y + box.h);
    const color = m.self ? Colors.primary : m.rank === 1 ? LEADER_COLOR : OPPONENT_COLOR;
    return { ...m, box, ex, ey, rankW, color };
  });
}

/**
 * Every driver in the session from the server's overlay feed. Other cars get
 * a dot; every car, ours included, gets a tag.
 *
 * Tag placement is a search over many candidate spots, so it runs only when
 * the overlay feed or the map changes (~20 Hz), not on every telemetry
 * packet. It uses the server's copy of every position, ours included. Our
 * own tag then keeps its placed spot relative to our car and is shifted to
 * the arrow's live position on every packet, which is just a move of a few
 * native views.
 */
function DriverMarkers({
  fit,
  width,
  height,
  self,
}: {
  fit: Fit;
  width: number;
  height: number;
  /** Our car's screen position from local telemetry; null when off track. */
  self: { x: number; y: number } | null;
}) {
  const cars = useOverlayStore((s) => s.cars);
  const standings = useOverlayStore((s) => s.standings);
  const roster = useOverlayStore((s) => s.roster);
  const selfId = useServerStore((s) => s.driverId);
  const selfName = useServerStore((s) => s.driverName);
  const names = useMemo(() => new Map(roster.map((r) => [r.id, r.name])), [roster]);
  const positions = useMemo(() => new Map(cars.map((c) => [c.id, c.position])), [cars]);

  // Places come from the once-a-second standings so tags agree with the
  // leaderboard; positions are live. A driver who just joined shows up at the
  // next standings refresh.
  const tags = useMemo(() => {
    const markers: Marker[] = standings.flatMap((s) => {
      const p = positions.get(s.id);
      if (!p) return [];
      const isSelf = s.id === selfId;
      const name = isSelf ? (selfName ?? names.get(s.id)) : names.get(s.id);
      return [
        {
          id: s.id,
          rank: s.rank,
          self: isSelf,
          connected: s.connected,
          x: projectX(fit, p[0]),
          y: projectY(fit, p[1]),
          label: shortName(name, s.id),
        },
      ];
    });
    return placeTags(markers, width, height);
  }, [standings, positions, names, selfId, selfName, fit, width, height]);

  return (
    <>
      {/* Lines and tags first, dots last, so no tag ever hides a car. */}
      {tags.map((t) => {
        // Our tag rides along with the arrow; hidden while we're off track.
        if (t.self && !self) return null;
        const dx = t.self && self ? self.x - t.x : 0;
        const dy = t.self && self ? self.y - t.y : 0;
        const opacity = t.connected ? 1 : DISCONNECTED_OPACITY;
        const len = Math.hypot(t.ex - t.x, t.ey - t.y);
        return (
          <Fragment key={`tag-${t.id}`}>
            {/* Leader line: a 1px bar centred between car and tag, turned to point at both. */}
            <View
              style={[
                styles.leader,
                {
                  opacity,
                  width: len,
                  left: (t.x + t.ex) / 2 - len / 2 + dx,
                  top: (t.y + t.ey) / 2 - 0.5 + dy,
                  transform: [{ rotate: `${Math.atan2(t.ey - t.y, t.ex - t.x)}rad` }],
                },
              ]}
            />
            <View
              style={[
                styles.tag,
                { opacity, left: t.box.x + dx, top: t.box.y + dy, width: t.box.w, borderLeftColor: t.color },
              ]}
            >
              <Text style={styles.tagRank}>{t.rank}</Text>
              <Text style={[styles.tagName, t.self && styles.tagNameSelf]}>{t.label}</Text>
            </View>
          </Fragment>
        );
      })}
      {tags
        .filter((t) => !t.self)
        .map((t) => (
          <View
            key={`dot-${t.id}`}
            style={[
              styles.dot,
              {
                left: t.x - DOT_R,
                top: t.y - DOT_R,
                backgroundColor: t.color,
                opacity: t.connected ? 1 : DISCONNECTED_OPACITY,
              },
            ]}
          />
        ))}
    </>
  );
}

/** Box around the car arrow, wide enough for its points; it rotates about its centre. */
const CAR_BOX = 24;

/**
 * Our car: a fixed SVG arrow inside a plain view that is moved and turned
 * with a transform. The SVG never changes, so it is drawn once; per-packet
 * updates are only a transform on a native view.
 */
function CarArrow({ x, y, heading }: { x: number; y: number; heading: number }) {
  return (
    <View
      style={[
        styles.car,
        { transform: [{ translateX: x - CAR_BOX / 2 }, { translateY: y - CAR_BOX / 2 }, { rotate: `${heading}rad` }] },
      ]}
    >
      <CarArrowShape />
    </View>
  );
}

const CarArrowShape = memo(function CarArrowShape() {
  const h = CAR_BOX / 2;
  return (
    <Svg width={CAR_BOX} height={CAR_BOX} viewBox={`${-h} ${-h} ${CAR_BOX} ${CAR_BOX}`}>
      <Path d={CAR_ARROW} fill={Colors.primary} stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
});

/**
 * Small dot over the map's top-right corner showing the multi-driver server
 * link: pulsing green while telemetry is going out, pulsing yellow while
 * retrying after a drop, solid red while the socket is down. Hidden outside a
 * multi-driver session, and while connected but not sending. Absolutely
 * positioned so it never shifts the map or header.
 */
function ServerLinkIndicator() {
  const inSession = useServerStore((s) => s.token !== null);
  const sending = useTelemetryServerStore((s) => s.sending);
  const status = useTelemetryServerStore((s) => s.status);
  if (!inSession || (status === "connected" && !sending)) return null;
  const state = sending
    ? { color: Colors.success, label: "LIVE", pulse: true, a11y: "Sending telemetry to server" }
    : status === "reconnecting"
      ? { color: Colors.warn, label: "RECONNECTING", pulse: true, a11y: "Reconnecting to server" }
      : { color: Colors.error, label: "OFFLINE", pulse: false, a11y: "Disconnected from server" };
  return (
    <View style={styles.link} pointerEvents="none" accessible accessibilityLabel={state.a11y}>
      {state.pulse ? (
        <PulseDot color={state.color} size={6} />
      ) : (
        <View style={[styles.linkDot, { backgroundColor: state.color }]} />
      )}
      <ThemedText type="data" style={[styles.linkLabel, { color: state.color }]}>
        {state.label}
      </ThemedText>
    </View>
  );
}

export function MapBox({
  carPosition,
  carHeading,
  trackMap,
  track,
  onReset,
}: {
  carPosition: Vec3;
  /** Facing direction in radians, 0 = world +X; see HeadingTracker. */
  carHeading: number;
  trackMap: TrackMapSnapshot;
  /** Matched known track; when set it replaces the traced outline. */
  track: TrackData | null;
  onReset: () => void;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const { points, complete } = trackMap;
  const inSession = useServerStore((s) => s.token !== null);
  // A known track is fitted on its edges so the full road width is in view.
  const fitPoints = useMemo(() => (track ? [...track.leftEdge, ...track.rightEdge] : points), [track, points]);
  const padding = inSession ? SESSION_PADDING : PADDING;
  const fit = useMemo(() => computeFit(fitPoints, size.w, size.h, padding), [fitPoints, size.w, size.h, padding]);
  // All-zero position is what GT7 sends outside of a session.
  const onTrack = !(carPosition.x === 0 && carPosition.y === 0 && carPosition.z === 0);
  const self = fit && onTrack ? { x: projectX(fit, carPosition.x), y: projectY(fit, carPosition.z) } : null;
  // Not needed under a known track; skipping it keeps the track layer from
  // redrawing while the trace keeps growing underneath.
  const path = useMemo(
    () => (fit && !track ? buildPath(points, fit, complete) : ""),
    [points, fit, complete, track],
  );

  const header = (
    <View style={styles.header}>
      {track ? null : (
        <ThemedText type="data" style={complete ? styles.statusDim : styles.status}>
          {complete ? "UNKNOWN TRACK" : points.length ? "MAPPING…" : "WAITING"}
        </ThemedText>
      )}
      <Pressable
        onPress={onReset}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Reset session"
        style={({ pressed }) => [styles.reset, pressed && styles.resetPressed]}
      >
        <ThemedText type="data" style={styles.resetLabel}>
          RESET
        </ThemedText>
      </Pressable>
    </View>
  );

  return (
    <Box hue="steering" label={track ? track.name : "TRACK MAP"} right={header} style={styles.box}>
      <View style={styles.canvas} onLayout={onLayout}>
        {fit ? (
          <>
            <TrackLayer width={size.w} height={size.h} fit={fit} track={track} path={path} complete={complete} />
            {/* Everything that moves is plain native views over the track, not
                SVG: on Android any change to an SVG canvas re-allocates and
                repaints its whole bitmap, and doing that per packet starved
                the app enough to delay the telemetry stream itself. */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {inSession ? <DriverMarkers fit={fit} width={size.w} height={size.h} self={self} /> : null}
              {self ? <CarArrow x={self.x} y={self.y} heading={carHeading} /> : null}
            </View>
          </>
        ) : size.w > 0 ? (
          <ThemedText type="data" style={styles.hint}>
            Mapping starts at the next lap
          </ThemedText>
        ) : null /* Not measured yet (just mounted): don't flash the hint. */}
        <ServerLinkIndicator />
      </View>
    </Box>
  );
}

const styles = StyleSheet.create({
  box: {
    borderColor: HUE.steering.border,
    flex: 1,
    minHeight: 0,
  },
  canvas: {
    flex: 1,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reset: {
    borderWidth: 1,
    borderColor: HUE.steering.border,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  resetPressed: {
    backgroundColor: HUE.steering.border,
  },
  resetLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.7,
    color: HUE.steering.label,
  },
  status: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.7,
    color: Colors.primary,
  },
  statusDim: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 9,
    letterSpacing: 1.7,
    color: Colors.textDim,
  },
  link: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  linkLabel: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 8,
    letterSpacing: 1.4,
  },
  linkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  leader: {
    position: "absolute",
    height: 1,
    backgroundColor: LEADER_LINE,
  },
  tag: {
    position: "absolute",
    height: TAG_H,
    flexDirection: "row",
    alignItems: "center",
    gap: TAG_GAP,
    paddingLeft: TAG_PAD_X,
    backgroundColor: TAG_BG,
    borderLeftWidth: TAG_STRIP_W,
  },
  tagRank: {
    flexShrink: 0,
    fontFamily: "IBMPlexMono-Bold",
    fontSize: TAG_RANK_SIZE,
    color: TAG_INK_DIM,
    includeFontPadding: false,
  },
  tagName: {
    flexShrink: 0,
    fontFamily: "IBMPlexMono-Bold",
    fontSize: TAG_NAME_SIZE,
    color: TAG_INK,
    includeFontPadding: false,
  },
  tagNameSelf: {
    color: Colors.primary,
  },
  dot: {
    position: "absolute",
    width: DOT_R * 2,
    height: DOT_R * 2,
    borderRadius: DOT_R,
    borderWidth: 1.25,
    borderColor: TAG_INK,
  },
  car: {
    position: "absolute",
    left: 0,
    top: 0,
    width: CAR_BOX,
    height: CAR_BOX,
  },
  hint: {
    fontFamily: "IBMPlexMono-Regular",
    fontSize: 10,
    color: Colors.textDim,
  },
});
