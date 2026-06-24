/**
 * ConversationStatusSelector - Seletor de status da conversa
 * Requirement 12.2: Exibir e permitir editar status da conversa
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { conversationService } from "@/services/support/conversation-service";
import type { ConversationStatus } from "@/types/support";
import { getStatusLabel, CONVERSATION_STATUSES } from "@/types/support";
import { log } from "@/lib/logger";

interface ConversationStatusSelectorProps {
  conversationId: string;
  currentStatus: ConversationStatus;
  onUpdate?: (status: ConversationStatus) => void;
}

const STATUS_COLORS: Record<ConversationStatus, string> = {
  new: "bg-blue-500",
  waiting_admin: "bg-yellow-500",
  waiting_customer: "bg-orange-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
};

export function ConversationStatusSelector({
  conversationId,
  currentStatus,
  onUpdate,
}: ConversationStatusSelectorProps) {
  const [status, setStatus] = useState<ConversationStatus>(currentStatus);
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const handleStatusChange = async (newStatus: ConversationStatus) => {
    if (newStatus === status || isUpdating) return;

    try {
      setIsUpdating(true);
      await conversationService.updateStatus(conversationId, newStatus);
      setStatus(newStatus);
      setIsOpen(false);
      onUpdate?.(newStatus);
      toast.success(`Status atualizado para: ${getStatusLabel(newStatus)}`);
    } catch (error) {
      log.error("Erro ao atualizar status da conversa", { error, conversationId, newStatus });
      toast.error("Erro ao atualizar status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={isUpdating}>
          <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
          {getStatusLabel(status)}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuRadioGroup
            value={status}
            onValueChange={(value) => handleStatusChange(value as ConversationStatus)}
          >
            {CONVERSATION_STATUSES.map((s) => (
              <DropdownMenuRadioItem key={s} value={s} disabled={isUpdating}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]}`} />
                  {getStatusLabel(s)}
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
