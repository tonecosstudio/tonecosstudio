import { useQuery } from "@tanstack/react-query";
import { groupService } from "@/services/groups/group-service";

export function useMemberGroupDetails(groupId?: string) {
  return useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupService.getGroupById(groupId!),
    enabled: Boolean(groupId),
  });
}
