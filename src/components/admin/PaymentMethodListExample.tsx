/**
 * PaymentMethodListExample Component
 *
 * Example usage of PaymentMethodList component with mock data and handlers.
 * This demonstrates how to integrate the PaymentMethodList in an admin interface.
 */

import React, { useState } from "react";
import { PaymentMethodList } from "./PaymentMethodList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { PaymentMethod } from "@/types/manual-payment";

export function PaymentMethodListExample() {
  const [showForm, setShowForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  // Handle edit payment method
  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setShowForm(true);
    console.log("Editing payment method:", method);
  };

  // Handle delete payment method
  const handleDelete = (method: PaymentMethod) => {
    console.log("Deleting payment method:", method);
    // In a real implementation, you would call a delete API here
    alert(
      `Método de pagamento "${method.name}" será excluído. Implemente a lógica de exclusão aqui.`
    );
  };

  // Handle add new payment method
  const handleAddNew = () => {
    setEditingMethod(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Métodos de Pagamento</h1>
          <p className="text-muted-foreground">
            Configure e gerencie os métodos de pagamento disponíveis para os clientes.
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Método
        </Button>
      </div>

      <div className="rounded-lg border p-4">
        <PaymentMethodList onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">
              {editingMethod ? "Editar Método" : "Novo Método"}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {editingMethod
                ? `Editando: ${editingMethod.name}`
                : "Formulário para criar novo método de pagamento."}
            </p>
            <div className="space-y-4">
              <div className="text-sm">
                <strong>Nota:</strong> O formulário de criação/edição seria implementado aqui. Para
                este exemplo, estamos apenas demonstrando a integração.
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setShowForm(false)}>
                  {editingMethod ? "Salvar" : "Criar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
