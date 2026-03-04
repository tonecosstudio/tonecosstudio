-- =====================================================
-- MANUAL PAYMENT SYSTEM - Sistema de Pagamento Manual
-- =====================================================
-- Criado em: 16 de Fevereiro de 2026
-- DescriÃƒÂ§ÃƒÂ£o: Sistema de pagamento manual com verificaÃƒÂ§ÃƒÂ£o de comprovantes
-- Requisitos: 1.1-1.10, 2.5-2.8, 3.1-3.12, 4.1-4.3, 7.14-7.15, 8.1-8.10, 11.1-11.6, 14.9-14.10, 15.8-15.15
-- =====================================================

-- =====================================================
-- 1. ADMIN_PAYMENT_METHODS - MÃƒÂ©todos de Pagamento Configurados pelo Admin
-- =====================================================
-- Nota: Esta tabela ÃƒÂ© diferente da tabela payment_methods existente
-- A tabela existente armazena mÃƒÂ©todos de pagamento dos usuÃƒÂ¡rios (cartÃƒÂµes, PIX pessoal)
-- Esta nova tabela armazena mÃƒÂ©todos de pagamento configurados pelo admin (PIX da empresa, PagSeguro, etc)

CREATE TABLE IF NOT EXISTS admin_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- InformaÃƒÂ§ÃƒÂµes bÃƒÂ¡sicas
  name TEXT NOT NULL, -- Ex: "PIX Ordax", "PagSeguro", "PayPal"
  type TEXT NOT NULL CHECK (type IN ('pix', 'pagseguro', 'picpay', 'paypal', 'bank_transfer', 'other')),
  instructions TEXT NOT NULL, -- InstruÃƒÂ§ÃƒÂµes de pagamento para o cliente
  
  -- Detalhes opcionais
  payment_link TEXT, -- Link para pagamento (ex: link do PagSeguro)
  pix_key TEXT, -- Chave PIX da empresa
  account_details JSONB, -- Detalhes da conta bancÃƒÂ¡ria ou outros dados
  
  -- Controle
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ÃƒÂndices para performance
CREATE INDEX idx_admin_payment_methods_active ON admin_payment_methods(is_active);
CREATE INDEX idx_admin_payment_methods_default ON admin_payment_methods(is_default) WHERE is_default = true;
CREATE INDEX idx_admin_payment_methods_display_order ON admin_payment_methods(display_order);

-- Trigger para updated_at
CREATE TRIGGER update_admin_payment_methods_updated_at
  BEFORE UPDATE ON admin_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. MANUAL_PAYMENTS - Registros de Pagamento Manual
-- =====================================================

CREATE TABLE IF NOT EXISTS manual_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method_id UUID NOT NULL REFERENCES admin_payment_methods(id),
  
  -- VinculaÃƒÂ§ÃƒÂ£o com pedido ou assinatura (XOR constraint)
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- InformaÃƒÂ§ÃƒÂµes do pagamento
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  payment_type TEXT NOT NULL CHECK (payment_type IN ('one_time', 'recurring')),
  
  -- Status do pagamento
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'requires_info', 'approved', 'rejected')),
  rejection_reason TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Constraint: deve ter quote_id OU subscription_id, mas nÃƒÂ£o ambos
  CONSTRAINT payment_link_check CHECK (
    (quote_id IS NOT NULL AND subscription_id IS NULL) OR
    (quote_id IS NULL AND subscription_id IS NOT NULL)
  )
);

-- ÃƒÂndices para performance
CREATE INDEX idx_manual_payments_user ON manual_payments(user_id);
CREATE INDEX idx_manual_payments_status ON manual_payments(status);
CREATE INDEX idx_manual_payments_reference ON manual_payments(reference_number);
CREATE INDEX idx_manual_payments_quote ON manual_payments(quote_id);
CREATE INDEX idx_manual_payments_subscription ON manual_payments(subscription_id);
CREATE INDEX idx_manual_payments_created ON manual_payments(created_at DESC);
CREATE INDEX idx_manual_payments_payment_method ON manual_payments(payment_method_id);

-- Trigger para updated_at
CREATE TRIGGER update_manual_payments_updated_at
  BEFORE UPDATE ON manual_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. PAYMENT_FILES - Arquivos de Comprovante de Pagamento
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES manual_payments(id) ON DELETE CASCADE,
  
  -- InformaÃƒÂ§ÃƒÂµes do arquivo
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Caminho no Supabase Storage
  file_size INTEGER NOT NULL, -- Tamanho em bytes
  file_type TEXT NOT NULL, -- MIME type
  thumbnail_path TEXT, -- Caminho da miniatura (para imagens)
  
  -- Metadados
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ÃƒÂndices para performance
CREATE INDEX idx_payment_files_payment ON payment_files(payment_id);
CREATE INDEX idx_payment_files_uploaded_by ON payment_files(uploaded_by);
CREATE INDEX idx_payment_files_created ON payment_files(created_at DESC);

-- =====================================================
-- 4. PAYMENT_AUDIT_LOG - Log de Auditoria de Pagamentos
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES manual_payments(id) ON DELETE CASCADE,
  
  -- Tipo de aÃƒÂ§ÃƒÂ£o
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'status_changed', 'file_uploaded', 'approved', 'rejected', 'info_requested')),
  
  -- Quem executou a aÃƒÂ§ÃƒÂ£o
  admin_id UUID REFERENCES auth.users(id),
  
  -- Detalhes da mudanÃƒÂ§a
  old_status TEXT,
  new_status TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ÃƒÂndices para performance
CREATE INDEX idx_payment_audit_payment ON payment_audit_log(payment_id, created_at DESC);
CREATE INDEX idx_payment_audit_admin ON payment_audit_log(admin_id);
CREATE INDEX idx_payment_audit_action ON payment_audit_log(action_type);

-- =====================================================
-- 5. MODIFICAÃƒâ€¡ÃƒÆ’O - Adicionar payment_id ÃƒÂ  support_conversations
-- =====================================================

ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES manual_payments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_support_conversations_payment ON support_conversations(payment_id);

-- =====================================================
-- 6. FUNÃƒâ€¡Ãƒâ€¢ES DO BANCO DE DADOS
-- =====================================================

-- FunÃƒÂ§ÃƒÂ£o para gerar nÃƒÂºmero de referÃƒÂªncia ÃƒÂºnico
CREATE OR REPLACE FUNCTION generate_payment_reference()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_reference TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Gera referÃƒÂªncia: PAY-YYYYMMDD-XXXX (XXXX = 4 dÃƒÂ­gitos aleatÃƒÂ³rios)
    v_reference := 'PAY-' || 
                   to_char(now(), 'YYYYMMDD') || '-' || 
                   lpad(floor(random() * 10000)::text, 4, '0');
    
    -- Verifica se jÃƒÂ¡ existe
    SELECT EXISTS(
      SELECT 1 FROM manual_payments WHERE reference_number = v_reference
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_reference;
END;
$$;

-- FunÃƒÂ§ÃƒÂ£o para garantir apenas um mÃƒÂ©todo de pagamento padrÃƒÂ£o
CREATE OR REPLACE FUNCTION ensure_single_default_admin_payment_method()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE admin_payment_methods 
    SET is_default = false 
    WHERE id != NEW.id 
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_ensure_single_default_admin_payment_method
  BEFORE INSERT OR UPDATE ON admin_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_admin_payment_method();

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Trigger para mudanÃƒÂ§a de status de pagamento
CREATE OR REPLACE FUNCTION trigger_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log de mudanÃƒÂ§a de status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO payment_audit_log (
      payment_id,
      action_type,
      old_status,
      new_status,
      admin_id
    ) VALUES (
      NEW.id,
      'status_changed',
      OLD.status,
      NEW.status,
      NEW.approved_by
    );
    
    -- Atualizar status da conversa de suporte
    IF NEW.status = 'requires_info' THEN
      UPDATE support_conversations
      SET status = 'waiting_customer'
      WHERE payment_id = NEW.id;
    ELSIF NEW.status IN ('approved', 'rejected') THEN
      UPDATE support_conversations
      SET status = 'resolved',
          resolved_at = now()
      WHERE payment_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_status_change
  AFTER UPDATE ON manual_payments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_payment_status_change();

-- Trigger para primeiro upload de arquivo
CREATE OR REPLACE FUNCTION trigger_first_file_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_file_count INTEGER;
BEGIN
  -- Conta arquivos para este pagamento
  SELECT COUNT(*) INTO v_file_count
  FROM payment_files
  WHERE payment_id = NEW.payment_id;
  
  -- Se este ÃƒÂ© o primeiro arquivo, atualiza status do pagamento
  IF v_file_count = 1 THEN
    UPDATE manual_payments
    SET status = 'under_review'
    WHERE id = NEW.payment_id
      AND status = 'pending';
  END IF;
  
  -- Log de upload de arquivo
  INSERT INTO payment_audit_log (
    payment_id,
    action_type,
    admin_id
  ) VALUES (
    NEW.payment_id,
    'file_uploaded',
    NEW.uploaded_by
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER first_file_upload
  AFTER INSERT ON payment_files
  FOR EACH ROW
  EXECUTE FUNCTION trigger_first_file_upload();

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

-- Admin Payment Methods: Qualquer um pode ver mÃƒÂ©todos ativos
ALTER TABLE admin_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ver mÃƒÂ©todos de pagamento ativos"
  ON admin_payment_methods FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins podem gerenciar mÃƒÂ©todos de pagamento"
  ON admin_payment_methods FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Manual Payments: UsuÃƒÂ¡rios veem seus prÃƒÂ³prios pagamentos
ALTER TABLE manual_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "UsuÃƒÂ¡rios veem seus prÃƒÂ³prios pagamentos"
  ON manual_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "UsuÃƒÂ¡rios podem criar seus prÃƒÂ³prios pagamentos"
  ON manual_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins veem todos os pagamentos"
  ON manual_payments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar todos os pagamentos"
  ON manual_payments FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Payment Files: UsuÃƒÂ¡rios veem arquivos de seus prÃƒÂ³prios pagamentos
ALTER TABLE payment_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "UsuÃƒÂ¡rios veem arquivos de seus prÃƒÂ³prios pagamentos"
  ON payment_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM manual_payments
      WHERE manual_payments.id = payment_files.payment_id
      AND manual_payments.user_id = auth.uid()
    )
  );

CREATE POLICY "UsuÃƒÂ¡rios podem fazer upload em seus prÃƒÂ³prios pagamentos"
  ON payment_files FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM manual_payments
      WHERE manual_payments.id = payment_files.payment_id
      AND manual_payments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins veem todos os arquivos de pagamento"
  ON payment_files FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Payment Audit Log: Apenas admins podem ver logs de auditoria
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver logs de auditoria"
  ON payment_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sistema pode inserir logs de auditoria"
  ON payment_audit_log FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 9. COMENTÃƒÂRIOS
-- =====================================================

COMMENT ON TABLE admin_payment_methods IS 'MÃƒÂ©todos de pagamento configurados pelo admin (PIX da empresa, PagSeguro, etc)';
COMMENT ON TABLE manual_payments IS 'Registros de pagamentos manuais aguardando verificaÃƒÂ§ÃƒÂ£o';
COMMENT ON TABLE payment_files IS 'Arquivos de comprovante de pagamento enviados pelos clientes';
COMMENT ON TABLE payment_audit_log IS 'Log de auditoria de todas as aÃƒÂ§ÃƒÂµes em pagamentos';

COMMENT ON COLUMN manual_payments.status IS 'pending: aguardando comprovante | under_review: em anÃƒÂ¡lise | requires_info: requer mais informaÃƒÂ§ÃƒÂµes | approved: aprovado | rejected: rejeitado';
COMMENT ON COLUMN manual_payments.payment_type IS 'one_time: pagamento ÃƒÂºnico (quote) | recurring: pagamento recorrente (subscription)';
COMMENT ON COLUMN payment_audit_log.action_type IS 'created: pagamento criado | status_changed: status alterado | file_uploaded: arquivo enviado | approved: aprovado | rejected: rejeitado | info_requested: informaÃƒÂ§ÃƒÂµes solicitadas';

-- =====================================================
-- FIM DA MIGRAÃƒâ€¡ÃƒÆ’O
-- =====================================================