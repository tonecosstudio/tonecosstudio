/**
 * Shipping deadline calculation utilities for ORDAX platform
 * 
 * These functions calculate shipping deadlines (5th business day of month)
 * and determine if deliveries are overdue.
 * 
 * @module shipping-deadline
 */

import { calculate5thBusinessDay } from './business-days';
import { toBahiaTime } from './timezone';
import { differenceInDays } from 'date-fns';

/**
 * Calculates the shipping deadline for a given month/year
 * 
 * The shipping deadline is the 5th business day of the month,
 * calculated from the 1st of the month, skipping weekends and holidays.
 * 
 * @param month - Month (1-12)
 * @param year - Year (e.g., 2026)
 * @param holidays - Array of holiday dates to exclude (optional)
 * @returns The shipping deadline date
 * 
 * @example
 * const deadline = calculateShippingDeadline(3, 2026, []);
 * console.log(`Shipping deadline: ${deadline.toLocaleDateString()}`);
 * 
 * Validates: Requirements 15.8
 */
export function calculateShippingDeadline(
  month: number,
  year: number,
  holidays: Date[] = []
): Date {
  return calculate5thBusinessDay(month, year, holidays);
}

/**
 * Checks if a delivery is overdue based on its cycle and current date
 * 
 * A delivery is overdue if:
 * - It has not been shipped yet (status is not 'shipped' or 'delivered')
 * - The current date is after the shipping deadline (5th business day of the cycle's month)
 * 
 * @param cycleMonth - The month of the delivery cycle (1-12)
 * @param cycleYear - The year of the delivery cycle
 * @param deliveryStatus - Current status of the delivery
 * @param holidays - Array of holiday dates to exclude (optional)
 * @returns true if the delivery is overdue
 * 
 * @example
 * const isOverdue = isDeliveryOverdue(3, 2026, 'in_production', []);
 * 
 * Validates: Requirements 15.8
 */
export function isDeliveryOverdue(
  cycleMonth: number,
  cycleYear: number,
  deliveryStatus: string,
  holidays: Date[] = []
): boolean {
  // If already shipped or delivered, not overdue
  if (deliveryStatus === 'shipped' || deliveryStatus === 'delivered') {
    return false;
  }

  const deadline = calculateShippingDeadline(cycleMonth, cycleYear, holidays);
  const now = toBahiaTime(new Date());

  return now > deadline;
}

/**
 * Calculates days remaining until shipping deadline or days overdue
 * 
 * Returns:
 * - Positive number: days remaining until deadline
 * - Negative number: days overdue (past deadline)
 * - 0: deadline is today
 * 
 * @param cycleMonth - The month of the delivery cycle (1-12)
 * @param cycleYear - The year of the delivery cycle
 * @param deliveryStatus - Current status of the delivery
 * @param holidays - Array of holiday dates to exclude (optional)
 * @returns Object with daysRemaining (positive) or daysOverdue (positive), and isOverdue flag
 * 
 * @example
 * const status = getDeliveryDeadlineStatus(3, 2026, 'in_production', []);
 * if (status.isOverdue) {
 *   console.log(`Overdue by ${status.daysOverdue} days`);
 * } else {
 *   console.log(`${status.daysRemaining} days remaining`);
 * }
 * 
 * Validates: Requirements 15.8
 */
export function getDeliveryDeadlineStatus(
  cycleMonth: number,
  cycleYear: number,
  deliveryStatus: string,
  holidays: Date[] = []
): {
  daysRemaining: number;
  daysOverdue: number;
  isOverdue: boolean;
  deadline: Date;
} {
  const deadline = calculateShippingDeadline(cycleMonth, cycleYear, holidays);
  const now = toBahiaTime(new Date());

  // If already shipped or delivered, show as met deadline
  if (deliveryStatus === 'shipped' || deliveryStatus === 'delivered') {
    return {
      daysRemaining: 0,
      daysOverdue: 0,
      isOverdue: false,
      deadline,
    };
  }

  const daysDiff = differenceInDays(deadline, now);

  if (daysDiff >= 0) {
    // Deadline is in the future
    return {
      daysRemaining: daysDiff,
      daysOverdue: 0,
      isOverdue: false,
      deadline,
    };
  } else {
    // Deadline has passed
    return {
      daysRemaining: 0,
      daysOverdue: Math.abs(daysDiff),
      isOverdue: true,
      deadline,
    };
  }
}

/**
 * Formats the deadline status as a human-readable string
 * 
 * @param status - The deadline status object from getDeliveryDeadlineStatus
 * @returns Formatted string like "3 dias restantes" or "2 dias de atraso"
 * 
 * @example
 * const status = getDeliveryDeadlineStatus(3, 2026, 'in_production', []);
 * const text = formatDeadlineStatus(status);
 * console.log(text); // "3 dias restantes" or "2 dias de atraso"
 */
export function formatDeadlineStatus(status: {
  daysRemaining: number;
  daysOverdue: number;
  isOverdue: boolean;
}): string {
  if (status.isOverdue) {
    if (status.daysOverdue === 0) {
      return 'Prazo hoje';
    } else if (status.daysOverdue === 1) {
      return '1 dia de atraso';
    } else {
      return `${status.daysOverdue} dias de atraso`;
    }
  } else {
    if (status.daysRemaining === 0) {
      return 'Prazo hoje';
    } else if (status.daysRemaining === 1) {
      return '1 dia restante';
    } else {
      return `${status.daysRemaining} dias restantes`;
    }
  }
}

export default {
  calculateShippingDeadline,
  isDeliveryOverdue,
  getDeliveryDeadlineStatus,
  formatDeadlineStatus,
};
