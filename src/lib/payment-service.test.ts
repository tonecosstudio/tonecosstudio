/**
 * PaymentService Tests
 * 
 * Tests for payment service CRUD operations and status transitions
 * Requirements: 2.5-2.10, 8.1-8.10
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createPayment,
  getPaymentById,
  listPaymentsByUser,
  updatePaymentStatus,
  approvePayment,
  rejectPayment,
  requestPaymentInfo,
} from './payment-service';
import type { ManualPaymentInput, PaymentStatus } from '@/types/manual-payment';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'test-payment-id',
              reference_number: 'PAY-20260216-1234',
              user_id: 'test-user-id',
              payment_method_id: 'test-method-id',
              amount: 100.00,
              currency: 'BRL',
              payment_type: 'one_time',
              status: 'pending',
              quote_id: 'test-quote-id',
              subscription_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({
            data: {
              id: 'test-payment-id',
              status: 'pending',
            },
            error: null,
          })),
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'test-payment-id',
              status: 'pending',
            },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: null,
          error: null,
        })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({
      data: 'PAY-20260216-1234',
      error: null,
    })),
  },
}));

describe('PaymentService', () => {
  describe('createPayment', () => {
    it('should create a payment with valid data', async () => {
      const input: ManualPaymentInput = {
        payment_method_id: 'test-method-id',
        quote_id: 'test-quote-id',
        amount: 100.00,
        currency: 'BRL',
        payment_type: 'one_time',
      };

      const payment = await createPayment(input);

      expect(payment).toBeDefined();
      expect(payment.reference_number).toBe('PAY-20260216-1234');
      expect(payment.status).toBe('pending');
      expect(payment.amount).toBe(100.00);
    });

    it('should reject payment without payment_method_id', async () => {
      const input: ManualPaymentInput = {
        payment_method_id: '',
        quote_id: 'test-quote-id',
        amount: 100.00,
        payment_type: 'one_time',
      };

      await expect(createPayment(input)).rejects.toThrow('Payment method is required');
    });

    it('should reject payment with zero amount', async () => {
      const input: ManualPaymentInput = {
        payment_method_id: 'test-method-id',
        quote_id: 'test-quote-id',
        amount: 0,
        payment_type: 'one_time',
      };

      await expect(createPayment(input)).rejects.toThrow('Payment amount must be greater than zero');
    });

    it('should reject payment with both quote_id and subscription_id', async () => {
      const input: ManualPaymentInput = {
        payment_method_id: 'test-method-id',
        quote_id: 'test-quote-id',
        subscription_id: 'test-subscription-id',
        amount: 100.00,
        payment_type: 'one_time',
      };

      await expect(createPayment(input)).rejects.toThrow(
        'Payment must be linked to either a quote or subscription, but not both'
      );
    });

    it('should reject payment with neither quote_id nor subscription_id', async () => {
      const input: ManualPaymentInput = {
        payment_method_id: 'test-method-id',
        amount: 100.00,
        payment_type: 'one_time',
      };

      await expect(createPayment(input)).rejects.toThrow(
        'Payment must be linked to either a quote or subscription, but not both'
      );
    });
  });

  describe('updatePaymentStatus', () => {
    it('should allow transition from pending to under_review', async () => {
      await expect(
        updatePaymentStatus('test-payment-id', 'under_review')
      ).resolves.not.toThrow();
    });

    it('should reject invalid status transition from approved', async () => {
      // Mock payment with approved status
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { status: 'approved' },
              error: null,
            })),
          })),
        })),
      } as any);

      await expect(
        updatePaymentStatus('test-payment-id', 'pending')
      ).rejects.toThrow("Invalid status transition from 'approved' to 'pending'");
    });

    it('should allow transition from rejected to under_review (re-submission)', async () => {
      // Mock payment with rejected status
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { status: 'rejected' },
              error: null,
            })),
          })),
        })),
      } as any);

      await expect(
        updatePaymentStatus('test-payment-id', 'under_review')
      ).resolves.not.toThrow();
    });
  });

  describe('rejectPayment', () => {
    it('should reject payment with reason', async () => {
      await expect(
        rejectPayment('test-payment-id', 'admin-id', 'Invalid proof')
      ).resolves.not.toThrow();
    });

    it('should require rejection reason', async () => {
      await expect(
        rejectPayment('test-payment-id', 'admin-id', '')
      ).rejects.toThrow('Rejection reason is required');
    });

    it('should create audit log entry on rejection', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const insertSpy = vi.fn(() => ({
        data: null,
        error: null,
      }));
      
      // Mock all database calls for getPaymentById and rejectPayment
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'manual_payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'test-payment-id',
                    status: 'under_review',
                    user_id: 'test-user-id',
                    payment_method: {},
                    files: [],
                    audit_logs: [],
                    conversation: { id: 'test-conversation-id' },
                  },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: null,
              })),
            })),
          } as any;
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { full_name: 'Test User', email: 'test@example.com' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'support_conversations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { id: 'test-conversation-id' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'payment_audit_log') {
          return {
            insert: insertSpy,
          } as any;
        }
        return {} as any;
      });

      await rejectPayment('test-payment-id', 'admin-id', 'Invalid proof');

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_id: 'test-payment-id',
          action_type: 'rejected',
          admin_id: 'admin-id',
          old_status: 'under_review',
          new_status: 'rejected',
          notes: 'Invalid proof',
        })
      );
    });

    it('should send message to conversation on rejection', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock all database calls for getPaymentById and rejectPayment
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'manual_payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'test-payment-id',
                    status: 'under_review',
                    user_id: 'test-user-id',
                    payment_method: {},
                    files: [],
                    audit_logs: [],
                    conversation: { id: 'test-conversation-id' },
                  },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: null,
              })),
            })),
          } as any;
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { full_name: 'Test User', email: 'test@example.com' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'support_conversations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { id: 'test-conversation-id' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'payment_audit_log') {
          return {
            insert: vi.fn(() => ({ data: null, error: null })),
          } as any;
        }
        if (table === 'support_messages') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'test-message-id',
                    conversation_id: 'test-conversation-id',
                    message: 'Seu pagamento foi rejeitado. Motivo: Invalid proof\n\nVocê pode enviar um novo comprovante se desejar.',
                  },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      await rejectPayment('test-payment-id', 'admin-id', 'Invalid proof');

      // Verify message was sent (check that support_messages insert was called)
      expect(supabase.from).toHaveBeenCalledWith('support_messages');
    });
  });

  describe('requestPaymentInfo', () => {
    it('should request info with message', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock all database calls
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'manual_payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'test-payment-id',
                    status: 'under_review',
                    user_id: 'test-user-id',
                    payment_method: {},
                    files: [],
                    audit_logs: [],
                    conversation: { id: 'test-conversation-id' },
                  },
                  error: null,
                })),
                single: vi.fn(() => Promise.resolve({
                  data: { status: 'under_review' },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: null,
              })),
            })),
          } as any;
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { full_name: 'Test User', email: 'test@example.com' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'support_conversations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { id: 'test-conversation-id' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'payment_audit_log') {
          return {
            insert: vi.fn(() => ({ data: null, error: null })),
          } as any;
        }
        return {} as any;
      });

      await expect(
        requestPaymentInfo('test-payment-id', 'admin-id', 'Please provide clearer image')
      ).resolves.not.toThrow();
    });

    it('should require message', async () => {
      await expect(
        requestPaymentInfo('test-payment-id', 'admin-id', '')
      ).rejects.toThrow('Message is required when requesting more information');
    });

    it('should create audit log entry when requesting info', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const insertSpy = vi.fn(() => ({
        data: null,
        error: null,
      }));
      
      // Mock all database calls
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'manual_payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'test-payment-id',
                    status: 'under_review',
                    user_id: 'test-user-id',
                    payment_method: {},
                    files: [],
                    audit_logs: [],
                    conversation: { id: 'test-conversation-id' },
                  },
                  error: null,
                })),
                single: vi.fn(() => Promise.resolve({
                  data: { status: 'under_review' },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: null,
              })),
            })),
          } as any;
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { full_name: 'Test User', email: 'test@example.com' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'support_conversations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { id: 'test-conversation-id' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'payment_audit_log') {
          return {
            insert: insertSpy,
          } as any;
        }
        return {} as any;
      });

      await requestPaymentInfo('test-payment-id', 'admin-id', 'Please provide clearer image');

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_id: 'test-payment-id',
          action_type: 'info_requested',
          admin_id: 'admin-id',
          old_status: 'under_review',
          new_status: 'requires_info',
          notes: 'Please provide clearer image',
        })
      );
    });

    it('should send message to conversation when requesting info', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock all database calls
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'manual_payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'test-payment-id',
                    status: 'under_review',
                    user_id: 'test-user-id',
                    payment_method: {},
                    files: [],
                    audit_logs: [],
                    conversation: { id: 'test-conversation-id' },
                  },
                  error: null,
                })),
                single: vi.fn(() => Promise.resolve({
                  data: { status: 'under_review' },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: null,
              })),
            })),
          } as any;
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { full_name: 'Test User', email: 'test@example.com' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'support_conversations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { id: 'test-conversation-id' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'payment_audit_log') {
          return {
            insert: vi.fn(() => ({ data: null, error: null })),
          } as any;
        }
        if (table === 'support_messages') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'test-message-id',
                    conversation_id: 'test-conversation-id',
                    message: 'Precisamos de mais informações sobre seu pagamento:\n\nPlease provide clearer image',
                  },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      await requestPaymentInfo('test-payment-id', 'admin-id', 'Please provide clearer image');

      // Verify message was sent (check that support_messages insert was called)
      expect(supabase.from).toHaveBeenCalledWith('support_messages');
    });
  });

  describe('approvePayment', () => {
    it('should approve payment successfully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock all database calls
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'manual_payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'test-payment-id',
                    status: 'under_review',
                    user_id: 'test-user-id',
                    payment_method: {},
                    files: [],
                    audit_logs: [],
                    conversation: { id: 'test-conversation-id' },
                  },
                  error: null,
                })),
                single: vi.fn(() => Promise.resolve({
                  data: { status: 'under_review' },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: null,
              })),
            })),
          } as any;
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { full_name: 'Test User', email: 'test@example.com' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'support_conversations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { id: 'test-conversation-id' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'payment_audit_log') {
          return {
            insert: vi.fn(() => ({ data: null, error: null })),
          } as any;
        }
        return {} as any;
      });

      await expect(
        approvePayment('test-payment-id', 'admin-id')
      ).resolves.not.toThrow();
    });

    it('should create audit log entry on approval', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const insertSpy = vi.fn(() => ({
        data: null,
        error: null,
      }));
      
      // Mock all database calls
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'manual_payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'test-payment-id',
                    status: 'under_review',
                    user_id: 'test-user-id',
                    payment_method: {},
                    files: [],
                    audit_logs: [],
                    conversation: { id: 'test-conversation-id' },
                  },
                  error: null,
                })),
                single: vi.fn(() => Promise.resolve({
                  data: { status: 'under_review' },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: null,
              })),
            })),
          } as any;
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { full_name: 'Test User', email: 'test@example.com' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'support_conversations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { id: 'test-conversation-id' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'payment_audit_log') {
          return {
            insert: insertSpy,
          } as any;
        }
        return {} as any;
      });

      await approvePayment('test-payment-id', 'admin-id');

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_id: 'test-payment-id',
          action_type: 'approved',
          admin_id: 'admin-id',
          old_status: 'under_review',
          new_status: 'approved',
          notes: 'Payment approved by admin',
        })
      );
    });

    it('should send message to conversation on approval', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock all database calls
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'manual_payments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'test-payment-id',
                    status: 'under_review',
                    user_id: 'test-user-id',
                    payment_method: {},
                    files: [],
                    audit_logs: [],
                    conversation: { id: 'test-conversation-id' },
                  },
                  error: null,
                })),
                single: vi.fn(() => Promise.resolve({
                  data: { status: 'under_review' },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: null,
              })),
            })),
          } as any;
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { full_name: 'Test User', email: 'test@example.com' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'support_conversations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { id: 'test-conversation-id' },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        if (table === 'payment_audit_log') {
          return {
            insert: vi.fn(() => ({ data: null, error: null })),
          } as any;
        }
        if (table === 'support_messages') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'test-message-id',
                    conversation_id: 'test-conversation-id',
                    message: 'Seu pagamento foi aprovado! O pedido será processado em breve.',
                  },
                  error: null,
                })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      await approvePayment('test-payment-id', 'admin-id');

      // Verify message was sent (check that support_messages insert was called)
      expect(supabase.from).toHaveBeenCalledWith('support_messages');
    });

    it('should throw error if payment not found', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock getPaymentById to return null
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({
              data: null,
              error: null,
            })),
          })),
        })),
      } as any);

      await expect(
        approvePayment('non-existent-id', 'admin-id')
      ).rejects.toThrow('Payment not found');
    });
  });
});
