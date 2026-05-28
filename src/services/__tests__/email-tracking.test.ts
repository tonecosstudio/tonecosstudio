import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emailService } from '../email-service';
import { supabase } from '@/integrations/supabase/client';

vi.stubEnv('VITE_EMAIL_FROM', 'test@ordax.com');
vi.stubEnv('VITE_EMAIL_FROM_NAME', 'ORDAX Test');

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

vi.mock('../notification-preferences-service', () => ({
  notificationPreferencesService: {
    shouldSendEmail: vi.fn(() => Promise.resolve(true)),
  },
}));

function mockSuccessfulEmailTracking() {
  (supabase.rpc as any).mockImplementation((fn: string) => {
    if (fn === 'create_email_delivery_log') {
      return Promise.resolve({ data: 'test-log-id', error: null });
    }

    if (fn === 'update_email_delivery_log') {
      return Promise.resolve({ data: 'test-log-id', error: null });
    }

    return Promise.resolve({ data: null, error: null });
  });
}

function getRpcCalls(fn: string) {
  return (supabase.rpc as any).mock.calls.filter(([rpcName]: [string]) => rpcName === fn);
}

describe('Email Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuccessfulEmailTracking();
    (supabase.functions.invoke as any).mockResolvedValue({ data: { success: true }, error: null });
    (emailService as any).config.maxRetries = 3;
    (emailService as any).config.retryDelay = 1;
  });

  describe('Email Log Creation', () => {
    it('should create log entry when sending email', async () => {
      await emailService.sendEmail(
        'test@example.com',
        'Test Subject',
        '<p>Test content</p>',
        'welcome',
        'user-123',
        { subscription_id: 'sub-123' }
      );

      expect(supabase.rpc).toHaveBeenCalledWith('create_email_delivery_log', {
        p_user_id: 'user-123',
        p_recipient_email: 'test@example.com',
        p_email_type: 'welcome',
        p_subject: 'Test Subject',
        p_status: 'pending',
        p_provider: 'edge-function',
        p_metadata: { subscription_id: 'sub-123' },
      });
    });

    it('should include email type in log', async () => {
      await emailService.sendEmail(
        'test@example.com',
        'Test',
        '<p>Test</p>',
        'character_revelation'
      );

      const createCall = getRpcCalls('create_email_delivery_log')[0];
      expect(createCall[1]).toEqual(
        expect.objectContaining({
          p_email_type: 'character_revelation',
        })
      );
    });

    it('should include metadata in log', async () => {
      const metadata = {
        delivery_id: 'del-123',
        tracking_code: 'ABC123',
      };

      await emailService.sendEmail(
        'test@example.com',
        'Test',
        '<p>Test</p>',
        'shipping_notification',
        'user-123',
        metadata
      );

      const createCall = getRpcCalls('create_email_delivery_log')[0];
      expect(createCall[1]).toEqual(
        expect.objectContaining({
          p_metadata: metadata,
        })
      );
    });
  });

  describe('Email Log Updates', () => {
    it('should update log to sent status on success', async () => {
      await emailService.sendEmail(
        'test@example.com',
        'Test',
        '<p>Test</p>',
        'welcome'
      );

      expect(supabase.rpc).toHaveBeenCalledWith('update_email_delivery_log', {
        p_log_id: 'test-log-id',
        p_updates: expect.objectContaining({
          status: 'sent',
          retry_count: 0,
          sent_at: expect.any(String),
        }),
      });
    });

    it('should update log to failed status on error', async () => {
      (supabase.functions.invoke as any).mockResolvedValue({
        data: null,
        error: { message: 'Server error' },
      });

      await expect(
        emailService.sendEmail('test@example.com', 'Test', '<p>Test</p>', 'welcome')
      ).rejects.toThrow();

      expect(supabase.rpc).toHaveBeenCalledWith('update_email_delivery_log', {
        p_log_id: 'test-log-id',
        p_updates: expect.objectContaining({
          status: 'failed',
          error_message: expect.stringContaining('Server error'),
          retry_count: 1,
        }),
      });
    });

    it('should track retry count', async () => {
      (emailService as any).config.maxRetries = 1;
      (supabase.functions.invoke as any)
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({ data: { success: true }, error: null });

      await emailService.sendEmail(
        'test@example.com',
        'Test',
        '<p>Test</p>',
        'welcome'
      );

      expect(supabase.rpc).toHaveBeenCalledWith('update_email_delivery_log', {
        p_log_id: 'test-log-id',
        p_updates: expect.objectContaining({
          status: 'sent',
          retry_count: 1,
        }),
      });
    });
  });

  describe('Email Type Tracking', () => {
    it('should track welcome emails', async () => {
      await emailService.sendEmail(
        'test@example.com',
        'Welcome',
        '<p>Welcome</p>',
        'welcome'
      );

      const createCall = getRpcCalls('create_email_delivery_log')[0];
      expect(createCall[1]).toEqual(expect.objectContaining({ p_email_type: 'welcome' }));
    });

    it('should track shipping notification emails', async () => {
      await emailService.sendEmail(
        'test@example.com',
        'Shipped',
        '<p>Shipped</p>',
        'shipping_notification'
      );

      const createCall = getRpcCalls('create_email_delivery_log')[0];
      expect(createCall[1]).toEqual(
        expect.objectContaining({ p_email_type: 'shipping_notification' })
      );
    });
  });

  describe('Error Handling', () => {
    it('should not fail email send if logging fails', async () => {
      (supabase.rpc as any).mockImplementation((fn: string) => {
        if (fn === 'create_email_delivery_log') {
          return Promise.resolve({
            data: null,
            error: { message: 'Database error' },
          });
        }

        return Promise.resolve({ data: 'test-log-id', error: null });
      });

      await expect(
        emailService.sendEmail('test@example.com', 'Test', '<p>Test</p>', 'welcome')
      ).resolves.toBeUndefined();

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({
          body: expect.objectContaining({
            to: 'test@example.com',
          }),
        })
      );
    });
  });
});
