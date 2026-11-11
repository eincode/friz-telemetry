// Fuel consumption for the fuel management box: a live burn rate over a
// rolling wall-clock window, and fuel burnt per completed lap. Tracked here,
// from every packet, rather than in the component, so the measurements keep
// building while the page showing them is not rendered.

/** How often the burn rate is resampled. */
const TICK_MS = 10_000;
/** Rolling window for the live burn rate — 12 ticks is two minutes. */
const WINDOW_SAMPLES = 12;
/** How many recent laps the per-lap average is taken over. */
const ROLLING_LAPS = 5;
/** Fuel rising by more than this between samples means the car was refuelled. */
const REFUEL_EPSILON = 0.05;

interface FuelSample {
  t: number;
  fuel: number;
}

export interface FuelStats {
  /** % per ms, or null while the car is stationary or the window is short. */
  ratePerMs: number | null;
  /** Tank level as of the last sample — projections step with it. */
  sampledFuel: number;
  /** When that level was read — the anchor the countdown runs down from. */
  sampledAt: number;
  /** Average % burnt per completed lap, null until a whole lap is logged. */
  perLap: number | null;
  /** Laps that average is taken over. */
  laps: number;
}

export class FuelTracker {
  private samples: FuelSample[] = [];
  private prevLap: number | null = null;
  private lapStartFuel = 0;
  private usage: number[] = [];
  /**
   * Only laps seen start-to-finish count: the lap in progress when tracking
   * starts is already part-run, and the 0 -> 1 change is the race starting.
   */
  private armed = false;

  reset() {
    this.samples = [];
    this.prevLap = null;
    this.lapStartFuel = 0;
    this.usage = [];
    this.armed = false;
  }

  /**
   * Feed one on-track packet: tank level 0–100 and lap count. Returns fresh
   * stats when they changed (a new sample or a lap boundary), else null.
   */
  feed(fuel: number, lap: number, now: number): FuelStats | null {
    const sampled = this.sample(fuel, now);
    const lapped = this.lap(fuel, lap);
    return sampled || lapped ? this.stats() : null;
  }

  /**
   * Burn rate sampled on a 10 s clock rather than at lap boundaries, so there
   * is a usable rate a few seconds into the first lap, and the readouts step
   * once per tick instead of flickering at telemetry rate.
   */
  private sample(fuel: number, now: number): boolean {
    const last = this.samples[this.samples.length - 1];
    if (last && now - last.t < TICK_MS) return false;
    // A refuel invalidates every sample before it.
    const base = last && fuel > last.fuel + REFUEL_EPSILON ? [] : this.samples;
    this.samples = [...base, { t: now, fuel }].slice(-WINDOW_SAMPLES);
    return true;
  }

  private lap(fuel: number, lap: number): boolean {
    if (this.prevLap === null) {
      this.prevLap = lap;
      this.lapStartFuel = fuel;
      return false;
    }
    if (lap === this.prevLap) return false;

    const prevLap = this.prevLap;
    const used = this.lapStartFuel - fuel;
    this.prevLap = lap;
    this.lapStartFuel = fuel;

    if (lap < prevLap) {
      // Counter went backwards — new session, so the old rate is meaningless.
      this.usage = [];
      this.armed = false;
    } else if (prevLap === 0) {
      // Lights out. 0 -> 1 starts lap 1, it doesn't complete a lap: whatever
      // was burnt sitting on the grid says nothing about racing consumption.
      // Lap 1 is run in full from here, so it becomes the first measurement.
      this.armed = true;
    } else if (!this.armed) {
      // Joined mid-lap, so this boundary is the first whole lap's start.
      this.armed = true;
    } else if (used > 0) {
      // A negative delta means the car was refuelled; that lap tells us nothing.
      this.usage = [...this.usage, used].slice(-ROLLING_LAPS);
    }
    return true;
  }

  private stats(): FuelStats {
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const elapsed = this.samples.length >= 2 ? last.t - first.t : 0;
    const burnt = this.samples.length >= 2 ? first.fuel - last.fuel : 0;
    return {
      ratePerMs: elapsed > 0 && burnt > 0 ? burnt / elapsed : null,
      sampledFuel: last.fuel,
      sampledAt: last.t,
      perLap: this.usage.length > 0 ? this.usage.reduce((sum, u) => sum + u, 0) / this.usage.length : null,
      laps: this.usage.length,
    };
  }
}
