
-- Trigger to auto-link subscription_deliveries to active cycle when status changes to in_production
CREATE OR REPLACE FUNCTION public.link_delivery_to_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cycle_id uuid;
BEGIN
  -- When delivery enters production, link to active cycle
  IF NEW.status = 'in_production' AND (OLD.status IS DISTINCT FROM 'in_production') THEN
    SELECT id INTO v_cycle_id
    FROM cycles
    WHERE status = 'active'
    ORDER BY year DESC, month DESC
    LIMIT 1;

    IF v_cycle_id IS NOT NULL THEN
      NEW.cycle_id := v_cycle_id;
      NEW.production_start_date := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_link_delivery_to_cycle
  BEFORE UPDATE OF status ON public.subscription_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.link_delivery_to_cycle();

-- Also trigger on INSERT for deliveries created directly as in_production
CREATE OR REPLACE FUNCTION public.link_new_delivery_to_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cycle_id uuid;
BEGIN
  IF NEW.status = 'in_production' AND NEW.cycle_id IS NULL THEN
    SELECT id INTO v_cycle_id
    FROM cycles WHERE status = 'active'
    ORDER BY year DESC, month DESC LIMIT 1;

    IF v_cycle_id IS NOT NULL THEN
      NEW.cycle_id := v_cycle_id;
      NEW.production_start_date := COALESCE(NEW.production_start_date, now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_link_new_delivery_to_cycle
  BEFORE INSERT ON public.subscription_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.link_new_delivery_to_cycle();
