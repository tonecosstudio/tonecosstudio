-- ============================================
-- FIX: Adicionar políticas RLS para leitura pública
-- ============================================
-- Execute este script no SQL Editor do Supabase

-- PROBLEMA: Tabelas públicas podem estar sem políticas RLS de leitura
-- para usuários anônimos e autenticados

-- SOLUÇÃO: Adicionar políticas que permitem leitura pública

-- 1. Collections (apenas ativas)
DROP POLICY IF EXISTS "public_read_active_collections" ON collections;
CREATE POLICY "public_read_active_collections"
ON collections
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 2. Collection Characters
DROP POLICY IF EXISTS "public_read_collection_characters" ON collection_characters;
CREATE POLICY "public_read_collection_characters"
ON collection_characters
FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Subscription Plans (apenas ativos)
DROP POLICY IF EXISTS "public_read_active_plans" ON subscription_plans;
CREATE POLICY "public_read_active_plans"
ON subscription_plans
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 4. Entry Cycles
DROP POLICY IF EXISTS "public_read_entry_cycles" ON entry_cycles;
CREATE POLICY "public_read_entry_cycles"
ON entry_cycles
FOR SELECT
TO anon, authenticated
USING (true);

-- 5. System Settings
DROP POLICY IF EXISTS "public_read_system_settings" ON system_settings;
CREATE POLICY "public_read_system_settings"
ON system_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Verificar políticas criadas
SELECT 
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE tablename IN ('collections', 'collection_characters', 'subscription_plans', 'entry_cycles', 'system_settings')
AND policyname LIKE 'public_%'
ORDER BY tablename, policyname;
