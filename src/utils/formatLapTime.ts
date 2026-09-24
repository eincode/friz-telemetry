/** M:SS.sss — the format the HUD is designed around. */
export function formatLapTime(ms: number | null): string {
  if (ms == null) return "--:--.---";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const f = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(f).padStart(3, "0")}`;
}
