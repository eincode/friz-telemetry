import ky from "ky";

import { httpUrl } from "@/utils/serverUrl";

/** Focus keys for 1st–16th place, in order. */
const FOCUS_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w", "e", "r", "t", "y"];

/** How many places the game has a focus key for. */
export const FOCUS_POSITIONS = FOCUS_KEYS.length;

/** Key that focuses the camera on a 1-based place; null past 16th. */
export function focusKey(rank: number): string | null {
  return FOCUS_KEYS[rank - 1] ?? null;
}

/** Sends one key press to the game through the server's director endpoint. */
export async function directorCommand(serverUrl: string, key: string) {
  await ky.post(`${httpUrl(serverUrl)}/director-command`, { json: { key } });
}
