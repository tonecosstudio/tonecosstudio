/**
 * PaymentListItem Example Component
 * 
 * Exemplo de uso do componente PaymentListItem em diferentes layouts.
 * 
 * Requirements: 5.1-5.10
 * Task: 12.2 Criar componente PaymentListItem
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentListItem, PaymentListItemCard } from './PaymentListItem';
import type { PaymentListItem as PaymentListItemType } from '@/types/manual-payment';

// Mock data for examples
const examplePayments: PaymentListItemType[] = [
  {
    id: 'payment-001',
    reference_number: 'PAY-20240215-0001',
    customer_name: 'João Silva',
    customer_email: 'joao.silva@example.com',
    amount: 150.75,
    currency: 'BRL',
    payment_method_name: 'PIX',
    status: 'pending',
    created_at: '2024-02-15T10:30:00Z',
    file_count: 0,
    unread_messages: 0,
  },
  {
    id: 'payment-002',
    reference_number: 'PAY-20240215-0002',
    customer_name: 'Maria Santos',
    customer_email: 'maria.santos@example.com',
    amount: 299.90,
    currency: 'BRL',
    payment_method_name: 'PagSeguro',
    status: 'under_review',
    created_at: '2024-02-15T11:15:00Z',
    file_count: 2,
    unread_messages: 1,
  },
  {
    id: 'payment-003',
    reference_number: 'PAY-20240215-0003',
    customer_name: 'Carlos Oliveira',
    customer_email: 'carlos.oliveira@example.com',
    amount: 450.00,
    currency: 'BRL',
    payment_method_name: 'Bank Transfer',
    status: 'requires_info',
    created_at: '2024-02-15T12:45:00Z',
    file_count: 1,
    unread_messages: 3,
  },
  {
    id: 'payment-004',
    reference_number: 'PAY-20240214-0004',
    customer_name: 'Ana Costa',
    customer_email: 'ana.costa@example.com',
    amount: 125.50,
    currency: 'BRL',
    payment_method_name: 'PIX',
    status: 'approved',
    created_at: '2024-02-14T09:20:00Z',
    file_count: 1,
    unread_messages: 0,
  },
  {
    id: 'payment-005',
    reference_number: 'PAY-20240214-0005',
    customer_name: 'Pedro Almeida',
    customer_email: 'pedro.almeida@example.com',
    amount: 89.99,
    currency: 'BRL',
    payment_method_name: 'PicPay',
    status: 'rejected',
    created_at: '2024-02-14T14:10:00Z',
    file_count: 1,
    unread_messages: 0,
  },
];

export function PaymentListItemExample() {
  const handleViewPayment = (paymentId: string) => {
    console.log('Viewing payment:', paymentId);
    alert(`Visualizando pagamento: ${paymentId}`);
  };

  const handleExportPayment = (paymentId: string) => {
    console.log('Exporting payment:', paymentId);
    alert(`Exportando pagamento: ${paymentId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Exemplo: PaymentListItem</h1>
        <p className="text-muted-foreground">
          Demonstração do componente PaymentListItem em diferentes layouts e estados.
        </p>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista (Desktop)</TabsTrigger>
          <TabsTrigger value="cards">Cartões (Mobile)</TabsTrigger>
          <TabsTrigger value="status">Cores de Status</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Layout de Lista</CardTitle>
              <CardDescription>
                Ideal para visualização em desktop, mostra todas as informações em uma linha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {examplePayments.map((payment) => (
                  <PaymentListItem
                    key={payment.id}
                    payment={payment}
                    onViewPayment={handleViewPayment}
                    onExportPayment={handleExportPayment}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Layout de Cartões</CardTitle>
              <CardDescription>
                Ideal para visualização em mobile, organiza as informações em cartões.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {examplePayments.map((payment) => (
                  <PaymentListItemCard
                    key={payment.id}
                    payment={payment}
                    onViewPayment={handleViewPayment}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cores de Status</CardTitle>
              <CardDescription>
                Demonstração das cores e ícones para cada status de pagamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Legenda de Status:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm font-medium text-yellow-700">Pendente</span>
                      <span className="text-xs text-yellow-600 ml-auto">Aguardando comprovante</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium text-blue-700">Em Revisão</span>
                      <span className="text-xs text-blue-600 ml-auto">Comprovante enviado</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm font-medium text-orange-700">Precisa de Info</span>
                      <span className="text-xs text-orange-600 ml-auto">Aguardando resposta</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-green-700">Aprovado</span>
                      <span className="text-xs text-green-600 ml-auto">Pagamento confirmado</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <span className="text-sm font-medium text-red-700">Rejeitado</span>
                      <span className="text-xs text-red-600 ml-auto">Pagamento recusado</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Badges de Informação:</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 p-3 bg-white border rounded-lg">
                      <div className="flex items-center gap-1 px-2 py-1 border rounded text-xs">
                        <span className="text-gray-600">📄</span>
                        <span className="font-medium">2</span>
                      </div>
                      <span className="text-sm">Badge de arquivos (quantidade de comprovantes)</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white border rounded-lg">
                      <div className="flex items-center gap-1 px-2 py-1 border rounded text-xs">
                        <span className="text-gray-600">💬</span>
                        <span className="font-medium">3</span>
                      </div>
                      <span className="text-sm">Badge de mensagens não lidas</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Como Usar</CardTitle>
          <CardDescription>
            Exemplos de código para usar o componente PaymentListItem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Importação:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`import { PaymentListItem, PaymentListItemCard } from '@/components/admin/PaymentListItem';
import type { PaymentListItem as PaymentListItemType } from '@/types/manual-payment';`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Uso Básico:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`// Layout de lista (desktop)
<PaymentListItem
  payment={paymentData}
  onViewPayment={(id) => console.log('View:', id)}
  onExportPayment={(id) => console.log('Export:', id)}
/>

// Layout de cartões (mobile)
<PaymentListItemCard
  payment={paymentData}
  onViewPayment={(id) => console.log('View:', id)}
/>`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Estrutura dos Dados:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`interface PaymentListItemType {
  id: string;
  reference_number: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  currency: string;
  payment_method_name: string;
  status: 'pending' | 'under_review' | 'requires_info' | 'approved' | 'rejected';
  created_at: string;
  file_count: number;
  unread_messages: number;
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}