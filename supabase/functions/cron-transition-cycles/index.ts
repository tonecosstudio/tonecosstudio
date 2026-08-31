/**
 * Cron Job: Cycle Transition
 *
 * Transitions open cycles whose persisted deadline has passed and creates the
 * upcoming cycles. Instants are stored as real timestamptz values; Bahia is used
 * only to derive business calendar dates.
 */

import {
  logCronError,
  logCronStart,
  logCronSuccess,
} from "../_shared/cron-logger.ts";
import { requireRateLimitedSharedSecret } from "../_shared/secret-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import {
  calculateNthBusinessDayOfMonth,
  getHolidayDatesForMonth,
} from "../_shared/business-days.ts";

const BAHIA_TIMEZONE = "America/Bahia";
const BAHIA_OFFSET = "-03:00";

interface Cycle {
  id: string;
  cycle_number: 1 | 2;
  month: number;
  year: number;
}

interface CycleRuntimeSettings {
  capacity: number;
  shippingBusinessDay: number;
}

function getBahiaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BAHIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const read = (type: "year" | "month" | "day") => {
    const value = Number(parts.find((part) => part.type === type)?.value);
    if (!Number.isInteger(value)) {
      throw new Error(`Unable to resolve Bahia ${type}`);
    }
    return value;
  };

  return { year: read("year"), month: read("month"), day: read("day") };
}

function normalizedDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function dateKey(year: number, month: number, day: number): string {
  const normalized = normalizedDateParts(year, month, day);
  return `${normalized.year}-${String(normalized.month).padStart(2, "0")}-${String(normalized.day).padStart(2, "0")}`;
}

function bahiaTimestamp(
  year: number,
  month: number,
  day: number,
  time: "00:00:00.000" | "23:59:59.999",
): string {
  return `${dateKey(year, month, day)}T${time}${BAHIA_OFFSET}`;
}

function nextMonth(year: number, month: number) {
  return month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 };
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

async function getConfiguredCycleSettings(supabase: any): Promise<CycleRuntimeSettings> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", ["monthly_production_limit", "shipping_business_days"]);

  if (error) {
    throw new Error(`Failed to load cycle settings: ${error.message}`);
  }

  const settings = Object.fromEntries((data || []).map((row: any) => [row.key, row.value]));
  const capacity = Number(settings.monthly_production_limit);
  const shippingBusinessDay = Number(settings.shipping_business_days);

  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) {
    throw new Error("PRODUCTION_LIMIT_NOT_CONFIGURED");
  }
  if (!Number.isInteger(shippingBusinessDay) || shippingBusinessDay < 1 || shippingBusinessDay > 31) {
    throw new Error("SHIPPING_BUSINESS_DAYS_NOT_CONFIGURED");
  }

  return { capacity, shippingBusinessDay };
}

async function shippingDateForMonth(
  supabase: any,
  year: number,
  month: number,
  nthBusinessDay: number,
): Promise<string> {
  const holidays = await getHolidayDatesForMonth(supabase, year, month);
  return calculateNthBusinessDayOfMonth(year, month, nthBusinessDay, holidays)
    .toISOString()
    .split("T")[0];
}

async function createCycleIfNeeded(
  supabase: any,
  cycleNumber: 1 | 2,
  month: number,
  year: number,
  settings: CycleRuntimeSettings,
): Promise<boolean> {
  const { data: existingCycle, error: checkError } = await supabase
    .from("cycles")
    .select("id")
    .eq("cycle_number", cycleNumber)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (checkError) {
    throw new Error(`Failed to check existing cycle: ${checkError.message}`);
  }
  if (existingCycle) return false;

  let openStart: string;
  let openEnd: string;
  let productionStart: string;
  let productionEnd: string;
  let shippingYear: number;
  let shippingMonth: number;

  if (cycleNumber === 1) {
    openStart = bahiaTimestamp(year, month, 1, "00:00:00.000");
    openEnd = bahiaTimestamp(year, month, 15, "23:59:59.999");
    productionStart = bahiaTimestamp(year, month, 16, "00:00:00.000");
    productionEnd = bahiaTimestamp(year, month, 28, "23:59:59.999");
    ({ year: shippingYear, month: shippingMonth } = nextMonth(year, month));
  } else {
    openStart = bahiaTimestamp(year, month, 16, "00:00:00.000");
    openEnd = bahiaTimestamp(
      year,
      month,
      lastDayOfMonth(year, month),
      "23:59:59.999",
    );

    const productionMonth = nextMonth(year, month);
    productionStart = bahiaTimestamp(
      productionMonth.year,
      productionMonth.month,
      1,
      "00:00:00.000",
    );
    productionEnd = bahiaTimestamp(
      productionMonth.year,
      productionMonth.month,
      14,
      "23:59:59.999",
    );
    ({ year: shippingYear, month: shippingMonth } = nextMonth(
      productionMonth.year,
      productionMonth.month,
    ));
  }

  const shippingDate = await shippingDateForMonth(
    supabase,
    shippingYear,
    shippingMonth,
    settings.shippingBusinessDay,
  );

  const { data: newCycle, error: createError } = await supabase
    .from("cycles")
    .insert({
      cycle_number: cycleNumber,
      month,
      year,
      name: `${year}-${String(month).padStart(2, "0")}-cycle-${cycleNumber}`,
      open_start: openStart,
      open_end: openEnd,
      production_start: productionStart,
      production_end: productionEnd,
      sales_start_date: openStart.slice(0, 10),
      sales_end_date: openEnd.slice(0, 10),
      production_start_date: productionStart.slice(0, 10),
      production_end_date: productionEnd.slice(0, 10),
      shipping_date: shippingDate,
      shipping_start_date: shippingDate,
      shipping_end_date: shippingDate,
      status: "open",
      capacity: settings.capacity,
      used_capacity: 0,
      capacity_max: settings.capacity,
      capacity_current: 0,
      capacity_limit: settings.capacity,
      reserved_capacity: 0,
    })
    .select("id")
    .single();

  if (createError || !newCycle) {
    throw new Error(`Failed to create cycle: ${createError?.message || "no row returned"}`);
  }

  return true;
}

Deno.serve(async (req) => {
  let logId: string | null = null;

  try {
    const forbidden = await requireRateLimitedSharedSecret(
      req,
      "CRON_SECRET",
      "x-cron-secret",
      "cron-transition-cycles",
    );
    if (forbidden) return forbidden;

    logId = await logCronStart("cron-transition-cycles");

    const supabase = getServiceClient();
    const now = new Date();
    const currentInstant = now.toISOString();
    const bahiaToday = getBahiaDateParts(now);

    const { data: cyclesToTransition, error: cyclesError } = await supabase
      .from("cycles")
      .select("id, cycle_number, month, year")
      .eq("status", "open")
      .lte("open_end", currentInstant);

    if (cyclesError) {
      throw new Error(`Failed to fetch cycles: ${cyclesError.message}`);
    }

    let cyclesTransitioned = 0;
    const transitionedCycles: Array<{
      id: string;
      cycleNumber: number;
      month: number;
      year: number;
    }> = [];
    const errors: Array<{ cycleId: string; error: string }> = [];

    for (const cycle of (cyclesToTransition || []) as Cycle[]) {
      try {
        const { data: updated, error: updateError } = await supabase
          .from("cycles")
          .update({
            status: "production",
            status_changed_at: currentInstant,
            updated_at: currentInstant,
          })
          .eq("id", cycle.id)
          .eq("status", "open")
          .select("id")
          .maybeSingle();

        if (updateError) {
          throw new Error(`Failed to update cycle: ${updateError.message}`);
        }
        if (!updated) continue;

        cyclesTransitioned += 1;
        transitionedCycles.push({
          id: cycle.id,
          cycleNumber: cycle.cycle_number,
          month: cycle.month,
          year: cycle.year,
        });
      } catch (error) {
        errors.push({
          cycleId: cycle.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const settings = await getConfiguredCycleSettings(supabase);
    let cyclesCreated = 0;
    const createdCycles: Array<{
      cycleNumber: number;
      month: number;
      year: number;
    }> = [];

    const ensureCycle = async (cycleNumber: 1 | 2, month: number, year: number) => {
      if (await createCycleIfNeeded(supabase, cycleNumber, month, year, settings)) {
        cyclesCreated += 1;
        createdCycles.push({ cycleNumber, month, year });
      }
    };

    if (bahiaToday.day <= 15) {
      await ensureCycle(2, bahiaToday.month, bahiaToday.year);
    }

    const firstFuture = nextMonth(bahiaToday.year, bahiaToday.month);
    await ensureCycle(1, firstFuture.month, firstFuture.year);
    await ensureCycle(2, firstFuture.month, firstFuture.year);

    const secondFuture = nextMonth(firstFuture.year, firstFuture.month);
    await ensureCycle(1, secondFuture.month, secondFuture.year);
    await ensureCycle(2, secondFuture.month, secondFuture.year);

    await logCronSuccess(logId, {
      cyclesTransitioned,
      transitionedCycles,
      cyclesCreated,
      createdCycles,
      errors: errors.length > 0 ? errors : undefined,
      executedAt: currentInstant,
      bahiaDate: dateKey(bahiaToday.year, bahiaToday.month, bahiaToday.day),
      configuredCapacity: settings.capacity,
      configuredShippingBusinessDay: settings.shippingBusinessDay,
    });

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        cyclesTransitioned,
        transitionedCycles,
        cyclesCreated,
        createdCycles,
        errors: errors.length > 0 ? errors : undefined,
        executedAt: currentInstant,
      }),
      {
        status: errors.length === 0 ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    if (logId) {
      try {
        await logCronError(
          logId,
          error instanceof Error ? error : new Error(String(error)),
        );
      } catch (logError) {
        console.error("Failed to log cron error", logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
