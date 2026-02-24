-- Verificar quantos modelos existem
SELECT COUNT(*) as total_modelos FROM models;

-- Verificar quantos modelos têm franquia preenchida
SELECT COUNT(*) as modelos_com_franquia FROM models WHERE franchise IS NOT NULL AND franchise != '';

-- Ver exemplos de franquias nos modelos
SELECT DISTINCT franchise FROM models WHERE franchise IS NOT NULL AND franchise != '' LIMIT 20;

-- Verificar quantas franquias canônicas existem
SELECT COUNT(*) as total_franchises FROM franchises;

-- Ver todas as franquias canônicas
SELECT canonical, aliases FROM franchises ORDER BY canonical;

-- Verificar quantas regras existem
SELECT COUNT(*) as total_regras FROM franchise_rules;

-- Ver todas as regras
SELECT pattern, franchise_canonical, enabled, priority FROM franchise_rules ORDER BY priority DESC, created_at DESC;

-- Ver modelos com suas franquias (primeiros 10)
SELECT id, name, franchise, category FROM models WHERE franchise IS NOT NULL LIMIT 10;
