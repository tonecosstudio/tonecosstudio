import { useState } from "react";
import { useGroupMessages } from "@/hooks/useGroupMessages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";

interface GroupMessagesExampleProps {
  groupId: string;
  groupName: string;
}

/**
 * Example component demonstrating useGroupMessages hook
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
export function GroupMessagesExample({ groupId, groupName }: GroupMessagesExampleProps) {
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const {
    messages,
    loading,
    hasMore,
    loadMore,
    sendMessage,
    messagesEndRef,
  } = useGroupMessages({ groupId, autoScroll: true });

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      setSending(true);
      await sendMessage(messageText);
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{groupName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages List */}
        <ScrollArea className="h-[500px] border rounded-lg p-4">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full mb-4"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    "Carregar mensagens anteriores"
                  )}
                </Button>
              )}

              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="flex flex-col space-y-1 p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm">
                        {message.sender_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            📎 {attachment.file_name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </ScrollArea>

        {/* Message Input (Admin Only) */}
        <div className="flex space-x-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1"
            rows={3}
            maxLength={5000}
            disabled={sending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sending}
            size="icon"
            className="self-end"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-right">
          {messageText.length} / 5000 caracteres
        </p>
      </CardContent>
    </Card>
  );
}
