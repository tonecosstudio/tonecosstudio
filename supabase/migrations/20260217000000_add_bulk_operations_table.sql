-- =====================================================
-- ADD BULK OPERATIONS TABLE
-- =====================================================
-- Criado em: 17 de Fevereiro de 2026
-- DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: Tabela para rastrear operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes em lote assÃƒÆ’Ã‚Â­ncronas
-- Requisitos: 12.13-12.15 (processamento assÃƒÆ’Ã‚Â­ncrono para seleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes grandes)
-- =====================================================

-- =====================================================
-- 1. BULK_OPERATIONS - Rastreamento de operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes em lote
-- =====================================================

CREATE TABLE IF NOT EXISTS bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo de operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  operation_type TEXT NOT NULL CHECK (operation_type IN ('approve', 'export', 'message')),
  
  -- ParÃƒÆ’Ã‚Â¢metros da operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  payment_ids JSONB NOT NULL, -- Array de IDs de pagamento
  admin_id UUID REFERENCES auth.users(id),
  message TEXT, -- Para operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de mensagem
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
  
  -- Para exportaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  export_file_path TEXT, -- Caminho do arquivo CSV no storage
  export_file_url TEXT -- URL assinada para download
);

-- ÃƒÆ’Ã‚Ândices para performance
CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_admin ON bulk_operations(admin_id);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_created ON bulk_operations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_type ON bulk_operations(operation_type);

-- Trigger para updated_at
CREATE TRIGGER update_bulk_operations_updated_at
  BEFORE UPDATE ON bulk_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. RLS POLICIES
-- =====================================================

ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;

-- Admins podem ver suas prÃƒÆ’Ã‚Â³prias operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes
CREATE POLICY "Admins veem suas prÃƒÆ’Ã‚Â³prias operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes em lote"
  ON bulk_operations FOR SELECT
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins podem criar operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes em lote"
  ON bulk_operations FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins podem atualizar suas prÃƒÆ’Ã‚Â³prias operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes em lote"
  ON bulk_operations FOR UPDATE
  USING (auth.uid() = admin_id);

-- Sistema pode atualizar qualquer operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (para processamento assÃƒÆ’Ã‚Â­ncrono)
CREATE POLICY "Sistema pode atualizar operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes em lote"
  ON bulk_operations FOR UPDATE
  USING (true);

-- =====================================================
-- 3. COMENTÃƒÆ’Ã‚ÂRIOS
-- =====================================================

COMMENT ON TABLE bulk_operations IS 'Rastreamento de operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes em lote assÃƒÆ’Ã‚Â­ncronas';
COMMENT ON COLUMN bulk_operations.operation_type IS 'approve: aprovaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em lote | export: exportaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em lote | message: mensagem em lote';
COMMENT ON COLUMN bulk_operations.status IS 'pending: aguardando processamento | processing: em processamento | completed: concluÃƒÆ’Ã‚Â­do | failed: falhou';
COMMENT ON COLUMN bulk_operations.payment_ids IS 'Array de IDs de pagamento em formato JSON';
COMMENT ON COLUMN bulk_operations.errors IS 'Array de erros em formato JSON: [{payment_id: string, error: string}]';

-- =====================================================
-- FIM DA MIGRAÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O
-- =====================================================