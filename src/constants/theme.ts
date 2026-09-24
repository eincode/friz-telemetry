/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

export const Colors = {
  white: "#FFF",
  primary: "#2ED8FF",
  error: "#ff4d3d",
  background: "#0a0c0f",
  panel: "#0e1217",
  hairline: "#232a32",
  hairlineDim: "#171c22",
  divider: "#1b2028",
  borderPressed: "#3a444f",
  text: "#f2f5f8",
  textBright: "#dce3ea",
  textMuted: "#c7cfd8",
  textDim: "#8a929c",
  textSecondary: "#959ea8",
  textTertiary: "#6b7580",
  textFaint: "#5d6771",
  textQuiet: "#4e5761",
  accent: "#2ED8FF",
  accentDeep: "#0fa8ce",
  accentFg: "#04141a",
  accentFaint: "rgba(46,216,255,0.05)",
  accentDim: "rgba(46,216,255,0.10)",
  accentSoft: "rgba(46,216,255,0.16)",
  signalDim: "#2a3138",
  controlBorder: "#3d464f",
  textInput: "#eaeff4",
  textSoft: "#79828c",
  textSubtle: "#454e58",
  errorBright: "#ff9c92",
  errorMuted: "#c6b0ac",
  errorFaint: "rgba(255,77,61,0.06)",
  success: "#3ddc84",
  warn: "#f5c542",
} as const;

export type ThemeColor = keyof typeof Colors;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Per-box accent hues for telemetry panels (border + label). */
export const HUE = {
  position: { border: "#4A3A1E", label: "#B58C3C" },
  lap: { border: "#3B2F52", label: "#9B85C8" },
  tyres: { border: "#1C4A52", label: "#5FB9C6" },
  fuel: { border: "#4C4520", label: "#C6B24A" },
  drive: { border: "#1D4E5A", label: "#5FB9C6" },
  times: { border: "#24405E", label: "#7BA6D6" },
  brake: { border: "#5A2823", label: "#E0705F" },
  throttle: { border: "#1F5233", label: "#57C489" },
  steering: { border: "#33404B", label: "#9AAAB8" },
} as const;

export type TyreBandName = "COLD" | "OPTIMAL" | "OVERHEAT";

export const BANDS = {
  COLD: {
    bg: "rgba(56,132,255,0.16)",
    border: "rgba(86,150,255,0.42)",
    label: "#93B8FF",
  },
  OPTIMAL: {
    bg: "rgba(38,190,110,0.16)",
    border: "rgba(52,214,128,0.42)",
    label: "#7BE0AC",
  },
  OVERHEAT: {
    bg: "rgba(255,70,52,0.18)",
    border: "rgba(255,96,78,0.46)",
    label: "#FF9C8E",
  },
} as const;

/** blue < 70°, green 70–95°, red > 95° */
export function tyreBand(temp: number): TyreBandName {
  if (temp < 70) return "COLD";
  if (temp <= 95) return "OPTIMAL";
  return "OVERHEAT";
}

export type DirectorKind = "info" | "warning" | "penalty";

export const DIRECTOR_STYLE: Record<
  DirectorKind,
  { code: string; color: string; border: string; stripe: string }
> = {
  info: {
    code: "INFO",
    color: "#8CD8FF",
    border: "#1D4E5A",
    stripe: "#2ED8FF",
  },
  warning: {
    code: "WARN",
    color: "#FFC44A",
    border: "#5A4718",
    stripe: "#FFC44A",
  },
  penalty: {
    code: "PEN",
    color: "#FF6E5E",
    border: "#5A2823",
    stripe: "#FF4638",
  },
};
