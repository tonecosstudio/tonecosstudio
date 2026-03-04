/**
 * Deadline Calculator Utility
 * 
 * Provides consistent deadline calculation for character choices across the application.
 * This mirrors the database function calculate_character_choice_deadline().
 * 
 * Requirements: 2.2.4 (AC1: Deadline is set to 7 days after order payment approval)
 */

/**
 * Calculates the character choice deadline as 7 days after the approval date.
 * 
 * @param approvalDate - The date when the order payment was approved (defaults to now)
 * @returns The deadline date (7 days after approval)
 * 
 * @example
 * // Calculate deadline from a specific approval date
 * const approvalDate = new Date('2026-05-01T10:00:00Z');
 * const deadline = calculateCharacterChoiceDeadline(approvalDate);
 * // Returns: 2026-05-08T10:00:00Z
 * 
 * @example
 * // Calculate deadline from current time
 * const deadline = calculateCharacterChoiceDeadline();
 * // Returns: 7 days from now
 */
export function calculateCharacterChoiceDeadline(approvalDate: Date = new Date()): Date {
  const deadline = new Date(approvalDate);
  deadline.setDate(deadline.getDate() + 7);
  return deadline;
}

/**
 * Calculates the number of hours remaining until a deadline.
 * 
 * @param deadline - The deadline date
 * @returns The number of hours remaining (negative if deadline has passed)
 * 
 * @example
 * const deadline = new Date('2026-05-08T10:00:00Z');
 * const hoursRemaining = getHoursUntilDeadline(deadline);
 */
export function getHoursUntilDeadline(deadline: Date): number {
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Checks if a deadline is critical (less than 24 hours remaining).
 * 
 * @param deadline - The deadline date
 * @returns True if less than 24 hours remain, false otherwise
 * 
 * @example
 * const deadline = new Date('2026-05-08T10:00:00Z');
 * const isCritical = isDeadlineCritical(deadline);
 */
export function isDeadlineCritical(deadline: Date): boolean {
  return getHoursUntilDeadline(deadline) < 24;
}

/**
 * Checks if a deadline is urgent (less than 48 hours remaining).
 * 
 * @param deadline - The deadline date
 * @returns True if less than 48 hours remain, false otherwise
 * 
 * @example
 * const deadline = new Date('2026-05-08T10:00:00Z');
 * const isUrgent = isDeadlineUrgent(deadline);
 */
export function isDeadlineUrgent(deadline: Date): boolean {
  return getHoursUntilDeadline(deadline) < 48;
}

/**
 * Checks if a deadline has expired.
 * 
 * @param deadline - The deadline date
 * @returns True if the deadline has passed, false otherwise
 * 
 * @example
 * const deadline = new Date('2026-05-08T10:00:00Z');
 * const hasExpired = hasDeadlineExpired(deadline);
 */
export function hasDeadlineExpired(deadline: Date): boolean {
  return getHoursUntilDeadline(deadline) < 0;
}

/**
 * Formats the time remaining until a deadline in a human-readable format.
 * 
 * @param deadline - The deadline date
 * @returns A formatted string like "2 days, 5 hours" or "Expired"
 * 
 * @example
 * const deadline = new Date('2026-05-08T10:00:00Z');
 * const formatted = formatTimeRemaining(deadline);
 * // Returns: "2 days, 5 hours" or "Expired" if past deadline
 */
export function formatTimeRemaining(deadline: Date): string {
  const hoursRemaining = getHoursUntilDeadline(deadline);
  
  if (hoursRemaining < 0) {
    return 'Expired';
  }
  
  const days = Math.floor(hoursRemaining / 24);
  const hours = Math.floor(hoursRemaining % 24);
  
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  const minutes = Math.floor((hoursRemaining * 60) % 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Gets the urgency level of a deadline.
 * 
 * @param deadline - The deadline date
 * @returns 'expired' | 'critical' | 'urgent' | 'normal'
 * 
 * @example
 * const deadline = new Date('2026-05-08T10:00:00Z');
 * const urgency = getDeadlineUrgency(deadline);
 * // Returns: 'critical' if < 24h, 'urgent' if < 48h, 'normal' otherwise
 */
export function getDeadlineUrgency(deadline: Date): 'expired' | 'critical' | 'urgent' | 'normal' {
  if (hasDeadlineExpired(deadline)) {
    return 'expired';
  }
  
  if (isDeadlineCritical(deadline)) {
    return 'critical';
  }
  
  if (isDeadlineUrgent(deadline)) {
    return 'urgent';
  }
  
  return 'normal';
}
