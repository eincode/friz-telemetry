import { GT7Connection, startGT7Discovery } from "@/utils/telemetry.ts/socket";
import { GT7Telemetry } from "@/utils/telemetry.ts/types";
import { Buffer } from "buffer";
import { create } from "zustand";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface ConsoleConnectionState {
  status: ConnectionStatus;
  connectedIp: string | null;
  error: Error | null;
  telemetry: GT7Telemetry | null;
  rawTelemetry: Buffer | null;
  connect: (initialIp?: string) => void;
  disconnect: () => void;
}

const FIRST_PACKET_TIMEOUT_MS = 8000;

let conn: GT7Connection | null = null;
let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

export const useConsoleConnectionStore = create<ConsoleConnectionState>(
  (set, get) => ({
    status: "idle",
    connectedIp: null,
    error: null,
    telemetry: null,
    rawTelemetry: null,

    connect: () => {
      if (conn) return;

      set({ status: "connecting", error: null });

      conn = startGT7Discovery(
        (data) => {
          set({ telemetry: data });
          if (get().status === "connecting") {
            set({ status: "connected" });
          }
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
          }
        },
        (rawTelemetry) => {
          set({ rawTelemetry: rawTelemetry });
        },
        (ip) => {
          set({ connectedIp: ip });
        },
        (err) => {
          set({ error: err, status: "error" });
        },
      );

      conn.start();

      timeoutHandle = setTimeout(() => {
        if (get().status === "connecting") {
          set({
            status: "error",
            error: new Error(
              "No response from GT7 — check the console is on track and telemetry is enabled.",
            ),
          });
        }
      }, FIRST_PACKET_TIMEOUT_MS);
    },

    disconnect: () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      conn?.close();
      conn = null;
      set({ status: "idle", connectedIp: null, telemetry: null, error: null });
    },
  }),
);
