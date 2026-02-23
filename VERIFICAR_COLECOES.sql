-- 🔍 VERIFICAÇÃO: Diagnóstico de Coleções
-- Execute no Supabase SQL Editor

-- 1. Verificar se as coleções foram criadas
SELECT '📊 COLEÇÕES NO BANCO:' as titulo;
SELECT 
  id,
  name,
  slug,
  is_active,
  created_at
FROM collections 
WHERE slug IN ('batman-6', 'star-wars-12', 'marvel-heroes-12')
ORDER BY display_order;

-- 2. Verificar personagens
SELECT '👥 PERSONAGENS POR COLEÇÃO:' as titulo;
SELECT 
  c.name as colecao,
  c.slug,
  COUNT(cc.id) as total_personagens
FROM collections c
LEFT JOIN collection_characters cc ON cc.collection_id = c.id
WHERE c.slug IN ('batman-6', 'star-wars-12', 'marvel-heroes-12')
GROUP BY c.id, c.name, c.slug;

-- 3. Verificar RLS Policies
SELECT '🔐 POLÍTICAS RLS:' as titulo;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('collections', 'collection_characters')
ORDER BY tablename, policyname;

-- 4. Testar query que o frontend faz
SELECT '🧪 TESTE DE QUERY (como frontend):' as titulo;
SELECT 
  c.*,
  (
    SELECT json_agg(
      json_build_object(
        'id', cc.id,
        'name', cc.name,
        'description', cc.description,
        'release_order', cc.release_order,
        'status', cc.status
      ) ORDER BY cc.release_order
    )
    FROM collection_characters cc
    WHERE cc.collection_id = c.id
  ) as collection_characters
FROM collections c
WHERE c.slug = 'batman-6'
AND c.is_active = true;

-- 5. Verificar se usuário está autenticado
SELECT '👤 USUÁRIO ATUAL:' as titulo;
SELECT 
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NÃO AUTENTICADO'
    ELSE '✅ AUTENTICADO: ' || auth.uid()::text
  END as status;

-- 6. Verificar todas as coleções ativas
SELECT '📋 TODAS AS COLEÇÕES ATIVAS:' as titulo;
SELECT 
  name,
  slug,
  is_active
FROM collections
WHERE is_active = true
ORDER BY display_order;