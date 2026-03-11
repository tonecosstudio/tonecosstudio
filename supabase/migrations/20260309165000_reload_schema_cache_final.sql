-- =====================================================
-- Migration: Reload Schema Cache Final
-- Description: Força reload completo do schema cache do PostgREST
-- =====================================================

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Comentário
COMMENT ON TABLE support_conversations IS 'Conversas de suporte entre usuários e admins - CACHE RELOADED';
