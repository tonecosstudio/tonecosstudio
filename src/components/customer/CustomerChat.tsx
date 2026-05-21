import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
    isClosed,
    loading,
    currentUserName,
    createConversation,
  } = useCustomerChatButton();

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg relative"
          onClick={() => setIsOpen(true)}
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

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SheetTitle>Suporte</SheetTitle>
                {isClosed && (
                  <Badge variant="secondary" className="text-xs">
                    Encerrado
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {conversations.length > 0 && (
                  <Button variant="outline" size="sm" onClick={createConversation}>
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
                <p className="text-muted-foreground mb-2">Voce ainda nao tem conversas.</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Precisa de ajuda? Inicie uma conversa com nosso suporte.
                </p>
                <Button onClick={createConversation}>Iniciar Conversa</Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {conversations.length === 1 && conversations[0].status === "closed" && (
                <div className="border-b p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={createConversation}
                  >
                    + Nova Conversa
                  </Button>
                </div>
              )}

              {conversations.length > 1 && (
                <div className="border-b p-2 space-y-2">
                  <select
                    className="w-full p-2 border rounded"
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
                    className="w-full"
                    onClick={createConversation}
                  >
                    + Nova Conversa
                  </Button>
                </div>
              )}

              {selectedConversationId && (
                <>
                  <CustomerMessageList
                    conversationId={selectedConversationId}
                    currentUserId={user.id}
                    currentUserName={currentUserName}
                    isClosed={selectedConversation?.status === "closed"}
                  />
                  <CustomerMessageInput
                    conversationId={selectedConversationId}
                    currentUserId={user.id}
                    currentUserName={currentUserName}
                    isClosed={selectedConversation?.status === "closed"}
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
