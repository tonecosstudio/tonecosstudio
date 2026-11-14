import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  CreditCard,
  Calculator,
  Package,
  KeyRound,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { ADMIN_ROUTES } from "@/config/routes";
import AdminPayments from "./AdminPayments";
import AdminPaymentMethods from "./AdminPaymentMethods";
import PaymentCalculator from "./PaymentCalculator";
import AdminPreorders from "./AdminPreorders";
import AdminPaymentKeys from "./AdminPaymentKeys";

type PaymentHubTab =
  | "payments"
  | "methods"
  | "keys"
  | "calculator"
  | "preorders";

const PAYMENT_TAB_PATHS: Record<PaymentHubTab, string> = {
  payments: ADMIN_ROUTES.payments,
  methods: ADMIN_ROUTES.paymentMethods,
  keys: ADMIN_ROUTES.paymentKeys,
  calculator: ADMIN_ROUTES.paymentCalculator,
  preorders: ADMIN_ROUTES.preorders,
};

function isPaymentHubTab(value: string): value is PaymentHubTab {
  return value in PAYMENT_TAB_PATHS;
}

function getCurrentTab(pathname: string): PaymentHubTab {
  if (pathname === ADMIN_ROUTES.paymentMethods) return "methods";
  if (pathname === ADMIN_ROUTES.paymentKeys) return "keys";
  if (pathname === ADMIN_ROUTES.paymentCalculator) return "calculator";
  if (pathname === ADMIN_ROUTES.preorders) return "preorders";
  return "payments";
}

export default function AdminPaymentHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = getCurrentTab(location.pathname);

  const handleTabChange = (value: string) => {
    if (isPaymentHubTab(value)) {
      navigate(PAYMENT_TAB_PATHS[value]);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1
            className="text-2xl md:text-3xl tracking-[0.2em] uppercase text-[hsl(var(--gold-accent))]"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)",
            }}
          >
            Central de Pagamentos
          </h1>
          <p className="text-[hsl(0,0%,45%)] text-xs tracking-wider font-mono uppercase mt-1">
            Pagamentos, métodos, chaves, cálculos e pré-vendas
          </p>
        </div>

        <Tabs
          value={currentTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="payments">
              <Wallet className="h-4 w-4 mr-2" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="methods">
              <CreditCard className="h-4 w-4 mr-2" />
              Métodos
            </TabsTrigger>
            <TabsTrigger value="keys">
              <KeyRound className="mr-2 h-4 w-4" />
              Chaves
            </TabsTrigger>
            <TabsTrigger value="calculator">
              <Calculator className="h-4 w-4 mr-2" />
              Cálculos
            </TabsTrigger>
            <TabsTrigger value="preorders">
              <Package className="mr-2 h-4 w-4" />
              Pagamentos de pedidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <AdminPayments />
          </TabsContent>

          <TabsContent value="methods" className="space-y-4">
            <AdminPaymentMethods />
          </TabsContent>

          <TabsContent value="keys" className="space-y-4">
            <AdminPaymentKeys />
          </TabsContent>

          <TabsContent value="calculator" className="space-y-4">
            <PaymentCalculator />
          </TabsContent>

          <TabsContent value="preorders" className="space-y-4">
            <AdminPreorders />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
