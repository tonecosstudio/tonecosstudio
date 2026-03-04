/**
 * Unit tests for production assignment logic
 * Tests assignment, reassignment, logging, and notifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { assignProduction } from '../production-service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock notification service
vi.mock('@/services/notifications/production-notification-service', () => ({
  ProductionNotificationService: vi.fn().mockImplementation(() => ({
    sendAssignmentNotification: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('Production Assignment Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assignProduction', () => {
    it('should assign production item to a user', async () => {
      const mockProductionItem = {
        id: 'prod-123',
        assigned_to: null,
        assigned_to_name: null,
      };

      const mockUser = {
        id: 'user-456',
        full_name: 'João Silva',
        email: 'joao@example.com',
      };

      const mockUpdatedItem = {
        ...mockProductionItem,
        assigned_to: mockUser.id,
        assigned_to_name: mockUser.full_name,
        assigned_at: new Date().toISOString(),
      };

      // Mock current item query
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProductionItem,
              error: null,
            }),
          }),
        }),
      });

      // Mock user query
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      });

      // Mock update query
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedItem,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock log insert
      (supabase.from as any).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      // Mock auth user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'admin-789' } },
      });

      const result = await assignProduction('prod-123', 'user-456');

      expect(result).toBeDefined();
      expect(result.assignedTo).toBe('user-456');
      expect(result.assignedToName).toBe('João Silva');
    });

    it('should handle reassignment with reason', async () => {
      const mockProductionItem = {
        id: 'prod-123',
        assigned_to: 'user-old',
        assigned_to_name: 'Maria Santos',
      };

      const mockUser = {
        id: 'user-456',
        full_name: 'João Silva',
        email: 'joao@example.com',
      };

      const mockUpdatedItem = {
        ...mockProductionItem,
        assigned_to: mockUser.id,
        assigned_to_name: mockUser.full_name,
        assigned_at: new Date().toISOString(),
      };

      // Mock current item query
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProductionItem,
              error: null,
            }),
          }),
        }),
      });

      // Mock user query
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      });

      // Mock update query
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedItem,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock log insert
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      (supabase.from as any).mockReturnValueOnce({
        insert: mockInsert,
      });

      // Mock auth user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'admin-789' } },
      });

      const result = await assignProduction('prod-123', 'user-456', 'Balanceamento de carga');

      expect(result).toBeDefined();
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_reassignment: true,
          previous_assignee: 'user-old',
          previous_assignee_name: 'Maria Santos',
          reason: 'Balanceamento de carga',
        })
      );
    });

    it('should throw error if user not found', async () => {
      // Mock current item query
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'prod-123', assigned_to: null },
              error: null,
            }),
          }),
        }),
      });

      // Mock user query with error
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' },
            }),
          }),
        }),
      });

      await expect(assignProduction('prod-123', 'invalid-user')).rejects.toThrow(
        'Erro ao buscar usuário'
      );
    });

    it('should throw error if update fails', async () => {
      const mockUser = {
        id: 'user-456',
        full_name: 'João Silva',
        email: 'joao@example.com',
      };

      // Mock current item query
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'prod-123', assigned_to: null },
              error: null,
            }),
          }),
        }),
      });

      // Mock user query
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      });

      // Mock update query with error
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' },
              }),
            }),
          }),
        }),
      });

      await expect(assignProduction('prod-123', 'user-456')).rejects.toThrow(
        'Erro ao atribuir produção'
      );
    });

    it('should continue even if logging fails', async () => {
      const mockProductionItem = {
        id: 'prod-123',
        assigned_to: null,
        assigned_to_name: null,
      };

      const mockUser = {
        id: 'user-456',
        full_name: 'João Silva',
        email: 'joao@example.com',
      };

      const mockUpdatedItem = {
        ...mockProductionItem,
        assigned_to: mockUser.id,
        assigned_to_name: mockUser.full_name,
        assigned_at: new Date().toISOString(),
      };

      // Mock current item query
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProductionItem,
              error: null,
            }),
          }),
        }),
      });

      // Mock user query
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      });

      // Mock update query
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedItem,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock log insert with error
      (supabase.from as any).mockReturnValueOnce({
        insert: vi.fn().mockRejectedValue(new Error('Log insert failed')),
      });

      // Mock auth user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'admin-789' } },
      });

      // Should not throw even if logging fails
      const result = await assignProduction('prod-123', 'user-456');
      expect(result).toBeDefined();
    });

    it('should continue even if notification fails', async () => {
      const mockProductionItem = {
        id: 'prod-123',
        assigned_to: null,
        assigned_to_name: null,
      };

      const mockUser = {
        id: 'user-456',
        full_name: 'João Silva',
        email: 'joao@example.com',
      };

      const mockUpdatedItem = {
        ...mockProductionItem,
        assigned_to: mockUser.id,
        assigned_to_name: mockUser.full_name,
        assigned_at: new Date().toISOString(),
      };

      // Mock current item query
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProductionItem,
              error: null,
            }),
          }),
        }),
      });

      // Mock user query
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      });

      // Mock update query
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedItem,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock log insert
      (supabase.from as any).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      // Mock auth user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'admin-789' } },
      });

      // Mock notification service to throw error
      const { ProductionNotificationService } = await import(
        '@/services/notifications/production-notification-service'
      );
      (ProductionNotificationService as any).mockImplementationOnce(() => ({
        sendAssignmentNotification: vi.fn().mockRejectedValue(new Error('Notification failed')),
      }));

      // Should not throw even if notification fails
      const result = await assignProduction('prod-123', 'user-456');
      expect(result).toBeDefined();
    });
  });
});
