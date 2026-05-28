import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { supabase } from '@/integrations/supabase/client';
import {
  recordCollectionChange,
  type CollectionChoiceHistory,
  type CollectionChangeReason,
  type RecordCollectionChangeParams,
} from './audit-trail-service';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

function createAuditRecord(params: RecordCollectionChangeParams): CollectionChoiceHistory {
  return {
    id: crypto.randomUUID(),
    delivery_id: params.deliveryId,
    user_id: params.userId,
    previous_collection_id: params.previousCollectionId,
    new_collection_id: params.newCollectionId,
    change_reason: params.changeReason,
    changed_by_admin: params.changedByAdmin ?? false,
    admin_user_id: params.adminUserId ?? null,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
    created_at: new Date().toISOString(),
  };
}

function expectRecordCollectionRpc(params: RecordCollectionChangeParams) {
  expect(supabase.rpc).toHaveBeenCalledWith('record_collection_choice_change', {
    p_delivery_id: params.deliveryId,
    p_user_id: params.userId,
    p_previous_collection_id: params.previousCollectionId,
    p_new_collection_id: params.newCollectionId,
    p_change_reason: params.changeReason,
    p_changed_by_admin: params.changedByAdmin ?? false,
    p_admin_user_id: params.adminUserId ?? null,
    p_ip_address: params.ipAddress ?? null,
    p_user_agent: params.userAgent ?? null,
  });
}

describe('Audit Trail Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordCollectionChange', () => {
    it('records collection changes through the canonical audit RPC', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            deliveryId: fc.uuid(),
            userId: fc.uuid(),
            previousCollectionId: fc.option(fc.uuid(), { nil: null }),
            newCollectionId: fc.uuid(),
            changeReason: fc.constantFrom<CollectionChangeReason>(
              'manual',
              'automatic_maintenance',
              'admin_override'
            ),
            changedByAdmin: fc.boolean(),
            adminUserId: fc.option(fc.uuid(), { nil: null }),
            ipAddress: fc.option(
              fc
                .tuple(
                  fc.integer({ min: 0, max: 255 }),
                  fc.integer({ min: 0, max: 255 }),
                  fc.integer({ min: 0, max: 255 }),
                  fc.integer({ min: 0, max: 255 })
                )
                .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
              { nil: null }
            ),
            userAgent: fc.option(
              fc.constantFrom(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
              ),
              { nil: null }
            ),
          }),
          async (scenario) => {
            const params: RecordCollectionChangeParams = scenario;
            const expectedRecord = createAuditRecord(params);
            vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: expectedRecord, error: null });

            const result = await recordCollectionChange(params);

            expectRecordCollectionRpc(params);
            expect(result).toEqual(expectedRecord);
            expect(result.created_at).toBeDefined();
            expect(Number.isNaN(new Date(result.created_at).getTime())).toBe(false);
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });

    it('defaults optional audit fields before calling the RPC', async () => {
      const params: RecordCollectionChangeParams = {
        deliveryId: 'delivery-123',
        userId: 'user-456',
        previousCollectionId: null,
        newCollectionId: 'collection-new',
        changeReason: 'manual',
      };
      const expectedRecord = createAuditRecord(params);
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: expectedRecord, error: null });

      const result = await recordCollectionChange(params);

      expectRecordCollectionRpc(params);
      expect(result.previous_collection_id).toBeNull();
      expect(result.changed_by_admin).toBe(false);
      expect(result.admin_user_id).toBeNull();
      expect(result.ip_address).toBeNull();
      expect(result.user_agent).toBeNull();
    });

    it('preserves admin audit fields', async () => {
      const params: RecordCollectionChangeParams = {
        deliveryId: 'delivery-123',
        userId: 'user-456',
        previousCollectionId: null,
        newCollectionId: 'collection-new',
        changeReason: 'admin_override',
        changedByAdmin: true,
        adminUserId: 'admin-789',
      };
      const expectedRecord = createAuditRecord(params);
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: expectedRecord, error: null });

      const result = await recordCollectionChange(params);

      expectRecordCollectionRpc(params);
      expect(result.changed_by_admin).toBe(true);
      expect(result.admin_user_id).toBe('admin-789');
      expect(result.change_reason).toBe('admin_override');
    });

    it('throws a stable error when the audit RPC fails', async () => {
      const params: RecordCollectionChangeParams = {
        deliveryId: 'delivery-123',
        userId: 'user-456',
        previousCollectionId: null,
        newCollectionId: 'collection-new',
        changeReason: 'manual',
      };
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(recordCollectionChange(params)).rejects.toThrow(
        'Failed to record collection change: Database connection failed'
      );
    });
  });
});
