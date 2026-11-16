-- Sell catalog extras through the existing quotes and Coins ledger authorities.
-- This creates no second order table or wallet. The existing commerce gate
-- remains closed unless an authorized release changes its stored setting.
BEGIN;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS commercial_offer_id uuid
    REFERENCES public.tonart_commercial_offers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS commercial_offer_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS commercial_shipping_amount_brl numeric(10,2),
  ADD COLUMN IF NOT EXISTS checkout_request_id uuid;

-- A legacy check from the original payment workflow still rejected `coins`
-- even after the canonical replacement check was added in Round 71.
ALTER TABLE public.quote_payments
  DROP CONSTRAINT IF EXISTS quote_payments_payment_type_valid;

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS tonecos_preorder_payment_status_valid,
  ADD CONSTRAINT tonecos_preorder_payment_status_valid CHECK (
    payment_status IS NULL OR payment_status::text IN (
      'pending', 'under_review', 'deposit_paid', 'fully_paid', 'failed'
    )
  ) NOT VALID;

ALTER TABLE public.quotes
  ADD CONSTRAINT tonecos_quote_commercial_snapshot_object
    CHECK (commercial_offer_snapshot IS NULL OR jsonb_typeof(commercial_offer_snapshot) = 'object') NOT VALID,
  ADD CONSTRAINT tonecos_quote_commercial_shipping_nonnegative
    CHECK (commercial_shipping_amount_brl IS NULL OR commercial_shipping_amount_brl >= 0) NOT VALID;

ALTER TABLE public.quotes
  VALIDATE CONSTRAINT tonecos_quote_commercial_snapshot_object,
  VALIDATE CONSTRAINT tonecos_quote_commercial_shipping_nonnegative;

ALTER TABLE public.quotes
  ADD CONSTRAINT tonecos_quote_commercial_contract_complete
    CHECK (
      (commercial_offer_id IS NULL AND commercial_offer_snapshot IS NULL
        AND checkout_request_id IS NULL AND commercial_shipping_amount_brl IS NULL)
      OR (commercial_offer_id IS NOT NULL AND commercial_offer_snapshot IS NOT NULL
        AND checkout_request_id IS NOT NULL
        AND commercial_offer_snapshot->>'offerId' = commercial_offer_id::text)
    ) NOT VALID;
ALTER TABLE public.quotes
  VALIDATE CONSTRAINT tonecos_quote_commercial_contract_complete;

CREATE OR REPLACE FUNCTION private_api.guard_tonart_extra_quote_contract()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_shipping_mode text;
  v_item_price numeric(10,2);
BEGIN
  IF OLD.commercial_offer_snapshot IS NULL THEN
    IF NEW.commercial_offer_id IS NOT NULL
       OR NEW.commercial_offer_snapshot IS NOT NULL
       OR NEW.checkout_request_id IS NOT NULL
       OR NEW.commercial_shipping_amount_brl IS NOT NULL THEN
      RAISE EXCEPTION 'A quote cannot be converted to a TONART extra order after creation'
        USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.commercial_offer_id IS DISTINCT FROM OLD.commercial_offer_id
     OR NEW.commercial_offer_snapshot IS DISTINCT FROM OLD.commercial_offer_snapshot
     OR NEW.checkout_request_id IS DISTINCT FROM OLD.checkout_request_id
     OR NEW.requested_catalog_models IS DISTINCT FROM OLD.requested_catalog_models
     OR NEW.desired_scale IS DISTINCT FROM OLD.desired_scale
     OR NEW.finishing IS DISTINCT FROM OLD.finishing
     OR COALESCE(NEW.is_preorder, false) IS DISTINCT FROM COALESCE(OLD.is_preorder, false) THEN
    RAISE EXCEPTION 'TONART extra order terms are immutable'
      USING ERRCODE = '22023';
  END IF;

  v_shipping_mode := OLD.commercial_offer_snapshot->>'shippingMode';
  v_item_price := (OLD.commercial_offer_snapshot->>'itemPriceBrl')::numeric(10,2);
  IF v_shipping_mode = 'fixed' THEN
    IF NEW.commercial_shipping_amount_brl IS DISTINCT FROM OLD.commercial_shipping_amount_brl
       OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR NEW.list_amount IS DISTINCT FROM OLD.list_amount
       OR COALESCE(NEW.discount_percent, 0) IS DISTINCT FROM COALESCE(OLD.discount_percent, 0)
       OR COALESCE(NEW.discount_amount, 0) IS DISTINCT FROM COALESCE(OLD.discount_amount, 0) THEN
      RAISE EXCEPTION 'Fixed TONART extra order pricing is immutable'
        USING ERRCODE = '22023';
    END IF;
  ELSIF v_shipping_mode = 'quote_required' THEN
    IF OLD.commercial_shipping_amount_brl IS NULL
       AND NEW.commercial_shipping_amount_brl IS NOT NULL THEN
      IF OLD.status NOT IN ('pending', 'reviewing')
         OR NEW.status <> 'answered'
         OR NEW.total_amount <> v_item_price + NEW.commercial_shipping_amount_brl
         OR NEW.list_amount <> NEW.total_amount
         OR COALESCE(NEW.discount_percent, 0) <> 0
         OR COALESCE(NEW.discount_amount, 0) <> 0 THEN
        RAISE EXCEPTION 'TONART extra order freight can only be confirmed with its response'
          USING ERRCODE = '22023';
      END IF;
    ELSIF NEW.commercial_shipping_amount_brl IS DISTINCT FROM OLD.commercial_shipping_amount_brl
       OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR NEW.list_amount IS DISTINCT FROM OLD.list_amount
       OR COALESCE(NEW.discount_percent, 0) IS DISTINCT FROM COALESCE(OLD.discount_percent, 0)
       OR COALESCE(NEW.discount_amount, 0) IS DISTINCT FROM COALESCE(OLD.discount_amount, 0) THEN
      RAISE EXCEPTION 'Confirmed TONART extra order pricing is immutable'
        USING ERRCODE = '22023';
    END IF;
  ELSE
    RAISE EXCEPTION 'TONART extra order shipping mode is invalid'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private_api.guard_tonart_extra_quote_contract()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER guard_tonart_extra_quote_contract
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION private_api.guard_tonart_extra_quote_contract();

CREATE UNIQUE INDEX IF NOT EXISTS tonecos_quotes_checkout_request_unique
  ON public.quotes(user_id, checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tonecos_quotes_commercial_offer_idx
  ON public.quotes(commercial_offer_id, created_at DESC)
  WHERE commercial_offer_id IS NOT NULL;

COMMENT ON COLUMN public.quotes.commercial_offer_snapshot IS
  'Immutable commercial terms captured when a catalog extra is ordered; source offer changes do not rewrite this contract.';
COMMENT ON COLUMN public.quotes.commercial_shipping_amount_brl IS
  'Shipping for an extra order. Fixed offers copy the configured amount; quote-required offers receive the amount during admin review.';
COMMENT ON COLUMN public.quotes.checkout_request_id IS
  'Customer-generated idempotency key for one extra order, unique within the customer account.';

CREATE OR REPLACE FUNCTION private_api.submit_tonart_extra_order_for_current_user(
  p_offer_id uuid,
  p_coins_amount numeric,
  p_checkout_request_id uuid,
  p_whatsapp text,
  p_postal_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_offer public.tonart_commercial_offers%ROWTYPE;
  v_existing public.quotes%ROWTYPE;
  v_quote_id uuid;
  v_whatsapp text := NULLIF(regexp_replace(COALESCE(p_whatsapp, ''), '[ ()+.-]', '', 'g'), '');
  v_postal_code text := NULLIF(regexp_replace(COALESCE(p_postal_code, ''), '[^0-9]', '', 'g'), '');
  v_subscriber_active boolean := false;
  v_discount_basis_points integer := 0;
  v_item_price_brl numeric(10,2);
  v_item_discount_brl numeric(10,2);
  v_shipping_amount_brl numeric(10,2);
  v_total_amount_brl numeric(12,2);
  v_balance numeric(12,2);
  v_coins_requested numeric(12,2);
  v_coins_applied numeric(12,2);
  v_cash_amount_due numeric(10,2);
  v_snapshot jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF p_offer_id IS NULL OR p_checkout_request_id IS NULL
     OR p_coins_amount IS NULL OR p_coins_amount <> round(p_coins_amount, 2)
     OR p_coins_amount < 0 OR p_coins_amount > 1000000
     OR length(COALESCE(p_whatsapp, '')) > 40
     OR v_whatsapp IS NULL OR v_whatsapp !~ '^[0-9]{10,13}$'
     OR length(COALESCE(p_postal_code, '')) > 20
     OR v_postal_code IS NULL OR v_postal_code !~ '^[0-9]{8}$' THEN
    RAISE EXCEPTION 'Invalid TONART extra order request' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles profile WHERE profile.id = v_user_id) THEN
    RAISE EXCEPTION 'Customer account not initialized' USING ERRCODE = '23503';
  END IF;

  -- Every balance writer uses this same customer lock. Repeated network
  -- submissions serialize before checking their idempotency key or balance.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 773042)
  );

  SELECT * INTO v_existing
    FROM public.quotes quote
   WHERE quote.user_id = v_user_id
     AND quote.checkout_request_id = p_checkout_request_id
   FOR UPDATE;
  IF FOUND THEN
    IF v_existing.commercial_offer_snapshot IS NULL
       OR v_existing.commercial_offer_id IS NULL THEN
      RAISE EXCEPTION 'Checkout request key does not reference a TONART extra order' USING ERRCODE = '23514';
    END IF;
    -- The key identifies the operation. A retry returns its original terms even
    -- if the form has since changed, avoiding a second order after a lost reply.
    RETURN pg_catalog.jsonb_build_object(
      'quote_id', v_existing.id,
      'checkout_request_id', p_checkout_request_id,
      'status', v_existing.status,
      'item_price_brl', v_existing.commercial_offer_snapshot->'itemPriceBrl',
      'shipping_mode', v_existing.commercial_offer_snapshot->'shippingMode',
      'shipping_amount_brl', v_existing.commercial_shipping_amount_brl,
      'coins_applied', v_existing.commercial_offer_snapshot->'coinsApplied',
      'cash_amount_due_brl', v_existing.total_amount
        - COALESCE((v_existing.commercial_offer_snapshot->>'coinsApplied')::numeric, 0),
      'idempotent', true
    );
  END IF;

  -- Lock the gate row so it cannot be closed halfway through this checkout.
  PERFORM 1
    FROM public.system_settings setting
   WHERE setting.key = 'tonart_extra_commerce_enabled'
     AND lower(COALESCE(setting.value, 'false')) = 'true'
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TONART_EXTRA_COMMERCE_DISABLED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_offer
    FROM public.tonart_commercial_offers offer
   WHERE offer.id = p_offer_id AND offer.is_active IS TRUE
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TONART_COMMERCIAL_OFFER_UNAVAILABLE' USING ERRCODE = 'P0002';
  END IF;
  IF NOT v_offer.coins_eligible AND p_coins_amount <> 0 THEN
    RAISE EXCEPTION 'TONART_OFFER_NOT_COINS_ELIGIBLE' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.subscriptions subscription
     WHERE subscription.user_id = v_user_id
       AND subscription.status = 'active'
       AND subscription.payment_status::text = 'paid'
  ) INTO v_subscriber_active;

  IF v_subscriber_active AND v_offer.subscriber_discount_eligible THEN
    v_discount_basis_points := v_offer.subscriber_discount_basis_points;
  END IF;
  v_item_price_brl := round(
    v_offer.item_price_brl * (10000 - v_discount_basis_points)::numeric / 10000,
    2
  )::numeric(10,2);
  IF v_item_price_brl <= 0 THEN
    RAISE EXCEPTION 'TONART_EXTRA_ORDER_ITEM_PRICE_INVALID' USING ERRCODE = '22023';
  END IF;
  v_item_discount_brl := (v_offer.item_price_brl - v_item_price_brl)::numeric(10,2);
  v_shipping_amount_brl := CASE
    WHEN v_offer.shipping_mode = 'fixed' THEN v_offer.shipping_amount_brl
    ELSE NULL
  END;
  v_total_amount_brl := v_item_price_brl + COALESCE(v_shipping_amount_brl, 0);
  IF v_total_amount_brl > 99999999.99 THEN
    RAISE EXCEPTION 'TONART_EXTRA_ORDER_TOTAL_INVALID' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(sum(entry.delta), 0)::numeric(12,2)
    INTO v_balance
    FROM public.tonecos_coin_entries entry
   WHERE entry.user_id = v_user_id;
  IF v_balance < 0 THEN
    RAISE EXCEPTION 'TONART_COIN_BALANCE_INVALID' USING ERRCODE = '23514';
  END IF;
  v_coins_requested := p_coins_amount::numeric(12,2);
  -- The requested amount is an upper limit. Coins are capped to the exact
  -- discounted item subtotal; they can never be used against shipping.
  v_coins_applied := CASE WHEN v_offer.coins_eligible IS TRUE
    THEN LEAST(v_coins_requested, v_balance, v_item_price_brl)
    ELSE 0
  END;
  v_cash_amount_due := (v_item_price_brl - v_coins_applied)::numeric(10,2);

  v_snapshot := pg_catalog.jsonb_build_object(
    'schemaVersion', 1,
    'offerId', v_offer.id,
    'catalogModelSlug', v_offer.catalog_model_slug,
    'scale', v_offer.scale,
    'finishing', v_offer.finishing,
    'contentsDescription', v_offer.contents_description,
    'itemListPriceBrl', v_offer.item_price_brl,
    'itemDiscountBrl', v_item_discount_brl,
    'itemPriceBrl', v_item_price_brl,
    'subscriberDiscountEligible', v_offer.subscriber_discount_eligible,
    'subscriberDiscountApplied', v_discount_basis_points > 0,
    'subscriberDiscountBasisPoints', v_discount_basis_points,
    'shippingMode', v_offer.shipping_mode,
    'configuredShippingAmountBrl', v_offer.shipping_amount_brl,
    'deliveryTerms', v_offer.delivery_terms,
    'coinsEligible', v_offer.coins_eligible,
    'coinsRequested', v_coins_requested,
    'coinsApplied', v_coins_applied,
    'initialCashAmountDueBrl', v_cash_amount_due,
    'currency', 'BRL'
  );

  INSERT INTO public.quotes (
    user_id, status, notes, requested_catalog_models, total_amount,
    customer_whatsapp, postal_code, desired_scale, finishing,
    is_preorder, payment_status, remaining_amount, list_amount,
    discount_percent, discount_amount, commercial_offer_id,
    commercial_offer_snapshot, commercial_shipping_amount_brl,
    checkout_request_id
  ) VALUES (
    v_user_id, 'pending', 'Pedido extra feito pela oferta do catálogo.',
    pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'slug', v_offer.catalog_model_slug, 'quantity', 1
    )),
    v_total_amount_brl, v_whatsapp, v_postal_code, v_offer.scale,
    CASE WHEN v_offer.finishing = 'painted' THEN 'pintado' ELSE 'sem pintura' END,
    false, 'pending',
    CASE WHEN v_offer.shipping_mode = 'fixed' AND v_total_amount_brl > v_coins_applied
      THEN (v_total_amount_brl - v_coins_applied)::numeric(10,2) ELSE NULL END,
    v_total_amount_brl, 0, 0, v_offer.id, v_snapshot,
    v_shipping_amount_brl, p_checkout_request_id
  ) RETURNING id INTO v_quote_id;

  INSERT INTO public.quote_events (
    quote_id, actor_user_id, event_type, from_status, to_status
  ) VALUES (v_quote_id, v_user_id, 'submitted', NULL, 'pending');

  IF v_coins_applied > 0 THEN
    INSERT INTO public.tonecos_coin_entries (
      user_id, entry_type, delta, reference_key, reason, created_by
    ) VALUES (
      v_user_id, 'purchase_spend', -v_coins_applied, p_checkout_request_id,
      'Reserva de Coins para pedido extra #' || left(v_quote_id::text, 8), v_user_id
    );

    INSERT INTO public.quote_payments (
      quote_id, user_id, payment_type, amount, status, payment_method,
      paid_at, recorded_by
    ) VALUES (
      v_quote_id, v_user_id, 'coins', v_coins_applied, 'completed',
      'tonecos_coins', clock_timestamp(), v_user_id
    );
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'quote_id', v_quote_id,
    'checkout_request_id', p_checkout_request_id,
    'status', 'pending',
    'item_price_brl', v_item_price_brl,
    'shipping_mode', v_offer.shipping_mode,
    'shipping_amount_brl', v_shipping_amount_brl,
    'coins_applied', v_coins_applied,
    'cash_amount_due_brl', CASE
      WHEN v_offer.shipping_mode = 'fixed' THEN v_total_amount_brl - v_coins_applied
      ELSE v_cash_amount_due
    END,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION private_api.submit_tonart_extra_order_for_current_user(uuid,numeric,uuid,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.submit_tonart_extra_order_for_current_user(uuid,numeric,uuid,text,text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_tonart_extra_order_for_current_user(
  p_offer_id uuid,
  p_coins_amount numeric,
  p_checkout_request_id uuid,
  p_whatsapp text,
  p_postal_code text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.submit_tonart_extra_order_for_current_user(
    p_offer_id, p_coins_amount, p_checkout_request_id, p_whatsapp, p_postal_code
  );
$function$;
REVOKE ALL ON FUNCTION public.submit_tonart_extra_order_for_current_user(uuid,numeric,uuid,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_tonart_extra_order_for_current_user(uuid,numeric,uuid,text,text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private_api.cancel_tonart_extra_order(
  p_quote_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_owner uuid;
  v_quote public.quotes%ROWTYPE;
  v_spend public.tonecos_coin_entries%ROWTYPE;
  v_reversal public.tonecos_coin_entries%ROWTYPE;
  v_balance numeric(12,2);
  v_reason text := NULLIF(btrim(COALESCE(p_reason, '')), '');
  v_previous_status text;
  v_coin_payment_count integer;
  v_coin_payment_total numeric(12,2);
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF p_quote_id IS NULL OR v_reason IS NULL OR length(v_reason) NOT BETWEEN 4 AND 500 THEN
    RAISE EXCEPTION 'Invalid TONART extra order cancellation' USING ERRCODE = '22023';
  END IF;

  SELECT quote.user_id INTO v_owner
    FROM public.quotes quote
   WHERE quote.id = p_quote_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Extra order not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner <> v_actor AND NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Extra order access denied' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text, 773042)
  );

  SELECT * INTO v_quote
    FROM public.quotes quote
   WHERE quote.id = p_quote_id AND quote.user_id = v_owner
   FOR UPDATE;
  IF v_quote.commercial_offer_snapshot IS NULL OR v_quote.checkout_request_id IS NULL THEN
    RAISE EXCEPTION 'Quote is not a TONART extra order' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payment_links link
     WHERE link.quote_id = p_quote_id AND link.status = 'sent'
  ) THEN
    RAISE EXCEPTION 'TONART_EXTRA_ORDER_PAYMENT_INSTRUCTIONS_ALREADY_SENT' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(v_quote.payment_status::text, 'pending') IN ('under_review', 'deposit_paid')
     OR (v_quote.payment_voucher_path IS NOT NULL
       AND v_quote.payment_voucher_rejection_reason IS NULL)
     OR EXISTS (
       SELECT 1 FROM public.quote_payments payment
        WHERE payment.quote_id = p_quote_id
          AND payment.payment_type <> 'coins'
          AND payment.status = 'completed'
     ) THEN
    RAISE EXCEPTION 'TONART_EXTRA_ORDER_CASH_PAYMENT_REQUIRES_MANUAL_REVIEW' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer, COALESCE(sum(payment.amount), 0)::numeric(12,2)
    INTO v_coin_payment_count, v_coin_payment_total
    FROM public.quote_payments payment
   WHERE payment.quote_id = p_quote_id
     AND payment.payment_type = 'coins';
  PERFORM 1
    FROM public.quote_payments payment
   WHERE payment.quote_id = p_quote_id
     AND payment.payment_type = 'coins'
   FOR UPDATE;
  SELECT * INTO v_spend
    FROM public.tonecos_coin_entries entry
   WHERE entry.user_id = v_owner
     AND entry.reference_key = v_quote.checkout_request_id;

  IF v_coin_payment_count > 1
     OR (v_spend.id IS NOT NULL) <> (v_coin_payment_count = 1)
     OR (v_spend.id IS NOT NULL AND (
       v_spend.entry_type <> 'purchase_spend'
       OR v_spend.delta >= 0
       OR v_coin_payment_total <> -v_spend.delta
     )) THEN
    RAISE EXCEPTION 'TONART_EXTRA_ORDER_COIN_ENTRY_INVALID' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.quote_payments payment
     WHERE payment.quote_id = p_quote_id
       AND payment.payment_type = 'coins'
       AND payment.status NOT IN ('completed', 'refunded')
  ) THEN
    RAISE EXCEPTION 'TONART_EXTRA_ORDER_COIN_PAYMENT_INCONSISTENT' USING ERRCODE = '23514';
  END IF;
  IF v_spend.id IS NOT NULL THEN
    SELECT * INTO v_reversal
      FROM public.tonecos_coin_entries reversal
     WHERE reversal.reverses_entry_id = v_spend.id;
    IF NOT FOUND THEN
      INSERT INTO public.tonecos_coin_entries (
        user_id, entry_type, delta, reference_key, reverses_entry_id,
        reason, created_by
      ) VALUES (
        v_owner, 'purchase_reversal', -v_spend.delta, gen_random_uuid(),
        v_spend.id, v_reason, v_actor
      ) RETURNING * INTO v_reversal;
    ELSIF v_reversal.user_id <> v_owner
       OR v_reversal.entry_type <> 'purchase_reversal'
       OR v_reversal.delta <> -v_spend.delta THEN
      RAISE EXCEPTION 'TONART_EXTRA_ORDER_COIN_REVERSAL_INCONSISTENT' USING ERRCODE = '23514';
    END IF;
    UPDATE public.quote_payments
       SET status = 'refunded', updated_at = clock_timestamp()
     WHERE quote_id = p_quote_id AND payment_type = 'coins' AND status = 'completed';
  END IF;

  v_previous_status := v_quote.status;
  UPDATE public.payment_links
     SET status = 'cancelled', updated_at = clock_timestamp()
   WHERE quote_id = p_quote_id AND status = 'sent';
  UPDATE public.quotes
     SET status = 'archived',
         payment_status = 'failed',
         remaining_amount = NULL,
         admin_response = v_reason,
         payment_link = NULL,
         pix_key = NULL,
         payment_instructions = NULL,
         payment_link_sent_at = NULL,
         payment_voucher_path = NULL,
         payment_voucher_type = NULL,
         payment_voucher_rejection_reason = NULL,
         updated_at = clock_timestamp()
   WHERE id = p_quote_id;
  IF v_previous_status <> 'archived' THEN
    INSERT INTO public.quote_events (
      quote_id, actor_user_id, event_type, from_status, to_status
    ) VALUES (p_quote_id, v_actor, 'status_changed', v_previous_status, 'archived');
  END IF;

  SELECT COALESCE(sum(entry.delta), 0)::numeric(12,2)
    INTO v_balance
    FROM public.tonecos_coin_entries entry
   WHERE entry.user_id = v_owner;
  RETURN pg_catalog.jsonb_build_object(
    'quote_id', p_quote_id,
    'status', 'archived',
    'payment_status', 'failed',
    'coins_reversed', CASE WHEN v_spend.id IS NULL THEN 0 ELSE -v_spend.delta END,
    'balance', v_balance,
    'idempotent', v_previous_status = 'archived'
      AND (v_spend.id IS NULL OR v_reversal.id IS NOT NULL)
  );
END;
$function$;
REVOKE ALL ON FUNCTION private_api.cancel_tonart_extra_order(uuid,text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancel_tonart_extra_order_for_current_user(p_quote_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT private_api.cancel_tonart_extra_order(
    p_quote_id, 'Cancelamento solicitado pelo cliente.'
  );
$function$;
REVOKE ALL ON FUNCTION public.cancel_tonart_extra_order_for_current_user(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_tonart_extra_order_for_current_user(uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_cancel_tonart_extra_order(
  p_quote_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  RETURN private_api.cancel_tonart_extra_order(p_quote_id, p_reason);
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_cancel_tonart_extra_order(uuid,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cancel_tonart_extra_order(uuid,text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_answer_tonart_extra_order(
  p_quote_id uuid,
  p_shipping_amount numeric,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_snapshot jsonb;
  v_item_price numeric(10,2);
  v_shipping numeric(10,2);
  v_total numeric(12,2);
  v_paid numeric(10,2);
  v_remaining numeric(10,2);
  v_previous text;
  v_message text := NULLIF(btrim(COALESCE(p_message, '')), '');
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_quote_id IS NULL OR p_shipping_amount IS NULL
     OR p_shipping_amount < 0 OR p_shipping_amount > 99999999.99
     OR p_shipping_amount <> round(p_shipping_amount, 2)
     OR v_message IS NULL OR length(v_message) > 2000 THEN
    RAISE EXCEPTION 'Invalid TONART extra order response' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_quote FROM public.quotes quote
   WHERE quote.id = p_quote_id FOR UPDATE;
  IF NOT FOUND OR v_quote.commercial_offer_snapshot IS NULL
     OR v_quote.status NOT IN ('pending', 'reviewing') THEN
    RAISE EXCEPTION 'TONART extra order unavailable for response' USING ERRCODE = 'P0002';
  END IF;
  v_snapshot := v_quote.commercial_offer_snapshot;
  v_item_price := (v_snapshot->>'itemPriceBrl')::numeric(10,2);
  IF v_snapshot->>'shippingMode' = 'fixed' THEN
    IF v_quote.commercial_shipping_amount_brl IS NULL
       OR p_shipping_amount <> v_quote.commercial_shipping_amount_brl THEN
      RAISE EXCEPTION 'Configured shipping cannot be changed for this extra order' USING ERRCODE = '22023';
    END IF;
  ELSIF v_snapshot->>'shippingMode' <> 'quote_required' THEN
    RAISE EXCEPTION 'TONART extra order snapshot is invalid' USING ERRCODE = '23514';
  END IF;
  v_shipping := p_shipping_amount::numeric(10,2);
  v_total := v_item_price + v_shipping;
  IF v_total <= 0 OR v_total > 99999999.99 THEN
    RAISE EXCEPTION 'TONART extra order total is invalid' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(sum(payment.amount), 0)::numeric(10,2)
    INTO v_paid FROM public.quote_payments payment
   WHERE payment.quote_id = p_quote_id AND payment.status = 'completed';
  IF v_paid < 0 OR v_paid > v_total THEN
    RAISE EXCEPTION 'TONART extra order payments exceed its total' USING ERRCODE = '23514';
  END IF;
  v_remaining := (v_total - v_paid)::numeric(10,2);
  v_previous := v_quote.status;

  UPDATE public.quotes
     SET commercial_shipping_amount_brl = v_shipping,
         list_amount = v_total,
         discount_percent = 0,
         discount_amount = 0,
         total_amount = v_total,
         remaining_amount = CASE WHEN v_remaining > 0 THEN v_remaining ELSE NULL END,
         payment_status = CASE WHEN v_remaining = 0 THEN 'fully_paid' ELSE 'pending' END,
         admin_response = v_message,
         status = 'answered',
         updated_at = clock_timestamp()
   WHERE id = p_quote_id;
  INSERT INTO public.quote_events (
    quote_id, actor_user_id, event_type, from_status, to_status, amount, response_text
  ) VALUES (
    p_quote_id, (SELECT auth.uid()), 'answered', v_previous, 'answered', v_total, v_message
  );
  RETURN p_quote_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_answer_tonart_extra_order(uuid,numeric,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_answer_tonart_extra_order(uuid,numeric,text)
  TO authenticated, service_role;

-- Keep the general-purpose quote responder from rewriting an extra order's
-- immutable offer terms or price. Extra orders use the specific admin RPC.
CREATE OR REPLACE FUNCTION private_api.answer_catalog_quote_request(
  p_quote_id uuid,
  p_amount numeric,
  p_message text,
  p_discount_percent integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_previous text;
  v_is_preorder boolean;
  v_deposit numeric(10,2);
  v_discount_amount numeric(10,2);
  v_final_amount numeric(10,2);
  v_offer_id uuid;
  v_updated uuid;
  v_message text := NULLIF(btrim(COALESCE(p_message, '')), '');
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_quote_id IS NULL OR p_amount IS NULL OR p_amount <= 0
     OR p_amount > 99999999.99 OR p_amount <> round(p_amount, 2)
     OR p_discount_percent IS NULL OR p_discount_percent NOT BETWEEN 0 AND 50
     OR length(COALESCE(v_message, '')) > 2000 THEN
    RAISE EXCEPTION 'Invalid quote response' USING ERRCODE = '22023';
  END IF;
  v_discount_amount := round(p_amount * p_discount_percent / 100.0, 2);
  v_final_amount := (p_amount - v_discount_amount)::numeric(10,2);
  IF v_final_amount <= 0 THEN
    RAISE EXCEPTION 'Discounted quote total must remain positive' USING ERRCODE = '22023';
  END IF;

  SELECT quote.status, COALESCE(quote.is_preorder, false),
         COALESCE(quote.deposit_amount, 50), quote.commercial_offer_id
    INTO v_previous, v_is_preorder, v_deposit, v_offer_id
    FROM public.quotes quote
   WHERE quote.id = p_quote_id AND quote.catalog_requested_at IS NOT NULL
   FOR UPDATE;
  IF v_previous IS NULL OR v_previous NOT IN ('pending', 'reviewing') THEN
    RAISE EXCEPTION 'Quote unavailable for pricing' USING ERRCODE = 'P0002';
  END IF;
  IF v_offer_id IS NOT NULL THEN
    RAISE EXCEPTION 'Use admin_answer_tonart_extra_order for catalog extra orders' USING ERRCODE = '22023';
  END IF;
  IF v_is_preorder AND (v_deposit <> 50 OR v_final_amount <= v_deposit) THEN
    RAISE EXCEPTION 'Pre-order total after discount must exceed the R$50 deposit' USING ERRCODE = '22023';
  END IF;

  UPDATE public.quotes quote
     SET list_amount = p_amount,
         discount_percent = p_discount_percent,
         discount_amount = v_discount_amount,
         total_amount = v_final_amount,
         deposit_amount = CASE WHEN v_is_preorder THEN v_deposit ELSE quote.deposit_amount END,
         remaining_amount = CASE WHEN v_is_preorder THEN v_final_amount - v_deposit ELSE quote.remaining_amount END,
         admin_response = v_message,
         status = 'answered',
         updated_at = clock_timestamp()
   WHERE quote.id = p_quote_id
   RETURNING quote.id INTO v_updated;
  INSERT INTO public.quote_events (
    quote_id, actor_user_id, event_type, from_status, to_status, amount, response_text
  ) VALUES (
    p_quote_id, (SELECT auth.uid()), 'answered', v_previous, 'answered', v_final_amount, v_message
  );
  RETURN v_updated;
END;
$function$;

-- Archiving a reserved extra order must go through the idempotent reversal
-- path instead of silently stranding Coins in the customer's ledger.
CREATE OR REPLACE FUNCTION private_api.admin_update_quote_status(
  p_quote_id uuid,
  p_status text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_previous text;
  v_offer_id uuid;
  v_updated uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_quote_id IS NULL OR p_status IS NULL
     OR p_status NOT IN ('pending', 'reviewing', 'archived') THEN
    RAISE EXCEPTION 'Invalid quote status' USING ERRCODE = '22023';
  END IF;
  SELECT quote.status, quote.commercial_offer_id
    INTO v_previous, v_offer_id
    FROM public.quotes quote WHERE quote.id = p_quote_id FOR UPDATE;
  IF v_previous IS NULL OR NOT (
       (v_previous = 'pending' AND p_status IN ('reviewing', 'archived'))
       OR (v_previous = 'reviewing' AND p_status IN ('pending', 'archived'))
       OR (v_previous = 'answered' AND p_status = 'archived')
     ) THEN
    RAISE EXCEPTION 'Quote unavailable for status change' USING ERRCODE = 'P0002';
  END IF;
  IF v_offer_id IS NOT NULL AND p_status = 'archived' THEN
    RAISE EXCEPTION 'Use an explicit extra-order cancellation to reverse Coins' USING ERRCODE = '22023';
  END IF;
  UPDATE public.quotes SET status = p_status, updated_at = clock_timestamp()
   WHERE id = p_quote_id RETURNING id INTO v_updated;
  INSERT INTO public.quote_events (
    quote_id, actor_user_id, event_type, from_status, to_status
  ) VALUES (p_quote_id, (SELECT auth.uid()), 'status_changed', v_previous, p_status);
  RETURN v_updated;
END;
$function$;

CREATE OR REPLACE FUNCTION private_api.tonart_admin_quotes_directory(
  p_quote_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_total integer;
  v_rows jsonb;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF (p_status IS NOT NULL AND p_status NOT IN ('pending', 'reviewing', 'answered', 'archived'))
     OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset < 0 OR p_offset > 100000 THEN
    RAISE EXCEPTION 'Invalid quote directory query' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer INTO v_total
    FROM public.quotes quote
   WHERE quote.catalog_requested_at IS NOT NULL
     AND (p_quote_id IS NULL OR quote.id = p_quote_id)
     AND (p_status IS NULL OR quote.status = p_status);
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id', x.id,
      'userId', x.user_id,
      'customerName', x.full_name,
      'customerEmail', x.email,
      'status', x.status,
      'createdAt', x.created_at,
      'notes', x.notes,
      'quotedAmount', CASE WHEN x.status IN ('answered', 'archived') AND x.total_amount > 0
        AND NOT (x.commercial_offer_snapshot IS NOT NULL AND x.payment_status::text = 'failed')
        THEN x.total_amount ELSE NULL END,
      'listAmount', CASE WHEN x.status IN ('answered', 'archived') AND x.total_amount > 0
        AND NOT (x.commercial_offer_snapshot IS NOT NULL AND x.payment_status::text = 'failed')
        THEN COALESCE(x.list_amount, x.total_amount) ELSE NULL END,
      'discountPercent', COALESCE(x.discount_percent, 0),
      'discountAmount', COALESCE(x.discount_amount, 0),
      'responseMessage', x.admin_response,
      'items', x.requested_catalog_models,
      'whatsapp', x.customer_whatsapp,
      'postalCode', x.postal_code,
      'scale', x.desired_scale,
      'finishing', x.finishing,
      'isPreorder', COALESCE(x.is_preorder, false),
      'depositAmount', x.deposit_amount,
      'remainingAmount', x.remaining_amount,
      'commercialOfferSnapshot', x.commercial_offer_snapshot,
      'commercialShippingAmountBrl', x.commercial_shipping_amount_brl,
      'canCancelExtraOrder', x.commercial_offer_snapshot IS NOT NULL
        AND x.status <> 'archived'
        AND x.payment_link_sent_at IS NULL
        AND NOT x.has_sent_payment_link
        AND COALESCE(x.payment_status::text, 'pending') NOT IN ('under_review', 'deposit_paid')
        AND (x.payment_voucher_path IS NULL OR x.payment_voucher_rejection_reason IS NOT NULL)
        AND NOT x.has_cash_payment
    ) ORDER BY x.created_at DESC, x.id DESC), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT quote.id, quote.user_id, profile.full_name, profile.email,
             quote.status, quote.created_at, quote.notes, quote.total_amount,
             quote.list_amount, quote.discount_percent, quote.discount_amount,
             quote.admin_response, quote.requested_catalog_models,
             quote.customer_whatsapp, quote.postal_code, quote.desired_scale,
             quote.finishing, quote.is_preorder, quote.deposit_amount,
              quote.remaining_amount, quote.commercial_offer_snapshot,
              quote.commercial_shipping_amount_brl, quote.payment_status,
              quote.payment_link_sent_at, quote.payment_voucher_path,
              quote.payment_voucher_rejection_reason,
             EXISTS (
               SELECT 1 FROM public.quote_payments payment
                WHERE payment.quote_id = quote.id
                  AND payment.payment_type <> 'coins'
                  AND payment.status = 'completed'
              ) AS has_cash_payment,
              EXISTS (
                SELECT 1 FROM public.payment_links link
                 WHERE link.quote_id = quote.id
                   AND link.status = 'sent'
              ) AS has_sent_payment_link
        FROM public.quotes quote
        JOIN public.profiles profile ON profile.id = quote.user_id
       WHERE quote.catalog_requested_at IS NOT NULL
         AND (p_quote_id IS NULL OR quote.id = p_quote_id)
         AND (p_status IS NULL OR quote.status = p_status)
       ORDER BY quote.created_at DESC, quote.id DESC
       LIMIT p_limit OFFSET p_offset
    ) x;
  RETURN pg_catalog.jsonb_build_object(
    'total', v_total, 'limit', p_limit, 'offset', p_offset, 'rows', v_rows
  );
END;
$function$;
REVOKE ALL ON FUNCTION private_api.tonart_admin_quotes_directory(uuid,text,integer,integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.tonart_admin_quotes_directory(uuid,text,integer,integer)
  TO authenticated, service_role;

-- Keep the existing payment-link and voucher-review authorities while
-- allowing the full range supported by quotes/payment_links numeric(10,2).
CREATE OR REPLACE FUNCTION private_api.admin_send_payment_link(
  p_quote_id uuid,
  p_amount numeric,
  p_payment_type text,
  p_payment_link text DEFAULT NULL,
  p_pix_key text DEFAULT NULL,
  p_instructions text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_payment_link text := NULLIF(btrim(COALESCE(p_payment_link, '')), '');
  v_pix_key text := NULLIF(btrim(COALESCE(p_pix_key, '')), '');
  v_instructions text := NULLIF(btrim(COALESCE(p_instructions, '')), '');
  v_expected_amount numeric(10,2);
  v_paid_amount numeric(10,2);
  v_link_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_quote_id IS NULL
     OR p_payment_type IS NULL OR p_payment_type NOT IN ('deposit', 'final', 'full')
     OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 99999999.99
     OR p_amount <> round(p_amount, 2)
     OR (v_payment_link IS NOT NULL AND (
       length(v_payment_link) > 2000
       OR v_payment_link !~* '^https://[^[:space:]]+$'
       OR v_payment_link ~* '^https://[^/]*@'
     ))
     OR (v_pix_key IS NOT NULL AND length(v_pix_key) > 220)
     OR v_instructions IS NULL OR length(v_instructions) > 4000
     OR (v_payment_link IS NULL AND v_pix_key IS NULL) THEN
    RAISE EXCEPTION 'Invalid quote payment instructions' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND OR v_quote.status <> 'answered' THEN
    RAISE EXCEPTION 'Answered quote is unavailable for payment instructions' USING ERRCODE = 'P0002';
  END IF;

  IF p_payment_type = 'full' THEN
    IF COALESCE(v_quote.is_preorder, false)
       OR COALESCE(v_quote.payment_status, 'pending') <> 'pending'
       OR COALESCE(v_quote.total_amount, 0) <= 0 THEN
      RAISE EXCEPTION 'Full quote payment is not payable' USING ERRCODE = '22023';
    END IF;
    SELECT COALESCE(sum(amount), 0)::numeric(10,2) INTO v_paid_amount
      FROM public.quote_payments
     WHERE quote_id = p_quote_id AND status = 'completed';
    v_expected_amount := round(v_quote.total_amount - v_paid_amount, 2);
    IF v_quote.remaining_amount IS NOT NULL
       AND v_quote.remaining_amount <> v_expected_amount THEN
      RAISE EXCEPTION 'Quote balance is inconsistent' USING ERRCODE = '22023';
    END IF;
    IF v_expected_amount <= 0 THEN
      RAISE EXCEPTION 'Quote is already paid' USING ERRCODE = '22023';
    END IF;
  ELSIF p_payment_type = 'deposit' THEN
    IF NOT COALESCE(v_quote.is_preorder, false)
       OR v_quote.payment_status <> 'pending'
       OR COALESCE(v_quote.deposit_amount, 0) <> 50
       OR COALESCE(v_quote.total_amount, 0) <= 50 THEN
      RAISE EXCEPTION 'Pre-order deposit is not payable' USING ERRCODE = '22023';
    END IF;
    v_expected_amount := v_quote.deposit_amount;
  ELSE
    IF NOT COALESCE(v_quote.is_preorder, false)
       OR v_quote.payment_status <> 'deposit_paid'
       OR NOT COALESCE(v_quote.ready_for_final_payment, false)
       OR COALESCE(v_quote.remaining_amount, 0) <= 0
       OR COALESCE(v_quote.total_amount, 0) <= 50
       OR v_quote.remaining_amount <> v_quote.total_amount - v_quote.deposit_amount THEN
      RAISE EXCEPTION 'Pre-order balance is not payable' USING ERRCODE = '22023';
    END IF;
    v_expected_amount := v_quote.remaining_amount;
  END IF;

  IF p_amount <> v_expected_amount THEN
    RAISE EXCEPTION 'Payment amount does not match the quote balance' USING ERRCODE = '22023';
  END IF;

  UPDATE public.payment_links
     SET status = 'cancelled', updated_at = clock_timestamp()
   WHERE quote_id = p_quote_id AND status = 'sent';
  INSERT INTO public.payment_links (
    quote_id, payment_type, amount, payment_link, pix_key,
    instructions, sent_by, status, updated_at
  ) VALUES (
    p_quote_id, p_payment_type, v_expected_amount, v_payment_link, v_pix_key,
    v_instructions, (SELECT auth.uid()), 'sent', clock_timestamp()
  ) RETURNING id INTO v_link_id;
  UPDATE public.quotes
     SET payment_status = CASE WHEN p_payment_type = 'full' THEN 'pending' ELSE payment_status END,
         remaining_amount = CASE WHEN p_payment_type = 'full' THEN v_expected_amount ELSE remaining_amount END,
         payment_link = v_payment_link,
         pix_key = v_pix_key,
         payment_instructions = v_instructions,
         payment_link_sent_at = clock_timestamp(),
         updated_at = clock_timestamp()
   WHERE id = p_quote_id;
  RETURN v_link_id;
END;
$function$;

CREATE OR REPLACE FUNCTION private_api.admin_register_preorder_manual_payment(
  p_quote_id uuid,
  p_payment_type text,
  p_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_payment_type text := NULLIF(btrim(COALESCE(p_payment_type, '')), '');
  v_amount numeric(10,2) := round(COALESCE(p_amount, 0), 2);
  v_expected numeric(10,2);
  v_paid numeric(10,2);
  v_payment_id uuid;
  v_is_voucher_review boolean;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF v_payment_type IS NULL OR v_payment_type NOT IN ('deposit', 'final', 'full') THEN
    RAISE EXCEPTION 'Invalid quote payment type' USING ERRCODE = '22023';
  END IF;
  IF p_quote_id IS NULL OR p_amount IS NULL OR p_amount <> v_amount
     OR v_amount <= 0 OR v_amount > 99999999.99 THEN
    RAISE EXCEPTION 'Invalid payment amount' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND OR v_quote.status <> 'answered' THEN
    RAISE EXCEPTION 'Answered quote not found' USING ERRCODE = 'P0002';
  END IF;
  v_is_voucher_review := v_quote.payment_status::text = 'under_review';

  IF v_payment_type = 'full' THEN
    IF COALESCE(v_quote.is_preorder, false)
       OR COALESCE(v_quote.payment_status::text, 'pending') NOT IN ('pending', 'under_review')
       OR COALESCE(v_quote.total_amount, 0) <= 0 THEN
      RAISE EXCEPTION 'Full quote payment is not available' USING ERRCODE = '22023';
    END IF;
    SELECT COALESCE(sum(amount), 0)::numeric(10,2) INTO v_paid
      FROM public.quote_payments WHERE quote_id = p_quote_id AND status = 'completed';
    v_expected := round(v_quote.total_amount - v_paid, 2);
    IF v_quote.remaining_amount IS NOT NULL
       AND v_quote.remaining_amount <> v_expected THEN
      RAISE EXCEPTION 'Quote balance is inconsistent' USING ERRCODE = '22023';
    END IF;
  ELSIF v_payment_type = 'deposit' THEN
    IF NOT COALESCE(v_quote.is_preorder, false)
       OR COALESCE(v_quote.payment_status::text, '') NOT IN ('pending', 'under_review')
       OR COALESCE(v_quote.deposit_amount, 0) <> 50
       OR COALESCE(v_quote.total_amount, 0) <= v_quote.deposit_amount THEN
      RAISE EXCEPTION 'Deposit can only be registered for pending preorders' USING ERRCODE = '22023';
    END IF;
    v_expected := v_quote.deposit_amount;
  ELSE
    IF NOT COALESCE(v_quote.is_preorder, false)
       OR COALESCE(v_quote.payment_status::text, '') NOT IN ('deposit_paid', 'under_review')
       OR NOT COALESCE(v_quote.ready_for_final_payment, false)
       OR COALESCE(v_quote.deposit_amount, 0) <> 50
       OR COALESCE(v_quote.total_amount, 0) <= v_quote.deposit_amount
       OR COALESCE(v_quote.remaining_amount, 0) <> v_quote.total_amount - v_quote.deposit_amount THEN
      RAISE EXCEPTION 'Final payment can only be registered after release' USING ERRCODE = '22023';
    END IF;
    v_expected := v_quote.remaining_amount;
  END IF;

  IF v_is_voucher_review AND (
       v_quote.payment_voucher_path IS NULL
       OR v_quote.payment_voucher_type IS DISTINCT FROM v_payment_type
     ) THEN
    RAISE EXCEPTION 'Voucher does not match the pending payment' USING ERRCODE = '22023';
  END IF;
  IF v_amount <> v_expected THEN
    RAISE EXCEPTION 'Payment amount must match the configured quote amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.quote_payments (
    quote_id, user_id, payment_type, amount, status, payment_method,
    paid_at, recorded_by, payment_voucher_path, updated_at
  ) VALUES (
    p_quote_id, v_quote.user_id, v_payment_type, v_expected, 'completed',
    CASE WHEN v_is_voucher_review THEN 'voucher' ELSE 'manual' END,
    now(), auth.uid(),
    CASE WHEN v_is_voucher_review THEN v_quote.payment_voucher_path ELSE NULL END, now()
  ) RETURNING id INTO v_payment_id;

  UPDATE public.payment_links
     SET status = 'cancelled', updated_at = clock_timestamp()
   WHERE quote_id = p_quote_id AND payment_type = v_payment_type AND status = 'sent';
  UPDATE public.quotes
     SET payment_status = CASE WHEN v_payment_type = 'deposit' THEN 'deposit_paid' ELSE 'fully_paid' END,
         remaining_amount = CASE WHEN v_payment_type = 'full' THEN NULL ELSE remaining_amount END,
         ready_for_final_payment = CASE WHEN v_payment_type IN ('final', 'full') THEN false ELSE ready_for_final_payment END,
         payment_voucher_rejection_reason = NULL,
         payment_voucher_reviewed_at = now(),
         payment_voucher_reviewed_by = auth.uid(),
         updated_at = now()
   WHERE id = p_quote_id;
  RETURN v_payment_id;
END;
$function$;

NOTIFY pgrst, 'reload schema';
COMMIT;
