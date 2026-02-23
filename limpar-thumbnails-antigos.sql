-- Limpar thumbnail_path de anexos antigos que não existem mais
-- Isso evita erros 404 no console ao carregar imagens

UPDATE support_attachments
SET thumbnail_path = NULL
WHERE thumbnail_path IS NOT NULL
  AND thumbnail_path LIKE '%thumb_%';

-- Verificar quantos registros foram atualizados
SELECT 
  COUNT(*) as total_anexos,
  COUNT(thumbnail_path) as com_thumbnail,
  COUNT(*) - COUNT(thumbnail_path) as sem_thumbnail
FROM support_attachments;
