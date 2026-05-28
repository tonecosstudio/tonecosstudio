import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requestPause } from './pause-service';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Pause Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true },
      error: null,
    });
  });

  it('should request pause through the pause-subscription Edge Function', async () => {
    await expect(requestPause('sub-123')).resolves.toBeUndefined();

    expect(supabase.functions.invoke).toHaveBeenCalledWith('pause-subscription', {
      body: { subscriptionId: 'sub-123' },
    });
  });

  it('should propagate Edge Function transport errors', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: { message: 'Function unavailable' },
    });

    await expect(requestPause('sub-123')).rejects.toThrow('Function unavailable');
  });

  it('should reject unsuccessful Edge Function responses', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: {
        success: false,
        error: 'CUTOFF_PASSED: Cannot pause after cutoff',
      },
      error: null,
    });

    await expect(requestPause('sub-123')).rejects.toThrow('CUTOFF_PASSED');
  });
});
