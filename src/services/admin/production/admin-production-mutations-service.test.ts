import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  assignProductionRpc,
  blockProductionRpc,
  unblockProductionRpc,
  updateProductionEstimatedCompletionRpc,
  updateProductionNotesRpc,
  updateProductionScheduleRpc,
  updateProductionStageNotesRpc,
  updateProductionStageRpc,
} from "./admin-production-mutations-service";

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: vi.fn(),
}));

const callAdminRpcMock = vi.mocked(callAdminRpc);
const queueId = "11111111-1111-4111-8111-111111111111";
const otherQueueId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const stageRowId = "44444444-4444-4444-8444-444444444444";

function queueRow(overrides: Record<string, unknown> = {}) {
  return {
    id: queueId,
    current_stage: "painting",
    production_status: "in_production",
    production_notes: null,
    assigned_to: null,
    scheduled_production_date: null,
    ...overrides,
  };
}

describe("admin-production-mutations-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirma mudanca de estagio no item solicitado", async () => {
    callAdminRpcMock.mockResolvedValue(queueRow({ current_stage: "quality_check" }));

    await expect(updateProductionStageRpc(queueId, "quality_check")).resolves.toBeUndefined();
  });

  it.each([
    null,
    {},
    queueRow({ id: otherQueueId, current_stage: "quality_check" }),
    queueRow({ current_stage: "painting" }),
  ])("rejeita retorno inconsistente de mudanca de estagio %#", async (value) => {
    callAdminRpcMock.mockResolvedValue(value as never);

    await expect(updateProductionStageRpc(queueId, "quality_check")).rejects.toThrow();
  });

  it("confirma atribuicao para o usuario solicitado", async () => {
    callAdminRpcMock.mockResolvedValue(queueRow({ assigned_to: userId }));

    await expect(assignProductionRpc({ queueId, userId })).resolves.toBeUndefined();
  });

  it("rejeita atribuicao confirmada para outro usuario", async () => {
    callAdminRpcMock.mockResolvedValue(queueRow({ assigned_to: otherQueueId }));

    await expect(assignProductionRpc({ queueId, userId })).rejects.toThrow(
      "Production assignment returned an unexpected assignee",
    );
  });

  it("confirma bloqueio somente quando fila volta on_hold com o motivo normalizado", async () => {
    callAdminRpcMock.mockResolvedValue(
      queueRow({ production_status: "on_hold", production_notes: "Aguardando material" }),
    );

    await expect(blockProductionRpc(queueId, "  Aguardando material  ")).resolves.toBeUndefined();
  });

  it("rejeita bloqueio sem estado bloqueado confirmado", async () => {
    callAdminRpcMock.mockResolvedValue(queueRow({ production_notes: "Aguardando material" }));

    await expect(blockProductionRpc(queueId, "Aguardando material")).rejects.toThrow(
      "Production block returned an unexpected state",
    );
  });

  it("confirma desbloqueio apenas quando a fila deixa on_hold", async () => {
    callAdminRpcMock.mockResolvedValue(queueRow({ production_status: "in_production" }));
    await expect(unblockProductionRpc(queueId)).resolves.toBeUndefined();

    callAdminRpcMock.mockResolvedValue(queueRow({ production_status: "on_hold" }));
    await expect(unblockProductionRpc(queueId)).rejects.toThrow(
      "Production unblock returned a blocked state",
    );
  });

  it("vincula agenda de producao a data solicitada", async () => {
    callAdminRpcMock.mockResolvedValue(queueRow({ scheduled_production_date: "2026-09-20" }));

    await expect(updateProductionScheduleRpc(queueId, "2026-09-20")).resolves.toBeUndefined();

    callAdminRpcMock.mockResolvedValue(queueRow({ scheduled_production_date: "2026-09-21" }));
    await expect(updateProductionScheduleRpc(queueId, "2026-09-20")).rejects.toThrow(
      "Production schedule update returned an unexpected date",
    );
  });

  it("vincula notas de producao ao valor normalizado solicitado", async () => {
    callAdminRpcMock.mockResolvedValue(queueRow({ production_notes: "Revisar pintura" }));

    await expect(updateProductionNotesRpc(queueId, "  Revisar pintura  ")).resolves.toBeUndefined();

    callAdminRpcMock.mockResolvedValue(queueRow({ production_notes: "Outra nota" }));
    await expect(updateProductionNotesRpc(queueId, "Revisar pintura")).rejects.toThrow(
      "Production notes update returned unexpected notes",
    );
  });

  it("exige o proprio queue id ao atualizar conclusao estimada", async () => {
    callAdminRpcMock.mockResolvedValue(queueId);
    await expect(
      updateProductionEstimatedCompletionRpc(queueId, "2026-09-30T12:00:00Z"),
    ).resolves.toBeUndefined();

    callAdminRpcMock.mockResolvedValue(otherQueueId);
    await expect(
      updateProductionEstimatedCompletionRpc(queueId, "2026-09-30T12:00:00Z"),
    ).rejects.toThrow("Production estimated completion update returned an unexpected resource id");
  });

  it("exige um id de estagio valido ao atualizar notas do estagio", async () => {
    callAdminRpcMock.mockResolvedValue(stageRowId);
    await expect(
      updateProductionStageNotesRpc({ queueId, stage: "painting", notes: "Camada 2" }),
    ).resolves.toBeUndefined();

    callAdminRpcMock.mockResolvedValue("invalid");
    await expect(
      updateProductionStageNotesRpc({ queueId, stage: "painting", notes: "Camada 2" }),
    ).rejects.toThrow("Production stage notes update returned an invalid resource id");
  });
});
