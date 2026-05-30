import { supabase } from "@/integrations/supabase/client";
import { BATCH } from "@/config/constants";
import { resolveCycleCapacity } from "@/lib/cycle-capacity";
import {
  getOrCreateDeliveryCycleRpc,
  transitionDeliveryCycleStatusRpc,
} from "@/services/delivery-cycle-mutations-service";
import { timezoneService } from "./timezoneService";

export type CycleStatus =
  | "open"
  | "active"
  | "sales"
  | "production"
  | "shipping"
  | "completed";

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

class CycleService {
  private normalizeCycle(row: Record<string, unknown>): Cycle {
    const capacity = resolveCycleCapacity(row);
    const openStart = String(
      row.open_start ??
        row.sales_start_date ??
        row.created_at ??
        new Date().toISOString(),
    );
    const openEnd = String(
      row.open_end ?? row.sales_end_date ?? row.cutoff_date ?? openStart,
    );
    const productionStart = String(
      row.production_start ?? row.production_start_date ?? openEnd,
    );
    const productionEnd = String(
      row.production_end ?? row.production_end_date ?? productionStart,
    );
    const shippingDate = String(
      row.shipping_date ?? row.shipping_start_date ?? productionEnd,
    );

    return {
      ...(row as unknown as Cycle),
      capacity: capacity.capacity,
      used_capacity: capacity.usedCapacity,
      cycle_number: Number(row.cycle_number ?? 1) as 1 | 2,
      open_start: openStart,
      open_end: openEnd,
      production_start: productionStart,
      production_end: productionEnd,
      shipping_date: shippingDate,
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
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Erro ao buscar ciclo atual: ${error.message}`);
    }

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
    if (existing) {
      return existing;
    }

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

    if (!cycles || cycles.length === 0) {
      return;
    }

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
        if (currentMonth === 1) {
          currentYear++;
        }
      }
    }

    return cycles;
  }
}

export const cycleService = new CycleService();
