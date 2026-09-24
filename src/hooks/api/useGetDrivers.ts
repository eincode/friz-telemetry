import { useQuery } from "@tanstack/react-query";

import type { Driver } from "@/components/ui/driver-card";
import { getDrivers } from "@/service/getDrivers";
import { useServerStore } from "@/store/serverStore";

export function useGetDrivers() {
  const serverUrl = useServerStore((s) => s.serverUrl);
  return useQuery<Driver[]>({
    queryKey: ["drivers", serverUrl],
    queryFn: () => getDrivers(serverUrl!),
    enabled: !!serverUrl,
  });
}
