/**
 * Testes para o serviço de geração de etiquetas
 * 
 * Requisitos: 8.1, 8.2, 8.4, 8.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  generateBulkLabels,
  canGenerateLabel, 
  getLabelErrorMessage, 
  openLabelsInTabs,
  LabelGenerationError 
} from './label-service';
import type { UnifiedOrder } from '@/types/admin/orders';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

// Mock do ShippingService
vi.mock('@/services/delivery/shipping-service', () => ({
  shippingService: {
    generateLabel: vi.fn()
  }
}));

// Usar fake timers para testar setTimeout
vi.useFakeTimers();

describe('Label Service', () => {
  describe('canGenerateLabel', () => {
    it('deve retornar false para pedidos cancelados', () => {
      const order: UnifiedOrder = {
        id: 'test-id',
        type: 'subscription_delivery',
        status: 'cancelled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customer: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
        collection: { id: 'col-1', name: 'Test Collection', slug: 'test' },
        amount: 100,
        trackingCode: null,
        expectedDeliveryDate: null,
        actualDeliveryDate: null
      };

      expect(canGenerateLabel(order)).toBe(false);
    });

    it('deve retornar false para pedidos já entregues', () => {
      const order: UnifiedOrder = {
        id: 'test-id',
        type: 'subscription_delivery',
        status: 'delivered',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customer: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
        collection: { id: 'col-1', name: 'Test Collection', slug: 'test' },
        amount: 100,
        trackingCode: null,
        expectedDeliveryDate: null,
        actualDeliveryDate: null
      };

      expect(canGenerateLabel(order)).toBe(false);
    });

    it('deve retornar false para pedidos que já possuem código de rastreamento', () => {
      const order: UnifiedOrder = {
        id: 'test-id',
        type: 'subscription_delivery',
        status: 'in_production',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customer: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
        collection: { id: 'col-1', name: 'Test Collection', slug: 'test' },
        amount: 100,
        trackingCode: 'BR123456789BR',
        expectedDeliveryDate: null,
        actualDeliveryDate: null
      };

      expect(canGenerateLabel(order)).toBe(false);
    });

    it('deve retornar true para pedidos válidos sem código de rastreamento', () => {
      const order: UnifiedOrder = {
        id: 'test-id',
        type: 'subscription_delivery',
        status: 'in_production',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customer: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
        collection: { id: 'col-1', name: 'Test Collection', slug: 'test' },
        amount: 100,
        trackingCode: null,
        expectedDeliveryDate: null,
        actualDeliveryDate: null
      };

      expect(canGenerateLabel(order)).toBe(true);
    });
  });

  describe('getLabelErrorMessage', () => {
    it('deve retornar mensagem apropriada para ADDRESS_NOT_FOUND', () => {
      const error = new LabelGenerationError(
        'Endereço não encontrado',
        'ADDRESS_NOT_FOUND',
        'order-1'
      );

      const message = getLabelErrorMessage(error);
      expect(message).toContain('Endereço de entrega não encontrado');
    });

    it('deve retornar mensagem apropriada para INVALID_ADDRESS', () => {
      const error = new LabelGenerationError(
        'Endereço inválido: faltam campos',
        'INVALID_ADDRESS',
        'order-1'
      );

      const message = getLabelErrorMessage(error);
      expect(message).toBe('Endereço inválido: faltam campos');
    });

    it('deve retornar mensagem apropriada para GENERATION_FAILED', () => {
      const error = new LabelGenerationError(
        'Falha na geração',
        'GENERATION_FAILED',
        'order-1'
      );

      const message = getLabelErrorMessage(error);
      expect(message).toContain('Erro ao gerar etiqueta');
    });

    it('deve retornar mensagem genérica para erros desconhecidos', () => {
      const error = new Error('Erro genérico');

      const message = getLabelErrorMessage(error);
      expect(message).toBe('Erro desconhecido ao gerar etiqueta.');
    });
  });

  describe('generateBulkLabels', () => {
    it('deve retornar resultado vazio para array vazio', async () => {
      const result = await generateBulkLabels([]);

      expect(result.total).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.successful).toEqual([]);
      expect(result.failed).toEqual([]);
    });

    it('deve filtrar pedidos que não podem ter etiqueta gerada', async () => {
      const orders: UnifiedOrder[] = [
        {
          id: 'order-1',
          type: 'subscription_delivery',
          status: 'cancelled',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          customer: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
          collection: { id: 'col-1', name: 'Test Collection', slug: 'test' },
          amount: 100,
          trackingCode: null,
          expectedDeliveryDate: null,
          actualDeliveryDate: null
        },
        {
          id: 'order-2',
          type: 'subscription_delivery',
          status: 'delivered',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          customer: { id: 'user-2', name: 'Test User 2', email: 'test2@example.com' },
          collection: { id: 'col-1', name: 'Test Collection', slug: 'test' },
          amount: 100,
          trackingCode: null,
          expectedDeliveryDate: null,
          actualDeliveryDate: null
        }
      ];

      const result = await generateBulkLabels(orders);

      expect(result.total).toBe(2);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(2);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].errorCode).toBe('INVALID_ORDER_STATUS');
      expect(result.failed[1].errorCode).toBe('INVALID_ORDER_STATUS');
    });

    it('deve adicionar pedidos com tracking code à lista de falhas', async () => {
      const orders: UnifiedOrder[] = [
        {
          id: 'order-1',
          type: 'subscription_delivery',
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          customer: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
          collection: { id: 'col-1', name: 'Test Collection', slug: 'test' },
          amount: 100,
          trackingCode: 'BR123456789BR',
          expectedDeliveryDate: null,
          actualDeliveryDate: null
        }
      ];

      const result = await generateBulkLabels(orders);

      expect(result.total).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.failed[0].error).toContain('já possui código de rastreamento');
    });
  });

  describe('openLabelsInTabs', () => {
    let windowOpenSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Keep the real jsdom window and its localStorage for global test cleanup.
      windowOpenSpy = vi.fn();
      vi.spyOn(window, 'open').mockImplementation((...args) => {
        windowOpenSpy(...args);
        return null;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('deve abrir todas as etiquetas quando há menos que o limite', () => {
      const labels = [
        { orderId: '1', labelUrl: 'http://label1.pdf', trackingCode: 'BR1', generatedAt: new Date().toISOString() },
        { orderId: '2', labelUrl: 'http://label2.pdf', trackingCode: 'BR2', generatedAt: new Date().toISOString() }
      ];

      openLabelsInTabs(labels);

      // Aguardar os timeouts
      vi.runAllTimers();

      // Verificar que window.open foi chamado para cada etiqueta
      expect(windowOpenSpy).toHaveBeenCalledTimes(2);
      expect(windowOpenSpy).toHaveBeenCalledWith('http://label1.pdf/', '_blank', 'noopener,noreferrer');
      expect(windowOpenSpy).toHaveBeenCalledWith('http://label2.pdf/', '_blank', 'noopener,noreferrer');
    });

    it('deve respeitar o limite máximo de abas', () => {
      const labels = Array.from({ length: 15 }, (_, i) => ({
        orderId: `${i}`,
        labelUrl: `http://label${i}.pdf`,
        trackingCode: `BR${i}`,
        generatedAt: new Date().toISOString()
      }));

      openLabelsInTabs(labels, 5);

      // Aguardar os timeouts
      vi.runAllTimers();

      // Verificar que apenas 5 abas foram abertas
      expect(windowOpenSpy).toHaveBeenCalledTimes(5);
    });

    it('deve bloquear URLs de etiqueta inseguras', () => {
      const labels = [
        { orderId: '1', labelUrl: 'javascript:alert(1)', trackingCode: 'BR1', generatedAt: new Date().toISOString() },
        { orderId: '2', labelUrl: 'https://labels.example/label.pdf', trackingCode: 'BR2', generatedAt: new Date().toISOString() }
      ];

      openLabelsInTabs(labels);
      vi.runAllTimers();

      expect(windowOpenSpy).toHaveBeenCalledTimes(1);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://labels.example/label.pdf',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });
});
