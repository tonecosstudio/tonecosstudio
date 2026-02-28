# ✅ APLICAR MIGRATIONS: Hero Image Upload

## 🎯 O QUE PRECISA SER FEITO

Duas migrations precisam ser aplicadas **manualmente** no Supabase SQL Editor:
1. Adicionar coluna `hero_image_url` na tabela `system_settings`
2. Criar bucket `images` no Storage com políticas de acesso

## 📋 PASSO A PASSO

### 1. Acessar o SQL Editor do Supabase

Abra o link abaixo no navegador:

```
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
```

Ou navegue manualmente:
1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto: **pabxpvqwtvbjaunjejud**
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**

### 2. Executar Migration 1: Adicionar Coluna

Cole e execute o SQL abaixo:

```sql
-- Add hero_image_url to system_settings
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Add comment
COMMENT ON COLUMN system_settings.hero_image_url IS 'URL da imagem do hero (guerreiro) na página de coleções';
```

### 3. Executar Migration 2: Criar Bucket de Imagens

Cole e execute o SQL abaixo:

```sql
-- Create images bucket for system images (hero, logos, etc)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Policy: Allow authenticated users to upload images
CREATE POLICY IF NOT EXISTS "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Policy: Allow authenticated users to update their images
CREATE POLICY IF NOT EXISTS "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images');

-- Policy: Allow authenticated users to delete images
CREATE POLICY IF NOT EXISTS "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');

-- Policy: Allow public read access to images
CREATE POLICY IF NOT EXISTS "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');
```

### 4. Verificar

Execute para verificar se tudo foi criado:

```sql
-- Verificar coluna
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'system_settings' 
AND column_name = 'hero_image_url';

-- Verificar bucket
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'images';
```

## ✅ APÓS APLICAR AS MIGRATIONS

### Fazer Upload da Imagem no Admin

1. Acesse: **Admin > Configurações do Sistema**
2. Vá para a tab **"Interface"**
3. Localize o campo **"Imagem do Hero (Página Coleções)"**
4. **Arraste e solte** a imagem do guerreiro na área de upload OU clique para selecionar
5. Aguarde o upload completar (barra de progresso)
6. Clique em **"Salvar Alterações"**

### Funcionalidades do Upload

- ✅ **Drag & Drop**: Arraste a imagem diretamente
- ✅ **Preview em tempo real**: Veja a imagem antes de salvar
- ✅ **Validação automática**: Formato e tamanho verificados
- ✅ **Upload direto para Supabase Storage**: Sem necessidade de URL externa
- ✅ **Botão de remover**: Clique no X para remover a imagem

### Especificações da Imagem

- **Proporção**: 3:4 ou 2:3 (vertical/retrato)
- **Exemplos de dimensões**:
  - 600x800px
  - 700x900px
  - 750x1000px
- **Formato**: PNG (com fundo transparente) ou JPG
- **Tamanho**: Máximo 5MB
- **Onde usar**: Supabase Storage (bucket público) ou URL externa

### Exemplo de URL

```
https://pabxpvqwtvbjaunjejud.supabase.co/storage/v1/object/public/images/hero-warrior.png
```

## 🎨 RESULTADO ESPERADO

A imagem aparecerá na página de Coleções:
- **Desktop**: Lado direito do hero section
- **Mobile**: Oculta (apenas texto)
- **Efeito**: Drop shadow para destaque
- **Fallback**: Se não carregar, fica oculta (não quebra o layout)

## 🔍 TESTAR

1. Acesse: http://localhost:5173/colecoes
2. Verifique se a imagem aparece no hero (desktop)
3. Teste responsividade (mobile deve ocultar a imagem)
4. Teste o fallback: remova a URL e veja se não quebra

## ❓ PROBLEMAS?

### Erro: "permission denied"
- Certifique-se de estar logado como admin no Supabase
- Verifique se tem permissões de escrita no projeto

### Erro: "column already exists"
- A coluna já foi criada! Pule para a configuração no Admin

### Imagem não aparece
- Verifique se a URL está correta
- Teste a URL diretamente no navegador
- Verifique se o bucket do Storage é público
- Limpe o cache do navegador (Ctrl+Shift+R)

## 📝 ARQUIVOS MODIFICADOS

- ✅ `src/pages/admin/AdminSystemSettings.tsx` - Campo de upload adicionado
- ✅ `src/pages/Collections.tsx` - Hero configurado para usar a imagem
- ✅ `supabase/migrations/20260228000001_add_hero_image_setting.sql` - Migration criada
- ⏳ **Banco de dados** - Precisa aplicar a migration

## 🎉 PRONTO!

Após aplicar a migration e configurar a URL, a página de Coleções terá o hero premium com a imagem do guerreiro, exatamente como na referência ORDAX!


### Especificações da Imagem

- **Proporção**: 3:4 ou 2:3 (vertical/retrato)
- **Exemplos de dimensões**:
  - 600x800px
  - 700x900px
  - 750x1000px
- **Formato**: PNG, JPG, JPEG ou WebP
- **Tamanho**: Máximo 5MB
- **Fundo**: Transparente (PNG) ou que combine com o hero

### Como Funciona o Upload

1. Você faz upload da imagem pelo Admin
2. A imagem é enviada para o Supabase Storage (bucket `images`)
3. A URL pública é gerada automaticamente
4. A URL é salva na configuração `hero_image_url`
5. A página de Coleções busca a imagem dessa URL

## 🎨 RESULTADO ESPERADO

A imagem aparecerá na página de Coleções:
- **Desktop**: Lado direito do hero section
- **Mobile**: Oculta (apenas texto)
- **Efeito**: Drop shadow para destaque
- **Fallback**: Se não carregar, fica oculta (não quebra o layout)

## 🔍 TESTAR

1. Acesse: http://localhost:5173/colecoes
2. Verifique se a imagem aparece no hero (desktop)
3. Teste responsividade (mobile deve ocultar a imagem)
4. Teste o fallback: remova a imagem e veja se não quebra

## ❓ PROBLEMAS?

### Erro: "permission denied" ao aplicar SQL
- Certifique-se de estar logado como admin no Supabase
- Verifique se tem permissões de escrita no projeto

### Erro: "column already exists"
- A coluna já foi criada! Pule para a próxima migration

### Erro: "bucket already exists"
- O bucket já foi criado! Pule para o upload da imagem

### Erro no upload da imagem
- Verifique se as migrations foram aplicadas
- Verifique se está logado como admin no sistema
- Verifique o tamanho e formato da imagem
- Limpe o cache do navegador (Ctrl+Shift+R)

### Imagem não aparece na página
- Verifique se salvou as alterações no Admin
- Limpe o cache do navegador
- Verifique o console do navegador para erros

## 📝 ARQUIVOS CRIADOS/MODIFICADOS

- ✅ `src/components/admin/ImageUpload.tsx` - Componente de upload criado
- ✅ `src/pages/admin/AdminSystemSettings.tsx` - Integrado componente de upload
- ✅ `src/pages/Collections.tsx` - Hero configurado para usar a imagem
- ✅ `supabase/migrations/20260228000001_add_hero_image_setting.sql` - Migration da coluna
- ✅ `supabase/migrations/20260228000002_create_images_bucket.sql` - Migration do bucket
- ⏳ **Banco de dados** - Precisa aplicar as migrations

## 🎉 PRONTO!

Após aplicar as migrations e fazer upload da imagem, a página de Coleções terá o hero premium com a imagem do guerreiro, exatamente como na referência ORDAX!
