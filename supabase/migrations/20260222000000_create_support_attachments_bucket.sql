-- Criar bucket para anexos de chat
-- Migration: 20260222000000_create_support_attachments_bucket.sql

-- Inserir bucket (ignora se já existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own attachments" ON storage.objects;

-- Criar policy para permitir upload (apenas usuários autenticados)
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support-attachments');

-- Criar policy para permitir leitura pública
CREATE POLICY "Public can view attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'support-attachments');

-- Criar policy para permitir delete (apenas o dono ou admins)
CREATE POLICY "Users can delete their own attachments"
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

-- Criar policy para permitir update (apenas o dono ou admins)
CREATE POLICY "Users can update their own attachments"
ON storage.objects FOR UPDATE
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
