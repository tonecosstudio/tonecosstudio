/**
 * Tests for BulkActionsToolbar Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkActionsToolbar } from './BulkActionsToolbar';

describe('BulkActionsToolbar', () => {
  const defaultProps = {
    selectedCount: 3,
    onAssign: vi.fn(),
    onUpdateStage: vi.fn(),
    onExportCSV: vi.fn(),
    onClearSelection: vi.fn(),
  };

  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(
      <BulkActionsToolbar {...defaultProps} selectedCount={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays correct count for single item', () => {
    render(<BulkActionsToolbar {...defaultProps} selectedCount={1} />);
    expect(screen.getByText('1 item selecionado')).toBeInTheDocument();
  });

  it('displays correct count for multiple items', () => {
    render(<BulkActionsToolbar {...defaultProps} selectedCount={5} />);
    expect(screen.getByText('5 itens selecionados')).toBeInTheDocument();
  });

  it('renders all action buttons', () => {
    render(<BulkActionsToolbar {...defaultProps} />);
    
    expect(screen.getByText('Atribuir')).toBeInTheDocument();
    expect(screen.getByText('Atualizar Estágio')).toBeInTheDocument();
    expect(screen.getByText('Exportar CSV')).toBeInTheDocument();
    expect(screen.getByText('Limpar Seleção')).toBeInTheDocument();
  });

  it('calls onAssign when Atribuir button is clicked', () => {
    const onAssign = vi.fn();
    render(<BulkActionsToolbar {...defaultProps} onAssign={onAssign} />);
    
    fireEvent.click(screen.getByText('Atribuir'));
    expect(onAssign).toHaveBeenCalledTimes(1);
  });

  it('calls onUpdateStage when Atualizar Estágio button is clicked', () => {
    const onUpdateStage = vi.fn();
    render(<BulkActionsToolbar {...defaultProps} onUpdateStage={onUpdateStage} />);
    
    fireEvent.click(screen.getByText('Atualizar Estágio'));
    expect(onUpdateStage).toHaveBeenCalledTimes(1);
  });

  it('calls onExportCSV when Exportar CSV button is clicked', () => {
    const onExportCSV = vi.fn();
    render(<BulkActionsToolbar {...defaultProps} onExportCSV={onExportCSV} />);
    
    fireEvent.click(screen.getByText('Exportar CSV'));
    expect(onExportCSV).toHaveBeenCalledTimes(1);
  });

  it('calls onClearSelection when Limpar Seleção button is clicked', () => {
    const onClearSelection = vi.fn();
    render(<BulkActionsToolbar {...defaultProps} onClearSelection={onClearSelection} />);
    
    fireEvent.click(screen.getByText('Limpar Seleção'));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('has primary background color', () => {
    const { container } = render(<BulkActionsToolbar {...defaultProps} />);
    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar.className).toContain('bg-primary');
  });
});
