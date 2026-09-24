import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/theme";

const CUT = 14; // corner-cut size — RN has no clip-path, so we overlay bg-colored triangles

export type Corner = "tl" | "tr" | "bl" | "br";

type CornerConfig = {
  pos: { left?: number; top?: number; right?: number; bottom?: number };
  top: 0 | 1;
  bottom: 0 | 1;
  left: 0 | 1;
  right: 0 | 1;
  colorEdge: "top" | "bottom" | "left" | "right";
};

const CORNERS: Record<Corner, CornerConfig> = {
  tl: {
    pos: { left: 0, top: 0 },
    top: 0,
    bottom: 1,
    left: 1,
    right: 0,
    colorEdge: "left",
  },
  tr: {
    pos: { right: 0, top: 0 },
    top: 0,
    bottom: 1,
    left: 0,
    right: 1,
    colorEdge: "right",
  },
  bl: {
    pos: { left: 0, bottom: 0 },
    top: 1,
    bottom: 0,
    left: 1,
    right: 0,
    colorEdge: "left",
  },
  br: {
    pos: { right: 0, bottom: 0 },
    top: 1,
    bottom: 0,
    left: 0,
    right: 1,
    colorEdge: "right",
  },
};

export function CornerCut({
  corner = "tl",
  size = CUT,
  color = Colors.background,
}: {
  corner?: Corner;
  size?: number;
  color?: string;
}) {
  const conf = CORNERS[corner];
  return (
    <View
      pointerEvents="none"
      style={[
        styles.cut,
        conf.pos,
        {
          borderTopWidth: size * conf.top,
          borderBottomWidth: size * conf.bottom,
          borderLeftWidth: size * conf.left,
          borderRightWidth: size * conf.right,
          borderTopColor: conf.colorEdge === "top" ? color : "transparent",
          borderBottomColor:
            conf.colorEdge === "bottom" ? color : "transparent",
          borderLeftColor: conf.colorEdge === "left" ? color : "transparent",
          borderRightColor: conf.colorEdge === "right" ? color : "transparent",
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  cut: { position: "absolute", width: 0, height: 0 },
});
