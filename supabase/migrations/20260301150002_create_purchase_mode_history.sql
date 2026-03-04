-- Migration: Criar tabela purchase_mode_history
-- Feature: pricing-system-restructure
-- Requisitos: 3.7, 9.2
-- DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: Cria tabela de auditoria para mudanÃƒÆ’Ã‚Â§as em configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de modalidades

-- Criar tabela de auditoria
CREATE TABLE IF NOT EXISTS purchase_mode_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_key TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  metadata JSONB
);

-- Criar ÃƒÆ’Ã‚Â­ndices para consultas de histÃƒÆ’Ã‚Â³rico
CREATE INDEX IF NOT EXISTS idx_purchase_mode_history_mode ON purchase_mode_history(mode_key, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_mode_history_changed_at ON purchase_mode_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_mode_history_changed_by ON purchase_mode_history(changed_by);

-- Adicionar comentÃƒÆ’Ã‚Â¡rios
COMMENT ON TABLE purchase_mode_history IS 'HistÃƒÆ’Ã‚Â³rico de mudanÃƒÆ’Ã‚Â§as em configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de modalidades de compra';
COMMENT ON COLUMN purchase_mode_history.mode_key IS 'Chave da modalidade que foi alterada';
COMMENT ON COLUMN purchase_mode_history.field_name IS 'Nome do campo que foi alterado';
COMMENT ON COLUMN purchase_mode_history.old_value IS 'Valor anterior do campo';
COMMENT ON COLUMN purchase_mode_history.new_value IS 'Novo valor do campo';
COMMENT ON COLUMN purchase_mode_history.changed_by IS 'ID do usuÃƒÆ’Ã‚Â¡rio que fez a alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o';
COMMENT ON COLUMN purchase_mode_history.metadata IS 'Dados adicionais sobre a mudanÃƒÆ’Ã‚Â§a (JSON)';

-- Habilitar RLS
ALTER TABLE purchase_mode_history ENABLE ROW LEVEL SECURITY;

-- PolÃƒÆ’Ã‚Â­ticas RLS: Admins podem visualizar histÃƒÆ’Ã‚Â³rico
CREATE POLICY "Admins podem visualizar histÃƒÆ’Ã‚Â³rico de modalidades"
  ON purchase_mode_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- PolÃƒÆ’Ã‚Â­ticas RLS: Sistema pode inserir registros de auditoria
CREATE POLICY "Sistema pode inserir registros de auditoria"
  ON purchase_mode_history FOR INSERT
  TO authenticated
  WITH CHECK (true);
