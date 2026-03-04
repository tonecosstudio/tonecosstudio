// @ts-nocheck
/**
 * Testes para o Modal de Confirmação de Ações em Massa
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkActionConfirmationModal } from './BulkActionConfirmationModal';
import { UnifiedOrder } from '@/types/admin/orders';

// Mock de pedidos para testes
const mockOrders: UnifiedOrder[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    type: 'subscription_delivery',
    status: 'confirmed',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    customer: {
      id: 'customer-1',
      name: 'João Silva',
      email: 'joao@example.com',
    },
    collection: {
      id: 'collection-1',
      name: 'Coleção Teste',
      slug: 'colecao-teste',
    },
    amount: 100,
    trackingCode: null,
    expectedDeliveryDate: null,
    actualDeliveryDate: null,
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    type: 'standalone_purchase',
    status: 'balance_paid',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    customer: {
      id: 'customer-2',
      name: 'Maria Santos',
      email: 'maria@example.com',
    },
    collection: {
      id: 'collection-2',
      name: 'Outra Coleção',
      slug: 'outra-colecao',
    },
    amount: 200,
    trackingCode: null,
    expectedDeliveryDate: null,
    actualDeliveryDate: null,
  },
];

describe('BulkActionConfirmationModal', () => {
  it('deve renderizar o modal quando open é true', () => {
    render(
      <BulkActionConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        actionType="update_status"
        orders={mockOrders}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Confirmar Atualização de Status')).toBeInTheDocument();
  });

  it('deve exibir a contagem correta de pedidos', () => {
    render(
      <BulkActionConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        actionType="update_status"
        orders={mockOrders}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/Pedidos que serão afetados \(2\):/)).toBeInTheDocument();
  });

  it('deve exibir informações dos pedidos na lista', () => {
    render(
      <BulkActionConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        actionType="update_status"
        orders={mockOrders}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('Coleção Teste')).toBeInTheDocument();
    expect(screen.getByText('Outra Coleção')).toBeInTheDocument();
  });

  it('deve chamar onConfirm quando o botão de confirmar é clicado', () => {
    const onConfirm = vi.fn();
    
    render(
      <BulkActionConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        actionType="update_status"
        orders={mockOrders}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    const confirmButton = screen.getByText('Atualizar Status');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('deve chamar onCancel quando o botão de cancelar é clicado', () => {
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();
    
    render(
      <BulkActionConfirmationModal
        open={true}
        onOpenChange={onOpenChange}
        actionType="update_status"
        orders={mockOrders}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('deve desabilitar botões quando isLoading é true', () => {
    render(
      <BulkActionConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        actionType="update_status"
        orders={mockOrders}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isLoading={true}
      />
    );

    const confirmButton = screen.getByText('Processando...');
    const cancelButton = screen.getByText('Cancelar');

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('deve exibir informação adicional quando fornecida', () => {
    render(
      <BulkActionConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        actionType="update_status"
        orders={mockOrders}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        additionalInfo="Novo status: Em Produção"
      />
    );

    expect(screen.getByText('Novo status: Em Produção')).toBeInTheDocument();
  });

  it('deve exibir título correto para geração de etiquetas', () => {
    render(
      <BulkActionConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        actionType="generate_labels"
        orders={mockOrders}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Confirmar Geração de Etiquetas')).toBeInTheDocument();
    expect(screen.getByText('Gerar Etiquetas')).toBeInTheDocument();
  });

  it('deve exibir título correto para exportação CSV', () => {
    render(
      <BulkActionConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        actionType="export_csv"
        orders={mockOrders}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Confirmar Exportação')).toBeInTheDocument();
    expect(screen.getByText('Exportar')).toBeInTheDocument();
  });

  it('deve formatar corretamente o tipo de pedido', () => {
    render(
      <BulkActionConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        actionType="update_status"
        orders={mockOrders}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Entrega de Assinatura')).toBeInTheDocument();
    expect(screen.getByText('Compra Avulsa')).toBeInTheDocument();
  });

  it('deve exibir status atual de cada pedido', () => {
    render(
      <BulkActionConfirmationModal
        open={true}
        onOpenChange={vi.fn()}
        actionType="update_status"
        orders={mockOrders}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('confirmed')).toBeInTheDocument();
    expect(screen.getByText('balance_paid')).toBeInTheDocument();
  });
});
