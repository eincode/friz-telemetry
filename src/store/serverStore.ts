import { create } from "zustand";

interface ServerStore {
  serverUrl: string | null;
  token: string | null;
  driverId: number | null;
  driverName: string | null;
  psnId: string | null;
  setServerUrl: (url: string) => void;
  setToken: (token: string) => void;
  setDriver: (d: { driverId: number; name: string; psnId: string }) => void;
}

export const useServerStore = create<ServerStore>()((set) => ({
  serverUrl: null,
  token: null,
  driverId: null,
  driverName: null,
  psnId: null,
  setServerUrl: (url) => set({ serverUrl: url }),
  setToken: (token) => set({ token }),
  setDriver: ({ driverId, name, psnId }) =>
    set({ driverId, driverName: name, psnId }),
}));
