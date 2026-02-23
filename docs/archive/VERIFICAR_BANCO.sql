-- SQL para verificar o que existe no banco remoto
-- Execute no SQL Editor: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- 1. Verificar se a função has_role existe
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'has_role';

-- 2. Verificar se a tabela franchise_rules existe
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'franchise_rules';

-- 3. Verificar colunas de images_queue
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'images_queue'
  AND column_name IN ('ai_suggested_name', 'ai_confidence', 'ai_model_used', 'image_hash', 'storage_bucket', 'storage_path');

-- 4. Verificar políticas RLS de franchise_rules
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'franchise_rules';

-- 5. Verificar se a função set_updated_at existe
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'set_updated_at';
