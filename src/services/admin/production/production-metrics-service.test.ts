import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchProductionMetrics } from "./production-metrics-service";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("@/services/supabase/realtime-client", () => ({
  createRealtimeChannel: vi.fn(),
  removeRealtimeChannel: vi.fn(),
}));

function mockTables(queueRows: Record<string, unknown>[], stageRows: Record<string, unknown>[]) {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    const data = table === "production_queue" ? queueRows : stageRows;
    return {
      select: vi.fn().mockResolvedValue({ data, error: null }),
    } as never;
  });
}

describe("production-metrics-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T12:00:00-03:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates averages only from persisted measured data", async () => {
    mockTables(
      [
        {
          id: "queue-1",
          current_stage: "delivered",
          production_status: "completed",
          priority: "high",
          priority_score: 80,
          choice_status: "approved",
          choice_deadline: null,
          estimated_completion_date: null,
          scheduled_production_date: "2026-08-31T14:00:00-03:00",
          production_started_at: "2026-08-30T12:00:00-03:00",
          production_completed_at: "2026-08-31T12:00:00-03:00",
        },
      ],
      [
        {
          stage_name: "painting",
          status: "completed",
          actual_duration: 12,
        },
      ],
    );

    const metrics = await fetchProductionMetrics();

    expect(metrics.overall).toEqual({
      totalItems: 1,
      avgProductionTimeHours: 24,
      completionRate: 100,
      avgPriorityScore: 80,
    });
    expect(metrics.avgStageDurations.painting).toBe(12);
    expect(metrics.scheduled.today).toBe(1);
  });

  it("does not turn missing completed timestamps into zero hours", async () => {
    mockTables(
      [
        {
          id: "queue-1",
          current_stage: "delivered",
          production_status: "completed",
          priority: "normal",
          priority_score: 50,
          choice_status: "approved",
          choice_deadline: null,
          estimated_completion_date: null,
          scheduled_production_date: null,
          production_started_at: null,
          production_completed_at: null,
        },
      ],
      [],
    );

    const metrics = await fetchProductionMetrics();

    expect(metrics.overall.avgProductionTimeHours).toBeNull();
    expect(metrics.overall.completionRate).toBe(100);
  });

  it("rejects unknown operational status instead of returning partial metrics", async () => {
    mockTables(
      [
        {
          id: "queue-1",
          current_stage: "printing",
          production_status: "mystery",
          priority: "normal",
          priority_score: 50,
          choice_status: null,
        },
      ],
      [],
    );

    await expect(fetchProductionMetrics()).rejects.toThrow(
      "Métrica de produção inválida: status do item queue-1",
    );
  });

  it("rejects malformed operational dates instead of silently skipping them", async () => {
    mockTables(
      [
        {
          id: "queue-1",
          current_stage: "printing",
          production_status: "in_production",
          priority: "normal",
          priority_score: 50,
          choice_status: "pending",
          choice_deadline: "not-a-date",
        },
      ],
      [],
    );

    await expect(fetchProductionMetrics()).rejects.toThrow(
      "Métrica de produção inválida: prazo de escolha do item queue-1",
    );
  });
});
