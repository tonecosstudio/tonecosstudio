// @ts-nocheck
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CreditCard, Calculator, CheckCircle, Key } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AdminPayments from "./AdminPayments";
import AdminPaymentMethods from "./AdminPaymentMethods";
import AdminPaymentKeys from "./AdminPaymentKeys";
import PaymentCalculator from "./PaymentCalculator";
import PaymentVerification from "./PaymentVerification";

/**
 * AdminPaymentHub - Página Unificada de Pagamentos
 *
 * Consolida 5 páginas em uma só com tabs:
 * - AdminPayments (Pagamentos Manuais)
 * - AdminPaymentMethods (Métodos de Pagamento)
 * - AdminPaymentKeys (Chaves de API)
 * - PaymentCalculator (Calculadora MP)
 * - PaymentVerification (Verificação de Pagamentos)
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
          <TabsList className="grid w-full grid-cols-5">
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
              Chaves API
            </TabsTrigger>
            <TabsTrigger value="calculator">
              <Calculator className="h-4 w-4 mr-2" />
              Calculadora
            </TabsTrigger>
            <TabsTrigger value="verification">
              <CheckCircle className="h-4 w-4 mr-2" />
              Verificação
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

          {/* Chaves de API */}
          <TabsContent value="keys" className="space-y-4">
            <AdminPaymentKeys />
          </TabsContent>

          {/* Calculadora MP */}
          <TabsContent value="calculator" className="space-y-4">
            <PaymentCalculator />
          </TabsContent>

          {/* Verificação de Pagamentos */}
          <TabsContent value="verification" className="space-y-4">
            <PaymentVerification />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
