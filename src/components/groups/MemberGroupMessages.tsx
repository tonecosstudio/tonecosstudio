import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useGroupMessages } from "@/hooks/useGroupMessages";
import { RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeText } from "@/lib/utils/sanitize";
import { GroupErrorBoundary } from "./GroupErrorBoundary";

interface MemberGroupMessagesProps {
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

function MemberGroupMessagesContent({ groupId }: MemberGroupMessagesProps) {
  const { messages, loading, messagesEndRef, refresh } = useGroupMessages({
    groupId,
    autoScroll: true,
  });

  if (loading && messages.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Carregando mensagens...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Mensagens</h2>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {messages.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhuma mensagem ainda.</p>
      ) : (
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="flex gap-3 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={message.sender_avatar || undefined} />
                  <AvatarFallback>{message.sender_name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-sm font-medium truncate">
                      {sanitizeText(message.sender_name)}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  <p className="text-sm whitespace-pre-wrap break-words">
                    {sanitizeText(message.message)}
                  </p>

                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={getAttachmentUrl(attachment.file_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline block"
                        >
                          📎 {attachment.file_name}
                        </a>
                      ))}
                    </div>
                  )}

                  {message.updated_at !== message.created_at && (
                    <p className="text-xs text-muted-foreground mt-1">Editada</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}

// Wrapper com Error Boundary
export function MemberGroupMessages({ groupId }: MemberGroupMessagesProps) {
  return (
    <GroupErrorBoundary>
      <MemberGroupMessagesContent groupId={groupId} />
    </GroupErrorBoundary>
  );
}
