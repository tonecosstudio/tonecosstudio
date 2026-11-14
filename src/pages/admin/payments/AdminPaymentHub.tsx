import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  CreditCard,
  Calculator,
  KeyRound,
  History,
} from "lucide-react";
import { matchPath, useLocation, useNavigate } from "react-router-dom";
import { ADMIN_ROUTES } from "@/config/routes";
import AdminPayments from "./AdminPayments";
import AdminPaymentMethods from "./AdminPaymentMethods";
import PaymentCalculator from "./PaymentCalculator";
import AdminPreorders from "./AdminPreorders";
import AdminPaymentKeys from "./AdminPaymentKeys";

type PaymentHubTab = "payments" | "methods" | "keys" | "calculator" | "legacy";

const PAYMENT_TAB_PATHS: Record<PaymentHubTab, string> = {
  payments: ADMIN_ROUTES.payments,
  methods: ADMIN_ROUTES.paymentMethods,
  keys: ADMIN_ROUTES.paymentKeys,
  calculator: ADMIN_ROUTES.paymentCalculator,
  legacy: `${ADMIN_ROUTES.payments}?view=legacy`,
};

function isPaymentHubTab(value: string): value is PaymentHubTab {
  return value in PAYMENT_TAB_PATHS;
}

function getCurrentTab(pathname: string, search: string): PaymentHubTab {
  if (pathname === ADMIN_ROUTES.paymentMethods) return "methods";
  if (pathname === ADMIN_ROUTES.paymentKeys) return "keys";
  if (pathname === ADMIN_ROUTES.paymentCalculator) return "calculator";
  if (pathname === ADMIN_ROUTES.preorders) return "payments";
  if (matchPath(ADMIN_ROUTES.paymentDetails, pathname)) return "legacy";
  if (new URLSearchParams(search).get("view") === "legacy") return "legacy";
  return "payments";
}

export default function AdminPaymentHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = getCurrentTab(location.pathname, location.search);

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
            Orçamentos, pedidos, métodos, chaves e cálculos
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
            <TabsTrigger value="legacy">
              <History className="mr-2 h-4 w-4" />
              Histórico legado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <AdminPreorders />
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

          <TabsContent value="legacy" className="space-y-4">
            <AdminPayments />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
