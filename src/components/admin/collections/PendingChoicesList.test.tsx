/**
 * PendingChoicesList Component Tests
 *
 * Tests for the PendingChoicesList component that displays subscribers
 * with pending collection choices.
 *
 * Requirements: 13.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { PendingChoicesList } from './PendingChoicesList';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock cutoff middleware
vi.mock('@/lib/cutoff-middleware', () => ({
  getCurrentCutoffDate: vi.fn(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999);
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('PendingChoicesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', () => {
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => new Promise(() => {})), // Never resolves
            })),
          })),
        })),
      })),
    }));

    (supabase.from as any).mockImplementation(mockFrom);

    render(<PendingChoicesList cycleIds={['cycle-1']} />, { wrapper: createWrapper() });

    expect(screen.getByText('Carregando escolhas pendentes...')).toBeInTheDocument();
  });

  it('should display message when no pending choices', async () => {
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      })),
    }));

    (supabase.from as any).mockImplementation(mockFrom);

    render(<PendingChoicesList cycleIds={['cycle-1']} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Todos os assinantes escolheram suas coleções')).toBeInTheDocument();
    });

    expect(screen.getByText('✓ Nenhuma escolha pendente para este ciclo')).toBeInTheDocument();
  });

  it('should display pending choices with subscriber information', async () => {
    const mockData = [
      {
        id: 'delivery-1',
        delivery_number: 1,
        subscription_id: 'sub-1',
        subscriptions: {
          id: 'sub-1',
          users: {
            id: 'user-1',
            email: 'john@example.com',
            raw_user_meta_data: {
              full_name: 'John Doe',
            },
          },
        },
      },
      {
        id: 'delivery-2',
        delivery_number: 2,
        subscription_id: 'sub-2',
        subscriptions: {
          id: 'sub-2',
          users: {
            id: 'user-2',
            email: 'jane@example.com',
            raw_user_meta_data: {
              full_name: 'Jane Smith',
            },
          },
        },
      },
    ];

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
            })),
          })),
        })),
      })),
    }));

    (supabase.from as any).mockImplementation(mockFrom);

    render(<PendingChoicesList cycleIds={['cycle-1']} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('2 assinante(s) ainda não escolheram a coleção')).toBeInTheDocument();
  });

  it('should display delivery numbers correctly', async () => {
    const mockData = [
      {
        id: 'delivery-1',
        delivery_number: 3,
        subscription_id: 'sub-1',
        subscriptions: {
          id: 'sub-1',
          users: {
            id: 'user-1',
            email: 'john@example.com',
            raw_user_meta_data: {
              full_name: 'John Doe',
            },
          },
        },
      },
    ];

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
            })),
          })),
        })),
      })),
    }));

    (supabase.from as any).mockImplementation(mockFrom);

    render(<PendingChoicesList cycleIds={['cycle-1']} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('#3')).toBeInTheDocument();
    });
  });

  it('should display days until cutoff', async () => {
    const mockData = [
      {
        id: 'delivery-1',
        delivery_number: 1,
        subscription_id: 'sub-1',
        subscriptions: {
          id: 'sub-1',
          users: {
            id: 'user-1',
            email: 'john@example.com',
            raw_user_meta_data: {
              full_name: 'John Doe',
            },
          },
        },
      },
    ];

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
            })),
          })),
        })),
      })),
    }));

    (supabase.from as any).mockImplementation(mockFrom);

    render(<PendingChoicesList cycleIds={['cycle-1']} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/dia\(s\)/)).toBeInTheDocument();
    });
  });

  it('should provide link to subscriber profile', async () => {
    const mockData = [
      {
        id: 'delivery-1',
        delivery_number: 1,
        subscription_id: 'sub-1',
        subscriptions: {
          id: 'sub-1',
          users: {
            id: 'user-123',
            email: 'john@example.com',
            raw_user_meta_data: {
              full_name: 'John Doe',
            },
          },
        },
      },
    ];

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
            })),
          })),
        })),
      })),
    }));

    (supabase.from as any).mockImplementation(mockFrom);

    render(<PendingChoicesList cycleIds={['cycle-1']} />, { wrapper: createWrapper() });

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Ver Perfil/i });
      expect(link).toHaveAttribute('href', '/admin/subscribers/user-123');
    });
  });

  it('should handle missing user data gracefully', async () => {
    const mockData = [
      {
        id: 'delivery-1',
        delivery_number: 1,
        subscription_id: 'sub-1',
        subscriptions: {
          id: 'sub-1',
          users: {
            id: 'user-1',
            email: 'unknown@example.com',
            raw_user_meta_data: {},
          },
        },
      },
    ];

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
            })),
          })),
        })),
      })),
    }));

    (supabase.from as any).mockImplementation(mockFrom);

    render(<PendingChoicesList cycleIds={['cycle-1']} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Sem nome')).toBeInTheDocument();
    });

    expect(screen.getByText('unknown@example.com')).toBeInTheDocument();
  });

  it('should not fetch data when no cycleIds provided', () => {
    const mockFrom = vi.fn();
    (supabase.from as any).mockImplementation(mockFrom);

    render(<PendingChoicesList cycleIds={[]} />, { wrapper: createWrapper() });

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should display total count in footer', async () => {
    const mockData = [
      {
        id: 'delivery-1',
        delivery_number: 1,
        subscription_id: 'sub-1',
        subscriptions: {
          id: 'sub-1',
          users: {
            id: 'user-1',
            email: 'john@example.com',
            raw_user_meta_data: { full_name: 'John Doe' },
          },
        },
      },
      {
        id: 'delivery-2',
        delivery_number: 2,
        subscription_id: 'sub-2',
        subscriptions: {
          id: 'sub-2',
          users: {
            id: 'user-2',
            email: 'jane@example.com',
            raw_user_meta_data: { full_name: 'Jane Smith' },
          },
        },
      },
    ];

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
            })),
          })),
        })),
      })),
    }));

    (supabase.from as any).mockImplementation(mockFrom);

    render(<PendingChoicesList cycleIds={['cycle-1']} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Total: 2 escolha(s) pendente(s)')).toBeInTheDocument();
    });
  });
});
