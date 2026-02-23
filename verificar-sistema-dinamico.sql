-- ============================================
-- VERIFICAR SISTEMA DINÂMICO
-- ============================================

-- 1. Ver próximo lançamento (deve aparecer no banner)
SELECT * FROM get_next_release();

-- 2. Ver todos os personagens com datas
SELECT 
  cc.name,
  cc.release_order,
  cc.status,
  cc.release_date,
  (cc.release_date - CURRENT_DATE) as days_until,
  c.name as collection_name
FROM collection_characters cc
JOIN collections c ON c.id = cc.collection_id
WHERE cc.release_date IS NOT NULL
ORDER BY cc.release_date
LIMIT 10;

-- 3. Ver eventos criados (se houver)
SELECT 
  ce.event_type,
  ce.old_status,
  ce.new_status,
  cc.name as character_name,
  ce.created_at
FROM collection_events ce
JOIN collection_characters cc ON cc.id = ce.character_id
ORDER BY ce.created_at DESC
LIMIT 5;

-- 4. Ver notificações criadas (se houver)
SELECT 
  cn.type,
  cn.title,
  cn.message,
  cc.name as character_name,
  cn.created_at
FROM collection_notifications cn
JOIN collection_characters cc ON cc.id = cn.character_id
ORDER BY cn.created_at DESC
LIMIT 5;

-- 5. Estatísticas gerais
SELECT 
  COUNT(*) as total_characters,
  COUNT(*) FILTER (WHERE release_date IS NOT NULL) as with_dates,
  COUNT(*) FILTER (WHERE status = 'upcoming') as upcoming,
  COUNT(*) FILTER (WHERE status = 'revealed') as revealed,
  COUNT(*) FILTER (WHERE status = 'released') as released
FROM collection_characters;
