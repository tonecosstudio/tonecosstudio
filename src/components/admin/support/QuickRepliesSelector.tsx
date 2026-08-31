import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Zap, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useQuickRepliesSelector } from "@/hooks/admin/useQuickRepliesSelector";
import type { QuickReply } from "@/hooks/admin/useQuickRepliesSelector";
import {
  processTemplate,
  fetchCustomerData,
  detectVariables,
} from "@/services/support/support-template-service";

interface QuickRepliesSelectorProps {
  onSelect: (message: string) => void;
  userId?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  saudacao: "Saudação",
  pedido: "Pedido",
  pagamento: "Pagamento",
  rastreamento: "Rastreamento",
  orcamento: "Orçamento",
  duvida: "Dúvida",
  tecnico: "Técnico",
  despedida: "Despedida",
  outro: "Outro",
};

export function QuickRepliesSelector({ onSelect, userId }: QuickRepliesSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [previewReply, setPreviewReply] = useState<QuickReply | null>(null);
  const [processedMessage, setProcessedMessage] = useState("");
  const [processingTemplate, setProcessingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const { data: quickReplies = [], isLoading: loading, isError } =
    useQuickRepliesSelector(isOpen);

  useEffect(() => {
    if (isOpen && isError) {
      toast.error("Erro ao carregar respostas rápidas");
    }
  }, [isOpen, isError]);

  const filteredReplies = useMemo(() => {
    let filtered = quickReplies as QuickReply[];
    if (selectedCategory) {
      filtered = filtered.filter((reply) => reply.category === selectedCategory);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (reply) =>
          reply.title.toLowerCase().includes(term) ||
          reply.message.toLowerCase().includes(term),
      );
    }
    return filtered;
  }, [quickReplies, searchTerm, selectedCategory]);

  const handleSelect = async (reply: QuickReply) => {
    const variables = detectVariables(reply.message);
    if (variables.length > 0 && userId) {
      setPreviewReply(reply);
      setProcessedMessage("");
      setTemplateError(null);
      setProcessingTemplate(true);

      try {
        const customerData = await fetchCustomerData(userId);
        const processed = await processTemplate(reply.message, customerData);
        setProcessedMessage(processed);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível validar os dados do template.";
        setTemplateError(message);
        setProcessedMessage("");
        toast.error("Template indisponível: verifique os dados oficiais antes de enviar.");
      } finally {
        setProcessingTemplate(false);
      }
      return;
    }

    if (variables.length > 0 && !userId) {
      toast.error("Selecione um cliente antes de usar um template com variáveis.");
      return;
    }

    onSelect(reply.message);
    setIsOpen(false);
    setSearchTerm("");
    setSelectedCategory(null);
  };

  const handleConfirmProcessed = () => {
    if (!processedMessage || templateError || detectVariables(processedMessage).length > 0) {
      toast.error("A mensagem não foi validada e não pode ser usada.");
      return;
    }

    onSelect(processedMessage);
    setIsOpen(false);
    setPreviewReply(null);
    setProcessedMessage("");
    setTemplateError(null);
    setSearchTerm("");
    setSelectedCategory(null);
  };

  const handleCancelPreview = () => {
    setPreviewReply(null);
    setProcessedMessage("");
    setTemplateError(null);
  };

  const categories = Array.from(
    new Set((quickReplies as QuickReply[]).map((reply) => reply.category)),
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Zap className="mr-2 h-4 w-4" />
          Respostas Rápidas
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        {previewReply ? (
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Preview da mensagem</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Template original:</p>
                <div className="rounded bg-muted p-2 text-sm">{previewReply.message}</div>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Mensagem processada:</p>
                <div className="rounded border border-primary/20 bg-primary/5 p-3 text-sm">
                  {processingTemplate ? (
                    <span className="text-muted-foreground">Processando...</span>
                  ) : templateError ? (
                    <span className="text-destructive">{templateError}</span>
                  ) : (
                    processedMessage
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleConfirmProcessed}
                  disabled={processingTemplate || !!templateError || !processedMessage}
                  className="flex-1"
                >
                  Usar esta mensagem
                </Button>
                <Button
                  onClick={handleCancelPreview}
                  variant="outline"
                  disabled={processingTemplate}
                >
                  Voltar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b p-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar respostas..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {categories.length > 0 && (
              <div className="border-b p-3">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={selectedCategory === null ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(null)}
                  >
                    Todas
                  </Badge>
                  {categories.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {CATEGORY_LABELS[category] || category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : filteredReplies.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma resposta rápida encontrada
                </div>
              ) : (
                <div className="p-2">
                  {filteredReplies.map((reply) => {
                    const hasVariables = detectVariables(reply.message).length > 0;
                    return (
                      <button
                        key={reply.id}
                        onClick={() => void handleSelect(reply)}
                        className="w-full rounded-md p-3 text-left transition-colors hover:bg-accent"
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{reply.title}</span>
                            {reply.shortcut && (
                              <Badge variant="outline" className="text-[10px]">
                                {reply.shortcut}
                              </Badge>
                            )}
                            {hasVariables && (
                              <Sparkles
                                aria-label="Contém variáveis dinâmicas"
                                className="h-3 w-3 text-primary"
                              />
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {CATEGORY_LABELS[reply.category] || reply.category}
                          </Badge>
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {reply.message}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {userId && (
              <>
                <Separator />
                <div className="bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    Templates com variáveis só podem ser usados após validação dos dados oficiais.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
