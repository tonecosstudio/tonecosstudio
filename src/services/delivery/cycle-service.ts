import { supabase } from "@/integrations/supabase/client";
import { BATCH } from "@/config/constants";
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
  | "completed";

const CYCLE_STATUS_SET = new Set<CycleStatus>([
  "open",
  "active",
  "sales",
  "production",
  "shipping",
  "completed",
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

interface CycleCapacityRpcClient {
  rpc(
    name: "reserve_capacity" | "release_capacity",
    args: { p_cycle_id: string; p_quantity: number },
  ): Promise<{ error: { message: string } | null }>;
}

const cycleCapacityRpc = supabase as unknown as CycleCapacityRpcClient;

function requireString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Cycle ${field} is missing or invalid`);
  }
  return value;
}

function requireInteger(
  row: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
): number {
  const value = Number(row[field]);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Cycle ${field} is missing or invalid`);
  }
  return value;
}

function requireDateValue(
  row: Record<string, unknown>,
  fields: string[],
  label: string,
): string {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value))) {
      return value;
    }
  }

  throw new Error(`Cycle ${label} is missing or invalid`);
}

class CycleService {
  private normalizeCycle(row: Record<string, unknown>): Cycle {
    const id = requireString(row, "id");
    const cycleNumber = requireInteger(row, "cycle_number", 1, 2) as 1 | 2;
    const month = requireInteger(row, "month", 1, 12);
    const year = requireInteger(row, "year", 2020, 2100);
    const statusValue = requireString(row, "status");

    if (!CYCLE_STATUS_SET.has(statusValue as CycleStatus)) {
      throw new Error(`Cycle status is invalid: ${statusValue}`);
    }

    const capacity = resolveCycleCapacity(row, `Cycle ${id}`);
    const openStart = requireDateValue(row, ["open_start", "sales_start_date"], "open_start");
    const openEnd = requireDateValue(
      row,
      ["open_end", "sales_end_date", "cutoff_date"],
      "open_end",
    );
    const productionStart = requireDateValue(
      row,
      ["production_start", "production_start_date"],
      "production_start",
    );
    const productionEnd = requireDateValue(
      row,
      ["production_end", "production_end_date"],
      "production_end",
    );
    const shippingDate = requireDateValue(
      row,
      ["shipping_date", "shipping_start_date"],
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
      throw new Error(`Cycle ${id} has inconsistent operational dates`);
    }

    return {
      ...(row as unknown as Cycle),
      id,
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
      status: statusValue as CycleStatus,
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

    if (!data) return null;
    return this.normalizeCycle(data);
  }

  async createCycleIfNotExists(
    cycleNumber: 1 | 2,
    month: number,
    year: number,
  ): Promise<Cycle> {
    const cycle = await getOrCreateDeliveryCycleRpc<Record<string, unknown>>(
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

  async transitionCycleStatus(
    cycleId: string,
    newStatus: CycleStatus,
  ): Promise<void> {
    await transitionDeliveryCycleStatusRpc<Cycle>(cycleId, newStatus);
  }

  async checkAndTransitionCycles(): Promise<void> {
    const now = timezoneService.getCurrentTime();

    const { data: cycles, error } = await supabase
      .from("cycles")
      .select("*")
      .neq("status", "completed");

    if (error) {
      throw new Error(`Erro ao buscar ciclos: ${error.message}`);
    }

    if (!cycles || cycles.length === 0) return;

    for (const cycle of cycles) {
      const normalized = this.normalizeCycle(cycle);
      const openEnd = new Date(normalized.open_end);
      const productionEnd = new Date(normalized.production_end);
      const shippingDate = new Date(normalized.shipping_date);

      if (normalized.status === "open" && now > openEnd) {
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
      .select("capacity, used_capacity")
      .eq("id", cycleId)
      .single();

    if (error) {
      throw new Error(`Erro ao verificar capacidade: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Ciclo não encontrado: ${cycleId}`);
    }

    const capacity = resolveCycleCapacity(data, `Cycle ${cycleId}`);

    return {
      current: capacity.usedCapacity,
      max: capacity.capacity,
      available: capacity.available,
    };
  }

  async incrementCapacity(cycleId: string): Promise<void> {
    const { error } = await cycleCapacityRpc.rpc("reserve_capacity", {
      p_cycle_id: cycleId,
      p_quantity: 1,
    });

    if (error) {
      throw new Error(`Erro ao incrementar capacidade: ${error.message}`);
    }
  }

  async decrementCapacity(cycleId: string): Promise<void> {
    const { error } = await cycleCapacityRpc.rpc("release_capacity", {
      p_cycle_id: cycleId,
      p_quantity: 1,
    });

    if (error) {
      throw new Error(`Erro ao decrementar capacidade: ${error.message}`);
    }
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
      throw new Error(`Ciclo não encontrado: ${cycleId}`);
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

    return ((data || []) as Array<Record<string, unknown>>).map((cycle) =>
      this.normalizeCycle(cycle),
    );
  }

  async getNextCycles(count: number, startDate?: Date): Promise<Cycle[]> {
    if (!Number.isInteger(count) || count < 1 || count > 24) {
      throw new Error("Quantidade de ciclos inválida");
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
