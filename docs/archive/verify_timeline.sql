-- Verificar tabelas criadas
SELECT 'Tables created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'quote_production%' 
ORDER BY table_name;

-- Verificar bucket de storage
SELECT 'Storage bucket:' as status;
SELECT id, name, public FROM storage.buckets WHERE id = 'production';
