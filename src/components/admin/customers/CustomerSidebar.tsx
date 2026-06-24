/**
 * CustomerSidebar Component
 * Displays customer context: orders, quotes, subscription, and payments
 * Renders inline (not as a Sheet overlay) when embedded in admin layout
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 8.2, 8.3, 8.4, 9.1, 9.2, 19.1, 19.2, 19.5, 25.3
 */

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Package,
  FileText,
  CreditCard,
  Calendar,
  Loader2,
  User,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useCustomerSidebar,
  type CustomerSidebarOrder,
  type CustomerSidebarQuote,
  type CustomerSidebarSubscription,
  type CustomerSidebarPayment,
} from "@/hooks/admin/useCustomerSidebar";
import { OrdersList } from "../sidebar/OrdersList";
import { QuotesList } from "../sidebar/QuotesList";
import { SubscriptionInfo } from "../sidebar/SubscriptionInfo";
import { PaymentInfo } from "../sidebar/PaymentInfo";
import { CustomerInfo } from "../sidebar/CustomerInfo";

interface CustomerSidebarProps {
  userId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function CustomerSidebar({ userId, isOpen, onToggle }: CustomerSidebarProps) {
  const { context, loading, hasLoaded, loadCustomerData } = useCustomerSidebar(userId, isOpen);

  const orders: CustomerSidebarOrder[] = context?.orders ?? [];
  const quotes: CustomerSidebarQuote[] = context?.quotes ?? [];
  const subscription: CustomerSidebarSubscription | null = context?.subscription ?? null;
  const payments: CustomerSidebarPayment[] = context?.payments ?? [];
  const displayName =
    context?.profile?.full_name ||
    context?.profile?.display_name ||
    context?.profile?.username ||
    context?.profile?.email ||
    "Cliente";

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-sm font-semibold">Contexto do cliente</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={loadCustomerData}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading && !hasLoaded ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {context?.profile ? (
              <>
                <div className="rounded-lg border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{displayName}</p>
                      {context.profile.email && (
                        <p className="truncate text-xs text-muted-foreground">
                          {context.profile.email}
                        </p>
                      )}
                    </div>
                    <Badge variant={subscription ? "default" : "outline"}>
                      {subscription ? "Assinante ativo" : "Sem assinatura ativa"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Pedidos</div>
                    <div className="font-medium">{orders.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Orcamentos</div>
                    <div className="font-medium">{quotes.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Pagamentos</div>
                    <div className="font-medium">{payments.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Assinatura</div>
                    <div className="font-medium">{subscription ? "Ativa" : "Sem registro"}</div>
                  </div>
                </div>

                <Separator />
              </>
            ) : hasLoaded ? (
              <>
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Nao foi possivel carregar os dados principais do cliente.
                </div>
                <Separator />
              </>
            ) : null}

            {/* Customer Personal Info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Dados pessoais</span>
              </div>
              <CustomerInfo profile={context?.profile ?? null} loading={loading && !hasLoaded} />
            </div>

            <Separator />

            {/* Orders */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pedidos</span>
              </div>
              <OrdersList orders={orders} onRefresh={loadCustomerData} />
            </div>

            <Separator />

            {/* Quotes */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Orcamentos</span>
              </div>
              <QuotesList quotes={quotes} onRefresh={loadCustomerData} />
            </div>

            <Separator />

            {/* Subscription */}
            {subscription && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Assinatura</span>
                  </div>
                  <SubscriptionInfo subscription={subscription} />
                </div>
                <Separator />
              </>
            )}

            {/* Payments */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pagamentos</span>
              </div>
              <PaymentInfo payments={payments} onRefresh={loadCustomerData} />
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
