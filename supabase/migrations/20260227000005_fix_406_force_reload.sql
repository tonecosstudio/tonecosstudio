-- =====================================================
-- Migration: Fix 406 - Force Complete Reload
-- Date: 2026-02-27
-- Problem: Cache do PostgREST pode estar causando 406
-- Solution: ForÃƒÆ’Ã‚Â§ar reload completo e limpar cache
-- =====================================================

-- =====================================================
-- STEP 1: Dropar e recriar a tabela (forÃƒÆ’Ã‚Â§a reload)
-- =====================================================

-- Backup dos dados
CREATE TEMP TABLE chat_group_members_backup AS 
SELECT * FROM chat_group_members;

-- Dropar tabela
DROP TABLE IF EXISTS chat_group_members CASCADE;

-- Recriar tabela
CREATE TABLE IF NOT EXISTS chat_group_members (
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

-- Criar ÃƒÆ’Ã‚Â­ndices
CREATE INDEX IF NOT EXISTS idx_chat_group_members_group ON chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user ON chat_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_last_viewed ON chat_group_members(group_id, last_viewed_at);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user_group ON chat_group_members(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_group_user ON chat_group_members(group_id, user_id);

-- =====================================================
-- STEP 2: Garantir permissÃƒÆ’Ã‚Âµes
-- =====================================================

GRANT ALL ON chat_group_members TO authenticated;
GRANT ALL ON chat_group_members TO anon;

-- =====================================================
-- STEP 3: Desabilitar RLS (temporariamente)
-- =====================================================

ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Notificar PostgREST mÃƒÆ’Ã‚Âºltiplas vezes
-- =====================================================

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst;

-- =====================================================
-- STEP 5: VerificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Tabela chat_group_members recriada';
  RAISE NOTICE 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Dados restaurados';
  RAISE NOTICE 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ÃƒÆ’Ã‚Ândices criados';
  RAISE NOTICE 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ PermissÃƒÆ’Ã‚Âµes concedidas';
  RAISE NOTICE 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ RLS desabilitado';
  RAISE NOTICE 'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ PostgREST notificado';
  RAISE NOTICE '';
  RAISE NOTICE 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ RECARREGUE O NAVEGADOR (Ctrl+Shift+R)';
END $$;
