import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@20.4.1";
import { getCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { checkPayloadSize, PAYLOAD_LIMITS } from "../_shared/payload-guard.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { getClaims, getServiceClient, errorToStatus } from "../_shared/supabase.ts";

type PaymentIntentPayload = {
  amount?: unknown;
  currency?: unknown;
  description?: unknown;
  metadata?: unknown;
};

const MIN_AMOUNT_CENTS = 100;
const MAX_AMOUNT_CENTS = 1_000_000;
const ALLOWED_CURRENCIES = new Set(["brl"]);

function validatePayload(body: PaymentIntentPayload) {
  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount < MIN_AMOUNT_CENTS || amount > MAX_AMOUNT_CENTS) {
    throw new Error("Invalid amount");
  }

  const currency = String(body.currency ?? "brl").toLowerCase();
  if (!ALLOWED_CURRENCIES.has(currency)) {
    throw new Error("Invalid currency");
  }

  const description =
    typeof body.description === "string" ? body.description.slice(0, 500) : undefined;

  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? Object.fromEntries(
          Object.entries(body.metadata as Record<string, unknown>)
            .slice(0, 20)
            .map(([key, value]) => [key.slice(0, 40), String(value).slice(0, 500)]),
        )
      : {};

  return { amount, currency, description, metadata };
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await checkPayloadSize(req, PAYLOAD_LIMITS.MINIMAL);
    if ("error" in payload) return payload.error;

    const { claims } = await getClaims(req);
    const userId = String(claims.sub);

    const limited = await checkRateLimit(req, "create-payment-intent", RATE_LIMITS.PURCHASE, userId);
    if (limited) return limited;

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) throw new Error("Stripe is not configured");

    const body = validatePayload((payload.body ?? {}) as PaymentIntentPayload);
    const service = getServiceClient();
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      appInfo: {
        name: "ORDAX",
        version: "1.0.0",
        url: Deno.env.get("SITE_URL") ?? "https://ordax.com.br",
      },
    });

    const { data: authUser, error: userError } = await service.auth.admin.getUserById(userId);
    if (userError || !authUser?.user?.email) {
      throw new Error("Authenticated user email not found");
    }

    const { data: existingCustomer } = await service
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId = existingCustomer?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: authUser.user.email,
        metadata: { userId },
      });
      customerId = customer.id;

      await service.from("stripe_customers").upsert(
        {
          user_id: userId,
          stripe_customer_id: customer.id,
          email: authUser.user.email,
          metadata: { userId },
        },
        { onConflict: "user_id" },
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: body.amount,
      currency: body.currency,
      customer: customerId,
      description: body.description,
      metadata: { ...body.metadata, userId },
      automatic_payment_methods: { enabled: true },
    });

    await service.from("stripe_payment_intents").insert({
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      customer_id: customerId,
      metadata: paymentIntent.metadata,
    });

    return new Response(
      JSON.stringify({
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      }),
      {
        status: 201,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Invalid amount" || msg === "Invalid currency" ? 400 : errorToStatus(msg);
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
