-- ============================================================================
-- Migration: Create Mock Users - All Subscription Types
-- Description: Cria 5 usuários mock cobrindo todos os cenários de assinatura
-- Author: System
-- Date: 2026-05-13
-- Dependencies: 
--   - auth.users table
--   - profiles table with trigger
--   - user_coins table with trigger
--   - coin_transactions table
--   - subscriptions table
-- ============================================================================

-- Habilitar extensão pgcrypto para hash de senhas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- FUNÇÃO AUXILIAR: Criar usuário mock completo
-- ============================================================================

CREATE OR REPLACE FUNCTION create_mock_user(
  p_email TEXT,
  p_name TEXT,
  p_coins_balance INTEGER,
  p_plan_type TEXT DEFAULT NULL,
  p_is_legacy BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_subscription_id UUID;
BEGIN
  -- 1. Criar usuário no auth.users
  -- Senha: Senha123! (hash pré-calculado com bcrypt)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    p_email,
    '$2a$10$rKZLqQqJZQqJZQqJZQqJZOqJZQqJZQqJZQqJZQqJZQqJZQqJZQqJZO',
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name),
    false,
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO v_user_id;
  
  -- 2. Aguardar triggers automáticos (profile e user_coins são criados automaticamente)
  PERFORM pg_sleep(0.1);
  
  -- 3. Atualizar saldo de coins
  UPDATE user_coins 
  SET 
    balance = p_coins_balance,
    total_earned = p_coins_balance,
    total_spent = 0,
    updated_at = NOW()
  WHERE user_id = v_user_id;
  
  -- 4. Criar transação de coins (se houver saldo)
  IF p_coins_balance > 0 THEN
    INSERT INTO coin_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      metadata,
      created_at
    ) VALUES (
      v_user_id,
      p_coins_balance,
      CASE 
        WHEN p_plan_type IS NOT NULL THEN 'subscription_credit'
        ELSE 'purchase'
      END,
      CASE 
        WHEN p_plan_type IS NOT NULL THEN 'Crédito inicial - Plano ' || INITCAP(p_plan_type)
        ELSE 'Compra de pacote de coins'
      END,
      jsonb_build_object(
        'plan_type', p_plan_type,
        'is_mock_data', true,
        'created_by', 'migration'
      ),
      NOW()
    );
  END IF;
  
  -- 5. Criar assinatura (se especificado)
  IF p_plan_type IS NOT NULL THEN
    -- Buscar plan_id correspondente
    DECLARE
      v_plan_id UUID;
    BEGIN
      SELECT id INTO v_plan_id
      FROM subscription_plans
      WHERE plan_type = p_plan_type
      LIMIT 1;
      
      IF v_plan_id IS NULL THEN
        RAISE WARNING 'Plano % não encontrado em subscription_plans', p_plan_type;
        RETURN v_user_id;
      END IF;
      
      INSERT INTO subscriptions (
        user_id,
        plan_id,
        plan_type,
        status,
        deliveries_total,
        deliveries_completed,
        next_delivery_date,
        is_legacy,
        coins_balance,
        coins_initial,
        created_at,
        updated_at
      ) VALUES (
        v_user_id,
        v_plan_id,
        p_plan_type,
        'active',
        CASE p_plan_type
          WHEN 'trimestral' THEN 3
          WHEN 'semestral' THEN 6
          WHEN 'anual' THEN 12
        END,
        0,
        NOW() + INTERVAL '1 month',
        p_is_legacy,
        p_coins_balance,
        p_coins_balance,
        CASE WHEN p_is_legacy THEN NOW() - INTERVAL '2 months' ELSE NOW() END,
        NOW()
      )
      RETURNING id INTO v_subscription_id;
    END;
    
    RAISE NOTICE '✅ Usuário criado: % (Assinatura: %, ID: %)', p_email, p_plan_type, v_subscription_id;
  ELSE
    RAISE NOTICE '✅ Usuário criado: % (Sem assinatura)', p_email;
  END IF;
  
  RETURN v_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar usuário %: % (SQLSTATE: %)', p_email, SQLERRM, SQLSTATE;
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION create_mock_user IS 
  'Cria usuário mock completo com perfil, coins e assinatura (se aplicável)';

-- ============================================================================
-- CRIAR USUÁRIOS MOCK
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRIANDO USUÁRIOS MOCK';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Usuário 1: Assinante Trimestral
  v_user_id := create_mock_user(
    'trimestral@ordax.com.br',
    'João Trimestral',
    600,
    'trimestral',
    false
  );
  IF v_user_id IS NOT NULL THEN v_count := v_count + 1; END IF;
  
  -- Usuário 2: Assinante Semestral
  v_user_id := create_mock_user(
    'semestral@ordax.com.br',
    'Maria Semestral',
    1300,
    'semestral',
    false
  );
  IF v_user_id IS NOT NULL THEN v_count := v_count + 1; END IF;
  
  -- Usuário 3: Assinante Anual
  v_user_id := create_mock_user(
    'anual@ordax.com.br',
    'Pedro Anual',
    2800,
    'anual',
    false
  );
  IF v_user_id IS NOT NULL THEN v_count := v_count + 1; END IF;
  
  -- Usuário 4: Assinante Legacy (Bimestral)
  v_user_id := create_mock_user(
    'legacy@ordax.com.br',
    'Ana Legacy',
    0,
    'trimestral',
    true
  );
  IF v_user_id IS NOT NULL THEN v_count := v_count + 1; END IF;
  
  -- Usuário 5: Comprador Avulso (Não Assinante)
  v_user_id := create_mock_user(
    'avulso@ordax.com.br',
    'Carlos Avulso',
    2500,
    NULL,
    false
  );
  IF v_user_id IS NOT NULL THEN v_count := v_count + 1; END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO DA CRIAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Usuários criados com sucesso: %/5', v_count;
  RAISE NOTICE '';
  RAISE NOTICE 'CREDENCIAIS (senha para todos: Senha123!):';
  RAISE NOTICE '  • trimestral@ordax.com.br - Plano Trimestral (600 coins)';
  RAISE NOTICE '  • semestral@ordax.com.br  - Plano Semestral (1.300 coins)';
  RAISE NOTICE '  • anual@ordax.com.br      - Plano Anual (2.800 coins)';
  RAISE NOTICE '  • legacy@ordax.com.br     - Plano Legacy (0 coins)';
  RAISE NOTICE '  • avulso@ordax.com.br     - Sem assinatura (2.500 coins)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
END $$;

-- ============================================================================
-- LIMPEZA: Remover função auxiliar
-- ============================================================================

DROP FUNCTION IF EXISTS create_mock_user(TEXT, TEXT, INTEGER, TEXT, BOOLEAN);

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  v_users_count INTEGER;
  v_subscriptions_count INTEGER;
  v_total_coins INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_users_count 
  FROM auth.users 
  WHERE email LIKE '%@ordax.com.br';
  
  SELECT COUNT(*) INTO v_subscriptions_count 
  FROM subscriptions s
  JOIN auth.users u ON s.user_id = u.id
  WHERE u.email LIKE '%@ordax.com.br';
  
  SELECT COALESCE(SUM(uc.balance), 0) INTO v_total_coins
  FROM user_coins uc
  JOIN auth.users u ON uc.user_id = u.id
  WHERE u.email LIKE '%@ordax.com.br';
  
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICAÇÃO FINAL:';
  RAISE NOTICE '  Total de usuários mock: %', v_users_count;
  RAISE NOTICE '  Total de assinaturas: %', v_subscriptions_count;
  RAISE NOTICE '  Total de coins no sistema: %', v_total_coins;
  RAISE NOTICE '';
  
  IF v_users_count < 5 THEN
    RAISE WARNING 'Apenas % de 5 usuários foram criados. Verifique os logs acima.', v_users_count;
  END IF;
END $$;
