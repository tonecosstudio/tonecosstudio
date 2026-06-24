import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Bell, Clock3, MessageSquare, PanelRightOpen, User } from "lucide-react";
import type { ConversationReminder } from "@/lib/reminder-service";
import type { Conversation } from "@/types/support";
import { getStatusLabel } from "@/types/support";
import { log } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PromisedDatePicker } from "../delivery/PromisedDatePicker";
import { RiskFlagManager } from "../notifications/RiskFlagManager";
import { ReminderScheduler } from "./ReminderScheduler";
import { ConversationStatusSelector } from "./ConversationStatusSelector";
import { ConversationTagsSelector } from "./ConversationTagsSelector";

interface ChatHeaderProps {
  conversationId: string;
  conversation?: Conversation;
  onUserClick?: (userId: string) => void;
  onReminderCreated?: (reminder: ConversationReminder) => void;
  onConversationUpdate?: () => void;
  onToggleSidebar?: () => void;
}

export function ChatHeader({
  conversationId,
  conversation,
  onUserClick,
  onReminderCreated,
  onConversationUpdate,
  onToggleSidebar,
}: ChatHeaderProps) {
  const [reminderModalOpen, setReminderModalOpen] = useState(false);

  const handleUserClick = () => {
    if (conversation?.user_id && onUserClick) {
      onUserClick(conversation.user_id);
    }
  };

  const handleUpdate = () => {
    onConversationUpdate?.();
  };

  const unreadCount = conversation?.unread_count || 0;
  const hasUnread = unreadCount > 0;
  const hasRisk = (conversation?.risk_flags || []).length > 0;
  const isOverdue = Boolean(conversation?.is_overdue);
  const lastActivityLabel = conversation?.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), {
        addSuffix: true,
        locale: ptBR,
      })
    : null;

  return (
    <>
      <div className="border-b bg-background">
        <div className="flex flex-col gap-3 p-4 pb-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2
                className={`text-lg font-semibold ${
                  conversation?.user_id && onUserClick
                    ? "cursor-pointer transition-colors hover:text-primary"
                    : ""
                }`}
                onClick={handleUserClick}
                title={conversation?.user_id && onUserClick ? "Abrir ficha do cliente" : undefined}
              >
                {conversation?.user_name || conversation?.user_email || "Conversa"}
              </h2>
              {conversation?.user_id && onUserClick && (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {conversation?.subject && (
              <p className="text-sm text-muted-foreground">{conversation.subject}</p>
            )}
            {conversation && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">{getStatusLabel(conversation.status)}</Badge>
                {hasUnread && (
                  <Badge variant="default">
                    <MessageSquare className="mr-1 h-3 w-3" />
                    {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                  </Badge>
                )}
                {hasRisk && (
                  <Badge variant="destructive">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Com risco
                  </Badge>
                )}
                {isOverdue && (
                  <Badge variant="destructive">
                    <Clock3 className="mr-1 h-3 w-3" />
                    Prazo atrasado
                  </Badge>
                )}
                {lastActivityLabel && (
                  <span className="text-muted-foreground">Ultima atividade {lastActivityLabel}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {conversation?.status !== "closed" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (
                    confirm(
                      "Deseja encerrar este atendimento? O cliente deixara de enviar novas mensagens ate que a conversa seja reaberta."
                    )
                  ) {
                    try {
                      const { conversationService } = await import("@/services/support/conversation-service");
                      await conversationService.updateStatus(conversationId, "closed");
                      handleUpdate();
                    } catch (error) {
                      log.error("Erro ao encerrar atendimento", { error, conversationId });
                    }
                  }
                }}
                className="gap-2"
              >
                Encerrar atendimento
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setReminderModalOpen(true)}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Agendar lembrete
            </Button>

            {onToggleSidebar && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleSidebar}
                title="Abrir dados do cliente"
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          {conversation && (
            <>
              <ConversationStatusSelector
                conversationId={conversationId}
                currentStatus={conversation.status}
                onUpdate={handleUpdate}
              />

              <ConversationTagsSelector
                conversationId={conversationId}
                currentTags={conversation.tags}
                onUpdate={handleUpdate}
              />

              <PromisedDatePicker
                conversationId={conversationId}
                promisedDate={conversation.promised_date}
                onUpdate={handleUpdate}
              />

              <RiskFlagManager
                conversationId={conversationId}
                riskFlags={conversation.risk_flags}
                onUpdate={handleUpdate}
              />
            </>
          )}
        </div>
      </div>

      <ReminderScheduler
        conversationId={conversationId}
        open={reminderModalOpen}
        onOpenChange={setReminderModalOpen}
        onReminderCreated={onReminderCreated}
      />
    </>
  );
}
