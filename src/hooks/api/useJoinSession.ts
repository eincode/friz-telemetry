import { useMutation } from "@tanstack/react-query";

import { joinSession, type JoinSessionResponse } from "@/service/joinSession";
import { useServerStore } from "@/store/serverStore";

export function useJoinSession() {
  const serverUrl = useServerStore((s) => s.serverUrl);
  const setToken = useServerStore((s) => s.setToken);
  const setDriver = useServerStore((s) => s.setDriver);

  return useMutation<JoinSessionResponse, Error, { driverId: number }>({
    mutationFn: ({ driverId }) => joinSession(serverUrl!, driverId),
    onSuccess: (data) => {
      setToken(data.token);
      setDriver({
        driverId: data.driverId,
        name: data.name,
        psnId: data.psnId ?? "",
      });
    },
  });
}
