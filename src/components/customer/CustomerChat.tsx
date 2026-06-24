import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCustomerChatButton } from "@/hooks/customer/useCustomerChatButton";
import { MessageCircle, X } from "lucide-react";
import { CustomerMessageInput } from "./CustomerMessageInput";
import { CustomerMessageList } from "./CustomerMessageList";

export function CustomerChat() {
  const {
    user,
    isOpen,
    setIsOpen,
    unreadCount,
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    selectedConversation,
    loading,
    currentUserName,
    createConversation,
    isCreatingConversation,
  } = useCustomerChatButton();

  if (!user) {
    return null;
  }

  const isSelectedConversationClosed = selectedConversation?.status === "closed";

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="relative h-14 w-14 rounded-full shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full p-0"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col border-l border-[hsl(0,0%,12%)] bg-[hsl(0,0%,5%)] p-0 text-white sm:w-[500px]"
        >
          <SheetHeader className="border-b border-[hsl(0,0%,12%)] p-4">
            <SheetDescription className="sr-only">
              Canal de suporte para acompanhar conversas e enviar mensagens ao atendimento.
            </SheetDescription>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-white">Suporte</SheetTitle>
                {isSelectedConversationClosed && (
                  <Badge className="border-zinc-500/30 bg-zinc-500/10 text-xs text-zinc-100">
                    Encerrado
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {conversations.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void createConversation()}
                    disabled={isCreatingConversation}
                    className="border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)]"
                  >
                    {isCreatingConversation ? "Criando..." : "+ Nova"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-300 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-zinc-400">Carregando...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-4">
              <div className="text-center">
                <MessageCircle className="mx-auto mb-4 h-12 w-12 text-zinc-500" />
                <p className="mb-2 text-zinc-300">Voce ainda nao tem conversas.</p>
                <p className="mb-4 text-sm text-zinc-500">
                  Precisa de ajuda? Inicie uma conversa com o suporte.
                </p>
                <Button
                  onClick={() => void createConversation()}
                  disabled={isCreatingConversation}
                  className="bg-[hsl(42,100%,50%)] text-black hover:bg-[hsl(42,100%,58%)]"
                >
                  {isCreatingConversation ? "Criando..." : "Iniciar conversa"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              {conversations.length === 1 && conversations[0].status === "closed" && (
                <div className="border-b border-[hsl(0,0%,12%)] p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)]"
                    onClick={() => void createConversation()}
                    disabled={isCreatingConversation}
                  >
                    {isCreatingConversation ? "Criando..." : "+ Nova conversa"}
                  </Button>
                </div>
              )}

              {conversations.length > 1 && (
                <div className="space-y-2 border-b border-[hsl(0,0%,12%)] p-2">
                  <select
                    className="w-full rounded border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] p-2 text-sm text-white"
                    value={selectedConversationId || ""}
                    onChange={(event) => {
                      setSelectedConversationId(event.target.value);
                    }}
                  >
                    {conversations.map((conversation) => (
                      <option key={conversation.id} value={conversation.id}>
                        {conversation.subject}
                        {conversation.status === "closed" ? " (Encerrado)" : ""}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)]"
                    onClick={() => void createConversation()}
                    disabled={isCreatingConversation}
                  >
                    {isCreatingConversation ? "Criando..." : "+ Nova conversa"}
                  </Button>
                </div>
              )}

              {selectedConversationId && (
                <>
                  <CustomerMessageList
                    conversationId={selectedConversationId}
                    currentUserId={user.id}
                    currentUserName={currentUserName}
                    isClosed={isSelectedConversationClosed}
                    onCreateConversation={createConversation}
                    isCreatingConversation={isCreatingConversation}
                  />
                  <CustomerMessageInput
                    conversationId={selectedConversationId}
                    currentUserId={user.id}
                    currentUserName={currentUserName}
                    isClosed={isSelectedConversationClosed}
                    onCreateConversation={createConversation}
                    isCreatingConversation={isCreatingConversation}
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
