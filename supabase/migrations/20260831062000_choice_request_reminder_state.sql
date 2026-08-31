BEGIN;

ALTER TABLE public.production_queue
  ADD COLUMN IF NOT EXISTS choice_reminders_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS choice_last_reminder_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'production_queue_choice_reminders_sent_nonnegative'
       AND conrelid = 'public.production_queue'::regclass
  ) THEN
    ALTER TABLE public.production_queue
      ADD CONSTRAINT production_queue_choice_reminders_sent_nonnegative
      CHECK (choice_reminders_sent >= 0)
      NOT VALID;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private_api.initialize_production_choice_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_api, pg_temp
AS $$
DECLARE
  v_days integer;
  v_entering_choice boolean;
BEGIN
  IF NEW.current_stage::text IS DISTINCT FROM 'awaiting_choice' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'CHOICE_WINDOW_USER_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  IF NEW.order_id IS NULL OR NULLIF(btrim(NEW.order_id::text), '') IS NULL THEN
    RAISE EXCEPTION 'CHOICE_WINDOW_ORDER_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  IF NEW.order_type IS NULL
     OR NEW.order_type NOT IN ('subscription_delivery', 'standalone_purchase') THEN
    RAISE EXCEPTION 'CHOICE_WINDOW_ORDER_TYPE_INVALID' USING ERRCODE = '22023';
  END IF;

  IF NEW.collection_id IS NULL THEN
    RAISE EXCEPTION 'CHOICE_WINDOW_COLLECTION_NOT_CONFIGURED' USING ERRCODE = '22023';
  END IF;

  v_entering_choice := TG_OP = 'INSERT'
    OR OLD.current_stage::text IS DISTINCT FROM NEW.current_stage::text;

  IF v_entering_choice OR NEW.choice_deadline IS NULL THEN
    v_days := private_api.require_character_choice_days();
    NEW.choice_deadline := now() + make_interval(days => v_days);
    NEW.choice_status := 'pending';
    NEW.choice_made_at := NULL;
    NEW.choice_reminders_sent := 0;
    NEW.choice_last_reminder_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.production_queue.choice_reminders_sent IS
  'Number of reminders sent while the order is awaiting a character choice.';
COMMENT ON COLUMN public.production_queue.choice_last_reminder_at IS
  'Timestamp of the last pre-choice reminder sent for this production item.';

NOTIFY pgrst, 'reload schema';

COMMIT;
