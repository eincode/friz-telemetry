import { useMutation } from "@tanstack/react-query";

import { directorCommand } from "@/service/directorCommand";
import { useServerStore } from "@/store/serverStore";

export function useDirectorCommand() {
  const serverUrl = useServerStore((s) => s.serverUrl);

  return useMutation<void, Error, { key: string }>({
    mutationFn: ({ key }) => directorCommand(serverUrl!, key),
  });
}
