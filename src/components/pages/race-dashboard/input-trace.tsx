import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";

/** One sampled pedal reading. Both channels are 0–100. */
export interface InputSample {
  throttle: number;
  brake: number;
}

export const PEDAL_TRACE = {
  throttle: { stroke: "#57C489", fill: "rgba(87,196,137,0.16)" },
  brake: { stroke: "#FF6E5E", fill: "rgba(255,110,94,0.16)" },
} as const;

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/**
 * Builds the polyline for one channel in pixel space — the trace is drawn at
 * measured size rather than through a stretched viewBox, so strokes stay even.
 * Samples are right-aligned: the newest reading sits on the right edge and a
 * partly filled window grows in from there.
 */
function buildPath(
  values: number[],
  capacity: number,
  w: number,
  h: number,
  close: boolean,
) {
  if (values.length < 2) return "";

  const step = w / (capacity - 1);
  const offset = capacity - values.length;
  const x = (i: number) => (offset + i) * step;
  const y = (v: number) => h - (clamp(v) / 100) * h;

  let d = `M${x(0).toFixed(2)} ${y(values[0]).toFixed(2)}`;
  for (let i = 1; i < values.length; i++) {
    d += ` L${x(i).toFixed(2)} ${y(values[i]).toFixed(2)}`;
  }
  if (close) {
    const last = x(values.length - 1).toFixed(2);
    d += ` L${last} ${h.toFixed(2)} L${x(0).toFixed(2)} ${h.toFixed(2)} Z`;
  }
  return d;
}

export function InputTrace({
  history,
  capacity,
}: {
  history: InputSample[];
  capacity: number;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  };

  const { w, h } = size;
  const throttle = history.map((s) => s.throttle);
  const brake = history.map((s) => s.brake);

  return (
    <View style={styles.stage} onLayout={onLayout}>
      {w > 0 && h > 0 ? (
        <Svg width={w} height={h}>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line
              key={f}
              x1={0}
              y1={h * f}
              x2={w}
              y2={h * f}
              stroke="#20252B"
              strokeWidth={1}
            />
          ))}

          <Path
            d={buildPath(brake, capacity, w, h, true)}
            fill={PEDAL_TRACE.brake.fill}
          />
          <Path
            d={buildPath(throttle, capacity, w, h, true)}
            fill={PEDAL_TRACE.throttle.fill}
          />
          <Path
            d={buildPath(brake, capacity, w, h, false)}
            stroke={PEDAL_TRACE.brake.stroke}
            strokeWidth={1.5}
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d={buildPath(throttle, capacity, w, h, false)}
            stroke={PEDAL_TRACE.throttle.stroke}
            strokeWidth={1.5}
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#15181C",
    borderWidth: 1,
    borderColor: "#23272C",
    overflow: "hidden",
  },
});
