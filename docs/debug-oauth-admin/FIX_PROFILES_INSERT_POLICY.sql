-- ============================================
-- FIX: Adicionar política de INSERT para profiles
-- ============================================
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- PROBLEMA IDENTIFICADO:
-- A tabela profiles tem políticas para SELECT e UPDATE,
-- mas NÃO tem política de INSERT para usuários autenticados.
-- Isso impede que o hook useAuthProfileSync crie profiles.

-- SOLUÇÃO:
-- Adicionar política que permite usuários criarem seus próprios profiles

DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;
CREATE POLICY "users_insert_own_profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Verificar políticas após a correção
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Leitura'
    WHEN cmd = 'INSERT' THEN 'Inserção'
    WHEN cmd = 'UPDATE' THEN 'Atualização'
    WHEN cmd = 'DELETE' THEN 'Exclusão'
    WHEN cmd = 'ALL' THEN 'Todas'
  END as operacao_pt
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
