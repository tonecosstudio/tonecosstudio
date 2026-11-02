import { beforeEach, describe, expect, it, vi } from "vitest";
import { broadcastGroupMessage, verifyGroupMembership } from "./group-broadcast-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  createChannel: vi.fn(),
  currentUserId: vi.fn(),
  assertUserId: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/services/auth/current-user", () => ({
  getCurrentUserId: mocks.currentUserId,
  assertCurrentUserId: mocks.assertUserId,
}));
vi.mock("@/services/supabase/realtime-client", () => ({
  createRealtimeChannel: mocks.createChannel,
}));
vi.mock("@/lib/logger", () => ({
  log: { debug: mocks.debug, error: mocks.error, warn: mocks.warn },
}));

function membership(data: unknown, error: { message: string } | null = null) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  q.select.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  mocks.from.mockReturnValue(q);
  return q;
}

describe("group broadcast — authenticated membership and transport", () => {
  const message = { id: "message-1" } as unknown as Parameters<typeof broadcastGroupMessage>[1];

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.currentUserId.mockResolvedValue("user-1");
    mocks.assertUserId.mockResolvedValue("user-1");
    mocks.createChannel.mockReturnValue({
      send: vi.fn().mockResolvedValue("ok"),
    });
  });

  it("sends an existing message to its group channel without changing its payload", async () => {
    const channel = { send: vi.fn().mockResolvedValue("ok") };
    mocks.createChannel.mockReturnValueOnce(channel);
    await expect(broadcastGroupMessage("group-1", message)).resolves.toBeUndefined();
    expect(mocks.createChannel).toHaveBeenCalledWith("group:group-1");
    expect(channel.send).toHaveBeenCalledExactlyOnceWith({
      type: "broadcast",
      event: "new_message",
      payload: { message },
    });
    expect(mocks.debug).toHaveBeenCalledOnce();
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("records a transport error rather than asserting that realtime delivery succeeded", async () => {
    const channel = { send: vi.fn().mockRejectedValue(new Error("offline")) };
    mocks.createChannel.mockReturnValue(channel);
    await expect(broadcastGroupMessage("group-1", message)).resolves.toBeUndefined();
    expect(mocks.error).toHaveBeenCalledWith(
      "Erro ao enviar broadcast de mensagem do grupo",
      expect.objectContaining({ groupId: "group-1", messageId: "message-1" }),
    );
    expect(mocks.debug).not.toHaveBeenCalled();
  });

  it("logs channel creation failures without exposing private message data", async () => {
    mocks.createChannel.mockImplementationOnce(() => {
      throw new Error("channel unavailable");
    });
    await expect(broadcastGroupMessage("group-1", message)).resolves.toBeUndefined();
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it("checks membership only for the authenticated user and intended group", async () => {
    const q = membership({ id: "member-1" });
    await expect(verifyGroupMembership("group-1")).resolves.toBe(true);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("chat_group_members");
    expect(q.select).toHaveBeenCalledWith("id");
    expect(q.eq).toHaveBeenCalledWith("group_id", "group-1");
    expect(q.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("verifies the explicitly provided user identity before any lookup", async () => {
    const q = membership({ id: "member-1" });
    await expect(verifyGroupMembership("group-1", "user-1")).resolves.toBe(true);
    expect(mocks.assertUserId).toHaveBeenCalledExactlyOnceWith("user-1");
    expect(q.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("rejects an unverified identity without reading another user's membership", async () => {
    mocks.assertUserId.mockRejectedValueOnce(new Error("identity mismatch"));
    await expect(verifyGroupMembership("group-1", "other-user")).resolves.toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it("denies unauthenticated group access before hitting the database", async () => {
    mocks.currentUserId.mockResolvedValueOnce(null);
    await expect(verifyGroupMembership("group-1")).resolves.toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("denies membership when the requested group has no record", async () => {
    membership(null);
    await expect(verifyGroupMembership("group-1")).resolves.toBe(false);
    expect(mocks.warn).toHaveBeenCalledOnce();
  });

  it("denies membership when row-level security blocks the lookup", async () => {
    membership(null, { message: "permission denied" });
    await expect(verifyGroupMembership("group-1")).resolves.toBe(false);
    expect(mocks.warn).toHaveBeenCalledOnce();
  });

  it("denies membership when a client-level query throws", async () => {
    mocks.from.mockImplementationOnce(() => {
      throw new Error("unavailable");
    });
    await expect(verifyGroupMembership("group-1")).resolves.toBe(false);
    expect(mocks.error).toHaveBeenCalledOnce();
  });
});
