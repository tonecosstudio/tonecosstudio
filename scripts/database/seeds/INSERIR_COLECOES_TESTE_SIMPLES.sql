-- 🧪 INSERIR COLEÇÕES DE TESTE (versão simplificada)
-- Execute no Supabase SQL Editor

-- Batman (6 personagens)
INSERT INTO collections (name, slug, description, is_active, display_order)
VALUES (
  'Batman - Cavaleiro das Trevas',
  'batman-6',
  'Coleção com 6 personagens do universo Batman.',
  true,
  10
);

-- Star Wars (12 personagens)
INSERT INTO collections (name, slug, description, is_active, display_order)
VALUES (
  'Star Wars - Saga Completa',
  'star-wars-12',
  'Coleção com 12 personagens de Star Wars.',
  true,
  11
);

-- Marvel Heroes (12 personagens)
INSERT INTO collections (name, slug, description, is_active, display_order)
VALUES (
  'Marvel Heroes - Vingadores',
  'marvel-heroes-12',
  'Coleção com 12 heróis da Marvel.',
  true,
  12
);

-- Verificar
SELECT 'Coleções criadas:' as status;
SELECT name, slug FROM collections WHERE slug IN ('batman-6', 'star-wars-12', 'marvel-heroes-12');