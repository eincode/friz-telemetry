import ky from "ky";

export interface RosterEntry {
  id: number;
  name: string;
  country: string;
  psnId: string;
}

export interface Session {
  id: string;
  roster: RosterEntry[];
  status: "waiting" | "racing" | "finished";
  mode: "practice" | "qualifying" | "race";
  trackId: string;
  isRecording: boolean;
  createdAt: number;
}

export interface GetSessionResponse {
  session: Session;
}

export function getSession(serverUrl: string) {
  return ky.get(`http://${serverUrl}/session`).json<GetSessionResponse>();
}
