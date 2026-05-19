/**
 * Testes unitários para useCollectionPrice
 *
 * Testa o hook de cálculo de preço contextual de coleções
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCollectionPrice, useCollectionPrices, useHasCollectionDiscount } from '../useCollectionPrice';
import { supabase } from '@/integrations/supabase/client';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

type SupabaseRpcResult = Awaited<ReturnType<typeof supabase.rpc>>;

type CollectionDiscountQuery = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

function rpcResult(data: unknown, error: { message: string } | null = null): SupabaseRpcResult {
  return { data, error } as SupabaseRpcResult;
}

function mockCollectionDiscountQuery(
  response: { data: Array<{ id: string }> | null; error: { message: string } | null }
) {
  const query: CollectionDiscountQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(response),
  };

  vi.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);
  return query;
}

// Helper para criar wrapper com QueryClient
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

describe('useCollectionPrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch collection price successfully', async () => {
    const mockPrice = {
      collection_id: 'col-123',
      price_in_coins: 100,
      has_discount: false,
    };

    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: mockPrice,
      error: null,
    } as SupabaseRpcResult);

    const { result } = renderHook(
      () => useCollectionPrice({ collectionId: 'col-123', userId: 'user-123' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPrice);
    expect(supabase.rpc).toHaveBeenCalledWith('get_collection_price', {
      p_collection_id: 'col-123',
      p_user_id: 'user-123',
    });
  });

  it('should handle error when fetching price', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce(rpcResult(null, { message: 'Database error' }));

    const { result } = renderHook(
      () => useCollectionPrice({ collectionId: 'col-123', userId: 'user-123' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should not fetch when collectionId is empty', () => {
    const { result } = renderHook(
      () => useCollectionPrice({ collectionId: '', userId: 'user-123' }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('should handle anonymous user (no userId)', async () => {
    const mockPrice = {
      collection_id: 'col-123',
      price_in_coins: 150,
      has_discount: false,
    };

    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: mockPrice,
      error: null,
    } as SupabaseRpcResult);

    const { result } = renderHook(
      () => useCollectionPrice({ collectionId: 'col-123', userId: null }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.rpc).toHaveBeenCalledWith('get_collection_price', {
      p_collection_id: 'col-123',
      p_user_id: null,
    });
  });
});

describe('useCollectionPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch multiple collection prices', async () => {
    const mockPrices = [
      { collection_id: 'col-1', price_in_coins: 100, has_discount: false },
      { collection_id: 'col-2', price_in_coins: 200, has_discount: true },
    ];

    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce(rpcResult(mockPrices[0]))
      .mockResolvedValueOnce(rpcResult(mockPrices[1]));

    const { result } = renderHook(
      () => useCollectionPrices(['col-1', 'col-2'], 'user-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      'col-1': mockPrices[0],
      'col-2': mockPrices[1],
    });
  });

  it('should handle partial errors in batch fetch', async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce(rpcResult({ collection_id: 'col-1', price_in_coins: 100, has_discount: false }))
      .mockResolvedValueOnce(rpcResult(null, { message: 'Error' }));

    const { result } = renderHook(
      () => useCollectionPrices(['col-1', 'col-2'], 'user-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.['col-1']).toBeDefined();
    expect(result.current.data?.['col-2']).toBeNull();
  });

  it('should not fetch when collectionIds is empty', () => {
    const { result } = renderHook(
      () => useCollectionPrices([], 'user-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe('useHasCollectionDiscount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when user has discount', async () => {
    mockCollectionDiscountQuery({
      data: [{ id: 'sub-col-1' }],
      error: null,
    });

    const { result } = renderHook(
      () => useHasCollectionDiscount('col-123', 'user-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(true);
  });

  it('should return false when user has no discount', async () => {
    mockCollectionDiscountQuery({
      data: [],
      error: null,
    });

    const { result } = renderHook(
      () => useHasCollectionDiscount('col-123', 'user-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(false);
  });

  it('should return false for anonymous user', async () => {
    const { result } = renderHook(
      () => useHasCollectionDiscount('col-123', null),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should handle database error gracefully', async () => {
    mockCollectionDiscountQuery({
      data: null,
      error: { message: 'Database error' },
    });

    const { result } = renderHook(
      () => useHasCollectionDiscount('col-123', 'user-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(false);
  });
});
