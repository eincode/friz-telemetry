import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Action } from "@/components/pages/Welcome/Action";
import { Branding } from "@/components/pages/Welcome/Branding";
import { AmbientGraph } from "@/components/ui/ambient-graph";
import { TopBar } from "@/components/ui/top-bar";
import { WebBadge } from "@/components/web-badge";
import { Colors } from "@/constants/theme";
import { useConsoleConnectionStore } from "@/store/consoleConnectionStore";

const queryClient = new QueryClient();

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Field by field: this screen stays mounted under the dashboard, and a
  // whole-store selector would re-render it on every telemetry update.
  const status = useConsoleConnectionStore((s) => s.status);
  const connect = useConsoleConnectionStore((s) => s.connect);
  const disconnect = useConsoleConnectionStore((s) => s.disconnect);
  const pad: ViewStyle = {
    paddingLeft: Math.max(30, insets.left),
    paddingRight: Math.max(30, insets.right),
  };

  useEffect(() => {
    if (status === "connected") {
      router.push("/RaceDashboard");
    }
  }, [status, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.root}>
        <TopBar style={pad} />
        <View style={[styles.body, pad]}>
          <AmbientGraph />

          <Branding />

          <Action
            onStartTelemetry={() => {
              if (status === "error") disconnect();
              connect();
            }}
            onServerConnect={() => router.push("/ServerConnect")}
          />
        </View>
        {Platform.OS === "web" && <WebBadge />}
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    flexDirection: "row",
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  root: { flex: 1, backgroundColor: Colors.background },

  body: { flex: 1, flexDirection: "row" },
});
