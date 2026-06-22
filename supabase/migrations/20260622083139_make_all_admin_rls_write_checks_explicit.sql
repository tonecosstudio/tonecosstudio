-- Normalize remaining admin-only FOR ALL policies to explicit write checks.
-- This keeps mutation authorization auditable and prevents future drift from
-- relying on implicit policy behavior.

DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT *
      FROM (VALUES
        ('characters', 'characters_modify_admin'),
        ('chat_groups', 'chat_groups_modify_admin'),
        ('collections', 'collections_modify_admin'),
        ('cycles', 'cycles_modify_admin'),
        ('images_queue', 'images_queue_modify_admin'),
        ('models', 'models_modify_admin'),
        ('monthly_production', 'monthly_production_modify_admin'),
        ('quick_replies', 'quick_replies_modify_admin'),
        ('quotes', 'quotes_modify_admin'),
        ('standalone_purchases', 'standalone_purchases_modify_admin'),
        ('subscription_deliveries', 'subscription_deliveries_modify_admin'),
        ('subscription_plans', 'subscription_plans_modify_admin'),
        ('support_conversations', 'support_conversations_modify_admin'),
        ('system_settings', 'system_settings_modify_admin')
      ) AS policies(table_name, policy_name)
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      v_policy.policy_name,
      v_policy.table_name
    );

    EXECUTE format(
      $policy$
      CREATE POLICY %I
        ON public.%I
        FOR ALL
        TO authenticated
        USING (
          (SELECT public.current_user_role()) = ANY (
            ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]
          )
        )
        WITH CHECK (
          (SELECT public.current_user_role()) = ANY (
            ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]
          )
        )
      $policy$,
      v_policy.policy_name,
      v_policy.table_name
    );

    EXECUTE format(
      'COMMENT ON POLICY %I ON public.%I IS %L',
      v_policy.policy_name,
      v_policy.table_name,
      'Admin-only mutations with explicit write check.'
    );
  END LOOP;
END;
$$;
