-- Migration: Sistema de ColeÃƒÂ§ÃƒÂµes DinÃƒÂ¢mico
-- Purpose: Adicionar datas, notificaÃƒÂ§ÃƒÂµes e automaÃƒÂ§ÃƒÂ£o
-- Date: 2026-02-03

-- ============================================
-- PARTE 1: Atualizar collection_characters
-- ============================================

-- Adicionar campos de data
ALTER TABLE collection_characters 
ADD COLUMN IF NOT EXISTS release_date DATE,
ADD COLUMN IF NOT EXISTS reveal_date DATE,
ADD COLUMN IF NOT EXISTS auto_reveal BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_release BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS teaser_image_url TEXT,
ADD COLUMN IF NOT EXISTS reveal_notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS release_notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;

-- ÃƒÂndices para performance
CREATE INDEX IF NOT EXISTS idx_characters_release_date ON collection_characters(release_date);
CREATE INDEX IF NOT EXISTS idx_characters_reveal_date ON collection_characters(reveal_date);
CREATE INDEX IF NOT EXISTS idx_characters_status ON collection_characters(status);

-- ============================================
-- PARTE 2: Tabela de NotificaÃƒÂ§ÃƒÂµes
-- ============================================

CREATE TABLE IF NOT EXISTS collection_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  character_id UUID REFERENCES collection_characters(id) ON DELETE CASCADE,
  
  -- Tipo de NotificaÃƒÂ§ÃƒÂ£o
  type TEXT NOT NULL CHECK (type IN ('reveal', 'release', 'countdown', 'reminder')),
  
  -- ConteÃƒÂºdo
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Status
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Agendamento
  scheduled_for TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ÃƒÂndices
CREATE INDEX IF NOT EXISTS idx_notifications_user ON collection_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent ON collection_notifications(sent);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON collection_notifications(scheduled_for);

-- ============================================
-- PARTE 3: Tabela de Eventos
-- ============================================

CREATE TABLE IF NOT EXISTS collection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  character_id UUID REFERENCES collection_characters(id) ON DELETE CASCADE,
  
  -- Tipo de Evento
  event_type TEXT NOT NULL CHECK (event_type IN ('reveal', 'release', 'status_change', 'notification_sent')),
  
  -- Dados do Evento
  old_status TEXT,
  new_status TEXT,
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ÃƒÂndices
CREATE INDEX IF NOT EXISTS idx_events_collection ON collection_events(collection_id);
CREATE INDEX IF NOT EXISTS idx_events_character ON collection_events(character_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON collection_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON collection_events(created_at DESC);

-- ============================================
-- PARTE 4: RLS Policies
-- ============================================

-- NotificaÃƒÂ§ÃƒÂµes: UsuÃƒÂ¡rios veem apenas suas prÃƒÂ³prias
ALTER TABLE collection_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON collection_notifications;
CREATE POLICY "Users can view their own notifications"
  ON collection_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON collection_notifications;
CREATE POLICY "Users can update their own notifications"
  ON collection_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all notifications" ON collection_notifications;
CREATE POLICY "Admins can manage all notifications"
  ON collection_notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Eventos: Admins podem ver todos, usuÃƒÂ¡rios podem ver de suas coleÃƒÂ§ÃƒÂµes
ALTER TABLE collection_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all events" ON collection_events;
CREATE POLICY "Admins can view all events"
  ON collection_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view events of their subscribed collections" ON collection_events;
CREATE POLICY "Users can view events of their subscribed collections"
  ON collection_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE subscriptions.user_id = auth.uid() 
      AND subscriptions.collection_id = collection_events.collection_id
      AND subscriptions.status = 'active'
    )
  );

-- ============================================
-- PARTE 5: ComentÃƒÂ¡rios
-- ============================================

COMMENT ON TABLE collection_notifications IS 'NotificaÃƒÂ§ÃƒÂµes de coleÃƒÂ§ÃƒÂµes para usuÃƒÂ¡rios';
COMMENT ON TABLE collection_events IS 'HistÃƒÂ³rico de eventos das coleÃƒÂ§ÃƒÂµes';
COMMENT ON COLUMN collection_characters.release_date IS 'Data exata de lanÃƒÂ§amento do personagem';
COMMENT ON COLUMN collection_characters.reveal_date IS 'Data de revelaÃƒÂ§ÃƒÂ£o do personagem';
COMMENT ON COLUMN collection_characters.auto_reveal IS 'Revelar automaticamente na data?';
COMMENT ON COLUMN collection_characters.auto_release IS 'LanÃƒÂ§ar automaticamente na data?';
