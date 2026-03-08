
-- Remove legacy subscription_credit_* tables (all empty, replaced by coins system)
DROP TABLE IF EXISTS public.subscription_credit_order_items CASCADE;
DROP TABLE IF EXISTS public.subscription_credit_orders CASCADE;
DROP TABLE IF EXISTS public.subscription_credit_transactions CASCADE;
DROP TABLE IF EXISTS public.subscription_credit_user_credits CASCADE;
DROP TABLE IF EXISTS public.subscription_credit_production_cycles CASCADE;
DROP TABLE IF EXISTS public.subscription_credit_subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_credit_characters CASCADE;
DROP TABLE IF EXISTS public.subscription_credit_plans CASCADE;
