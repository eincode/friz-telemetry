import { create } from "zustand";

interface ServerStore {
  serverUrl: string | null;
  token: string | null;
  setServerUrl: (url: string) => void;
  setToken: (token: string) => void;
}

export const useServerStore = create<ServerStore>()((set) => ({
  serverUrl: null,
  token: null,
  setServerUrl: (url) => set({ serverUrl: url }),
  setToken: (token) => set({ token }),
}));
