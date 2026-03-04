-- Tabela de templates de mensagens
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  message TEXT NOT NULL CHECK (char_length(message) >= 1 AND char_length(message) <= 5000),
  
  -- Campos ricos (opcionais)
  action_button_text VARCHAR(100),
  action_button_url TEXT,
  link_text VARCHAR(100),
  link_url TEXT,
  
  -- Categoria para organizaÃƒÂ§ÃƒÂ£o
  category VARCHAR(50) DEFAULT 'geral',
  
  -- VariÃƒÂ¡veis dinÃƒÂ¢micas suportadas
  has_variables BOOLEAN DEFAULT false,
  
  -- Metadados
  created_by UUID REFERENCES auth.users(id),  -- REMOVIDO NOT NULL
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- ÃƒÂndices
CREATE INDEX IF NOT EXISTS idx_message_templates_created_by ON message_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_deleted_at ON message_templates(deleted_at);

-- RLS Policies
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Admin pode fazer tudo
DROP POLICY IF EXISTS "Admin full access to templates" ON message_templates;
CREATE POLICY "Admin full access to templates"
  ON message_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir templates de exemplo
DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Buscar primeiro admin
  SELECT id INTO admin_id
  FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'admin'
  LIMIT 1;
  
  -- Se nÃƒÂ£o houver admin, usar primeiro usuÃƒÂ¡rio
  IF admin_id IS NULL THEN
    SELECT id INTO admin_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  -- Inserir templates
  INSERT INTO message_templates (name, description, message, category, created_by, has_variables)
  VALUES
    (
      'Boas-vindas',
      'Mensagem de boas-vindas para novos membros',
      'OlÃƒÂ¡! Ã°Å¸â€˜â€¹ Seja bem-vindo(a) ao nosso grupo! Estamos felizes em ter vocÃƒÂª aqui.',
      'boas-vindas',
      admin_id,
      false
    ),
    (
      'LanÃƒÂ§amento de Produto',
      'AnÃƒÂºncio de novo produto ou coleÃƒÂ§ÃƒÂ£o',
      'Ã°Å¸Å½â€° Novidade! Acabamos de lanÃƒÂ§ar um novo produto. Confira agora!',
      'marketing',
      admin_id,
      false
    ),
    (
      'Lembrete de Pagamento',
      'Lembrete para assinantes sobre renovaÃƒÂ§ÃƒÂ£o',
      'Ã°Å¸â€™Â³ Lembrete: Sua assinatura vence em breve. Mantenha seu acesso ativo!',
      'financeiro',
      admin_id,
      false
    )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Templates criados com sucesso usando admin_id: %', admin_id;
END $$;

COMMENT ON TABLE message_templates IS 'Templates reutilizÃƒÂ¡veis para mensagens de broadcast';
