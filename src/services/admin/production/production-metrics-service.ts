import { supabase } from "@/integrations/supabase/client";
import { PRODUCTION_STAGE_ORDER } from "@/config/production-stages";
import { getProductionPriorityFromScore } from "@/types/production";
import type {
  ChoiceStatus,
  Priority,
  ProductionStage,
  ProductionStatus,
} from "@/types/production";
import {
  createRealtimeChannel,
  removeRealtimeChannel,
} from "@/services/supabase/realtime-client";

export interface ProductionMetrics {
  stages: Record<ProductionStage, number>;
  statuses: Record<ProductionStatus, number>;
  priorities: Record<Priority, number>;
  choices: Record<ChoiceStatus, number>;
  urgent: {
    deadlineCritical: number;
    deadlineUrgent: number;
    blocked: number;
    overdue: number;
  };
  scheduled: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  avgStageDurations: Record<string, number>;
  overall: {
    totalItems: number;
    avgProductionTimeHours: number | null;
    completionRate: number;
    avgPriorityScore: number | null;
  };
  generatedAt: string;
}

type QueueRow = Record<string, unknown>;
type StageRow = Record<string, unknown>;

const STATUS_VALUES: ProductionStatus[] = [
  "awaiting_choice",
  "ready_for_production",
  "in_production",
  "completed",
  "on_hold",
  "cancelled",
];
const CHOICE_VALUES: ChoiceStatus[] = [
  "pending",
  "submitted",
  "approved",
  "rejected",
  "locked",
  "expired",
];
const STATUS_SET = new Set<string>(STATUS_VALUES);
const CHOICE_SET = new Set<string>(CHOICE_VALUES);
const STAGE_SET = new Set<string>(PRODUCTION_STAGE_ORDER);

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function validDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function requiredKnownValue<T extends string>(
  value: unknown,
  allowed: Set<string>,
  label: string,
  itemId: string,
): T {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new Error(`Métrica de produção inválida: ${label} do item ${itemId}`);
  }
  return value as T;
}

function optionalKnownValue<T extends string>(
  value: unknown,
  allowed: Set<string>,
  label: string,
  itemId: string,
): T | null {
  if (value === null || value === undefined || value === "") return null;
  return requiredKnownValue<T>(value, allowed, label, itemId);
}

function requireOperationalDate(value: unknown, label: string, itemId: string): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = validDate(value);
  if (!parsed) {
    throw new Error(`Métrica de produção inválida: ${label} do item ${itemId}`);
  }
  return parsed;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function fetchProductionMetrics(): Promise<ProductionMetrics> {
  const [queueResult, stagesResult] = await Promise.all([
    supabase.from("production_queue").select("*"),
    supabase.from("production_stages").select("*"),
  ]);

  if (queueResult.error) {
    throw new Error(`Erro ao buscar fila de produção: ${queueResult.error.message}`);
  }
  if (stagesResult.error) {
    throw new Error(`Erro ao buscar durações de estágios: ${stagesResult.error.message}`);
  }

  const items = (queueResult.data ?? []) as unknown as QueueRow[];
  const stageRows = (stagesResult.data ?? []) as unknown as StageRow[];

  const stages = Object.fromEntries(
    PRODUCTION_STAGE_ORDER.map((stage) => [stage, 0]),
  ) as Record<ProductionStage, number>;
  const statuses = Object.fromEntries(
    STATUS_VALUES.map((status) => [status, 0]),
  ) as Record<ProductionStatus, number>;
  const priorities: Record<Priority, number> = {
    critical: 0,
    high: 0,
    normal: 0,
    low: 0,
  };
  const choices = Object.fromEntries(
    CHOICE_VALUES.map((status) => [status, 0]),
  ) as Record<ChoiceStatus, number>;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const monthFromNow = new Date(today);
  monthFromNow.setMonth(monthFromNow.getMonth() + 1);

  let deadlineCritical = 0;
  let deadlineUrgent = 0;
  let blocked = 0;
  let overdue = 0;
  let scheduledToday = 0;
  let scheduledThisWeek = 0;
  let scheduledThisMonth = 0;
  let completedCount = 0;
  let completedWithTimingCount = 0;
  const completedDurations: number[] = [];
  const priorityScores: number[] = [];

  for (const item of items) {
    const id = typeof item.id === "string" ? item.id : "sem-id";
    const stage = requiredKnownValue<ProductionStage>(
      item.current_stage,
      STAGE_SET,
      "estágio",
      id,
    );
    const status = requiredKnownValue<ProductionStatus>(
      item.production_status,
      STATUS_SET,
      "status",
      id,
    );
    const choice = optionalKnownValue<ChoiceStatus>(
      item.choice_status,
      CHOICE_SET,
      "status de escolha",
      id,
    );

    stages[stage] += 1;
    statuses[status] += 1;
    if (choice) choices[choice] += 1;

    const priority = getProductionPriorityFromScore(item.priority, item.priority_score);
    priorities[priority] += 1;

    const priorityScore = finiteNumber(item.priority_score);
    if (priorityScore !== null) priorityScores.push(priorityScore);

    const deadline = requireOperationalDate(item.choice_deadline, "prazo de escolha", id);
    if (deadline) {
      const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / 3_600_000;
      if (hoursUntilDeadline > 0 && hoursUntilDeadline < 24) {
        deadlineCritical += 1;
      } else if (choice === "pending" && hoursUntilDeadline > 0 && hoursUntilDeadline < 72) {
        deadlineUrgent += 1;
      }
    }

    if (status === "on_hold") blocked += 1;

    const estimatedCompletion = requireOperationalDate(
      item.estimated_completion_date,
      "previsão de conclusão",
      id,
    );
    if (estimatedCompletion && estimatedCompletion < now && status !== "completed" && status !== "cancelled") {
      overdue += 1;
    }

    const scheduledDate = requireOperationalDate(
      item.scheduled_production_date,
      "data agendada",
      id,
    );
    if (scheduledDate) {
      if (scheduledDate >= today && scheduledDate < tomorrow) scheduledToday += 1;
      if (scheduledDate >= today && scheduledDate < weekFromNow) scheduledThisWeek += 1;
      if (scheduledDate >= today && scheduledDate < monthFromNow) scheduledThisMonth += 1;
    }

    if (status === "completed") {
      completedCount += 1;
      const started = requireOperationalDate(
        item.production_started_at ?? item.actual_start_date,
        "início real",
        id,
      );
      const completed = requireOperationalDate(
        item.production_completed_at ?? item.actual_completion_date,
        "conclusão real",
        id,
      );

      if (started && completed && completed >= started) {
        completedDurations.push((completed.getTime() - started.getTime()) / 3_600_000);
        completedWithTimingCount += 1;
      }
    }
  }

  const durationGroups = new Map<string, number[]>();
  for (const row of stageRows) {
    if (row.status !== "completed") continue;
    if (typeof row.stage_name !== "string" || !row.stage_name.trim()) continue;
    const duration = finiteNumber(row.actual_duration);
    if (duration === null || duration < 0) continue;
    const values = durationGroups.get(row.stage_name) ?? [];
    values.push(duration);
    durationGroups.set(row.stage_name, values);
  }

  const avgStageDurations: Record<string, number> = {};
  for (const [stage, durations] of durationGroups) {
    const value = average(durations);
    if (value !== null) avgStageDurations[stage] = value;
  }

  const allPrioritiesMeasured = items.length > 0 && priorityScores.length === items.length;
  const allCompletedTimesMeasured = completedCount > 0 && completedWithTimingCount === completedCount;

  return {
    stages,
    statuses,
    priorities,
    choices,
    urgent: {
      deadlineCritical,
      deadlineUrgent,
      blocked,
      overdue,
    },
    scheduled: {
      today: scheduledToday,
      thisWeek: scheduledThisWeek,
      thisMonth: scheduledThisMonth,
    },
    avgStageDurations,
    overall: {
      totalItems: items.length,
      avgProductionTimeHours: allCompletedTimesMeasured ? average(completedDurations) : null,
      completionRate: items.length > 0 ? (completedCount / items.length) * 100 : 0,
      avgPriorityScore: allPrioritiesMeasured ? average(priorityScores) : null,
    },
    generatedAt: new Date().toISOString(),
  };
}

export function subscribeToProductionMetricsChanges(onChange: () => void): () => void {
  const channel = createRealtimeChannel("production-metrics-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "production_queue" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "production_stages" },
      onChange,
    )
    .subscribe();

  return () => {
    void removeRealtimeChannel(channel);
  };
}
