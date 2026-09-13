import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  createQuickReply,
  deleteQuickReply,
  toggleQuickReplyActive,
  updateQuickRepliesOrder,
  updateQuickReply,
} from "./quick-replies-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: vi.fn(),
}));

const callAdminRpcMock = vi.mocked(callAdminRpc);
const replyId = "11111111-1111-4111-8111-111111111111";
const replyId2 = "22222222-2222-4222-8222-222222222222";
const otherId = "33333333-3333-4333-8333-333333333333";
const input = {
  category: "pedido",
  title: "Pedido recebido",
  message: "Recebemos seu pedido.",
  shortcut: "Ctrl+1",
};

describe("quick-replies-service mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires creation to return a valid UUID", async () => {
    callAdminRpcMock.mockResolvedValue(replyId);
    await expect(createQuickReply(input, 1)).resolves.toBeUndefined();

    callAdminRpcMock.mockResolvedValue("invalid");
    await expect(createQuickReply(input, 1)).rejects.toThrow(
      "Quick reply creation returned an invalid resource id",
    );
  });

  it("requires update to return the edited quick reply id", async () => {
    callAdminRpcMock.mockResolvedValue(replyId);
    await expect(updateQuickReply(replyId, input)).resolves.toBeUndefined();

    callAdminRpcMock.mockResolvedValue(otherId);
    await expect(updateQuickReply(replyId, input)).rejects.toThrow(
      "Quick reply update returned an unexpected resource id",
    );
  });

  it("requires deletion to return the deleted quick reply id", async () => {
    callAdminRpcMock.mockResolvedValue(replyId);
    await expect(deleteQuickReply(replyId)).resolves.toBeUndefined();

    callAdminRpcMock.mockResolvedValue(otherId);
    await expect(deleteQuickReply(replyId)).rejects.toThrow(
      "Quick reply deletion returned an unexpected resource id",
    );
  });

  it("requires active toggle to return the changed quick reply id", async () => {
    callAdminRpcMock.mockResolvedValue(replyId);
    await expect(toggleQuickReplyActive(replyId, true)).resolves.toBeUndefined();

    expect(callAdminRpcMock).toHaveBeenCalledWith("admin_set_quick_reply_active", {
      p_id: replyId,
      p_is_active: false,
    });

    callAdminRpcMock.mockResolvedValue(otherId);
    await expect(toggleQuickReplyActive(replyId, true)).rejects.toThrow(
      "Quick reply active update returned an unexpected resource id",
    );
  });

  it("requires reorder to confirm every submitted row", async () => {
    callAdminRpcMock.mockResolvedValue({ updated: 2 });
    await expect(
      updateQuickRepliesOrder([
        { id: replyId, display_order: 0 },
        { id: replyId2, display_order: 1 },
      ]),
    ).resolves.toBeUndefined();

    callAdminRpcMock.mockResolvedValue({ updated: 1 });
    await expect(
      updateQuickRepliesOrder([
        { id: replyId, display_order: 0 },
        { id: replyId2, display_order: 1 },
      ]),
    ).rejects.toThrow("Quick reply reorder returned an unexpected updated");
  });

  it("rejects an empty reorder before calling the backend", async () => {
    await expect(updateQuickRepliesOrder([])).rejects.toThrow(
      "Nenhuma resposta rapida fornecida para reordenacao",
    );
    expect(callAdminRpcMock).not.toHaveBeenCalled();
  });
});
