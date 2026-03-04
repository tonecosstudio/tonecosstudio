// @ts-nocheck
/**
 * Testes Unitários: Stage Service
 *
 * Testa as funções do serviço de gestão de estágios de produção
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getStageHistory,
  completeStage,
  uploadStagePhoto,
  calculateEstimatedCompletion,
  type ProductionStageRecord,
} from "./stage-service";
import { supabase } from "@/integrations/supabase/client";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

describe("Stage Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStageHistory", () => {
    it("deve buscar histórico de estágios ordenado por stage_order", async () => {
      const mockStages = [
        {
          id: "stage-1",
          production_queue_id: "queue-1",
          stage_name: "awaiting_choice",
          stage_order: 1,
          status: "completed",
          started_at: "2026-04-01T10:00:00Z",
          completed_at: "2026-04-08T10:00:00Z",
          estimated_duration: 168,
          actual_duration: 168,
          assigned_to: null,
          assigned_to_name: null,
          assigned_at: null,
          notes: null,
          photos: [],
          is_blocked: false,
          block_reason: null,
          blocked_at: null,
          unblocked_at: null,
          created_at: "2026-04-01T10:00:00Z",
          updated_at: "2026-04-08T10:00:00Z",
        },
        {
          id: "stage-2",
          production_queue_id: "queue-1",
          stage_name: "design",
          stage_order: 2,
          status: "in_progress",
          started_at: "2026-04-08T10:00:00Z",
          completed_at: null,
          estimated_duration: 48,
          actual_duration: null,
          assigned_to: "user-1",
          assigned_to_name: "João Silva",
          assigned_at: "2026-04-08T10:00:00Z",
          notes: null,
          photos: [],
          is_blocked: false,
          block_reason: null,
          blocked_at: null,
          unblocked_at: null,
          created_at: "2026-04-01T10:00:00Z",
          updated_at: "2026-04-08T10:00:00Z",
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockStages, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });

      const result = await getStageHistory("queue-1");

      expect(supabase.from).toHaveBeenCalledWith("production_stages");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("production_queue_id", "queue-1");
      expect(mockOrder).toHaveBeenCalledWith("stage_order", { ascending: true });
      expect(result).toHaveLength(2);
      expect(result[0].stageName).toBe("awaiting_choice");
      expect(result[1].stageName).toBe("design");
    });

    it("deve lançar erro se busca falhar", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });

      await expect(getStageHistory("queue-1")).rejects.toThrow(
        "Erro ao buscar histórico de estágios: Database error"
      );
    });
  });

  describe("completeStage", () => {
    it("deve completar estágio com sucesso", async () => {
      const mockCurrentStage = {
        id: "stage-1",
        status: "in_progress",
        started_at: "2026-04-01T10:00:00Z",
        is_blocked: false,
      };

      const mockUpdatedStage = {
        id: "stage-1",
        production_queue_id: "queue-1",
        stage_name: "design",
        stage_order: 2,
        status: "completed",
        started_at: "2026-04-01T10:00:00Z",
        completed_at: "2026-04-03T10:00:00Z",
        estimated_duration: 48,
        actual_duration: 48,
        assigned_to: "user-1",
        assigned_to_name: "João Silva",
        assigned_at: "2026-04-01T10:00:00Z",
        notes: "Design aprovado",
        photos: ["https://example.com/photo1.jpg"],
        is_blocked: false,
        block_reason: null,
        blocked_at: null,
        unblocked_at: null,
        created_at: "2026-04-01T10:00:00Z",
        updated_at: "2026-04-03T10:00:00Z",
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn();
      const mockUpdate = vi.fn().mockReturnThis();

      // Mock para buscar estágio atual
      mockSingle.mockResolvedValueOnce({ data: mockCurrentStage, error: null });

      // Mock para atualizar estágio
      mockSingle.mockResolvedValueOnce({ data: mockUpdatedStage, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
      mockUpdate.mockReturnValue({ eq: mockEq });

      const result = await completeStage("stage-1", "Design aprovado", [
        "https://example.com/photo1.jpg",
      ]);

      expect(result.status).toBe("completed");
      expect(result.notes).toBe("Design aprovado");
      expect(result.photos).toEqual(["https://example.com/photo1.jpg"]);
    });

    it("deve lançar erro se estágio já foi completado", async () => {
      const mockCurrentStage = {
        id: "stage-1",
        status: "completed",
        completed_at: "2026-04-03T10:00:00Z",
        is_blocked: false,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockCurrentStage, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      await expect(completeStage("stage-1")).rejects.toThrow("Este estágio já foi completado");
    });

    it("deve lançar erro se estágio está bloqueado", async () => {
      const mockCurrentStage = {
        id: "stage-1",
        status: "in_progress",
        is_blocked: true,
        block_reason: "Falta de material",
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockCurrentStage, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      await expect(completeStage("stage-1")).rejects.toThrow(
        "Não é possível completar um estágio bloqueado"
      );
    });
  });

  describe("uploadStagePhoto", () => {
    it("deve validar tipo de arquivo", async () => {
      const mockFile = new File(["content"], "document.pdf", { type: "application/pdf" });

      await expect(uploadStagePhoto("stage-1", mockFile)).rejects.toThrow(
        "Apenas arquivos de imagem são permitidos"
      );
    });

    it("deve validar tamanho do arquivo", async () => {
      // Criar arquivo de 6MB (maior que o limite de 5MB)
      const largeContent = new Array(6 * 1024 * 1024).fill("a").join("");
      const mockFile = new File([largeContent], "large-image.jpg", { type: "image/jpeg" });

      await expect(uploadStagePhoto("stage-1", mockFile)).rejects.toThrow(
        "Arquivo muito grande. Tamanho máximo: 5MB"
      );
    });
  });

  describe("calculateEstimatedCompletion", () => {
    it("deve calcular data estimada baseada em estágios pendentes", async () => {
      const mockStages: ProductionStageRecord[] = [
        {
          id: "stage-1",
          productionQueueId: "queue-1",
          stageName: "awaiting_choice",
          stageOrder: 1,
          status: "completed",
          startedAt: "2026-04-01T10:00:00Z",
          completedAt: "2026-04-08T10:00:00Z",
          estimatedDuration: 168,
          actualDuration: 168,
          assignedTo: null,
          assignedToName: null,
          assignedAt: null,
          notes: null,
          photos: [],
          isBlocked: false,
          blockReason: null,
          blockedAt: null,
          unblockedAt: null,
          createdAt: "2026-04-01T10:00:00Z",
          updatedAt: "2026-04-08T10:00:00Z",
        },
        {
          id: "stage-2",
          productionQueueId: "queue-1",
          stageName: "design",
          stageOrder: 2,
          status: "in_progress",
          startedAt: "2026-04-08T10:00:00Z",
          completedAt: null,
          estimatedDuration: 48,
          actualDuration: null,
          assignedTo: "user-1",
          assignedToName: "João Silva",
          assignedAt: "2026-04-08T10:00:00Z",
          notes: null,
          photos: [],
          isBlocked: false,
          blockReason: null,
          blockedAt: null,
          unblockedAt: null,
          createdAt: "2026-04-01T10:00:00Z",
          updatedAt: "2026-04-08T10:00:00Z",
        },
        {
          id: "stage-3",
          productionQueueId: "queue-1",
          stageName: "production",
          stageOrder: 3,
          status: "pending",
          startedAt: null,
          completedAt: null,
          estimatedDuration: 120,
          actualDuration: null,
          assignedTo: null,
          assignedToName: null,
          assignedAt: null,
          notes: null,
          photos: [],
          isBlocked: false,
          blockReason: null,
          blockedAt: null,
          unblockedAt: null,
          createdAt: "2026-04-01T10:00:00Z",
          updatedAt: "2026-04-01T10:00:00Z",
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockStages.map((s) => ({
          id: s.id,
          production_queue_id: s.productionQueueId,
          stage_name: s.stageName,
          stage_order: s.stageOrder,
          status: s.status,
          started_at: s.startedAt,
          completed_at: s.completedAt,
          estimated_duration: s.estimatedDuration,
          actual_duration: s.actualDuration,
          assigned_to: s.assignedTo,
          assigned_to_name: s.assignedToName,
          assigned_at: s.assignedAt,
          notes: s.notes,
          photos: s.photos,
          is_blocked: s.isBlocked,
          block_reason: s.blockReason,
          blocked_at: s.blockedAt,
          unblocked_at: s.unblockedAt,
          created_at: s.createdAt,
          updated_at: s.updatedAt,
        })),
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });

      const result = await calculateEstimatedCompletion("queue-1");

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
