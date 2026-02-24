-- ============================================
-- CONFIGURAR STORAGE - VERSÃO SIMPLES
-- ============================================

-- 1. Criar bucket público
INSERT INTO storage.buckets (id, name, public)
VALUES ('models', 'models', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Admins can upload to models bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can view files in models bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update files in models bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete files in models bucket" ON storage.objects;

-- 3. Criar política de upload para admins
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

-- 4. Criar política de leitura pública
CREATE POLICY "Public can view files in models bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'models');

-- 5. Criar política de update para admins
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

-- 6. Criar política de delete para admins
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

-- 7. Verificar resultado
SELECT 'Bucket criado:' as status, * FROM storage.buckets WHERE id = 'models';
