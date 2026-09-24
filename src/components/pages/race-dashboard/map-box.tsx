import { Box } from "@/components/pages/race-dashboard/box";
import { Colors, HUE } from "@/constants/theme";
import { Vec3 } from "@/utils/telemetry.ts/types";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

const TRACK_MAP = require("@/assets/images/tracks/trial-mountain.png");

/**
 * Trial Mountain calibration — similarity transform from GT7 world coords to
 * normalized map-image coords, fitted over start/finish + sector 1/2 markers.
 * scale 0.60558 px/unit, rotation 0.133°, image 1174×481, max residual ≈ 2 px.
 */
const CALIBRATION = {
  scaleX: 0.0005158248,
  shearXZ: -0.0000011974,
  offsetX: 0.5068228279,
  shearZX: 0.0000029225,
  scaleZ: 0.0012589987,
  offsetZ: 0.5109147609,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function MapBox({ carPosition }: { carPosition: Vec3 }) {
  const left =
    clamp01(
      CALIBRATION.scaleX * carPosition.x +
        CALIBRATION.shearXZ * carPosition.z +
        CALIBRATION.offsetX,
    ) * 100;
  const top =
    clamp01(
      CALIBRATION.shearZX * carPosition.x +
        CALIBRATION.scaleZ * carPosition.z +
        CALIBRATION.offsetZ,
    ) * 100;

  return (
    <Box hue="steering" label="TRIAL MOUNTAIN" style={styles.box}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
      >
        <View style={styles.mapWrap}>
          <Image source={TRACK_MAP} style={styles.map} />
          <View style={[styles.carDot, { left: `${left}%`, top: `${top}%` }]} />
        </View>
      </View>
    </Box>
  );
}

const styles = StyleSheet.create({
  box: {
    borderColor: HUE.steering.border,
    flex: 1,
  },
  mapWrap: {
    width: "100%",
    alignSelf: "center",
  },
  map: {
    width: "100%",
    aspectRatio: 1174 / 481,
  },
  carDot: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    borderColor: "rgba(255,255,255,0.9)",
    borderWidth: 1.5,
    marginLeft: -7,
    marginTop: -7,
  },
});
