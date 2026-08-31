/**
 * Capacity Service
 *
 * Handles production capacity operations including availability checks,
 * capacity reservation, and capacity release for cycles.
 *
 * Requirements: 3.2, 3.3, 3.5, 3.6
 */

import { supabase } from "@/integrations/supabase/client";
import { resolveCycleCapacity } from "@/lib/cycle-capacity";
import log from "@/lib/logger";

interface CapacityRpcError {
  message: string;
}

interface CapacityRpcClient {
  rpc(
    name: "check_capacity_available",
    args: { p_cycle_id: string; p_quantity: number },
  ): Promise<{ data: boolean | null; error: CapacityRpcError | null }>;
  rpc(
    name: "reserve_capacity",
    args: { p_cycle_id: string; p_quantity: number },
  ): Promise<{ data: unknown; error: CapacityRpcError | null }>;
  rpc(
    name: "release_capacity",
    args: { p_cycle_id: string; p_quantity: number },
  ): Promise<{ data: unknown; error: CapacityRpcError | null }>;
}

interface CurrentCycleRow {
  cycle_number: 1 | 2;
  month: number;
  year: number;
}

interface CycleCapacityRow {
  capacity: number | null;
  used_capacity: number | null;
}

const capacityRpc = supabase as unknown as CapacityRpcClient;

export interface CapacityUsage {
  max: number;
  current: number;
  available: number;
  percentage: number;
  reserved?: number;
}

export async function checkAvailability(
  cycleId: string,
  quantity: number,
): Promise<boolean> {
  const { data, error } = await capacityRpc.rpc("check_capacity_available", {
    p_cycle_id: cycleId,
    p_quantity: quantity,
  });

  if (error) {
    throw new Error(`Failed to check capacity availability: ${error.message}`);
  }

  return data === true;
}

export async function reserveCapacity(
  cycleId: string,
  quantity: number,
  referenceId: string,
): Promise<void> {
  const { error } = await capacityRpc.rpc("reserve_capacity", {
    p_cycle_id: cycleId,
    p_quantity: quantity,
  });

  if (error) {
    throw new Error(`Failed to reserve capacity: ${error.message}`);
  }

  log.info("Capacity reserved", { quantity, cycleId, referenceId });
}

export async function releaseCapacity(
  cycleId: string,
  quantity: number,
  referenceId: string,
): Promise<void> {
  const { error } = await capacityRpc.rpc("release_capacity", {
    p_cycle_id: cycleId,
    p_quantity: quantity,
  });

  if (error) {
    throw new Error(`Failed to release capacity: ${error.message}`);
  }

  log.info("Capacity released", { quantity, cycleId, referenceId });
}

export async function getCapacityUsage(
  cycleId: string,
): Promise<CapacityUsage> {
  const { data: cycle, error } = await supabase
    .from("cycles")
    .select("capacity, used_capacity")
    .eq("id", cycleId)
    .single<CycleCapacityRow>();

  if (error) {
    throw new Error(`Failed to get cycle capacity: ${error.message}`);
  }

  if (!cycle) {
    throw new Error(`Cycle not found: ${cycleId}`);
  }

  const capacity = resolveCycleCapacity(cycle, `Cycle ${cycleId}`);

  return {
    max: capacity.capacity,
    current: capacity.usedCapacity,
    available: capacity.available,
    percentage: capacity.percentage,
    reserved: 0,
  };
}

export interface SubscriptionCapacityCheck {
  available: boolean;
  firstUnavailableCycle?: {
    cycleNumber: 1 | 2;
    month: number;
    year: number;
    deliveryNumber: number;
  };
}

function calculateDeliveryCycles(
  entryCycle: { cycle_number: 1 | 2; month: number; year: number },
  deliveryCount: number,
): Array<{ cycleNumber: 1 | 2; month: number; year: number }> {
  const cycles: Array<{ cycleNumber: 1 | 2; month: number; year: number }> = [];

  let currentCycleNumber = entryCycle.cycle_number;
  let currentMonth = entryCycle.month;
  let currentYear = entryCycle.year;

  for (let i = 0; i < deliveryCount; i++) {
    if (currentCycleNumber === 1) {
      currentCycleNumber = 2;
    } else {
      currentCycleNumber = 1;
      currentMonth += 1;

      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear += 1;
      }
    }

    cycles.push({
      cycleNumber: currentCycleNumber,
      month: currentMonth,
      year: currentYear,
    });
  }

  return cycles;
}

export async function checkSubscriptionCapacity(
  deliveryCount: number,
): Promise<SubscriptionCapacityCheck> {
  if (!Number.isInteger(deliveryCount) || deliveryCount < 1) {
    throw new Error("Invalid subscription delivery count");
  }

  const { data: openCycle, error: cycleError } = await supabase
    .from("cycles")
    .select("cycle_number, month, year")
    .in("status", ["open", "active", "sales"])
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle<CurrentCycleRow>();

  if (cycleError) {
    throw new Error(`Failed to get current cycle: ${cycleError.message}`);
  }

  if (!openCycle) {
    return { available: false };
  }

  const deliveryCycles = calculateDeliveryCycles(openCycle, deliveryCount);

  for (let i = 0; i < deliveryCycles.length; i++) {
    const cycleInfo = deliveryCycles[i];
    const { data: existingCycle, error: existingCycleError } = await supabase
      .from("cycles")
      .select("id")
      .eq("cycle_number", cycleInfo.cycleNumber)
      .eq("month", cycleInfo.month)
      .eq("year", cycleInfo.year)
      .maybeSingle();

    if (existingCycleError) {
      throw new Error(`Failed to get delivery cycle: ${existingCycleError.message}`);
    }

    if (!existingCycle) {
      return {
        available: false,
        firstUnavailableCycle: {
          cycleNumber: cycleInfo.cycleNumber,
          month: cycleInfo.month,
          year: cycleInfo.year,
          deliveryNumber: i + 1,
        },
      };
    }

    const { data: hasCapacity, error } = await capacityRpc.rpc(
      "check_capacity_available",
      {
        p_cycle_id: existingCycle.id,
        p_quantity: 1,
      },
    );

    if (error) {
      throw new Error(`Failed to check capacity: ${error.message}`);
    }

    if (hasCapacity !== true) {
      return {
        available: false,
        firstUnavailableCycle: {
          cycleNumber: cycleInfo.cycleNumber,
          month: cycleInfo.month,
          year: cycleInfo.year,
          deliveryNumber: i + 1,
        },
      };
    }
  }

  return { available: true };
}
