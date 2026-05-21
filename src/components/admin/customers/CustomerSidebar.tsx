/**
 * CustomerSidebar Component
 * Displays customer context: orders, quotes, subscription, and payments
 * Renders inline (not as a Sheet overlay) when embedded in admin layout
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 8.2, 8.3, 8.4, 9.1, 9.2, 19.1, 19.2, 19.5, 25.3
 */

import { useState, useEffect, useCallback } from "react";
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
import {
  getUserOrders,
  getUserQuotes,
  getUserSubscription,
  getUserPayments,
  type Order,
  type Quote,
  type Subscription,
  type ManualPayment,
} from "@/lib/services/integrationService";
import { OrdersList } from "../sidebar/OrdersList";
import { QuotesList } from "../sidebar/QuotesList";
import { SubscriptionInfo } from "../sidebar/SubscriptionInfo";
import { PaymentInfo } from "../sidebar/PaymentInfo";
import { CustomerInfo } from "../sidebar/CustomerInfo";
import { log } from "@/lib/logger";

interface CustomerSidebarProps {
  userId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function CustomerSidebar({ userId, isOpen, onToggle }: CustomerSidebarProps) {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<ManualPayment[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load data when sidebar opens or userId changes
  const loadCustomerData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersData, quotesData, subscriptionData, paymentsData] = await Promise.all([
        getUserOrders(userId),
        getUserQuotes(userId),
        getUserSubscription(userId),
        getUserPayments(userId),
      ]);

      setOrders(ordersData);
      setQuotes(quotesData);
      setSubscription(subscriptionData);
      setPayments(paymentsData);
      setHasLoaded(true);
    } catch (error) {
      log.error("Error loading customer data", { error, userId });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      loadCustomerData();
    }
  }, [isOpen, userId, loadCustomerData]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Contexto do Cliente</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadCustomerData} disabled={loading}>
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
            {/* Customer Personal Info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Dados Pessoais</span>
              </div>
              <CustomerInfo userId={userId} />
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
                <span className="text-sm font-medium">Orçamentos</span>
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
