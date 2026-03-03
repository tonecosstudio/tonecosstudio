-- DIAGNÓSTICO: Conveyor 500 Error
-- Execute este SQL no Supabase SQL Editor para identificar o problema

-- 1. Verificar se a tabela images_queue existe
SELECT 
  'images_queue existe' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'images_queue'
  ) THEN '✅ SIM' ELSE '❌ NÃO - Execute as migrations!' END as status;

-- 2. Verificar se a tabela franchise_rules existe
SELECT 
  'franchise_rules existe' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'franchise_rules'
  ) THEN '✅ SIM' ELSE '❌ NÃO - Execute as migrations!' END as status;

-- 3. Verificar se a função has_role existe
SELECT 
  'has_role() existe' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) THEN '✅ SIM' ELSE '❌ NÃO - Execute as migrations!' END as status;

-- 4. Verificar seu usuário e role
SELECT 
  'Seu user_id' as info,
  auth.uid()::text as valor
UNION ALL
SELECT 
  'Você é admin?' as info,
  CASE WHEN public.has_role(auth.uid(), 'admin') THEN '✅ SIM' ELSE '❌ NÃO' END as valor;

-- 5. Verificar RLS na images_queue
SELECT 
  'RLS habilitado em images_queue' as check_name,
  CASE WHEN relrowsecurity THEN '✅ SIM' ELSE '❌ NÃO' END as status
FROM pg_class
WHERE relname = 'images_queue' AND relnamespace = 'public'::regnamespace;

-- 6. Listar policies da images_queue
SELECT 
  'Policies em images_queue' as info,
  string_agg(policyname, ', ') as valor
FROM pg_policy
WHERE polrelid = 'public.images_queue'::regclass;

-- 7. Contar registros na fila (se você for admin)
SELECT 
  'Total na fila' as info,
  count(*)::text as valor
FROM public.images_queue;
