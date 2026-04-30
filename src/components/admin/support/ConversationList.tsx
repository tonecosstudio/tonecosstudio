import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, RefreshCw } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import type { Conversation, ConversationStatus } from "@/types/support";
import { getStatusLabel, getTagLabel } from "@/types/support";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { conversations, loading, searchTerm, search, filterByStatus, refresh } =
    useConversations();

  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("all");

  const handleStatusChange = (value: string) => {
    const status = value as ConversationStatus | "all";
    setStatusFilter(status);
    filterByStatus(status);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header com busca e filtros */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Conversas</h2>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => search(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtro de status */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="new">Nova</SelectItem>
              <SelectItem value="waiting_admin">Aguardando Admin</SelectItem>
              <SelectItem value="waiting_customer">Aguardando Cliente</SelectItem>
              <SelectItem value="resolved">Resolvida</SelectItem>
              <SelectItem value="closed">Fechada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando conversas...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma conversa encontrada
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedId}
                onClick={() => onSelect(conversation.id)}
                formatTimestamp={formatTimestamp}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ConversationCardProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  formatTimestamp: (timestamp: string) => string;
}

function ConversationCard({
  conversation,
  isSelected,
  onClick,
  formatTimestamp,
}: ConversationCardProps) {
  const hasUnread = (conversation.unread_count || 0) > 0;
  const isOverdue = conversation.is_overdue;
  const hasRiskFlags = (conversation.risk_flags || []).length > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left hover:bg-accent transition-colors ${
        isSelected ? "bg-accent" : ""
      } ${hasUnread ? "bg-blue-50 dark:bg-blue-950" : ""}`}
    >
      <div className="space-y-2">
        {/* Nome e timestamp */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate ${hasUnread ? "font-bold" : ""}`}>
              {conversation.user_name || conversation.user_email || "Usuário"}
            </p>
            {conversation.user_email && conversation.user_name && (
              <p className="text-xs text-muted-foreground truncate">{conversation.user_email}</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatTimestamp(conversation.last_message_at)}
          </span>
        </div>

        {/* Subject */}
        <p className="text-sm text-muted-foreground truncate">{conversation.subject}</p>

        {/* Tags e badges */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Status badge */}
          <Badge
            variant={
              conversation.status === "waiting_admin"
                ? "destructive"
                : conversation.status === "resolved"
                  ? "secondary"
                  : "default"
            }
            className="text-xs"
          >
            {getStatusLabel(conversation.status)}
          </Badge>

          {/* Unread count */}
          {hasUnread && (
            <Badge variant="default" className="text-xs">
              {conversation.unread_count} nova{conversation.unread_count! > 1 ? "s" : ""}
            </Badge>
          )}

          {/* Tags */}
          {conversation.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {getTagLabel(tag)}
            </Badge>
          ))}

          {/* Risk flags */}
          {hasRiskFlags && (
            <Badge variant="destructive" className="text-xs">
              ⚠️ Risco
            </Badge>
          )}

          {/* Overdue promise */}
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              🕐 Atrasado
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
