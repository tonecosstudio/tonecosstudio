import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { supabase } from "@/integrations/supabase/client";
import {
  createSupportConversationRpc,
  updateSupportConversationRpc,
} from "./support-conversation-mutations-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: vi.fn(),
}));

const callAdminRpcMock = vi.mocked(callAdminRpc);
const conversationId = "11111111-1111-4111-8111-111111111111";
const otherConversationId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const assigneeId = "44444444-4444-4444-8444-444444444444";
const orderId = "55555555-5555-4555-8555-555555555555";

function conversationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: conversationId,
    user_id: userId,
    subject: "Preciso de ajuda",
    status: "new",
    priority: "normal",
    tags: ["pedido"],
    risk_flags: [],
    order_id: null,
    quote_id: null,
    subscription_id: null,
    payment_id: null,
    promised_date: null,
    assigned_to: null,
    ...overrides,
  };
}

describe("support-conversation-mutations-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("binds conversation creation to normalized requested fields", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: conversationRow({
        subject: "Preciso de ajuda",
        status: "new",
        priority: "normal",
        tags: ["pedido", "urgente"],
        order_id: orderId,
      }),
      error: null,
    } as never);

    await expect(
      createSupportConversationRpc({
        userId,
        subject: "  Preciso de ajuda  ",
        status: "new",
        priority: "normal",
        tags: ["pedido", "urgente"],
        orderId,
      }),
    ).resolves.toMatchObject({
      id: conversationId,
      user_id: userId,
      subject: "Preciso de ajuda",
      tags: ["pedido", "urgente"],
      order_id: orderId,
    });
  });

  it.each([
    null,
    {},
    conversationRow({ id: "invalid" }),
    conversationRow({ user_id: assigneeId }),
    conversationRow({ subject: "Outro assunto" }),
    conversationRow({ status: "closed" }),
    conversationRow({ priority: "high" }),
    conversationRow({ tags: ["duvida"] }),
  ])("rejects malformed or mismatched conversation creation data %#", async (value) => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: value, error: null } as never);

    await expect(
      createSupportConversationRpc({
        userId,
        subject: "Preciso de ajuda",
        tags: ["pedido"],
      }),
    ).rejects.toThrow();
  });

  it("accepts tag ordering differences while preserving the same normalized set", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: conversationRow({ tags: ["urgente", "pedido"] }),
      error: null,
    } as never);

    await expect(
      createSupportConversationRpc({
        userId,
        subject: "Preciso de ajuda",
        tags: ["pedido", "urgente", "pedido"],
      }),
    ).resolves.toMatchObject({ id: conversationId });
  });

  it("binds admin updates to id and all requested changed fields", async () => {
    callAdminRpcMock.mockResolvedValue(
      conversationRow({
        status: "waiting_customer",
        priority: "high",
        tags: ["urgente", "pedido"],
        risk_flags: ["atraso_critico"],
        promised_date: "2026-09-20T12:00:00+00:00",
        assigned_to: assigneeId,
      }),
    );

    await expect(
      updateSupportConversationRpc(conversationId, {
        status: "waiting_customer",
        priority: "high",
        tags: ["pedido", "urgente"],
        risk_flags: ["atraso_critico"],
        promised_date: "2026-09-20T12:00:00.000Z",
        assigned_to: assigneeId,
      }),
    ).resolves.toMatchObject({
      id: conversationId,
      status: "waiting_customer",
      assigned_to: assigneeId,
    });
  });

  it.each([
    conversationRow({ id: otherConversationId, status: "waiting_customer" }),
    conversationRow({ status: "new" }),
    conversationRow({ status: "waiting_customer", assigned_to: null }),
    conversationRow({ status: "waiting_customer", tags: ["duvida"] }),
  ])("rejects an admin update response inconsistent with the requested mutation %#", async (value) => {
    callAdminRpcMock.mockResolvedValue(value);

    await expect(
      updateSupportConversationRpc(conversationId, {
        status: "waiting_customer",
        tags: ["pedido"],
        assigned_to: assigneeId,
      }),
    ).rejects.toThrow();
  });

  it("supports explicitly clearing nullable update fields", async () => {
    callAdminRpcMock.mockResolvedValue(
      conversationRow({ promised_date: null, assigned_to: null }),
    );

    await expect(
      updateSupportConversationRpc(conversationId, {
        promised_date: null,
        assigned_to: null,
      }),
    ).resolves.toMatchObject({ id: conversationId, promised_date: null, assigned_to: null });
  });
});
