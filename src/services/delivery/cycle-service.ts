import { BATCH } from "@/config/constants";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { resolveCycleCapacity } from "@/lib/cycle-capacity";
import {
  getOrCreateDeliveryCycleRpc,
  transitionDeliveryCycleStatusRpc,
} from "@/services/delivery/delivery-cycle-mutations-service";
import { timezoneService } from "@/services/system/timezone-service";

export type CycleStatus =
  | "open"
  | "active"
  | "sales"
  | "production"
  | "shipping"
  | "completed"
  | "cancelled";

type CycleRow = Database["public"]["Tables"]["cycles"]["Row"];

const CYCLE_STATUS_SET = new Set<CycleStatus>([
  "open",
  "active",
  "sales",
  "production",
  "shipping",
  "completed",
  "cancelled",
]);

export interface Cycle {
  id: string;
  created_at: string;
  updated_at: string;
  capacity: number;
  used_capacity: number;
  cycle_number: 1 | 2;
  month: number;
  year: number;
  open_start: string;
  open_end: string;
  production_start: string;
  production_end: string;
  shipping_date: string;
  status: CycleStatus;
  status_changed_at: string | null;
  capacity_max: number;
  capacity_current: number;
}

export interface CycleCapacity {
  current: number;
  max: number;
  available: number;
}

function requireDateValue(values: Array<string | null | undefined>, label: string): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value))) {
      return value;
    }
  }

  throw new Error(`Cycle ${label} is missing or invalid`);
}

function requireCycleNumber(value: number): 1 | 2 {
  if (value !== 1 && value !== 2) {
    throw new Error("Cycle cycle_number is missing or invalid");
  }
  return value;
}

function requireMonth(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    throw new Error("Cycle month is missing or invalid");
  }
  return value;
}

function requireYear(value: number): number {
  if (!Number.isInteger(value) || value < 2020 || value > 2100) {
    throw new Error("Cycle year is missing or invalid");
  }
  return value;
}

function requireCycleStatus(value: string): CycleStatus {
  if (!CYCLE_STATUS_SET.has(value as CycleStatus)) {
    throw new Error(`Cycle status is invalid: ${value}`);
  }
  return value as CycleStatus;
}

class CycleService {
  private normalizeCycle(row: CycleRow): Cycle {
    const cycleNumber = requireCycleNumber(row.cycle_number);
    const month = requireMonth(row.month);
    const year = requireYear(row.year);
    const status = requireCycleStatus(row.status);
    const capacity = resolveCycleCapacity(row, `Cycle ${row.id}`);
    const openStart = requireDateValue(
      [row.open_start, row.sales_start_date],
      "open_start",
    );
    const openEnd = requireDateValue(
      [row.open_end, row.sales_end_date, row.cutoff_date],
      "open_end",
    );
    const productionStart = requireDateValue(
      [row.production_start, row.production_start_date],
      "production_start",
    );
    const productionEnd = requireDateValue(
      [row.production_end, row.production_end_date],
      "production_end",
    );
    const shippingDate = requireDateValue(
      [row.shipping_date, row.shipping_start_date],
      "shipping_date",
    );

    const openStartMs = Date.parse(openStart);
    const openEndMs = Date.parse(openEnd);
    const productionStartMs = Date.parse(productionStart);
    const productionEndMs = Date.parse(productionEnd);

    if (
      openEndMs < openStartMs ||
      productionStartMs < openStartMs ||
      productionEndMs < productionStartMs
    ) {
      throw new Error(`Cycle ${row.id} has inconsistent operational dates`);
    }

    return {
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      capacity: capacity.capacity,
      used_capacity: capacity.usedCapacity,
      cycle_number: cycleNumber,
      month,
      year,
      open_start: openStart,
      open_end: openEnd,
      production_start: productionStart,
      production_end: productionEnd,
      shipping_date: shippingDate,
      status,
      status_changed_at: row.status_changed_at,
      capacity_max: capacity.capacity,
      capacity_current: capacity.usedCapacity,
    };
  }

  identifyCycleNumber(date: Date): 1 | 2 {
    const dayOfMonth = timezoneService.getDayOfMonth(date);
    return dayOfMonth <= BATCH.CYCLE1_END_DAY ? 1 : 2;
  }

  async getCurrentCycle(date?: Date): Promise<Cycle | null> {
    const referenceDate = date || timezoneService.getCurrentTime();
    const systemDate = timezoneService.toSystemTimezone(referenceDate);

    const cycleNumber = this.identifyCycleNumber(systemDate);
    const month = timezoneService.getMonth(systemDate);
    const year = timezoneService.getYear(systemDate);

    const { data, error } = await supabase
      .from("cycles")
      .select("*")
      .eq("cycle_number", cycleNumber)
      .eq("month", month)
      .eq("year", year)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Erro ao buscar ciclo atual: ${error.message}`);
    }

    return data ? this.normalizeCycle(data) : null;
  }

  async createCycleIfNotExists(
    cycleNumber: 1 | 2,
    month: number,
    year: number,
  ): Promise<Cycle> {
    const cycle = await getOrCreateDeliveryCycleRpc<CycleRow>(
      cycleNumber,
      month,
      year,
    );

    return this.normalizeCycle(cycle);
  }

  async getOrCreateCurrentCycle(): Promise<Cycle> {
    const now = timezoneService.getCurrentTime();
    const systemDate = timezoneService.toSystemTimezone(now);

    const cycleNumber = this.identifyCycleNumber(systemDate);
    const month = timezoneService.getMonth(systemDate);
    const year = timezoneService.getYear(systemDate);

    const existing = await this.getCurrentCycle(now);
    if (existing) return existing;

    return this.createCycleIfNotExists(cycleNumber, month, year);
  }

  async transitionCycleStatus(cycleId: string, newStatus: CycleStatus): Promise<void> {
    await transitionDeliveryCycleStatusRpc<CycleRow>(cycleId, newStatus);
  }

  async checkAndTransitionCycles(): Promise<void> {
    const now = timezoneService.getCurrentTime();

    const { data: cycles, error } = await supabase
      .from("cycles")
      .select("*")
      .neq("status", "completed")
      .neq("status", "cancelled");

    if (error) {
      throw new Error(`Erro ao buscar ciclos: ${error.message}`);
    }

    if (!cycles?.length) return;

    for (const cycle of cycles) {
      const normalized = this.normalizeCycle(cycle);
      const openEnd = new Date(normalized.open_end);
      const productionEnd = new Date(normalized.production_end);
      const shippingDate = new Date(normalized.shipping_date);

      if ((normalized.status === "open" || normalized.status === "sales") && now > openEnd) {
        await this.transitionCycleStatus(normalized.id, "production");
      } else if (normalized.status === "production" && now > productionEnd) {
        await this.transitionCycleStatus(normalized.id, "shipping");
      } else if (normalized.status === "shipping" && now > shippingDate) {
        await this.transitionCycleStatus(normalized.id, "completed");
      }
    }
  }

  async checkCapacity(cycleId: string): Promise<CycleCapacity> {
    const { data, error } = await supabase
      .from("cycles")
      .select("capacity, used_capacity, capacity_max, capacity_current, capacity_limit, reserved_capacity")
      .eq("id", cycleId)
      .single();

    if (error) {
      throw new Error(`Erro ao verificar capacidade: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Ciclo nao encontrado: ${cycleId}`);
    }

    const capacity = resolveCycleCapacity(data, `Cycle ${cycleId}`);

    return {
      current: capacity.usedCapacity,
      max: capacity.capacity,
      available: capacity.available,
    };
  }

  async getCycleById(cycleId: string): Promise<Cycle> {
    const { data, error } = await supabase
      .from("cycles")
      .select("*")
      .eq("id", cycleId)
      .single();

    if (error) {
      throw new Error(`Erro ao buscar ciclo: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Ciclo nao encontrado: ${cycleId}`);
    }

    return this.normalizeCycle(data);
  }

  async getCyclesByMonth(month: number, year: number): Promise<Cycle[]> {
    const { data, error } = await supabase
      .from("cycles")
      .select("*")
      .eq("month", month)
      .eq("year", year)
      .order("cycle_number", { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar ciclos: ${error.message}`);
    }

    return (data ?? []).map((cycle) => this.normalizeCycle(cycle));
  }

  async getNextCycles(count: number, startDate?: Date): Promise<Cycle[]> {
    if (!Number.isInteger(count) || count < 1 || count > 24) {
      throw new Error("Quantidade de ciclos invalida");
    }

    const referenceDate = startDate || timezoneService.getCurrentTime();
    const systemDate = timezoneService.toSystemTimezone(referenceDate);

    let currentMonth = timezoneService.getMonth(systemDate);
    let currentYear = timezoneService.getYear(systemDate);
    let currentCycleNumber = this.identifyCycleNumber(systemDate);

    const cycles: Cycle[] = [];

    for (let i = 0; i < count; i++) {
      const cycle = await this.createCycleIfNotExists(
        currentCycleNumber,
        currentMonth,
        currentYear,
      );

      cycles.push(cycle);

      if (currentCycleNumber === 1) {
        currentCycleNumber = 2;
      } else {
        currentCycleNumber = 1;
        currentMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        if (currentMonth === 1) currentYear += 1;
      }
    }

    return cycles;
  }
}

export const cycleService = new CycleService();
