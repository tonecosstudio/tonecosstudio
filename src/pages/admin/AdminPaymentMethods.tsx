/**
 * AdminPaymentMethods Page
 *
 * Admin interface for managing payment methods (PIX, boleto, bank transfer, etc.)
 * Allows creating, editing, activating/deactivating, and reordering payment methods.
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PaymentMethodList } from "@/components/admin/PaymentMethodList";
import { PaymentMethodForm } from "@/components/admin/PaymentMethodForm";
import type { PaymentMethod } from "@/types/manual-payment";

export default function AdminPaymentMethods() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const handleEdit = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setIsFormOpen(true);
  };

  const handleDelete = (method: PaymentMethod) => {
    // Delete is handled by PaymentMethodList component
    console.log("Delete method:", method.id);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedMethod(null);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedMethod(null);
  };

  return (
    <AdminLayout>
      <SEOHead
        title="Métodos de Pagamento - Admin"
        description="Gerenciar métodos de pagamento disponíveis"
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Métodos de Pagamento</h1>
            <p className="text-muted-foreground mt-2">
              Configure os métodos de pagamento disponíveis para os clientes
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Método
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Métodos Cadastrados</CardTitle>
            <CardDescription>
              Gerencie os métodos de pagamento, configure chaves PIX, instruções e prioridade de
              exibição
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentMethodList onEdit={handleEdit} onDelete={handleDelete} />
          </CardContent>
        </Card>
      </div>

      <PaymentMethodForm
        method={selectedMethod}
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </AdminLayout>
  );
}
