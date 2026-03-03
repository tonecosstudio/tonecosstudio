-- Verificar se a view production_queue_with_details existe
SELECT 
  'production_queue_with_details' as object_name,
  'VIEW' as object_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'production_queue_with_details'
    ) THEN 'EXISTS'
    ELSE 'NOT FOUND'
  END as status;

-- Verificar se a função get_production_metrics existe
SELECT 
  'get_production_metrics' as object_name,
  'FUNCTION' as object_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'get_production_metrics'
    ) THEN 'EXISTS'
    ELSE 'NOT FOUND'
  END as status;

-- Verificar se a tabela production_queue existe
SELECT 
  'production_queue' as object_name,
  'TABLE' as object_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'production_queue'
    ) THEN 'EXISTS'
    ELSE 'NOT FOUND'
  END as status;

-- Se a view existir, contar registros
SELECT 
  'production_queue_with_details' as object_name,
  'RECORD COUNT' as info_type,
  COUNT(*)::text as value
FROM production_queue_with_details
WHERE EXISTS (
  SELECT 1 FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name = 'production_queue_with_details'
);

-- Se a tabela existir, contar registros
SELECT 
  'production_queue' as object_name,
  'RECORD COUNT' as info_type,
  COUNT(*)::text as value
FROM production_queue
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'production_queue'
);
