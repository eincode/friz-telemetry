import type { InputSample } from "@/components/pages/race-dashboard/input-trace";

// Rolling pedal history for the input trace. Recorded here, from every
// packet, rather than in the trace component, so the history keeps building
// while the page showing it is not rendered.

export const INPUT_SAMPLE_MS = 50;
/** 200 samples at 50 ms — a rolling 10 s window. */
export const INPUT_TRACE_SAMPLES = 200;

const EMPTY: InputSample[] = [];

class InputHistoryRecorder {
  private samples: InputSample[] = EMPTY;
  private lastSampleAt = 0;
  private listeners = new Set<() => void>();

  /**
   * Takes a sample when INPUT_SAMPLE_MS has passed since the last one, so the
   * trace runs on a real time axis whatever the packet rate.
   */
  feed(throttle: number, brake: number, now: number) {
    if (now - this.lastSampleAt < INPUT_SAMPLE_MS) return;
    this.lastSampleAt = now;
    // A new array each time, so subscribers can tell the history changed.
    const next =
      this.samples.length >= INPUT_TRACE_SAMPLES
        ? this.samples.slice(this.samples.length - INPUT_TRACE_SAMPLES + 1)
        : this.samples.slice();
    next.push({ throttle, brake });
    this.samples = next;
    this.listeners.forEach((l) => l());
  }

  reset() {
    this.samples = EMPTY;
    this.lastSampleAt = 0;
    this.listeners.forEach((l) => l());
  }

  /** For useSyncExternalStore. */
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.samples;
}

export const inputHistory = new InputHistoryRecorder();
