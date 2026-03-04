-- Tabela para histÃƒÆ’Ã‚Â³rico de trocas de coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
CREATE TABLE IF NOT EXISTS subscription_collection_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  old_collection_id UUID NOT NULL REFERENCES collections(id),
  new_collection_id UUID NOT NULL REFERENCES collections(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ÃƒÆ’Ã‚Ândices
CREATE INDEX IF NOT EXISTS idx_collection_changes_subscription ON subscription_collection_changes(subscription_id);
CREATE INDEX IF NOT EXISTS idx_collection_changes_date ON subscription_collection_changes(changed_at DESC);

-- RLS
ALTER TABLE subscription_collection_changes ENABLE ROW LEVEL SECURITY;

-- PolÃƒÆ’Ã‚Â­ticas RLS
CREATE POLICY "Users can view their own collection changes"
  ON subscription_collection_changes
  FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own collection changes"
  ON subscription_collection_changes
  FOR INSERT
  WITH CHECK (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all collection changes"
  ON subscription_collection_changes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ComentÃƒÆ’Ã‚Â¡rios
COMMENT ON TABLE subscription_collection_changes IS 'HistÃƒÆ’Ã‚Â³rico de trocas de coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o nas assinaturas';
COMMENT ON COLUMN subscription_collection_changes.subscription_id IS 'ID da assinatura';
COMMENT ON COLUMN subscription_collection_changes.old_collection_id IS 'ColeÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o anterior';
COMMENT ON COLUMN subscription_collection_changes.new_collection_id IS 'Nova coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o escolhida';
COMMENT ON COLUMN subscription_collection_changes.changed_at IS 'Data/hora da troca';
