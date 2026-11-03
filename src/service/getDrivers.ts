import ky from "ky";

import type { Driver } from "@/components/ui/driver-card";

export interface ApiDriver {
  id: number;
  name: string;
  country: string;
  psnId: string;
  carCode: number;
  connected: boolean;
  lastSeen: number;
}

export interface GetDriversResponse {
  drivers: ApiDriver[];
}

export function getDrivers(serverUrl: string) {
  return ky
    .get(`http://${serverUrl}/drivers`)
    .json<GetDriversResponse>()
    .then(({ drivers }) =>
      drivers.map(
        (d): Driver => ({
          id: String(d.id),
          fullName: d.name,
          psnId: d.psnId ?? "",
          hasJoinedSession: d.connected,
        }),
      ),
    );
}
