import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CreditCard, Calculator, Key } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AdminPayments from "./AdminPayments";
import AdminPaymentMethods from "./AdminPaymentMethods";
import AdminPaymentKeys from "./AdminPaymentKeys";
import PaymentCalculator from "./PaymentCalculator";

export default function AdminPaymentHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const currentTab = ["payments", "methods", "keys", "calculator"].includes(tabParam ?? "")
    ? tabParam!
    : "payments";

  const handleTabChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", value);
    setSearchParams(nextParams);
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
            Gerencie pagamentos, métodos, credenciais e cálculos financeiros
          </p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payments">
              <Wallet className="h-4 w-4 mr-2" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="methods">
              <CreditCard className="h-4 w-4 mr-2" />
              Métodos
            </TabsTrigger>
            <TabsTrigger value="keys">
              <Key className="h-4 w-4 mr-2" />
              Chaves
            </TabsTrigger>
            <TabsTrigger value="calculator">
              <Calculator className="h-4 w-4 mr-2" />
              Cálculos
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
        </Tabs>
      </div>
    </AdminLayout>
  );
}
