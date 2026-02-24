import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { conversationService } from "@/lib/services/conversationService";
import { CustomerMessageList } from "./CustomerMessageList";
import { CustomerMessageInput } from "./CustomerMessageInput";
import type { Conversation } from "@/types/support";
import { toast } from "sonner";

/**
 * CustomerChat Component
 *
 * Provides a chat interface for customers to communicate with support.
 * Features:
 * - Floating button with unread count badge
 * - Side panel chat interface
 * - Load user's conversations
 * - Send messages and attachments
 *
 * Requirements: 14.1, 14.3, 14.6
 */
export function CustomerChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Load user's conversations
  useEffect(() => {
    if (!userId) return;

    const loadConversations = async () => {
      try {
        setLoading(true);
        const data = await conversationService.listConversations({});

        // Filter to only show user's conversations
        const userConversations = data.filter((conv) => conv.user_id === userId);
        setConversations(userConversations);

        // Select first conversation if available
        if (userConversations.length > 0 && !selectedConversationId) {
          setSelectedConversationId(userConversations[0].id);
        }

        // Calculate total unread count
        const totalUnread = await calculateUnreadCount(userConversations);
        setUnreadCount(totalUnread);
      } catch (error) {
        console.error("Erro ao carregar conversas:", error);
        toast.error("Erro ao carregar conversas");
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [userId, selectedConversationId]);

  // Calculate total unread messages across all conversations
  const calculateUnreadCount = async (convs: Conversation[]): Promise<number> => {
    let total = 0;
    for (const conv of convs) {
      const count = await conversationService.getUnreadCount(conv.id, "customer");
      total += count;
    }
    return total;
  };

  // Subscribe to conversation changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("customer_conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_conversations",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Conversation change:", payload);

          if (payload.eventType === "INSERT") {
            const newConv = payload.new as Conversation;
            setConversations((prev) => [newConv, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updatedConv = payload.new as Conversation;
            setConversations((prev) =>
              prev.map((conv) => (conv.id === updatedConv.id ? updatedConv : conv))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Subscribe to new messages to update unread count
  useEffect(() => {
    if (!userId || conversations.length === 0) return;

    const conversationIds = conversations.map((c) => c.id);

    const channel = supabase
      .channel("customer_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        async (payload) => {
          const message = payload.new as any;

          // Only count if message is in user's conversations and from admin/system
          if (
            conversationIds.includes(message.conversation_id) &&
            message.sender_type !== "customer" &&
            !message.is_internal
          ) {
            // Recalculate unread count
            const totalUnread = await calculateUnreadCount(conversations);
            setUnreadCount(totalUnread);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, conversations]);

  // Listen for new conversation created events
  useEffect(() => {
    const handleNewConversation = (event: CustomEvent) => {
      const { conversation } = event.detail;
      console.log("Nova conversa criada:", conversation);

      // Adicionar nova conversa à lista
      setConversations((prev) => [conversation, ...prev]);

      // Selecionar a nova conversa
      setSelectedConversationId(conversation.id);
    };

    window.addEventListener("newConversationCreated", handleNewConversation as EventListener);

    return () => {
      window.removeEventListener("newConversationCreated", handleNewConversation as EventListener);
    };
  }, []);

  // Handle opening chat
  const handleOpen = () => {
    setIsOpen(true);
  };

  // Handle closing chat
  const handleClose = () => {
    setIsOpen(false);
  };

  // Don't render if user is not authenticated
  if (!userId) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg relative"
          onClick={handleOpen}
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 rounded-full"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Chat Side Panel */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SheetTitle>Suporte</SheetTitle>
                {selectedConversationId &&
                  conversations.find((c) => c.id === selectedConversationId)?.status ===
                    "closed" && (
                    <Badge variant="secondary" className="text-xs">
                      Encerrado
                    </Badge>
                  )}
              </div>
              <div className="flex items-center gap-2">
                {/* Botão Nova Conversa sempre visível */}
                {conversations.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        if (!userId) return;

                        const newConversation = await conversationService.createConversation({
                          user_id: userId,
                          subject: "Nova Solicitação",
                          status: "new",
                        });

                        setConversations((prev) => [newConversation, ...prev]);
                        setSelectedConversationId(newConversation.id);
                        toast.success("Nova conversa iniciada!");
                      } catch (error) {
                        console.error("Erro ao criar conversa:", error);
                        toast.error("Erro ao criar conversa");
                      }
                    }}
                  >
                    + Nova
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">Você ainda não tem conversas.</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Precisa de ajuda? Inicie uma conversa com nosso suporte.
                </p>
                <Button
                  onClick={async () => {
                    try {
                      if (!userId) return;

                      const newConversation = await conversationService.createConversation({
                        user_id: userId,
                        subject: "Nova Solicitação",
                        status: "new",
                      });

                      setConversations([newConversation]);
                      setSelectedConversationId(newConversation.id);
                      toast.success("Conversa iniciada!");
                    } catch (error) {
                      console.error("Erro ao criar conversa:", error);
                      toast.error("Erro ao criar conversa");
                    }
                  }}
                >
                  Iniciar Conversa
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Single conversation header with new conversation button */}
              {conversations.length === 1 && conversations[0].status === "closed" && (
                <div className="border-b p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      try {
                        if (!userId) return;

                        const newConversation = await conversationService.createConversation({
                          user_id: userId,
                          subject: "Nova Solicitação",
                          status: "new",
                        });

                        setConversations((prev) => [newConversation, ...prev]);
                        setSelectedConversationId(newConversation.id);
                        toast.success("Nova conversa iniciada!");
                      } catch (error) {
                        console.error("Erro ao criar conversa:", error);
                        toast.error("Erro ao criar conversa");
                      }
                    }}
                  >
                    + Nova Conversa
                  </Button>
                </div>
              )}

              {/* Conversation selector (if multiple conversations) */}
              {conversations.length > 1 && (
                <div className="border-b p-2 space-y-2">
                  <select
                    className="w-full p-2 border rounded"
                    value={selectedConversationId || ""}
                    onChange={(e) => setSelectedConversationId(e.target.value)}
                  >
                    {conversations.map((conv) => (
                      <option key={conv.id} value={conv.id}>
                        {conv.subject}
                        {conv.status === "closed" ? " (Encerrado)" : ""}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      try {
                        if (!userId) return;

                        const newConversation = await conversationService.createConversation({
                          user_id: userId,
                          subject: "Nova Solicitação",
                          status: "new",
                        });

                        setConversations((prev) => [newConversation, ...prev]);
                        setSelectedConversationId(newConversation.id);
                        toast.success("Nova conversa iniciada!");
                      } catch (error) {
                        console.error("Erro ao criar conversa:", error);
                        toast.error("Erro ao criar conversa");
                      }
                    }}
                  >
                    + Nova Conversa
                  </Button>
                </div>
              )}

              {/* Messages and Input */}
              {selectedConversationId && (
                <>
                  <CustomerMessageList
                    conversationId={selectedConversationId}
                    currentUserId={userId}
                    currentUserName="Cliente"
                    isClosed={
                      conversations.find((c) => c.id === selectedConversationId)?.status ===
                      "closed"
                    }
                  />
                  <CustomerMessageInput
                    conversationId={selectedConversationId}
                    currentUserId={userId}
                    currentUserName="Cliente"
                    isClosed={
                      conversations.find((c) => c.id === selectedConversationId)?.status ===
                      "closed"
                    }
                  />
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
