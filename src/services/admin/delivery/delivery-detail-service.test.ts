import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callAuthenticatedEdgeFunction } from '@/services/supabase/edge-function-client';
import { updateDeliveryStatus } from './delivery-detail-service';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/services/supabase/edge-function-client', () => ({
  callAuthenticatedEdgeFunction: vi.fn(),
}));

const callEdgeFunction = vi.mocked(callAuthenticatedEdgeFunction);

const input = {
  deliveryId: 'delivery-1',
  newStatus: 'shipped',
  trackingCode: 'AB123456789CD',
};

describe('delivery-detail-service status mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts only a confirmed response for the requested delivery and status', async () => {
    const response = {
      success: true,
      message: 'Status atualizado',
      delivery: {
        id: 'delivery-1',
        status: 'shipped',
        tracking_code: 'AB123456789CD',
      },
    };
    callEdgeFunction.mockResolvedValueOnce(response);

    await expect(updateDeliveryStatus(input)).resolves.toEqual(response);
    expect(callEdgeFunction).toHaveBeenCalledWith(
      'update-delivery-status',
      input,
      'Erro ao atualizar status',
    );
  });

  it.each([null, undefined, {}, [], { success: false }, { success: true }])(
    'fails closed for an unconfirmed delivery mutation response: %j',
    async (response) => {
      callEdgeFunction.mockResolvedValueOnce(response as never);

      await expect(updateDeliveryStatus(input)).rejects.toThrow(
        'Erro ao atualizar status',
      );
    },
  );

  it('rejects a response for a different delivery', async () => {
    callEdgeFunction.mockResolvedValueOnce({
      success: true,
      delivery: { id: 'delivery-2', status: 'shipped' },
    });

    await expect(updateDeliveryStatus(input)).rejects.toThrow(
      'Erro ao atualizar status',
    );
  });

  it('rejects a response that did not reach the requested status', async () => {
    callEdgeFunction.mockResolvedValueOnce({
      success: true,
      delivery: { id: 'delivery-1', status: 'in_production' },
    });

    await expect(updateDeliveryStatus(input)).rejects.toThrow(
      'Erro ao atualizar status',
    );
  });
});
