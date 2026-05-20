import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { membershipService } from "@/lib/services/membershipService";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { MemberDetailsDrawer } from "./MemberDetailsDrawer";
import { ImportMembersDialog } from "./ImportMembersDialog";
import type { PaginatedMembers } from "@/types/groups";

interface GroupMembersSidebarProps {
  groupId: string;
}

type GroupMemberListItem = PaginatedMembers["members"][number];

export function GroupMembersSidebar({ groupId }: GroupMembersSidebarProps) {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => membershipService.listMembers(groupId),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const members = data?.members || [];

  // Apenas o admin (usuário logado) está online
  const onlineMembers = members.filter((m) => m.user_id === user?.id);
  const offlineMembers = members.filter((m) => m.user_id !== user?.id);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const MemberItem = ({ member, isOnline }: { member: GroupMemberListItem; isOnline: boolean }) => {
    const initials = member.user_name
      ? member.user_name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : member.user_email?.slice(0, 2).toUpperCase() || "??";

    return (
      <button
        onClick={() => setSelectedUserId(member.user_id)}
        className="w-full flex items-center gap-3 p-2 hover:bg-accent rounded-lg transition-colors cursor-pointer"
      >
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={cn(isOnline ? "bg-green-100 text-green-700" : "bg-muted")}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
              isOnline ? "bg-green-500" : "bg-gray-400"
            )}
          />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium truncate">
            {member.user_name || member.user_email || "Usuário"}
          </p>
          <p className="text-xs text-muted-foreground truncate">{member.user_email}</p>
        </div>
      </button>
    );
  };

  return (
    <>
      <div className="p-4 space-y-4">
        {/* Header with Import Button */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Membros ({members.length})</h3>
          <ImportMembersDialog groupId={groupId} />
        </div>

        {/* Online Members */}
        {onlineMembers.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-2">
              Online ({onlineMembers.length})
            </h3>
            <div className="space-y-1">
              {onlineMembers.map((member) => (
                <MemberItem key={member.user_id} member={member} isOnline={true} />
              ))}
            </div>
          </div>
        )}

        {/* Offline Members */}
        {offlineMembers.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-2">
              Offline ({offlineMembers.length})
            </h3>
            <div className="space-y-1">
              {offlineMembers.map((member) => (
                <MemberItem key={member.user_id} member={member} isOnline={false} />
              ))}
            </div>
          </div>
        )}

        {members.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum membro neste grupo
          </p>
        )}
      </div>

      {/* Member Details Drawer */}
      <MemberDetailsDrawer
        userId={selectedUserId}
        isOpen={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
      />
    </>
  );
}
