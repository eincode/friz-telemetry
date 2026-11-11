import { Telemetry } from "@/app/RaceDashboard";
import { Vec3 } from "@/utils/telemetry.ts/types";

import { useConsoleConnectionStore } from "@/store/consoleConnectionStore";
import { mapToTelemetry } from "@/utils/telemetry.ts/mapToTelemetry";

const DEFAULT_TELEMETRY: Telemetry = {
  position: 0,
  positionOf: 0,
  carPosition: { x: 0, y: 0, z: 0 } as Vec3,
  lap: 0,
  lapOf: 0,
  tyreTemps: { FL: 0, FR: 0, RL: 0, RR: 0 },
  brake: 0,
  throttle: 0,
  gear: 0,
  speed: 0,
  rpm: 0,
  minAlertRpm: 0,
  maxAlertRpm: 8000,
  fuel: 0,
  currentLapMs: 0,
  lastLapMs: null,
  bestLapMs: null,
  lapDeltaMs: null,
  steeringWheelAngle: 0,
};

export function useTelemetryMapped(): Telemetry {
  // Only these two fields: selecting the whole store would re-render on
  // every unrelated update too.
  const telemetry = useConsoleConnectionStore((s) => s.telemetry);
  const lapDeltaMs = useConsoleConnectionStore((s) => s.lapDeltaMs);

  if (!telemetry) return DEFAULT_TELEMETRY;
  return { ...mapToTelemetry(telemetry), lapDeltaMs };
}
