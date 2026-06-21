/**
 * Cron Job: Character Revelation
 *
 * Runs daily at 10:00 Bahia Time to reveal characters for collections
 * whose revelation date has been reached.
 *
 * Requirements:
 * - 12.1: Store character revelation date and character details
 * - 12.2: Execute cron job daily at 10:00 Bahia Time
 * - 12.3: Update collection status to "revealed" when date is reached
 * - 12.4: Send email notification to all subscribers who chose that collection
 */

import {
  logCronStart,
  logCronSuccess,
  logCronError,
} from "../_shared/cron-logger.ts";
import { nowInBahia } from "../_shared/timezone.ts";
import { requireRateLimitedSharedSecret } from "../_shared/secret-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import {
  EmailService,
  escapeHtml,
  getEmailConfig,
  sanitizeEmailSubject,
} from "../_shared/email.ts";
import { getPublicBaseUrl } from "../_shared/public-url.ts";

interface Collection {
  id: string;
  name: string;
  character_revelation_date: string;
  character_name: string | null;
  character_image_url: string | null;
}

interface Subscriber {
  user_id: string;
  email: string;
  full_name: string | null;
  collection_name: string;
}

/**
 * Sends character revelation email to a subscriber
 */
async function sendRevelationEmail(params: {
  to: string;
  subscriberName: string | null;
  collectionName: string;
  characterName: string | null;
  characterImageUrl: string | null;
}): Promise<void> {
  const baseUrl = getPublicBaseUrl(["FRONTEND_URL", "BASE_URL", "SITE_URL"]);
  const emailService = new EmailService(getEmailConfig({ baseUrl }));

  const subject = sanitizeEmailSubject(
    `Revelacao de Personagem: ${params.collectionName}`,
  );
  const htmlContent = generateRevelationEmailHTML({
    subscriberName: params.subscriberName || "Colecionador",
    collectionName: params.collectionName,
    characterName: params.characterName || "Personagem Misterioso",
    characterImageUrl: params.characterImageUrl,
    baseUrl,
  });

  try {
    await emailService.sendEmail({
      to: params.to,
      subject,
      html: htmlContent,
    });

    console.log(`Revelation email sent to: ${params.to}`);
  } catch (error) {
    console.error(`Failed to send revelation email to ${params.to}:`, error);
    throw error;
  }
}

function getSafeHttpsUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Generates HTML content for the character revelation email
 */
function generateRevelationEmailHTML(params: {
  subscriberName: string;
  collectionName: string;
  characterName: string;
  characterImageUrl: string | null;
  baseUrl: string;
}): string {
  const subscriberName = escapeHtml(params.subscriberName);
  const collectionName = escapeHtml(params.collectionName);
  const characterName = escapeHtml(params.characterName);
  const characterImageUrl = getSafeHttpsUrl(params.characterImageUrl);
  const characterImageSection = characterImageUrl
    ? `
      <div style="text-align: center; margin: 32px 0;">
        <img
          src="${escapeHtml(characterImageUrl)}"
          alt="${characterName}"
          style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
        />
      </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Revelação de Personagem</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header p {
      margin: 0;
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 24px;
      color: #374151;
    }
    .reveal-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 4px solid #f59e0b;
      padding: 24px;
      margin: 24px 0;
      border-radius: 8px;
      text-align: center;
    }
    .reveal-box h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #92400e;
    }
    .reveal-box .character-name {
      font-size: 32px;
      font-weight: 700;
      color: #78350f;
      margin: 16px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Revelação de Personagem!</h1>
      <p>O mistério foi desvendado</p>
    </div>
    <div class="content">
      <p class="greeting">Olá, ${subscriberName}!</p>

      <p>
        O momento que você esperava chegou! O personagem da coleção
        <strong>${collectionName}</strong> foi revelado:
      </p>

      <div class="reveal-box">
        <h2>Apresentamos:</h2>
        <div class="character-name">${characterName}</div>
      </div>

      ${characterImageSection}

      <p style="margin-top: 24px;">
        Sua peça exclusiva está sendo preparada com todo o cuidado e atenção aos detalhes
        que você merece. Em breve, você receberá atualizações sobre o status de produção
        e envio.
      </p>

      <div style="text-align: center;">
        <a href="${params.baseUrl}/minhas-assinaturas" class="cta-button">
          Ver Minhas Entregas
        </a>
      </div>

      <p style="margin-top: 32px; font-size: 14px; color: #64748b;">
        Obrigado por fazer parte da comunidade ORDAX! Estamos animados para você receber
        esta peça incrível.
      </p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático da plataforma ORDAX.</p>
      <p>&copy; ${new Date().getFullYear()} ORDAX. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
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

    // Start logging
    logId = await logCronStart("cron-reveal-characters");

    const supabase = getServiceClient();

    // Get current Bahia time
    const bahiaTime = nowInBahia();
    const currentDate = bahiaTime.toISOString().split("T")[0]; // YYYY-MM-DD format

    console.log(`Cron job running at ${bahiaTime.toISOString()} (Bahia time)`);
    console.log(`Checking for revelations on or before: ${currentDate}`);

    // Query collections where character_revelation_date <= today AND revealed = false
    const { data: collectionsToReveal, error: collectionsError } =
      await supabase
        .from("collections")
        .select(
          "id, name, character_revelation_date, character_name, character_image_url",
        )
        .eq("revealed", false)
        .not("character_revelation_date", "is", null)
        .lte("character_revelation_date", bahiaTime.toISOString());

    if (collectionsError) {
      throw new Error(
        `Failed to fetch collections: ${collectionsError.message}`,
      );
    }

    if (!collectionsToReveal || collectionsToReveal.length === 0) {
      console.log("No collections to reveal");

      await logCronSuccess(logId, {
        collectionsRevealed: 0,
        subscribersNotified: 0,
        currentDate,
      });

      return new Response(
        JSON.stringify({
          success: true,
          collectionsRevealed: 0,
          subscribersNotified: 0,
          message: "No collections to reveal",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    console.log(`Found ${collectionsToReveal.length} collection(s) to reveal`);

    let collectionsRevealed = 0;
    let subscribersNotified = 0;
    const errors: Array<{ collectionId: string; error: string }> = [];

    // Process each collection
    for (const collection of collectionsToReveal as Collection[]) {
      try {
        console.log(
          `Processing collection: ${collection.name} (${collection.id})`,
        );

        // Update collection to revealed = true
        const { error: updateError } = await supabase
          .from("collections")
          .update({ revealed: true })
          .eq("id", collection.id);

        if (updateError) {
          throw new Error(
            `Failed to update collection: ${updateError.message}`,
          );
        }

        console.log(`Collection ${collection.name} marked as revealed`);
        collectionsRevealed++;

        // Find all subscribers who chose this collection
        // First, get all deliveries with this collection
        const { data: deliveries, error: deliveriesError } = await supabase
          .from("subscription_deliveries")
          .select("id, subscription_id, collection_id")
          .eq("collection_id", collection.id);

        if (deliveriesError) {
          throw new Error(
            `Failed to fetch deliveries: ${deliveriesError.message}`,
          );
        }

        if (!deliveries || deliveries.length === 0) {
          console.log(`No subscribers found for collection ${collection.name}`);
          continue;
        }

        // Get unique subscription IDs
        const subscriptionIds = [
          ...new Set(deliveries.map((d) => d.subscription_id)),
        ];

        // Get user IDs from subscriptions
        const { data: subscriptions, error: subscriptionsError } =
          await supabase
            .from("subscriptions")
            .select("id, user_id")
            .in("id", subscriptionIds);

        if (subscriptionsError) {
          throw new Error(
            `Failed to fetch subscriptions: ${subscriptionsError.message}`,
          );
        }

        if (!subscriptions || subscriptions.length === 0) {
          console.log(
            `No subscriptions found for collection ${collection.name}`,
          );
          continue;
        }

        // Get unique user IDs
        const userIds = [...new Set(subscriptions.map((s) => s.user_id))];

        // Get user profiles with email
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds)
          .not("email", "is", null);

        if (profilesError) {
          throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
        }

        if (!profiles || profiles.length === 0) {
          console.log(
            `No profiles with email found for collection ${collection.name}`,
          );
          continue;
        }

        // Create unique subscribers map
        const uniqueSubscribers = new Map<string, Subscriber>();

        for (const profile of profiles) {
          uniqueSubscribers.set(profile.id, {
            user_id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            collection_name: collection.name,
          });
        }

        console.log(
          `Found ${uniqueSubscribers.size} unique subscriber(s) for collection ${collection.name}`,
        );

        // Send revelation email to each subscriber
        for (const subscriber of uniqueSubscribers.values()) {
          try {
            await sendRevelationEmail({
              to: subscriber.email,
              subscriberName: subscriber.full_name,
              collectionName: collection.name,
              characterName: collection.character_name,
              characterImageUrl: collection.character_image_url,
            });

            subscribersNotified++;
          } catch (emailError) {
            console.error(
              `Failed to send email to ${subscriber.email}:`,
              emailError,
            );
            // Continue sending to other subscribers
          }
        }

        console.log(
          `Sent ${uniqueSubscribers.size} revelation email(s) for collection ${collection.name}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`Error processing collection ${collection.id}:`, error);

        errors.push({
          collectionId: collection.id,
          error: errorMessage,
        });
        // Continue processing other collections
      }
    }

    // Log success with details
    await logCronSuccess(logId, {
      collectionsRevealed,
      subscribersNotified,
      errors: errors.length > 0 ? errors : undefined,
      currentDate,
    });

    console.log(
      `Cron job completed: ${collectionsRevealed} collection(s) revealed, ${subscribersNotified} subscriber(s) notified`,
    );
    if (errors.length > 0) {
      console.warn(`${errors.length} collection(s) failed to process`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        collectionsRevealed,
        subscribersNotified,
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
