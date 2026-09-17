/**
 * Shipping deadline calculation utilities for ORDAX platform.
 *
 * Shipping deadlines are civil dates. Comparisons therefore use the current
 * calendar date in America/Bahia instead of comparing timezone-shifted Date
 * timestamps.
 */

import { differenceInCalendarDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { calculate5thBusinessDay } from './business-days';
import { BAHIA_TIMEZONE } from './timezone';

function getCurrentBahiaCivilDate(): Date {
  const dateKey = formatInTimeZone(new Date(), BAHIA_TIMEZONE, 'yyyy-MM-dd');
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** Calculates the fifth business day of a month. */
export function calculateShippingDeadline(
  month: number,
  year: number,
  holidays: Date[] = [],
): Date {
  return calculate5thBusinessDay(month, year, holidays);
}

/**
 * Returns whether an unshipped delivery is past its shipping civil date.
 */
export function isDeliveryOverdue(
  cycleMonth: number,
  cycleYear: number,
  deliveryStatus: string,
  holidays: Date[] = [],
): boolean {
  if (deliveryStatus === 'shipped' || deliveryStatus === 'delivered') {
    return false;
  }

  const deadline = calculateShippingDeadline(cycleMonth, cycleYear, holidays);
  const todayInBahia = getCurrentBahiaCivilDate();

  return todayInBahia > deadline;
}

/**
 * Calculates calendar days remaining until the deadline, or days overdue.
 */
export function getDeliveryDeadlineStatus(
  cycleMonth: number,
  cycleYear: number,
  deliveryStatus: string,
  holidays: Date[] = [],
): {
  daysRemaining: number;
  daysOverdue: number;
  isOverdue: boolean;
  deadline: Date;
} {
  const deadline = calculateShippingDeadline(cycleMonth, cycleYear, holidays);

  if (deliveryStatus === 'shipped' || deliveryStatus === 'delivered') {
    return {
      daysRemaining: 0,
      daysOverdue: 0,
      isOverdue: false,
      deadline,
    };
  }

  const todayInBahia = getCurrentBahiaCivilDate();
  const daysDiff = differenceInCalendarDays(deadline, todayInBahia);

  if (daysDiff >= 0) {
    return {
      daysRemaining: daysDiff,
      daysOverdue: 0,
      isOverdue: false,
      deadline,
    };
  }

  return {
    daysRemaining: 0,
    daysOverdue: Math.abs(daysDiff),
    isOverdue: true,
    deadline,
  };
}

/** Formats a deadline status for display. */
export function formatDeadlineStatus(status: {
  daysRemaining: number;
  daysOverdue: number;
  isOverdue: boolean;
}): string {
  if (status.isOverdue) {
    if (status.daysOverdue === 0) {
      return 'Prazo hoje';
    }
    if (status.daysOverdue === 1) {
      return '1 dia de atraso';
    }
    return `${status.daysOverdue} dias de atraso`;
  }

  if (status.daysRemaining === 0) {
    return 'Prazo hoje';
  }
  if (status.daysRemaining === 1) {
    return '1 dia restante';
  }
  return `${status.daysRemaining} dias restantes`;
}

export default {
  calculateShippingDeadline,
  isDeliveryOverdue,
  getDeliveryDeadlineStatus,
  formatDeadlineStatus,
};
