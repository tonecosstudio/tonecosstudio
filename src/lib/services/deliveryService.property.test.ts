/**
 * Property-based tests for the DeliveryService scheduling boundary.
 *
 * Scheduling is server-authoritative: the browser sends the subscription,
 * plan type and entry cycle to the admin RPC gateway, then validates the
 * returned envelope fail-closed. Cycle creation and assignment no longer
 * belong to the browser service and must not be reimplemented in tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { deliveryService, PlanType } from './deliveryService';
import { callAdminRpc } from '@/services/admin/rpc/admin-rpc-gateway';

vi.mock('@/services/admin/rpc/admin-rpc-gateway', () => ({
  callAdminRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const mockCallAdminRpc = vi.mocked(callAdminRpc);

function uuidFromIndex(index: number): string {
  const tail = String(index).padStart(12, '0').slice(-12);
  return `00000000-0000-4000-8000-${tail}`;
}

function createScheduledDeliveries(subscriptionId: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: uuidFromIndex(index + 1),
    created_at: '2026-09-15T00:00:00.000Z',
    updated_at: '2026-09-15T00:00:00.000Z',
    subscription_id: subscriptionId,
    cycle_id: uuidFromIndex(100 + index),
    character_id: null,
    delivery_number: index + 1,
    status: 'scheduled',
    status_changed_at: null,
    scheduled_date: '2026-10-07',
    shipped_at: null,
    delivered_at: null,
    tracking_code: null,
  }));
}

function createSchedulingEnvelope(subscriptionId: string, planType: PlanType) {
  const count = planType === 'trimestral' ? 3 : 6;
  const deliveries = createScheduledDeliveries(subscriptionId, count);

  return {
    deliveries,
    bonusPiece:
      planType === 'semestral'
        ? {
            id: uuidFromIndex(900),
            subscription_id: subscriptionId,
            delivery_id: deliveries[5].id,
            description: 'Exclusive bonus piece for Semestral plan',
            status: 'pending',
          }
        : null,
  };
}

describe('DeliveryService - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trimestral always returns exactly three sequential scheduled deliveries', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (subscriptionId, entryCycleId) => {
        mockCallAdminRpc.mockResolvedValueOnce(
          createSchedulingEnvelope(subscriptionId, 'trimestral'),
        );

        const deliveries = await deliveryService.scheduleConsecutiveDeliveries(
          subscriptionId,
          'trimestral',
          entryCycleId,
        );

        expect(deliveries).toHaveLength(3);
        expect(deliveries.map((delivery) => delivery.delivery_number)).toEqual([1, 2, 3]);
        expect(deliveries.every((delivery) => delivery.status === 'scheduled')).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  it('semestral always returns exactly six sequential scheduled deliveries', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (subscriptionId, entryCycleId) => {
        mockCallAdminRpc.mockResolvedValueOnce(
          createSchedulingEnvelope(subscriptionId, 'semestral'),
        );

        const deliveries = await deliveryService.scheduleConsecutiveDeliveries(
          subscriptionId,
          'semestral',
          entryCycleId,
        );

        expect(deliveries).toHaveLength(6);
        expect(deliveries.map((delivery) => delivery.delivery_number)).toEqual([
          1, 2, 3, 4, 5, 6,
        ]);
      }),
      { numRuns: 50 },
    );
  });

  it('forwards the exact scheduling authority inputs to the admin RPC gateway', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom<PlanType>('trimestral', 'semestral'),
        fc.uuid(),
        async (subscriptionId, planType, entryCycleId) => {
          mockCallAdminRpc.mockResolvedValueOnce(
            createSchedulingEnvelope(subscriptionId, planType),
          );

          await deliveryService.scheduleConsecutiveDeliveries(
            subscriptionId,
            planType,
            entryCycleId,
          );

          expect(mockCallAdminRpc).toHaveBeenLastCalledWith(
            'admin_schedule_subscription_deliveries',
            {
              p_subscription_id: subscriptionId,
              p_plan_type: planType,
              p_entry_cycle_id: entryCycleId,
            },
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  it('fails closed when the RPC returns the wrong number of deliveries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom<PlanType>('trimestral', 'semestral'),
        fc.uuid(),
        async (subscriptionId, planType, entryCycleId) => {
          const envelope = createSchedulingEnvelope(subscriptionId, planType);
          envelope.deliveries.pop();
          mockCallAdminRpc.mockResolvedValueOnce(envelope);

          await expect(
            deliveryService.scheduleConsecutiveDeliveries(
              subscriptionId,
              planType,
              entryCycleId,
            ),
          ).rejects.toThrow('Resposta inválida ao agendar entregas da assinatura');
        },
      ),
      { numRuns: 30 },
    );
  });

  it('fails closed when a delivery belongs to another subscription', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (subscriptionId, entryCycleId) => {
        const envelope = createSchedulingEnvelope(subscriptionId, 'trimestral');
        envelope.deliveries[1] = {
          ...envelope.deliveries[1],
          subscription_id: uuidFromIndex(999),
        };
        mockCallAdminRpc.mockResolvedValueOnce(envelope);

        await expect(
          deliveryService.scheduleConsecutiveDeliveries(
            subscriptionId,
            'trimestral',
            entryCycleId,
          ),
        ).rejects.toThrow('Resposta inconsistente ao agendar entregas da assinatura');
      }),
      { numRuns: 30 },
    );
  });

  it('fails closed when a trimestral response unexpectedly contains a bonus', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (subscriptionId, entryCycleId) => {
        const envelope = createSchedulingEnvelope(subscriptionId, 'trimestral');
        envelope.bonusPiece = {
          id: uuidFromIndex(901),
          subscription_id: subscriptionId,
          delivery_id: envelope.deliveries[2].id,
          description: 'unexpected',
          status: 'pending',
        };
        mockCallAdminRpc.mockResolvedValueOnce(envelope);

        await expect(
          deliveryService.scheduleConsecutiveDeliveries(
            subscriptionId,
            'trimestral',
            entryCycleId,
          ),
        ).rejects.toThrow('Resposta inconsistente ao agendar entregas da assinatura');
      }),
      { numRuns: 30 },
    );
  });

  it('fails closed when the semestral bonus is missing or detached from delivery six', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.boolean(),
        async (subscriptionId, entryCycleId, removeBonus) => {
          const envelope = createSchedulingEnvelope(subscriptionId, 'semestral');
          envelope.bonusPiece = removeBonus
            ? null
            : {
                ...envelope.bonusPiece!,
                delivery_id: envelope.deliveries[4].id,
              };
          mockCallAdminRpc.mockResolvedValueOnce(envelope);

          await expect(
            deliveryService.scheduleConsecutiveDeliveries(
              subscriptionId,
              'semestral',
              entryCycleId,
            ),
          ).rejects.toThrow();
        },
      ),
      { numRuns: 30 },
    );
  });
});
