/**
 * QuotesList Component
 * Displays list of customer quotes with status
 *
 * Requirements: 8.2, 8.3, 8.4
 */

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Quote } from "@/lib/services/integrationService";

interface QuotesListProps {
  quotes: Quote[];
  onRefresh: () => void;
}

export function QuotesList({ quotes, onRefresh: _onRefresh }: QuotesListProps) {
  if (quotes.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Nenhum orçamento encontrado
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      pending: { label: "Pendente", variant: "secondary" },
      approved: { label: "Aprovado", variant: "default" },
      rejected: { label: "Rejeitado", variant: "destructive" },
      paid: { label: "Pago", variant: "default" },
    };

    const config = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      pending: { label: "Aguardando", variant: "secondary" },
      paid: { label: "Pago", variant: "default" },
      overdue: { label: "Atrasado", variant: "destructive" },
    };

    const config = statusMap[paymentStatus] || {
      label: paymentStatus,
      variant: "outline" as const,
    };
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const isPending = (quote: Quote) => {
    return quote.status === "pending" || quote.payment_status === "pending";
  };

  return (
    <div className="space-y-3">
      {quotes.map((quote) => (
        <Card
          key={quote.id}
          className={`p-3 ${isPending(quote) ? "border-yellow-500 border-2" : ""}`}
        >
          <div className="space-y-2">
            {/* Quote Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <div>
                  <p className="font-medium text-sm">Orçamento #{quote.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(quote.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              {isPending(quote) && <AlertCircle className="h-4 w-4 text-yellow-500" />}
            </div>

            {/* Quote Details */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">R$ {quote.total_amount.toFixed(2)}</span>
                {getStatusBadge(quote.status)}
              </div>

              {/* Payment Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pagamento:</span>
                {getPaymentStatusBadge(quote.payment_status)}
              </div>

              {/* Items Summary */}
              {quote.items_summary && (
                <div className="bg-muted p-2 rounded text-xs">
                  <p className="text-muted-foreground">Itens:</p>
                  <p className="font-medium">{quote.items_summary}</p>
                </div>
              )}
            </div>

            {/* Pending Highlight */}
            {isPending(quote) && (
              <div className="bg-yellow-50 dark:bg-yellow-950 p-2 rounded text-xs text-yellow-700 dark:text-yellow-300">
                ⚠️ Orçamento pendente - requer atenção
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
