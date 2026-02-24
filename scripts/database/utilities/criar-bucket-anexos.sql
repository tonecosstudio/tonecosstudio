-- Criar bucket para anexos de chat se não existir
-- Execute este script no SQL Editor do Supabase

-- Inserir bucket (ignora se já existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Criar policy para permitir upload (apenas usuários autenticados)
CREATE POLICY IF NOT EXISTS "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support-attachments');

-- Criar policy para permitir leitura pública
CREATE POLICY IF NOT EXISTS "Public can view attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'support-attachments');

-- Criar policy para permitir delete (apenas o dono ou admins)
CREATE POLICY IF NOT EXISTS "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'support-attachments' 
  AND (
    auth.uid() = owner 
    OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
);
