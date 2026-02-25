import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CreditCard, Calculator } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AdminPayments from "./AdminPayments";
import AdminPaymentMethods from "./AdminPaymentMethods";
import PaymentCalculator from "./PaymentCalculator";

/**
 * AdminPaymentHub - Página Unificada de Pagamentos
 *
 * Mescla 3 páginas em uma só com tabs:
 * - AdminPayments (Pagamentos Manuais)
 * - AdminPaymentMethods (Métodos de Pagamento)
 * - PaymentCalculator (Calculadora MP)
 */
export default function AdminPaymentHub() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "payments";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Central de Pagamentos</h1>
          <p className="text-muted-foreground">
            Gerencie pagamentos, métodos e calcule taxas em um só lugar
          </p>
        </div>

        {/* Tabs Unificadas */}
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payments">
              <Wallet className="h-4 w-4 mr-2" />
              Pagamentos Manuais
            </TabsTrigger>
            <TabsTrigger value="methods">
              <CreditCard className="h-4 w-4 mr-2" />
              Métodos
            </TabsTrigger>
            <TabsTrigger value="calculator">
              <Calculator className="h-4 w-4 mr-2" />
              Calculadora MP
            </TabsTrigger>
          </TabsList>

          {/* Pagamentos Manuais */}
          <TabsContent value="payments" className="space-y-4">
            <AdminPayments />
          </TabsContent>

          {/* Métodos de Pagamento */}
          <TabsContent value="methods" className="space-y-4">
            <AdminPaymentMethods />
          </TabsContent>

          {/* Calculadora MP */}
          <TabsContent value="calculator" className="space-y-4">
            <PaymentCalculator />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
