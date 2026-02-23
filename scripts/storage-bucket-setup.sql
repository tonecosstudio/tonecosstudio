-- =====================================================
-- STORAGE BUCKET SETUP - Manual Payment System
-- =====================================================
-- Este script configura o bucket de storage e suas políticas RLS
-- Execute no SQL Editor do Supabase Dashboard após criar o bucket

-- =====================================================
-- IMPORTANTE: CRIAR O BUCKET PRIMEIRO
-- =====================================================
-- 1. Acesse o Supabase Dashboard
-- 2. Vá para Storage > Buckets
-- 3. Clique em "New Bucket"
-- 4. Configure:
--    - Name: payment-proofs
--    - Public: false (IMPORTANTE!)
--    - File size limit: 5242880 (5MB)
--    - Allowed MIME types: image/jpeg, image/png, application/pdf
-- 5. Clique em "Create bucket"
-- 6. Depois execute este script

-- =====================================================
-- POLÍTICAS RLS DO BUCKET
-- =====================================================

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete payment proofs" ON storage.objects;

-- Política 1: Permitir usuários fazer upload em suas próprias pastas de pagamento
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM manual_payments WHERE user_id = auth.uid()
  )
);

-- Política 2: Permitir usuários ver seus próprios comprovantes
CREATE POLICY "Users can view own payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM manual_payments WHERE user_id = auth.uid()
  )
);

-- Política 3: Permitir admins ver todos os comprovantes
CREATE POLICY "Admins can view all payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Política 4: Permitir admins deletar comprovantes
CREATE POLICY "Admins can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se o bucket existe
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    CASE 
        WHEN name = 'payment-proofs' AND public = false THEN 'OK'
        WHEN name = 'payment-proofs' AND public = true THEN 'ERRO: Bucket deve ser privado!'
        ELSE 'ERRO: Bucket não encontrado'
    END as status
FROM storage.buckets
WHERE name = 'payment-proofs';

-- Verificar políticas criadas
SELECT 
    policyname,
    cmd,
    qual,
    'OK' as status
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%payment proof%';

-- Contar políticas (deve ser 4)
SELECT 
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) = 4 THEN 'OK: Todas as 4 políticas criadas'
        ELSE 'AVISO: Esperado 4 políticas, encontrado ' || COUNT(*)
    END as status
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%payment proof%';

-- =====================================================
-- TESTE DE UPLOAD (OPCIONAL)
-- =====================================================

-- Para testar o upload, use o código TypeScript abaixo no console do navegador:

/*
// Teste de upload
const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

// Criar um pagamento de teste primeiro
const { data: payment } = await supabase
  .from('manual_payments')
  .insert({
    reference_number: 'TEST-' + Date.now(),
    payment_method_id: 'YOUR_PAYMENT_METHOD_ID',
    quote_id: 'YOUR_QUOTE_ID',
    amount: 100.00,
    currency: 'BRL',
    payment_type: 'one_time'
  })
  .select()
  .single();

// Fazer upload
const { data, error } = await supabase.storage
  .from('payment-proofs')
  .upload(`${payment.id}/test.txt`, testFile);

console.log('Upload result:', { data, error });

// Obter URL assinada
const { data: url } = await supabase.storage
  .from('payment-proofs')
  .createSignedUrl(`${payment.id}/test.txt`, 60);

console.log('Signed URL:', url);

// Limpar teste
await supabase.storage
  .from('payment-proofs')
  .remove([`${payment.id}/test.txt`]);

await supabase
  .from('manual_payments')
  .delete()
  .eq('id', payment.id);
*/

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

-- 1. O bucket DEVE ser privado (public = false)
-- 2. Arquivos são organizados por payment_id: payment-proofs/{payment_id}/{filename}
-- 3. URLs de acesso são geradas com expiração (signed URLs)
-- 4. Apenas o dono do pagamento e admins podem acessar os arquivos
-- 5. Limite de tamanho: 5MB por arquivo
-- 6. Tipos permitidos: JPG, PNG, PDF

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- Se uploads falharem, verifique:
-- 1. Bucket existe e é privado
-- 2. Políticas RLS estão ativas
-- 3. Usuário está autenticado
-- 4. Payment_id existe e pertence ao usuário
-- 5. Arquivo está dentro do limite de tamanho
-- 6. Tipo MIME é permitido

-- Para ver logs de erro:
-- SELECT * FROM storage.objects WHERE bucket_id = 'payment-proofs' ORDER BY created_at DESC LIMIT 10;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
