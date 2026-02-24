-- ============================================
-- CONFIGURAR STORAGE PARA COLEÇÕES
-- ============================================
-- Este script configura o bucket e permissões para upload de imagens

-- 1. Criar bucket 'models' se não existir
-- NOTA: Execute isso no Supabase Dashboard > Storage
-- Clique em "New bucket" e crie um bucket chamado "models"
-- Marque como "Public bucket" para permitir acesso público às imagens

-- 2. Políticas de Storage para o bucket 'models'

-- Permitir leitura pública de todas as imagens
INSERT INTO storage.buckets (id, name, public)
VALUES ('models', 'models', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Permitir que admins façam upload
CREATE POLICY "Admins can upload to models bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'models' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Permitir que admins atualizem arquivos
CREATE POLICY "Admins can update files in models bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'models' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Permitir que admins deletem arquivos
CREATE POLICY "Admins can delete files in models bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'models' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Permitir leitura pública de todos os arquivos
CREATE POLICY "Public can view files in models bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'models');

-- 3. Verificar se as políticas foram criadas
SELECT * FROM storage.policies WHERE bucket_id = 'models';

-- 4. Verificar se o bucket existe
SELECT * FROM storage.buckets WHERE id = 'models';
