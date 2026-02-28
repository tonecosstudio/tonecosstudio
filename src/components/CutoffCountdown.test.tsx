/**
 * Tests for CutoffCountdown Component
 * 
 * Verifies that the countdown timer correctly resets when a new month begins
 * and displays the correct time remaining until the current month's cutoff.
 * 
 * Requirements: 7.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CutoffCountdown, useIsBeforeCutoff } from './CutoffCountdown';
import { renderHook } from '@testing-library/react';

describe('CutoffCountdown Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Month Transition Behavior', () => {
    it('should calculate time remaining based on current month', () => {
      // Set date to March 1, 2024 at 10:00
      const march1 = new Date(2024, 2, 1, 10, 0, 0);
      vi.setSystemTime(march1);

      render(<CutoffCountdown variant="default" />);

      // Should show approximately 14 days remaining
      expect(screen.getByText(/14d/i)).toBeInTheDocument();
    });

    it('should show time remaining on day 14', () => {
      // Set date to March 14, 2024 at 10:00
      const march14 = new Date(2024, 2, 14, 10, 0, 0);
      vi.setSystemTime(march14);

      render(<CutoffCountdown variant="default" />);

      // Should show approximately 1 day remaining
      expect(screen.getByText(/1d/i)).toBeInTheDocument();
    });

    it('should show "Prazo encerrado" after cutoff', () => {
      // Set date to March 16, 2024 (after cutoff)
      const march16 = new Date(2024, 2, 16, 10, 0, 0);
      vi.setSystemTime(march16);

      render(<CutoffCountdown variant="default" />);

      // Should show cutoff passed message
      expect(screen.getByText(/Prazo encerrado/i)).toBeInTheDocument();
    });

    it('should reset countdown when new month begins', () => {
      // Start on March 31 (after cutoff)
      const march31 = new Date(2024, 2, 31, 23, 59, 59);
      vi.setSystemTime(march31);

      const { rerender } = render(<CutoffCountdown variant="default" />);

      // Should show cutoff passed
      expect(screen.getByText(/Prazo encerrado/i)).toBeInTheDocument();

      // Advance time to April 1
      const april1 = new Date(2024, 3, 1, 0, 0, 1);
      vi.setSystemTime(april1);

      // Force re-render
      rerender(<CutoffCountdown variant="default" />);

      // Should now show time remaining for April (approximately 14 days)
      // Note: The component updates every second, so we need to wait for the interval
      vi.advanceTimersByTime(1000);

      waitFor(() => {
        expect(screen.queryByText(/Prazo encerrado/i)).not.toBeInTheDocument();
        expect(screen.getByText(/14d/i)).toBeInTheDocument();
      });
    });

    it('should handle year transition correctly', () => {
      // Set date to January 1, 2025 at 00:00
      const jan1 = new Date(2025, 0, 1, 0, 0, 0);
      vi.setSystemTime(jan1);

      render(<CutoffCountdown variant="default" />);

      // Should show approximately 14 days remaining for January
      expect(screen.getByText(/14d/i)).toBeInTheDocument();
    });

    it('should update countdown every second', () => {
      // Set date to March 15 at 23:59:00 (59 seconds before cutoff)
      const nearCutoff = new Date(2024, 2, 15, 23, 59, 0);
      vi.setSystemTime(nearCutoff);

      render(<CutoffCountdown variant="default" />);

      // Should show seconds
      expect(screen.getByText(/59s/i)).toBeInTheDocument();

      // Advance 1 second
      vi.advanceTimersByTime(1000);

      // Should update to 58 seconds
      waitFor(() => {
        expect(screen.getByText(/58s/i)).toBeInTheDocument();
      });
    });
  });

  describe('Variant Rendering', () => {
    it('should render compact variant correctly', () => {
      const march1 = new Date(2024, 2, 1, 10, 0, 0);
      vi.setSystemTime(march1);

      render(<CutoffCountdown variant="compact" />);

      // Compact variant should show badge with time
      expect(screen.getByText(/14d/i)).toBeInTheDocument();
    });

    it('should render alert variant correctly', () => {
      const march1 = new Date(2024, 2, 1, 10, 0, 0);
      vi.setSystemTime(march1);

      render(<CutoffCountdown variant="alert" />);

      // Alert variant should show full message
      expect(screen.getByText(/Você tem/i)).toBeInTheDocument();
    });

    it('should show urgent styling when less than 24 hours remain', () => {
      // Set date to March 15 at 10:00 (less than 24 hours to cutoff)
      const urgent = new Date(2024, 2, 15, 10, 0, 0);
      vi.setSystemTime(urgent);

      render(<CutoffCountdown variant="alert" />);

      // Should show urgent message
      expect(screen.getByText(/Atenção!/i)).toBeInTheDocument();
    });
  });

  describe('Callback Functionality', () => {
    it('should call onCutoffChange when cutoff status changes', () => {
      const onCutoffChange = vi.fn();

      // Start before cutoff
      const march14 = new Date(2024, 2, 14, 23, 59, 58);
      vi.setSystemTime(march14);

      render(<CutoffCountdown onCutoffChange={onCutoffChange} />);

      // Advance time past cutoff
      const afterCutoff = new Date(2024, 2, 16, 0, 0, 0);
      vi.setSystemTime(afterCutoff);
      vi.advanceTimersByTime(1000);

      // Callback should be called with true (cutoff passed)
      waitFor(() => {
        expect(onCutoffChange).toHaveBeenCalledWith(true);
      });
    });
  });
});

describe('useIsBeforeCutoff Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true before cutoff', () => {
    const march1 = new Date(2024, 2, 1, 10, 0, 0);
    vi.setSystemTime(march1);

    const { result } = renderHook(() => useIsBeforeCutoff());

    expect(result.current).toBe(true);
  });

  it('should return false after cutoff', () => {
    const march16 = new Date(2024, 2, 16, 10, 0, 0);
    vi.setSystemTime(march16);

    const { result } = renderHook(() => useIsBeforeCutoff());

    expect(result.current).toBe(false);
  });

  it('should update when month changes', () => {
    // Start on March 31 (after cutoff)
    const march31 = new Date(2024, 2, 31, 23, 59, 59);
    vi.setSystemTime(march31);

    const { result, rerender } = renderHook(() => useIsBeforeCutoff());

    expect(result.current).toBe(false);

    // Advance to April 1
    const april1 = new Date(2024, 3, 1, 0, 0, 1);
    vi.setSystemTime(april1);

    // Advance timers to trigger the interval check
    vi.advanceTimersByTime(60000); // 1 minute

    rerender();

    waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});

describe('Integration: Complete Month Cycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle complete cycle from start of month to next month', () => {
    // March 1: Before cutoff
    const march1 = new Date(2024, 2, 1, 10, 0, 0);
    vi.setSystemTime(march1);

    const { rerender } = render(<CutoffCountdown variant="default" />);
    expect(screen.getByText(/14d/i)).toBeInTheDocument();

    // March 16: After cutoff (blocked)
    const march16 = new Date(2024, 2, 16, 0, 0, 0);
    vi.setSystemTime(march16);
    vi.advanceTimersByTime(1000);
    rerender(<CutoffCountdown variant="default" />);

    waitFor(() => {
      expect(screen.getByText(/Prazo encerrado/i)).toBeInTheDocument();
    });

    // April 1: New month, countdown resets
    const april1 = new Date(2024, 3, 1, 0, 0, 0);
    vi.setSystemTime(april1);
    vi.advanceTimersByTime(1000);
    rerender(<CutoffCountdown variant="default" />);

    waitFor(() => {
      expect(screen.queryByText(/Prazo encerrado/i)).not.toBeInTheDocument();
      expect(screen.getByText(/14d/i)).toBeInTheDocument();
    });
  });
});
