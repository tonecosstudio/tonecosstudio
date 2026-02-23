-- 🚀 MIGRAÇÃO SIMPLES: Dados iniciais para coleções
-- Versão sem dependência de total_characters
-- Execute no Supabase SQL Editor

-- ============================================
-- 1. INSERIR/ATUALIZAR COLEÇÕES
-- ============================================

-- Thundercats
INSERT INTO collections (id, name, slug, description, is_active, display_order)
VALUES (
  '099d78fc-b85f-46da-b9c2-68d54aec0266',
  'Thundercats',
  'thundercats',
  '12 personagens icônicos dos Thundercats. Receba Lion-O, Cheetara, Panthro e outros heróis de Thundera.',
  true,
  1
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

-- X-Men
INSERT INTO collections (id, name, slug, description, is_active, display_order)
VALUES (
  '11111111-2222-3333-4444-555555555555',
  'X-Men',
  'x-men',
  '12 mutantes mais poderosos da Marvel. Wolverine, Ciclope, Tempestade e toda a equipe de Charles Xavier.',
  true,
  2
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

-- Vilões do Homem-Aranha
INSERT INTO collections (id, name, slug, description, is_active, display_order)
VALUES (
  '22222222-3333-4444-5555-666666666666',
  'Vilões do Homem-Aranha',
  'viloes-homem-aranha',
  '12 vilões clássicos do Homem-Aranha. Duende Verde, Doutor Octopus, Venom e os maiores inimigos do Aranha.',
  true,
  3
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

-- ============================================
-- 2. INSERIR PERSONAGENS (4 por coleção - DEMO)
-- ============================================

-- Limpar personagens existentes
DELETE FROM collection_characters 
WHERE collection_id IN (
  '099d78fc-b85f-46da-b9c2-68d54aec0266',
  '11111111-2222-3333-4444-555555555555',
  '22222222-3333-4444-5555-666666666666'
);

-- Thundercats: 4 personagens
INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
(gen_random_uuid(), '099d78fc-b85f-46da-b9c2-68d54aec0266', 'Lion-O', 'Líder dos Thundercats', 1, 'released'),
(gen_random_uuid(), '099d78fc-b85f-46da-b9c2-68d54aec0266', 'Cheetara', 'A mais rápida', 2, 'released'),
(gen_random_uuid(), '099d78fc-b85f-46da-b9c2-68d54aec0266', 'Panthro', 'Engenheiro e estrategista', 3, 'revealed'),
(gen_random_uuid(), '099d78fc-b85f-46da-b9c2-68d54aec0266', 'Tygra', 'Mestre da invisibilidade', 4, 'upcoming');

-- X-Men: 4 personagens
INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
(gen_random_uuid(), '11111111-2222-3333-4444-555555555555', 'Wolverine', 'Mutante com garras de adamantium', 1, 'released'),
(gen_random_uuid(), '11111111-2222-3333-4444-555555555555', 'Ciclope', 'Líder dos X-Men', 2, 'released'),
(gen_random_uuid(), '11111111-2222-3333-4444-555555555555', 'Tempestade', 'Controla o clima', 3, 'revealed'),
(gen_random_uuid(), '11111111-2222-3333-4444-555555555555', 'Jean Grey', 'Telepata poderosa', 4, 'upcoming');

-- Vilões: 4 personagens
INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
(gen_random_uuid(), '22222222-3333-4444-5555-666666666666', 'Duende Verde', 'Norman Osborn', 1, 'released'),
(gen_random_uuid(), '22222222-3333-4444-5555-666666666666', 'Venom', 'Simbiote alienígena', 2, 'released'),
(gen_random_uuid(), '22222222-3333-4444-5555-666666666666', 'Doutor Octopus', 'Otto Octavius', 3, 'revealed'),
(gen_random_uuid(), '22222222-3333-4444-5555-666666666666', 'Carnificina', 'Simbiote vermelho', 4, 'upcoming');

-- ============================================
-- 3. VERIFICAÇÃO
-- ============================================

SELECT '🎉 MIGRAÇÃO CONCLUÍDA!' as status;
SELECT '================================' as separator;

SELECT '📊 COLEÇÕES CRIADAS:' as titulo;
SELECT 
  name as colecao,
  slug,
  is_active as ativa
FROM collections 
WHERE slug IN ('thundercats', 'x-men', 'viloes-homem-aranha')
ORDER BY display_order;

SELECT '================================' as separator;

SELECT '👥 PERSONAGENS POR COLEÇÃO:' as titulo;
SELECT 
  c.name as colecao,
  COUNT(cc.id) as total_personagens,
  SUM(CASE WHEN cc.status = 'released' THEN 1 ELSE 0 END) as disponiveis,
  SUM(CASE WHEN cc.status = 'revealed' THEN 1 ELSE 0 END) as revelados,
  SUM(CASE WHEN cc.status = 'upcoming' THEN 1 ELSE 0 END) as em_breve
FROM collections c
LEFT JOIN collection_characters cc ON cc.collection_id = c.id
WHERE c.slug IN ('thundercats', 'x-men', 'viloes-homem-aranha')
GROUP BY c.id, c.name
ORDER BY c.display_order;

SELECT '================================' as separator;
SELECT '🚀 PRÓXIMOS PASSOS:' as titulo;
SELECT '1. Acesse: http://localhost:8080/colecoes/thundercats' as instrucao;
SELECT '2. Verifique que a página carrega com 4 personagens' as instrucao;
SELECT '3. Use /admin/colecoes para adicionar mais 8 personagens' as instrucao;
SELECT '4. Repita para X-Men e Vilões' as instrucao;