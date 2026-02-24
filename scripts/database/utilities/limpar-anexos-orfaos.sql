-- ATENÇÃO: Este script deleta TODOS os anexos antigos
-- Use apenas se você quiser começar do zero com anexos

-- Deletar todos os anexos (metadata)
DELETE FROM support_attachments;

-- Verificar se foi deletado
SELECT COUNT(*) as anexos_restantes FROM support_attachments;
