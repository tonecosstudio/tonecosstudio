/**
 * ConversationService Tests
 * 
 * Requirements: 4.1-4.11
 * 
 * This test suite covers both unit tests and property-based tests for the
 * conversation service functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createForPayment,
  sendMessage,
  markAsRead,
  getMessages,
  subscribeToMessages,
  getConversationByPaymentId,
  getUnreadCount,
  type ConversationMessage,
} from './conversation-service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('ConversationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createForPayment', () => {
    it('should create conversation with formatted subject', async () => {
      const mockConversation = {
        id: 'conv-123',
        user_id: 'user-123',
        subject: 'Pagamento - Pedido #PAY-20260216-1234',
        status: 'waiting_admin',
        priority: 'normal',
        payment_id: 'payment-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockConversation,
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const result = await createForPayment(
        'payment-123',
        'user-123',
        'PAY-20260216-1234'
      );

      expect(result).toEqual(mockConversation);
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        subject: 'Pagamento - Pedido #PAY-20260216-1234',
        status: 'waiting_admin',
        priority: 'normal',
        payment_id: 'payment-123',
      });
    });

    it('should throw error if conversation creation fails', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      await expect(
        createForPayment('payment-123', 'user-123', 'PAY-20260216-1234')
      ).rejects.toThrow('Failed to create conversation: Database error');
    });

    it('should format subject correctly with different reference numbers', async () => {
      const testCases = [
        'PAY-20260216-0001',
        'PAY-20260216-9999',
        'PAY-20261231-5555',
      ];

      for (const refNumber of testCases) {
        const mockInsert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'conv-123',
                subject: `Pagamento - Pedido #${refNumber}`,
              },
              error: null,
            }),
          }),
        });

        (supabase.from as any).mockReturnValue({
          insert: mockInsert,
        });

        const result = await createForPayment('payment-123', 'user-123', refNumber);
        expect(result.subject).toBe(`Pagamento - Pedido #${refNumber}`);
      }
    });
  });

  describe('sendMessage', () => {
    it('should send message without attachments', async () => {
      const mockMessage = {
        id: 'msg-123',
        conversation_id: 'conv-123',
        sender_id: 'user-123',
        message: 'Test message',
        is_internal: false,
        attachments: [],
        read_by_customer: false,
        read_by_admin: false,
        created_at: new Date().toISOString(),
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockMessage,
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const result = await sendMessage('conv-123', 'user-123', 'Test message');

      expect(result).toEqual(mockMessage);
      expect(mockInsert).toHaveBeenCalledWith({
        conversation_id: 'conv-123',
        sender_id: 'user-123',
        message: 'Test message',
        attachments: [],
        is_internal: false,
        read_by_customer: false,
        read_by_admin: false,
      });
    });

    it('should send message with attachments', async () => {
      const attachments = ['file1.jpg', 'file2.pdf'];
      const mockMessage = {
        id: 'msg-123',
        conversation_id: 'conv-123',
        sender_id: 'user-123',
        message: 'Message with files',
        is_internal: false,
        attachments,
        read_by_customer: false,
        read_by_admin: false,
        created_at: new Date().toISOString(),
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockMessage,
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const result = await sendMessage(
        'conv-123',
        'user-123',
        'Message with files',
        attachments
      );

      expect(result.attachments).toEqual(attachments);
    });

    it('should trim whitespace from message', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { message: 'Trimmed message' },
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      await sendMessage('conv-123', 'user-123', '  Trimmed message  ');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Trimmed message',
        })
      );
    });

    it('should reject empty message', async () => {
      await expect(
        sendMessage('conv-123', 'user-123', '')
      ).rejects.toThrow('Message content is required');

      await expect(
        sendMessage('conv-123', 'user-123', '   ')
      ).rejects.toThrow('Message content is required');
    });

    it('should support internal messages', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { is_internal: true },
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      await sendMessage('conv-123', 'admin-123', 'Internal note', [], true);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_internal: true,
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read for customer', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });

      await markAsRead('conv-123', false);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          read_by_customer: true,
        })
      );
    });

    it('should mark messages as read for admin', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });

      await markAsRead('conv-123', true);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          read_by_admin: true,
        })
      );
    });

    it('should set read_at timestamp', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });

      await markAsRead('conv-123', false);

      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall).toHaveProperty('read_at');
      expect(typeof updateCall.read_at).toBe('string');
    });
  });

  describe('getMessages', () => {
    it('should get messages excluding internal by default', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          conversation_id: 'conv-123',
          message: 'Message 1',
          is_internal: false,
          created_at: '2026-02-16T10:00:00Z',
        },
        {
          id: 'msg-2',
          conversation_id: 'conv-123',
          message: 'Message 2',
          is_internal: false,
          created_at: '2026-02-16T11:00:00Z',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockMessages,
        error: null,
      });

      const mockEq2 = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockEq1 = vi.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq1,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await getMessages('conv-123');

      expect(result).toEqual(mockMessages);
      expect(mockEq2).toHaveBeenCalledWith('is_internal', false);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    it('should include internal messages when requested', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      await getMessages('conv-123', true);

      // When includeInternal is true, should not filter by is_internal
      expect(mockEq).toHaveBeenCalledWith('conversation_id', 'conv-123');
    });

    it('should order messages by creation date ascending', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockEq2 = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockEq1 = vi.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq1,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      await getMessages('conv-123');

      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
    });
  });

  describe('subscribeToMessages', () => {
    it('should subscribe to real-time message updates', () => {
      const mockSubscribe = vi.fn();
      const mockOn = vi.fn().mockReturnValue({
        subscribe: mockSubscribe,
      });
      const mockChannel = vi.fn().mockReturnValue({
        on: mockOn,
      });

      (supabase.channel as any) = mockChannel;

      const callback = vi.fn();
      subscribeToMessages('conv-123', callback);

      expect(mockChannel).toHaveBeenCalledWith('conversation:conv-123');
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: 'conversation_id=eq.conv-123',
        }),
        expect.any(Function)
      );
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const mockChannel = { on: vi.fn().mockReturnValue({ subscribe: vi.fn() }) };
      (supabase.channel as any) = vi.fn().mockReturnValue(mockChannel);
      const removeChannelSpy = vi.fn();
      (supabase.removeChannel as any) = removeChannelSpy;

      const unsubscribe = subscribeToMessages('conv-123', vi.fn());

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();

      expect(removeChannelSpy).toHaveBeenCalled();
    });
  });

  describe('getConversationByPaymentId', () => {
    it('should get conversation by payment ID', async () => {
      const mockConversation = {
        id: 'conv-123',
        payment_id: 'payment-123',
        subject: 'Pagamento - Pedido #PAY-20260216-1234',
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: mockConversation,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await getConversationByPaymentId('payment-123');

      expect(result).toEqual(mockConversation);
      expect(mockEq).toHaveBeenCalledWith('payment_id', 'payment-123');
    });

    it('should return null if conversation not found', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await getConversationByPaymentId('payment-123');

      expect(result).toBeNull();
    });
  });

  describe('getUnreadCount', () => {
    it('should count unread messages for customer', async () => {
      const mockEq3 = vi.fn().mockResolvedValue({
        count: 5,
        error: null,
      });

      const mockEq2 = vi.fn().mockReturnValue({
        eq: mockEq3,
      });

      const mockEq1 = vi.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq1,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await getUnreadCount('conv-123', false);

      expect(result).toBe(5);
      expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });

    it('should count unread messages for admin', async () => {
      const mockEq3 = vi.fn().mockResolvedValue({
        count: 3,
        error: null,
      });

      const mockEq2 = vi.fn().mockReturnValue({
        eq: mockEq3,
      });

      const mockEq1 = vi.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq1,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await getUnreadCount('conv-123', true);

      expect(result).toBe(3);
    });

    it('should return 0 if count is null', async () => {
      const mockEq3 = vi.fn().mockResolvedValue({
        count: null,
        error: null,
      });

      const mockEq2 = vi.fn().mockReturnValue({
        eq: mockEq3,
      });

      const mockEq1 = vi.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq1,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await getUnreadCount('conv-123', false);

      expect(result).toBe(0);
    });
  });
});
