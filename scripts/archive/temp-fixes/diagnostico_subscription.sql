-- Diagnóstico completo da subscription do usuário
-- User ID: 8cdbe271-76da-4f74-ac93-7d92f57ed244

-- 1. Verificar se o usuário tem subscriptions
SELECT 
  id,
  user_id,
  collection_id,
  plan_type,
  status,
  created_at
FROM subscriptions
WHERE user_id = '8cdbe271-76da-4f74-ac93-7d92f57ed244'
ORDER BY created_at DESC;

-- 2. Verificar se há subscription_collections para essas subscriptions
SELECT 
  sc.id,
  sc.subscription_id,
  sc.collection_id,
  sc.added_at,
  s.status as subscription_status,
  s.plan_type
FROM subscription_collections sc
JOIN subscriptions s ON s.id = sc.subscription_id
WHERE s.user_id = '8cdbe271-76da-4f74-ac93-7d92f57ed244';

-- 3. Verificar se as collections existem
SELECT 
  c.id,
  c.name,
  c.slug,
  c.is_active
FROM collections c
WHERE c.id IN (
  SELECT sc.collection_id
  FROM subscription_collections sc
  JOIN subscriptions s ON s.id = sc.subscription_id
  WHERE s.user_id = '8cdbe271-76da-4f74-ac93-7d92f57ed244'
);

-- 4. Verificar subscriptions que têm collection_id mas não têm subscription_collections
SELECT 
  s.id,
  s.collection_id,
  s.plan_type,
  s.status,
  CASE 
    WHEN sc.id IS NULL THEN 'SEM subscription_collections'
    ELSE 'COM subscription_collections'
  END as status_migracao
FROM subscriptions s
LEFT JOIN subscription_collections sc ON sc.subscription_id = s.id
WHERE s.user_id = '8cdbe271-76da-4f74-ac93-7d92f57ed244'
AND s.status = 'active';

-- 5. Se houver subscriptions sem subscription_collections, criar os registros
-- IMPORTANTE: Execute apenas se a query #4 mostrar "SEM subscription_collections"
INSERT INTO subscription_collections (subscription_id, collection_id)
SELECT 
  s.id,
  s.collection_id
FROM subscriptions s
LEFT JOIN subscription_collections sc ON sc.subscription_id = s.id
WHERE s.user_id = '8cdbe271-76da-4f74-ac93-7d92f57ed244'
AND s.status = 'active'
AND s.collection_id IS NOT NULL
AND sc.id IS NULL
ON CONFLICT (subscription_id, collection_id) DO NOTHING
RETURNING *;
