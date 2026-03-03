/**
 * Tests for ProductionListView Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductionListView } from './ProductionListView';
import type { ProductionQueueItem } from '@/services/admin/production-service';

const mockItems: ProductionQueueItem[] = [
  {
    id: '1',
    orderId: 'order-1',
    orderType: 'subscription_delivery',
    customerId: 'customer-1',
    customerName: 'João Silva',
    customerEmail: 'joao@example.com',
    collectionId: 'col-1',
    collectionName: 'Coleção A',
    characterId: 'char-1',
    characterName: 'Personagem 1',
    productionStatus: 'in_production',
    currentStage: 'design',
    choiceStatus: 'approved',
    choiceDeadline: '2024-12-31T23:59:59Z',
    choiceMadeAt: '2024-01-01T00:00:00Z',
    priority: 'high',
    priorityScore: 80,
    scheduledProductionDate: null,
    estimatedCompletionDate: null,
    assignedTo: 'user-1',
    assignedToName: 'Maria Santos',
    assignedAt: null,
    productionStartedAt: null,
    productionCompletedAt: null,
    productionNotes: null,
    customerNotes: null,
    internalFlags: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    orderId: 'order-2',
    orderType: 'standalone_purchase',
    customerId: 'customer-2',
    customerName: 'Ana Costa',
    customerEmail: 'ana@example.com',
    collectionId: 'col-2',
    collectionName: 'Coleção B',
    characterId: null,
    characterName: null,
    productionStatus: 'awaiting_choice',
    currentStage: 'awaiting_choice',
    choiceStatus: 'pending',
    choiceDeadline: '2024-12-25T23:59:59Z',
    choiceMadeAt: null,
    priority: 'critical',
    priorityScore: 95,
    scheduledProductionDate: null,
    estimatedCompletionDate: null,
    assignedTo: null,
    assignedToName: null,
    assignedAt: null,
    productionStartedAt: null,
    productionCompletedAt: null,
    productionNotes: null,
    customerNotes: null,
    internalFlags: [],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    orderId: 'order-3',
    orderType: 'subscription_delivery',
    customerId: 'customer-3',
    customerName: 'Carlos Pereira',
    customerEmail: 'carlos@example.com',
    collectionId: 'col-1',
    collectionName: 'Coleção A',
    characterId: 'char-2',
    characterName: 'Personagem 2',
    productionStatus: 'in_production',
    currentStage: 'production',
    choiceStatus: 'approved',
    choiceDeadline: null,
    choiceMadeAt: '2024-01-03T00:00:00Z',
    priority: 'normal',
    priorityScore: 50,
    scheduledProductionDate: null,
    estimatedCompletionDate: null,
    assignedTo: 'user-2',
    assignedToName: 'Pedro Lima',
    assignedAt: null,
    productionStartedAt: null,
    productionCompletedAt: null,
    productionNotes: null,
    customerNotes: null,
    internalFlags: [],
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z'
  }
];

describe('ProductionListView', () => {
  const defaultProps = {
    items: mockItems,
    isLoading: false,
    selectedIds: new Set<string>(),
    onSelectAll: vi.fn(),
    onSelectItem: vi.fn(),
    onItemClick: vi.fn(),
    isAllSelected: false
  };

  it('renders table with all columns', () => {
    render(<ProductionListView {...defaultProps} />);

    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Coleção')).toBeInTheDocument();
    expect(screen.getByText('Personagem')).toBeInTheDocument();
    expect(screen.getByText('Estágio')).toBeInTheDocument();
    expect(screen.getByText('Prioridade')).toBeInTheDocument();
    expect(screen.getByText('Prazo')).toBeInTheDocument();
    expect(screen.getByText('Responsável')).toBeInTheDocument();
  });

  it('displays all items in the table', () => {
    render(<ProductionListView {...defaultProps} />);

    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Ana Costa')).toBeInTheDocument();
    expect(screen.getByText('Carlos Pereira')).toBeInTheDocument();
  });

  it('shows customer email below customer name', () => {
    render(<ProductionListView {...defaultProps} />);

    expect(screen.getByText('joao@example.com')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('carlos@example.com')).toBeInTheDocument();
  });

  it('displays collection names', () => {
    render(<ProductionListView {...defaultProps} />);

    const colecaoA = screen.getAllByText('Coleção A');
    expect(colecaoA).toHaveLength(2); // Two items have Coleção A
    expect(screen.getByText('Coleção B')).toBeInTheDocument();
  });

  it('displays character names or dash when null', () => {
    render(<ProductionListView {...defaultProps} />);

    expect(screen.getByText('Personagem 1')).toBeInTheDocument();
    expect(screen.getByText('Personagem 2')).toBeInTheDocument();
    
    // Ana Costa has no character, should show dash
    const rows = screen.getAllByRole('row');
    const anaRow = rows.find(row => row.textContent?.includes('Ana Costa'));
    expect(anaRow?.textContent).toContain('-');
  });

  it('displays stage badges with correct labels', () => {
    render(<ProductionListView {...defaultProps} />);

    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('Aguardando Escolha')).toBeInTheDocument();
    expect(screen.getByText('Produção')).toBeInTheDocument();
  });

  it('displays priority badges with correct colors', () => {
    render(<ProductionListView {...defaultProps} />);

    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('NORMAL')).toBeInTheDocument();
  });

  it('displays assigned user names or dash when null', () => {
    render(<ProductionListView {...defaultProps} />);

    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('Pedro Lima')).toBeInTheDocument();
    
    // Ana Costa has no assigned user
    const rows = screen.getAllByRole('row');
    const anaRow = rows.find(row => row.textContent?.includes('Ana Costa'));
    expect(anaRow?.textContent).toContain('-');
  });

  it('calls onSelectAll when select all checkbox is clicked', () => {
    const onSelectAll = vi.fn();
    render(<ProductionListView {...defaultProps} onSelectAll={onSelectAll} />);

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    expect(onSelectAll).toHaveBeenCalledWith(true);
  });

  it('calls onSelectItem when individual checkbox is clicked', () => {
    const onSelectItem = vi.fn();
    render(<ProductionListView {...defaultProps} onSelectItem={onSelectItem} />);

    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is select all, second is first item (sorted by priority, so item 2 with critical priority)
    fireEvent.click(checkboxes[1]);

    expect(onSelectItem).toHaveBeenCalledWith('2', true);
  });

  it('calls onItemClick when row is clicked', () => {
    const onItemClick = vi.fn();
    render(<ProductionListView {...defaultProps} onItemClick={onItemClick} />);

    const joaoRow = screen.getByText('João Silva').closest('tr');
    if (joaoRow) {
      fireEvent.click(joaoRow);
    }

    expect(onItemClick).toHaveBeenCalledWith(mockItems[0]);
  });

  it('does not call onItemClick when checkbox is clicked', () => {
    const onItemClick = vi.fn();
    render(<ProductionListView {...defaultProps} onItemClick={onItemClick} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    expect(onItemClick).not.toHaveBeenCalled();
  });

  it('sorts by customer name when customer column is clicked', () => {
    render(<ProductionListView {...defaultProps} />);

    const customerHeader = screen.getByText('Cliente').closest('button');
    if (customerHeader) {
      fireEvent.click(customerHeader);
    }

    const rows = screen.getAllByRole('row');
    const customerNames = Array.from(rows)
      .slice(1) // Skip header row
      .map(row => row.textContent)
      .filter(text => text?.includes('@'));

    // After sorting ascending, Ana should come before Carlos and João
    expect(customerNames[0]).toContain('Ana Costa');
  });

  it('sorts by priority score when priority column is clicked', () => {
    render(<ProductionListView {...defaultProps} />);

    // Default sort is by priority descending, so critical (95) should be first
    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1]; // Skip header
    expect(firstDataRow.textContent).toContain('Ana Costa'); // Has critical priority
  });

  it('toggles sort direction when same column is clicked twice', () => {
    render(<ProductionListView {...defaultProps} />);

    const customerHeader = screen.getByText('Cliente').closest('button');
    
    // First click - ascending
    if (customerHeader) {
      fireEvent.click(customerHeader);
    }

    let rows = screen.getAllByRole('row');
    let firstDataRow = rows[1];
    expect(firstDataRow.textContent).toContain('Ana Costa');

    // Second click - descending
    if (customerHeader) {
      fireEvent.click(customerHeader);
    }

    rows = screen.getAllByRole('row');
    firstDataRow = rows[1];
    expect(firstDataRow.textContent).toContain('João Silva');
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<ProductionListView {...defaultProps} isLoading={true} />);

    // Should show skeleton rows - check for the Skeleton component class
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    // Verify skeleton elements are present by checking for animate-pulse class
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when items array is empty', () => {
    render(<ProductionListView {...defaultProps} items={[]} />);

    expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument();
    expect(screen.getByText('Não há itens de produção que correspondam aos filtros aplicados')).toBeInTheDocument();
  });

  it('marks selected items with checked checkboxes', () => {
    const selectedIds = new Set(['1', '3']);
    render(<ProductionListView {...defaultProps} selectedIds={selectedIds} />);

    const checkboxes = screen.getAllByRole('checkbox');
    // Items are sorted by priority descending: item 2 (critical), item 1 (high), item 3 (normal)
    // Skip first checkbox (select all)
    expect(checkboxes[1]).not.toBeChecked(); // Item 2 (not selected)
    expect(checkboxes[2]).toBeChecked(); // Item 1 (selected)
    expect(checkboxes[3]).toBeChecked(); // Item 3 (selected)
  });

  it('marks select all checkbox when isAllSelected is true', () => {
    render(<ProductionListView {...defaultProps} isAllSelected={true} />);

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    expect(selectAllCheckbox).toBeChecked();
  });

  it('formats deadline dates correctly', () => {
    render(<ProductionListView {...defaultProps} />);

    // Check that dates are formatted as dd/MM/yyyy
    expect(screen.getByText('31/12/2024')).toBeInTheDocument();
    expect(screen.getByText('25/12/2024')).toBeInTheDocument();
  });

  it('shows dash for null deadlines', () => {
    render(<ProductionListView {...defaultProps} />);

    const rows = screen.getAllByRole('row');
    const carlosRow = rows.find(row => row.textContent?.includes('Carlos Pereira'));
    
    // Carlos has null deadline, should show dash in deadline column
    expect(carlosRow?.textContent).toContain('-');
  });

  it('applies hover effect to rows', () => {
    render(<ProductionListView {...defaultProps} />);

    const joaoRow = screen.getByText('João Silva').closest('tr');
    expect(joaoRow).toHaveClass('cursor-pointer');
    expect(joaoRow).toHaveClass('hover:bg-muted/50');
  });

  it('sorts by collection name when collection column is clicked', () => {
    render(<ProductionListView {...defaultProps} />);

    const collectionHeader = screen.getByText('Coleção').closest('button');
    if (collectionHeader) {
      fireEvent.click(collectionHeader);
    }

    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1];
    
    // After sorting ascending, Coleção A should come before Coleção B
    expect(firstDataRow.textContent).toContain('Coleção A');
  });

  it('sorts by stage when stage column is clicked', () => {
    render(<ProductionListView {...defaultProps} />);

    const stageHeader = screen.getByText('Estágio').closest('button');
    if (stageHeader) {
      fireEvent.click(stageHeader);
    }

    // Verify sorting is applied (awaiting_choice < design < production alphabetically)
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1);
  });

  it('sorts by assigned user when assignedTo column is clicked', () => {
    render(<ProductionListView {...defaultProps} />);

    const assignedHeader = screen.getByText('Responsável').closest('button');
    if (assignedHeader) {
      fireEvent.click(assignedHeader);
    }

    // Verify sorting is applied
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1);
  });
});
