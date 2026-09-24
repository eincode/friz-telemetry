import ky from "ky";

export interface JoinSessionResponse {
  token: string;
  driverId: number;
  name: string;
}

export function joinSession(serverUrl: string, driverId: number) {
  return ky
    .post(`http://${serverUrl}/driver/join`, { json: { driverId } })
    .json<JoinSessionResponse>();
}
