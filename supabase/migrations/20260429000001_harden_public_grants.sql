-- Remove broad grants added by schema-cache repair migrations and replace them
-- with explicit PostgREST privileges. RLS remains the authorization boundary.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

DO $$
DECLARE
  public_read_tables text[] := ARRAY[
    'collections',
    'characters',
    'cycles',
    'system_settings',
    'subscription_plans',
    'models',
    'price_categories',
    'collection_characters',
    'coin_packages',
    'pricing_tiers',
    'collection_types',
    'collection_base_pricing',
    'pricing_context_multipliers',
    'coin_exchange_rate',
    'admin_payment_methods',
    'monthly_production',
    'model_likes'
  ];
  authenticated_dml_tables text[] := ARRAY[
    'profiles',
    'subscriptions',
    'subscription_deliveries',
    'standalone_purchases',
    'manual_payments',
    'quotes',
    'support_conversations',
    'chat_groups',
    'admin_notifications',
    'models',
    'images_queue',
    'user_coins',
    'coin_packages',
    'coin_transactions',
    'pricing_tiers',
    'pricing_context_multipliers',
    'price_categories',
    'collection_characters',
    'collection_types',
    'collection_base_pricing',
    'coin_exchange_rate',
    'production_queue',
    'admin_payment_methods',
    'character_choices',
    'user_notifications',
    'admin_notification_settings',
    'quick_replies',
    'support_messages',
    'support_attachments',
    'monthly_production',
    'payment_methods',
    'wishlist',
    'model_likes',
    'payment_files'
  ];
  authenticated_read_tables text[] := ARRAY[
    'stripe_customers',
    'stripe_payment_intents',
    'stripe_subscriptions',
    'stripe_refunds',
    'stripe_webhook_events',
    'security_incidents'
  ];
  authenticated_views text[] := ARRAY[
    'notifications',
    'collections_financial_summary',
    'user_roles',
    'system_settings_grouped'
  ];
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY public_read_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated', table_name);
    END IF;
  END LOOP;

  FOREACH table_name IN ARRAY authenticated_dml_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', table_name);
    END IF;
  END LOOP;

  FOREACH table_name IN ARRAY authenticated_read_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', table_name);
    END IF;
  END LOOP;

  FOREACH table_name IN ARRAY authenticated_views LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', table_name);
    END IF;
  END LOOP;
END $$;
