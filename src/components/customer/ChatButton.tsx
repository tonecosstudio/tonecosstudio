/**
 * Floating customer support chat entrypoint.
 *
 * Data access and realtime wiring live in customer-chat-button-service to keep
 * this component focused on UI state and rendering.
 */

import { MessageSquare, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { CustomerMessageList } from "./CustomerMessageList";
import { CustomerMessageInput } from "./CustomerMessageInput";
import { useCustomerChatButton } from "@/hooks/customer/useCustomerChatButton";
import { PUBLIC_ROUTES } from "@/config/routes";

export function ChatButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    isOpen,
    setIsOpen,
    unreadCount,
    conversations,
    selectedConversationId,
    selectedConversation,
    isClosed,
    loading,
    currentUserName,
    createConversation,
  } = useCustomerChatButton();

  if (location.pathname === "/suporte") {
    return null;
  }

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          aria-label="Abrir chat de suporte"
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

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-4xl h-[80vh] bg-background rounded-lg shadow-xl flex flex-col m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">Chat de Suporte</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedConversation?.subject || "Converse com nossa equipe"}
                  {isClosed && " (Encerrado)"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {conversations.length > 0 && (
                  <button
                    onClick={createConversation}
                    className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent"
                  >
                    + Nova
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-md hover:bg-accent flex items-center justify-center"
                  aria-label="Fechar chat de suporte"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
                    onClick={() => navigate(PUBLIC_ROUTES.contact)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Ir para Contato
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto">
                  {selectedConversationId && (
                    <CustomerMessageList
                      conversationId={selectedConversationId}
                      currentUserId={user.id}
                      currentUserName={currentUserName}
                      isClosed={isClosed}
                    />
                  )}
                </div>

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
                          onClick={createConversation}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                          Nova Solicitação
                        </button>
                      </div>
                    ) : (
                      <CustomerMessageInput
                        conversationId={selectedConversationId}
                        currentUserId={user.id}
                        currentUserName={currentUserName}
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
