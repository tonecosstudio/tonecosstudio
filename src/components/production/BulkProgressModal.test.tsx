/**
 * Tests for BulkProgressModal Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BulkProgressModal } from './BulkProgressModal';

describe('BulkProgressModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Processando Itens',
    total: 10,
    processed: 5,
    successful: 4,
    failed: 1,
    isComplete: false,
    errors: [],
  };

  it('displays the title', () => {
    render(<BulkProgressModal {...defaultProps} />);
    expect(screen.getByText('Processando Itens')).toBeInTheDocument();
  });

  it('displays processing message when not complete', () => {
    render(<BulkProgressModal {...defaultProps} />);
    expect(screen.getByText('Processando 5 de 10 itens...')).toBeInTheDocument();
  });

  it('displays completion message when complete', () => {
    render(<BulkProgressModal {...defaultProps} isComplete={true} />);
    expect(screen.getByText('Operação concluída')).toBeInTheDocument();
  });

  it('displays successful count', () => {
    render(<BulkProgressModal {...defaultProps} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Sucesso')).toBeInTheDocument();
  });

  it('displays failed count', () => {
    render(<BulkProgressModal {...defaultProps} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Falhas')).toBeInTheDocument();
  });

  it('displays progress percentage', () => {
    render(<BulkProgressModal {...defaultProps} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays processing indicator when not complete', () => {
    render(<BulkProgressModal {...defaultProps} />);
    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });

  it('does not display processing indicator when complete', () => {
    render(<BulkProgressModal {...defaultProps} isComplete={true} />);
    expect(screen.queryByText('Processando...')).not.toBeInTheDocument();
  });

  it('displays error messages when complete with errors', () => {
    const errors = ['Erro 1', 'Erro 2'];
    render(<BulkProgressModal {...defaultProps} isComplete={true} errors={errors} />);
    
    expect(screen.getByText('Erros encontrados:')).toBeInTheDocument();
    expect(screen.getByText('Erro 1')).toBeInTheDocument();
    expect(screen.getByText('Erro 2')).toBeInTheDocument();
  });

  it('does not display errors section when no errors', () => {
    render(<BulkProgressModal {...defaultProps} isComplete={true} errors={[]} />);
    expect(screen.queryByText('Erros encontrados:')).not.toBeInTheDocument();
  });

  it('close button is disabled when not complete', () => {
    render(<BulkProgressModal {...defaultProps} isComplete={false} />);
    const closeButton = screen.getByText('Aguarde...');
    expect(closeButton).toBeDisabled();
  });

  it('close button is enabled when complete', () => {
    render(<BulkProgressModal {...defaultProps} isComplete={true} />);
    const closeButton = screen.getByText('Fechar');
    expect(closeButton).not.toBeDisabled();
  });
});
