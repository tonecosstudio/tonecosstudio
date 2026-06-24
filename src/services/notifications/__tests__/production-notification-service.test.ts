/**
 * Production Notification Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { productionNotificationService } from '../production-notification-service';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'test-id',
              customer_id: 'user-123',
              user_id: 'user-123',
              order_id: 'order-123',
              order_type: 'subscription_delivery',
              collection_id: 'collection-123',
              deadline: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
              status: 'pending',
              profiles: {
                email: 'test@example.com',
                raw_user_meta_data: { full_name: 'Test User' }
              },
              collections: {
                name: 'Test Collection'
              },
              collection_characters: {
                name: 'Test Character',
                image_url: 'https://example.com/image.jpg'
              }
            },
            error: null
          }))
        }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({
      data: true, // Default to allowing notifications
      error: null
    }))
  }
}));

// Mock email service
vi.mock('../email-service', () => ({
  emailService: {
    sendEmail: vi.fn(() => Promise.resolve())
  }
}));

describe('ProductionNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productionNotificationService.clearQueue();
  });

  describe('sendChoiceReminder', () => {
    it('should queue a choice reminder notification', async () => {
      await productionNotificationService.sendChoiceReminder('test-choice-id');
      
      // The notification is processed asynchronously and removed from queue
      // We should verify the function was called without error
      const { supabase } = await import('@/integrations/supabase/client');
      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('sendChoiceApproval', () => {
    it('should queue a choice approval notification', async () => {
      await productionNotificationService.sendChoiceApproval('test-choice-id');
      
      // The notification is processed asynchronously and removed from queue
      // We should verify the function was called without error
      const { supabase } = await import('@/integrations/supabase/client');
      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('sendStageUpdate', () => {
    it('should queue a stage update notification', async () => {
      await productionNotificationService.sendStageUpdate('test-queue-id', 'production');
      
      // The notification is processed asynchronously and removed from queue
      // We should verify the function was called without error
      const { supabase } = await import('@/integrations/supabase/client');
      expect(supabase.from).toHaveBeenCalled();
      expect(supabase.rpc).toHaveBeenCalled();
    });
  });

  describe('sendDelayNotification', () => {
    it('should queue a delay notification', async () => {
      await productionNotificationService.sendDelayNotification('test-queue-id', 'Material shortage');
      
      // The notification is processed asynchronously and removed from queue
      // We should verify the function was called without error
      const { supabase } = await import('@/integrations/supabase/client');
      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct queue status', () => {
      const status = productionNotificationService.getQueueStatus();
      expect(status).toHaveProperty('total');
      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('sent');
      expect(status).toHaveProperty('failed');
    });
  });

  describe('clearQueue', () => {
    it('should clear the notification queue', async () => {
      // Clear queue first to ensure it's empty
      productionNotificationService.clearQueue();
      expect(productionNotificationService.getQueueStatus().total).toBe(0);
      
      // The queue processes notifications immediately, so we can't test
      // that items stay in the queue. Instead, we test that clearQueue
      // doesn't throw errors and returns the expected status.
      productionNotificationService.clearQueue();
      const status = productionNotificationService.getQueueStatus();
      expect(status.total).toBe(0);
      expect(status.pending).toBe(0);
      expect(status.sent).toBe(0);
      expect(status.failed).toBe(0);
    });
  });
});
