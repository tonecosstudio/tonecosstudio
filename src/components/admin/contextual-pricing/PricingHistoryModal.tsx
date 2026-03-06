// @ts-nocheck
/**
 * Modal para exibir histórico de mudanças de preços
 * 
 * Mostra timeline de alterações em preços base e multiplicadores
 * para auditoria e rastreamento.
 * 
 * Spec: contextual-pricing-system
 * Task: 6.6
 */

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, TrendingUp, TrendingDown, Coins, Percent, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PricingHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PricingHistoryEntry {
  id: string;
  change_type: "base_price" | "multiplier" | "discount";
  collection_type_id: string | null;
  collection_type_name: string | null;
  collection_type_display_name: string | null;
  user_context: string | null;
  old_value: number;
  new_value: number;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

export function PricingHistoryModal({ open, onOpenChange }: PricingHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<"all" | "base_price" | "multiplier" | "discount">("all");

  // Query para buscar histórico
  const { data: history, isLoading } = useQuery({
    queryKey: ["pricing-history", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("pricing_history")
        .select(`
          *,
          collection_types (
            name,
            display_name
          )
        `)
        .order("changed_at", { ascending: false })
        .limit(100);

      if (activeTab !== "all") {
        query = query.eq("change_type", activeTab);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }

      return data.map((entry) => ({
        id: entry.id,
        change_type: entry.change_type,
        collection_type_id: entry.collection_type_id,
        collection_type_name: entry.collection_types?.name || null,
        collection_type_display_name: entry.collection_types?.display_name || null,
        user_context: entry.user_context,
        old_value: entry.old_value,
        new_value: entry.new_value,
        changed_by: entry.changed_by,
        changed_at: entry.changed_at,
        reason: entry.reason,
      })) as PricingHistoryEntry[];
    },
    enabled: open,
  });

  const formatValue = (value: number, changeType: string) => {
    if (changeType === "base_price") {
      return `${value} coins`;
    }
    if (changeType === "discount") {
      return `${value}%`;
    }
    return value.toFixed(2);
  };

  const getChangeIcon = (oldValue: number, newValue: number) => {
    if (newValue > oldValue) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    }
    if (newValue < oldValue) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case "base_price":
        return "Preço Base";
      case "multiplier":
        return "Multiplicador";
      case "discount":
        return "Desconto";
      default:
        return changeType;
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case "base_price":
        return <Coins className="h-4 w-4" />;
      case "multiplier":
      case "discount":
        return <Percent className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Histórico de Mudanças de Preços</DialogTitle>
          <DialogDescription>
            Visualize todas as alterações feitas em preços base, multiplicadores e descontos
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="base_price">Preços Base</TabsTrigger>
            <TabsTrigger value="multiplier">Multiplicadores</TabsTrigger>
            <TabsTrigger value="discount">Descontos</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : history && history.length > 0 ? (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getChangeTypeIcon(entry.change_type)}
                          <Badge variant="outline">
                            {getChangeTypeLabel(entry.change_type)}
                          </Badge>
                          {entry.collection_type_display_name && (
                            <Badge variant="secondary">
                              {entry.collection_type_display_name}
                            </Badge>
                          )}
                          {entry.user_context && (
                            <Badge variant="secondary">
                              {entry.user_context}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(entry.changed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">
                          {formatValue(entry.old_value, entry.change_type)}
                        </span>
                        {getChangeIcon(entry.old_value, entry.new_value)}
                        <span className="font-semibold">
                          {formatValue(entry.new_value, entry.change_type)}
                        </span>
                      </div>

                      {entry.reason && (
                        <p className="text-sm text-muted-foreground italic">
                          {entry.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma mudança registrada
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
