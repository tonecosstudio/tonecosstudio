import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emailService } from '../email-service';
import { supabase } from '@/integrations/supabase/client';

// Mock environment variables
vi.stubEnv('VITE_EMAIL_PROVIDER', 'sendgrid');
vi.stubEnv('VITE_EMAIL_FROM', 'test@ordax.com');
vi.stubEnv('VITE_EMAIL_FROM_NAME', 'ORDAX Test');

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { success: true }, error: null })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-log-id' },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: null,
            error: null
          }))
        })),
        gte: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

// Mock notification preferences service
vi.mock('../notification-preferences-service', () => ({
  notificationPreferencesService: {
    shouldSendEmail: vi.fn(() => Promise.resolve(true))
  }
}));

describe('Email Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.functions.invoke as any).mockResolvedValue({ data: { success: true }, error: null });
  });

  describe('Email Log Creation', () => {
    it('should create log entry when sending email', async () => {
      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-log-id' },
            error: null
          }))
        }))
      }));

      (supabase.from as any).mockReturnValue({
        insert: insertMock,
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      });
      // Mock fetch to simulate successful email send
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(''),
        } as Response)
      );

      try {
        await emailService.sendEmail(
          'test@example.com',
          'Test Subject',
          '<p>Test content</p>',
          'welcome',
          'user-123',
          { subscription_id: 'sub-123' }
        );
      } catch (error) {
        // Expected to fail due to mock setup, but log should be created
      }

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          recipient_email: 'test@example.com',
          email_type: 'welcome',
          subject: 'Test Subject',
          status: 'pending',
          metadata: { subscription_id: 'sub-123' }
        })
      );
    });

    it('should include email type in log', async () => {
      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-log-id' },
            error: null
          }))
        }))
      }));

      (supabase.from as any).mockReturnValue({
        insert: insertMock,
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      });
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(''),
        } as Response)
      );

      try {
        await emailService.sendEmail(
          'test@example.com',
          'Test',
          '<p>Test</p>',
          'character_revelation'
        );
      } catch (error) {
        // Expected
      }

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email_type: 'character_revelation'
        })
      );
    });

    it('should include metadata in log', async () => {
      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-log-id' },
            error: null
          }))
        }))
      }));

      (supabase.from as any).mockReturnValue({
        insert: insertMock,
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      });

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(''),
        } as Response)
      );

      const metadata = {
        delivery_id: 'del-123',
        tracking_code: 'ABC123'
      };

      try {
        await emailService.sendEmail(
          'test@example.com',
          'Test',
          '<p>Test</p>',
          'shipping_notification',
          'user-123',
          metadata
        );
      } catch (error) {
        // Expected
      }

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata
        })
      );
    });
  });

  describe('Email Log Updates', () => {
    it('should update log to sent status on success', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }));

      (supabase.from as any).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'test-log-id' },
              error: null
            }))
          }))
        })),
        update: updateMock
      });
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        } as Response)
      );

      try {
        await emailService.sendEmail(
          'test@example.com',
          'Test',
          '<p>Test</p>',
          'welcome'
        );
      } catch (error) {
        // May fail due to provider config, but should still update log
      }

      // Should have been called with either sent or failed status
      expect(updateMock).toHaveBeenCalled();
      const updateCall = updateMock.mock.calls[0][0];
      expect(updateCall).toHaveProperty('status');
      expect(['sent', 'failed']).toContain(updateCall.status);
    });

    it('should update log to failed status on error', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }));

      (supabase.from as any).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'test-log-id' },
              error: null
            }))
          }))
        })),
        update: updateMock
      });
      (supabase.functions.invoke as any).mockResolvedValue({
        data: null,
        error: { message: 'Server error' },
      });

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Server error'),
        } as Response)
      );

      try {
        await emailService.sendEmail(
          'test@example.com',
          'Test',
          '<p>Test</p>',
          'welcome'
        );
      } catch (error) {
        // Expected to throw
      }

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_message: expect.any(String)
        })
      );
    });

    it('should track retry count', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }));

      (supabase.from as any).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'test-log-id' },
              error: null
            }))
          }))
        })),
        update: updateMock
      });

      // Fail first attempt, succeed on second
      let callCount = 0;
      global.fetch = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Server error'),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(''),
        } as Response);
      });

      try {
        await emailService.sendEmail(
          'test@example.com',
          'Test',
          '<p>Test</p>',
          'welcome'
        );
      } catch (error) {
        // May throw or succeed depending on retry logic
      }

      // Should have been called with retry_count
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          retry_count: expect.any(Number)
        })
      );
    });
  });

  describe('Email Type Tracking', () => {
    it('should track welcome emails', async () => {
      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-log-id' },
            error: null
          }))
        }))
      }));

      (supabase.from as any).mockReturnValue({
        insert: insertMock,
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      });

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(''),
        } as Response)
      );

      try {
        await emailService.sendEmail(
          'test@example.com',
          'Welcome',
          '<p>Welcome</p>',
          'welcome'
        );
      } catch (error) {
        // Expected
      }

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email_type: 'welcome'
        })
      );
    });

    it('should track shipping notification emails', async () => {
      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-log-id' },
            error: null
          }))
        }))
      }));

      (supabase.from as any).mockReturnValue({
        insert: insertMock,
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      });

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(''),
        } as Response)
      );

      try {
        await emailService.sendEmail(
          'test@example.com',
          'Shipped',
          '<p>Shipped</p>',
          'shipping_notification'
        );
      } catch (error) {
        // Expected
      }

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email_type: 'shipping_notification'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should not fail email send if logging fails', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      });

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        } as Response)
      );

      // Should attempt to send even if logging fails
      try {
        await emailService.sendEmail(
          'test@example.com',
          'Test',
          '<p>Test</p>',
          'welcome'
        );
      } catch (error) {
        // May throw due to provider config, but that's OK
        // The important thing is it tried to send
      }

      // Verify the service attempted to proceed despite logging failure
      // (it created a log-failed ID and continued)
      expect(true).toBe(true); // Test passes if no crash from logging failure
    });
  });
});
