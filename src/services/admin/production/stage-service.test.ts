import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  calculateEstimatedCompletion,
  completeStage,
  getStageHistory,
  uploadStagePhoto,
} from "./stage-service";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

describe("Stage Service", () => {
  const rawStage = {
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
    assigned_to_name: "Joao Silva",
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

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.rpc as any).mockResolvedValue({ data: null, error: null });
  });

  describe("getStageHistory", () => {
    it("deve buscar historico de estagios ordenado por stage_order", async () => {
      const order = vi.fn().mockResolvedValue({ data: [rawStage], error: null });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      (supabase.from as any).mockReturnValue({ select });

      const result = await getStageHistory("queue-1");

      expect(supabase.from).toHaveBeenCalledWith("production_stages");
      expect(select).toHaveBeenCalledWith("*");
      expect(eq).toHaveBeenCalledWith("production_queue_id", "queue-1");
      expect(order).toHaveBeenCalledWith("stage_order", { ascending: true });
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: "stage-1",
          productionQueueId: "queue-1",
          stageName: "design",
          status: "completed",
        })
      );
    });

    it("deve lancar erro se busca falhar", async () => {
      const order = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      (supabase.from as any).mockReturnValue({ select });

      await expect(getStageHistory("queue-1")).rejects.toThrow(
        "Erro ao buscar hist"
      );
    });
  });

  describe("completeStage", () => {
    it("deve completar estagio com sucesso via RPC", async () => {
      (supabase.rpc as any).mockResolvedValue({ data: rawStage, error: null });

      const result = await completeStage("stage-1", "Design aprovado", [
        "https://example.com/photo1.jpg",
      ]);

      expect(supabase.rpc).toHaveBeenCalledWith("admin_complete_production_stage", {
        p_stage_id: "stage-1",
        p_notes: "Design aprovado",
        p_photos: ["https://example.com/photo1.jpg"],
        p_is_override: false,
        p_justification: null,
      });
      expect(result.status).toBe("completed");
      expect(result.notes).toBe("Design aprovado");
      expect(result.photos).toEqual(["https://example.com/photo1.jpg"]);
    });

    it("deve enviar dados de override para a RPC", async () => {
      (supabase.rpc as any).mockResolvedValue({ data: rawStage, error: null });

      await completeStage("stage-1", undefined, undefined, true, "correcao operacional");

      expect(supabase.rpc).toHaveBeenCalledWith("admin_complete_production_stage", {
        p_stage_id: "stage-1",
        p_notes: null,
        p_photos: [],
        p_is_override: true,
        p_justification: "correcao operacional",
      });
    });

    it("deve propagar erro da RPC de conclusao", async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: "Stage is blocked" },
      });

      await expect(completeStage("stage-1")).rejects.toThrow("Stage is blocked");
    });
  });

  describe("uploadStagePhoto", () => {
    it("deve validar tipo de arquivo", async () => {
      const file = new File(["content"], "document.pdf", { type: "application/pdf" });

      await expect(uploadStagePhoto("stage-1", file)).rejects.toThrow(
        "Apenas arquivos de imagem"
      );
    });

    it("deve fazer upload e retornar URL publica", async () => {
      const upload = vi.fn().mockResolvedValue({
        data: { path: "stage-1/photo.jpg" },
        error: null,
      });
      const getPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: "https://cdn.example.com/stage-1/photo.jpg" },
      });
      (supabase.storage.from as any).mockReturnValue({ upload, getPublicUrl });

      const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
      const url = await uploadStagePhoto("stage-1", file);

      expect(url).toBe("https://cdn.example.com/stage-1/photo.jpg");
      expect(upload).toHaveBeenCalledWith(
        expect.stringMatching(/^stage-1\/\d+-[a-f0-9]+\.jpg$/),
        file,
        { cacheControl: "3600", upsert: false }
      );
    });
  });

  describe("calculateEstimatedCompletion", () => {
    it("deve calcular data estimada baseada em estagios pendentes", async () => {
      const order = vi.fn().mockResolvedValue({
        data: [
          { ...rawStage, status: "completed", estimated_duration: 48 },
          { ...rawStage, id: "stage-2", status: "pending", estimated_duration: 4 },
        ],
        error: null,
      });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      (supabase.from as any).mockReturnValue({ select });

      const result = await calculateEstimatedCompletion("queue-1");

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
