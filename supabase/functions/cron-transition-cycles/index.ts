/**
 * Cron Job: Cycle Transition
 *
 * Runs daily at 00:01 Bahia Time to transition cycles from 'open' to 'production'
 * status when their open period ends, and create new cycles for upcoming periods.
 *
 * Requirements:
 * - 2.3: Transition cycle status from "open" to "production" when cutoff is reached
 * - 2.7: Record status transition timestamps in Bahia Time
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  logCronStart,
  logCronSuccess,
  logCronError,
} from "../_shared/cron-logger.ts";
import { nowInBahia } from "../_shared/timezone.ts";
import { requireSharedSecret } from "../_shared/secrets.ts";
import {
  calculateNthBusinessDayOfMonth,
  getHolidayDatesForMonth,
} from "../_shared/business-days.ts";

interface Cycle {
  id: string;
  cycle_number: 1 | 2;
  month: number;
  year: number;
  open_start: string;
  open_end: string;
  production_start: string;
  production_end: string;
  shipping_date: string;
  status: "open" | "production" | "shipping" | "completed";
  status_changed_at: string | null;
  capacity: number | null;
  used_capacity: number | null;
}

/**
 * Creates a new cycle for an upcoming period if it doesn't exist
 */
async function createCycleIfNeeded(
  supabase: any,
  cycleNumber: 1 | 2,
  month: number,
  year: number,
): Promise<boolean> {
  // Check if cycle already exists
  const { data: existingCycle, error: checkError } = await supabase
    .from("cycles")
    .select("id")
    .eq("cycle_number", cycleNumber)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (checkError) {
    throw new Error(
      `Failed to check for existing cycle: ${checkError.message}`,
    );
  }

  if (existingCycle) {
    console.log(`Cycle ${cycleNumber} for ${month}/${year} already exists`);
    return false;
  }

  // Calculate cycle dates
  let openStart: Date;
  let openEnd: Date;
  let productionStart: Date;
  let productionEnd: Date;
  let shippingDate: Date;

  if (cycleNumber === 1) {
    // Cycle 1: days 1-15
    openStart = new Date(year, month - 1, 1, 0, 0, 0);
    openEnd = new Date(year, month - 1, 15, 23, 59, 59);
    productionStart = new Date(year, month - 1, 16, 0, 0, 0);
    productionEnd = new Date(year, month - 1, 28, 23, 59, 59); // Approximate end of month

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const holidayDates = await getHolidayDatesForMonth(supabase, nextYear, nextMonth);
    shippingDate = calculateNthBusinessDayOfMonth(nextYear, nextMonth, 5, holidayDates);
  } else {
    // Cycle 2: days 16-end of month
    openStart = new Date(year, month - 1, 16, 0, 0, 0);

    // Get last day of month
    const lastDay = new Date(year, month, 0).getDate();
    openEnd = new Date(year, month - 1, lastDay, 23, 59, 59);

    // Production starts on 1st of next month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    productionStart = new Date(nextYear, nextMonth - 1, 1, 0, 0, 0);
    productionEnd = new Date(nextYear, nextMonth - 1, 14, 23, 59, 59);

    const secondNextMonth = nextMonth === 12 ? 1 : nextMonth + 1;
    const secondNextYear = nextMonth === 12 ? nextYear + 1 : nextYear;
    const holidayDates = await getHolidayDatesForMonth(
      supabase,
      secondNextYear,
      secondNextMonth,
    );
    shippingDate = calculateNthBusinessDayOfMonth(
      secondNextYear,
      secondNextMonth,
      5,
      holidayDates,
    );
  }

  // Create the cycle
  const { data: newCycle, error: createError } = await supabase
    .from("cycles")
    .insert({
      cycle_number: cycleNumber,
      month,
      year,
      name: `${year}-${String(month).padStart(2, "0")}-cycle-${cycleNumber}`,
      open_start: openStart.toISOString(),
      open_end: openEnd.toISOString(),
      production_start: productionStart.toISOString(),
      production_end: productionEnd.toISOString(),
      sales_start_date: openStart.toISOString().split("T")[0],
      sales_end_date: openEnd.toISOString().split("T")[0],
      production_start_date: productionStart.toISOString().split("T")[0],
      production_end_date: productionEnd.toISOString().split("T")[0],
      shipping_date: shippingDate.toISOString().split("T")[0], // Date only
      shipping_start_date: shippingDate.toISOString().split("T")[0],
      shipping_end_date: shippingDate.toISOString().split("T")[0],
      status: "open",
      capacity: 100,
      used_capacity: 0,
      capacity_max: 100,
      capacity_current: 0,
      capacity_limit: 100,
      reserved_capacity: 0,
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create cycle: ${createError.message}`);
  }

  console.log(
    `Created cycle ${cycleNumber} for ${month}/${year} (ID: ${newCycle.id})`,
  );
  return true;
}

Deno.serve(async (req) => {
  let logId: string | null = null;

  try {
    const forbidden = requireSharedSecret(req, "CRON_SECRET", "x-cron-secret");
    if (forbidden) return forbidden;

    // Start logging
    logId = await logCronStart("cron-transition-cycles");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current Bahia time
    const bahiaTime = nowInBahia();
    const currentDate = bahiaTime.toISOString();

    console.log(`Cron job running at ${currentDate} (Bahia time)`);

    // Find cycles with status 'open' where open_end <= today
    const { data: cyclesToTransition, error: cyclesError } = await supabase
      .from("cycles")
      .select("*")
      .eq("status", "open")
      .lte("open_end", currentDate);

    if (cyclesError) {
      throw new Error(`Failed to fetch cycles: ${cyclesError.message}`);
    }

    if (!cyclesToTransition || cyclesToTransition.length === 0) {
      console.log("No cycles to transition");
    }

    let cyclesTransitioned = 0;
    const transitionedCycles: Array<{
      id: string;
      cycleNumber: number;
      month: number;
      year: number;
    }> = [];
    const errors: Array<{ cycleId: string; error: string }> = [];

    // Process each cycle that needs transition
    if (cyclesToTransition && cyclesToTransition.length > 0) {
      console.log(`Found ${cyclesToTransition.length} cycle(s) to transition`);

      for (const cycle of cyclesToTransition as Cycle[]) {
        try {
          console.log(
            `Transitioning cycle ${cycle.cycle_number} for ${cycle.month}/${cycle.year} (ID: ${cycle.id})`,
          );

          // Transition to 'production' status
          const { error: updateError } = await supabase
            .from("cycles")
            .update({
              status: "production",
              status_changed_at: bahiaTime.toISOString(),
              updated_at: bahiaTime.toISOString(),
            })
            .eq("id", cycle.id);

          if (updateError) {
            throw new Error(`Failed to update cycle: ${updateError.message}`);
          }

          console.log(
            `Cycle ${cycle.cycle_number} for ${cycle.month}/${cycle.year} transitioned to production`,
          );
          cyclesTransitioned++;
          transitionedCycles.push({
            id: cycle.id,
            cycleNumber: cycle.cycle_number,
            month: cycle.month,
            year: cycle.year,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(`Error transitioning cycle ${cycle.id}:`, error);

          errors.push({
            cycleId: cycle.id,
            error: errorMessage,
          });
          // Continue processing other cycles
        }
      }
    }

    // Create new cycles for upcoming periods if needed
    const currentMonth = bahiaTime.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = bahiaTime.getFullYear();
    const currentDay = bahiaTime.getDate();

    let cyclesCreated = 0;
    const createdCycles: Array<{
      cycleNumber: number;
      month: number;
      year: number;
    }> = [];

    try {
      // If we're in the first half of the month, ensure Cycle 2 exists for current month
      if (currentDay <= 15) {
        const created = await createCycleIfNeeded(
          supabase,
          2,
          currentMonth,
          currentYear,
        );
        if (created) {
          cyclesCreated++;
          createdCycles.push({
            cycleNumber: 2,
            month: currentMonth,
            year: currentYear,
          });
        }
      }

      // Always ensure Cycle 1 exists for next month
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

      const created1 = await createCycleIfNeeded(
        supabase,
        1,
        nextMonth,
        nextYear,
      );
      if (created1) {
        cyclesCreated++;
        createdCycles.push({
          cycleNumber: 1,
          month: nextMonth,
          year: nextYear,
        });
      }

      // Ensure Cycle 2 exists for next month
      const created2 = await createCycleIfNeeded(
        supabase,
        2,
        nextMonth,
        nextYear,
      );
      if (created2) {
        cyclesCreated++;
        createdCycles.push({
          cycleNumber: 2,
          month: nextMonth,
          year: nextYear,
        });
      }

      // Also create cycles for the month after next
      const secondNextMonth = nextMonth === 12 ? 1 : nextMonth + 1;
      const secondNextYear = nextMonth === 12 ? nextYear + 1 : nextYear;

      const created3 = await createCycleIfNeeded(
        supabase,
        1,
        secondNextMonth,
        secondNextYear,
      );
      if (created3) {
        cyclesCreated++;
        createdCycles.push({
          cycleNumber: 1,
          month: secondNextMonth,
          year: secondNextYear,
        });
      }

      const created4 = await createCycleIfNeeded(
        supabase,
        2,
        secondNextMonth,
        secondNextYear,
      );
      if (created4) {
        cyclesCreated++;
        createdCycles.push({
          cycleNumber: 2,
          month: secondNextMonth,
          year: secondNextYear,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error creating new cycles:", error);

      errors.push({
        cycleId: "cycle-creation",
        error: errorMessage,
      });
    }

    // Log success with details
    await logCronSuccess(logId, {
      cyclesTransitioned,
      transitionedCycles,
      cyclesCreated,
      createdCycles,
      errors: errors.length > 0 ? errors : undefined,
      currentDate,
    });

    console.log(
      `Cron job completed: ${cyclesTransitioned} cycle(s) transitioned, ${cyclesCreated} cycle(s) created`,
    );
    if (errors.length > 0) {
      console.warn(`${errors.length} error(s) occurred during processing`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cyclesTransitioned,
        transitionedCycles,
        cyclesCreated,
        createdCycles,
        errors: errors.length > 0 ? errors : undefined,
        currentDate,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Cron job failed:", error);

    // Log error if we have a log ID
    if (logId) {
      try {
        await logCronError(
          logId,
          error instanceof Error ? error : new Error(String(error)),
        );
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
