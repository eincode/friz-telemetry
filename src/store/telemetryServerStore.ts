import { create } from "zustand";

export type TelemetryServerConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  /** The socket dropped mid-session; a retry is pending or in flight. */
  | "reconnecting"
  | "error";

interface TelemetryServerConnectionState {
  status: TelemetryServerConnectionStatus;
  serverUrl: string | null;
  error: Error | null;
  ws: WebSocket | null;
  /**
   * True while telemetry is actually going out: the socket is open and a
   * packet was sent within the last SENDING_STALE_MS. Flips only on change,
   * so subscribers don't re-render per packet.
   */
  sending: boolean;

  connect: (url: string, authToken?: string) => void;
  disconnect: () => void;
  /** Internal: used by the telemetry bridge (step 2) to send if open. */
  sendIfOpen: (data: string | Uint8Array) => void;
}

/** No send for this long and the link counts as idle. */
const SENDING_STALE_MS = 1000;

let lastSentAt = 0;
let staleHandle: ReturnType<typeof setTimeout> | null = null;

function clearStaleTimer() {
  if (staleHandle) {
    clearTimeout(staleHandle);
    staleHandle = null;
  }
}

/** Reconnect backoff: 1s, 2s, 4s, … capped at RECONNECT_MAX_MS. */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 10000;

/** Where to reconnect to; set by connect, cleared by disconnect. */
let target: { url: string; authToken?: string } | null = null;
let retryAttempt = 0;
let retryHandle: ReturnType<typeof setTimeout> | null = null;

function clearRetryTimer() {
  if (retryHandle) {
    clearTimeout(retryHandle);
    retryHandle = null;
  }
}

function detach(ws: WebSocket) {
  ws.onopen = null;
  ws.onerror = null;
  ws.onclose = null;
  ws.close();
}

export const useTelemetryServerStore = create<TelemetryServerConnectionState>(
  (set, get) => {
    /** Opens a socket to `target`; drops are retried until disconnect. */
    const open = () => {
      if (!target) return;
      const { url, authToken } = target;

      // Auth mechanism TBD — for now, append as query param if provided.
      // Swap this out once we know what the real server expects
      // (header-based auth isn't available via the RN WebSocket API,
      // so query param or a post-connect auth message are the likely options).
      const fullUrl = authToken
        ? `${url}/driver${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(authToken)}`
        : url;

      const ws = new WebSocket(fullUrl);

      ws.onopen = () => {
        retryAttempt = 0;
        set({ status: "connected", error: null });
      };

      // RN usually fires onerror then onclose; whichever comes first handles
      // the drop and detaches the socket so the other is a no-op.
      ws.onerror = () => onDrop(ws, new Error(`WebSocket error for ${url}`));
      ws.onclose = () => onDrop(ws, null);

      set({ ws });
    };

    const onDrop = (ws: WebSocket, error: Error | null) => {
      if (get().ws !== ws) return;
      detach(ws);
      clearStaleTimer();
      if (!target) {
        set({ status: "idle", ws: null, sending: false, error });
        return;
      }
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** retryAttempt, RECONNECT_MAX_MS);
      retryAttempt += 1;
      set({ status: "reconnecting", ws: null, sending: false, error });
      retryHandle = setTimeout(() => {
        retryHandle = null;
        open();
      }, delay);
    };

    return {
      status: "idle",
      serverUrl: null,
      error: null,
      ws: null,
      sending: false,

      connect: (url, authToken) => {
        target = { url, authToken };
        const existing = get().ws;
        if (
          existing &&
          (existing.readyState === WebSocket.OPEN ||
            existing.readyState === WebSocket.CONNECTING)
        ) {
          return;
        }
        // An explicit connect (e.g. app back in the foreground) skips any
        // pending backoff and tries right away.
        clearRetryTimer();
        retryAttempt = 0;
        set({ status: "connecting", serverUrl: url, error: null });
        open();
      },

      disconnect: () => {
        target = null;
        clearRetryTimer();
        retryAttempt = 0;
        const ws = get().ws;
        // Handlers are detached first so the close isn't treated as a drop.
        if (ws) detach(ws);
        clearStaleTimer();
        set({ status: "idle", ws: null, error: null, sending: false });
      },

      sendIfOpen: (data) => {
        const ws = get().ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(data);
          lastSentAt = Date.now();
          if (!get().sending) set({ sending: true });
          // One pending timer at a time; when it fires early it re-arms for the
          // remainder instead of being reset on every packet.
          if (!staleHandle) {
            const check = () => {
              const idle = Date.now() - lastSentAt;
              if (idle >= SENDING_STALE_MS) {
                staleHandle = null;
                set({ sending: false });
              } else {
                staleHandle = setTimeout(check, SENDING_STALE_MS - idle);
              }
            };
            staleHandle = setTimeout(check, SENDING_STALE_MS);
          }
        }
        // else: drop silently, per the "freshest data or nothing" decision.
      },
    };
  },
);
