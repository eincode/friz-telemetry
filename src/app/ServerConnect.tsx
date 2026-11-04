import { FormColumn } from "@/components/pages/server-connect/FormColumn";
import { TitleColumn } from "@/components/pages/server-connect/TitleColumn";
import { TopBar } from "@/components/ui/top-bar";
import { Colors } from "@/constants/theme";
import { useGetSession } from "@/hooks/api/useGetSession";
import { useServerStore } from "@/store/serverStore";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ServerState = "idle" | "connecting" | "error" | "success";

const STATUS: Record<ServerState, { text: string; color: string }> = {
  idle: { text: "STANDBY", color: Colors.textFaint },
  connecting: { text: "HANDSHAKING", color: Colors.accent },
  error: { text: "UNREACHABLE", color: Colors.error },
  success: { text: "LINKED", color: Colors.accent },
};

export default function ServerConnectPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [asDirector, setAsDirector] = useState(false);
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = {
    paddingLeft: Math.max(30, insets.left),
    paddingRight: Math.max(30, insets.right),
  };

  const { isPending, isError, mutate, error, data } = useGetSession();
  const setServerUrl = useServerStore((s) => s.setServerUrl);

  const state: ServerState = useMemo(() => {
    if (isPending) return "connecting";
    if (isError && error) return "error";
    if (data) return "success";
    return "idle";
  }, [isPending, isError, data, error]);

  const status = STATUS[state];
  const handleConnect = () => {
    mutate(
      { serverUrl: address },
      {
        onSuccess: () => {
          setServerUrl(address);
          // A director picks no driver; they watch the session as a whole.
          router.push(asDirector ? "/Director" : "/DriverSelection");
        },
      },
    );
  };

  return (
    <View style={styles.root}>
      <TopBar style={pad} />

      <View style={[styles.body, pad]}>
        <TitleColumn onBack={router.back} status={status} />
        <FormColumn
          state={state}
          address={address}
          onChangeAddress={setAddress}
          onConnect={handleConnect}
          asDirector={asDirector}
          onToggleDirector={() => setAsDirector((v) => !v)}
          errorCode={error?.name}
          errorMessage={error?.message}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  body: { flex: 1, flexDirection: "row" },
});
