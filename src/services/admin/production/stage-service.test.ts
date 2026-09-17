import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateEstimatedCompletion,
  completeStage,
  getStageHistory,
  uploadStagePhoto,
} from "./stage-service";
import { supabase } from "@/integrations/supabase/client";

const boundaryMocks = vi.hoisted(() => ({
  callAdminRpc: vi.fn(),
  uploadStorageFile: vi.fn(),
  getPublicStorageUrl: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: boundaryMocks.callAdminRpc,
}));

vi.mock("@/services/supabase/storage-client", () => ({
  uploadStorageFile: boundaryMocks.uploadStorageFile,
  getPublicStorageUrl: boundaryMocks.getPublicStorageUrl,
}));

describe("Stage Service", () => {
  const rawStage = {
    id: "stage-1",
    production_queue_id: "queue-1",
    stage_name: "printing",
    stage_order: 5,
    status: "completed",
    started_at: "2026-04-01T10:00:00Z",
    completed_at: "2026-04-03T10:00:00Z",
    estimated_duration: 48,
    actual_duration: 48,
    assigned_to: "user-1",
    assigned_to_name: "Joao Silva",
    assigned_at: "2026-04-01T10:00:00Z",
    notes: "Impressao aprovada",
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
    boundaryMocks.callAdminRpc.mockResolvedValue(rawStage);
    boundaryMocks.uploadStorageFile.mockResolvedValue({
      data: { path: "stage-1/photo.jpg" },
      error: null,
    });
    boundaryMocks.getPublicStorageUrl.mockReturnValue(
      "https://cdn.example.com/stage-1/photo.jpg",
    );
  });

  describe("getStageHistory", () => {
    it("deve buscar historico de estagios ordenado por stage_order", async () => {
      const order = vi.fn().mockResolvedValue({ data: [rawStage], error: null });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      vi.mocked(supabase.from).mockReturnValue({ select } as never);

      const result = await getStageHistory("queue-1");

      expect(supabase.from).toHaveBeenCalledWith("production_stages");
      expect(select).toHaveBeenCalledWith("*");
      expect(eq).toHaveBeenCalledWith("production_queue_id", "queue-1");
      expect(order).toHaveBeenCalledWith("stage_order", { ascending: true });
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: "stage-1",
          productionQueueId: "queue-1",
          stageName: "printing",
          status: "completed",
        }),
      );
    });

    it("deve lancar erro se busca falhar", async () => {
      const order = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      vi.mocked(supabase.from).mockReturnValue({ select } as never);

      await expect(getStageHistory("queue-1")).rejects.toThrow(
        "Erro ao buscar histórico de estágios: Database error",
      );
    });
  });

  describe("completeStage", () => {
    it("deve completar estagio com sucesso pela fronteira administrativa", async () => {
      const result = await completeStage("stage-1", "Impressao aprovada", [
        "https://example.com/photo1.jpg",
      ]);

      expect(boundaryMocks.callAdminRpc).toHaveBeenCalledWith(
        "admin_complete_production_stage",
        {
          p_stage_id: "stage-1",
          p_notes: "Impressao aprovada",
          p_photos: ["https://example.com/photo1.jpg"],
          p_is_override: false,
          p_justification: null,
        },
      );
      expect(result.status).toBe("completed");
      expect(result.notes).toBe("Impressao aprovada");
      expect(result.photos).toEqual(["https://example.com/photo1.jpg"]);
    });

    it("deve enviar dados de override para a fronteira administrativa", async () => {
      await completeStage(
        "stage-1",
        undefined,
        undefined,
        true,
        "correcao operacional",
      );

      expect(boundaryMocks.callAdminRpc).toHaveBeenCalledWith(
        "admin_complete_production_stage",
        {
          p_stage_id: "stage-1",
          p_notes: null,
          p_photos: [],
          p_is_override: true,
          p_justification: "correcao operacional",
        },
      );
    });

    it("deve propagar erro da fronteira administrativa", async () => {
      boundaryMocks.callAdminRpc.mockRejectedValueOnce(new Error("Stage is blocked"));

      await expect(completeStage("stage-1")).rejects.toThrow("Stage is blocked");
    });

    it("deve falhar fechado quando a fronteira nao retorna o estagio atualizado", async () => {
      boundaryMocks.callAdminRpc.mockResolvedValueOnce(null);

      await expect(completeStage("stage-1")).rejects.toThrow(
        "Erro ao completar estagio: Falha na atualizacao",
      );
    });
  });

  describe("uploadStagePhoto", () => {
    it("deve validar tipo de arquivo", async () => {
      const file = new File(["content"], "document.pdf", {
        type: "application/pdf",
      });

      await expect(uploadStagePhoto("stage-1", file)).rejects.toThrow(
        "Apenas arquivos de imagem",
      );
    });

    it("deve fazer upload pela fronteira de storage e retornar URL publica", async () => {
      const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
      const url = await uploadStagePhoto("stage-1", file);

      expect(url).toBe("https://cdn.example.com/stage-1/photo.jpg");
      expect(boundaryMocks.uploadStorageFile).toHaveBeenCalledWith(
        "production-photos",
        expect.stringMatching(/^stage-1\/\d+-[a-f0-9]+\.jpg$/),
        file,
        { cacheControl: "3600", upsert: false },
      );
      expect(boundaryMocks.getPublicStorageUrl).toHaveBeenCalledWith(
        "production-photos",
        "stage-1/photo.jpg",
      );
    });

    it("deve propagar erro do upload", async () => {
      boundaryMocks.uploadStorageFile.mockResolvedValueOnce({
        data: null,
        error: { message: "Storage unavailable" },
      });
      const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });

      await expect(uploadStagePhoto("stage-1", file)).rejects.toThrow(
        "Erro ao fazer upload da foto: Storage unavailable",
      );
    });
  });

  describe("calculateEstimatedCompletion", () => {
    it("deve calcular data estimada baseada em estagios pendentes", async () => {
      const order = vi.fn().mockResolvedValue({
        data: [
          { ...rawStage, status: "completed", estimated_duration: 48 },
          {
            ...rawStage,
            id: "stage-2",
            stage_name: "painting",
            status: "pending",
            estimated_duration: 4,
          },
        ],
        error: null,
      });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      vi.mocked(supabase.from).mockReturnValue({ select } as never);

      const result = await calculateEstimatedCompletion("queue-1");

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
