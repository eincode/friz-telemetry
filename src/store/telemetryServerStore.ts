import { create } from "zustand";

export type TelemetryServerConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error";

interface TelemetryServerConnectionState {
  status: TelemetryServerConnectionStatus;
  serverUrl: string | null;
  error: Error | null;
  ws: WebSocket | null;

  connect: (url: string, authToken?: string) => void;
  disconnect: () => void;
  /** Internal: used by the telemetry bridge (step 2) to send if open. */
  sendIfOpen: (data: string) => void;
}

export const useTelemetryServerStore = create<TelemetryServerConnectionState>(
  (set, get) => ({
    status: "idle",
    serverUrl: null,
    error: null,
    ws: null,

    connect: (url, authToken) => {
      const existing = get().ws;
      if (existing && existing.readyState === WebSocket.OPEN) {
        return;
      }

      if (existing && existing.readyState === WebSocket.CONNECTING) {
        return;
      }

      if (existing) {
        existing.onclose = null;
        existing.close();
      }

      set({ status: "connecting", serverUrl: url, error: null });

      // Auth mechanism TBD — for now, append as query param if provided.
      // Swap this out once we know what the real server expects
      // (header-based auth isn't available via the RN WebSocket API,
      // so query param or a post-connect auth message are the likely options).
      const fullUrl = authToken
        ? `${url}/driver${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(authToken)}`
        : url;

      const ws = new WebSocket(fullUrl);

      ws.onopen = () => {
        set({ status: "connected", error: null });
      };

      ws.onerror = (e) => {
        set({
          status: "error",
          error: new Error(`WebSocket error for ${url}`),
        });
      };

      ws.onclose = (e) => {
        // Step 3 (reconnect) will hook in here. For now, just reflect
        // the closed state — no auto-retry yet.
        set((state) =>
          state.status === "error" ? state : { status: "idle", ws: null },
        );
      };

      set({ ws });
    },

    disconnect: () => {
      const ws = get().ws;
      if (ws) {
        // Prevent onclose from fighting with the intentional disconnect.
        ws.onclose = null;
        ws.close();
      }
      set({ status: "idle", ws: null, error: null });
    },

    sendIfOpen: (data) => {
      const ws = get().ws;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
      // else: drop silently, per the "freshest data or nothing" decision.
    },
  }),
);
