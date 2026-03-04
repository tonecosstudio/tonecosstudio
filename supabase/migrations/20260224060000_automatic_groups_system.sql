-- Migration: Automatic Groups System (SSOT)
-- Feature: chat-groups-system
-- Cria grupos automaticamente e sincroniza membros baseado em eventos

-- =====================================================
-- 1. CRIAR GRUPOS PADRÃƒÆ’O DO SISTEMA
-- =====================================================

-- FunÃƒÂ§ÃƒÂ£o para criar grupos padrÃƒÂ£o se nÃƒÂ£o existirem
CREATE OR REPLACE FUNCTION create_default_groups()
RETURNS void AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Pegar o primeiro admin do sistema
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'admin'
  LIMIT 1;

  -- Se nÃƒÂ£o houver admin, usar o primeiro usuÃƒÂ¡rio
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Se ainda nÃƒÂ£o houver usuÃƒÂ¡rio, nÃƒÂ£o criar grupos (serÃƒÂ¡ criado quando houver usuÃƒÂ¡rios)
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuÃƒÂ¡rio encontrado. Grupos serÃƒÂ£o criados quando houver usuÃƒÂ¡rios.';
    RETURN;
  END IF;

  -- Grupo: Novos Membros (todos os usuÃƒÂ¡rios cadastrados)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    'Ã°Å¸Å½â€° Novos Membros',
    'manual',
    NULL,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  -- Grupo: Assinantes Geral (todos com assinatura ativa)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    'Ã¢Â­Â Assinantes',
    'assinantes',
    '{"type": "assinantes", "subscriptionStatus": "active"}'::jsonb,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Grupos padrÃƒÂ£o criados com sucesso';
END;
$$ LANGUAGE plpgsql;

-- Executar a funÃƒÂ§ÃƒÂ£o para criar grupos padrÃƒÂ£o
SELECT create_default_groups();

-- =====================================================
-- 2. TRIGGER: Adicionar novo usuÃƒÂ¡rio ao grupo "Novos Membros"
-- =====================================================

CREATE OR REPLACE FUNCTION add_new_user_to_welcome_group()
RETURNS TRIGGER AS $$
DECLARE
  welcome_group_id UUID;
BEGIN
  -- Buscar o grupo "Novos Membros"
  SELECT id INTO welcome_group_id
  FROM chat_groups
  WHERE name = 'Ã°Å¸Å½â€° Novos Membros'
  AND deleted_at IS NULL
  LIMIT 1;

  -- Se o grupo existir, adicionar o usuÃƒÂ¡rio
  IF welcome_group_id IS NOT NULL THEN
    INSERT INTO chat_group_members (group_id, user_id, joined_at)
    VALUES (welcome_group_id, NEW.id, NOW())
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'UsuÃƒÂ¡rio % adicionado ao grupo Novos Membros', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para novos usuÃƒÂ¡rios
DROP TRIGGER IF EXISTS trigger_add_new_user_to_welcome_group ON auth.users;
CREATE TRIGGER trigger_add_new_user_to_welcome_group
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION add_new_user_to_welcome_group();

-- =====================================================
-- 3. TRIGGER: Criar grupo automaticamente para nova coleÃƒÂ§ÃƒÂ£o
-- =====================================================

CREATE OR REPLACE FUNCTION create_group_for_new_collection()
RETURNS TRIGGER AS $$
DECLARE
  admin_user_id UUID;
  group_name TEXT;
BEGIN
  -- Pegar o criador da coleÃƒÂ§ÃƒÂ£o ou primeiro admin
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'admin'
  LIMIT 1;

  -- Se nÃƒÂ£o houver admin, usar o primeiro usuÃƒÂ¡rio
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Se nÃƒÂ£o houver usuÃƒÂ¡rio, nÃƒÂ£o criar grupo
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuÃƒÂ¡rio encontrado. Grupo nÃƒÂ£o serÃƒÂ¡ criado para coleÃƒÂ§ÃƒÂ£o %', NEW.name;
    RETURN NEW;
  END IF;

  -- Nome do grupo baseado no nome da coleÃƒÂ§ÃƒÂ£o
  group_name := 'Ã°Å¸â€œÂ¦ ' || NEW.name;

  -- Criar grupo para a coleÃƒÂ§ÃƒÂ£o
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    group_name,
    'colecao',
    jsonb_build_object(
      'type', 'colecao',
      'collectionId', NEW.id::text
    ),
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Grupo criado para coleÃƒÂ§ÃƒÂ£o: %', NEW.name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para novas coleÃƒÂ§ÃƒÂµes
DROP TRIGGER IF EXISTS trigger_create_group_for_collection ON collections;
CREATE TRIGGER trigger_create_group_for_collection
  AFTER INSERT ON collections
  FOR EACH ROW
  EXECUTE FUNCTION create_group_for_new_collection();

-- =====================================================
-- 4. FUNÃƒâ€¡ÃƒÆ’O: Sincronizar membros de grupos automÃƒÂ¡ticos
-- =====================================================

CREATE OR REPLACE FUNCTION sync_automatic_group_members(p_group_id UUID)
RETURNS void AS $$
DECLARE
  v_group RECORD;
  v_criteria JSONB;
  v_collection_id TEXT;
BEGIN
  -- Buscar informaÃƒÂ§ÃƒÂµes do grupo
  SELECT * INTO v_group
  FROM chat_groups
  WHERE id = p_group_id
  AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE NOTICE 'Grupo nÃƒÂ£o encontrado ou deletado';
    RETURN;
  END IF;

  v_criteria := v_group.membership_criteria;

  -- Sincronizar baseado no tipo de grupo
  CASE v_group.type
    
    -- Grupo de Assinantes Geral
    WHEN 'assinantes' THEN
      -- Adicionar todos os usuÃƒÂ¡rios com assinatura ativa
      INSERT INTO chat_group_members (group_id, user_id, joined_at)
      SELECT DISTINCT p_group_id, s.user_id, NOW()
      FROM subscriptions s
      WHERE s.status = 'active'
      AND s.user_id IS NOT NULL
      ON CONFLICT (group_id, user_id) DO NOTHING;

      -- Remover usuÃƒÂ¡rios sem assinatura ativa
      DELETE FROM chat_group_members
      WHERE group_id = p_group_id
      AND user_id NOT IN (
        SELECT user_id FROM subscriptions WHERE status = 'active'
      );

    -- Grupo de ColeÃƒÂ§ÃƒÂ£o EspecÃƒÂ­fica
    WHEN 'colecao' THEN
      v_collection_id := v_criteria->>'collectionId';
      
      IF v_collection_id IS NOT NULL THEN
        -- Adicionar assinantes da coleÃƒÂ§ÃƒÂ£o
        INSERT INTO chat_group_members (group_id, user_id, joined_at)
        SELECT DISTINCT p_group_id, s.user_id, NOW()
        FROM subscriptions s
        WHERE s.collection_id::text = v_collection_id
        AND s.status = 'active'
        AND s.user_id IS NOT NULL
        ON CONFLICT (group_id, user_id) DO NOTHING;

        -- Remover usuÃƒÂ¡rios que nÃƒÂ£o sÃƒÂ£o mais assinantes
        DELETE FROM chat_group_members
        WHERE group_id = p_group_id
        AND user_id NOT IN (
          SELECT user_id 
          FROM subscriptions 
          WHERE collection_id::text = v_collection_id 
          AND status = 'active'
        );
      END IF;

    ELSE
      RAISE NOTICE 'Tipo de grupo % nÃƒÂ£o requer sincronizaÃƒÂ§ÃƒÂ£o automÃƒÂ¡tica', v_group.type;
  END CASE;

  RAISE NOTICE 'Membros sincronizados para grupo %', v_group.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. TRIGGER: Sincronizar quando assinatura muda
-- =====================================================

CREATE OR REPLACE FUNCTION sync_groups_on_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
  v_group RECORD;
BEGIN
  -- Sincronizar grupo de assinantes geral
  FOR v_group IN 
    SELECT id FROM chat_groups 
    WHERE type = 'assinantes' 
    AND deleted_at IS NULL
  LOOP
    PERFORM sync_automatic_group_members(v_group.id);
  END LOOP;

  -- Se for assinatura de coleÃƒÂ§ÃƒÂ£o especÃƒÂ­fica, sincronizar grupo da coleÃƒÂ§ÃƒÂ£o
  IF NEW.collection_id IS NOT NULL THEN
    FOR v_group IN 
      SELECT id FROM chat_groups 
      WHERE type = 'colecao' 
      AND membership_criteria->>'collectionId' = NEW.collection_id::text
      AND deleted_at IS NULL
    LOOP
      PERFORM sync_automatic_group_members(v_group.id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para mudanÃƒÂ§as em assinaturas
DROP TRIGGER IF EXISTS trigger_sync_groups_on_subscription ON subscriptions;
CREATE TRIGGER trigger_sync_groups_on_subscription
  AFTER INSERT OR UPDATE OF status ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_groups_on_subscription_change();

-- =====================================================
-- 6. JOB: SincronizaÃƒÂ§ÃƒÂ£o periÃƒÂ³dica (executar manualmente ou via cron)
-- =====================================================

CREATE OR REPLACE FUNCTION sync_all_automatic_groups()
RETURNS void AS $$
DECLARE
  v_group RECORD;
BEGIN
  FOR v_group IN 
    SELECT id, name, type 
    FROM chat_groups 
    WHERE type IN ('assinantes', 'colecao')
    AND deleted_at IS NULL
  LOOP
    PERFORM sync_automatic_group_members(v_group.id);
    RAISE NOTICE 'Sincronizado: %', v_group.name;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. POPULAR GRUPOS EXISTENTES COM MEMBROS
-- =====================================================

-- Sincronizar todos os grupos automÃƒÂ¡ticos existentes
SELECT sync_all_automatic_groups();

-- Adicionar todos os usuÃƒÂ¡rios existentes ao grupo "Novos Membros"
DO $$
DECLARE
  welcome_group_id UUID;
BEGIN
  SELECT id INTO welcome_group_id
  FROM chat_groups
  WHERE name = 'Ã°Å¸Å½â€° Novos Membros'
  AND deleted_at IS NULL
  LIMIT 1;

  IF welcome_group_id IS NOT NULL THEN
    INSERT INTO chat_group_members (group_id, user_id, joined_at)
    SELECT welcome_group_id, id, created_at
    FROM auth.users
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'UsuÃƒÂ¡rios existentes adicionados ao grupo Novos Membros';
  END IF;
END $$;

-- =====================================================
-- COMENTÃƒÂRIOS E DOCUMENTAÃƒâ€¡ÃƒÆ’O
-- =====================================================

COMMENT ON FUNCTION create_default_groups() IS 'Cria grupos padrÃƒÂ£o do sistema (Novos Membros, Assinantes)';
COMMENT ON FUNCTION add_new_user_to_welcome_group() IS 'Adiciona automaticamente novos usuÃƒÂ¡rios ao grupo de boas-vindas';
COMMENT ON FUNCTION create_group_for_new_collection() IS 'Cria automaticamente um grupo quando uma nova coleÃƒÂ§ÃƒÂ£o ÃƒÂ© criada';
COMMENT ON FUNCTION sync_automatic_group_members(UUID) IS 'Sincroniza membros de um grupo automÃƒÂ¡tico baseado em seus critÃƒÂ©rios';
COMMENT ON FUNCTION sync_groups_on_subscription_change() IS 'Sincroniza grupos quando uma assinatura ÃƒÂ© criada ou atualizada';
COMMENT ON FUNCTION sync_all_automatic_groups() IS 'Sincroniza todos os grupos automÃƒÂ¡ticos do sistema';
