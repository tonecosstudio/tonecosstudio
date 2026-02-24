-- ============================================
-- POPULAR FRANQUIAS DE EXEMPLO
-- ============================================
-- Este script adiciona franquias comuns de colecionáveis
-- para você começar a usar o sistema

-- 1. Verificar se já existem franquias
SELECT COUNT(*) as franchises_existentes FROM franchises;

-- 2. Inserir franquias populares de colecionáveis
INSERT INTO franchises (canonical, aliases) VALUES
  ('Marvel Cinematic Universe', ARRAY['MCU', 'Marvel Studios', 'Marvel Movies', 'Marvel Cinematic Universe']),
  ('Marvel Comics', ARRAY['Marvel', 'Marvel Comics']),
  ('DC Comics', ARRAY['DC', 'DC Universe', 'DCU', 'DC Comics']),
  ('Star Wars', ARRAY['Star Wars', 'Guerra nas Estrelas', 'SW']),
  ('Star Trek', ARRAY['Star Trek', 'Jornada nas Estrelas']),
  ('Harry Potter', ARRAY['Harry Potter', 'HP', 'Wizarding World']),
  ('Lord of the Rings', ARRAY['LOTR', 'Lord of the Rings', 'Senhor dos Anéis']),
  ('Game of Thrones', ARRAY['GoT', 'Game of Thrones', 'A Song of Ice and Fire']),
  ('Pokemon', ARRAY['Pokemon', 'Pokémon']),
  ('Dragon Ball', ARRAY['Dragon Ball', 'DBZ', 'Dragon Ball Z']),
  ('One Piece', ARRAY['One Piece']),
  ('Naruto', ARRAY['Naruto', 'Naruto Shippuden']),
  ('Transformers', ARRAY['Transformers']),
  ('Teenage Mutant Ninja Turtles', ARRAY['TMNT', 'Ninja Turtles', 'Tartarugas Ninja']),
  ('Power Rangers', ARRAY['Power Rangers']),
  ('Disney', ARRAY['Disney', 'Walt Disney']),
  ('Pixar', ARRAY['Pixar']),
  ('Studio Ghibli', ARRAY['Ghibli', 'Studio Ghibli']),
  ('The Simpsons', ARRAY['Simpsons', 'The Simpsons']),
  ('Rick and Morty', ARRAY['Rick and Morty'])
ON CONFLICT (canonical) DO NOTHING;

-- 3. Verificar resultado
SELECT COUNT(*) as total_franchises FROM franchises;

-- 4. Ver todas as franquias criadas
SELECT canonical, array_length(aliases, 1) as num_aliases 
FROM franchises 
ORDER BY canonical;

-- 5. Criar algumas regras automáticas de exemplo
INSERT INTO franchise_rules (pattern, franchise_canonical, enabled, priority, note) VALUES
  ('iron man', 'Marvel Cinematic Universe', true, 100, 'Personagem principal MCU'),
  ('captain america', 'Marvel Cinematic Universe', true, 100, 'Personagem principal MCU'),
  ('thor', 'Marvel Cinematic Universe', true, 100, 'Personagem principal MCU'),
  ('hulk', 'Marvel Cinematic Universe', true, 100, 'Personagem principal MCU'),
  ('avengers', 'Marvel Cinematic Universe', true, 100, 'Equipe principal MCU'),
  ('spider-man', 'Marvel Comics', true, 100, 'Personagem Marvel'),
  ('spiderman', 'Marvel Comics', true, 100, 'Personagem Marvel'),
  ('batman', 'DC Comics', true, 100, 'Personagem principal DC'),
  ('superman', 'DC Comics', true, 100, 'Personagem principal DC'),
  ('wonder woman', 'DC Comics', true, 100, 'Personagem principal DC'),
  ('joker', 'DC Comics', true, 100, 'Vilão DC'),
  ('darth vader', 'Star Wars', true, 100, 'Personagem principal'),
  ('yoda', 'Star Wars', true, 100, 'Personagem principal'),
  ('luke skywalker', 'Star Wars', true, 100, 'Personagem principal'),
  ('lightsaber', 'Star Wars', true, 90, 'Item icônico'),
  ('pikachu', 'Pokemon', true, 100, 'Personagem principal'),
  ('charizard', 'Pokemon', true, 100, 'Pokemon popular'),
  ('goku', 'Dragon Ball', true, 100, 'Personagem principal'),
  ('vegeta', 'Dragon Ball', true, 100, 'Personagem principal'),
  ('harry potter', 'Harry Potter', true, 100, 'Personagem principal')
ON CONFLICT DO NOTHING;

-- 6. Verificar regras criadas
SELECT COUNT(*) as total_regras FROM franchise_rules;

-- 7. Ver algumas regras
SELECT pattern, franchise_canonical, enabled, priority 
FROM franchise_rules 
ORDER BY priority DESC, pattern 
LIMIT 10;

-- 8. Resumo final
SELECT 
  (SELECT COUNT(*) FROM franchises) as total_franchises,
  (SELECT COUNT(*) FROM franchise_rules) as total_regras,
  (SELECT COUNT(*) FROM franchise_rules WHERE enabled = true) as regras_ativas;
