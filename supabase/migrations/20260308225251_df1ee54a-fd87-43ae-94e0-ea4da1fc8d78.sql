
-- 1. Trigger para registrar mudanças de status em subscription_deliveries
CREATE OR REPLACE FUNCTION public.log_subscription_delivery_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, order_type, old_status, new_status, changed_by, changed_by_name)
    VALUES (
      NEW.id::text,
      'subscription_delivery',
      OLD.status,
      NEW.status,
      auth.uid(),
      COALESCE(
        (SELECT full_name FROM profiles WHERE id = auth.uid()),
        'Sistema'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_subscription_delivery_status
  AFTER UPDATE OF status ON public.subscription_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.log_subscription_delivery_status_change();

-- 2. Trigger para registrar mudanças de status em standalone_purchases
CREATE OR REPLACE FUNCTION public.log_standalone_purchase_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, order_type, old_status, new_status, changed_by, changed_by_name)
    VALUES (
      NEW.id::text,
      'standalone_purchase',
      OLD.status,
      NEW.status,
      auth.uid(),
      COALESCE(
        (SELECT full_name FROM profiles WHERE id = auth.uid()),
        'Sistema'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_standalone_purchase_status
  AFTER UPDATE OF status ON public.standalone_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.log_standalone_purchase_status_change();

-- 3. Trigger para registrar mudanças de status em quotes
CREATE OR REPLACE FUNCTION public.log_quote_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, order_type, old_status, new_status, changed_by, changed_by_name)
    VALUES (
      NEW.id::text,
      'quote',
      OLD.status,
      NEW.status,
      auth.uid(),
      COALESCE(
        (SELECT full_name FROM profiles WHERE id = auth.uid()),
        'Sistema'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_quote_status
  AFTER UPDATE OF status ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.log_quote_status_change();

-- 4. Trigger para creditar coins ao user_coins quando assinatura é criada
CREATE OR REPLACE FUNCTION public.credit_subscription_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_coins_included integer;
  v_plan_name text;
BEGIN
  -- Only on INSERT (new subscription)
  IF NEW.plan_id IS NOT NULL THEN
    SELECT coins_included, name INTO v_coins_included, v_plan_name
    FROM subscription_plans WHERE id = NEW.plan_id;

    IF v_coins_included IS NOT NULL AND v_coins_included > 0 THEN
      -- Upsert user_coins balance
      INSERT INTO user_coins (user_id, balance, total_earned)
      VALUES (NEW.user_id, v_coins_included, v_coins_included)
      ON CONFLICT (user_id)
      DO UPDATE SET
        balance = user_coins.balance + v_coins_included,
        total_earned = user_coins.total_earned + v_coins_included,
        updated_at = now();

      -- Record transaction
      INSERT INTO coin_transactions (user_id, amount, transaction_type, description, reference_id, reference_type)
      VALUES (
        NEW.user_id,
        v_coins_included,
        'credit',
        'Coins do plano ' || COALESCE(v_plan_name, 'assinatura'),
        NEW.id::text,
        'subscription_plan'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_credit_subscription_coins
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_subscription_coins();

-- 5. Add unique constraint on user_coins.user_id for upsert to work
ALTER TABLE public.user_coins ADD CONSTRAINT user_coins_user_id_unique UNIQUE (user_id);
