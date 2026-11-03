import ky from "ky";

import { httpUrl } from "@/utils/serverUrl";

export interface JoinSessionResponse {
  token: string;
  driverId: number;
  name: string;
  psnId: string;
}

export function joinSession(serverUrl: string, driverId: number) {
  return ky.post(`${httpUrl(serverUrl)}/driver/join`, { json: { driverId } }).json<JoinSessionResponse>();
}
