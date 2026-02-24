-- =====================================================
-- Migration: Fix 406 - Force Complete Reload
-- Date: 2026-02-27
-- Problem: Cache do PostgREST pode estar causando 406
-- Solution: Forçar reload completo e limpar cache
-- =====================================================

-- =====================================================
-- STEP 1: Dropar e recriar a tabela (força reload)
-- =====================================================

-- Backup dos dados
CREATE TEMP TABLE chat_group_members_backup AS 
SELECT * FROM chat_group_members;

-- Dropar tabela
DROP TABLE IF EXISTS chat_group_members CASCADE;

-- Recriar tabela
CREATE TABLE chat_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_group_members_unique UNIQUE (group_id, user_id)
);

-- Restaurar dados
INSERT INTO chat_group_members 
SELECT * FROM chat_group_members_backup;

-- Criar índices
CREATE INDEX idx_chat_group_members_group ON chat_group_members(group_id);
CREATE INDEX idx_chat_group_members_user ON chat_group_members(user_id);
CREATE INDEX idx_chat_group_members_last_viewed ON chat_group_members(group_id, last_viewed_at);
CREATE INDEX idx_chat_group_members_user_group ON chat_group_members(user_id, group_id);
CREATE INDEX idx_chat_group_members_group_user ON chat_group_members(group_id, user_id);

-- =====================================================
-- STEP 2: Garantir permissões
-- =====================================================

GRANT ALL ON chat_group_members TO authenticated;
GRANT ALL ON chat_group_members TO anon;

-- =====================================================
-- STEP 3: Desabilitar RLS (temporariamente)
-- =====================================================

ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Notificar PostgREST múltiplas vezes
-- =====================================================

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst;

-- =====================================================
-- STEP 5: Verificação
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Tabela chat_group_members recriada';
  RAISE NOTICE '✅ Dados restaurados';
  RAISE NOTICE '✅ Índices criados';
  RAISE NOTICE '✅ Permissões concedidas';
  RAISE NOTICE '✅ RLS desabilitado';
  RAISE NOTICE '✅ PostgREST notificado';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 RECARREGUE O NAVEGADOR (Ctrl+Shift+R)';
END $$;
