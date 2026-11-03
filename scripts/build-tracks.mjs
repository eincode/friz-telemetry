#!/usr/bin/env node
/**
 * Bundles assets/tracks/<id>/track.json into one compact file the app ships:
 * src/data/tracks.generated.json.
 *
 * Only track.json is read. The raw recordings next to it (ideal-line.json,
 * left-edge.json, right-edge.json) are source data, megabytes each, and are
 * never bundled.
 *
 * Output keeps XZ only (Y is up and not needed to draw or match a 2D map),
 * flattened to [x0, z0, x1, z1, ...] and rounded to 0.1 m.
 *
 * An optional "name" in track.json overrides the display name derived from
 * the folder id.
 *
 * Usage: npm run tracks
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "assets/tracks";
const OUT = "src/data/tracks.generated.json";

const round = (v) => Math.round(v * 10) / 10;
const flatXZ = (points) => points.flatMap(([x, , z]) => [round(x), round(z)]);
const xz = ([x, , z]) => [round(x), round(z)];
const nameFromId = (id) => id.replace(/-/g, " ").toUpperCase();

const tracks = [];
for (const dir of readdirSync(SRC, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const path = join(SRC, dir.name, "track.json");
  if (!existsSync(path)) {
    console.warn(`skip ${dir.name}: no track.json`);
    continue;
  }
  const t = JSON.parse(readFileSync(path, "utf8"));
  tracks.push({
    id: t.id ?? dir.name,
    name: t.name ?? nameFromId(t.id ?? dir.name),
    lengthM: Math.round(t.arcLengthM),
    centerline: flatXZ(t.centerline),
    leftEdge: flatXZ(t.leftLine),
    rightEdge: flatXZ(t.rightLine),
    idealLine: flatXZ(t.idealLine),
    sectors: t.sectorBoundaries.map((b) => ({
      arcFraction: Math.round(b.arcFraction * 10000) / 10000,
      left: xz(b.leftEdge),
      right: xz(b.rightEdge),
      // Track-forward direction in XZ; tells a forward crossing from a reverse one.
      normal: [Math.round(b.normal[0] * 1000) / 1000, Math.round(b.normal[2] * 1000) / 1000],
    })),
    sectorTimesMs: t.sectorTimesMs,
  });
}

tracks.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(OUT, JSON.stringify(tracks) + "\n");
const kb = (JSON.stringify(tracks).length / 1024).toFixed(0);
console.log(`wrote ${tracks.length} tracks to ${OUT} (${kb} KB): ${tracks.map((t) => t.id).join(", ")}`);
