-- Migration: FunÃƒÂ§ÃƒÂµes AutomÃƒÂ¡ticas para ColeÃƒÂ§ÃƒÂµes
-- Purpose: AtualizaÃƒÂ§ÃƒÂ£o automÃƒÂ¡tica de status e notificaÃƒÂ§ÃƒÂµes
-- Date: 2026-02-03

-- ============================================
-- FUNÃƒâ€¡ÃƒÆ’O 1: Atualizar Status Automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION auto_update_character_status()
RETURNS void AS $$
DECLARE
  char_record RECORD;
BEGIN
  -- Atualizar para 'revealed' se passou da data de revelaÃƒÂ§ÃƒÂ£o
  FOR char_record IN 
    SELECT * FROM collection_characters
    WHERE status = 'upcoming'
    AND reveal_date IS NOT NULL
    AND reveal_date <= CURRENT_DATE
    AND auto_reveal = true
  LOOP
    UPDATE collection_characters
    SET 
      status = 'revealed',
      revealed_at = now(),
      updated_at = now()
    WHERE id = char_record.id;
    
    -- Registrar evento
    INSERT INTO collection_events (collection_id, character_id, event_type, old_status, new_status)
    VALUES (char_record.collection_id, char_record.id, 'reveal', 'upcoming', 'revealed');
    
    -- Criar notificaÃƒÂ§ÃƒÂµes para assinantes (se ainda nÃƒÂ£o enviou)
    IF NOT char_record.reveal_notification_sent THEN
      INSERT INTO collection_notifications (user_id, collection_id, character_id, type, title, message, scheduled_for)
      SELECT 
        s.user_id,
        char_record.collection_id,
        char_record.id,
        'reveal',
        'Novo personagem revelado! Ã°Å¸Å½â€°',
        format('O personagem "%s" da sua coleÃƒÂ§ÃƒÂ£o foi revelado! Confira agora.', char_record.name),
        now()
      FROM subscriptions s
      WHERE s.collection_id = char_record.collection_id
      AND s.status = 'active';
      
      -- Marcar como enviado
      UPDATE collection_characters
      SET reveal_notification_sent = true
      WHERE id = char_record.id;
    END IF;
  END LOOP;
  
  -- Atualizar para 'released' se passou da data de lanÃƒÂ§amento
  FOR char_record IN 
    SELECT * FROM collection_characters
    WHERE status = 'revealed'
    AND release_date IS NOT NULL
    AND release_date <= CURRENT_DATE
    AND auto_release = true
  LOOP
    UPDATE collection_characters
    SET 
      status = 'released',
      released_at = now(),
      updated_at = now()
    WHERE id = char_record.id;
    
    -- Registrar evento
    INSERT INTO collection_events (collection_id, character_id, event_type, old_status, new_status)
    VALUES (char_record.collection_id, char_record.id, 'release', 'revealed', 'released');
    
    -- Criar notificaÃƒÂ§ÃƒÂµes para assinantes (se ainda nÃƒÂ£o enviou)
    IF NOT char_record.release_notification_sent THEN
      INSERT INTO collection_notifications (user_id, collection_id, character_id, type, title, message, scheduled_for)
      SELECT 
        s.user_id,
        char_record.collection_id,
        char_record.id,
        'release',
        'Personagem disponÃƒÂ­vel! Ã°Å¸Å¡â‚¬',
        format('O personagem "%s" estÃƒÂ¡ disponÃƒÂ­vel para entrega! Prepare-se para recebÃƒÂª-lo.', char_record.name),
        now()
      FROM subscriptions s
      WHERE s.collection_id = char_record.collection_id
      AND s.status = 'active';
      
      -- Marcar como enviado
      UPDATE collection_characters
      SET release_notification_sent = true
      WHERE id = char_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÃƒâ€¡ÃƒÆ’O 2: Calcular PrÃƒÂ³ximo LanÃƒÂ§amento
-- ============================================

CREATE OR REPLACE FUNCTION get_next_release(p_collection_id UUID DEFAULT NULL)
RETURNS TABLE (
  character_id UUID,
  character_name TEXT,
  character_image TEXT,
  collection_id UUID,
  collection_name TEXT,
  release_date DATE,
  days_until_release INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.name,
    cc.image_url,
    c.id,
    c.name,
    cc.release_date,
    (cc.release_date - CURRENT_DATE)::INTEGER as days_until_release,
    cc.status
  FROM collection_characters cc
  JOIN collections c ON c.id = cc.collection_id
  WHERE (p_collection_id IS NULL OR cc.collection_id = p_collection_id)
  AND cc.release_date > CURRENT_DATE
  AND c.is_active = true
  ORDER BY cc.release_date ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÃƒâ€¡ÃƒÆ’O 3: Validar ColeÃƒÂ§ÃƒÂ£o
-- ============================================

CREATE OR REPLACE FUNCTION validate_collection(p_collection_id UUID)
RETURNS TABLE (
  issue_type TEXT,
  issue_description TEXT,
  severity TEXT
) AS $$
BEGIN
  -- Verificar se tem personagens
  IF NOT EXISTS (SELECT 1 FROM collection_characters WHERE collection_id = p_collection_id) THEN
    RETURN QUERY SELECT 
      'no_characters'::TEXT, 
      'ColeÃƒÂ§ÃƒÂ£o sem personagens cadastrados'::TEXT, 
      'critical'::TEXT;
  END IF;
  
  -- Verificar personagens sem data de lanÃƒÂ§amento
  RETURN QUERY
  SELECT 
    'missing_release_date'::TEXT,
    format('Personagem "%s" (#%s) sem data de lanÃƒÂ§amento', name, release_order)::TEXT,
    'warning'::TEXT
  FROM collection_characters
  WHERE collection_id = p_collection_id
  AND release_date IS NULL;
  
  -- Verificar personagens sem imagem
  RETURN QUERY
  SELECT 
    'missing_image'::TEXT,
    format('Personagem "%s" (#%s) sem imagem', name, release_order)::TEXT,
    'info'::TEXT
  FROM collection_characters
  WHERE collection_id = p_collection_id
  AND image_url IS NULL
  AND status != 'upcoming';
  
  -- Verificar conflitos de datas
  RETURN QUERY
  SELECT 
    'date_conflict'::TEXT,
    format('Personagens "%s" e "%s" tÃƒÂªm a mesma data de lanÃƒÂ§amento (%s)', c1.name, c2.name, c1.release_date::TEXT)::TEXT,
    'warning'::TEXT
  FROM collection_characters c1
  JOIN collection_characters c2 ON c1.collection_id = c2.collection_id 
    AND c1.release_date = c2.release_date 
    AND c1.id < c2.id
  WHERE c1.collection_id = p_collection_id
  AND c1.release_date IS NOT NULL;
  
  -- Verificar datas no passado para personagens upcoming
  RETURN QUERY
  SELECT 
    'past_date'::TEXT,
    format('Personagem "%s" tem data no passado (%s) mas status ÃƒÂ© "%s"', name, release_date::TEXT, status)::TEXT,
    'warning'::TEXT
  FROM collection_characters
  WHERE collection_id = p_collection_id
  AND release_date < CURRENT_DATE
  AND status = 'upcoming';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÃƒâ€¡ÃƒÆ’O 4: Obter EstatÃƒÂ­sticas da ColeÃƒÂ§ÃƒÂ£o
-- ============================================

CREATE OR REPLACE FUNCTION get_collection_stats(p_collection_id UUID)
RETURNS TABLE (
  total_characters INTEGER,
  upcoming_count INTEGER,
  revealed_count INTEGER,
  released_count INTEGER,
  with_images INTEGER,
  with_dates INTEGER,
  next_release_date DATE,
  next_release_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_characters,
    COUNT(*) FILTER (WHERE status = 'upcoming')::INTEGER as upcoming_count,
    COUNT(*) FILTER (WHERE status = 'revealed')::INTEGER as revealed_count,
    COUNT(*) FILTER (WHERE status = 'released')::INTEGER as released_count,
    COUNT(*) FILTER (WHERE image_url IS NOT NULL)::INTEGER as with_images,
    COUNT(*) FILTER (WHERE release_date IS NOT NULL)::INTEGER as with_dates,
    MIN(release_date) FILTER (WHERE release_date > CURRENT_DATE) as next_release_date,
    (SELECT name FROM collection_characters 
     WHERE collection_id = p_collection_id 
     AND release_date > CURRENT_DATE 
     ORDER BY release_date ASC LIMIT 1) as next_release_name
  FROM collection_characters
  WHERE collection_id = p_collection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÃƒâ€¡ÃƒÆ’O 5: Marcar NotificaÃƒÂ§ÃƒÂ£o como Lida
-- ============================================

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE collection_notifications
  SET 
    read = true,
    read_at = now()
  WHERE id = p_notification_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTÃƒÂRIOS
-- ============================================

COMMENT ON FUNCTION auto_update_character_status() IS 'Atualiza automaticamente o status dos personagens baseado nas datas';
COMMENT ON FUNCTION get_next_release(UUID) IS 'Retorna o prÃƒÂ³ximo personagem a ser lanÃƒÂ§ado';
COMMENT ON FUNCTION validate_collection(UUID) IS 'Valida uma coleÃƒÂ§ÃƒÂ£o e retorna problemas encontrados';
COMMENT ON FUNCTION get_collection_stats(UUID) IS 'Retorna estatÃƒÂ­sticas de uma coleÃƒÂ§ÃƒÂ£o';
COMMENT ON FUNCTION mark_notification_read(UUID) IS 'Marca uma notificaÃƒÂ§ÃƒÂ£o como lida';
