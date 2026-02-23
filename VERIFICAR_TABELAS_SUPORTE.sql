-- Execute este SQL no Supabase Dashboard para verificar se as tabelas existem

-- Verificar se as tabelas de suporte existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'support_%'
ORDER BY table_name;

-- Se retornar vazio, você precisa aplicar a migration!
-- Veja o arquivo: APLICAR_SUPORTE_AGORA.md
