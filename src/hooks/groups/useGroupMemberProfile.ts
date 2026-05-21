import { useQuery } from "@tanstack/react-query";
import { getGroupMemberProfile } from "@/services/groups/group-management-service";

export function useGroupMemberProfile(userId: string | null, isOpen: boolean) {
  return useQuery({
    queryKey: ["group-member-profile", userId],
    queryFn: () => {
      if (!userId) throw new Error("Membro nao informado");
      return getGroupMemberProfile(userId);
    },
    enabled: Boolean(userId && isOpen),
  });
}
