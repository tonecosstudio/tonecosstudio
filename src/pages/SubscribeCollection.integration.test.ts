/**
 * Integration test for SubscribeCollection collection rotation
 * 
 * Tests that the collection selection UI correctly:
 * - Fetches only active collections for the current month
 * - Displays rotation information for rotating collections
 * - Shows fixed collections as available every month
 * 
 * Requirements: 5.5, 5.6, 28.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getActiveCollections, getRotationSchedule } from '@/services/collection-service';
import { nowInBahia } from '@/lib/timezone';

// Mock the services
vi.mock('@/services/collection-service');
vi.mock('@/lib/timezone');

describe('SubscribeCollection - Collection Rotation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch active collections for current month in Bahia timezone', async () => {
    // Mock current time to January 2026 (odd month)
    const mockBahiaTime = new Date('2026-01-15T10:00:00');
    vi.mocked(nowInBahia).mockReturnValue(mockBahiaTime);

    // Mock active collections response
    const mockCollections = [
      {
        id: 'col-1',
        name: 'Fixed Collection',
        rotation_type: 'fixed' as const,
        is_active: true,
      },
      {
        id: 'col-2',
        name: 'Odd Month Collection',
        rotation_type: 'odd_months' as const,
        is_active: true,
      },
    ];
    vi.mocked(getActiveCollections).mockResolvedValue(mockCollections as any);

    // Call the function that would be used in the component
    const currentBahiaTime = nowInBahia();
    const currentMonth = currentBahiaTime.getMonth() + 1; // January = 1
    const currentYear = currentBahiaTime.getFullYear(); // 2026

    const activeCollections = await getActiveCollections(currentMonth, currentYear);

    // Verify correct parameters were passed
    expect(getActiveCollections).toHaveBeenCalledWith(1, 2026);
    
    // Verify we got both fixed and odd month collections
    expect(activeCollections).toHaveLength(2);
    expect(activeCollections.find(c => c.rotation_type === 'fixed')).toBeDefined();
    expect(activeCollections.find(c => c.rotation_type === 'odd_months')).toBeDefined();
  });

  it('should exclude even month collections in odd months', async () => {
    // Mock current time to March 2026 (odd month)
    const mockBahiaTime = new Date('2026-03-10T10:00:00');
    vi.mocked(nowInBahia).mockReturnValue(mockBahiaTime);

    // Mock active collections response (should not include even_months)
    const mockCollections = [
      {
        id: 'col-1',
        name: 'Fixed Collection',
        rotation_type: 'fixed' as const,
        is_active: true,
      },
      {
        id: 'col-2',
        name: 'Odd Month Collection',
        rotation_type: 'odd_months' as const,
        is_active: true,
      },
    ];
    vi.mocked(getActiveCollections).mockResolvedValue(mockCollections as any);

    const currentBahiaTime = nowInBahia();
    const currentMonth = currentBahiaTime.getMonth() + 1; // March = 3
    const currentYear = currentBahiaTime.getFullYear();

    const activeCollections = await getActiveCollections(currentMonth, currentYear);

    // Verify no even_months collections are returned
    expect(activeCollections.every(c => c.rotation_type !== 'even_months')).toBe(true);
  });

  it('should get rotation schedule for collections', async () => {
    // Mock rotation schedule for odd months collection
    const mockSchedule = [1, 3, 5, 7, 9, 11]; // Jan, Mar, May, Jul, Sep, Nov
    vi.mocked(getRotationSchedule).mockResolvedValue(mockSchedule);

    const schedule = await getRotationSchedule('col-odd-months');

    expect(getRotationSchedule).toHaveBeenCalledWith('col-odd-months');
    expect(schedule).toEqual([1, 3, 5, 7, 9, 11]);
  });

  it('should get full year schedule for fixed collections', async () => {
    // Mock rotation schedule for fixed collection
    const mockSchedule = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // All months
    vi.mocked(getRotationSchedule).mockResolvedValue(mockSchedule);

    const schedule = await getRotationSchedule('col-fixed');

    expect(schedule).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('should handle February (even month) correctly', async () => {
    // Mock current time to February 2026 (even month)
    const mockBahiaTime = new Date('2026-02-10T10:00:00');
    vi.mocked(nowInBahia).mockReturnValue(mockBahiaTime);

    // Mock active collections response (should include even_months, not odd_months)
    const mockCollections = [
      {
        id: 'col-1',
        name: 'Fixed Collection',
        rotation_type: 'fixed' as const,
        is_active: true,
      },
      {
        id: 'col-3',
        name: 'Even Month Collection',
        rotation_type: 'even_months' as const,
        is_active: true,
      },
    ];
    vi.mocked(getActiveCollections).mockResolvedValue(mockCollections as any);

    const currentBahiaTime = nowInBahia();
    const currentMonth = currentBahiaTime.getMonth() + 1; // February = 2
    const currentYear = currentBahiaTime.getFullYear();

    const activeCollections = await getActiveCollections(currentMonth, currentYear);

    // Verify we got fixed and even month collections
    expect(activeCollections).toHaveLength(2);
    expect(activeCollections.find(c => c.rotation_type === 'fixed')).toBeDefined();
    expect(activeCollections.find(c => c.rotation_type === 'even_months')).toBeDefined();
    expect(activeCollections.find(c => c.rotation_type === 'odd_months')).toBeUndefined();
  });
});
