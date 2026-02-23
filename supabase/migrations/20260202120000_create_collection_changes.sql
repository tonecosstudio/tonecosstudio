-- Tabela para histórico de trocas de coleção
CREATE TABLE IF NOT EXISTS subscription_collection_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  old_collection_id UUID NOT NULL REFERENCES collections(id),
  new_collection_id UUID NOT NULL REFERENCES collections(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_collection_changes_subscription ON subscription_collection_changes(subscription_id);
CREATE INDEX idx_collection_changes_date ON subscription_collection_changes(changed_at DESC);

-- RLS
ALTER TABLE subscription_collection_changes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
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

-- Comentários
COMMENT ON TABLE subscription_collection_changes IS 'Histórico de trocas de coleção nas assinaturas';
COMMENT ON COLUMN subscription_collection_changes.subscription_id IS 'ID da assinatura';
COMMENT ON COLUMN subscription_collection_changes.old_collection_id IS 'Coleção anterior';
COMMENT ON COLUMN subscription_collection_changes.new_collection_id IS 'Nova coleção escolhida';
COMMENT ON COLUMN subscription_collection_changes.changed_at IS 'Data/hora da troca';
