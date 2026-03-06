-- ============================================================================
-- Migration: Ensure User Coins Record
-- Description: Cria função para garantir que usuário tenha registro em user_coins
-- Date: 2026-03-06
-- ============================================================================

-- Função para garantir que usuário tenha registro em user_coins
CREATE OR REPLACE FUNCTION ensure_user_coins_record(p_user_id UUID)
RETURNS user_coins
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record user_coins;
BEGIN
  -- Tentar buscar registro existente
  SELECT * INTO v_record
  FROM user_coins
  WHERE user_id = p_user_id;
  
  -- Se não existe, criar
  IF NOT FOUND THEN
    INSERT INTO user_coins (user_id, balance, total_earned, total_spent)
    VALUES (p_user_id, 0, 0, 0)
    RETURNING * INTO v_record;
  END IF;
  
  RETURN v_record;
END;
$$;

COMMENT ON FUNCTION ensure_user_coins_record IS 
  'Garante que usuário tenha registro em user_coins, criando se necessário';

-- Trigger para criar registro automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION create_user_coins_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_coins (user_id, balance, total_earned, total_spent)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Criar trigger se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created_create_coins'
  ) THEN
    CREATE TRIGGER on_auth_user_created_create_coins
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_coins_on_signup();
  END IF;
END $$;

-- Criar registros para usuários existentes que não têm
INSERT INTO user_coins (user_id, balance, total_earned, total_spent)
SELECT id, 0, 0, 0
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_coins WHERE user_coins.user_id = auth.users.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Atualizar política RLS para permitir que função crie registros
DROP POLICY IF EXISTS "Only system can modify coins" ON user_coins;

CREATE POLICY "System functions can modify coins"
  ON user_coins FOR ALL
  USING (
    -- Permitir se for chamado por função SECURITY DEFINER
    current_setting('role', true) = 'postgres'
    OR
    -- Ou se for admin
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Permitir INSERT para usuários criarem seu próprio registro inicial
CREATE POLICY "Users can create own coins record"
  ON user_coins FOR INSERT
  WITH CHECK (auth.uid() = user_id);
