import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Clock3, Filter, RefreshCw, Search } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import type { Conversation, ConversationStatus } from "@/types/support";
import { getStatusLabel, getTagLabel } from "@/types/support";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { conversations, loading, searchTerm, search, filterByStatus, refresh } =
    useConversations();

  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("all");
  const unreadConversations = conversations.filter((conversation) => (conversation.unread_count || 0) > 0);
  const overdueConversations = conversations.filter((conversation) => conversation.is_overdue);
  const riskConversations = conversations.filter(
    (conversation) => (conversation.risk_flags || []).length > 0
  );

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
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversas</h2>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(event) => search(event.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="new">Nova</SelectItem>
              <SelectItem value="waiting_admin">Aguardando admin</SelectItem>
              <SelectItem value="waiting_customer">Aguardando cliente</SelectItem>
              <SelectItem value="resolved">Resolvida</SelectItem>
              <SelectItem value="closed">Fechada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md border bg-background px-3 py-2">
            <p className="text-muted-foreground">Nao lidas</p>
            <p className="mt-1 font-semibold">{unreadConversations.length}</p>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            <p className="text-muted-foreground">Atrasadas</p>
            <p className="mt-1 font-semibold">{overdueConversations.length}</p>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            <p className="text-muted-foreground">Com risco</p>
            <p className="mt-1 font-semibold">{riskConversations.length}</p>
          </div>
        </div>
      </div>

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
  const unreadCount = conversation.unread_count || 0;

  return (
    <button
      onClick={onClick}
      className={`w-full border-l-2 p-4 text-left transition-colors hover:bg-accent ${
        isSelected ? "border-primary bg-accent" : "border-transparent"
      } ${hasUnread ? "bg-blue-50 dark:bg-blue-950" : ""}`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`truncate font-medium ${hasUnread ? "font-bold" : ""}`}>
              {conversation.user_name || conversation.user_email || "Usuario"}
            </p>
            {conversation.user_email && conversation.user_name && (
              <p className="truncate text-xs text-muted-foreground">{conversation.user_email}</p>
            )}
          </div>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatTimestamp(conversation.last_message_at)}
          </span>
        </div>

        <p className="truncate text-sm text-muted-foreground">{conversation.subject}</p>

        <div className="flex flex-wrap items-center gap-1">
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

          {hasUnread && (
            <Badge variant="default" className="text-xs">
              {unreadCount} nova{unreadCount > 1 ? "s" : ""}
            </Badge>
          )}

          {conversation.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {getTagLabel(tag)}
            </Badge>
          ))}

          {hasRiskFlags && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Risco
            </Badge>
          )}

          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              <Clock3 className="mr-1 h-3 w-3" />
              Atrasada
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
