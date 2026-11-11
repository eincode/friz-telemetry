import { DriverLoading } from "@/components/pages/driver-selection/driver-loading";
import { DriverSelection } from "@/components/pages/driver-selection/driver-selection";
import { EmptyDriver } from "@/components/pages/driver-selection/empty-driver";
import { TitleRow } from "@/components/pages/driver-selection/title-row";
import { Driver } from "@/components/ui/driver-card";
import { TopBar } from "@/components/ui/top-bar";
import { Colors } from "@/constants/theme";
import { useGetDrivers } from "@/hooks/api/useGetDrivers";
import { useJoinSession } from "@/hooks/api/useJoinSession";
import { useConsoleConnectionStore } from "@/store/consoleConnectionStore";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type DriversState = "loading" | "populated" | "empty";
export { Driver } from "@/components/ui/driver-card";

const DASHBOARD_MS = 5000;

export default function DriverSelectionScreen() {
  const insets = useSafeAreaInsets();
  // Field by field: this screen stays mounted under the dashboard, and a
  // whole-store selector would re-render it on every telemetry update.
  const status = useConsoleConnectionStore((s) => s.status);
  const connect = useConsoleConnectionStore((s) => s.connect);
  const router = useRouter();
  const pad: ViewStyle = {
    paddingLeft: Math.max(30, insets.left),
    paddingRight: Math.max(30, insets.right),
  };

  const getDrivers = useGetDrivers();
  const joinSession = useJoinSession();
  const drivers = getDrivers.data ?? [];

  const driverState: DriversState = useMemo(() => {
    if (getDrivers.isLoading) return "loading";
    if (getDrivers.data && getDrivers.data.length === 0) return "empty";
    return "populated";
  }, [getDrivers]);

  const onUseLocal = () => {};

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (interval.current) clearInterval(interval.current);
    },
    [],
  );

  useEffect(() => {
    if (status === "connected") {
      router.push("/RaceDashboard");
    }
  }, [status, router]);

  const confirm = (driver: Driver) => {
    if (driver.hasJoinedSession) return;
    if (selectedId === driver.id) {
      if (timer.current) clearTimeout(timer.current);
      if (interval.current) clearInterval(interval.current);
      setSelectedId(null);
      setCountdown(null);
      return;
    }
    if (selectedId) return;
    setSelectedId(driver.id);
    setCountdown(Math.ceil(DASHBOARD_MS / 1000));
    interval.current = setInterval(
      () =>
        setCountdown((c) => (c == null ? null : Math.max(0, Math.ceil(c - 1)))),
      1000,
    );
    timer.current = setTimeout(() => {
      if (interval.current) clearInterval(interval.current);
      setCountdown(null);
      joinSession.mutate(
        { driverId: Number(driver.id) },
        {
          onSuccess: () => {
            connect();
          },
        },
      );
    }, DASHBOARD_MS);
  };

  const isEmpty = driverState === "empty";
  const isLoading = driverState === "loading";
  const total = drivers.length;

  return (
    <View style={styles.root}>
      <TopBar style={pad} />
      <View style={[styles.body, pad]}>
        <TitleRow
          onBack={router.back}
          isLoading={isLoading}
          driverCount={drivers.length}
          selectedCountdown={countdown}
          joining={joinSession.isPending}
        />

        {isLoading ? (
          <DriverLoading />
        ) : isEmpty ? (
          <EmptyDriver onUseLocal={onUseLocal} />
        ) : (
          <DriverSelection
            drivers={drivers}
            selectedId={selectedId}
            onSelect={confirm}
            total={total}
            disabled={joinSession.isPending}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1, paddingTop: 22, paddingBottom: 24, gap: 16 },
});
