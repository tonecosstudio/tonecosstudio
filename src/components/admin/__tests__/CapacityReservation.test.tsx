/**
 * Tests for CapacityReservation component
 * 
 * Requirements: 16.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CapacityReservation } from '../CapacityReservation';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('CapacityReservation', () => {
  const mockProps = {
    cycleId: 'cycle-123',
    cycleName: 'Ciclo 1 - Janeiro 2026',
    currentReserved: 10,
    maxCapacity: 100,
    currentUsage: 30,
    onReservationChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render capacity reservation component', () => {
    render(<CapacityReservation {...mockProps} />);
    
    expect(screen.getByText('Reserva de Capacidade')).toBeInTheDocument();
    expect(screen.getByText('10 peças')).toBeInTheDocument(); // Current reserved
    expect(screen.getByText('30 peças')).toBeInTheDocument(); // Current usage
    // Available capacity appears multiple times, use getAllByText
    const availableElements = screen.getAllByText('60 peças');
    expect(availableElements.length).toBeGreaterThan(0);
  });

  it('should calculate available capacity correctly', () => {
    render(<CapacityReservation {...mockProps} />);
    
    // Available = max - current - reserved = 100 - 30 - 10 = 60
    const availableElements = screen.getAllByText('60 peças');
    expect(availableElements.length).toBeGreaterThan(0);
  });

  it('should show capacity breakdown', () => {
    render(<CapacityReservation {...mockProps} />);
    
    expect(screen.getByText('Detalhamento da Capacidade')).toBeInTheDocument();
    expect(screen.getByText('100 peças')).toBeInTheDocument(); // Max capacity
    expect(screen.getByText('- 30 peças')).toBeInTheDocument(); // Usage
    expect(screen.getByText('- 10 peças')).toBeInTheDocument(); // Reserved
  });

  it('should disable reserve button when no capacity available', () => {
    const propsNoCapacity = {
      ...mockProps,
      currentUsage: 80,
      currentReserved: 20,
    };
    
    render(<CapacityReservation {...propsNoCapacity} />);
    
    const reserveButton = screen.getByRole('button', { name: /Reservar Capacidade/i });
    expect(reserveButton).toBeDisabled();
  });

  it('should disable release button when no reserved capacity', () => {
    const propsNoReserved = {
      ...mockProps,
      currentReserved: 0,
    };
    
    render(<CapacityReservation {...propsNoReserved} />);
    
    const releaseButton = screen.getByRole('button', { name: /Liberar Reserva/i });
    expect(releaseButton).toBeDisabled();
  });

  it('should open reserve dialog when reserve button clicked', async () => {
    render(<CapacityReservation {...mockProps} />);
    
    const reserveButton = screen.getByRole('button', { name: /Reservar Capacidade/i });
    fireEvent.click(reserveButton);
    
    await waitFor(() => {
      // Dialog title appears, use getAllByText since button also has this text
      const titles = screen.getAllByText('Reservar Capacidade');
      expect(titles.length).toBeGreaterThan(1); // Button + dialog title
      expect(screen.getByPlaceholderText('Número de peças')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Pedido especial/i)).toBeInTheDocument();
    });
  });

  it('should open release dialog when release button clicked', async () => {
    render(<CapacityReservation {...mockProps} />);
    
    const releaseButton = screen.getByRole('button', { name: /Liberar Reserva/i });
    fireEvent.click(releaseButton);
    
    await waitFor(() => {
      expect(screen.getByText('Liberar Capacidade Reservada')).toBeInTheDocument();
    });
  });

  it('should call reserve_special_capacity RPC when reserving capacity', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.rpc as any) = mockRpc;
    
    render(<CapacityReservation {...mockProps} />);
    
    // Open dialog
    const reserveButton = screen.getByRole('button', { name: /Reservar Capacidade/i });
    fireEvent.click(reserveButton);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Número de peças')).toBeInTheDocument();
    });
    
    // Fill form
    const quantityInput = screen.getByPlaceholderText('Número de peças');
    const reasonInput = screen.getByPlaceholderText(/Pedido especial/i);
    
    fireEvent.change(quantityInput, { target: { value: '5' } });
    fireEvent.change(reasonInput, { target: { value: 'Special order for event' } });
    
    // Submit
    const confirmButton = screen.getByRole('button', { name: /Confirmar Reserva/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('reserve_special_capacity', {
        p_cycle_id: 'cycle-123',
        p_quantity: 5,
        p_reason: 'Special order for event',
      });
    });
  });

  it('should call release_special_capacity RPC when releasing capacity', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.rpc as any) = mockRpc;
    
    render(<CapacityReservation {...mockProps} />);
    
    // Open dialog
    const releaseButton = screen.getByRole('button', { name: /Liberar Reserva/i });
    fireEvent.click(releaseButton);
    
    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText('Número de peças');
      expect(inputs.length).toBeGreaterThan(0);
    });
    
    // Fill form
    const inputs = screen.getAllByPlaceholderText('Número de peças');
    const releaseQuantityInput = inputs[inputs.length - 1]; // Get the last one (release dialog)
    
    fireEvent.change(releaseQuantityInput, { target: { value: '3' } });
    
    // Submit
    const confirmButton = screen.getByRole('button', { name: /Confirmar Liberação/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('release_special_capacity', {
        p_cycle_id: 'cycle-123',
        p_quantity: 3,
      });
    });
  });

  it('should call onReservationChange after successful reservation', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.rpc as any) = mockRpc;
    
    const onReservationChange = vi.fn();
    
    render(<CapacityReservation {...mockProps} onReservationChange={onReservationChange} />);
    
    // Open dialog
    const reserveButton = screen.getByRole('button', { name: /Reservar Capacidade/i });
    fireEvent.click(reserveButton);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Número de peças')).toBeInTheDocument();
    });
    
    // Fill form
    const quantityInput = screen.getByPlaceholderText('Número de peças');
    const reasonInput = screen.getByPlaceholderText(/Pedido especial/i);
    
    fireEvent.change(quantityInput, { target: { value: '5' } });
    fireEvent.change(reasonInput, { target: { value: 'Test reason' } });
    
    // Submit
    const confirmButton = screen.getByRole('button', { name: /Confirmar Reserva/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(onReservationChange).toHaveBeenCalled();
    });
  });

  it('should show info alert explaining how reservations work', () => {
    render(<CapacityReservation {...mockProps} />);
    
    expect(screen.getByText('Como funciona a reserva')).toBeInTheDocument();
    expect(screen.getByText(/Disponível = Máximo - Uso Regular - Reservado/i)).toBeInTheDocument();
  });

  it('should validate quantity is positive when reserving', async () => {
    render(<CapacityReservation {...mockProps} />);
    
    // Open dialog
    const reserveButton = screen.getByRole('button', { name: /Reservar Capacidade/i });
    fireEvent.click(reserveButton);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Número de peças')).toBeInTheDocument();
    });
    
    // Try to submit with invalid quantity
    const quantityInput = screen.getByPlaceholderText('Número de peças');
    const reasonInput = screen.getByPlaceholderText(/Pedido especial/i);
    
    fireEvent.change(quantityInput, { target: { value: '0' } });
    fireEvent.change(reasonInput, { target: { value: 'Test' } });
    
    const confirmButton = screen.getByRole('button', { name: /Confirmar Reserva/i });
    fireEvent.click(confirmButton);
    
    // Should not call RPC
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('should validate reason is provided when reserving', async () => {
    render(<CapacityReservation {...mockProps} />);
    
    // Open dialog
    const reserveButton = screen.getByRole('button', { name: /Reservar Capacidade/i });
    fireEvent.click(reserveButton);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Número de peças')).toBeInTheDocument();
    });
    
    // Try to submit without reason
    const quantityInput = screen.getByPlaceholderText('Número de peças');
    fireEvent.change(quantityInput, { target: { value: '5' } });
    
    const confirmButton = screen.getByRole('button', { name: /Confirmar Reserva/i });
    fireEvent.click(confirmButton);
    
    // Should not call RPC
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
