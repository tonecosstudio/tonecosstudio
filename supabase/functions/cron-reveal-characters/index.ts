/**
 * Cron Job: Character Revelation
 *
 * Reveals collections whose persisted revelation instant has been reached and
 * notifies the affected subscribers. Bahia is used for presentation only;
 * timestamptz comparisons always use the real current instant.
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

interface Collection {
  id: string;
  name: string;
  character_revelation_date: string;
  character_name: string | null;
  character_image_url: string | null;
}

function bahiaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BAHIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value;
  const year = read("year");
  const month = read("month");
  const day = read("day");
  if (!year || !month || !day) throw new Error("Unable to resolve Bahia date");
  return `${year}-${month}-${day}`;
}

function safeHttpsUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

async function sendRevelationEmail(params: {
  to: string;
  subscriberName: string | null;
  collectionName: string;
  characterName: string | null;
  characterImageUrl: string | null;
}): Promise<void> {
  const baseUrl = getPublicBaseUrl(["FRONTEND_URL", "BASE_URL", "SITE_URL"]);
  const emailService = new EmailService(getEmailConfig({ baseUrl }));
  const subscriberName = escapeHtml(params.subscriberName || "Colecionador");
  const collectionName = escapeHtml(params.collectionName);
  const characterName = escapeHtml(params.characterName || "Personagem revelado");
  const imageUrl = safeHttpsUrl(params.characterImageUrl);
  const image = imageUrl
    ? `<p><img src="${escapeHtml(imageUrl)}" alt="${characterName}" style="max-width:100%;height:auto;border-radius:8px" /></p>`
    : "";

  const html = `
<!doctype html>
<html lang="pt-BR">
  <body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
    <h1>Revelação de personagem</h1>
    <p>Olá, ${subscriberName}.</p>
    <p>O personagem da coleção <strong>${collectionName}</strong> foi revelado:</p>
    <h2>${characterName}</h2>
    ${image}
    <p><a href="${baseUrl}/minhas-assinaturas">Ver minhas entregas</a></p>
  </body>
</html>`.trim();

  await emailService.sendEmail({
    to: params.to,
    subject: sanitizeEmailSubject(`Revelação de personagem: ${params.collectionName}`),
    html,
  });
}

Deno.serve(async (req) => {
  let logId: string | null = null;

  try {
    const forbidden = await requireRateLimitedSharedSecret(
      req,
      "CRON_SECRET",
      "x-cron-secret",
      "cron-reveal-characters",
    );
    if (forbidden) return forbidden;

    logId = await logCronStart("cron-reveal-characters");

    const supabase = getServiceClient();
    const now = new Date();
    const currentInstant = now.toISOString();
    const currentDate = bahiaDateKey(now);

    const { data: collectionsToReveal, error: collectionsError } = await supabase
      .from("collections")
      .select(
        "id, name, character_revelation_date, character_name, character_image_url",
      )
      .eq("revealed", false)
      .not("character_revelation_date", "is", null)
      .lte("character_revelation_date", currentInstant);

    if (collectionsError) {
      throw new Error(`Failed to fetch collections: ${collectionsError.message}`);
    }

    let collectionsRevealed = 0;
    let subscribersNotified = 0;
    const errors: Array<{ collectionId: string; error: string }> = [];

    for (const collection of (collectionsToReveal || []) as Collection[]) {
      try {
        const { data: revealedRow, error: updateError } = await supabase
          .from("collections")
          .update({ revealed: true, updated_at: currentInstant })
          .eq("id", collection.id)
          .eq("revealed", false)
          .select("id")
          .maybeSingle();

        if (updateError) {
          throw new Error(`Failed to reveal collection: ${updateError.message}`);
        }
        if (!revealedRow) continue;

        collectionsRevealed += 1;

        const { data: deliveries, error: deliveriesError } = await supabase
          .from("subscription_deliveries")
          .select("subscription_id")
          .eq("collection_id", collection.id);

        if (deliveriesError) {
          throw new Error(`Failed to fetch deliveries: ${deliveriesError.message}`);
        }

        const subscriptionIds = [
          ...new Set((deliveries || []).map((delivery: any) => delivery.subscription_id).filter(Boolean)),
        ];
        if (subscriptionIds.length === 0) continue;

        const { data: subscriptions, error: subscriptionsError } = await supabase
          .from("subscriptions")
          .select("user_id")
          .in("id", subscriptionIds);

        if (subscriptionsError) {
          throw new Error(`Failed to fetch subscriptions: ${subscriptionsError.message}`);
        }

        const userIds = [
          ...new Set((subscriptions || []).map((subscription: any) => subscription.user_id).filter(Boolean)),
        ];
        if (userIds.length === 0) continue;

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds)
          .not("email", "is", null);

        if (profilesError) {
          throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
        }

        for (const profile of profiles || []) {
          if (!profile.email) continue;
          try {
            await sendRevelationEmail({
              to: profile.email,
              subscriberName: profile.full_name,
              collectionName: collection.name,
              characterName: collection.character_name,
              characterImageUrl: collection.character_image_url,
            });
            subscribersNotified += 1;
          } catch (emailError) {
            errors.push({
              collectionId: collection.id,
              error: `Email for user ${profile.id} failed: ${
                emailError instanceof Error ? emailError.message : String(emailError)
              }`,
            });
          }
        }
      } catch (error) {
        errors.push({
          collectionId: collection.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await logCronSuccess(logId, {
      collectionsRevealed,
      subscribersNotified,
      errors: errors.length > 0 ? errors : undefined,
      executedAt: currentInstant,
      bahiaDate: currentDate,
    });

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        collectionsRevealed,
        subscribersNotified,
        errors: errors.length > 0 ? errors : undefined,
        executedAt: currentInstant,
        bahiaDate: currentDate,
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
