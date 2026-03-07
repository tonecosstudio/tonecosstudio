-- ============================================================================
-- Migration: Create Standalone Purchase Mock Users
-- Description: Cria 2 usuários de compra avulsa para teste end-to-end
-- Date: 2026-05-13
-- ============================================================================

-- ============================================================================
-- USUÁRIOS MOCK:
-- 1. Carlos Entrada (entrada-paga@ordax.com.br) - Pagou apenas entrada (R$100)
-- 2. Roberto Completo (completo-pago@ordax.com.br) - Pagou valor total
-- ============================================================================

-- Habilitar extensão pgcrypto para hash de senhas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- FUNÇÃO AUXILIAR: Criar usuário de compra avulsa completo
-- ============================================================================

CREATE OR REPLACE FUNCTION create_standalone_purchase_user(
  p_email TEXT,
  p_name TEXT,
  p_status TEXT,  -- 'deposit_paid' ou 'balance_paid'
  p_collection_slug TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_collection_id UUID;
  v_cycle_id UUID;
  v_purchase_id UUID;
  v_deposit_amount DECIMAL(10,2) := 100.00;
  v_total_amount DECIMAL(10,2);
  v_balance_amount DECIMAL(10,2);
BEGIN
  -- 1. Criar usuário no auth.users
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
    crypt('Senha123!', gen_salt('bf')),
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
  
  -- 2. Aguardar triggers automáticos (profile criado automaticamente)
  PERFORM pg_sleep(0.1);
  
  -- 3. Buscar coleção
  SELECT id INTO v_collection_id
  FROM collections
  WHERE slug = p_collection_slug
  LIMIT 1;
  
  IF v_collection_id IS NULL THEN
    RAISE WARNING 'Coleção % não encontrada', p_collection_slug;
    RETURN v_user_id;
  END IF;
  
  -- 4. Buscar ciclo ativo
  SELECT id INTO v_cycle_id
  FROM cycles
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_cycle_id IS NULL THEN
    RAISE WARNING 'Nenhum ciclo ativo encontrado';
    RETURN v_user_id;
  END IF;
  
  -- 5. Calcular valores (assumindo preço padrão de R$150)
  v_total_amount := 150.00;
  v_balance_amount := v_total_amount - v_deposit_amount;
  
  -- 6. Criar compra avulsa
  INSERT INTO standalone_purchases (
    user_id,
    collection_id,
    cycle_id,
    status,
    deposit_amount,
    balance_amount,
    total_amount,
    deposit_paid_at,
    balance_paid_at,
    balance_due_date,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_collection_id,
    v_cycle_id,
    p_status,
    v_deposit_amount,
    v_balance_amount,
    v_total_amount,
    NOW(),
    CASE WHEN p_status = 'balance_paid' THEN NOW() ELSE NULL END,
    NOW() + INTERVAL '5 days',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_purchase_id;
  
  RAISE NOTICE '✅ Usuário criado: % (Compra: %, Status: %)', p_email, v_purchase_id, p_status;
  
  RETURN v_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar usuário %: % (SQLSTATE: %)', p_email, SQLERRM, SQLSTATE;
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION create_standalone_purchase_user IS 
  'Cria usuário mock de compra avulsa com perfil e purchase';

-- ============================================================================
-- CRIAR USUÁRIOS MOCK DE COMPRA AVULSA
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRIANDO USUÁRIOS DE COMPRA AVULSA';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Usuário 1: Pagou apenas entrada
  v_user_id := create_standalone_purchase_user(
    'entrada-paga@ordax.com.br',
    'Carlos Entrada',
    'deposit_paid',
    'one-piece-mugiwara'
  );
  IF v_user_id IS NOT NULL THEN v_count := v_count + 1; END IF;
  
  -- Usuário 2: Pagou valor total
  v_user_id := create_standalone_purchase_user(
    'completo-pago@ordax.com.br',
    'Roberto Completo',
    'balance_paid',
    'dragon-ball-z-warriors'
  );
  IF v_user_id IS NOT NULL THEN v_count := v_count + 1; END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO DA CRIAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Usuários criados com sucesso: %/2', v_count;
  RAISE NOTICE '';
  RAISE NOTICE 'CREDENCIAIS (senha para todos: Senha123!):';
  RAISE NOTICE '  • entrada-paga@ordax.com.br - Pagou entrada (R$100)';
  RAISE NOTICE '  • completo-pago@ordax.com.br - Pagou total (R$150)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
END $$;

-- ============================================================================
-- LIMPEZA: Remover função auxiliar
-- ============================================================================

DROP FUNCTION IF EXISTS create_standalone_purchase_user(TEXT, TEXT, TEXT, TEXT);

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  v_users_count INTEGER;
  v_purchases_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_users_count 
  FROM auth.users 
  WHERE email IN ('entrada-paga@ordax.com.br', 'completo-pago@ordax.com.br');
  
  SELECT COUNT(*) INTO v_purchases_count 
  FROM standalone_purchases sp
  JOIN auth.users u ON sp.user_id = u.id
  WHERE u.email IN ('entrada-paga@ordax.com.br', 'completo-pago@ordax.com.br');
  
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICAÇÃO FINAL:';
  RAISE NOTICE '  Total de usuários mock: %', v_users_count;
  RAISE NOTICE '  Total de compras: %', v_purchases_count;
  RAISE NOTICE '';
  
  IF v_users_count < 2 THEN
    RAISE WARNING 'Apenas % de 2 usuários foram criados. Verifique os logs acima.', v_users_count;
  END IF;
END $$;
