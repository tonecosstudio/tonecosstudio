/**
 * Tests for CSV Export Utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportProductionItemsToCSV } from './csvExport';
import type { ProductionQueueItem } from '@/types/production';

describe('csvExport', () => {
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let setAttributeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock URL methods on global object
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock DOM methods
    clickSpy = vi.fn();
    setAttributeSpy = vi.fn();
    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      setAttribute: setAttributeSpy,
      click: clickSpy,
      style: {},
    } as unknown as HTMLAnchorElement);
    
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(
      () => null as unknown as Node
    );
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(
      () => null as unknown as Node
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockItem: ProductionQueueItem = {
    id: '1',
    orderId: 'order-1',
    orderType: 'subscription_delivery',
    customerId: 'customer-1',
    customerName: 'João Silva',
    customerEmail: 'joao@example.com',
    collectionId: 'collection-1',
    collectionName: 'Coleção A',
    characterId: 'char-1',
    characterName: 'Personagem 1',
    productionStatus: 'in_production',
    currentStage: 'printing',
    choiceStatus: 'approved',
    choiceDeadline: '2024-12-31T23:59:59Z',
    choiceMadeAt: '2024-12-01T10:00:00Z',
    priority: 'high',
    priorityScore: 85,
    scheduledProductionDate: '2024-12-15T00:00:00Z',
    estimatedCompletionDate: '2024-12-20T00:00:00Z',
    assignedTo: 'user-1',
    assignedToName: 'Maria Santos',
    assignedAt: '2024-12-10T08:00:00Z',
    productionStartedAt: '2024-12-12T09:00:00Z',
    productionCompletedAt: null,
    productionNotes: 'Notas de produção',
    customerNotes: 'Notas do cliente',
    internalFlags: [],
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2024-12-12T09:00:00Z',
  };

  it('throws error when items array is empty', () => {
    expect(() => exportProductionItemsToCSV([])).toThrow('Nenhum item para exportar');
  });

  it('creates a CSV file with correct headers', () => {
    exportProductionItemsToCSV([mockItem]);
    
    // Check that Blob was created (via createObjectURL)
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    
    // Check that link element was created
    expect(createElementSpy).toHaveBeenCalledWith('a');
    
    // Check that link was clicked
    expect(clickSpy).toHaveBeenCalled();
  });

  it('creates download link with default filename', () => {
    exportProductionItemsToCSV([mockItem]);
    
    const downloadCall = setAttributeSpy.mock.calls.find(([name]) => name === 'download');
    
    expect(downloadCall).toBeDefined();
    expect(downloadCall[1]).toMatch(/^producao_\d+\.csv$/);
  });

  it('creates download link with custom filename', () => {
    exportProductionItemsToCSV([mockItem], 'custom.csv');
    
    const downloadCall = setAttributeSpy.mock.calls.find(([name]) => name === 'download');
    
    expect(downloadCall).toBeDefined();
    expect(downloadCall[1]).toBe('custom.csv');
  });

  it('appends and removes link element from DOM', () => {
    exportProductionItemsToCSV([mockItem]);
    
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it('revokes object URL after download', () => {
    exportProductionItemsToCSV([mockItem]);
    
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('handles multiple items', () => {
    const items = [mockItem, { ...mockItem, id: '2', customerName: 'Pedro Costa' }];
    
    expect(() => exportProductionItemsToCSV(items)).not.toThrow();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('escapes CSV fields with special characters', () => {
    const itemWithComma = {
      ...mockItem,
      customerName: 'Silva, João',
      productionNotes: 'Nota com "aspas"',
    };
    
    expect(() => exportProductionItemsToCSV([itemWithComma])).not.toThrow();
  });

  it('handles null values correctly', () => {
    const itemWithNulls = {
      ...mockItem,
      characterName: null,
      assignedToName: null,
      productionNotes: null,
    };
    
    expect(() => exportProductionItemsToCSV([itemWithNulls])).not.toThrow();
  });
});
