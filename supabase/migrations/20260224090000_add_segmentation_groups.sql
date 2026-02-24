-- Migration: Grupos de Segmentação Automática
-- Feature: chat-groups-system
-- Adiciona grupos para segmentação de usuários: Avisos, Expirando, Ex-Assinantes, Free

-- =====================================================
-- 0. ADICIONAR NOVOS TIPOS AO ENUM
-- =====================================================

-- Remover constraint antiga
ALTER TABLE chat_groups DROP CONSTRAINT IF EXISTS chat_groups_type_enum;

-- Adicionar nova constraint com os novos tipos
ALTER TABLE chat_groups 
ADD CONSTRAINT chat_groups_type_enum 
CHECK (type IN ('manual', 'assinantes', 'colecao', 'lancamentos', 'pedidos', 'expirando', 'ex_assinantes', 'free'));

-- =====================================================
-- 1. ATUALIZAR FUNÇÃO create_default_groups
-- =====================================================

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

  -- Se não houver admin, usar o primeiro usuário
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Se ainda não houver usuário, não criar grupos (será criado quando houver usuários)
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuário encontrado. Grupos serão criados quando houver usuários.';
    RETURN;
  END IF;

  -- Grupo: Novos Membros (todos os usuários cadastrados)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    '🎉 Novos Membros',
    'manual',
    NULL,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  -- Grupo: Assinantes Geral (todos com assinatura ativa)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    '⭐ Assinantes',
    'assinantes',
    '{"type": "assinantes", "subscriptionStatus": "active"}'::jsonb,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  -- Grupo: Avisos Importantes (manual, admin escolhe quando usar)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    '📢 Avisos Importantes',
    'manual',
    '{"type": "avisos", "description": "Comunicados críticos do sistema"}'::jsonb,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  -- Grupo: Assinaturas Expirando (assinaturas que vencem em até 7 dias)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    '⏰ Assinaturas Expirando',
    'expirando',
    '{"type": "expirando", "daysUntilExpiration": 7}'::jsonb,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  -- Grupo: Ex-Assinantes (usuários que já tiveram assinatura mas não têm mais)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    '🔄 Ex-Assinantes',
    'ex_assinantes',
    '{"type": "ex_assinantes", "hadSubscription": true, "currentStatus": "inactive"}'::jsonb,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  -- Grupo: Usuários Free (nunca tiveram assinatura)
  INSERT INTO chat_groups (name, type, membership_criteria, created_by)
  VALUES (
    '🆓 Usuários Free',
    'free',
    '{"type": "free", "neverHadSubscription": true}'::jsonb,
    admin_user_id
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Grupos padrão criados com sucesso';
END;
$$ LANGUAGE plpgsql;

-- Executar a função para criar os novos grupos
SELECT create_default_groups();

-- =====================================================
-- 2. ATUALIZAR FUNÇÃO sync_automatic_group_members
-- =====================================================

CREATE OR REPLACE FUNCTION sync_automatic_group_members(p_group_id UUID)
RETURNS void AS $$
DECLARE
  v_group RECORD;
  v_criteria JSONB;
  v_collection_id TEXT;
  v_days_until_expiration INTEGER;
BEGIN
  -- Buscar informações do grupo
  SELECT * INTO v_group
  FROM chat_groups
  WHERE id = p_group_id
  AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE NOTICE 'Grupo não encontrado ou deletado';
    RETURN;
  END IF;

  v_criteria := v_group.membership_criteria;

  -- Sincronizar baseado no tipo de grupo
  CASE v_group.type
    
    -- Grupo de Assinantes Geral
    WHEN 'assinantes' THEN
      -- Adicionar todos os usuários com assinatura ativa
      INSERT INTO chat_group_members (group_id, user_id, joined_at)
      SELECT DISTINCT p_group_id, s.user_id, NOW()
      FROM subscriptions s
      WHERE s.status = 'active'
      AND s.user_id IS NOT NULL
      ON CONFLICT (group_id, user_id) DO NOTHING;

      -- Remover usuários sem assinatura ativa
      DELETE FROM chat_group_members
      WHERE group_id = p_group_id
      AND user_id NOT IN (
        SELECT user_id FROM subscriptions WHERE status = 'active'
      );

    -- Grupo de Coleção Específica
    WHEN 'colecao' THEN
      v_collection_id := v_criteria->>'collectionId';
      
      IF v_collection_id IS NOT NULL THEN
        -- Adicionar assinantes da coleção
        INSERT INTO chat_group_members (group_id, user_id, joined_at)
        SELECT DISTINCT p_group_id, s.user_id, NOW()
        FROM subscriptions s
        WHERE s.collection_id::text = v_collection_id
        AND s.status = 'active'
        AND s.user_id IS NOT NULL
        ON CONFLICT (group_id, user_id) DO NOTHING;

        -- Remover usuários que não são mais assinantes
        DELETE FROM chat_group_members
        WHERE group_id = p_group_id
        AND user_id NOT IN (
          SELECT user_id 
          FROM subscriptions 
          WHERE collection_id::text = v_collection_id 
          AND status = 'active'
        );
      END IF;

    -- Grupo de Assinaturas Expirando
    WHEN 'expirando' THEN
      v_days_until_expiration := COALESCE((v_criteria->>'daysUntilExpiration')::INTEGER, 7);
      
      -- Adicionar usuários com próxima entrega nos próximos X dias
      -- (consideramos que a assinatura está "expirando" quando a próxima entrega está próxima)
      INSERT INTO chat_group_members (group_id, user_id, joined_at)
      SELECT DISTINCT p_group_id, s.user_id, NOW()
      FROM subscriptions s
      WHERE s.status = 'active'
      AND s.next_delivery_date IS NOT NULL
      AND s.next_delivery_date BETWEEN NOW() AND (NOW() + INTERVAL '1 day' * v_days_until_expiration)
      AND s.deliveries_completed >= (s.deliveries_total - 1) -- Última ou penúltima entrega
      AND s.user_id IS NOT NULL
      ON CONFLICT (group_id, user_id) DO NOTHING;

      -- Remover usuários que não estão mais expirando
      DELETE FROM chat_group_members
      WHERE group_id = p_group_id
      AND user_id NOT IN (
        SELECT user_id 
        FROM subscriptions 
        WHERE status = 'active'
        AND next_delivery_date IS NOT NULL
        AND next_delivery_date BETWEEN NOW() AND (NOW() + INTERVAL '1 day' * v_days_until_expiration)
        AND deliveries_completed >= (deliveries_total - 1)
      );

    -- Grupo de Ex-Assinantes (tiveram assinatura mas não têm mais ativa)
    WHEN 'ex_assinantes' THEN
      -- Adicionar usuários que já tiveram assinatura mas não têm ativa
      INSERT INTO chat_group_members (group_id, user_id, joined_at)
      SELECT DISTINCT p_group_id, s.user_id, NOW()
      FROM subscriptions s
      WHERE s.user_id IS NOT NULL
      AND s.user_id NOT IN (
        -- Excluir quem tem assinatura ativa (exclusão mútua)
        SELECT user_id FROM subscriptions WHERE status = 'active'
      )
      ON CONFLICT (group_id, user_id) DO NOTHING;

      -- Remover usuários que voltaram a ter assinatura ativa
      DELETE FROM chat_group_members
      WHERE group_id = p_group_id
      AND user_id IN (
        SELECT user_id FROM subscriptions WHERE status = 'active'
      );

    -- Grupo de Usuários Free (nunca tiveram assinatura)
    WHEN 'free' THEN
      -- Adicionar usuários que nunca tiveram assinatura
      INSERT INTO chat_group_members (group_id, user_id, joined_at)
      SELECT DISTINCT p_group_id, u.id, NOW()
      FROM auth.users u
      WHERE u.id NOT IN (
        -- Excluir quem já teve ou tem assinatura
        SELECT DISTINCT user_id FROM subscriptions WHERE user_id IS NOT NULL
      )
      ON CONFLICT (group_id, user_id) DO NOTHING;

      -- Remover usuários que criaram assinatura
      DELETE FROM chat_group_members
      WHERE group_id = p_group_id
      AND user_id IN (
        SELECT DISTINCT user_id FROM subscriptions WHERE user_id IS NOT NULL
      );

    ELSE
      RAISE NOTICE 'Tipo de grupo % não requer sincronização automática', v_group.type;
  END CASE;

  RAISE NOTICE 'Membros sincronizados para grupo %', v_group.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. ATUALIZAR FUNÇÃO sync_all_automatic_groups
-- =====================================================

CREATE OR REPLACE FUNCTION sync_all_automatic_groups()
RETURNS void AS $$
DECLARE
  v_group RECORD;
BEGIN
  FOR v_group IN 
    SELECT id, name, type 
    FROM chat_groups 
    WHERE type IN ('assinantes', 'colecao', 'expirando', 'ex_assinantes', 'free')
    AND deleted_at IS NULL
  LOOP
    PERFORM sync_automatic_group_members(v_group.id);
    RAISE NOTICE 'Sincronizado: %', v_group.name;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. POPULAR NOVOS GRUPOS COM MEMBROS
-- =====================================================

-- Sincronizar todos os grupos automáticos
SELECT sync_all_automatic_groups();

-- Adicionar todos os usuários ao grupo "Avisos Importantes" (manual, admin decide)
DO $$
DECLARE
  avisos_group_id UUID;
BEGIN
  SELECT id INTO avisos_group_id
  FROM chat_groups
  WHERE name = '📢 Avisos Importantes'
  AND deleted_at IS NULL
  LIMIT 1;

  IF avisos_group_id IS NOT NULL THEN
    INSERT INTO chat_group_members (group_id, user_id, joined_at)
    SELECT avisos_group_id, id, created_at
    FROM auth.users
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Usuários adicionados ao grupo Avisos Importantes';
  END IF;
END $$;

-- =====================================================
-- 5. JOB DIÁRIO: Sincronizar grupos de segmentação
-- =====================================================

-- Esta função deve ser chamada diariamente via cron job ou scheduler
-- Para executar manualmente: SELECT sync_segmentation_groups();

CREATE OR REPLACE FUNCTION sync_segmentation_groups()
RETURNS void AS $$
DECLARE
  v_group RECORD;
BEGIN
  -- Sincronizar apenas grupos de segmentação
  FOR v_group IN 
    SELECT id, name 
    FROM chat_groups 
    WHERE type IN ('expirando', 'ex_assinantes', 'free')
    AND deleted_at IS NULL
  LOOP
    PERFORM sync_automatic_group_members(v_group.id);
    RAISE NOTICE 'Grupo de segmentação sincronizado: %', v_group.name;
  END LOOP;
  
  RAISE NOTICE 'Sincronização de grupos de segmentação concluída';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION sync_segmentation_groups() IS 'Sincroniza grupos de segmentação (expirando, ex-assinantes, free). Deve ser executado diariamente.';

-- =====================================================
-- VERIFICAÇÃO: Mostrar estatísticas dos novos grupos
-- =====================================================

DO $$
DECLARE
  v_group RECORD;
  v_count INTEGER;
BEGIN
  RAISE NOTICE '=== ESTATÍSTICAS DOS GRUPOS ===';
  
  FOR v_group IN 
    SELECT id, name, type 
    FROM chat_groups 
    WHERE deleted_at IS NULL
    ORDER BY 
      CASE type
        WHEN 'manual' THEN 1
        WHEN 'assinantes' THEN 2
        WHEN 'expirando' THEN 3
        WHEN 'ex_assinantes' THEN 4
        WHEN 'free' THEN 5
        WHEN 'colecao' THEN 6
        ELSE 7
      END,
      name
  LOOP
    SELECT COUNT(*) INTO v_count
    FROM chat_group_members
    WHERE group_id = v_group.id;
    
    RAISE NOTICE '% [%]: % membros', v_group.name, v_group.type, v_count;
  END LOOP;
END $$;
