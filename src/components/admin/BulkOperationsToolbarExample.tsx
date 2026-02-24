/**
 * Exemplo de uso do componente BulkOperationsToolbar
 *
 * Este componente demonstra como usar o BulkOperationsToolbar em um cenário real.
 */

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BulkOperationsToolbar } from "./BulkOperationsToolbar";
import { PaymentListItem } from "./PaymentListItem";
import type { PaymentListItem as PaymentListItemType } from "@/types/manual-payment";

// Dados de exemplo
const examplePayments: PaymentListItemType[] = [
  {
    id: "1",
    reference_number: "PAY-20240215-0001",
    customer_name: "João Silva",
    customer_email: "joao@email.com",
    amount: 150.5,
    currency: "BRL",
    payment_method_name: "PIX",
    status: "under_review",
    created_at: "2024-02-15T10:30:00Z",
    file_count: 2,
    unread_messages: 1,
  },
  {
    id: "2",
    reference_number: "PAY-20240215-0002",
    customer_name: "Maria Santos",
    customer_email: "maria@email.com",
    amount: 299.9,
    currency: "BRL",
    payment_method_name: "Cartão de Crédito",
    status: "pending",
    created_at: "2024-02-15T11:15:00Z",
    file_count: 0,
    unread_messages: 0,
  },
  {
    id: "3",
    reference_number: "PAY-20240215-0003",
    customer_name: "Pedro Oliveira",
    customer_email: "pedro@email.com",
    amount: 450.0,
    currency: "BRL",
    payment_method_name: "Boleto",
    status: "requires_info",
    created_at: "2024-02-15T12:45:00Z",
    file_count: 1,
    unread_messages: 3,
  },
  {
    id: "4",
    reference_number: "PAY-20240215-0004",
    customer_name: "Ana Costa",
    customer_email: "ana@email.com",
    amount: 125.75,
    currency: "BRL",
    payment_method_name: "PIX",
    status: "under_review",
    created_at: "2024-02-15T14:20:00Z",
    file_count: 3,
    unread_messages: 0,
  },
  {
    id: "5",
    reference_number: "PAY-20240215-0005",
    customer_name: "Carlos Mendes",
    customer_email: "carlos@email.com",
    amount: 680.25,
    currency: "BRL",
    payment_method_name: "Transferência Bancária",
    status: "under_review",
    created_at: "2024-02-15T15:10:00Z",
    file_count: 1,
    unread_messages: 2,
  },
];

export function BulkOperationsToolbarExample() {
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");

  // Função para lidar com a seleção de um pagamento
  const handlePaymentSelect = (paymentId: string, selected: boolean) => {
    if (selected) {
      setSelectedPayments((prev) => [...prev, paymentId]);
    } else {
      setSelectedPayments((prev) => prev.filter((id) => id !== paymentId));
    }
  };

  // Função para selecionar/deselecionar todos
  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedPayments(examplePayments.map((p) => p.id));
    } else {
      setSelectedPayments([]);
    }
  };

  // Função para limpar seleção
  const handleClearSelection = () => {
    setSelectedPayments([]);
  };

  // Função para visualizar um pagamento
  const handleViewPayment = (paymentId: string) => {
    alert(`Visualizando pagamento: ${paymentId}`);
  };

  // Função para exportar um pagamento
  const handleExportPayment = (paymentId: string) => {
    alert(`Exportando pagamento: ${paymentId}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Exemplo: BulkOperationsToolbar</CardTitle>
          <CardDescription>
            Demonstração do componente de operações em lote para pagamentos. Selecione um ou mais
            pagamentos para habilitar as operações em lote.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Pagamentos de Exemplo</h3>
                <p className="text-sm text-gray-500">
                  {examplePayments.length} pagamentos disponíveis
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  Lista
                </Button>
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                >
                  Cards
                </Button>
              </div>
            </div>

            {/* Lista de pagamentos */}
            {viewMode === "list" ? (
              <div className="space-y-2">
                {examplePayments.map((payment) => (
                  <PaymentListItem
                    key={payment.id}
                    payment={payment}
                    onViewPayment={handleViewPayment}
                    onExportPayment={handleExportPayment}
                    isSelected={selectedPayments.includes(payment.id)}
                    onSelectChange={handlePaymentSelect}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {examplePayments.map((payment) => (
                  <PaymentListItem
                    key={payment.id}
                    payment={payment}
                    onViewPayment={handleViewPayment}
                    onExportPayment={handleExportPayment}
                    isSelected={selectedPayments.includes(payment.id)}
                    onSelectChange={handlePaymentSelect}
                  />
                ))}
              </div>
            )}

            {/* Estatísticas de seleção */}
            {selectedPayments.length > 0 && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Resumo da Seleção</h4>
                    <p className="text-sm text-gray-500">
                      {selectedPayments.length} de {examplePayments.length} pagamentos selecionados
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(
                          examplePayments
                            .filter((p) => selectedPayments.includes(p.id))
                            .reduce((sum, p) => sum + p.amount, 0)
                        )}
                      </div>
                      <div className="text-xs text-gray-500">Valor total</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {["pending", "under_review", "requires_info"].map((status) => {
                        const count = examplePayments.filter(
                          (p) => selectedPayments.includes(p.id) && p.status === status
                        ).length;

                        if (count === 0) return null;

                        return (
                          <Badge key={status} variant="outline">
                            {count}{" "}
                            {status === "pending"
                              ? "Pendente"
                              : status === "under_review"
                                ? "Em Revisão"
                                : "Precisa de Info"}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations Toolbar */}
      <BulkOperationsToolbar
        selectedPayments={selectedPayments}
        payments={examplePayments}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onSelectionChange={setSelectedPayments}
      />

      {/* Instruções de uso */}
      <Card>
        <CardHeader>
          <CardTitle>Como usar o BulkOperationsToolbar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Funcionalidades implementadas:</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>
                  <strong>Seleção múltipla:</strong> Clique nas caixas de seleção individuais ou use
                  "Selecionar Todos" na barra de ferramentas
                </li>
                <li>
                  <strong>Aprovação em lote:</strong> Aprove múltiplos pagamentos de uma vez (apenas
                  pagamentos com status "Em Revisão" serão aprovados)
                </li>
                <li>
                  <strong>Exportação em lote:</strong> Exporte os pagamentos selecionados para CSV
                </li>
                <li>
                  <strong>Mensagem em lote:</strong> Envie uma mensagem para todos os clientes dos
                  pagamentos selecionados
                </li>
                <li>
                  <strong>Processamento assíncrono:</strong> Para mais de 10 itens, as operações são
                  processadas em segundo plano
                </li>
                <li>
                  <strong>Indicador de progresso:</strong> Mostra o progresso das operações em lote
                </li>
                <li>
                  <strong>Relatório de conclusão:</strong> Exibe um resumo após a conclusão das
                  operações
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Requisitos atendidos (12.1-12.15):</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>✅ Caixas de seleção para múltiplos pagamentos</li>
                <li>✅ Opção "Selecionar Todos" para a página atual</li>
                <li>✅ Botões de ação em lote quando itens estão selecionados</li>
                <li>✅ Contagem de itens selecionados</li>
                <li>✅ Indicador de progresso durante operações em lote</li>
                <li>✅ Relatório resumido após conclusão</li>
                <li>✅ Aprovação em lote com filtro de status</li>
                <li>✅ Exportação em lote para CSV</li>
                <li>✅ Mensagem em lote para clientes</li>
                <li>✅ Processamento assíncrono para grandes seleções</li>
              </ul>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Este é um componente de exemplo. Em um ambiente real, as
                operações se conectariam aos serviços backend implementados na tarefa 14.1.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
