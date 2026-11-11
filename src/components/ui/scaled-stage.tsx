import { useState, type ReactNode } from "react";
import { LayoutChangeEvent, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

/**
 * The content area the dashboard pages are laid out for, in dp — roughly a
 * 6.1" iPhone in landscape, inside the page padding. The fixed column widths
 * and font sizes are tuned to it.
 */
export const STAGE_WIDTH = 750;
export const STAGE_HEIGHT = 350;

/**
 * Lays its children out on a canvas at least {@link STAGE_WIDTH} ×
 * {@link STAGE_HEIGHT} and scales that canvas down to fit the space it's given.
 *
 * Text and box sizes are fixed in dp, so on a screen with fewer dp than the
 * design (a 1080p Android at ~2.6x density is ~730 dp wide, and Android's
 * "Display size" setting shrinks it further — `allowFontScaling` doesn't cover
 * that) the readouts would spill out of their boxes. Scaling the whole canvas
 * keeps every proportion intact instead. Larger screens are left at 1:1 and
 * the canvas just grows, as before.
 */
export function ScaledStage({
  children,
  style,
}: {
  children?: ReactNode;
  /** Applied to the scaled canvas — layout props like `gap` go here. */
  style?: StyleProp<ViewStyle>;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  };

  const scale = size ? Math.min(1, size.w / STAGE_WIDTH, size.h / STAGE_HEIGHT) : 1;

  return (
    <View style={styles.frame} onLayout={onLayout}>
      {size && size.w > 0 && size.h > 0 ? (
        <View
          style={[
            styles.canvas,
            style,
            {
              width: size.w / scale,
              height: size.h / scale,
              transform: [{ scale }],
            },
          ]}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, minWidth: 0, minHeight: 0 },
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
    transformOrigin: "top left",
  },
});
