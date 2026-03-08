-- Verificar se temos dados necessários para o teste

SELECT 
  'USUARIOS' as tipo,
  COUNT(*) as total
FROM profiles
UNION ALL
SELECT 
  'METODOS_PAGAMENTO' as tipo,
  COUNT(*) as total
FROM admin_payment_methods
UNION ALL
SELECT 
  'SUBSCRIPTIONS' as tipo,
  COUNT(*) as total
FROM subscriptions
UNION ALL
SELECT 
  'SUBSCRIPTIONS_COM_COLLECTION' as tipo,
  COUNT(*) as total
FROM subscriptions
WHERE active_collection_id IS NOT NULL
UNION ALL
SELECT 
  'COLLECTIONS' as tipo,
  COUNT(*) as total
FROM collections;
