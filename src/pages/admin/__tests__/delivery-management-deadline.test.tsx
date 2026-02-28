/**
 * Integration tests for shipping deadline indicator in DeliveryManagement
 * 
 * Validates: Requirements 15.8
 */

import { describe, it, expect } from 'vitest';
import { getDeliveryDeadlineStatus, formatDeadlineStatus } from '@/lib/shipping-deadline';

describe('DeliveryManagement - Shipping Deadline Integration', () => {
  describe('Deadline calculation for deliveries', () => {
    it('should calculate deadline status for past month delivery', () => {
      // January 2024 - definitely in the past
      const status = getDeliveryDeadlineStatus(1, 2024, 'in_production', []);
      
      expect(status.isOverdue).toBe(true);
      expect(status.daysOverdue).toBeGreaterThan(0);
      expect(status.daysRemaining).toBe(0);
    });

    it('should calculate deadline status for future month delivery', () => {
      // December 2026 - definitely in the future
      const status = getDeliveryDeadlineStatus(12, 2026, 'in_production', []);
      
      expect(status.isOverdue).toBe(false);
      expect(status.daysRemaining).toBeGreaterThan(0);
      expect(status.daysOverdue).toBe(0);
    });

    it('should not mark shipped deliveries as overdue', () => {
      // Even with past month, shipped deliveries should not be overdue
      const status = getDeliveryDeadlineStatus(1, 2024, 'shipped', []);
      
      expect(status.isOverdue).toBe(false);
      expect(status.daysRemaining).toBe(0);
      expect(status.daysOverdue).toBe(0);
    });

    it('should not mark delivered deliveries as overdue', () => {
      // Even with past month, delivered deliveries should not be overdue
      const status = getDeliveryDeadlineStatus(1, 2024, 'delivered', []);
      
      expect(status.isOverdue).toBe(false);
      expect(status.daysRemaining).toBe(0);
      expect(status.daysOverdue).toBe(0);
    });
  });

  describe('Deadline status formatting', () => {
    it('should format overdue status in Portuguese', () => {
      const status = {
        daysRemaining: 0,
        daysOverdue: 5,
        isOverdue: true,
      };
      
      const formatted = formatDeadlineStatus(status);
      expect(formatted).toBe('5 dias de atraso');
    });

    it('should format remaining days status in Portuguese', () => {
      const status = {
        daysRemaining: 3,
        daysOverdue: 0,
        isOverdue: false,
      };
      
      const formatted = formatDeadlineStatus(status);
      expect(formatted).toBe('3 dias restantes');
    });

    it('should handle singular day correctly', () => {
      const overdueStatus = {
        daysRemaining: 0,
        daysOverdue: 1,
        isOverdue: true,
      };
      
      const remainingStatus = {
        daysRemaining: 1,
        daysOverdue: 0,
        isOverdue: false,
      };
      
      expect(formatDeadlineStatus(overdueStatus)).toBe('1 dia de atraso');
      expect(formatDeadlineStatus(remainingStatus)).toBe('1 dia restante');
    });
  });

  describe('Visual indicators', () => {
    it('should identify deliveries that need red highlighting', () => {
      // Past month, not shipped
      const overdueStatus = getDeliveryDeadlineStatus(1, 2024, 'in_production', []);
      expect(overdueStatus.isOverdue).toBe(true);
      
      // Future month
      const onTimeStatus = getDeliveryDeadlineStatus(12, 2026, 'in_production', []);
      expect(onTimeStatus.isOverdue).toBe(false);
      
      // Past month but shipped
      const shippedStatus = getDeliveryDeadlineStatus(1, 2024, 'shipped', []);
      expect(shippedStatus.isOverdue).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle deliveries with various statuses', () => {
      const statuses = [
        'scheduled',
        'pending_choice',
        'confirmed',
        'in_production',
        'shipped',
        'delivered',
      ];

      statuses.forEach(status => {
        const deadlineStatus = getDeliveryDeadlineStatus(1, 2024, status, []);
        
        // Shipped and delivered should never be overdue
        if (status === 'shipped' || status === 'delivered') {
          expect(deadlineStatus.isOverdue).toBe(false);
        } else {
          // Past month, other statuses should be overdue
          expect(deadlineStatus.isOverdue).toBe(true);
        }
      });
    });

    it('should calculate deadline for different months', () => {
      const months = [1, 3, 6, 9, 12];
      
      months.forEach(month => {
        const status = getDeliveryDeadlineStatus(month, 2026, 'in_production', []);
        
        // All should have a valid deadline
        expect(status.deadline).toBeInstanceOf(Date);
        expect(status.deadline.getMonth()).toBe(month - 1); // 0-indexed
        expect(status.deadline.getFullYear()).toBe(2026);
      });
    });
  });
});
