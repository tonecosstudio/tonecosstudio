import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Keyboard } from "lucide-react";
import { toast } from "sonner";
import { useSupportQuickReplies } from "@/hooks/admin/useSupportQuickReplies";

interface SupportQuickReply {
  id: string;
  title: string;
  shortcut: string;
  category: string;
  message: string;
  is_active: boolean;
}

interface QuickRepliesProps {
  onSelect: (message: string) => void;
}

export function QuickReplies({ onSelect }: QuickRepliesProps) {
  const { data: quickReplies = [], isLoading: loading, isError } = useSupportQuickReplies();

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar respostas rapidas");
  }, [isError]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      const shortcut = "Ctrl+" + e.key;
      const reply = (quickReplies as SupportQuickReply[]).find(
        (item) => item.shortcut?.toLowerCase() === shortcut.toLowerCase()
      );
      if (!reply) return;
      e.preventDefault();
      onSelect(reply.message);
      toast.success("Resposta rapida aplicada: " + reply.title);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quickReplies, onSelect]);

  const handleSelect = (reply: SupportQuickReply) => {
    onSelect(reply.message);
    toast.success("Resposta rapida aplicada: " + reply.title);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando respostas rapidas...</p>;
  if (quickReplies.length === 0) return null;

  const categories = [...new Set((quickReplies as SupportQuickReply[]).map((item) => item.category))];

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-600" />
          Respostas Rapidas
        </CardTitle>
        <CardDescription className="text-xs flex items-center gap-2">
          <Keyboard className="h-3 w-3" />
          Use os atalhos de teclado para inserir rapidamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category) => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">{category}</p>
            <div className="grid grid-cols-1 gap-2">
              {(quickReplies as SupportQuickReply[])
                .filter((item) => item.category === category)
                .map((reply) => (
                  <Button
                    key={reply.id}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2 px-3 text-left"
                    onClick={() => handleSelect(reply)}
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium line-clamp-1">{reply.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {reply.message.substring(0, 60)}...
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {reply.shortcut}
                      </Badge>
                    </div>
                  </Button>
                ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
