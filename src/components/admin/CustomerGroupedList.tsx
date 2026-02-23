import { useState, useMemo } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, RefreshCw, ArrowLeft, Users, MessageSquare, AlertCircle } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import type { Conversation, ConversationStatus } from "@/types/support";
import { getStatusLabel, getTagLabel } from "@/types/support";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CustomerGroup {
  user_id: string;
  user_name: string;
  user_email: string;
  conversations: Conversation[];
  total_unread: number;
  last_activity: string;
  has_urgent: boolean;
  has_risk: boolean;
  has_overdue: boolean;
}

interface CustomerGroupedListProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

type SortOption = "activity" | "conversations" | "unread" | "name";

export function CustomerGroupedList({ 
  selectedConversationId, 
  onSelectConversation 
}: CustomerGroupedListProps) {
  const {
    conversations,
    loading,
    searchTerm,
    search,
    filterByStatus,
    refresh,
  } = useConversations();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("activity");
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [showOnlyUrgent, setShowOnlyUrgent] = useState(false);

  // Agrupar conversas por usuário
  const customerGroups = useMemo(() => {
    const groups = new Map<string, CustomerGroup>();

    conversations.forEach((conv) => {
      const userId = conv.user_id;
      
      if (!groups.has(userId)) {
        groups.set(userId, {
          user_id: userId,
          user_name: conv.user_name || "Usuário",
          user_email: conv.user_email || "",
          conversations: [],
          total_unread: 0,
          last_activity: conv.last_message_at,
          has_urgent: false,
          has_risk: false,
          has_overdue: false,
        });
      }

      const group = groups.get(userId)!;
      group.conversations.push(conv);
      group.total_unread += conv.unread_count || 0;
      
      // Atualizar última atividade
      if (new Date(conv.last_message_at) > new Date(group.last_activity)) {
        group.last_activity = conv.last_message_at;
      }

      // Verificar flags
      if (conv.priority === "urgent") group.has_urgent = true;
      if ((conv.risk_flags || []).length > 0) group.has_risk = true;
      if (conv.is_overdue) group.has_overdue = true;
    });

    return Array.from(groups.values());
  }, [conversations]);

  // Filtrar grupos
  const filteredGroups = useMemo(() => {
    let filtered = customerGroups;

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (group) =>
          group.user_name.toLowerCase().includes(term) ||
          group.user_email.toLowerCase().includes(term)
      );
    }

    // Filtro de não lidas
    if (showOnlyUnread) {
      filtered = filtered.filter((group) => group.total_unread > 0);
    }

    // Filtro de urgentes
    if (showOnlyUrgent) {
      filtered = filtered.filter((group) => group.has_urgent);
    }

    return filtered;
  }, [customerGroups, searchTerm, showOnlyUnread, showOnlyUrgent]);

  // Ordenar grupos
  const sortedGroups = useMemo(() => {
    const sorted = [...filteredGroups];

    switch (sortBy) {
      case "activity":
        sorted.sort((a, b) => 
          new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
        );
        break;
      case "conversations":
        sorted.sort((a, b) => b.conversations.length - a.conversations.length);
        break;
      case "unread":
        sorted.sort((a, b) => b.total_unread - a.total_unread);
        break;
      case "name":
        sorted.sort((a, b) => a.user_name.localeCompare(b.user_name));
        break;
    }

    return sorted;
  }, [filteredGroups, sortBy]);

  const handleStatusChange = (value: string) => {
    const status = value as ConversationStatus | "all";
    setStatusFilter(status);
    filterByStatus(status);
  };

  const handleBackToCustomers = () => {
    setSelectedUserId(null);
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

  // Se um usuário está selecionado, mostrar suas conversas
  if (selectedUserId) {
    const selectedGroup = customerGroups.find((g) => g.user_id === selectedUserId);
    
    if (!selectedGroup) {
      setSelectedUserId(null);
      return null;
    }

    return (
      <div className="flex flex-col h-full">
        {/* Header com botão voltar */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToCustomers}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {selectedGroup.user_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{selectedGroup.user_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedGroup.user_email}</p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Stats */}
          <div className="flex gap-2">
            <Badge variant="secondary">
              {selectedGroup.conversations.length} conversa{selectedGroup.conversations.length !== 1 ? "s" : ""}
            </Badge>
            {selectedGroup.total_unread > 0 && (
              <Badge variant="default">
                {selectedGroup.total_unread} não lida{selectedGroup.total_unread !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        {/* Lista de conversas do usuário */}
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y">
            {selectedGroup.conversations.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedConversationId}
                onClick={() => onSelectConversation(conversation.id)}
                formatTimestamp={formatTimestamp}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Vista de lista de clientes
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="font-semibold text-lg">
              Clientes ({sortedGroups.length})
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
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

        {/* Filtros */}
        <div className="grid grid-cols-2 gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activity">Última atividade</SelectItem>
              <SelectItem value="conversations">Mais conversas</SelectItem>
              <SelectItem value="unread">Mais não lidas</SelectItem>
              <SelectItem value="name">Nome A-Z</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="new">Nova</SelectItem>
              <SelectItem value="waiting_admin">Aguardando</SelectItem>
              <SelectItem value="resolved">Resolvida</SelectItem>
              <SelectItem value="closed">Fechada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2">
          <Button
            variant={showOnlyUnread ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyUnread(!showOnlyUnread)}
            className="flex-1"
          >
            Não lidas
          </Button>
          <Button
            variant={showOnlyUrgent ? "destructive" : "outline"}
            size="sm"
            onClick={() => setShowOnlyUrgent(!showOnlyUrgent)}
            className="flex-1"
          >
            Urgentes
          </Button>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="flex-1 overflow-y-auto">
        {loading && sortedGroups.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando clientes...
          </div>
        ) : sortedGroups.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado
          </div>
        ) : (
          <div className="divide-y">
            {sortedGroups.map((group) => (
              <CustomerGroupCard
                key={group.user_id}
                group={group}
                onClick={() => setSelectedUserId(group.user_id)}
                formatTimestamp={formatTimestamp}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CustomerGroupCardProps {
  group: CustomerGroup;
  onClick: () => void;
  formatTimestamp: (timestamp: string) => string;
}

function CustomerGroupCard({ group, onClick, formatTimestamp }: CustomerGroupCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 text-left hover:bg-accent transition-colors"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {group.user_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{group.user_name}</p>
            <p className="text-xs text-muted-foreground truncate">{group.user_email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTimestamp(group.last_activity)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="text-xs">
              {group.conversations.length}
            </Badge>
            {group.total_unread > 0 && (
              <Badge variant="default" className="text-xs">
                {group.total_unread}
              </Badge>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          {group.has_urgent && (
            <Badge variant="destructive" className="text-xs">
              🔴 Urgente
            </Badge>
          )}
          {group.has_risk && (
            <Badge variant="destructive" className="text-xs">
              ⚠️ Risco
            </Badge>
          )}
          {group.has_overdue && (
            <Badge variant="destructive" className="text-xs">
              🕐 Atrasado
            </Badge>
          )}
          
          {/* Preview das tags das conversas */}
          {group.conversations.slice(0, 2).map((conv, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              {conv.subject.substring(0, 20)}
              {conv.subject.length > 20 ? "..." : ""}
            </Badge>
          ))}
        </div>
      </div>
    </button>
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
        isSelected ? "bg-accent border-l-4 border-primary" : ""
      } ${hasUnread ? "bg-blue-50 dark:bg-blue-950" : ""}`}
    >
      <div className="space-y-2">
        {/* Subject e timestamp */}
        <div className="flex items-start justify-between gap-2">
          <p className={`font-medium text-sm ${hasUnread ? "font-bold" : ""}`}>
            {conversation.subject}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatTimestamp(conversation.last_message_at)}
          </span>
        </div>

        {/* ID da conversa */}
        <p className="text-xs text-muted-foreground font-mono">
          #{conversation.id.substring(0, 8)}
        </p>

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
