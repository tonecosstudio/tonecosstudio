-- Script para inserir coleções de teste (bypass RLS temporário)
-- ATENÇÃO: Use apenas em ambiente de desenvolvimento/teste

-- Desabilitar RLS temporariamente
ALTER TABLE collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE collection_characters DISABLE ROW LEVEL SECURITY;

-- Limpar coleções de teste anteriores (se existirem)
DELETE FROM collection_characters WHERE collection_id IN (
  SELECT id FROM collections WHERE slug IN ('batman-6', 'star-wars-12', 'marvel-heroes-12')
);
DELETE FROM collections WHERE slug IN ('batman-6', 'star-wars-12', 'marvel-heroes-12');

-- Inserir Coleção 1: Batman - 6 Personagens
INSERT INTO collections (id, name, slug, description, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Batman - 6 Personagens',
  'batman-6',
  'Coleção teste com 6 personagens do universo Batman',
  true
);

INSERT INTO collection_characters (collection_id, name, description, release_order, status) VALUES
('11111111-1111-1111-1111-111111111111', 'Batman', 'O Cavaleiro das Trevas', 1, 'released'),
('11111111-1111-1111-1111-111111111111', 'Robin', 'O Menino Prodígio', 2, 'released'),
('11111111-1111-1111-1111-111111111111', 'Batgirl', 'A Heroína de Gotham', 3, 'revealed'),
('11111111-1111-1111-1111-111111111111', 'Coringa', 'O Palhaço do Crime', 4, 'upcoming'),
('11111111-1111-1111-1111-111111111111', 'Mulher-Gato', 'A Ladra de Gotham', 5, 'upcoming'),
('11111111-1111-1111-1111-111111111111', 'Pinguim', 'O Cavalheiro do Crime', 6, 'upcoming');

-- Inserir Coleção 2: Star Wars - 12 Personagens
INSERT INTO collections (id, name, slug, description, is_active)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Star Wars - 12 Personagens',
  'star-wars-12',
  'Coleção teste com 12 personagens do universo Star Wars',
  true
);

INSERT INTO collection_characters (collection_id, name, description, release_order, status) VALUES
('22222222-2222-2222-2222-222222222222', 'Luke Skywalker', 'O último Jedi', 1, 'released'),
('22222222-2222-2222-2222-222222222222', 'Leia Organa', 'Princesa de Alderaan', 2, 'released'),
('22222222-2222-2222-2222-222222222222', 'Han Solo', 'O contrabandista', 3, 'released'),
('22222222-2222-2222-2222-222222222222', 'Darth Vader', 'O Lorde Sith', 4, 'revealed'),
('22222222-2222-2222-2222-222222222222', 'Yoda', 'Mestre Jedi', 5, 'upcoming'),
('22222222-2222-2222-2222-222222222222', 'Obi-Wan Kenobi', 'Mestre Jedi', 6, 'upcoming'),
('22222222-2222-2222-2222-222222222222', 'Chewbacca', 'O Wookiee', 7, 'upcoming'),
('22222222-2222-2222-2222-222222222222', 'R2-D2', 'Droide astromecânico', 8, 'upcoming'),
('22222222-2222-2222-2222-222222222222', 'C-3PO', 'Droide de protocolo', 9, 'upcoming'),
('22222222-2222-2222-2222-222222222222', 'Boba Fett', 'Caçador de recompensas', 10, 'upcoming'),
('22222222-2222-2222-2222-222222222222', 'Stormtrooper', 'Soldado Imperial', 11, 'upcoming'),
('22222222-2222-2222-2222-222222222222', 'Imperador Palpatine', 'Lorde Sith', 12, 'upcoming');

-- Inserir Coleção 3: Marvel Heroes - 12 Personagens
INSERT INTO collections (id, name, slug, description, is_active)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Marvel Heroes - 12 Personagens',
  'marvel-heroes-12',
  'Coleção teste com 12 personagens da Marvel',
  true
);

INSERT INTO collection_characters (collection_id, name, description, release_order, status) VALUES
('33333333-3333-3333-3333-333333333333', 'Homem de Ferro', 'Tony Stark', 1, 'released'),
('33333333-3333-3333-3333-333333333333', 'Capitão América', 'Steve Rogers', 2, 'released'),
('33333333-3333-3333-3333-333333333333', 'Thor', 'Deus do Trovão', 3, 'revealed'),
('33333333-3333-3333-3333-333333333333', 'Hulk', 'Bruce Banner', 4, 'upcoming'),
('33333333-3333-3333-3333-333333333333', 'Viúva Negra', 'Natasha Romanoff', 5, 'upcoming'),
('33333333-3333-3333-3333-333333333333', 'Gavião Arqueiro', 'Clint Barton', 6, 'upcoming'),
('33333333-3333-3333-3333-333333333333', 'Homem-Aranha', 'Peter Parker', 7, 'upcoming'),
('33333333-3333-3333-3333-333333333333', 'Pantera Negra', 'T''Challa', 8, 'upcoming'),
('33333333-3333-3333-3333-333333333333', 'Doutor Estranho', 'Stephen Strange', 9, 'upcoming'),
('33333333-3333-3333-3333-333333333333', 'Feiticeira Escarlate', 'Wanda Maximoff', 10, 'upcoming'),
('33333333-3333-3333-3333-333333333333', 'Visão', 'Androide sintético', 11, 'upcoming'),
('33333333-3333-3333-3333-333333333333', 'Falcão', 'Sam Wilson', 12, 'upcoming');

-- Reabilitar RLS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_characters ENABLE ROW LEVEL SECURITY;

-- Verificar resultado
SELECT 
  c.name as collection_name,
  c.slug,
  COUNT(cc.id) as total_characters
FROM collections c
LEFT JOIN collection_characters cc ON c.id = cc.collection_id
WHERE c.slug IN ('batman-6', 'star-wars-12', 'marvel-heroes-12')
GROUP BY c.id, c.name, c.slug
ORDER BY c.slug;
