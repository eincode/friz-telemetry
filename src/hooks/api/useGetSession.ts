import { useMutation } from "@tanstack/react-query";

import { getSession, type GetSessionResponse } from "@/service/getSession";

export function useGetSession() {
  return useMutation<GetSessionResponse, Error, { serverUrl: string }>({
    mutationFn: ({ serverUrl }) => getSession(serverUrl),
  });
}
