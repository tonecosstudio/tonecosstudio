import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmailAnalyticsDashboard } from '../email/EmailAnalyticsDashboard';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

const supabaseFromMock = supabase.from as unknown as {
  mockReturnValue: (value: unknown) => void;
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('EmailAnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Statistics Display', () => {
    it('should display email statistics', async () => {
      const mockStats = [
        { status: 'sent' },
        { status: 'sent' },
        { status: 'opened' },
        { status: 'clicked' },
        { status: 'failed' },
        { status: 'bounced' },
        { status: 'pending' },
      ];

      supabaseFromMock.mockReturnValue({
        select: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({
            data: mockStats,
            error: null
          })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      });

      render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('7')).toBeInTheDocument(); // Total
        expect(screen.getByText(/2.*entregues/)).toBeInTheDocument(); // Sent count (text may be split)
      });
    });

    it('should calculate open rate correctly', async () => {
      const mockStats = [
        { status: 'sent' },
        { status: 'sent' },
        { status: 'opened' },
        { status: 'opened' },
      ];

      supabaseFromMock.mockReturnValue({
        select: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({
            data: mockStats,
            error: null
          })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      });

      render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        // 2 opened out of 2 sent = 100%
        expect(screen.getByText('100.0%')).toBeInTheDocument();
      });
    });

    it('should calculate click rate correctly', async () => {
      const mockStats = [
        { status: 'sent' },
        { status: 'sent' },
        { status: 'sent' },
        { status: 'sent' },
        { status: 'clicked' },
      ];

      supabaseFromMock.mockReturnValue({
        select: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({
            data: mockStats,
            error: null
          })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      });

      render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        // 1 clicked out of 4 sent = 25%
        expect(screen.getByText('25.0%')).toBeInTheDocument();
      });
    });

    it('should show total failures', async () => {
      const mockStats = [
        { status: 'sent' },
        { status: 'failed' },
        { status: 'failed' },
        { status: 'bounced' },
      ];

      supabaseFromMock.mockReturnValue({
        select: vi.fn(() => ({
          gte: vi.fn(() => Promise.resolve({
            data: mockStats,
            error: null
          })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      });

      render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // 2 failed + 1 bounced
        expect(screen.getByText('2 falhas, 1 rejeitados')).toBeInTheDocument();
      });
    });
  });

  describe('Email Logs Table', () => {
    it('should display email logs', async () => {
      const mockLogs = [
        {
          id: '1',
          recipient_email: 'user1@example.com',
          email_type: 'welcome',
          subject: 'Welcome to ORDAX',
          status: 'sent',
          provider: 'sendgrid',
          error_message: null,
          retry_count: 0,
          sent_at: '2024-01-01T10:00:00Z',
          opened_at: null,
          clicked_at: null,
          bounced_at: null,
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          recipient_email: 'user2@example.com',
          email_type: 'shipping_notification',
          subject: 'Your order has shipped',
          status: 'opened',
          provider: 'sendgrid',
          error_message: null,
          retry_count: 0,
          sent_at: '2024-01-01T11:00:00Z',
          opened_at: '2024-01-01T12:00:00Z',
          clicked_at: null,
          bounced_at: null,
          created_at: '2024-01-01T11:00:00Z',
        },
      ];

      supabaseFromMock.mockReturnValue({
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: mockLogs,
                error: null
              }))
            }))
          }))
        }))
      });

      render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('user1@example.com')).toBeInTheDocument();
        expect(screen.getByText('user2@example.com')).toBeInTheDocument();
        expect(screen.getByText('Welcome to ORDAX')).toBeInTheDocument();
        expect(screen.getByText('Your order has shipped')).toBeInTheDocument();
      });
    });

    it('should display email type labels in Portuguese', async () => {
      const mockLogs = [
        {
          id: '1',
          recipient_email: 'user@example.com',
          email_type: 'welcome',
          subject: 'Test',
          status: 'sent',
          provider: 'sendgrid',
          error_message: null,
          retry_count: 0,
          sent_at: '2024-01-01T10:00:00Z',
          opened_at: null,
          clicked_at: null,
          bounced_at: null,
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      supabaseFromMock.mockReturnValue({
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: mockLogs,
                error: null
              }))
            }))
          }))
        }))
      });

      render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Boas-vindas')).toBeInTheDocument();
      });
    });

    it('should display status badges', async () => {
      const mockLogs = [
        {
          id: '1',
          recipient_email: 'user@example.com',
          email_type: 'welcome',
          subject: 'Test',
          status: 'sent',
          provider: 'sendgrid',
          error_message: null,
          retry_count: 0,
          sent_at: '2024-01-01T10:00:00Z',
          opened_at: null,
          clicked_at: null,
          bounced_at: null,
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      supabaseFromMock.mockReturnValue({
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: mockLogs,
                error: null
              }))
            }))
          }))
        }))
      });

      render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Enviado')).toBeInTheDocument();
      });
    });

    it('should display retry count', async () => {
      const mockLogs = [
        {
          id: '1',
          recipient_email: 'user@example.com',
          email_type: 'welcome',
          subject: 'Test',
          status: 'sent',
          provider: 'sendgrid',
          error_message: null,
          retry_count: 2,
          sent_at: '2024-01-01T10:00:00Z',
          opened_at: null,
          clicked_at: null,
          bounced_at: null,
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      supabaseFromMock.mockReturnValue({
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: mockLogs,
                error: null
              }))
            }))
          }))
        }))
      });

      render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should show empty state when no logs', async () => {
      supabaseFromMock.mockReturnValue({
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      });

      render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Nenhum email encontrado')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter by email type', async () => {
      const selectMock = vi.fn(() => ({
        gte: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        })),
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      }));

      supabaseFromMock.mockReturnValue({
        select: selectMock
      });

      render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Histórico de Emails')).toBeInTheDocument();
      });

      // Component should call select
      expect(selectMock).toHaveBeenCalled();
    });
  });

  describe('Time Range Selection', () => {
    it('should filter by time range', async () => {
      const gteMock = vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      }));

      supabaseFromMock.mockReturnValue({
        select: vi.fn(() => ({
          gte: gteMock
        }))
      });

      render(<EmailAnalyticsDashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(gteMock).toHaveBeenCalled();
      });

      // Should filter by date
      const call = gteMock.mock.calls[0];
      expect(call[0]).toBe('created_at');
      expect(call[1]).toMatch(/^\d{4}-\d{2}-\d{2}/); // ISO date format
    });
  });
});
