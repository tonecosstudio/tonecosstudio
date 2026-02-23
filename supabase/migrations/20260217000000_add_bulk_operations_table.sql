-- =====================================================
-- ADD BULK OPERATIONS TABLE
-- =====================================================
-- Criado em: 17 de Fevereiro de 2026
-- Descrição: Tabela para rastrear operações em lote assíncronas
-- Requisitos: 12.13-12.15 (processamento assíncrono para seleções grandes)
-- =====================================================

-- =====================================================
-- 1. BULK_OPERATIONS - Rastreamento de operações em lote
-- =====================================================

CREATE TABLE IF NOT EXISTS bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo de operação
  operation_type TEXT NOT NULL CHECK (operation_type IN ('approve', 'export', 'message')),
  
  -- Parâmetros da operação
  payment_ids JSONB NOT NULL, -- Array de IDs de pagamento
  admin_id UUID REFERENCES auth.users(id),
  message TEXT, -- Para operações de mensagem
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Resultados
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  errors JSONB, -- Array de erros
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Para exportação
  export_file_path TEXT, -- Caminho do arquivo CSV no storage
  export_file_url TEXT -- URL assinada para download
);

-- Índices para performance
CREATE INDEX idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX idx_bulk_operations_admin ON bulk_operations(admin_id);
CREATE INDEX idx_bulk_operations_created ON bulk_operations(created_at DESC);
CREATE INDEX idx_bulk_operations_type ON bulk_operations(operation_type);

-- Trigger para updated_at
CREATE TRIGGER update_bulk_operations_updated_at
  BEFORE UPDATE ON bulk_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. RLS POLICIES
-- =====================================================

ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;

-- Admins podem ver suas próprias operações
CREATE POLICY "Admins veem suas próprias operações em lote"
  ON bulk_operations FOR SELECT
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins podem criar operações em lote"
  ON bulk_operations FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins podem atualizar suas próprias operações em lote"
  ON bulk_operations FOR UPDATE
  USING (auth.uid() = admin_id);

-- Sistema pode atualizar qualquer operação (para processamento assíncrono)
CREATE POLICY "Sistema pode atualizar operações em lote"
  ON bulk_operations FOR UPDATE
  USING (true);

-- =====================================================
-- 3. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE bulk_operations IS 'Rastreamento de operações em lote assíncronas';
COMMENT ON COLUMN bulk_operations.operation_type IS 'approve: aprovação em lote | export: exportação em lote | message: mensagem em lote';
COMMENT ON COLUMN bulk_operations.status IS 'pending: aguardando processamento | processing: em processamento | completed: concluído | failed: falhou';
COMMENT ON COLUMN bulk_operations.payment_ids IS 'Array de IDs de pagamento em formato JSON';
COMMENT ON COLUMN bulk_operations.errors IS 'Array de erros em formato JSON: [{payment_id: string, error: string}]';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================