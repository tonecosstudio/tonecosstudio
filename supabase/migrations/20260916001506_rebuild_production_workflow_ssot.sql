-- Rebuild production as a normalized SSOT: production_queue owns order-level state;
-- production_stages owns workflow stage, assignment and blocking. Browser DML is closed.

ALTER TABLE public.production_queue ALTER COLUMN character_name DROP NOT NULL;
ALTER TABLE public.production_queue
  ADD COLUMN IF NOT EXISTS choice_reminders_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS choice_last_reminder_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='production_queue_choice_reminders_nonnegative' AND conrelid='public.production_queue'::regclass) THEN
    ALTER TABLE public.production_queue ADD CONSTRAINT production_queue_choice_reminders_nonnegative CHECK (choice_reminders_sent >= 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS production_queue_order_identity_uq
  ON public.production_queue(order_type, order_id)
  WHERE order_type IS NOT NULL AND order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS production_stages_queue_stage_uq
  ON public.production_stages(production_queue_id, stage_name);
CREATE UNIQUE INDEX IF NOT EXISTS production_stages_queue_order_uq
  ON public.production_stages(production_queue_id, stage_order)
  WHERE stage_order IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='production_stages_status_valid' AND conrelid='public.production_stages'::regclass) THEN
    ALTER TABLE public.production_stages ADD CONSTRAINT production_stages_status_valid
      CHECK (status IN ('pending','in_progress','completed','blocked'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='production_stages_name_valid' AND conrelid='public.production_stages'::regclass) THEN
    ALTER TABLE public.production_stages ADD CONSTRAINT production_stages_name_valid CHECK (stage_name IN (
      'awaiting_payment','payment_confirmed','awaiting_choice','model_preparation','printing','post_processing',
      'painting','quality_check','packaging','ready_to_ship','shipped','delivered'
    ));
  END IF;
END $$;

REVOKE INSERT,UPDATE,DELETE ON TABLE public.production_queue FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON TABLE public.production_stages FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON TABLE public.stage_transition_logs FROM authenticated;
DROP POLICY IF EXISTS "Admins can manage production queue" ON public.production_queue;
DROP POLICY IF EXISTS production_stages_manage_admin ON public.production_stages;
DROP POLICY IF EXISTS "stage_transition_logs_admin_insert" ON public.stage_transition_logs;

CREATE OR REPLACE FUNCTION private_api.current_production_stage_name(p_queue_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,private_api,pg_temp AS $$
  SELECT COALESCE(
    (SELECT ps.stage_name FROM public.production_stages ps
      WHERE ps.production_queue_id=p_queue_id AND ps.status<>'completed'
      ORDER BY ps.stage_order NULLS LAST, ps.created_at, ps.id LIMIT 1),
    (SELECT ps.stage_name FROM public.production_stages ps
      WHERE ps.production_queue_id=p_queue_id
      ORDER BY ps.stage_order DESC NULLS LAST, ps.created_at DESC, ps.id DESC LIMIT 1)
  );
$$;
REVOKE ALL ON FUNCTION private_api.current_production_stage_name(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private_api.current_production_stage_name(uuid) TO service_role;

CREATE OR REPLACE FUNCTION private_api.production_status_for_stage(p_queue_status public.production_status,p_stage text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public,private_api,pg_temp AS $$
BEGIN
  IF p_queue_status='cancelled' THEN RETURN 'cancelled'; END IF;
  IF p_queue_status='on_hold' THEN RETURN 'on_hold'; END IF;
  IF p_queue_status='completed' THEN RETURN 'completed'; END IF;
  IF p_stage IN ('awaiting_payment','awaiting_choice') THEN RETURN 'awaiting_choice'; END IF;
  IF p_stage IN ('payment_confirmed','model_preparation') THEN RETURN 'ready_for_production'; END IF;
  IF p_stage IS NULL THEN RETURN 'awaiting_choice'; END IF;
  RETURN 'in_production';
END;
$$;
REVOKE ALL ON FUNCTION private_api.production_status_for_stage(public.production_status,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private_api.production_queue_read_json(p_queue_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,private_api,pg_temp AS $$
  SELECT to_jsonb(q) || jsonb_build_object(
    'customer_id',q.user_id,
    'customer_name',COALESCE(NULLIF(p.full_name,''),p.email),
    'customer_email',p.email,
    'current_stage',cs.stage_name,
    'production_status',private_api.production_status_for_stage(q.status,cs.stage_name),
    'assigned_to',cs.assigned_to,
    'assigned_to_name',cs.assigned_to_name,
    'assigned_at',cs.assigned_at,
    'scheduled_production_date',q.estimated_start_date::date,
    'production_started_at',q.actual_start_date,
    'production_completed_at',q.actual_completion_date,
    'production_notes',q.admin_notes,
    'customer_notes',q.notes,
    'internal_flags','[]'::jsonb
  )
  FROM public.production_queue q
  LEFT JOIN public.profiles p ON p.id=q.user_id
  LEFT JOIN LATERAL (
    SELECT ps.stage_name,ps.assigned_to,ps.assigned_to_name,ps.assigned_at
    FROM public.production_stages ps
    WHERE ps.production_queue_id=q.id AND ps.status<>'completed'
    ORDER BY ps.stage_order NULLS LAST,ps.created_at,ps.id LIMIT 1
  ) cs ON true
  WHERE q.id=p_queue_id;
$$;
REVOKE ALL ON FUNCTION private_api.production_queue_read_json(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private_api.production_queue_read_json(uuid) TO service_role;

CREATE OR REPLACE FUNCTION private_api.initialize_production_stages()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private_api,pg_temp AS $$
DECLARE v_stage text; v_order integer:=0;
BEGIN
  FOREACH v_stage IN ARRAY ARRAY[
    'awaiting_payment','payment_confirmed','awaiting_choice','model_preparation','printing','post_processing',
    'painting','quality_check','packaging','ready_to_ship','shipped','delivered'
  ] LOOP
    v_order:=v_order+1;
    INSERT INTO public.production_stages(production_queue_id,stage_name,stage_order,status)
    VALUES(NEW.id,v_stage,v_order,CASE WHEN v_order=1 THEN 'in_progress' ELSE 'pending' END)
    ON CONFLICT(production_queue_id,stage_name) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private_api.initialize_production_stages() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS production_queue_initialize_stages ON public.production_queue;
CREATE TRIGGER production_queue_initialize_stages AFTER INSERT ON public.production_queue
FOR EACH ROW EXECUTE FUNCTION private_api.initialize_production_stages();

CREATE OR REPLACE FUNCTION private_api.require_character_choice_days()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private_api,pg_temp AS $$
DECLARE v_raw text; v_days integer;
BEGIN
  SELECT NULLIF(btrim(value),'') INTO v_raw FROM public.system_settings WHERE key='character_choice_days';
  IF v_raw IS NULL OR v_raw !~ '^[0-9]+$' THEN RAISE EXCEPTION 'CHARACTER_CHOICE_DAYS_NOT_CONFIGURED' USING ERRCODE='22023'; END IF;
  v_days:=v_raw::integer;
  IF v_days<1 OR v_days>365 THEN RAISE EXCEPTION 'CHARACTER_CHOICE_DAYS_INVALID' USING ERRCODE='22023'; END IF;
  RETURN v_days;
END;
$$;
REVOKE ALL ON FUNCTION private_api.require_character_choice_days() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private_api.require_character_choice_days() TO service_role;

CREATE OR REPLACE FUNCTION private_api.sync_production_choice_window()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private_api,pg_temp AS $$
DECLARE v_current text; v_days integer;
BEGIN
  v_current:=private_api.current_production_stage_name(NEW.production_queue_id);
  IF v_current='awaiting_choice' THEN
    SELECT choice_deadline IS NULL INTO STRICT v_days FROM public.production_queue WHERE false;
  END IF;
  RETURN NEW;
EXCEPTION WHEN NO_DATA_FOUND THEN
  IF v_current='awaiting_choice' THEN
    v_days:=private_api.require_character_choice_days();
    UPDATE public.production_queue
      SET choice_deadline=COALESCE(choice_deadline,now()+make_interval(days=>v_days)),
          choice_status=CASE WHEN choice_status IS NULL OR choice_status IN ('expired','rejected') THEN 'pending' ELSE choice_status END,
          choice_made_at=CASE WHEN choice_status IS NULL OR choice_status IN ('expired','rejected') THEN NULL ELSE choice_made_at END,
          choice_reminders_sent=CASE WHEN choice_deadline IS NULL THEN 0 ELSE choice_reminders_sent END,
          choice_last_reminder_at=CASE WHEN choice_deadline IS NULL THEN NULL ELSE choice_last_reminder_at END,
          updated_at=now()
      WHERE id=NEW.production_queue_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private_api.sync_production_choice_window() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS production_stages_sync_choice_window ON public.production_stages;
CREATE TRIGGER production_stages_sync_choice_window
AFTER INSERT OR UPDATE OF status ON public.production_stages
FOR EACH ROW EXECUTE FUNCTION private_api.sync_production_choice_window();

-- Replace the trigger body above with a straightforward idempotent version.
CREATE OR REPLACE FUNCTION private_api.sync_production_choice_window()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private_api,pg_temp AS $$
DECLARE v_current text; v_days integer; v_deadline timestamptz;
BEGIN
  v_current:=private_api.current_production_stage_name(NEW.production_queue_id);
  IF v_current<>'awaiting_choice' THEN RETURN NEW; END IF;
  SELECT choice_deadline INTO v_deadline FROM public.production_queue WHERE id=NEW.production_queue_id FOR UPDATE;
  IF v_deadline IS NULL THEN
    v_days:=private_api.require_character_choice_days();
    UPDATE public.production_queue
      SET choice_deadline=now()+make_interval(days=>v_days),choice_status='pending',choice_made_at=NULL,
          choice_reminders_sent=0,choice_last_reminder_at=NULL,updated_at=now()
      WHERE id=NEW.production_queue_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private_api.ensure_production_queue_for_standalone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private_api,pg_temp AS $$
DECLARE v_character_name text; v_collection_name text; v_eligible boolean;
BEGIN
  v_eligible:=NEW.payment_status::text IN ('deposit_paid','paid','approved','fully_paid')
    OR NEW.status::text IN ('deposit_paid','balance_paid','confirmed','in_production','pending_production','processing');
  IF NOT v_eligible THEN RETURN NEW; END IF;
  SELECT ch.name INTO v_character_name FROM public.characters ch WHERE ch.id=NEW.character_id;
  SELECT c.name INTO v_collection_name FROM public.collections c WHERE c.id=NEW.collection_id;
  INSERT INTO public.production_queue(character_id,cycle_id,user_id,character_name,collection_name,status,order_id,order_type,collection_id,notes)
  VALUES(NEW.character_id,NEW.cycle_id,NEW.user_id,v_character_name,v_collection_name,'pending',NEW.id::text,'standalone_purchase',NEW.collection_id,NEW.notes)
  ON CONFLICT(order_type,order_id) WHERE order_type IS NOT NULL AND order_id IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private_api.ensure_production_queue_for_standalone() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS standalone_purchase_ensure_production_queue ON public.standalone_purchases;
CREATE TRIGGER standalone_purchase_ensure_production_queue
AFTER INSERT OR UPDATE OF status,payment_status ON public.standalone_purchases
FOR EACH ROW EXECUTE FUNCTION private_api.ensure_production_queue_for_standalone();

CREATE OR REPLACE FUNCTION private_api.ensure_production_queue_for_subscription_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private_api,pg_temp AS $$
DECLARE v_user_id uuid; v_character_name text; v_collection_name text; v_eligible boolean;
BEGIN
  v_eligible:=NEW.status::text IN ('pending_choice','revealed','pending_production','confirmed','in_production','processing');
  IF NOT v_eligible THEN RETURN NEW; END IF;
  SELECT s.user_id INTO v_user_id FROM public.subscriptions s WHERE s.id=NEW.subscription_id;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'SUBSCRIPTION_USER_NOT_FOUND' USING ERRCODE='23503'; END IF;
  IF NEW.character_id IS NOT NULL THEN SELECT ch.name INTO v_character_name FROM public.characters ch WHERE ch.id=NEW.character_id; END IF;
  IF NEW.collection_id IS NOT NULL THEN SELECT c.name INTO v_collection_name FROM public.collections c WHERE c.id=NEW.collection_id; END IF;
  INSERT INTO public.production_queue(character_id,cycle_id,user_id,character_name,collection_name,status,order_id,order_type,collection_id)
  VALUES(NEW.character_id,NEW.cycle_id,v_user_id,v_character_name,v_collection_name,'pending',NEW.id::text,'subscription_delivery',NEW.collection_id)
  ON CONFLICT(order_type,order_id) WHERE order_type IS NOT NULL AND order_id IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private_api.ensure_production_queue_for_subscription_delivery() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS subscription_delivery_ensure_production_queue ON public.subscription_deliveries;
CREATE TRIGGER subscription_delivery_ensure_production_queue
AFTER INSERT OR UPDATE OF status ON public.subscription_deliveries
FOR EACH ROW EXECUTE FUNCTION private_api.ensure_production_queue_for_subscription_delivery();

-- Server-authoritative production mutations. They return the canonical read model as JSON.
CREATE OR REPLACE FUNCTION public.admin_update_production_stage(p_queue_id uuid,p_stage text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private_api,pg_temp AS $$
DECLARE v_target text:=public.admin_validate_production_stage(p_stage); v_current record; v_target_row record; v_now timestamptz:=now();
BEGIN
  PERFORM public.assert_admin_access();
  SELECT * INTO v_current FROM public.production_stages WHERE production_queue_id=p_queue_id AND status<>'completed' ORDER BY stage_order LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCTION_STAGE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO v_target_row FROM public.production_stages WHERE production_queue_id=p_queue_id AND stage_name=v_target FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TARGET_STAGE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF v_target_row.stage_order < v_current.stage_order OR v_target_row.stage_order > v_current.stage_order+1 THEN
    RAISE EXCEPTION 'INVALID_STAGE_TRANSITION' USING ERRCODE='22023';
  END IF;
  IF v_target_row.stage_order=v_current.stage_order+1 THEN
    IF v_current.is_blocked THEN RAISE EXCEPTION 'CURRENT_STAGE_BLOCKED' USING ERRCODE='22023'; END IF;
    UPDATE public.production_stages SET status='completed',started_at=COALESCE(started_at,v_now),completed_at=v_now,updated_at=v_now WHERE id=v_current.id;
    UPDATE public.production_stages SET status='in_progress',started_at=COALESCE(started_at,v_now),updated_at=v_now WHERE id=v_target_row.id;
    INSERT INTO public.stage_transition_logs(production_queue_id,from_stage,to_stage,user_id,user_name,is_override,timestamp)
    SELECT p_queue_id,v_current.stage_name,v_target,p.id,COALESCE(p.full_name,p.email,'Admin'),false,v_now FROM public.profiles p WHERE p.id=auth.uid();
  ELSE
    UPDATE public.production_stages SET status=CASE WHEN is_blocked THEN 'blocked' ELSE 'in_progress' END,started_at=COALESCE(started_at,v_now),updated_at=v_now WHERE id=v_target_row.id;
  END IF;
  UPDATE public.production_queue SET status=CASE WHEN status='on_hold' THEN 'on_hold'::public.production_status ELSE 'in_progress'::public.production_status END,
    actual_start_date=COALESCE(actual_start_date,v_now),updated_at=v_now WHERE id=p_queue_id;
  RETURN private_api.production_queue_read_json(p_queue_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_production(p_queue_id uuid,p_user_id uuid,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private_api,pg_temp AS $$
DECLARE v_stage_id uuid; v_user_name text; v_old_user uuid; v_reason text:=public.admin_validate_production_note(p_reason,false);
BEGIN
  PERFORM public.assert_admin_access();
  SELECT COALESCE(NULLIF(full_name,''),email) INTO v_user_name FROM public.profiles WHERE id=p_user_id;
  IF v_user_name IS NULL THEN RAISE EXCEPTION 'ASSIGNED_USER_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT id,assigned_to INTO v_stage_id,v_old_user FROM public.production_stages WHERE production_queue_id=p_queue_id AND status<>'completed' ORDER BY stage_order LIMIT 1 FOR UPDATE;
  IF v_stage_id IS NULL THEN RAISE EXCEPTION 'CURRENT_STAGE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  UPDATE public.production_stages SET assigned_to=p_user_id,assigned_to_name=v_user_name,assigned_at=now(),updated_at=now() WHERE id=v_stage_id;
  IF to_regclass('public.production_assignment_logs') IS NOT NULL THEN
    INSERT INTO public.production_assignment_logs(production_queue_id,assigned_to,assigned_to_name,assigned_by,reason,is_reassignment,created_at)
    VALUES(p_queue_id,p_user_id,v_user_name,auth.uid(),v_reason,v_old_user IS NOT NULL AND v_old_user<>p_user_id,now());
  END IF;
  RETURN private_api.production_queue_read_json(p_queue_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_block_production(p_queue_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private_api,pg_temp AS $$
DECLARE v_reason text:=public.admin_validate_production_note(p_reason,true); v_stage_id uuid;
BEGIN
  PERFORM public.assert_admin_access();
  SELECT id INTO v_stage_id FROM public.production_stages WHERE production_queue_id=p_queue_id AND status<>'completed' ORDER BY stage_order LIMIT 1 FOR UPDATE;
  IF v_stage_id IS NULL THEN RAISE EXCEPTION 'CURRENT_STAGE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  UPDATE public.production_stages SET is_blocked=true,block_reason=v_reason,blocked_at=now(),status='blocked',updated_at=now() WHERE id=v_stage_id;
  UPDATE public.production_queue SET status='on_hold',admin_notes=v_reason,updated_at=now() WHERE id=p_queue_id;
  RETURN private_api.production_queue_read_json(p_queue_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unblock_production(p_queue_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private_api,pg_temp AS $$
DECLARE v_stage_id uuid;
BEGIN
  PERFORM public.assert_admin_access();
  SELECT id INTO v_stage_id FROM public.production_stages WHERE production_queue_id=p_queue_id AND status='blocked' ORDER BY stage_order LIMIT 1 FOR UPDATE;
  IF v_stage_id IS NULL THEN RAISE EXCEPTION 'BLOCKED_STAGE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  UPDATE public.production_stages SET is_blocked=false,block_reason=NULL,unblocked_at=now(),status='in_progress',started_at=COALESCE(started_at,now()),updated_at=now() WHERE id=v_stage_id;
  UPDATE public.production_queue SET status='in_progress',updated_at=now() WHERE id=p_queue_id;
  RETURN private_api.production_queue_read_json(p_queue_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_production_schedule(p_queue_id uuid,p_scheduled_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private_api,pg_temp AS $$
BEGIN
  PERFORM public.assert_admin_access();
  IF p_scheduled_date IS NULL THEN RAISE EXCEPTION 'SCHEDULE_DATE_REQUIRED' USING ERRCODE='22023'; END IF;
  UPDATE public.production_queue SET estimated_start_date=(p_scheduled_date::text||' 00:00:00-03')::timestamptz,updated_at=now() WHERE id=p_queue_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCTION_QUEUE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  RETURN private_api.production_queue_read_json(p_queue_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_production_notes(p_queue_id uuid,p_notes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private_api,pg_temp AS $$
DECLARE v_notes text:=public.admin_validate_production_note(p_notes,false);
BEGIN
  PERFORM public.assert_admin_access();
  UPDATE public.production_queue SET admin_notes=v_notes,updated_at=now() WHERE id=p_queue_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCTION_QUEUE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  RETURN private_api.production_queue_read_json(p_queue_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_production_estimated_completion(p_queue_id uuid,p_estimated_completion timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM public.assert_admin_access();
  UPDATE public.production_queue SET estimated_completion_date=p_estimated_completion,updated_at=now() WHERE id=p_queue_id RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'PRODUCTION_QUEUE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_production_stage_notes(p_queue_id uuid,p_stage text,p_notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_stage text:=public.admin_validate_production_stage(p_stage); v_notes text:=public.admin_validate_production_note(p_notes,false); v_id uuid;
BEGIN
  PERFORM public.assert_admin_access();
  UPDATE public.production_stages SET notes=v_notes,updated_at=now() WHERE production_queue_id=p_queue_id AND stage_name=v_stage RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'PRODUCTION_STAGE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  RETURN v_id;
END;
$$;

-- Completion advances exactly one canonical stage; no duplicated current_stage column exists.
CREATE OR REPLACE FUNCTION public.admin_complete_production_stage(p_stage_id uuid,p_notes text DEFAULT NULL,p_photos text[] DEFAULT ARRAY[]::text[],p_is_override boolean DEFAULT false,p_justification text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private_api,pg_temp AS $$
DECLARE v_stage public.production_stages%ROWTYPE; v_next public.production_stages%ROWTYPE; v_notes text:=public.admin_validate_production_note(p_notes,false); v_justification text:=public.admin_validate_production_note(p_justification,COALESCE(p_is_override,false)); v_photos text[]:=public.admin_validate_stage_photo_urls(p_photos); v_now timestamptz:=now(); v_incomplete integer;
BEGIN
  PERFORM public.assert_admin_access();
  SELECT * INTO v_stage FROM public.production_stages WHERE id=p_stage_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCTION_STAGE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF v_stage.status='completed' THEN RAISE EXCEPTION 'PRODUCTION_STAGE_ALREADY_COMPLETED' USING ERRCODE='22023'; END IF;
  IF v_stage.is_blocked THEN RAISE EXCEPTION 'PRODUCTION_STAGE_BLOCKED' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO v_incomplete FROM public.production_stages WHERE production_queue_id=v_stage.production_queue_id AND stage_order<v_stage.stage_order AND status<>'completed';
  IF v_incomplete>0 AND NOT COALESCE(p_is_override,false) THEN RAISE EXCEPTION 'PREVIOUS_STAGES_INCOMPLETE' USING ERRCODE='22023'; END IF;
  UPDATE public.production_stages SET status='completed',started_at=COALESCE(started_at,v_now),completed_at=v_now,notes=COALESCE(v_notes,notes),
    photos=CASE WHEN cardinality(v_photos)=0 THEN photos ELSE v_photos END,actual_duration=ROUND(EXTRACT(EPOCH FROM(v_now-COALESCE(started_at,v_now)))/3600::numeric,2),updated_at=v_now
    WHERE id=p_stage_id;
  SELECT * INTO v_next FROM public.production_stages WHERE production_queue_id=v_stage.production_queue_id AND stage_order>v_stage.stage_order ORDER BY stage_order LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    UPDATE public.production_stages SET status='in_progress',started_at=COALESCE(started_at,v_now),updated_at=v_now WHERE id=v_next.id;
    UPDATE public.production_queue SET status='in_progress',actual_start_date=COALESCE(actual_start_date,v_now),updated_at=v_now WHERE id=v_stage.production_queue_id;
  ELSE
    UPDATE public.production_queue SET status='completed',actual_completion_date=v_now,updated_at=v_now WHERE id=v_stage.production_queue_id;
  END IF;
  INSERT INTO public.stage_transition_logs(production_queue_id,from_stage,to_stage,user_id,user_name,is_override,justification,timestamp)
  SELECT v_stage.production_queue_id,v_stage.stage_name,COALESCE(v_next.stage_name,v_stage.stage_name),p.id,COALESCE(p.full_name,p.email,'Admin'),COALESCE(p_is_override,false),v_justification,v_now FROM public.profiles p WHERE p.id=auth.uid();
  RETURN public.admin_stage_json((SELECT ps FROM public.production_stages ps WHERE ps.id=p_stage_id));
END;
$$;

-- All production mutation RPCs are server-side gateway only.
REVOKE ALL ON FUNCTION public.admin_update_production_stage(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_assign_production(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_block_production(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_unblock_production(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_update_production_schedule(uuid,date) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_update_production_notes(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_update_production_estimated_completion(uuid,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_update_production_stage_notes(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_complete_production_stage(uuid,text,text[],boolean,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_log_stage_transition(uuid,text,text,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_production_stage(uuid,text),public.admin_assign_production(uuid,uuid,text),public.admin_block_production(uuid,text),public.admin_unblock_production(uuid),public.admin_update_production_schedule(uuid,date),public.admin_update_production_notes(uuid,text),public.admin_update_production_estimated_completion(uuid,timestamptz),public.admin_update_production_stage_notes(uuid,text,text),public.admin_complete_production_stage(uuid,text,text[],boolean,text),public.admin_log_stage_transition(uuid,text,text,boolean,text) TO service_role;

NOTIFY pgrst,'reload schema';
