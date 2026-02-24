-- Verificar se todas as tabelas foram criadas
SELECT 'Tabelas criadas:' as status;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'public_collection', 
  'user_badges', 
  'collector_badges', 
  'collections', 
  'collection_items'
)
ORDER BY table_name;

-- Verificar colunas adicionadas ao profiles
SELECT 'Colunas do profiles:' as status;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN (
  'username',
  'display_name', 
  'bio',
  'avatar_url',
  'is_public',
  'collector_level', 
  'collector_xp', 
  'pieces_owned', 
  'total_spent'
)
ORDER BY column_name;

-- Verificar badges criados
SELECT 'Badges disponíveis:' as status;

SELECT name, rarity, requirement_value 
FROM collector_badges 
ORDER BY requirement_value;
