-- Migration: Criar tabela purchase_mode_history
-- Feature: pricing-system-restructure
-- Requisitos: 3.7, 9.2
-- Descrição: Cria tabela de auditoria para mudanças em configurações de modalidades

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

-- Criar índices para consultas de histórico
CREATE INDEX idx_purchase_mode_history_mode ON purchase_mode_history(mode_key, changed_at DESC);
CREATE INDEX idx_purchase_mode_history_changed_at ON purchase_mode_history(changed_at DESC);
CREATE INDEX idx_purchase_mode_history_changed_by ON purchase_mode_history(changed_by);

-- Adicionar comentários
COMMENT ON TABLE purchase_mode_history IS 'Histórico de mudanças em configurações de modalidades de compra';
COMMENT ON COLUMN purchase_mode_history.mode_key IS 'Chave da modalidade que foi alterada';
COMMENT ON COLUMN purchase_mode_history.field_name IS 'Nome do campo que foi alterado';
COMMENT ON COLUMN purchase_mode_history.old_value IS 'Valor anterior do campo';
COMMENT ON COLUMN purchase_mode_history.new_value IS 'Novo valor do campo';
COMMENT ON COLUMN purchase_mode_history.changed_by IS 'ID do usuário que fez a alteração';
COMMENT ON COLUMN purchase_mode_history.metadata IS 'Dados adicionais sobre a mudança (JSON)';

-- Habilitar RLS
ALTER TABLE purchase_mode_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Admins podem visualizar histórico
CREATE POLICY "Admins podem visualizar histórico de modalidades"
  ON purchase_mode_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Políticas RLS: Sistema pode inserir registros de auditoria
CREATE POLICY "Sistema pode inserir registros de auditoria"
  ON purchase_mode_history FOR INSERT
  TO authenticated
  WITH CHECK (true);
