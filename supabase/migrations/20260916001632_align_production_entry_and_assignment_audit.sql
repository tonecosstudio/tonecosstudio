-- Finish the normalized production entry contract and close assignment-log DML.
REVOKE INSERT,UPDATE,DELETE ON TABLE public.production_assignment_logs FROM authenticated;

CREATE OR REPLACE FUNCTION private_api.align_new_production_queue(
  p_queue_id uuid,
  p_character_already_selected boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,private_api,pg_temp
AS $$
DECLARE
  v_now timestamptz:=now();
  v_target_order integer:=CASE WHEN COALESCE(p_character_already_selected,false) THEN 4 ELSE 3 END;
BEGIN
  IF p_queue_id IS NULL THEN RAISE EXCEPTION 'PRODUCTION_QUEUE_REQUIRED' USING ERRCODE='22023'; END IF;

  UPDATE public.production_stages
     SET status='completed',
         started_at=COALESCE(started_at,v_now),
         completed_at=COALESCE(completed_at,v_now),
         updated_at=v_now
   WHERE production_queue_id=p_queue_id
     AND stage_order<v_target_order;

  UPDATE public.production_stages
     SET status='in_progress',
         started_at=COALESCE(started_at,v_now),
         completed_at=NULL,
         updated_at=v_now
   WHERE production_queue_id=p_queue_id
     AND stage_order=v_target_order;

  UPDATE public.production_queue
     SET status='in_progress',
         actual_start_date=COALESCE(actual_start_date,v_now),
         updated_at=v_now
   WHERE id=p_queue_id;
END;
$$;
REVOKE ALL ON FUNCTION private_api.align_new_production_queue(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private_api.align_new_production_queue(uuid,boolean) TO service_role;

CREATE OR REPLACE FUNCTION private_api.ensure_production_queue_for_standalone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,private_api,pg_temp
AS $$
DECLARE
  v_character_name text;
  v_collection_name text;
  v_queue_id uuid;
  v_eligible boolean;
BEGIN
  v_eligible:=NEW.payment_status::text IN ('deposit_paid','paid','approved','fully_paid')
    OR NEW.status::text IN ('deposit_paid','balance_paid','confirmed','in_production','pending_production','processing');
  IF NOT v_eligible THEN RETURN NEW; END IF;

  SELECT ch.name INTO v_character_name FROM public.characters ch WHERE ch.id=NEW.character_id;
  IF v_character_name IS NULL THEN RAISE EXCEPTION 'STANDALONE_CHARACTER_NOT_FOUND' USING ERRCODE='23503'; END IF;
  SELECT c.name INTO v_collection_name FROM public.collections c WHERE c.id=NEW.collection_id;

  INSERT INTO public.production_queue(
    character_id,cycle_id,user_id,character_name,collection_name,status,order_id,order_type,collection_id,notes
  ) VALUES(
    NEW.character_id,NEW.cycle_id,NEW.user_id,v_character_name,v_collection_name,'pending',NEW.id::text,'standalone_purchase',NEW.collection_id,NEW.notes
  )
  ON CONFLICT(order_type,order_id) WHERE order_type IS NOT NULL AND order_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_queue_id;

  IF v_queue_id IS NOT NULL THEN
    PERFORM private_api.align_new_production_queue(v_queue_id,true);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private_api.ensure_production_queue_for_subscription_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,private_api,pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_character_name text;
  v_collection_name text;
  v_queue_id uuid;
  v_eligible boolean;
BEGIN
  v_eligible:=NEW.status::text IN ('pending_choice','revealed','pending_production','confirmed','in_production','processing');
  IF NOT v_eligible THEN RETURN NEW; END IF;

  SELECT s.user_id INTO v_user_id FROM public.subscriptions s WHERE s.id=NEW.subscription_id;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'SUBSCRIPTION_USER_NOT_FOUND' USING ERRCODE='23503'; END IF;
  IF NEW.character_id IS NOT NULL THEN SELECT ch.name INTO v_character_name FROM public.characters ch WHERE ch.id=NEW.character_id; END IF;
  IF NEW.collection_id IS NOT NULL THEN SELECT c.name INTO v_collection_name FROM public.collections c WHERE c.id=NEW.collection_id; END IF;

  INSERT INTO public.production_queue(
    character_id,cycle_id,user_id,character_name,collection_name,status,order_id,order_type,collection_id
  ) VALUES(
    NEW.character_id,NEW.cycle_id,v_user_id,v_character_name,v_collection_name,'pending',NEW.id::text,'subscription_delivery',NEW.collection_id
  )
  ON CONFLICT(order_type,order_id) WHERE order_type IS NOT NULL AND order_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_queue_id;

  IF v_queue_id IS NOT NULL THEN
    PERFORM private_api.align_new_production_queue(v_queue_id,NEW.character_id IS NOT NULL);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_production(
  p_queue_id uuid,
  p_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,private_api,pg_temp
AS $$
DECLARE
  v_stage_id uuid;
  v_user_name text;
  v_old_user uuid;
  v_old_user_name text;
  v_reason text:=public.admin_validate_production_note(p_reason,false);
BEGIN
  PERFORM public.assert_admin_access();
  SELECT COALESCE(NULLIF(full_name,''),email) INTO v_user_name FROM public.profiles WHERE id=p_user_id;
  IF v_user_name IS NULL THEN RAISE EXCEPTION 'ASSIGNED_USER_NOT_FOUND' USING ERRCODE='P0002'; END IF;

  SELECT id,assigned_to,assigned_to_name
    INTO v_stage_id,v_old_user,v_old_user_name
    FROM public.production_stages
   WHERE production_queue_id=p_queue_id AND status<>'completed'
   ORDER BY stage_order LIMIT 1 FOR UPDATE;
  IF v_stage_id IS NULL THEN RAISE EXCEPTION 'CURRENT_STAGE_NOT_FOUND' USING ERRCODE='P0002'; END IF;

  UPDATE public.production_stages
     SET assigned_to=p_user_id,assigned_to_name=v_user_name,assigned_at=now(),updated_at=now()
   WHERE id=v_stage_id;

  INSERT INTO public.production_assignment_logs(
    production_queue_id,assigned_to,assigned_to_name,assigned_by,is_reassignment,
    previous_assignee,previous_assignee_name,reason,assigned_at
  ) VALUES(
    p_queue_id,p_user_id,v_user_name,auth.uid(),v_old_user IS NOT NULL AND v_old_user<>p_user_id,
    v_old_user,v_old_user_name,v_reason,now()
  );

  RETURN private_api.production_queue_read_json(p_queue_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_assign_production(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_production(uuid,uuid,text) TO service_role;

NOTIFY pgrst,'reload schema';
