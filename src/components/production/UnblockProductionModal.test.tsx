/**
 * Tests for UnblockProductionModal Component
 *
 * Tests cover:
 * - Rendering with block information
 * - Display of original block reason
 * - Resolution notes input
 * - Unblock & Resume button functionality
 * - New estimated completion date display
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UnblockProductionModal } from "./UnblockProductionModal";
import * as productionService from "@/services/admin/production-service";
import * as stageService from "@/services/admin/stage-service";
import { supabase } from "@/integrations/supabase/client";

// Mock services
vi.mock("@/services/admin/production-service");
vi.mock("@/services/admin/stage-service");
vi.mock("@/integrations/supabase/client");

// Mock toast
vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

describe("UnblockProductionModal", () => {
  let queryClient: QueryClient;
  const mockOnOpenChange = vi.fn();
  const mockOnUnblock = vi.fn();

  const mockBlockInfo = {
    blockReason: "Aguardando material em falta",
    blockedAt: "2024-01-15T10:00:00Z",
    currentStage: "production",
  };

  const mockProductionQueueItem = {
    id: "queue-1",
    current_stage: "production",
    production_notes: "Aguardando material em falta",
  };

  const mockStageData = {
    block_reason: "Aguardando material em falta",
    blocked_at: "2024-01-15T10:00:00Z",
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // Mock Supabase queries
    const mockSupabaseChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
    };

    (supabase.from as any) = vi.fn(() => mockSupabaseChain);

    // Default mock responses
    mockSupabaseChain.single.mockResolvedValue({
      data: mockProductionQueueItem,
      error: null,
    });

    // Mock calculateEstimatedCompletion
    vi.mocked(stageService.calculateEstimatedCompletion).mockResolvedValue(
      new Date("2024-02-01T10:00:00Z")
    );
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <UnblockProductionModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          productionQueueId="queue-1"
          onUnblock={mockOnUnblock}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  describe("Rendering", () => {
    it("should render modal with title and description", () => {
      renderComponent();

      expect(screen.getByText("Desbloquear Produção")).toBeInTheDocument();
      expect(
        screen.getByText(/Desbloqueie este item de produção após resolver o problema/i)
      ).toBeInTheDocument();
    });

    it("should show loading state while fetching block info", () => {
      renderComponent();

      // Check for loading spinner by class name
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it("should display original block reason after loading", async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockProductionQueueItem, error: null })
          .mockResolvedValueOnce({ data: mockStageData, error: null }),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Aguardando material em falta")).toBeInTheDocument();
      });
    });

    it("should display blocked duration", async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockProductionQueueItem, error: null })
          .mockResolvedValueOnce({ data: mockStageData, error: null }),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Duração:/i)).toBeInTheDocument();
      });
    });

    it("should display new estimated completion date", async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProductionQueueItem, error: null }),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Nova Data Estimada de Conclusão")).toBeInTheDocument();
      });
    });
  });

  describe("Resolution Notes", () => {
    it("should allow entering resolution notes", async () => {
      const user = userEvent.setup();
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProductionQueueItem, error: null }),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Notas de Resolução/i)).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/Descreva como o problema foi resolvido/i);
      await user.type(textarea, "Material recebido e verificado");

      expect(textarea).toHaveValue("Material recebido e verificado");
    });

    it("should show that resolution notes are optional", async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProductionQueueItem, error: null }),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/\(Opcional\)/i)).toBeInTheDocument();
      });
    });
  });

  describe("Unblock Functionality", () => {
    it("should call unblockProduction when Unblock & Resume button is clicked", async () => {
      const user = userEvent.setup();
      const mockUnblockedItem = { id: "queue-1", production_status: "in_production" };

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockProductionQueueItem, error: null })
          .mockResolvedValueOnce({ data: mockStageData, error: null }),
        update: vi.fn().mockReturnThis(),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);
      mockSupabaseChain.update.mockResolvedValue({ data: null, error: null });

      vi.mocked(productionService.unblockProduction).mockResolvedValue(mockUnblockedItem as any);

      renderComponent();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("Aguardando material em falta")).toBeInTheDocument();
      });

      const unblockButton = screen.getByText("Desbloquear & Retomar");
      await user.click(unblockButton);

      await waitFor(() => {
        expect(productionService.unblockProduction).toHaveBeenCalledWith("queue-1");
      });
    });

    it("should update stage before unblocking production", async () => {
      const user = userEvent.setup();
      const mockUnblockedItem = { id: "queue-1", production_status: "in_production" };

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockProductionQueueItem, error: null })
          .mockResolvedValueOnce({ data: mockStageData, error: null }),
        update: vi.fn().mockReturnThis(),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);
      mockSupabaseChain.update.mockResolvedValue({ data: null, error: null });

      vi.mocked(productionService.unblockProduction).mockResolvedValue(mockUnblockedItem as any);

      renderComponent();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("Aguardando material em falta")).toBeInTheDocument();
      });

      const unblockButton = screen.getByText("Desbloquear & Retomar");
      await user.click(unblockButton);

      await waitFor(() => {
        expect(mockSupabaseChain.update).toHaveBeenCalled();
      });
    });

    it("should call onUnblock callback after successful unblock", async () => {
      const user = userEvent.setup();
      const mockUnblockedItem = { id: "queue-1", production_status: "in_production" };

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockProductionQueueItem, error: null })
          .mockResolvedValueOnce({ data: mockStageData, error: null }),
        update: vi.fn().mockReturnThis(),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);
      mockSupabaseChain.update.mockResolvedValue({ data: null, error: null });

      vi.mocked(productionService.unblockProduction).mockResolvedValue(mockUnblockedItem as any);

      renderComponent();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("Aguardando material em falta")).toBeInTheDocument();
      });

      const unblockButton = screen.getByText("Desbloquear & Retomar");
      await user.click(unblockButton);

      await waitFor(() => {
        expect(mockOnUnblock).toHaveBeenCalled();
      });
    });

    it("should close modal after successful unblock", async () => {
      const user = userEvent.setup();
      const mockUnblockedItem = { id: "queue-1", production_status: "in_production" };

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockProductionQueueItem, error: null })
          .mockResolvedValueOnce({ data: mockStageData, error: null }),
        update: vi.fn().mockReturnThis(),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);
      mockSupabaseChain.update.mockResolvedValue({ data: null, error: null });

      vi.mocked(productionService.unblockProduction).mockResolvedValue(mockUnblockedItem as any);

      renderComponent();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("Aguardando material em falta")).toBeInTheDocument();
      });

      const unblockButton = screen.getByText("Desbloquear & Retomar");
      await user.click(unblockButton);

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("should show loading state while unblocking", async () => {
      const user = userEvent.setup();

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockProductionQueueItem, error: null })
          .mockResolvedValueOnce({ data: mockStageData, error: null }),
        update: vi.fn().mockReturnThis(),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);
      mockSupabaseChain.update.mockResolvedValue({ data: null, error: null });

      vi.mocked(productionService.unblockProduction).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({} as any), 100))
      );

      renderComponent();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("Aguardando material em falta")).toBeInTheDocument();
      });

      const unblockButton = screen.getByText("Desbloquear & Retomar");
      await user.click(unblockButton);

      // Check for loading spinner instead of text
      await waitFor(() => {
        const loadingSpinner = document.querySelector('.animate-spin');
        expect(loadingSpinner).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle error when fetching block info fails", async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Item não encontrado" },
        }),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);

      renderComponent();

      await waitFor(() => {
        // Component should handle error gracefully
        expect(screen.queryByText("Aguardando material em falta")).not.toBeInTheDocument();
      });
    });

    it("should show fallback block reason when stage data not found", async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockProductionQueueItem, error: null })
          .mockResolvedValueOnce({ data: null, error: { message: "Not found" } }),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Aguardando material em falta")).toBeInTheDocument();
      });
    });

    it("should handle error when unblocking fails", async () => {
      const user = userEvent.setup();

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockProductionQueueItem, error: null })
          .mockResolvedValueOnce({ data: mockStageData, error: null }),
        update: vi.fn().mockReturnThis(),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);
      mockSupabaseChain.update.mockResolvedValue({ data: null, error: null });

      vi.mocked(productionService.unblockProduction).mockRejectedValue(
        new Error("Erro ao desbloquear")
      );

      renderComponent();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("Aguardando material em falta")).toBeInTheDocument();
      });

      const unblockButton = screen.getByText("Desbloquear & Retomar");
      await user.click(unblockButton);

      await waitFor(() => {
        expect(productionService.unblockProduction).toHaveBeenCalled();
      });

      // Modal should remain open on error
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  describe("Modal Controls", () => {
    it("should close modal when Cancel button is clicked", async () => {
      const user = userEvent.setup();

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProductionQueueItem, error: null }),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Cancelar")).toBeInTheDocument();
      });

      const cancelButton = screen.getByText("Cancelar");
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("should disable buttons while unblocking", async () => {
      const user = userEvent.setup();

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockProductionQueueItem, error: null })
          .mockResolvedValueOnce({ data: mockStageData, error: null }),
        update: vi.fn().mockReturnThis(),
      };

      (supabase.from as any) = vi.fn(() => mockSupabaseChain);
      mockSupabaseChain.update.mockResolvedValue({ data: null, error: null });

      vi.mocked(productionService.unblockProduction).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({} as any), 100))
      );

      renderComponent();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("Aguardando material em falta")).toBeInTheDocument();
      });

      const unblockButton = screen.getByText("Desbloquear & Retomar");
      await user.click(unblockButton);

      // Wait for mutation to start
      await waitFor(() => {
        const loadingSpinner = document.querySelector('.animate-spin');
        expect(loadingSpinner).toBeInTheDocument();
      });

      const cancelButton = screen.getByText("Cancelar");
      expect(cancelButton).toBeDisabled();
    });
  });
});
