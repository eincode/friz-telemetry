import { StyleSheet, View } from "react-native";

import type { TyreCorner } from "@/app/RaceDashboard";
import { FuelManagementBox } from "@/components/pages/race-dashboard/fuel-management-box";
import { InputPanel } from "@/components/pages/race-dashboard/input-panel";
import { TyreBox } from "@/components/pages/race-dashboard/tyre-box";

export function ManagerScreen({
  throttle,
  brake,
  tyreTemps,
  fuel,
  lastLapMs,
  bestLapMs,
}: {
  throttle: number;
  brake: number;
  tyreTemps: Record<TyreCorner, number>;
  fuel: number;
  lastLapMs: number | null;
  bestLapMs: number | null;
}) {
  return (
    <View style={styles.root}>
      <InputPanel throttle={throttle} brake={brake} />

      <View style={styles.body}>
        <View style={styles.leftCol}>
          <TyreBox
            flTemp={tyreTemps.FL}
            frTemp={tyreTemps.FR}
            rrTemp={tyreTemps.RR}
            rlTemp={tyreTemps.RL}
            fill
          />
        </View>

        <FuelManagementBox
          fuel={fuel}
          lastLapMs={lastLapMs}
          bestLapMs={bestLapMs}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 9 },
  body: { flex: 1, minHeight: 0, flexDirection: "row", gap: 9 },
  /** The box fills this column, so it spans down to the bottom-left corner. */
  leftCol: { width: 216, minHeight: 0 },
});
