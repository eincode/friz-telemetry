import { useMutation } from "@tanstack/react-query";

import { joinSession, type JoinSessionResponse } from "@/service/joinSession";
import { useServerStore } from "@/store/serverStore";

export function useJoinSession() {
  const serverUrl = useServerStore((s) => s.serverUrl);
  const setToken = useServerStore((s) => s.setToken);

  return useMutation<JoinSessionResponse, Error, { driverId: number }>({
    mutationFn: ({ driverId }) => joinSession(serverUrl!, driverId),
    onSuccess: (data) => setToken(data.token),
  });
}
