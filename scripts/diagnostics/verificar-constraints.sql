-- Verificar constraints da production_queue

-- 1. Ver constraint de current_stage
SELECT 
  'CONSTRAINT_CURRENT_STAGE' as tipo,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'production_queue'::regclass
AND conname LIKE '%current_stage%';

-- 2. Ver todos os constraints da tabela
SELECT 
  'TODOS_CONSTRAINTS' as tipo,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'production_queue'::regclass
ORDER BY conname;

-- 3. Ver valores únicos de current_stage atualmente no banco
SELECT 
  'VALORES_ATUAIS' as tipo,
  current_stage,
  COUNT(*) as total
FROM production_queue
GROUP BY current_stage
ORDER BY total DESC;

-- 4. Testar se 'production' é válido
DO $$
BEGIN
  -- Tentar criar um registro temporário com current_stage = 'production'
  RAISE NOTICE 'Testando valor "production" para current_stage...';
  
  -- Verificar se o valor está no enum/check
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conrelid = 'production_queue'::regclass 
    AND conname LIKE '%current_stage%'
    AND pg_get_constraintdef(oid) LIKE '%production%'
  ) THEN
    RAISE NOTICE '✅ Valor "production" está no constraint';
  ELSE
    RAISE NOTICE '❌ Valor "production" NÃO está no constraint';
  END IF;
END $$;
