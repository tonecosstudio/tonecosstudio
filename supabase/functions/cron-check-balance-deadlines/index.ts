/**
 * Cron Job: Balance Deadline Checker
 *
 * Runs daily at the configured schedule and:
 * - cancels standalone purchases whose persisted balance deadline has passed;
 * - sends a reminder for purchases whose deadline falls on the next Bahia calendar day;
 * - uses persisted financial values only (no hardcoded commercial amounts).
 */

import {
  logCronError,
  logCronStart,
  logCronSuccess,
} from "../_shared/cron-logger.ts";
import { requireRateLimitedSharedSecret } from "../_shared/secret-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import {
  EmailService,
  escapeHtml,
  getEmailConfig,
  sanitizeEmailSubject,
} from "../_shared/email.ts";
import { getPublicBaseUrl } from "../_shared/public-url.ts";

const BAHIA_TIMEZONE = "America/Bahia";
const BAHIA_OFFSET = "-03:00";

interface StandalonePurchase {
  id: string;
  user_id: string;
  collection_id: string;
  status: string;
  balance_due_date: string;
  balance_amount: number | null;
  deposit_amount: number | null;
}

interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

function getBahiaCalendarDate(date: Date): CalendarDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BAHIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const read = (type: "year" | "month" | "day") => {
    const value = Number(parts.find((part) => part.type === type)?.value);
    if (!Number.isInteger(value)) {
      throw new Error(`Unable to resolve Bahia calendar ${type}`);
    }
    return value;
  };

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
  };
}

function getBahiaDayRange(date: Date, offsetDays: number) {
  const current = getBahiaCalendarDate(date);
  const target = new Date(
    Date.UTC(current.year, current.month - 1, current.day + offsetDays),
  );
  const year = target.getUTCFullYear();
  const month = String(target.getUTCMonth() + 1).padStart(2, "0");
  const day = String(target.getUTCDate()).padStart(2, "0");
  const key = `${year}-${month}-${day}`;

  return {
    key,
    start: `${key}T00:00:00${BAHIA_OFFSET}`,
    end: `${key}T23:59:59.999${BAHIA_OFFSET}`,
  };
}

function requireMoney(value: number | null, label: string): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new Error(`${label} is missing or invalid`);
  }
  return numericValue;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function depositRetentionText(depositAmount: number | null): string {
  const numericValue = Number(depositAmount);
  const amountText =
    Number.isFinite(numericValue) && numericValue > 0
      ? ` de ${formatCurrency(numericValue)}`
      : "";

  return `o depósito já pago${amountText} será tratado conforme as condições de cancelamento aceitas no pedido`;
}

async function sendUrgentBalanceReminder(params: {
  to: string;
  userName: string | null;
  collectionName: string;
  balanceAmount: number;
  depositAmount: number | null;
  dueDate: string;
  purchaseId: string;
}): Promise<void> {
  const baseUrl = getPublicBaseUrl(["FRONTEND_URL", "BASE_URL", "SITE_URL"]);
  const emailService = new EmailService(getEmailConfig({ baseUrl }));
  const subject = sanitizeEmailSubject(
    `URGENTE: Pagamento do saldo vence amanhã - ${params.collectionName}`,
  );
  const dueDate = new Date(params.dueDate);

  if (Number.isNaN(dueDate.getTime())) {
    throw new Error("Balance due date is invalid");
  }

  const formattedDate = dueDate.toLocaleDateString("pt-BR", {
    timeZone: BAHIA_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const userName = escapeHtml(params.userName || "Colecionador");
  const collectionName = escapeHtml(params.collectionName);
  const purchaseUrl = `${baseUrl}/compra-avulsa/${encodeURIComponent(params.purchaseId)}`;
  const retentionText = escapeHtml(depositRetentionText(params.depositAmount));

  const html = `
<!doctype html>
<html lang="pt-BR">
  <body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
    <h1>Pagamento do saldo vence amanhã</h1>
    <p>Olá, ${userName}.</p>
    <p>Sua peça da coleção <strong>${collectionName}</strong> aguarda o pagamento do saldo.</p>
    <p><strong>Saldo:</strong> ${escapeHtml(formatCurrency(params.balanceAmount))}</p>
    <p><strong>Prazo:</strong> ${escapeHtml(formattedDate)}</p>
    <p>
      Se o pagamento não for confirmado dentro do prazo, o pedido poderá ser cancelado e
      ${retentionText}.
    </p>
    <p><a href="${purchaseUrl}">Pagar saldo</a></p>
    <p style="font-size:12px;color:#6b7280">
      Este aviso usa exclusivamente os valores e o prazo persistidos no seu pedido.
    </p>
  </body>
</html>`.trim();

  await emailService.sendEmail({ to: params.to, subject, html });
}

async function sendCancellationNotice(params: {
  to: string;
  userName: string | null;
  collectionName: string;
  depositAmount: number | null;
  purchaseId: string;
}): Promise<void> {
  const baseUrl = getPublicBaseUrl(["FRONTEND_URL", "BASE_URL", "SITE_URL"]);
  const emailService = new EmailService(getEmailConfig({ baseUrl }));
  const subject = sanitizeEmailSubject(`Pedido cancelado - ${params.collectionName}`);
  const userName = escapeHtml(params.userName || "Colecionador");
  const collectionName = escapeHtml(params.collectionName);
  const purchaseId = escapeHtml(params.purchaseId);
  const retentionText = escapeHtml(depositRetentionText(params.depositAmount));

  const html = `
<!doctype html>
<html lang="pt-BR">
  <body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
    <h1>Pedido cancelado</h1>
    <p>Olá, ${userName}.</p>
    <p>
      O pedido <strong>#${purchaseId}</strong> da coleção <strong>${collectionName}</strong>
      foi cancelado porque o saldo não foi confirmado dentro do prazo persistido no pedido.
    </p>
    <p>Conforme as condições aplicáveis ao pedido, ${retentionText}.</p>
    <p style="font-size:12px;color:#6b7280">
      Em caso de dúvida, entre em contato pelos canais oficiais de suporte.
    </p>
  </body>
</html>`.trim();

  await emailService.sendEmail({ to: params.to, subject, html });
}

Deno.serve(async (req) => {
  let logId: string | null = null;

  try {
    const forbidden = await requireRateLimitedSharedSecret(
      req,
      "CRON_SECRET",
      "x-cron-secret",
      "cron-check-balance-deadlines",
    );
    if (forbidden) return forbidden;

    logId = await logCronStart("cron-check-balance-deadlines");

    const supabase = getServiceClient();
    const now = new Date();
    const currentInstant = now.toISOString();
    const tomorrow = getBahiaDayRange(now, 1);

    const { data: overduePurchases, error: overdueError } = await supabase
      .from("standalone_purchases")
      .select(
        "id, user_id, collection_id, status, balance_due_date, balance_amount, deposit_amount",
      )
      .eq("status", "awaiting_balance")
      .not("balance_due_date", "is", null)
      .lt("balance_due_date", currentInstant);

    if (overdueError) {
      throw new Error(`Failed to fetch overdue purchases: ${overdueError.message}`);
    }

    const { data: dueTomorrowPurchases, error: dueTomorrowError } = await supabase
      .from("standalone_purchases")
      .select(
        "id, user_id, collection_id, status, balance_due_date, balance_amount, deposit_amount",
      )
      .eq("status", "awaiting_balance")
      .not("balance_due_date", "is", null)
      .gte("balance_due_date", tomorrow.start)
      .lte("balance_due_date", tomorrow.end);

    if (dueTomorrowError) {
      throw new Error(`Failed to fetch purchases due tomorrow: ${dueTomorrowError.message}`);
    }

    let purchasesCancelled = 0;
    let remindersSent = 0;
    const errors: Array<{ purchaseId: string; error: string; action: string }> = [];

    for (const purchase of (overduePurchases || []) as StandalonePurchase[]) {
      try {
        const [{ data: profile, error: profileError }, { data: collection, error: collectionError }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", purchase.user_id)
              .single(),
            supabase
              .from("collections")
              .select("name")
              .eq("id", purchase.collection_id)
              .single(),
          ]);

        if (profileError || !profile) {
          throw new Error(`Customer profile unavailable: ${profileError?.message || "not found"}`);
        }
        if (collectionError || !collection?.name) {
          throw new Error(`Collection unavailable: ${collectionError?.message || "not found"}`);
        }

        const { error: cancelError } = await supabase.rpc(
          "cancel_standalone_purchase_for_non_payment",
          { p_purchase_id: purchase.id, p_now: currentInstant },
        );

        if (cancelError) {
          throw new Error(`Failed to cancel purchase: ${cancelError.message}`);
        }

        purchasesCancelled += 1;

        if (profile.email) {
          try {
            await sendCancellationNotice({
              to: profile.email,
              userName: profile.full_name,
              collectionName: collection.name,
              depositAmount: purchase.deposit_amount,
              purchaseId: purchase.id,
            });
          } catch (emailError) {
            console.error(`Cancellation email failed for ${purchase.id}`, emailError);
          }
        }
      } catch (error) {
        errors.push({
          purchaseId: purchase.id,
          error: error instanceof Error ? error.message : String(error),
          action: "cancel",
        });
      }
    }

    for (const purchase of (dueTomorrowPurchases || []) as StandalonePurchase[]) {
      try {
        const balanceAmount = requireMoney(purchase.balance_amount, "Balance amount");
        const [{ data: profile, error: profileError }, { data: collection, error: collectionError }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", purchase.user_id)
              .single(),
            supabase
              .from("collections")
              .select("name")
              .eq("id", purchase.collection_id)
              .single(),
          ]);

        if (profileError || !profile?.email) {
          throw new Error(`Customer profile/email unavailable: ${profileError?.message || "not found"}`);
        }
        if (collectionError || !collection?.name) {
          throw new Error(`Collection unavailable: ${collectionError?.message || "not found"}`);
        }

        await sendUrgentBalanceReminder({
          to: profile.email,
          userName: profile.full_name,
          collectionName: collection.name,
          balanceAmount,
          depositAmount: purchase.deposit_amount,
          dueDate: purchase.balance_due_date,
          purchaseId: purchase.id,
        });

        remindersSent += 1;
      } catch (error) {
        errors.push({
          purchaseId: purchase.id,
          error: error instanceof Error ? error.message : String(error),
          action: "reminder",
        });
      }
    }

    await logCronSuccess(logId, {
      purchasesCancelled,
      remindersSent,
      overdueCount: overduePurchases?.length || 0,
      dueTomorrowCount: dueTomorrowPurchases?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
      executedAt: currentInstant,
      tomorrowBahia: tomorrow.key,
    });

    return new Response(
      JSON.stringify({
        success: true,
        purchasesCancelled,
        remindersSent,
        overdueCount: overduePurchases?.length || 0,
        dueTomorrowCount: dueTomorrowPurchases?.length || 0,
        errors: errors.length > 0 ? errors : undefined,
        executedAt: currentInstant,
        tomorrowBahia: tomorrow.key,
      }),
      { headers: { "Content-Type": "application/json" } },
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
