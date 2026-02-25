import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messageService } from "@/lib/services/messageService";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Search, X, MoreVertical, Edit, Trash2 } from "lucide-react";
import type { GroupMessage, GroupAttachment } from "@/types/groups";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useGroupNotifications } from "@/hooks/useGroupNotifications";

interface GroupMessageListProps {
  groupId: string;
}

/**
 * Converte file_path para URL pública do Supabase Storage
 */
function getAttachmentUrl(filePath: string): string {
  const BUCKET_NAME = "group-attachments";
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Detecta URLs no texto e as torna clicáveis
 */
function linkifyText(text: string, isCurrentUser: boolean): React.ReactNode {
  // Regex para detectar URLs (http, https, www)
  const urlRegex =
    /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,})/g;

  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Verifica se é uma URL
    if (part.match(urlRegex)) {
      let url = part;

      // Adiciona https:// se não tiver protocolo
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }

      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium hover:opacity-80 text-blue-600"
        >
          {part}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

export function GroupMessageList({ groupId }: GroupMessageListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  // Enable real-time notifications
  useGroupNotifications({
    groupId,
    userId: user?.id || "",
    enabled: !!user,
    playSound: true,
    showToast: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["group-messages", groupId],
    queryFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      return messageService.listGroupMessages(groupId, user.id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    // Removido refetchInterval - Realtime cuida das atualizações
  });

  const messages = data?.messages || [];

  // Edit message mutation
  const editMutation = useMutation({
    mutationFn: async ({ messageId, newText }: { messageId: string; newText: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      await messageService.editGroupMessage(messageId, newText, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });
      setEditingMessageId(null);
      setEditedText("");
      toast.success("Mensagem editada com sucesso");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao editar mensagem");
    },
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      await messageService.deleteGroupMessage(messageId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
      toast.success("Mensagem deletada com sucesso");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao deletar mensagem");
    },
  });

  // Handlers
  const handleStartEdit = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId);
    setEditedText(currentText);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditedText("");
  };

  const handleSaveEdit = (messageId: string) => {
    if (!editedText.trim()) {
      toast.error("Mensagem não pode estar vazia");
      return;
    }
    editMutation.mutate({ messageId, newText: editedText });
  };

  const handleDeleteClick = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (messageToDelete) {
      deleteMutation.mutate(messageToDelete);
    }
  };

  // Filter messages based on search and date
  const filteredMessages = useMemo(() => {
    let filtered = messages;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((msg) => msg.message.toLowerCase().includes(query));
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const cutoffDate = new Date();

      switch (dateFilter) {
        case "today":
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case "month":
          cutoffDate.setDate(now.getDate() - 30);
          break;
      }

      filtered = filtered.filter((msg) => new Date(msg.created_at) >= cutoffDate);
    }

    return filtered;
  }, [messages, searchQuery, dateFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[70%] rounded-lg p-4 bg-white border border-gray-200 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                <div className="h-3 w-16 bg-gray-100 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma mensagem enviada ainda</p>
          <p className="text-sm text-muted-foreground mt-1">
            Envie a primeira mensagem para este grupo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 pb-4 z-10">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar mensagens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">7 dias</SelectItem>
              <SelectItem value="month">30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {(searchQuery || dateFilter !== "all") && (
          <div className="mt-2 text-sm text-muted-foreground">
            {filteredMessages.length}{" "}
            {filteredMessages.length === 1 ? "mensagem encontrada" : "mensagens encontradas"}
            {searchQuery && ` para "${searchQuery}"`}
          </div>
        )}
      </div>

      {/* Messages */}
      {filteredMessages.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma mensagem encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros de busca</p>
          </div>
        </div>
      ) : (
        filteredMessages.map((message) => {
          const isCurrentUser = message.sender_id === user?.id;
          const msg = message as GroupMessage & {
            sender_name: string;
            sender_avatar: string;
            attachments: GroupAttachment[];
            link_text?: string | null;
            link_url?: string | null;
            action_button_text?: string | null;
            action_button_url?: string | null;
          };

          return (
            <div key={msg.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[70%] rounded-lg p-4 shadow-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                      {isCurrentUser ? "Você" : msg.sender_name || "Admin"}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(msg.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  {/* Actions Menu (only for current user) */}
                  {isCurrentUser && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStartEdit(msg.id, msg.message)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(msg.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Message Text or Edit Form */}
                {editingMessageId === msg.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="min-h-[80px]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(msg.id)}
                        disabled={editMutation.isPending}
                      >
                        {editMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={editMutation.isPending}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                    {linkifyText(msg.message, isCurrentUser)}
                  </div>
                )}

                {/* Highlighted Link */}
                {msg.link_text && msg.link_url && (
                  <a
                    href={msg.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-sm font-medium underline text-blue-600 hover:text-blue-700"
                  >
                    🔗 {msg.link_text}
                  </a>
                )}

                {/* Action Button */}
                {msg.action_button_text && msg.action_button_url && (
                  <a
                    href={msg.action_button_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 mt-3 px-4 py-2 rounded-lg font-medium text-sm transition-colors bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {msg.action_button_text} →
                  </a>
                )}

                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.attachments.map((attachment: any) => {
                      const isImage = attachment.file_type?.startsWith("image/");
                      const publicUrl = getAttachmentUrl(attachment.file_path);

                      if (isImage) {
                        return (
                          <a
                            key={attachment.id}
                            href={publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={publicUrl}
                              alt={attachment.file_name}
                              className="max-w-full max-h-64 rounded-lg border-2 border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              loading="lazy"
                            />
                            <span className="text-xs mt-1 block text-gray-600">
                              📎 {attachment.file_name}
                            </span>
                          </a>
                        );
                      }

                      return (
                        <a
                          key={attachment.id}
                          href={publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium underline block p-2 rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
                        >
                          📎 {attachment.file_name}
                          {attachment.file_size && (
                            <span className="ml-2 text-gray-500">
                              ({(attachment.file_size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Edited indicator */}
                {msg.updated_at !== msg.created_at && (
                  <p className="text-xs mt-2 italic text-gray-500 dark:text-gray-400">(editada)</p>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Mensagem</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta mensagem? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
