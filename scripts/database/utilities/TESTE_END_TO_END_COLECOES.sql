-- 🧪 TESTE END-TO-END: Sistema de Coleções
-- Testa coleções com 6 e 12 personagens
-- Execute no Supabase SQL Editor

-- ============================================
-- LIMPEZA (apenas para teste)
-- ============================================

-- Remover dados de teste anteriores
DELETE FROM collection_characters WHERE collection_id IN (
  SELECT id FROM collections WHERE slug IN ('batman-6', 'star-wars-12', 'marvel-heroes-12')
);

DELETE FROM collections WHERE slug IN ('batman-6', 'star-wars-12', 'marvel-heroes-12');

-- ============================================
-- TESTE 1: Coleção com 6 personagens
-- ============================================

DO $$
DECLARE
  batman_id UUID;
BEGIN
  -- Criar coleção Batman (6 personagens)
  INSERT INTO collections (id, name, slug, description, is_active, display_order)
  VALUES (
    gen_random_uuid(),
    'Batman - Cavaleiro das Trevas',
    'batman-6',
    'Coleção com 6 personagens do universo Batman. Heróis e vilões de Gotham City.',
    true,
    10
  ) RETURNING id INTO batman_id;
  
  RAISE NOTICE '✅ Coleção Batman criada (6 personagens)';
  
  -- Inserir 6 personagens
  INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
  (gen_random_uuid(), batman_id, 'Batman', 'O Cavaleiro das Trevas', 1, 'released'),
  (gen_random_uuid(), batman_id, 'Robin', 'O Menino Prodígio', 2, 'released'),
  (gen_random_uuid(), batman_id, 'Coringa', 'O Palhaço do Crime', 3, 'revealed'),
  (gen_random_uuid(), batman_id, 'Mulher-Gato', 'A Ladra de Gotham', 4, 'revealed'),
  (gen_random_uuid(), batman_id, 'Pinguim', 'O Cavalheiro do Crime', 5, 'upcoming'),
  (gen_random_uuid(), batman_id, 'Duas-Caras', 'Harvey Dent', 6, 'upcoming');
  
  RAISE NOTICE '✅ 6 personagens inseridos para Batman';
END $$;

-- ============================================
-- TESTE 2: Coleção com 12 personagens
-- ============================================

DO $$
DECLARE
  starwars_id UUID;
BEGIN
  -- Criar coleção Star Wars (12 personagens)
  INSERT INTO collections (id, name, slug, description, is_active, display_order)
  VALUES (
    gen_random_uuid(),
    'Star Wars - Saga Completa',
    'star-wars-12',
    'Coleção com 12 personagens icônicos de Star Wars. Heróis e vilões da galáxia.',
    true,
    11
  ) RETURNING id INTO starwars_id;
  
  RAISE NOTICE '✅ Coleção Star Wars criada (12 personagens)';
  
  -- Inserir 12 personagens
  INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
  (gen_random_uuid(), starwars_id, 'Luke Skywalker', 'O último Jedi', 1, 'released'),
  (gen_random_uuid(), starwars_id, 'Darth Vader', 'O Lorde Sith', 2, 'released'),
  (gen_random_uuid(), starwars_id, 'Princesa Leia', 'Líder da Rebelião', 3, 'released'),
  (gen_random_uuid(), starwars_id, 'Han Solo', 'O contrabandista', 4, 'revealed'),
  (gen_random_uuid(), starwars_id, 'Chewbacca', 'O Wookiee leal', 5, 'revealed'),
  (gen_random_uuid(), starwars_id, 'Yoda', 'Mestre Jedi', 6, 'revealed'),
  (gen_random_uuid(), starwars_id, 'Obi-Wan Kenobi', 'O sábio Jedi', 7, 'upcoming'),
  (gen_random_uuid(), starwars_id, 'R2-D2', 'O droide astromecânico', 8, 'upcoming'),
  (gen_random_uuid(), starwars_id, 'C-3PO', 'O droide de protocolo', 9, 'upcoming'),
  (gen_random_uuid(), starwars_id, 'Boba Fett', 'O caçador de recompensas', 10, 'upcoming'),
  (gen_random_uuid(), starwars_id, 'Stormtrooper', 'Soldado Imperial', 11, 'upcoming'),
  (gen_random_uuid(), starwars_id, 'Imperador Palpatine', 'O Lorde Sith supremo', 12, 'upcoming');
  
  RAISE NOTICE '✅ 12 personagens inseridos para Star Wars';
END $$;

-- ============================================
-- TESTE 3: Outra coleção com 12 personagens
-- ============================================

DO $$
DECLARE
  marvel_id UUID;
BEGIN
  -- Criar coleção Marvel Heroes (12 personagens)
  INSERT INTO collections (id, name, slug, description, is_active, display_order)
  VALUES (
    gen_random_uuid(),
    'Marvel Heroes - Vingadores',
    'marvel-heroes-12',
    'Coleção com 12 heróis da Marvel. Os Vingadores mais poderosos da Terra.',
    true,
    12
  ) RETURNING id INTO marvel_id;
  
  RAISE NOTICE '✅ Coleção Marvel Heroes criada (12 personagens)';
  
  -- Inserir 12 personagens
  INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
  (gen_random_uuid(), marvel_id, 'Homem de Ferro', 'Tony Stark, gênio bilionário', 1, 'released'),
  (gen_random_uuid(), marvel_id, 'Capitão América', 'Steve Rogers, super soldado', 2, 'released'),
  (gen_random_uuid(), marvel_id, 'Thor', 'Deus do Trovão', 3, 'released'),
  (gen_random_uuid(), marvel_id, 'Hulk', 'Bruce Banner, força descomunal', 4, 'revealed'),
  (gen_random_uuid(), marvel_id, 'Viúva Negra', 'Natasha Romanoff, espiã', 5, 'revealed'),
  (gen_random_uuid(), marvel_id, 'Gavião Arqueiro', 'Clint Barton, arqueiro', 6, 'revealed'),
  (gen_random_uuid(), marvel_id, 'Homem-Aranha', 'Peter Parker, amigão da vizinhança', 7, 'upcoming'),
  (gen_random_uuid(), marvel_id, 'Pantera Negra', 'T\'Challa, rei de Wakanda', 8, 'upcoming'),
  (gen_random_uuid(), marvel_id, 'Doutor Estranho', 'Stephen Strange, feiticeiro', 9, 'upcoming'),
  (gen_random_uuid(), marvel_id, 'Feiticeira Escarlate', 'Wanda Maximoff', 10, 'upcoming'),
  (gen_random_uuid(), marvel_id, 'Visão', 'Androide sintético', 11, 'upcoming'),
  (gen_random_uuid(), marvel_id, 'Falcão', 'Sam Wilson, herói alado', 12, 'upcoming');
  
  RAISE NOTICE '✅ 12 personagens inseridos para Marvel Heroes';
END $$;

-- ============================================
-- VERIFICAÇÃO DOS TESTES
-- ============================================

SELECT '🎉 TESTES CONCLUÍDOS!' as status;
SELECT '================================' as separator;

-- Verificar coleções criadas
SELECT '📊 COLEÇÕES DE TESTE:' as titulo;
SELECT 
  name as colecao,
  slug,
  is_active as ativa,
  display_order as ordem
FROM collections 
WHERE slug IN ('batman-6', 'star-wars-12', 'marvel-heroes-12')
ORDER BY display_order;

SELECT '================================' as separator;

-- Verificar contagem de personagens
SELECT '👥 CONTAGEM DE PERSONAGENS:' as titulo;
SELECT 
  c.name as colecao,
  c.slug,
  COUNT(cc.id) as total_personagens,
  SUM(CASE WHEN cc.status = 'released' THEN 1 ELSE 0 END) as disponiveis,
  SUM(CASE WHEN cc.status = 'revealed' THEN 1 ELSE 0 END) as revelados,
  SUM(CASE WHEN cc.status = 'upcoming' THEN 1 ELSE 0 END) as em_breve,
  CASE 
    WHEN COUNT(cc.id) = 6 THEN '✅ CORRETO (6)'
    WHEN COUNT(cc.id) = 12 THEN '✅ CORRETO (12)'
    ELSE '❌ ERRO'
  END as validacao
FROM collections c
LEFT JOIN collection_characters cc ON cc.collection_id = c.id
WHERE c.slug IN ('batman-6', 'star-wars-12', 'marvel-heroes-12')
GROUP BY c.id, c.name, c.slug
ORDER BY c.display_order;

SELECT '================================' as separator;

-- Listar todos os personagens
SELECT '📋 LISTA COMPLETA DE PERSONAGENS:' as titulo;
SELECT 
  c.name as colecao,
  cc.release_order as ordem,
  cc.name as personagem,
  CASE cc.status
    WHEN 'released' THEN '✅ Disponível'
    WHEN 'revealed' THEN '👁️ Revelado'
    WHEN 'upcoming' THEN '⏳ Em breve'
  END as status
FROM collection_characters cc
JOIN collections c ON c.id = cc.collection_id
WHERE c.slug IN ('batman-6', 'star-wars-12', 'marvel-heroes-12')
ORDER BY c.display_order, cc.release_order;

SELECT '================================' as separator;

-- URLs para testar no navegador
SELECT '🌐 TESTE NO NAVEGADOR:' as titulo;
SELECT 'http://localhost:8080/colecoes/batman-6' as url, 'Deve mostrar 6 personagens' as esperado
UNION ALL
SELECT 'http://localhost:8080/colecoes/star-wars-12' as url, 'Deve mostrar 12 personagens' as esperado
UNION ALL
SELECT 'http://localhost:8080/colecoes/marvel-heroes-12' as url, 'Deve mostrar 12 personagens' as esperado;

SELECT '================================' as separator;

-- Checklist de validação
SELECT '✅ CHECKLIST DE VALIDAÇÃO:' as titulo;
SELECT '1. Batman tem 6 personagens?' as item, 
  CASE WHEN (SELECT COUNT(*) FROM collection_characters cc JOIN collections c ON c.id = cc.collection_id WHERE c.slug = 'batman-6') = 6 
  THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
UNION ALL
SELECT '2. Star Wars tem 12 personagens?' as item,
  CASE WHEN (SELECT COUNT(*) FROM collection_characters cc JOIN collections c ON c.id = cc.collection_id WHERE c.slug = 'star-wars-12') = 12
  THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
UNION ALL
SELECT '3. Marvel Heroes tem 12 personagens?' as item,
  CASE WHEN (SELECT COUNT(*) FROM collection_characters cc JOIN collections c ON c.id = cc.collection_id WHERE c.slug = 'marvel-heroes-12') = 12
  THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
UNION ALL
SELECT '4. Todas as coleções estão ativas?' as item,
  CASE WHEN (SELECT COUNT(*) FROM collections WHERE slug IN ('batman-6', 'star-wars-12', 'marvel-heroes-12') AND is_active = true) = 3
  THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
UNION ALL
SELECT '5. Personagens têm status corretos?' as item,
  CASE WHEN (SELECT COUNT(*) FROM collection_characters cc JOIN collections c ON c.id = cc.collection_id WHERE c.slug IN ('batman-6', 'star-wars-12', 'marvel-heroes-12') AND cc.status IN ('released', 'revealed', 'upcoming')) = 30
  THEN '✅ SIM' ELSE '❌ NÃO' END as resultado;