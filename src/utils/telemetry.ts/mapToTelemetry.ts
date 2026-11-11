// src/gt7/mapToTelemetry.ts
import { Telemetry, TyreCorner } from "@/app/RaceDashboard";
import { GT7Telemetry } from "./types";

/**
 * Tank level, 0–100. Kept fractional: per-lap consumption is only a few
 * percent, so rounding here would swamp the fuel-management maths. Displays
 * round it themselves.
 */
export const fuelPercent = (t: GT7Telemetry) => (t.fuelCapacity > 0 ? (t.fuelLevel / t.fuelCapacity) * 100 : 0);

/** lapDeltaMs is stateful (needs lap history), so it is filled in by the caller. */
export function mapToTelemetry(t: GT7Telemetry): Omit<Telemetry, "lapDeltaMs"> {
  // GT7 speed field is m/s — convert to km/h to match typical dashboard units.
  const speedKmh = Math.round(t.speed * 3.6);

  const fuel = fuelPercent(t);

  // -1 (0xFFFFFFFF as signed int32) is GT7's "no time set" sentinel.
  const bestLapMs = t.bestLapTimeMs >= 0 ? t.bestLapTimeMs : 0;
  const lastLapMs = t.lastLapTimeMs >= 0 ? t.lastLapTimeMs : 0;

  const tyreTemps: Record<TyreCorner, number> = {
    FL: Math.round(t.tyreTemp[0]),
    FR: Math.round(t.tyreTemp[1]),
    RL: Math.round(t.tyreTemp[2]),
    RR: Math.round(t.tyreTemp[3]),
  };

  const steeringWheelAngle = (t.wheelRotation ?? 0) * (180 / Math.PI) * -1;

  return {
    // Approximation only — GT7 has no live position field.
    // raceStartPosition is the GRID position, not current running order.
    // -1 (in a menu) is clamped so the dashboard never shows "P-1".
    position: Math.max(0, t.raceStartPosition || 0),
    positionOf: t.preRaceCarCount || 0,
    carPosition: t.position,

    lap: Math.max(0, t.lapCount),
    lapOf: t.totalLaps,

    tyreTemps,
    brake: Math.round(t.brake),
    throttle: Math.round(t.throttle),
    gear: t.currentGear,
    speed: speedKmh,
    rpm: Math.round(t.engineRpm),
    minAlertRpm: t.minAlertRpm || 0,
    maxAlertRpm: t.maxAlertRpm || 8000,

    fuel,
    currentLapMs: t.currentLap ?? 0,
    lastLapMs,
    bestLapMs,
    steeringWheelAngle,
  };
}
