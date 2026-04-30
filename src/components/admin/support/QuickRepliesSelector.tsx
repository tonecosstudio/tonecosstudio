// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Zap, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  processTemplate,
  fetchCustomerData,
  detectVariables,
  TEMPLATE_VARIABLES,
} from "@/lib/services/templateService";

interface QuickReply {
  id: string;
  category: string;
  title: string;
  message: string;
  display_order: number;
  is_active: boolean;
}

interface QuickRepliesSelectorProps {
  onSelect: (message: string) => void;
  userId?: string; // ID do cliente para processar variáveis
}

const CATEGORY_LABELS: Record<string, string> = {
  saudacao: "Saudação",
  pedido: "Pedido",
  pagamento: "Pagamento",
  rastreamento: "Rastreamento",
  orcamento: "Orçamento",
  duvida: "Dúvida",
  despedida: "Despedida",
  outro: "Outro",
};

export function QuickRepliesSelector({ onSelect, userId }: QuickRepliesSelectorProps) {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [filteredReplies, setFilteredReplies] = useState<QuickReply[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewReply, setPreviewReply] = useState<QuickReply | null>(null);
  const [processedMessage, setProcessedMessage] = useState<string>("");
  const [processingTemplate, setProcessingTemplate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchQuickReplies();
    }
  }, [isOpen]);

  useEffect(() => {
    filterReplies();
  }, [searchTerm, selectedCategory, quickReplies]);

  const fetchQuickReplies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quick_replies" as any)
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Erro ao buscar respostas rápidas:", error);
      toast.error("Erro ao carregar respostas rápidas");
    } else {
      setQuickReplies((data as any) || []);
    }
    setLoading(false);
  };

  const filterReplies = () => {
    let filtered = quickReplies;

    if (selectedCategory) {
      filtered = filtered.filter((r) => r.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) => r.title.toLowerCase().includes(term) || r.message.toLowerCase().includes(term)
      );
    }

    setFilteredReplies(filtered);
  };

  const handleSelect = async (reply: QuickReply) => {
    // Detectar se tem variáveis
    const variables = detectVariables(reply.message);

    if (variables.length > 0 && userId) {
      // Tem variáveis e temos userId - processar template
      setPreviewReply(reply);
      setProcessingTemplate(true);

      try {
        const customerData = await fetchCustomerData(userId);
        const processed = await processTemplate(reply.message, customerData);
        setProcessedMessage(processed);
      } catch (error) {
        console.error("Erro ao processar template:", error);
        toast.error("Erro ao processar template");
        setProcessedMessage(reply.message);
      } finally {
        setProcessingTemplate(false);
      }
    } else {
      // Sem variáveis ou sem userId - usar mensagem direta
      onSelect(reply.message);
      setIsOpen(false);
      setSearchTerm("");
      setSelectedCategory(null);
    }
  };

  const handleConfirmProcessed = () => {
    onSelect(processedMessage);
    setIsOpen(false);
    setPreviewReply(null);
    setProcessedMessage("");
    setSearchTerm("");
    setSelectedCategory(null);
  };

  const handleCancelPreview = () => {
    setPreviewReply(null);
    setProcessedMessage("");
  };

  const categories = Array.from(new Set(quickReplies.map((r) => r.category)));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Zap className="h-4 w-4 mr-2" />
          Respostas Rápidas
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        {previewReply ? (
          // Preview de mensagem processada
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Preview da Mensagem</h3>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Template Original:</p>
                <div className="p-2 bg-muted rounded text-sm">{previewReply.message}</div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Mensagem Processada:</p>
                <div className="p-3 bg-primary/5 border border-primary/20 rounded text-sm">
                  {processingTemplate ? (
                    <span className="text-muted-foreground">Processando...</span>
                  ) : (
                    processedMessage
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleConfirmProcessed}
                  disabled={processingTemplate}
                  className="flex-1"
                >
                  Usar Esta Mensagem
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
          // Lista de respostas rápidas
          <>
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar respostas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {categories.length > 0 && (
              <div className="p-3 border-b">
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
                        onClick={() => handleSelect(reply)}
                        className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{reply.title}</span>
                            {hasVariables && (
                              <Sparkles
                                className="h-3 w-3 text-primary"
                                title="Contém variáveis dinâmicas"
                              />
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {CATEGORY_LABELS[reply.category] || reply.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
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
                <div className="p-3 bg-muted/50">
                  <p className="text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 inline mr-1" />
                    Templates com variáveis serão preenchidos automaticamente com dados do cliente
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
