#!/usr/bin/env node
/**
 * Track map calibration for MapBox (src/components/pages/race-dashboard/map-box.tsx).
 *
 * Fits a similarity transform (scale + rotation + offset) from GT7 world
 * coordinates to map-image pixel coordinates, using any number (>= 2) of
 * calibration point pairs, then prints the normalized CALIBRATION object
 * ready to paste into map-box.tsx.
 *
 * Usage:
 *   node scripts/calibrate-track.mjs <points.json>
 *
 * points.json format:
 * {
 *   "name": "trial-mountain",
 *   "imageWidth": 1174,
 *   "imageHeight": 481,
 *   "points": [
 *     { "label": "start-finish", "world": [144.25, 15.9, 308.17], "image": [684, 433] },
 *     { "label": "sector-1",     "world": [606.06, 20.4, 38.68],  "image": [961, 268] },
 *     { "label": "sector-2",     "world": [-848.00, 15.6, -245.10], "image": [81, 98] }
 *   ]
 * }
 *
 * - "world" accepts either [x, y, z] (y is ignored) or [x, z].
 * - "image" is [px, py] measured from the top-left corner of the track image.
 * - More points with wide spread = better fit. Residuals are reported per point.
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";

// ---------- input ----------

const [, , inputPath] = process.argv;
if (!inputPath) {
  console.error("Usage: node scripts/calibrate-track.mjs <points.json>");
  process.exit(1);
}

let input;
try {
  input = JSON.parse(readFileSync(inputPath, "utf8"));
} catch (err) {
  console.error(`Failed to read ${inputPath}: ${err.message}`);
  process.exit(1);
}

const { name, imageWidth: W, imageHeight: H, points } = input;

if (typeof W !== "number" || typeof H !== "number" || !Array.isArray(points)) {
  console.error('Input must contain numeric "imageWidth", "imageHeight" and a "points" array.');
  process.exit(1);
}
if (points.length < 2) {
  console.error("Need at least 2 calibration points (3+ recommended for a robust fit).");
  process.exit(1);
}

// world -> [x, z] (ignore y when a full Vec3 is given)
const pts = points.map(({ label = "point", world, image }) => {
  if (!Array.isArray(world) || (world.length !== 2 && world.length !== 3)) {
    throw new Error(`Point "${label}": "world" must be [x, z] or [x, y, z]`);
  }
  if (!Array.isArray(image) || image.length !== 2) {
    throw new Error(`Point "${label}": "image" must be [px, py]`);
  }
  return {
    label,
    x: world[0],
    z: world.length === 3 ? world[2] : world[1],
    px: image[0],
    py: image[1],
  };
});

// ---------- similarity transform least-squares fit ----------
//
// Model:  px = s*cos(θ)*x - s*sin(θ)*z + tx
//         py = s*sin(θ)*x + s*cos(θ)*z + ty
//
// Unknowns [A, B, tx, ty] with A = s*cos(θ), B = s*sin(θ):
//         px = A*x - B*z + tx
//         py = B*x + A*z + ty
//
// Normal equations: 4x4, solved with Gaussian elimination. No dependencies.

const M = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
const rhs = [0, 0, 0, 0];

function accumulate(row, value) {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) M[i][j] += row[i] * row[j];
    rhs[i] += row[i] * value;
  }
}

for (const { x, z, px, py } of pts) {
  accumulate([x, -z, 1, 0], px);
  accumulate([z, x, 0, 1], py);
}

const aug = M.map((row, i) => [...row, rhs[i]]);
for (let col = 0; col < 4; col++) {
  const pivot = pickPivot(aug, col);
  [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
  for (let r = 0; r < 4; r++) {
    if (r !== col && aug[r][col] !== 0) {
      const f = aug[r][col] / aug[col][col];
      for (let c = col; c <= 4; c++) aug[r][c] -= f * aug[col][c];
    }
  }
}
function pickPivot(aug, col) {
  let best = col;
  for (let r = col; r < 4; r++) {
    if (Math.abs(aug[r][col]) > Math.abs(aug[best][col])) best = r;
  }
  return best;
}

const [A, B, tx, ty] = aug.map((row, i) => row[4] / row[i]);
const scale = Math.hypot(A, B);
const rotationDeg = (Math.atan2(B, A) * 180) / Math.PI;

// ---------- report ----------

console.log(`\nTrack: ${name ?? basename(inputPath)}`);
console.log(`Image: ${W} x ${H} px, ${pts.length} calibration point(s)\n`);
console.log(`scale    = ${scale.toFixed(6)} px / world unit`);
console.log(`rotation = ${rotationDeg.toFixed(4)} deg`);
console.log(`offset   = (${tx.toFixed(2)}, ${ty.toFixed(2)}) px\n`);

let maxErr = 0;
console.log("Point residuals (px):");
for (const { label, x, z, px, py } of pts) {
  const ex = A * x - B * z + tx - px;
  const ey = B * x + A * z + ty - py;
  const err = Math.hypot(ex, ey);
  maxErr = Math.max(maxErr, err);
  console.log(`  ${label.padEnd(20)} (${ex >= 0 ? "+" : ""}${ex.toFixed(1)}, ${ey >= 0 ? "+" : ""}${ey.toFixed(1)})`);
}
console.log(`max residual = ${maxErr.toFixed(1)} px\n`);

if (maxErr > 10) {
  console.warn("⚠  Residuals are large (> 10 px). Check that all world coords come from the");
  console.warn("   same session and that image coords match the exact world positions.\n");
}

// ---------- output: paste into map-box.tsx ----------

const f = (v) => Number(v.toFixed(10));

console.log("CALIBRATION object (paste into map-box.tsx):\n");
console.log("const CALIBRATION = {");
console.log(`  scaleX: ${f(A / W)},`);
console.log(`  shearXZ: ${f(-B / W)},`);
console.log(`  offsetX: ${f(tx / W)},`);
console.log(`  shearZX: ${f(B / H)},`);
console.log(`  scaleZ: ${f(A / H)},`);
console.log(`  offsetZ: ${f(ty / H)},`);
console.log("};");
