-- Verificar anexos que podem estar órfãos
-- (metadata no banco mas arquivo não existe no Storage)

SELECT 
  a.id,
  a.message_id,
  a.file_name,
  a.file_path,
  a.file_type,
  a.created_at,
  m.conversation_id
FROM support_attachments a
JOIN support_messages m ON m.id = a.message_id
ORDER BY a.created_at DESC
LIMIT 20;

-- Contar total de anexos
SELECT COUNT(*) as total_anexos FROM support_attachments;
