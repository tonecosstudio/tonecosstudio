BEGIN;

-- Record the customer's undiscounted base, the approved campaign reduction and
-- the final amount on the existing canonical quote. No parallel cart/pricing
-- authority is introduced; the admin response remains the only price writer.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS list_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS discount_percent smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0;

-- Existing answered quotes retain their historical total as the undiscounted
-- amount; the new offer does not retroactively change a customer's price.
UPDATE public.quotes
   SET list_amount = total_amount
 WHERE total_amount > 0
   AND list_amount IS NULL;

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS tonecos_quote_discount_percent_range,
  ADD CONSTRAINT tonecos_quote_discount_percent_range
    CHECK (discount_percent BETWEEN 0 AND 50) NOT VALID,
  DROP CONSTRAINT IF EXISTS tonecos_quote_discount_amount_consistency,
  ADD CONSTRAINT tonecos_quote_discount_amount_consistency CHECK (
    ((total_amount IS NULL OR total_amount <= 0) AND list_amount IS NULL AND discount_percent = 0 AND discount_amount = 0)
    OR (
      total_amount IS NOT NULL
      AND list_amount IS NOT NULL
      AND list_amount > 0
      AND total_amount > 0
      AND discount_amount >= 0
      AND discount_amount <= list_amount
      AND total_amount = round(list_amount - discount_amount, 2)
      AND discount_amount = round(list_amount * discount_percent / 100.0, 2)
    )
  ) NOT VALID;

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
  v_updated uuid;
  v_message text := NULLIF(btrim(COALESCE(p_message, '')), '');
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT private_api.is_current_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_quote_id IS NULL
     OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 99999999.99
     OR p_amount <> round(p_amount, 2)
     OR p_discount_percent IS NULL OR p_discount_percent NOT BETWEEN 0 AND 50
     OR length(COALESCE(v_message, '')) > 2000 THEN
    RAISE EXCEPTION 'Invalid quote response' USING ERRCODE = '22023';
  END IF;

  v_discount_amount := round(p_amount * p_discount_percent / 100.0, 2);
  v_final_amount := p_amount - v_discount_amount;
  IF v_final_amount <= 0 THEN
    RAISE EXCEPTION 'Discounted quote total must remain positive' USING ERRCODE = '22023';
  END IF;

  SELECT status, COALESCE(is_preorder, false), COALESCE(deposit_amount, 50)
    INTO v_previous, v_is_preorder, v_deposit
    FROM public.quotes
   WHERE id = p_quote_id
     AND catalog_requested_at IS NOT NULL
   FOR UPDATE;
  IF v_previous IS NULL OR v_previous NOT IN ('pending', 'reviewing') THEN
    RAISE EXCEPTION 'Quote unavailable for pricing' USING ERRCODE = 'P0002';
  END IF;
  IF v_is_preorder AND (v_deposit <> 50 OR v_final_amount <= v_deposit) THEN
    RAISE EXCEPTION 'Pre-order total after discount must exceed the R$50 deposit' USING ERRCODE = '22023';
  END IF;

  UPDATE public.quotes
     SET list_amount = p_amount,
         discount_percent = p_discount_percent,
         discount_amount = v_discount_amount,
         total_amount = v_final_amount,
         deposit_amount = CASE WHEN v_is_preorder THEN v_deposit ELSE deposit_amount END,
         remaining_amount = CASE WHEN v_is_preorder THEN v_final_amount - v_deposit ELSE remaining_amount END,
         admin_response = v_message,
         status = 'answered',
         updated_at = clock_timestamp()
   WHERE id = p_quote_id
   RETURNING id INTO v_updated;

  INSERT INTO public.quote_events (
    quote_id, actor_user_id, event_type, from_status, to_status, amount, response_text
  ) VALUES (
    p_quote_id, (SELECT auth.uid()), 'answered', v_previous, 'answered', v_final_amount, v_message
  );
  RETURN v_updated;
END;
$function$;

-- Preserve the existing no-discount RPC contract for already integrated
-- clients while routing all answers through the same validated writer.
CREATE OR REPLACE FUNCTION private_api.answer_catalog_quote_request(
  p_quote_id uuid,
  p_amount numeric,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT private_api.answer_catalog_quote_request(p_quote_id, p_amount, p_message, 0);
$function$;

CREATE OR REPLACE FUNCTION public.answer_catalog_quote_request(
  p_quote_id uuid,
  p_amount numeric,
  p_message text,
  p_discount_percent integer
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.answer_catalog_quote_request(p_quote_id, p_amount, p_message, p_discount_percent);
$function$;

CREATE OR REPLACE FUNCTION public.answer_catalog_quote_request(
  p_quote_id uuid,
  p_amount numeric,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private_api.answer_catalog_quote_request(p_quote_id, p_amount, p_message);
$function$;

REVOKE ALL ON FUNCTION private_api.answer_catalog_quote_request(uuid,numeric,text,integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private_api.answer_catalog_quote_request(uuid,numeric,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.answer_catalog_quote_request(uuid,numeric,text,integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private_api.answer_catalog_quote_request(uuid,numeric,text)
  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.answer_catalog_quote_request(uuid,numeric,text,integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.answer_catalog_quote_request(uuid,numeric,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_catalog_quote_request(uuid,numeric,text,integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.answer_catalog_quote_request(uuid,numeric,text)
  TO authenticated, service_role;

-- The admin queue exposes all promotion terms from the same canonical quote.
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
  IF (p_status IS NOT NULL AND p_status NOT IN ('pending','reviewing','answered','archived'))
     OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset < 0 OR p_offset > 100000 THEN
    RAISE EXCEPTION 'Invalid quote directory query' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer INTO v_total
    FROM public.quotes q
   WHERE q.catalog_requested_at IS NOT NULL
     AND (p_quote_id IS NULL OR q.id = p_quote_id)
     AND (p_status IS NULL OR q.status = p_status);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', x.id,
      'userId', x.user_id,
      'customerName', x.full_name,
      'customerEmail', x.email,
      'status', x.status,
      'createdAt', x.created_at,
      'notes', x.notes,
      'quotedAmount', CASE WHEN x.status IN ('answered','archived') AND x.total_amount > 0 THEN x.total_amount ELSE NULL END,
      'listAmount', CASE WHEN x.status IN ('answered','archived') AND x.total_amount > 0 THEN COALESCE(x.list_amount, x.total_amount) ELSE NULL END,
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
      'remainingAmount', x.remaining_amount
    ) ORDER BY x.created_at DESC, x.id DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT q.id, q.user_id, p.full_name, p.email, q.status, q.created_at,
             q.notes, q.total_amount, q.list_amount, q.discount_percent,
             q.discount_amount, q.admin_response, q.requested_catalog_models,
             q.customer_whatsapp, q.postal_code, q.desired_scale, q.finishing,
             q.is_preorder, q.deposit_amount, q.remaining_amount
        FROM public.quotes q
        JOIN public.profiles p ON p.id = q.user_id
       WHERE q.catalog_requested_at IS NOT NULL
         AND (p_quote_id IS NULL OR q.id = p_quote_id)
         AND (p_status IS NULL OR q.status = p_status)
       ORDER BY q.created_at DESC, q.id DESC
       LIMIT p_limit OFFSET p_offset
    ) x;

  RETURN jsonb_build_object('total', v_total, 'limit', p_limit, 'offset', p_offset, 'rows', v_rows);
END;
$function$;

REVOKE ALL ON FUNCTION private_api.tonart_admin_quotes_directory(uuid,text,integer,integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private_api.tonart_admin_quotes_directory(uuid,text,integer,integer)
  TO authenticated, service_role;

COMMENT ON COLUMN public.quotes.discount_percent IS
  'Integer Black Friday discount applied by the authorized quote responder, capped at 50 percent.';
COMMENT ON COLUMN public.quotes.list_amount IS
  'Quote total before an explicitly recorded promotion discount.';
COMMENT ON COLUMN public.quotes.discount_amount IS
  'Rounded BRL reduction recorded with the final canonical quote total.';

NOTIFY pgrst, 'reload schema';
COMMIT;
