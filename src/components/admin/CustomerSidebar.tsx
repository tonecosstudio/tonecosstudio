/**
 * CustomerSidebar Component
 * Displays customer context: orders, quotes, subscription, and payments
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 8.2, 8.3, 8.4, 9.1, 9.2, 19.1, 19.2, 19.5, 25.3
 */

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PanelRightOpen,
  Package,
  FileText,
  CreditCard,
  Calendar,
  Loader2,
  User,
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
import { OrdersList } from "./sidebar/OrdersList";
import { QuotesList } from "./sidebar/QuotesList";
import { SubscriptionInfo } from "./sidebar/SubscriptionInfo";
import { PaymentInfo } from "./sidebar/PaymentInfo";
import { CustomerInfo } from "./sidebar/CustomerInfo";

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

  // Lazy load data when sidebar opens
  useEffect(() => {
    if (isOpen && !loading && orders.length === 0) {
      loadCustomerData();
    }
  }, [isOpen]);

  const loadCustomerData = async () => {
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
    } catch (error) {
      console.error("Error loading customer data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadCustomerData();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onToggle}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <PanelRightOpen className="h-4 w-4 mr-2" />
          Contexto do Cliente
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[500px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle>Contexto do Cliente</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-100px)] mt-6">
            <div className="space-y-6 pr-4">
              {/* Customer Personal Info Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" />
                    Dados Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomerInfo userId={userId} />
                </CardContent>
              </Card>

              <Separator />

              {/* Orders Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5" />
                    Pedidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OrdersList orders={orders} onRefresh={refreshData} />
                </CardContent>
              </Card>

              <Separator />

              {/* Quotes Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Orçamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <QuotesList quotes={quotes} onRefresh={refreshData} />
                </CardContent>
              </Card>

              <Separator />

              {/* Subscription Section - Only show if user has active subscription */}
              {subscription && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Calendar className="h-5 w-5" />
                        Assinatura
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SubscriptionInfo subscription={subscription} />
                    </CardContent>
                  </Card>
                  <Separator />
                </>
              )}

              {/* Payments Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5" />
                    Pagamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentInfo payments={payments} onRefresh={refreshData} />
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
