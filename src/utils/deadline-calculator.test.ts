/**
 * Tests for Deadline Calculator Utility
 * 
 * Validates that deadline calculations match the requirements:
 * - Requirement 2.2.4 AC1: Deadline is set to 7 days after order payment approval
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateCharacterChoiceDeadline,
  getHoursUntilDeadline,
  isDeadlineCritical,
  isDeadlineUrgent,
  hasDeadlineExpired,
  formatTimeRemaining,
  getDeadlineUrgency,
} from './deadline-calculator';

describe('calculateCharacterChoiceDeadline', () => {
  it('should calculate deadline as 7 days after approval date', () => {
    const approvalDate = new Date('2026-05-01T10:00:00Z');
    const deadline = calculateCharacterChoiceDeadline(approvalDate);
    
    expect(deadline.toISOString()).toBe('2026-05-08T10:00:00.000Z');
  });

  it('should handle different approval dates correctly', () => {
    const testCases = [
      { approval: '2026-01-01T00:00:00Z', expected: '2026-01-08T00:00:00.000Z' },
      { approval: '2026-12-25T12:30:00Z', expected: '2027-01-01T12:30:00.000Z' },
      { approval: '2026-02-22T23:59:59Z', expected: '2026-03-01T23:59:59.000Z' },
    ];

    testCases.forEach(({ approval, expected }) => {
      const deadline = calculateCharacterChoiceDeadline(new Date(approval));
      expect(deadline.toISOString()).toBe(expected);
    });
  });

  it('should use current date when no approval date is provided', () => {
    const now = new Date('2026-05-01T10:00:00Z');
    vi.setSystemTime(now);

    const deadline = calculateCharacterChoiceDeadline();
    
    expect(deadline.toISOString()).toBe('2026-05-08T10:00:00.000Z');
    
    vi.useRealTimers();
  });

  it('should preserve time of day from approval date', () => {
    const approvalDate = new Date('2026-05-01T14:30:45.123Z');
    const deadline = calculateCharacterChoiceDeadline(approvalDate);
    
    // Should be exactly 7 days later with same time (using UTC methods to avoid timezone issues)
    expect(deadline.getUTCHours()).toBe(14);
    expect(deadline.getUTCMinutes()).toBe(30);
    expect(deadline.getUTCSeconds()).toBe(45);
    expect(deadline.getUTCMilliseconds()).toBe(123);
  });
});

describe('getHoursUntilDeadline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should calculate positive hours for future deadlines', () => {
    const now = new Date('2026-05-01T10:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    const hours = getHoursUntilDeadline(deadline);
    
    expect(hours).toBe(168); // 7 days * 24 hours
  });

  it('should calculate negative hours for past deadlines', () => {
    const now = new Date('2026-05-08T10:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-01T10:00:00Z');
    const hours = getHoursUntilDeadline(deadline);
    
    expect(hours).toBe(-168); // -7 days * 24 hours
  });

  it('should return 0 for current time', () => {
    const now = new Date('2026-05-01T10:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-01T10:00:00Z');
    const hours = getHoursUntilDeadline(deadline);
    
    expect(hours).toBe(0);
  });
});

describe('isDeadlineCritical', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return true when less than 24 hours remain', () => {
    const now = new Date('2026-05-07T11:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    
    expect(isDeadlineCritical(deadline)).toBe(true);
  });

  it('should return false when more than 24 hours remain', () => {
    const now = new Date('2026-05-07T09:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    
    expect(isDeadlineCritical(deadline)).toBe(false);
  });

  it('should return true when deadline has passed', () => {
    const now = new Date('2026-05-09T10:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    
    expect(isDeadlineCritical(deadline)).toBe(true);
  });
});

describe('isDeadlineUrgent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return true when less than 48 hours remain', () => {
    const now = new Date('2026-05-06T11:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    
    expect(isDeadlineUrgent(deadline)).toBe(true);
  });

  it('should return false when more than 48 hours remain', () => {
    const now = new Date('2026-05-06T09:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    
    expect(isDeadlineUrgent(deadline)).toBe(false);
  });
});

describe('hasDeadlineExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return true when deadline has passed', () => {
    const now = new Date('2026-05-09T10:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    
    expect(hasDeadlineExpired(deadline)).toBe(true);
  });

  it('should return false when deadline is in the future', () => {
    const now = new Date('2026-05-07T10:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    
    expect(hasDeadlineExpired(deadline)).toBe(false);
  });
});

describe('formatTimeRemaining', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should format days and hours correctly', () => {
    const now = new Date('2026-05-01T10:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T15:00:00Z');
    const formatted = formatTimeRemaining(deadline);
    
    expect(formatted).toBe('7 days, 5 hours');
  });

  it('should format single day correctly', () => {
    const now = new Date('2026-05-07T10:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T13:00:00Z');
    const formatted = formatTimeRemaining(deadline);
    
    expect(formatted).toBe('1 day, 3 hours');
  });

  it('should format hours only when less than a day', () => {
    const now = new Date('2026-05-08T07:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    const formatted = formatTimeRemaining(deadline);
    
    expect(formatted).toBe('3 hours');
  });

  it('should format minutes when less than an hour', () => {
    const now = new Date('2026-05-08T09:30:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    const formatted = formatTimeRemaining(deadline);
    
    expect(formatted).toBe('30 minutes');
  });

  it('should return "Expired" for past deadlines', () => {
    const now = new Date('2026-05-09T10:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    const formatted = formatTimeRemaining(deadline);
    
    expect(formatted).toBe('Expired');
  });
});

describe('getDeadlineUrgency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return "expired" for past deadlines', () => {
    const now = new Date('2026-05-09T10:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    
    expect(getDeadlineUrgency(deadline)).toBe('expired');
  });

  it('should return "critical" when less than 24 hours remain', () => {
    const now = new Date('2026-05-07T11:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    
    expect(getDeadlineUrgency(deadline)).toBe('critical');
  });

  it('should return "urgent" when less than 48 hours remain', () => {
    const now = new Date('2026-05-06T11:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    
    expect(getDeadlineUrgency(deadline)).toBe('urgent');
  });

  it('should return "normal" when more than 48 hours remain', () => {
    const now = new Date('2026-05-01T10:00:00Z');
    vi.setSystemTime(now);

    const deadline = new Date('2026-05-08T10:00:00Z');
    
    expect(getDeadlineUrgency(deadline)).toBe('normal');
  });
});
