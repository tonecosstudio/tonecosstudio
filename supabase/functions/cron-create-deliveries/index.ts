/**
 * Cron Job: Automatic Delivery Creation
 *
 * On the first Bahia calendar day of each month, creates the missing delivery
 * for active subscriptions using the canonical shipping-business-day setting.
 */

import {
  logCronError,
  logCronStart,
  logCronSuccess,
} from "../_shared/cron-logger.ts";
import { ADMIN_ACCESS_ROLES } from "../_shared/roles.ts";
import { requireRateLimitedSharedSecret } from "../_shared/secret-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { EmailService, escapeHtml, getEmailConfig, sanitizeEmailSubject } from "../_shared/email.ts";
import { getPublicBaseUrl } from "../_shared/public-url.ts";
import {
  calculateNthBusinessDayOfMonth,
  getHolidayDatesForMonth,
} from "../_shared/business-days.ts";

const BAHIA_TIMEZONE = "America/Bahia";
const BAHIA_OFFSET = "-03:00";

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  deliveries_total: number;
}

interface Delivery {
  id: string;
  delivery_number: number | null;
  expected_delivery_date: string | null;
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
    if (!Number.isInteger(value)) throw new Error(`Unable to resolve Bahia ${type}`);
    return value;
  };
  return { year: read("year"), month: read("month"), day: read("day") };
}

function getBahiaYearMonth(value: string): { year: number; month: number } | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = getBahiaDateParts(date);
  return { year: parts.year, month: parts.month };
}

function firstMissingDeliveryNumber(deliveries: Delivery[], total: number): number | null {
  if (!Number.isInteger(total) || total < 1) {
    throw new Error("Subscription deliveries_total is invalid");
  }

  const existing = new Set(
    deliveries
      .map((delivery) => delivery.delivery_number)
      .filter((value): value is number => Number.isInteger(value) && Number(value) > 0),
  );

  for (let number = 1; number <= total; number += 1) {
    if (!existing.has(number)) return number;
  }
  return null;
}

async function getShippingBusinessDay(supabase: any): Promise<number> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "shipping_business_days")
    .maybeSingle();

  if (error) throw new Error(`Failed to load shipping setting: ${error.message}`);

  const value = Number(data?.value);
  if (!Number.isInteger(value) || value < 1 || value > 31) {
    throw new Error("SHIPPING_BUSINESS_DAYS_NOT_CONFIGURED");
  }
  return value;
}

async function sendPartialFailureAlert(params: {
  logId: string;
  errors: Array<{ subscriptionId: string; error: string }>;
  subscriptionsProcessed: number;
  deliveriesCreated: number;
}): Promise<void> {
  const supabase = getServiceClient();
  const { data: admins, error } = await supabase
    .from("profiles")
    .select("email, full_name")
    .in("role", ADMIN_ACCESS_ROLES);

  if (error) throw new Error(`Failed to load admins: ${error.message}`);
  if (!admins?.length) return;

  const rows = params.errors
    .map(
      (item) =>
        `<li><code>${escapeHtml(item.subscriptionId)}</code>: ${escapeHtml(item.error)}</li>`,
    )
    .join("");
  const html = `
<!doctype html>
<html lang="pt-BR">
  <body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
    <h1>Falhas parciais na criação de entregas</h1>
    <p>Log: <code>${escapeHtml(params.logId)}</code></p>
    <p>Assinaturas processadas: ${params.subscriptionsProcessed}</p>
    <p>Entregas criadas: ${params.deliveriesCreated}</p>
    <ul>${rows}</ul>
  </body>
</html>`.trim();
  const baseUrl = getPublicBaseUrl(["FRONTEND_URL", "BASE_URL", "SITE_URL"]);
  const emailService = new EmailService(
    getEmailConfig({
      baseUrl,
      fromName: Deno.env.get("EMAIL_FROM_NAME") || "ORDAX Alerts",
    }),
  );

  for (const admin of admins) {
    if (!admin.email) continue;
    try {
      await emailService.sendEmail({
        to: admin.email,
        subject: sanitizeEmailSubject(
          `Falhas na criação de entregas (${params.errors.length})`,
        ),
        html,
      });
    } catch (emailError) {
      console.error(`Failed to alert admin ${admin.email}`, emailError);
    }
  }
}

Deno.serve(async (req) => {
  let logId: string | null = null;

  try {
    const forbidden = await requireRateLimitedSharedSecret(
      req,
      "CRON_SECRET",
      "x-cron-secret",
      "cron-create-deliveries",
    );
    if (forbidden) return forbidden;

    logId = await logCronStart("cron-create-deliveries");

    const supabase = getServiceClient();
    const now = new Date();
    const currentInstant = now.toISOString();
    const { day, month, year } = getBahiaDateParts(now);

    if (day !== 1) {
      await logCronSuccess(logId, {
        skipped: true,
        reason: "Not day 1 of Bahia calendar month",
        day,
        month,
        year,
        executedAt: currentInstant,
      });
      return new Response(
        JSON.stringify({ success: true, skipped: true, day, month, year }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const shippingBusinessDay = await getShippingBusinessDay(supabase);
    const holidayDates = await getHolidayDatesForMonth(supabase, year, month);
    const expectedDateKey = calculateNthBusinessDayOfMonth(
      year,
      month,
      shippingBusinessDay,
      holidayDates,
    )
      .toISOString()
      .split("T")[0];
    const expectedDeliveryAt = `${expectedDateKey}T00:00:00${BAHIA_OFFSET}`;

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan_type, deliveries_total")
      .eq("status", "active");

    if (subscriptionsError) {
      throw new Error(`Failed to fetch subscriptions: ${subscriptionsError.message}`);
    }

    let deliveriesCreated = 0;
    let subscriptionsProcessed = 0;
    const errors: Array<{ subscriptionId: string; error: string }> = [];

    for (const subscription of (subscriptions || []) as Subscription[]) {
      try {
        const { data: existing, error: deliveriesError } = await supabase
          .from("subscription_deliveries")
          .select("id, delivery_number, expected_delivery_date")
          .eq("subscription_id", subscription.id)
          .order("delivery_number", { ascending: true });

        if (deliveriesError) {
          throw new Error(`Failed to fetch deliveries: ${deliveriesError.message}`);
        }

        const deliveries = (existing || []) as Delivery[];
        const alreadyScheduledThisMonth = deliveries.some((delivery) => {
          if (!delivery.expected_delivery_date) return false;
          const parts = getBahiaYearMonth(delivery.expected_delivery_date);
          return parts?.year === year && parts.month === month;
        });

        if (alreadyScheduledThisMonth) {
          subscriptionsProcessed += 1;
          continue;
        }

        const nextDeliveryNumber = firstMissingDeliveryNumber(
          deliveries,
          Number(subscription.deliveries_total),
        );
        if (nextDeliveryNumber === null) {
          subscriptionsProcessed += 1;
          continue;
        }

        const { data: newDelivery, error: createError } = await supabase
          .from("subscription_deliveries")
          .insert({
            subscription_id: subscription.id,
            delivery_number: nextDeliveryNumber,
            status: "pending_choice",
            expected_delivery_date: expectedDeliveryAt,
          })
          .select("id")
          .single();

        if (createError || !newDelivery) {
          throw new Error(`Failed to create delivery: ${createError?.message || "no row returned"}`);
        }

        deliveriesCreated += 1;

        if (nextDeliveryNumber > 1) {
          const { error: maintenanceError } = await supabase.rpc(
            "activate_delivery_with_auto_maintenance",
            { p_delivery_id: newDelivery.id },
          );
          if (maintenanceError) {
            console.error(
              `Automatic maintenance failed for ${newDelivery.id}`,
              maintenanceError,
            );
          }
        }

        subscriptionsProcessed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ subscriptionId: subscription.id, error: message });

        try {
          await supabase.from("cron_job_logs").insert({
            job_name: "cron-create-deliveries",
            status: "failed",
            error_message: `Subscription ${subscription.id}: ${message}`,
            execution_details: {
              subscriptionId: subscription.id,
              userId: subscription.user_id,
              planType: subscription.plan_type,
              month,
              year,
            },
            started_at: currentInstant,
            completed_at: new Date().toISOString(),
          });
        } catch (logError) {
          console.error(`Failed to log subscription error ${subscription.id}`, logError);
        }
      }
    }

    await logCronSuccess(logId, {
      subscriptionsProcessed,
      deliveriesCreated,
      errors: errors.length > 0 ? errors : undefined,
      month,
      year,
      shippingBusinessDay,
      expectedDeliveryDate: expectedDateKey,
      executedAt: currentInstant,
    });

    if (errors.length > 0) {
      try {
        await sendPartialFailureAlert({
          logId,
          errors,
          subscriptionsProcessed,
          deliveriesCreated,
        });
      } catch (alertError) {
        console.error("Failed to send partial failure alert", alertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        subscriptionsProcessed,
        deliveriesCreated,
        errors: errors.length > 0 ? errors : undefined,
        month,
        year,
        expectedDeliveryDate: expectedDateKey,
      }),
      {
        status: errors.length === 0 ? 200 : 207,
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
