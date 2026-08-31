import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@20.4.1";
import { getCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { getPublicBaseUrl } from "../_shared/public-url.ts";
import { getServiceClient } from "../_shared/supabase.ts";

type StripeSubscriptionWithBillingPeriod = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
};

type StripeInvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

function getStripe() {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not configured");

  return new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
    appInfo: {
      name: "ORDAX",
      version: "1.0.0",
      url: getPublicBaseUrl(["SITE_URL", "BASE_URL"]),
    },
  });
}

async function constructWebhookEvent(req: Request) {
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");

  const signature = req.headers.get("stripe-signature");
  if (!signature) throw new Error("Missing stripe-signature header");

  const payload = await req.text();
  const stripe = getStripe();

  return await stripe.webhooks.constructEventAsync(
    payload,
    signature,
    webhookSecret,
    undefined,
    Stripe.createSubtleCryptoProvider(),
  );
}

function toIsoFromSeconds(value?: number | null) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function getStripeResourceId(
  resource: string | { id?: string } | null | undefined,
): string | null {
  if (typeof resource === "string") return resource;
  return resource?.id ?? null;
}

async function hasWebhookEvent(
  service: ReturnType<typeof getServiceClient>,
  eventId: string,
) {
  const { data, error } = await service
    .from("stripe_webhook_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", eventId)
    .maybeSingle();

  if (error) throw new Error(`Failed to check webhook event: ${error.message}`);
  return Boolean(data);
}

async function recordWebhookEvent(
  service: ReturnType<typeof getServiceClient>,
  event: Stripe.Event,
) {
  const { data, error } = await service.rpc("record_stripe_webhook_event", {
    p_stripe_event_id: event.id,
    p_event_type: event.type,
    p_event_data: event.data.object,
    p_processed_at: new Date().toISOString(),
  });

  if (error) throw new Error(`Failed to record webhook event: ${error.message}`);
  return data === true;
}

async function updatePaymentIntent(
  service: ReturnType<typeof getServiceClient>,
  paymentIntent: Stripe.PaymentIntent,
  status: "succeeded" | "failed" | "canceled",
) {
  const { error } = await service.rpc("update_stripe_payment_intent_status", {
    p_stripe_payment_intent_id: paymentIntent.id,
    p_status: status,
    p_error_message: paymentIntent.last_payment_error?.message ?? null,
  });

  if (error) throw new Error(`Failed to update payment intent: ${error.message}`);
}

async function upsertSubscription(
  service: ReturnType<typeof getServiceClient>,
  subscription: Stripe.Subscription,
) {
  const billingSubscription = subscription as StripeSubscriptionWithBillingPeriod;
  const canceledAt = toIsoFromSeconds(subscription.canceled_at);

  const customerId = getStripeResourceId(subscription.customer);
  if (!customerId) {
    throw new Error("Stripe subscription is missing customer id");
  }

  const { error } = await service.rpc("upsert_stripe_subscription_record", {
    p_stripe_subscription_id: subscription.id,
    p_customer_id: customerId,
    p_status: subscription.status,
    p_current_period_start: toIsoFromSeconds(
      billingSubscription.current_period_start,
    ),
    p_current_period_end: toIsoFromSeconds(billingSubscription.current_period_end),
    p_cancel_at_period_end: Boolean(billingSubscription.cancel_at_period_end),
    p_canceled_at: canceledAt,
    p_metadata: subscription.metadata ?? {},
  });

  if (error) throw new Error(`Failed to upsert subscription: ${error.message}`);
}

async function recordLatestRefund(
  service: ReturnType<typeof getServiceClient>,
  charge: Stripe.Charge,
) {
  const refund = charge.refunds?.data?.[0];
  const paymentIntentId = getStripeResourceId(charge.payment_intent);

  if (!refund || !paymentIntentId) return;

  const { error } = await service.rpc("upsert_stripe_refund_record", {
    p_stripe_refund_id: refund.id,
    p_payment_intent_id: paymentIntentId,
    p_amount: refund.amount,
    p_currency: refund.currency,
    p_status: refund.status,
    p_reason: refund.reason,
  });

  if (error) throw new Error(`Failed to record refund: ${error.message}`);
}

async function handleWebhookEvent(
  service: ReturnType<typeof getServiceClient>,
  event: Stripe.Event,
) {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await updatePaymentIntent(service, paymentIntent, "succeeded");
      return;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await updatePaymentIntent(service, paymentIntent, "failed");
      return;
    }

    case "payment_intent.canceled": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await updatePaymentIntent(service, paymentIntent, "canceled");
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscription(service, subscription);
      return;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      await recordLatestRefund(service, charge);
      return;
    }

    case "invoice.payment_succeeded":
    case "invoice.payment_failed": {
      const invoice = event.data.object as StripeInvoiceWithSubscription;
      const subscriptionId = getStripeResourceId(invoice.subscription);
      if (!subscriptionId) return;

      const { error } = await service.rpc("touch_stripe_subscription_record", {
        p_stripe_subscription_id: subscriptionId,
      });
      if (error) throw new Error(`Failed to touch subscription: ${error.message}`);
      return;
    }

    default:
      return;
  }
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...getCorsHeaders(req), ...JSON_HEADERS },
    });
  }

  try {
    const event = await constructWebhookEvent(req);
    const service = getServiceClient();
    const alreadyProcessed = await hasWebhookEvent(service, event.id);

    if (alreadyProcessed) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...getCorsHeaders(req), ...JSON_HEADERS },
      });
    }

    // The Stripe webhook only mirrors provider state into Stripe-owned tables.
    // Domain transitions (orders, subscriptions, standalone purchases) must be
    // performed by their own canonical server-side contracts after validating
    // the commercial amount and resource ownership. Stripe metadata is never
    // treated as authority for a domain mutation here.
    await handleWebhookEvent(service, event);
    const recorded = await recordWebhookEvent(service, event);

    return new Response(JSON.stringify({ received: true, duplicate: !recorded }), {
      status: 200,
      headers: { ...getCorsHeaders(req), ...JSON_HEADERS },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    const status =
      message.includes("signature") || message.includes("stripe-signature")
        ? 400
        : 500;
    const publicMessage =
      status === 400 ? "Invalid webhook signature" : "Webhook processing failed";

    return new Response(JSON.stringify({ error: publicMessage }), {
      status,
      headers: { ...getCorsHeaders(req), ...JSON_HEADERS },
    });
  }
});
