import { beforeEach, describe, expect, it, vi } from "vitest";
import { metricsService } from "./group-metrics-service";

const mocks = vi.hoisted(() => ({ from: vi.fn(), error: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/lib/logger", () => ({
  log: { error: mocks.error },
}));

type Result = {
  count?: number | null;
  data?: unknown;
  error?: { message: string } | null;
};

const calls: Array<{ table: string; query: ReturnType<typeof chain> }> = [];

function chain(response: Result) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    gt: vi.fn(),
    then: (
      resolve: (value: Result) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(resolve, reject),
  };
  [q.select, q.eq, q.order, q.limit, q.maybeSingle, q.gt]
    .forEach((fn) => fn.mockReturnValue(q));
  return q;
}

function responses(byTable: Record<string, Result | Result[]>) {
  const indexes = new Map<string, number>();
  mocks.from.mockImplementation((table: string) => {
    const index = indexes.get(table) ?? 0;
    indexes.set(table, index + 1);
    const entry = byTable[table];
    const q = chain((Array.isArray(entry) ? entry[index] : entry) ?? {});
    calls.push({ table, query: q });
    return q;
  });
}

describe("group metrics — measured counts, not fabricated engagement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    calls.length = 0;
  });

  it("counts real group members through a scoped head-only query", async () => {
    responses({ chat_group_members: { count: 8, error: null } });
    await expect(metricsService.getTotalMembers("group-1")).resolves.toBe(8);
    expect(calls[0].query.select).toHaveBeenCalledWith("*", {
      count: "exact",
      head: true,
    });
    expect(calls[0].query.eq).toHaveBeenCalledWith("group_id", "group-1");
  });

  it("returns a zero count when a group has no members", async () => {
    responses({ chat_group_members: { count: null, error: null } });
    await expect(metricsService.getTotalMembers("group-1")).resolves.toBe(0);
  });

  it("does not conceal an unauthorized member count", async () => {
    responses({ chat_group_members: {
      count: null, error: { message: "denied" },
    } });
    await expect(metricsService.getTotalMembers("group-1"))
      .rejects.toThrow("Erro ao calcular total de membros");
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it("counts real group messages rather than cached estimates", async () => {
    responses({ chat_group_messages: { count: 12, error: null } });
    await expect(metricsService.getTotalMessages("group-1")).resolves.toBe(12);
    expect(calls[0].query.eq).toHaveBeenCalledWith("group_id", "group-1");
  });

  it("does not conceal an unauthorized message count", async () => {
    responses({ chat_group_messages: {
      count: 0, error: { message: "denied" },
    } });
    await expect(metricsService.getTotalMessages("group-1"))
      .rejects.toThrow("Erro ao calcular total de mensagens");
  });

  it("returns zero view rate when the last message cannot be retrieved", async () => {
    responses({ chat_group_messages: {
      data: null, error: { message: "offline" },
    } });
    await expect(metricsService.getEstimatedViewRate("group-1"))
      .resolves.toBe(0);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("chat_group_messages");
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it("returns zero view rate if the group has no messages", async () => {
    responses({ chat_group_messages: { data: null, error: null } });
    await expect(metricsService.getEstimatedViewRate("group-1"))
      .resolves.toBe(0);
  });

  it("returns zero view rate when messages exist but membership is empty", async () => {
    responses({
      chat_group_messages: {
        data: { created_at: "2026-11-02T12:00:00Z" }, error: null,
      },
      chat_group_members: { count: 0, error: null },
    });
    await expect(metricsService.getEstimatedViewRate("group-1"))
      .resolves.toBe(0);
    expect(calls).toHaveLength(2);
  });

  it("measures members who visited after the latest message", async () => {
    responses({
      chat_group_messages: {
        data: { created_at: "2026-11-02T12:00:00Z" }, error: null,
      },
      chat_group_members: [
        { count: 4, error: null },
        { count: 3, error: null },
      ],
    });
    await expect(metricsService.getEstimatedViewRate("group-1"))
      .resolves.toBe(75);
    expect(calls[2].query.gt).toHaveBeenCalledWith(
      "last_viewed_at", "2026-11-02T12:00:00Z",
    );
  });

  it("rounds the measured rate to two decimal places", async () => {
    responses({
      chat_group_messages: {
        data: { created_at: "2026-11-02T12:00:00Z" }, error: null,
      },
      chat_group_members: [
        { count: 3, error: null },
        { count: 1, error: null },
      ],
    });
    await expect(metricsService.getEstimatedViewRate("group-1"))
      .resolves.toBe(33.33);
  });

  it("fails closed if member counts cannot be measured", async () => {
    responses({
      chat_group_messages: { data: { created_at: "2026-11-02" }, error: null },
      chat_group_members: { count: 0, error: { message: "denied" } },
    });
    await expect(metricsService.getEstimatedViewRate("group-1"))
      .rejects.toThrow("Erro ao calcular taxa de visualização");
  });

  it("fails closed if the viewed-member count cannot be measured", async () => {
    responses({
      chat_group_messages: { data: { created_at: "2026-11-02" }, error: null },
      chat_group_members: [
        { count: 4, error: null },
        { count: null, error: { message: "denied" } },
      ],
    });
    await expect(metricsService.getEstimatedViewRate("group-1"))
      .rejects.toThrow("Erro ao calcular taxa de visualização");
  });

  it("composes total metrics by querying members, messages and view rate", async () => {
    responses({
      chat_group_members: [
        { count: 6, error: null },
        { count: 6, error: null },
        { count: 2, error: null },
      ],
      chat_group_messages: [
        { count: 3, error: null },
        { data: { created_at: "2026-11-02" }, error: null },
      ],
    });
    await expect(metricsService.getGroupMetrics("group-1")).resolves.toEqual({
      total_members: 6,
      total_messages: 3,
      estimated_view_rate: 33.33,
    });
  });
});
