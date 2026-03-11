-- =====================================================
-- Migration: Create Helper Functions
-- Description: Funções auxiliares para o sistema
-- =====================================================

-- =====================================================
-- GET_CURRENT_PRODUCTION_LIMIT
-- Retorna o limite de produção atual do sistema
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_current_production_limit()
RETURNS INTEGER AS $$
  SELECT COALESCE(
    (SELECT value::INTEGER FROM system_settings WHERE key = 'monthly_production_limit'),
    100
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- GET_SYSTEM_SETTINGS
-- Retorna todas as configurações do sistema como JSON
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS TABLE(key TEXT, value TEXT) AS $$
  SELECT key, value FROM system_settings;
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION public.get_current_production_limit IS 'Retorna o limite de produção mensal configurado no sistema';
COMMENT ON FUNCTION public.get_system_settings IS 'Retorna todas as configurações do sistema';
