# 🚨 APLICAR POLÍTICAS DE STORAGE - URGENTE

## ⚠️ PROBLEMA

As políticas de RLS não foram aplicadas corretamente via API. Você precisa aplicar manualmente no SQL Editor.

## 📋 PASSO A PASSO (2 MINUTOS)

### 1. Abra o SQL Editor

**Link direto**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

### 2. Cole e Execute o SQL Abaixo

```sql
-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can view images" ON storage.objects;

-- Criar políticas corretas
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');

CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

CREATE POLICY "Anonymous users can view images"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'images');
```

### 3. Clique em RUN

Pressione o botão **RUN** ou **Ctrl+Enter** / **Cmd+Enter**

### 4. Verifique

Execute para confirmar:

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%images%';
```

Deve retornar 5 políticas.

## ✅ DEPOIS DE APLICAR

1. Volte para o Admin
2. Recarregue a página (F5)
3. Tente fazer upload novamente

## 🔍 SE AINDA NÃO FUNCIONAR

Verifique se você está logado como admin:

```sql
SELECT auth.uid(), auth.role();
```

Deve retornar seu user_id e role 'authenticated'.
