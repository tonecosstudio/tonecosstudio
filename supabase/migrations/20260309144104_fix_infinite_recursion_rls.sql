-- =====================================================
-- Migration: Fix Infinite Recursion in RLS
-- Description: Corrigir recursão infinita nas políticas RLS
-- =====================================================

-- A solução é usar SECURITY DEFINER functions que não acionam RLS

-- =====================================================
-- 1. Criar função auxiliar para verificar role SEM RLS
-- =====================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 2. Recriar políticas de TODAS as tabelas usando a função
-- =====================================================

-- PROFILES
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id 
    OR 
    public.current_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR
    public.current_user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  USING (public.current_user_role() = 'super_admin');

-- COLLECTIONS
DROP POLICY IF EXISTS "collections_select_admin" ON collections;
DROP POLICY IF EXISTS "collections_modify_admin" ON collections;

CREATE POLICY "collections_select_admin"
  ON collections FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "collections_modify_admin"
  ON collections FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- CHARACTERS
DROP POLICY IF EXISTS "characters_select_admin" ON characters;
DROP POLICY IF EXISTS "characters_modify_admin" ON characters;

CREATE POLICY "characters_select_admin"
  ON characters FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "characters_modify_admin"
  ON characters FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- CYCLES
DROP POLICY IF EXISTS "cycles_modify_admin" ON cycles;

CREATE POLICY "cycles_modify_admin"
  ON cycles FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- SYSTEM_SETTINGS
DROP POLICY IF EXISTS "system_settings_modify_admin" ON system_settings;

CREATE POLICY "system_settings_modify_admin"
  ON system_settings FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- SUBSCRIPTION_PLANS
DROP POLICY IF EXISTS "subscription_plans_modify_admin" ON subscription_plans;

CREATE POLICY "subscription_plans_modify_admin"
  ON subscription_plans FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "subscriptions_select_admin" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_modify_admin" ON subscriptions;

CREATE POLICY "subscriptions_select_admin"
  ON subscriptions FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "subscriptions_modify_admin"
  ON subscriptions FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- SUBSCRIPTION_DELIVERIES
DROP POLICY IF EXISTS "subscription_deliveries_select_admin" ON subscription_deliveries;
DROP POLICY IF EXISTS "subscription_deliveries_modify_admin" ON subscription_deliveries;

CREATE POLICY "subscription_deliveries_select_admin"
  ON subscription_deliveries FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "subscription_deliveries_modify_admin"
  ON subscription_deliveries FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- STANDALONE_PURCHASES
DROP POLICY IF EXISTS "standalone_purchases_select_admin" ON standalone_purchases;
DROP POLICY IF EXISTS "standalone_purchases_modify_admin" ON standalone_purchases;

CREATE POLICY "standalone_purchases_select_admin"
  ON standalone_purchases FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "standalone_purchases_modify_admin"
  ON standalone_purchases FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- MANUAL_PAYMENTS
DROP POLICY IF EXISTS "manual_payments_select_admin" ON manual_payments;
DROP POLICY IF EXISTS "manual_payments_modify_admin" ON manual_payments;

CREATE POLICY "manual_payments_select_admin"
  ON manual_payments FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "manual_payments_modify_admin"
  ON manual_payments FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- QUOTES
DROP POLICY IF EXISTS "quotes_select_admin" ON quotes;
DROP POLICY IF EXISTS "quotes_modify_admin" ON quotes;

CREATE POLICY "quotes_select_admin"
  ON quotes FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "quotes_modify_admin"
  ON quotes FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- SUPPORT_CONVERSATIONS
DROP POLICY IF EXISTS "support_conversations_select_admin" ON support_conversations;
DROP POLICY IF EXISTS "support_conversations_modify_admin" ON support_conversations;

CREATE POLICY "support_conversations_select_admin"
  ON support_conversations FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "support_conversations_modify_admin"
  ON support_conversations FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- CHAT_GROUPS
DROP POLICY IF EXISTS "chat_groups_modify_admin" ON chat_groups;

CREATE POLICY "chat_groups_modify_admin"
  ON chat_groups FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- ADMIN_NOTIFICATIONS
DROP POLICY IF EXISTS "admin_notifications_select_admin" ON admin_notifications;
DROP POLICY IF EXISTS "admin_notifications_modify_admin" ON admin_notifications;

CREATE POLICY "admin_notifications_select_admin"
  ON admin_notifications FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "admin_notifications_modify_admin"
  ON admin_notifications FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- MODELS
DROP POLICY IF EXISTS "models_select_admin" ON models;
DROP POLICY IF EXISTS "models_modify_admin" ON models;

CREATE POLICY "models_select_admin"
  ON models FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "models_modify_admin"
  ON models FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- IMAGES_QUEUE
DROP POLICY IF EXISTS "images_queue_select_admin" ON images_queue;
DROP POLICY IF EXISTS "images_queue_modify_admin" ON images_queue;

CREATE POLICY "images_queue_select_admin"
  ON images_queue FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "images_queue_modify_admin"
  ON images_queue FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.current_user_role IS 'Retorna a role do usuário atual sem acionar RLS (evita recursão infinita)';
