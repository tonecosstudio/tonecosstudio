import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteGroupMessageTemplate,
  saveGroupMessageTemplate,
  scheduleGroupMessage,
} from "./groups-message-service";

const mocks = vi.hoisted(() => ({
  callAdminRpc: vi.fn(),
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: mocks.callAdminRpc,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

const groupId = "11111111-1111-4111-8111-111111111111";
const messageId = "22222222-2222-4222-8222-222222222222";
const templateId = "33333333-3333-4333-8333-333333333333";
const otherId = "44444444-4444-4444-8444-444444444444";

function scheduledMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: messageId,
    group_id: groupId,
    message: "Mensagem agendada",
    scheduled_at: "2026-09-14T10:00:00.000Z",
    sent_at: null,
    status: "pending",
    created_by: "55555555-5555-4555-8555-555555555555",
    created_at: "2026-09-14T06:00:00.000Z",
    ...overrides,
  };
}

function template(overrides: Record<string, unknown> = {}) {
  return {
    id: templateId,
    name: "Pagamento confirmado",
    content: "Seu pagamento foi confirmado.",
    created_by: "55555555-5555-4555-8555-555555555555",
    created_at: "2026-09-14T06:00:00.000Z",
    updated_at: "2026-09-14T06:00:00.000Z",
    ...overrides,
  };
}

describe("groups-message-service mutation contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirma grupo, mensagem, status e agendamento ao criar mensagem", async () => {
    mocks.callAdminRpc.mockResolvedValue(scheduledMessage());

    await expect(
      scheduleGroupMessage({
        groupId,
        message: "Mensagem agendada",
        scheduledAt: new Date("2026-09-14T10:00:00.000Z"),
        createdBy: "55555555-5555-4555-8555-555555555555",
      }),
    ).resolves.toBeUndefined();
  });

  it.each([
    null,
    {},
    scheduledMessage({ group_id: otherId }),
    scheduledMessage({ status: "sent" }),
    scheduledMessage({ message: "Outra mensagem" }),
    scheduledMessage({ scheduled_at: "invalid" }),
  ])("rejeita retorno inconsistente ao agendar mensagem %#", async (value) => {
    mocks.callAdminRpc.mockResolvedValue(value);

    await expect(
      scheduleGroupMessage({
        groupId,
        message: "Mensagem agendada",
        scheduledAt: new Date("2026-09-14T10:00:00.000Z"),
        createdBy: "55555555-5555-4555-8555-555555555555",
      }),
    ).rejects.toThrow();
  });

  it("vincula template criado aos dados enviados", async () => {
    mocks.callAdminRpc.mockResolvedValue(template());

    await expect(
      saveGroupMessageTemplate({
        name: "Pagamento confirmado",
        content: "Seu pagamento foi confirmado.",
        createdBy: "55555555-5555-4555-8555-555555555555",
      }),
    ).resolves.toBeUndefined();
  });

  it("vincula update de template ao id solicitado", async () => {
    mocks.callAdminRpc.mockResolvedValue(template());

    await expect(
      saveGroupMessageTemplate({
        id: templateId,
        name: "Pagamento confirmado",
        content: "Seu pagamento foi confirmado.",
        createdBy: "55555555-5555-4555-8555-555555555555",
      }),
    ).resolves.toBeUndefined();

    mocks.callAdminRpc.mockResolvedValue(template({ id: otherId }));
    await expect(
      saveGroupMessageTemplate({
        id: templateId,
        name: "Pagamento confirmado",
        content: "Seu pagamento foi confirmado.",
        createdBy: "55555555-5555-4555-8555-555555555555",
      }),
    ).rejects.toThrow("Group message template save returned an unexpected resource id");
  });

  it("exige id exato ao excluir template", async () => {
    mocks.callAdminRpc.mockResolvedValue(templateId);
    await expect(deleteGroupMessageTemplate(templateId)).resolves.toBeUndefined();

    mocks.callAdminRpc.mockResolvedValue(otherId);
    await expect(deleteGroupMessageTemplate(templateId)).rejects.toThrow(
      "Group message template deletion returned an unexpected resource id",
    );
  });
});
