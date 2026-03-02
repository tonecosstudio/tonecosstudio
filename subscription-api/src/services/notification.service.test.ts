/**
 * Notification Service Tests
 */

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new NotificationService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('sendSubscriptionConfirmation', () => {
    it('should send subscription confirmation email for trimestral plan', async () => {
      const email = 'user@example.com';
      const data = {
        userName: 'João Silva',
        planType: 'trimestral' as const,
        creditsAllocated: 600,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-04-01'),
        nextBillingDate: new Date('2024-04-01'),
      };

      await service.sendSubscriptionConfirmation(email, data);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('user@example.com');
      expect(output).toContain('Assinatura Trimestral Confirmada');
      expect(output).toContain('João Silva');
      expect(output).toContain('600');
    });

    it('should send subscription confirmation email for semestral plan', async () => {
      const email = 'user@example.com';
      const data = {
        userName: 'Maria Santos',
        planType: 'semestral' as const,
        creditsAllocated: 1400,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-07-01'),
        nextBillingDate: new Date('2024-07-01'),
      };

      await service.sendSubscriptionConfirmation(email, data);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('user@example.com');
      expect(output).toContain('Assinatura Semestral Confirmada');
      expect(output).toContain('Maria Santos');
      expect(output).toContain('1400');
    });
  });

  describe('sendCycleClosingNotification', () => {
    it('should send cycle closing notification', async () => {
      const email = 'user@example.com';
      const data = {
        userName: 'João Silva',
        cycleName: 'Ciclo Janeiro 2024',
        creditsDebited: 300,
        charactersOrdered: ['Personagem A', 'Personagem B', 'Personagem C'],
        remainingCredits: 300,
      };

      await service.sendCycleClosingNotification(email, data);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('user@example.com');
      expect(output).toContain('Ciclo Janeiro 2024 Fechado');
      expect(output).toContain('João Silva');
      expect(output).toContain('300');
      expect(output).toContain('Personagem A');
      expect(output).toContain('Personagem B');
      expect(output).toContain('Personagem C');
    });
  });

  describe('sendCancellationNotification', () => {
    it('should send cancellation with refund notification', async () => {
      const email = 'user@example.com';
      const data = {
        userName: 'João Silva',
        planType: 'trimestral' as const,
        cancellationType: 'with_refund' as const,
        refundAmount: 50.00,
        creditsExpired: 200,
      };

      await service.sendCancellationNotification(email, data);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('user@example.com');
      expect(output).toContain('Assinatura Cancelada');
      expect(output).toContain('João Silva');
      expect(output).toContain('50.00');
      expect(output).toContain('200');
      expect(output).toContain('Cancelamento com Reembolso');
    });

    it('should send no-renewal notification', async () => {
      const email = 'user@example.com';
      const data = {
        userName: 'Maria Santos',
        planType: 'semestral' as const,
        cancellationType: 'no_renewal' as const,
        endDate: new Date('2024-07-01'),
        creditsExpired: 500,
      };

      await service.sendCancellationNotification(email, data);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('user@example.com');
      expect(output).toContain('Renovação Automática Desativada');
      expect(output).toContain('Maria Santos');
      expect(output).toContain('500');
      expect(output).toContain('Não-Renovação');
    });
  });
});
