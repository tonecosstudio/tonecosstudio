-- =====================================================
-- Migration: Create Wishlist Table
-- Description: Cria tabela de lista de desejos para modelos 3D
-- =====================================================

-- =====================================================
-- CRIAR TABELA WISHLIST
-- =====================================================

CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 5),
  notify_when_available BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Garantir que um usuário não adicione o mesmo modelo duas vezes
  UNIQUE(user_id, model_id)
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_model_id ON wishlist(model_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_priority ON wishlist(priority DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_added_at ON wishlist(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_notify ON wishlist(notify_when_available) WHERE notify_when_available = true;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Usuários veem apenas seus próprios itens
CREATE POLICY "wishlist_select_own"
  ON wishlist FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem adicionar itens à sua própria wishlist
CREATE POLICY "wishlist_insert_own"
  ON wishlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios itens
CREATE POLICY "wishlist_update_own"
  ON wishlist FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem remover seus próprios itens
CREATE POLICY "wishlist_delete_own"
  ON wishlist FOR DELETE
  USING (auth.uid() = user_id);

-- Admins podem ver todas as wishlists
CREATE POLICY "wishlist_select_admin"
  ON wishlist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para verificar se modelo está na wishlist do usuário
CREATE OR REPLACE FUNCTION is_in_wishlist(model_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM wishlist
    WHERE model_id = model_uuid
      AND user_id = user_uuid
  );
$$;

-- Função para contar itens na wishlist do usuário
CREATE OR REPLACE FUNCTION get_wishlist_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM wishlist
  WHERE user_id = user_uuid;
$$;

-- Função para obter modelos mais desejados
CREATE OR REPLACE FUNCTION get_most_wished_models(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  model_id UUID,
  model_name TEXT,
  wish_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    w.model_id,
    m.name as model_name,
    COUNT(*) as wish_count
  FROM wishlist w
  JOIN models m ON w.model_id = m.id
  GROUP BY w.model_id, m.name
  ORDER BY wish_count DESC
  LIMIT limit_count;
$$;

-- =====================================================
-- TRIGGER PARA NOTIFICAÇÕES
-- =====================================================

-- Função para notificar quando modelo se torna disponível
CREATE OR REPLACE FUNCTION notify_wishlist_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se o modelo se tornou ativo
  IF NEW.is_active = true AND OLD.is_active = false THEN
    -- Criar notificações para usuários que pediram para ser notificados
    INSERT INTO user_notifications (user_id, title, message, type, related_id, related_type)
    SELECT 
      w.user_id,
      'Modelo Disponível!',
      'O modelo "' || NEW.name || '" da sua wishlist está agora disponível!',
      'info',
      NEW.id,
      'model'
    FROM wishlist w
    WHERE w.model_id = NEW.id
      AND w.notify_when_available = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para notificar quando modelo se torna disponível
CREATE TRIGGER notify_wishlist_on_model_available
  AFTER UPDATE ON models
  FOR EACH ROW
  WHEN (NEW.is_active IS DISTINCT FROM OLD.is_active)
  EXECUTE FUNCTION notify_wishlist_availability();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE wishlist IS 'Lista de desejos de modelos 3D dos usuários';
COMMENT ON COLUMN wishlist.user_id IS 'ID do usuário dono da wishlist';
COMMENT ON COLUMN wishlist.model_id IS 'ID do modelo desejado';
COMMENT ON COLUMN wishlist.notes IS 'Notas pessoais sobre o modelo';
COMMENT ON COLUMN wishlist.priority IS 'Prioridade (0-5, sendo 5 a mais alta)';
COMMENT ON COLUMN wishlist.notify_when_available IS 'Se deve notificar quando modelo ficar disponível';
COMMENT ON COLUMN wishlist.added_at IS 'Data em que foi adicionado à wishlist';

COMMENT ON FUNCTION is_in_wishlist IS 'Verifica se um modelo está na wishlist de um usuário';
COMMENT ON FUNCTION get_wishlist_count IS 'Retorna o número de itens na wishlist de um usuário';
COMMENT ON FUNCTION get_most_wished_models IS 'Retorna os modelos mais desejados';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
