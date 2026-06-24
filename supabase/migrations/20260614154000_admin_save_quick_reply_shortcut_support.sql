DROP FUNCTION IF EXISTS public.admin_save_quick_reply(uuid, text, text, text, integer);

CREATE OR REPLACE FUNCTION public.admin_save_quick_reply(
  p_id uuid,
  p_category text,
  p_title text,
  p_message text,
  p_shortcut text DEFAULT NULL,
  p_display_order integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_category text := public.admin_validate_plain_text(p_category, 'quick reply category', 80);
  v_title text := public.admin_validate_plain_text(p_title, 'quick reply title', 160);
  v_message text := public.admin_validate_plain_text(p_message, 'quick reply message', 4000);
  v_shortcut text := public.admin_validate_plain_text(p_shortcut, 'quick reply shortcut', 40, false);
  v_display_order integer := COALESCE(p_display_order, 0);
  v_result_id uuid;
BEGIN
  PERFORM public.assert_admin_access();

  IF v_display_order < 0 OR v_display_order > 10000 THEN
    RAISE EXCEPTION 'Invalid quick reply order' USING ERRCODE = '22023';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.quick_replies (category, title, message, shortcut, display_order, updated_at)
    VALUES (v_category, v_title, v_message, v_shortcut, v_display_order, now())
    RETURNING id INTO v_result_id;
  ELSE
    UPDATE public.quick_replies
    SET category = v_category,
        title = v_title,
        message = v_message,
        shortcut = v_shortcut,
        updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_result_id;
  END IF;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Quick reply not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_quick_reply(uuid, text, text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_quick_reply(uuid, text, text, text, text, integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_save_quick_reply(uuid, text, text, text, text, integer) IS
'Create or update admin quick replies using the canonical quick_replies table, including optional keyboard shortcuts.';

NOTIFY pgrst, 'reload schema';
