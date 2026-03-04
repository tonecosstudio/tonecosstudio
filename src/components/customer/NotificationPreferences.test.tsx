/**
 * Tests for NotificationPreferences Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationPreferences } from './NotificationPreferences';
import * as preferencesService from '@/services/customer/notification-preferences-service';
import type { NotificationPreferences as NotificationPreferencesType } from '@/types/notification-preferences';

// Mock the service
vi.mock('@/services/customer/notification-preferences-service');

const mockPreferences: NotificationPreferencesType = {
  production_stage_updates: true,
  item_shipped: true,
  item_delivered: true,
  marketing_emails: false,
};

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('NotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(preferencesService.fetchNotificationPreferences).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(<NotificationPreferences />);
    
    // Check for loading spinner by class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders preferences after loading', async () => {
    vi.mocked(preferencesService.fetchNotificationPreferences).mockResolvedValue(mockPreferences);

    renderWithQueryClient(<NotificationPreferences />);

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    expect(screen.getByText('Production Stage Updates')).toBeInTheDocument();
    expect(screen.getByText('Shipping Notifications')).toBeInTheDocument();
    expect(screen.getByText('Delivery Confirmations')).toBeInTheDocument();
    expect(screen.getByText('Marketing & Promotional Emails')).toBeInTheDocument();
  });

  it('displays info banner about critical notifications', async () => {
    vi.mocked(preferencesService.fetchNotificationPreferences).mockResolvedValue(mockPreferences);

    renderWithQueryClient(<NotificationPreferences />);

    await waitFor(() => {
      expect(screen.getByText(/Critical notifications/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/character choice reminders/i)).toBeInTheDocument();
  });

  it('toggles preference when switch is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(preferencesService.fetchNotificationPreferences).mockResolvedValue(mockPreferences);
    vi.mocked(preferencesService.updateNotificationPreferences).mockResolvedValue({
      ...mockPreferences,
      production_stage_updates: false,
    });

    renderWithQueryClient(<NotificationPreferences />);

    await waitFor(() => {
      expect(screen.getByText('Production Stage Updates')).toBeInTheDocument();
    });

    // Find and click the toggle for production_stage_updates
    const toggles = screen.getAllByRole('switch');
    await user.click(toggles[0]); // First toggle is production_stage_updates

    await waitFor(() => {
      expect(preferencesService.updateNotificationPreferences).toHaveBeenCalledWith({
        production_stage_updates: false,
      });
    });
  });

  it('calls onUpdate callback when preferences are updated', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const updatedPreferences = { ...mockPreferences, item_shipped: false };

    vi.mocked(preferencesService.fetchNotificationPreferences).mockResolvedValue(mockPreferences);
    vi.mocked(preferencesService.updateNotificationPreferences).mockResolvedValue(updatedPreferences);

    renderWithQueryClient(<NotificationPreferences onUpdate={onUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('Shipping Notifications')).toBeInTheDocument();
    });

    const toggles = screen.getAllByRole('switch');
    await user.click(toggles[1]); // Second toggle is item_shipped

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(updatedPreferences);
    });
  });

  it('resets preferences when reset button is clicked', async () => {
    const user = userEvent.setup();
    const defaultPreferences: NotificationPreferencesType = {
      production_stage_updates: true,
      item_shipped: true,
      item_delivered: true,
      marketing_emails: true,
    };

    vi.mocked(preferencesService.fetchNotificationPreferences).mockResolvedValue(mockPreferences);
    vi.mocked(preferencesService.resetNotificationPreferences).mockResolvedValue(defaultPreferences);

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithQueryClient(<NotificationPreferences />);

    await waitFor(() => {
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    const resetButton = screen.getByText('Reset to Defaults');
    await user.click(resetButton);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(preferencesService.resetNotificationPreferences).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });

  it('does not reset preferences when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.mocked(preferencesService.fetchNotificationPreferences).mockResolvedValue(mockPreferences);

    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderWithQueryClient(<NotificationPreferences />);

    await waitFor(() => {
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    const resetButton = screen.getByText('Reset to Defaults');
    await user.click(resetButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(preferencesService.resetNotificationPreferences).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('displays error message when loading fails', async () => {
    vi.mocked(preferencesService.fetchNotificationPreferences).mockRejectedValue(
      new Error('Failed to load')
    );

    renderWithQueryClient(<NotificationPreferences />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load notification preferences')).toBeInTheDocument();
    });
  });

  it('displays success message after updating preferences', async () => {
    const user = userEvent.setup();
    vi.mocked(preferencesService.fetchNotificationPreferences).mockResolvedValue(mockPreferences);
    vi.mocked(preferencesService.updateNotificationPreferences).mockResolvedValue({
      ...mockPreferences,
      marketing_emails: true,
    });

    renderWithQueryClient(<NotificationPreferences />);

    await waitFor(() => {
      expect(screen.getByText('Marketing & Promotional Emails')).toBeInTheDocument();
    });

    const toggles = screen.getAllByRole('switch');
    await user.click(toggles[3]); // Fourth toggle is marketing_emails

    await waitFor(() => {
      expect(screen.getByText(/preferences updated successfully/i)).toBeInTheDocument();
    });
  });

  it('disables toggles while update is in progress', async () => {
    const user = userEvent.setup();
    vi.mocked(preferencesService.fetchNotificationPreferences).mockResolvedValue(mockPreferences);
    vi.mocked(preferencesService.updateNotificationPreferences).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(<NotificationPreferences />);

    await waitFor(() => {
      expect(screen.getByText('Production Stage Updates')).toBeInTheDocument();
    });

    const toggles = screen.getAllByRole('switch');
    await user.click(toggles[0]);

    // All toggles should be disabled during update
    toggles.forEach(toggle => {
      expect(toggle).toBeDisabled();
    });
  });
});
