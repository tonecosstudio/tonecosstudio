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
import type { CustomerSidebarQuote } from "@/hooks/admin/useCustomerSidebar";
import { getOrderStatusLabel } from "@/config/admin-order-status";

interface QuotesListProps {
  quotes: CustomerSidebarQuote[];
  onRefresh: () => void;
}

export function QuotesList({ quotes, onRefresh: _onRefresh }: QuotesListProps) {
  if (quotes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        Nenhum orcamento encontrado para este cliente.
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      pending: { label: getOrderStatusLabel("pending"), variant: "secondary" },
      reviewing: { label: getOrderStatusLabel("reviewing"), variant: "outline" },
      answered: { label: getOrderStatusLabel("answered"), variant: "default" },
      archived: { label: getOrderStatusLabel("archived"), variant: "outline" },
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
      deposit_paid: { label: "Deposito pago", variant: "outline" },
      fully_paid: { label: "Pago integral", variant: "default" },
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

  const isPending = (quote: CustomerSidebarQuote) => {
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
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <div>
                  <p className="font-medium text-sm">Orcamento #{quote.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(quote.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              {isPending(quote) && <AlertCircle className="h-4 w-4 text-yellow-500" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">R$ {quote.total_amount.toFixed(2)}</span>
                {getStatusBadge(quote.status)}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pagamento:</span>
                {getPaymentStatusBadge(quote.payment_status)}
              </div>

              {(quote.items_summary || quote.items_count || quote.notes) && (
                <div className="bg-muted p-2 rounded text-xs">
                  {quote.items_count ? (
                    <p className="text-muted-foreground">
                      {quote.items_count} item{quote.items_count !== 1 ? "s" : ""}
                    </p>
                  ) : null}
                  {quote.items_summary ? <p className="font-medium">{quote.items_summary}</p> : null}
                  {quote.notes ? (
                    <p className="mt-1 text-muted-foreground line-clamp-2">{quote.notes}</p>
                  ) : null}
                </div>
              )}
            </div>

            {isPending(quote) && (
              <div className="bg-yellow-50 dark:bg-yellow-950 p-2 rounded text-xs text-yellow-700 dark:text-yellow-300">
                Orcamento pendente: requer acompanhamento.
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
