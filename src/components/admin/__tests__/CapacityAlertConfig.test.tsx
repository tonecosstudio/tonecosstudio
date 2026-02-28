/**
 * Capacity Alert Configuration Component Tests
 * 
 * Tests for the capacity alert configuration UI component.
 * 
 * Requirements: 16.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CapacityAlertConfig } from '../CapacityAlertConfig';
import * as alertService from '@/services/capacity-alert-service';

// Mock the alert service
vi.mock('@/services/capacity-alert-service');

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('CapacityAlertConfig', () => {
  const mockCycleId = 'test-cycle-id';
  const mockCycleName = 'Ciclo 1 - Março 2026';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(alertService.getAlertConfig).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    vi.mocked(alertService.getAlertStatus).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <CapacityAlertConfig
        cycleId={mockCycleId}
        cycleName={mockCycleName}
        currentPercentage={50}
      />
    );

    // Check for loading spinner by class name
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should load and display alert configuration', async () => {
    vi.mocked(alertService.getAlertConfig).mockResolvedValue({
      threshold: 85,
      email: 'admin@ordax.com',
      sms: '+5571999999999'
    });

    vi.mocked(alertService.getAlertStatus).mockResolvedValue({
      triggered: false,
      triggeredAt: null,
      currentPercentage: 50,
      threshold: 85
    });

    render(
      <CapacityAlertConfig
        cycleId={mockCycleId}
        cycleName={mockCycleName}
        currentPercentage={50}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('85')).toBeInTheDocument();
      expect(screen.getByDisplayValue('admin@ordax.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+5571999999999')).toBeInTheDocument();
    });
  });

  it('should display alert active status when below threshold', async () => {
    vi.mocked(alertService.getAlertConfig).mockResolvedValue({
      threshold: 80,
      email: 'admin@ordax.com',
      sms: null
    });

    vi.mocked(alertService.getAlertStatus).mockResolvedValue({
      triggered: false,
      triggeredAt: null,
      currentPercentage: 60,
      threshold: 80
    });

    render(
      <CapacityAlertConfig
        cycleId={mockCycleId}
        cycleName={mockCycleName}
        currentPercentage={60}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alerta Ativo')).toBeInTheDocument();
      expect(screen.getByText(/Capacidade atual: 60%/)).toBeInTheDocument();
      expect(screen.getByText(/Faltam 20% para disparar o alerta/)).toBeInTheDocument();
    });
  });

  it('should display warning when threshold is reached', async () => {
    vi.mocked(alertService.getAlertConfig).mockResolvedValue({
      threshold: 80,
      email: 'admin@ordax.com',
      sms: null
    });

    vi.mocked(alertService.getAlertStatus).mockResolvedValue({
      triggered: false,
      triggeredAt: null,
      currentPercentage: 85,
      threshold: 80
    });

    render(
      <CapacityAlertConfig
        cycleId={mockCycleId}
        cycleName={mockCycleName}
        currentPercentage={85}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Limite Atingido')).toBeInTheDocument();
      expect(screen.getByText(/A capacidade atual \(85%\) atingiu ou ultrapassou o limite/)).toBeInTheDocument();
    });
  });

  it('should display triggered alert status', async () => {
    const triggeredAt = new Date('2026-03-15T10:00:00Z');
    
    vi.mocked(alertService.getAlertConfig).mockResolvedValue({
      threshold: 80,
      email: 'admin@ordax.com',
      sms: null
    });

    vi.mocked(alertService.getAlertStatus).mockResolvedValue({
      triggered: true,
      triggeredAt,
      currentPercentage: 85,
      threshold: 80
    });

    render(
      <CapacityAlertConfig
        cycleId={mockCycleId}
        cycleName={mockCycleName}
        currentPercentage={85}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alerta Disparado')).toBeInTheDocument();
      expect(screen.getByText(/O alerta foi disparado em/)).toBeInTheDocument();
    });
  });

  it('should save alert configuration', async () => {
    vi.mocked(alertService.getAlertConfig).mockResolvedValue({
      threshold: 80,
      email: '',
      sms: null
    });

    vi.mocked(alertService.getAlertStatus).mockResolvedValue({
      triggered: false,
      triggeredAt: null,
      currentPercentage: 50,
      threshold: 80
    });

    vi.mocked(alertService.configureAlert).mockResolvedValue();

    render(
      <CapacityAlertConfig
        cycleId={mockCycleId}
        cycleName={mockCycleName}
        currentPercentage={50}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('80')).toBeInTheDocument();
    });

    // Change threshold
    const thresholdInput = screen.getByLabelText(/Limite de Alerta/);
    fireEvent.change(thresholdInput, { target: { value: '90' } });

    // Change email
    const emailInput = screen.getByLabelText(/Email para Alertas/);
    fireEvent.change(emailInput, { target: { value: 'new@ordax.com' } });

    // Click save button
    const saveButton = screen.getByText('Salvar Configuração');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(alertService.configureAlert).toHaveBeenCalledWith(mockCycleId, {
        threshold: 90,
        email: 'new@ordax.com',
        sms: null
      });
    });
  });

  it('should validate threshold range', async () => {
    vi.mocked(alertService.getAlertConfig).mockResolvedValue({
      threshold: 80,
      email: '',
      sms: null
    });

    vi.mocked(alertService.getAlertStatus).mockResolvedValue({
      triggered: false,
      triggeredAt: null,
      currentPercentage: 50,
      threshold: 80
    });

    render(
      <CapacityAlertConfig
        cycleId={mockCycleId}
        cycleName={mockCycleName}
        currentPercentage={50}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('80')).toBeInTheDocument();
    });

    // Try to set invalid threshold
    const thresholdInput = screen.getByLabelText(/Limite de Alerta/);
    fireEvent.change(thresholdInput, { target: { value: '150' } });

    // Click save button
    const saveButton = screen.getByText('Salvar Configuração');
    fireEvent.click(saveButton);

    // Should not call configureAlert
    await waitFor(() => {
      expect(alertService.configureAlert).not.toHaveBeenCalled();
    });
  });

  it('should show reset button when alert is triggered', async () => {
    vi.mocked(alertService.getAlertConfig).mockResolvedValue({
      threshold: 80,
      email: 'admin@ordax.com',
      sms: null
    });

    vi.mocked(alertService.getAlertStatus).mockResolvedValue({
      triggered: true,
      triggeredAt: new Date(),
      currentPercentage: 85,
      threshold: 80
    });

    render(
      <CapacityAlertConfig
        cycleId={mockCycleId}
        cycleName={mockCycleName}
        currentPercentage={85}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Resetar Alerta')).toBeInTheDocument();
    });
  });

  it('should reset alert when reset button is clicked', async () => {
    vi.mocked(alertService.getAlertConfig).mockResolvedValue({
      threshold: 80,
      email: 'admin@ordax.com',
      sms: null
    });

    vi.mocked(alertService.getAlertStatus).mockResolvedValue({
      triggered: true,
      triggeredAt: new Date(),
      currentPercentage: 85,
      threshold: 80
    });

    vi.mocked(alertService.resetAlert).mockResolvedValue();

    render(
      <CapacityAlertConfig
        cycleId={mockCycleId}
        cycleName={mockCycleName}
        currentPercentage={85}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Resetar Alerta')).toBeInTheDocument();
    });

    // Click reset button
    const resetButton = screen.getByText('Resetar Alerta');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(alertService.resetAlert).toHaveBeenCalledWith(mockCycleId);
    });
  });

  it('should handle empty email and sms fields', async () => {
    vi.mocked(alertService.getAlertConfig).mockResolvedValue({
      threshold: 80,
      email: 'admin@ordax.com',
      sms: '+5571999999999'
    });

    vi.mocked(alertService.getAlertStatus).mockResolvedValue({
      triggered: false,
      triggeredAt: null,
      currentPercentage: 50,
      threshold: 80
    });

    vi.mocked(alertService.configureAlert).mockResolvedValue();

    render(
      <CapacityAlertConfig
        cycleId={mockCycleId}
        cycleName={mockCycleName}
        currentPercentage={50}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('admin@ordax.com')).toBeInTheDocument();
    });

    // Clear email and sms
    const emailInput = screen.getByLabelText(/Email para Alertas/);
    fireEvent.change(emailInput, { target: { value: '' } });

    const smsInput = screen.getByLabelText(/Telefone para SMS/);
    fireEvent.change(smsInput, { target: { value: '' } });

    // Click save button
    const saveButton = screen.getByText('Salvar Configuração');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(alertService.configureAlert).toHaveBeenCalledWith(mockCycleId, {
        threshold: 80,
        email: null,
        sms: null
      });
    });
  });
});
