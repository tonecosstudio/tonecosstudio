// @ts-nocheck
/**
 * ChatButton - Botão flutuante de chat para clientes
 * ATUALIZADO: Removidos workarounds (setTimeout, refreshKey)
 * Agora usa Realtime subscriptions corretamente
 */

import { useState, useEffect } from "react";
import { MessageSquare, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CustomerMessageList } from "./CustomerMessageList";
import { CustomerMessageInput } from "./CustomerMessageInput";
import type { Conversation } from "@/types/support";
import { toast } from "sonner";

export function ChatButton() {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Buscar status da conversa selecionada
  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);
  const isClosed = selectedConversation?.status === "closed";

  // Não renderizar o botão na página de suporte para evitar duplicação
  if (location.pathname === "/suporte") {
    return null;
  }

  // Carregar contador de mensagens não lidas
  useEffect(() => {
    if (!user) return;

    const loadUnreadCount = async () => {
      try {
        const { data: conversations, error: convError } = await supabase
          .from("support_conversations")
          .select("id")
          .eq("user_id", user.id)
          .neq("status", "closed");

        if (convError) throw convError;
        if (!conversations || conversations.length === 0) {
          setUnreadCount(0);
          return;
        }

        const conversationIds = conversations.map((c) => c.id);
        const { count, error: msgError } = await supabase
          .from("support_messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", conversationIds)
          .eq("sender_type", "admin")
          .eq("read_by_customer", false);

        if (msgError) throw msgError;
        setUnreadCount(count || 0);
      } catch (error) {
        console.error("Erro ao carregar contador:", error);
      }
    };

    loadUnreadCount();

    const channel = supabase
      .channel("chat_button_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_conversations",
          filter: `user_id=eq.${user.id}`,
        },
        () => loadUnreadCount()
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        () => loadUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Carregar conversas quando abrir o modal
  useEffect(() => {
    if (!isOpen || !user) return;

    const loadConversations = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("support_conversations")
          .select("*")
          .eq("user_id", user.id)
          .order("last_message_at", { ascending: false });

        if (error) throw error;

        setConversations((data as Conversation[]) || []);

        if (data && data.length > 0) {
          setSelectedConversationId(data[0].id);
        }
      } catch (error) {
        console.error("Erro ao carregar conversas:", error);
        toast.error("Erro ao carregar conversas");
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [isOpen, user]);

  if (!user) return null;

  return (
    <>
      {/* Botão Flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Modal de Chat */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-4xl h-[80vh] bg-background rounded-lg shadow-xl flex flex-col m-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">Chat de Suporte</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedConversation?.subject || "Converse com nossa equipe"}
                  {isClosed && " (Encerrado)"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Botão Nova Conversa */}
                {conversations.length > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        if (!user) return;

                        const { data: newConv, error } = await supabase
                          .from("support_conversations")
                          .insert({
                            user_id: user.id,
                            subject: "Nova Solicitação",
                            status: "new",
                          })
                          .select()
                          .single();

                        if (error) throw error;

                        setConversations((prev) => [newConv as Conversation, ...prev]);
                        setSelectedConversationId(newConv.id);
                        toast.success("Nova conversa iniciada!");
                      } catch (error) {
                        console.error("Erro ao criar conversa:", error);
                        toast.error("Erro ao criar conversa");
                      }
                    }}
                    className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent"
                  >
                    + Nova
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-md hover:bg-accent flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando conversas...</p>
                </div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma conversa ainda</h3>
                  <p className="text-muted-foreground mb-4">
                    Você ainda não iniciou nenhuma conversa com nosso suporte.
                  </p>
                  <button
                    onClick={() => (window.location.href = "/contato")}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Ir para Contato
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Área de mensagens */}
                <div className="flex-1 overflow-y-auto">
                  {selectedConversationId && (
                    <CustomerMessageList
                      conversationId={selectedConversationId}
                      currentUserId={user.id}
                      currentUserName={user.user_metadata?.full_name || user.email || "Cliente"}
                      isClosed={isClosed}
                    />
                  )}
                </div>

                {/* Área de input */}
                {selectedConversationId && (
                  <div className="border-t">
                    {isClosed ? (
                      <div className="p-6 bg-muted/50 text-center">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Este atendimento foi encerrado
                        </p>
                        <p className="text-xs text-muted-foreground mb-4">
                          Precisa de ajuda? Inicie uma nova solicitação
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              if (!user) return;

                              const { data: newConv, error } = await supabase
                                .from("support_conversations")
                                .insert({
                                  user_id: user.id,
                                  subject: "Nova Solicitação",
                                  status: "new",
                                })
                                .select()
                                .single();

                              if (error) throw error;

                              setConversations((prev) => [newConv as Conversation, ...prev]);
                              setSelectedConversationId(newConv.id);
                              toast.success("Nova conversa iniciada!");
                            } catch (error) {
                              console.error("Erro ao criar conversa:", error);
                              toast.error("Erro ao criar conversa");
                            }
                          }}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                          Nova Solicitação
                        </button>
                      </div>
                    ) : (
                      <CustomerMessageInput
                        conversationId={selectedConversationId}
                        currentUserId={user.id}
                        currentUserName={user.user_metadata?.full_name || user.email || "Cliente"}
                        isClosed={isClosed}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
