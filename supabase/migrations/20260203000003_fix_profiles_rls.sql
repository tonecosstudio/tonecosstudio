-- Adicionar política para permitir INSERT em profiles
-- (necessário para o trigger sync_user_email funcionar)

-- Permitir que o sistema crie profiles automaticamente
CREATE POLICY "system_insert_profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Permitir que admins insiram profiles
CREATE POLICY "admins_insert_profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Permitir que admins atualizem qualquer profile
CREATE POLICY "admins_update_profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
