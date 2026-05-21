import { useQuery } from "@tanstack/react-query";
import { getNextRelease } from "@/services/collections/next-release-service";

export function useNextRelease() {
  return useQuery({
    queryKey: ["next-release"],
    queryFn: getNextRelease,
    refetchInterval: 60000,
  });
}
