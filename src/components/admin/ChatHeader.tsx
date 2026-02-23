/**
 * ChatHeader - Cabeçalho da interface de chat com informações da conversa
 * 
 * Requirements: 23.5, 12.2
 * Design: .kiro/specs/advanced-chat-support-system/design.md
 * 
 * Exibe informações da conversa e permite agendar lembretes.
 * O nome do usuário é clicável para abrir o sidebar com dados completos.
 * Permite editar status, tags, data prometida e flags de risco.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, User, PanelRightOpen } from "lucide-react";
import { ReminderScheduler } from "./ReminderScheduler";
import { PromisedDatePicker } from "./PromisedDatePicker";
import { RiskFlagManager } from "./RiskFlagManager";
import { ConversationStatusSelector } from "./ConversationStatusSelector";
import { ConversationTagsSelector } from "./ConversationTagsSelector";
import type { ConversationReminder } from "@/lib/reminder-service";
import type { Conversation } from "@/types/support";

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

  return (
    <>
      <div className="border-b bg-background">
        {/* Linha 1: Informações do usuário */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 
                className={`text-lg font-semibold ${
                  conversation?.user_id && onUserClick ? 'cursor-pointer hover:text-primary transition-colors' : ''
                }`}
                onClick={handleUserClick}
                title={conversation?.user_id && onUserClick ? 'Clique para ver dados do cliente' : undefined}
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
          </div>

          <div className="flex items-center gap-2">
            {conversation?.status !== 'closed' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (confirm('Deseja realmente encerrar este atendimento? O cliente não poderá mais enviar mensagens.')) {
                    try {
                      const { conversationService } = await import('@/lib/services/conversationService');
                      await conversationService.updateStatus(conversationId, 'closed');
                      handleUpdate();
                    } catch (error) {
                      console.error('Erro ao encerrar:', error);
                    }
                  }
                }}
                className="gap-2"
              >
                Encerrar Atendimento
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReminderModalOpen(true)}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Agendar Lembrete
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

        {/* Linha 2: Controles da conversa */}
        <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
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
