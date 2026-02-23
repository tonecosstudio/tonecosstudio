-- =====================================================
-- QUERIES ÚTEIS PARA ADMINISTRAÇÃO DO SISTEMA DE COLECIONADOR
-- =====================================================

-- 1. RANKING DE COLECIONADORES
-- Top 20 colecionadores por nível e XP
SELECT 
  username,
  display_name,
  collector_level,
  collector_xp,
  pieces_owned,
  total_spent,
  (SELECT COUNT(*) FROM user_badges WHERE user_id = profiles.id) as badges_count
FROM profiles
WHERE is_public = true
ORDER BY collector_level DESC, collector_xp DESC
LIMIT 20;

-- 2. ESTATÍSTICAS GERAIS DO SISTEMA
SELECT 
  COUNT(*) FILTER (WHERE is_public = true) as perfis_publicos,
  COUNT(*) FILTER (WHERE collector_level >= 5) as nivel_5_ou_mais,
  COUNT(*) FILTER (WHERE pieces_owned >= 10) as com_10_pecas_ou_mais,
  ROUND(AVG(collector_level), 2) as nivel_medio,
  ROUND(AVG(pieces_owned), 2) as pecas_media,
  ROUND(AVG(total_spent), 2) as gasto_medio,
  SUM(total_spent) as receita_total
FROM profiles;

-- 3. BADGES MAIS RAROS
-- Badges que menos pessoas conquistaram
SELECT 
  cb.name,
  cb.rarity,
  cb.icon,
  COUNT(ub.user_id) as usuarios_com_badge,
  ROUND(COUNT(ub.user_id) * 100.0 / (SELECT COUNT(*) FROM profiles), 2) as percentual
FROM collector_badges cb
LEFT JOIN user_badges ub ON ub.badge_id = cb.id
GROUP BY cb.id, cb.name, cb.rarity, cb.icon
ORDER BY usuarios_com_badge ASC, cb.rarity DESC;

-- 4. USUÁRIOS PRÓXIMOS DE CONQUISTAR BADGES
-- Usuários que estão perto de ganhar o próximo badge de peças
SELECT 
  p.username,
  p.display_name,
  p.pieces_owned,
  cb.name as proximo_badge,
  cb.requirement_value as pecas_necessarias,
  cb.requirement_value - p.pieces_owned as faltam
FROM profiles p
CROSS JOIN collector_badges cb
WHERE cb.requirement_type = 'pieces_owned'
  AND p.pieces_owned < cb.requirement_value
  AND NOT EXISTS (
    SELECT 1 FROM user_badges ub 
    WHERE ub.user_id = p.id AND ub.badge_id = cb.id
  )
  AND cb.requirement_value - p.pieces_owned <= 3
ORDER BY faltam ASC, p.pieces_owned DESC
LIMIT 20;

-- 5. COLEÇÕES MAIS POPULARES
-- Modelos mais adicionados às coleções públicas
SELECT 
  cm.name as modelo,
  f.name as franquia,
  COUNT(pc.id) as vezes_adicionado,
  COUNT(DISTINCT pc.user_id) as colecionadores_unicos
FROM public_collection pc
JOIN collectible_models cm ON cm.id = pc.model_id
LEFT JOIN franchises f ON f.id = cm.franchise_id
GROUP BY cm.id, cm.name, f.name
ORDER BY vezes_adicionado DESC
LIMIT 20;

-- 6. ATIVIDADE RECENTE
-- Últimos badges conquistados
SELECT 
  p.username,
  p.display_name,
  cb.name as badge,
  cb.icon,
  cb.rarity,
  ub.earned_at
FROM user_badges ub
JOIN profiles p ON p.id = ub.user_id
JOIN collector_badges cb ON cb.id = ub.badge_id
WHERE p.is_public = true
ORDER BY ub.earned_at DESC
LIMIT 20;

-- 7. PERFIS MAIS COMPLETOS
-- Usuários com perfil mais preenchido
SELECT 
  username,
  display_name,
  CASE WHEN bio IS NOT NULL AND bio != '' THEN 1 ELSE 0 END +
  CASE WHEN avatar_url IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN (SELECT COUNT(*) FROM public_collection WHERE user_id = profiles.id) > 0 THEN 1 ELSE 0 END +
  CASE WHEN (SELECT COUNT(*) FROM user_badges WHERE user_id = profiles.id) > 0 THEN 1 ELSE 0 END as completude_score,
  (SELECT COUNT(*) FROM public_collection WHERE user_id = profiles.id) as itens_colecao,
  (SELECT COUNT(*) FROM user_badges WHERE user_id = profiles.id) as badges
FROM profiles
WHERE is_public = true
ORDER BY completude_score DESC, badges DESC
LIMIT 20;

-- 8. DISTRIBUIÇÃO DE NÍVEIS
-- Quantos usuários em cada nível
SELECT 
  collector_level as nivel,
  COUNT(*) as usuarios,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM profiles), 2) as percentual
FROM profiles
GROUP BY collector_level
ORDER BY collector_level;

-- 9. DISTRIBUIÇÃO DE GASTOS
-- Faixas de investimento
SELECT 
  CASE 
    WHEN total_spent = 0 THEN '0 - Sem compras'
    WHEN total_spent < 100 THEN '1 - R$ 1-99'
    WHEN total_spent < 500 THEN '2 - R$ 100-499'
    WHEN total_spent < 1000 THEN '3 - R$ 500-999'
    WHEN total_spent < 2000 THEN '4 - R$ 1000-1999'
    WHEN total_spent < 5000 THEN '5 - R$ 2000-4999'
    ELSE '6 - R$ 5000+'
  END as faixa_investimento,
  COUNT(*) as usuarios,
  ROUND(AVG(total_spent), 2) as media_faixa,
  SUM(total_spent) as total_faixa
FROM profiles
GROUP BY faixa_investimento
ORDER BY faixa_investimento;

-- 10. USUÁRIOS SEM BADGES
-- Identificar usuários que ainda não conquistaram nenhum badge
SELECT 
  p.username,
  p.display_name,
  p.collector_level,
  p.pieces_owned,
  p.total_spent,
  (SELECT COUNT(*) FROM model_likes WHERE user_id = p.id) as likes_dados
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_badges WHERE user_id = p.id
)
AND p.is_public = true
ORDER BY p.pieces_owned DESC, p.total_spent DESC
LIMIT 20;

-- 11. FORÇAR VERIFICAÇÃO DE BADGES PARA TODOS
-- Execute se badges não estão sendo concedidos automaticamente
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM profiles LOOP
    PERFORM check_and_grant_badges(user_record.id);
  END LOOP;
END $$;

-- 12. ADICIONAR XP MANUALMENTE (se necessário)
-- Exemplo: adicionar 100 XP para um usuário específico
-- SELECT add_collector_xp('USER_ID_AQUI', 100);

-- 13. CRIAR NOVO BADGE CUSTOMIZADO
-- Template para adicionar novos badges
/*
INSERT INTO collector_badges (id, name, description, icon, rarity, requirement_type, requirement_value)
VALUES (
  'badge_id_unico',
  'Nome do Badge',
  'Descrição do que é necessário para conquistar',
  '🏆',
  'rare', -- common, rare, epic, legendary
  'pieces_owned', -- pieces_owned, total_spent, likes_count, user_rank
  50 -- valor necessário
);
*/

-- 14. REMOVER BADGE DE UM USUÁRIO (se necessário)
-- DELETE FROM user_badges WHERE user_id = 'USER_ID' AND badge_id = 'BADGE_ID';

-- 15. RESETAR ESTATÍSTICAS DE UM USUÁRIO (cuidado!)
/*
UPDATE profiles
SET 
  collector_level = 1,
  collector_xp = 0,
  pieces_owned = 0,
  total_spent = 0
WHERE id = 'USER_ID';

DELETE FROM user_badges WHERE user_id = 'USER_ID';
*/

-- 16. PERFIS MAIS ATIVOS (por likes)
SELECT 
  p.username,
  p.display_name,
  COUNT(ml.id) as total_likes,
  p.collector_level,
  (SELECT COUNT(*) FROM user_badges WHERE user_id = p.id) as badges
FROM profiles p
LEFT JOIN model_likes ml ON ml.user_id = p.id
WHERE p.is_public = true
GROUP BY p.id, p.username, p.display_name, p.collector_level
ORDER BY total_likes DESC
LIMIT 20;

-- 17. VERIFICAR INTEGRIDADE DO SISTEMA
-- Usuários com estatísticas inconsistentes
SELECT 
  p.id,
  p.username,
  p.pieces_owned as pieces_registradas,
  COALESCE(SUM(qi.quantity), 0) as pieces_reais,
  p.total_spent as gasto_registrado,
  COALESCE(SUM(qi.quantity * qi.unit_price), 0) as gasto_real
FROM profiles p
LEFT JOIN quotes q ON q.user_id = p.id AND q.status = 'approved'
LEFT JOIN quote_items qi ON qi.quote_id = q.id
GROUP BY p.id, p.username, p.pieces_owned, p.total_spent
HAVING 
  p.pieces_owned != COALESCE(SUM(qi.quantity), 0) OR
  p.total_spent != COALESCE(SUM(qi.quantity * qi.unit_price), 0)
LIMIT 20;

-- 18. CORRIGIR ESTATÍSTICAS INCONSISTENTES
-- Execute se encontrar inconsistências na query acima
/*
DO $$
DECLARE
  user_record RECORD;
  real_pieces integer;
  real_spent numeric;
BEGIN
  FOR user_record IN SELECT id FROM profiles LOOP
    SELECT 
      COALESCE(SUM(qi.quantity), 0),
      COALESCE(SUM(qi.quantity * qi.unit_price), 0)
    INTO real_pieces, real_spent
    FROM quotes q
    JOIN quote_items qi ON qi.quote_id = q.id
    WHERE q.user_id = user_record.id AND q.status = 'approved';
    
    UPDATE profiles
    SET 
      pieces_owned = real_pieces,
      total_spent = real_spent
    WHERE id = user_record.id;
    
    PERFORM check_and_grant_badges(user_record.id);
  END LOOP;
END $$;
*/

-- 19. EXPORTAR DADOS DE UM PERFIL COMPLETO
-- Para backup ou análise
SELECT 
  json_build_object(
    'profile', (
      SELECT row_to_json(p) 
      FROM (
        SELECT username, display_name, bio, collector_level, collector_xp, 
               pieces_owned, total_spent, is_public
        FROM profiles WHERE id = 'USER_ID'
      ) p
    ),
    'badges', (
      SELECT json_agg(row_to_json(b))
      FROM (
        SELECT cb.name, cb.icon, cb.rarity, ub.earned_at
        FROM user_badges ub
        JOIN collector_badges cb ON cb.id = ub.badge_id
        WHERE ub.user_id = 'USER_ID'
      ) b
    ),
    'collection', (
      SELECT json_agg(row_to_json(c))
      FROM (
        SELECT cm.name, f.name as franchise, pc.notes
        FROM public_collection pc
        JOIN collectible_models cm ON cm.id = pc.model_id
        LEFT JOIN franchises f ON f.id = cm.franchise_id
        WHERE pc.user_id = 'USER_ID'
      ) c
    )
  ) as perfil_completo;

-- 20. MÉTRICAS DE ENGAJAMENTO
-- KPIs do sistema de gamificação
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE is_public = true) as perfis_publicos,
  (SELECT COUNT(DISTINCT user_id) FROM user_badges) as usuarios_com_badges,
  (SELECT COUNT(DISTINCT user_id) FROM public_collection) as usuarios_com_colecao,
  (SELECT COUNT(*) FROM user_badges) as total_badges_conquistados,
  (SELECT COUNT(*) FROM public_collection) as total_itens_colecao,
  (SELECT ROUND(AVG(badge_count), 2) FROM (
    SELECT COUNT(*) as badge_count 
    FROM user_badges 
    GROUP BY user_id
  ) sub) as media_badges_por_usuario,
  (SELECT ROUND(AVG(collection_count), 2) FROM (
    SELECT COUNT(*) as collection_count 
    FROM public_collection 
    GROUP BY user_id
  ) sub) as media_itens_por_colecao;
