/**
 * Modal para exibir histórico de mudanças de preços.
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
import { Clock, Coins, Loader2, Percent, TrendingDown, TrendingUp } from "lucide-react";
import { useContextualPricingHistory } from "@/hooks/admin/useContextualPricingHistory";

interface PricingHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PricingHistoryTab = "all" | "base_price" | "multiplier" | "discount";

export function PricingHistoryModal({ open, onOpenChange }: PricingHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<PricingHistoryTab>("all");
  const { data: history, isLoading } = useContextualPricingHistory(open, activeTab);

  const formatValue = (value: number, changeType: string) => {
    if (changeType === "base_price") return `${value} coins`;
    if (changeType === "discount") return `${value}%`;
    return value.toFixed(2);
  };

  const getChangeIcon = (oldValue: number, newValue: number) => {
    if (newValue > oldValue) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (newValue < oldValue) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getChangeTypeLabel = (changeType: string) => {
    if (changeType === "base_price") return "Preço Base";
    if (changeType === "multiplier") return "Multiplicador";
    if (changeType === "discount") return "Desconto";
    return changeType;
  };

  const getChangeTypeIcon = (changeType: string) => {
    if (changeType === "base_price") return <Coins className="h-4 w-4" />;
    if (changeType === "multiplier" || changeType === "discount") return <Percent className="h-4 w-4" />;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Histórico de Mudanças de Preços</DialogTitle>
          <DialogDescription>
            Visualize todas as alterações em preços base, multiplicadores e descontos
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PricingHistoryTab)}>
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
                      className="space-y-2 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getChangeTypeIcon(entry.change_type)}
                          <Badge variant="outline">{getChangeTypeLabel(entry.change_type)}</Badge>
                          {entry.collection_type_display_name && (
                            <Badge variant="secondary">{entry.collection_type_display_name}</Badge>
                          )}
                          {entry.user_context && <Badge variant="secondary">{entry.user_context}</Badge>}
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

                      {entry.reason && <p className="text-sm italic text-muted-foreground">{entry.reason}</p>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="py-8 text-center text-muted-foreground">Nenhuma mudança registrada</div>
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
