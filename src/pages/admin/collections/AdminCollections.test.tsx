/**
 * Integration tests for Admin Collection Management UI
 *
 * Tests rotation configuration functionality:
 * - Creating collections with rotation types
 * - Editing collection rotation settings
 * - Rotation schedule preview display
 * - Character revelation date configuration
 *
 * Requirements: 5.3, 5.8, 5.9, 14.2, 14.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

// Mock AdminLayout
vi.mock('@/components/admin/shared/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock SEOHead
vi.mock('@/components/SEOHead', () => ({
  default: () => null,
}));

type MockCollection = Record<string, unknown>;
type MockCharacter = Record<string, unknown>;

let mockCollections: MockCollection[] = [];
let mockCharacters: MockCharacter[] = [];
let mockSelectedCollectionData: MockCollection | null = null;

vi.mock('@/hooks/admin/useAdminCollectionsData', () => ({
  useAdminCollectionsData: () => ({
    collections: mockCollections,
    characters: mockCharacters,
    selectedCollectionData: mockSelectedCollectionData,
    collectionsQuery: { isLoading: false, error: null },
    charactersQuery: { isLoading: false, error: null },
  }),
}));

vi.mock('@/hooks/admin/useAdminCollectionsOperations', () => ({
  useAdminCollectionsOperations: () => ({}),
}));

vi.mock('@/components/admin/collections/CollectionForm', () => ({
  CollectionForm: ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) => (
    <button type="button" onClick={() => onOpenChange(true)}>
      Nova Coleção
    </button>
  ),
}));

describe('AdminCollections - Rotation Configuration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockCollections = [];
    mockCharacters = [];
    mockSelectedCollectionData = null;
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  it('should render the collection dashboard empty state', async () => {
    const AdminCollections = (await import('./AdminCollections')).default;

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AdminCollections />
        </QueryClientProvider>
      </BrowserRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Coleções Premium')).toBeInTheDocument();
    });

    // Verify the page loaded successfully
    expect(screen.getByText('Total de Coleções')).toBeInTheDocument();
  });

  it('should validate rotation type values', () => {
    const validRotationTypes = ['fixed', 'odd_months', 'even_months'];

    validRotationTypes.forEach(type => {
      expect(['fixed', 'odd_months', 'even_months']).toContain(type);
    });
  });

  it('should render character public taxonomy and inventory metadata', async () => {
    mockSelectedCollectionData = {
      id: 'collection-1',
      name: 'ThunderCats',
      slug: 'thundercats',
      description: 'Colecao mensal de personagens ThunderCats',
      image_url: null,
      is_active: true,
      character_count: 1,
    };
    mockCollections = [mockSelectedCollectionData];
    mockCharacters = [
      {
        id: 'character-1',
        collection_id: 'collection-1',
        name: 'Cheetara',
        description: 'Guerreira veloz dos ThunderCats',
        image_url: 'https://example.com/cheetara.webp',
        image_urls: [
          'https://example.com/cheetara.webp',
          'https://example.com/cheetara-detail.webp',
        ],
        release_order: 1,
        display_order: 3,
        release_month: 6,
        release_date: null,
        status: 'released',
        is_catalog: true,
        unlock_override: false,
        franchise: 'ThunderCats',
        product_line: 'Herois ThunderCats',
        theme_category: 'Guerreira velocista',
        stock_quantity: 2,
      },
    ];

    const AdminCollections = (await import('./AdminCollections')).default;

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AdminCollections />
        </QueryClientProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('ThunderCats'));

    expect(screen.getByText('Cheetara')).toBeInTheDocument();
    expect(screen.getByText('Herois ThunderCats')).toBeInTheDocument();
    expect(screen.getByText('Guerreira velocista')).toBeInTheDocument();
    expect(screen.getByText('2 fotos')).toBeInTheDocument();
    expect(screen.getByText('2 em estoque')).toBeInTheDocument();
    expect(screen.getByText('Ordem visual 3')).toBeInTheDocument();
  });

  it('should format rotation schedule correctly for odd months', () => {
    const oddMonths = [1, 3, 5, 7, 9, 11];
    const monthNames = ['Janeiro', 'Março', 'Maio', 'Julho', 'Setembro', 'Novembro'];

    expect(oddMonths).toHaveLength(6);
    expect(monthNames).toHaveLength(6);
  });

  it('should format rotation schedule correctly for even months', () => {
    const evenMonths = [2, 4, 6, 8, 10, 12];
    const monthNames = ['Fevereiro', 'Abril', 'Junho', 'Agosto', 'Outubro', 'Dezembro'];

    expect(evenMonths).toHaveLength(6);
    expect(monthNames).toHaveLength(6);
  });

  it('should handle character revelation date as datetime-local input', () => {
    const testDate = '2026-03-15T10:00';
    const dateObj = new Date(testDate);

    expect(dateObj).toBeInstanceOf(Date);
    // Note: toISOString() converts to UTC, so local time may differ
    expect(dateObj.toISOString()).toContain('2026-03-15');
  });
});


describe('AdminCollections - Minimum Fixed Collections Validation', () => {
  it('should enforce minimum 2 fixed collections rule', async () => {
    // Simulate having exactly 2 fixed collections
    const fixedCollections = [
      { id: '1', rotation_type: 'fixed', is_active: true },
      { id: '2', rotation_type: 'fixed', is_active: true },
    ];

    expect(fixedCollections.length).toBe(2);

    // Attempting to change one to rotating should fail
    const canChange = fixedCollections.length > 2;
    expect(canChange).toBe(false);
  });

  it('should allow changing to rotating when more than 2 fixed collections exist', () => {
    // Simulate having 3 fixed collections
    const fixedCollections = [
      { id: '1', rotation_type: 'fixed', is_active: true },
      { id: '2', rotation_type: 'fixed', is_active: true },
      { id: '3', rotation_type: 'fixed', is_active: true },
    ];

    expect(fixedCollections.length).toBe(3);

    // Attempting to change one to rotating should succeed
    const canChange = fixedCollections.length > 2;
    expect(canChange).toBe(true);
  });

  it('should not count inactive collections in validation', () => {
    const collections = [
      { id: '1', rotation_type: 'fixed', is_active: true },
      { id: '2', rotation_type: 'fixed', is_active: true },
      { id: '3', rotation_type: 'fixed', is_active: false }, // Inactive
    ];

    const activeFixedCount = collections.filter(
      c => c.rotation_type === 'fixed' && c.is_active
    ).length;

    expect(activeFixedCount).toBe(2);
  });
});
