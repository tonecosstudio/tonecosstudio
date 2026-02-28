# 🚀 APLICAR MIGRATION AGORA - Passo a Passo

## ⚠️ IMPORTANTE
Não consigo executar SQL diretamente no seu banco de dados remoto por questões de segurança do Supabase.
Você precisa aplicar manualmente via console.

## 📋 PASSO A PASSO (2 minutos)

### 1. Abra o Supabase Dashboard
🔗 https://app.supabase.com/project/pabxpvqwtvbjaunjejud

### 2. Vá em SQL Editor
No menu lateral esquerdo, clique em **SQL Editor**

### 3. Cole o SQL abaixo e clique em RUN

```sql
-- Adicionar coluna rotation_type
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS rotation_type TEXT DEFAULT 'fixed' 
    CHECK (rotation_type IN ('fixed', 'odd_months', 'even_months'));

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_collections_rotation ON collections(rotation_type);

-- Atualizar coleções existentes
UPDATE collections 
SET rotation_type = 'fixed' 
WHERE rotation_type IS NULL;

-- Verificar
SELECT 
  'SUCCESS ✅' AS status,
  COUNT(*) AS total_collections,
  COUNT(*) FILTER (WHERE rotation_type = 'fixed') AS fixed_collections
FROM collections;
```

### 4. Recarregue a página no navegador
Pressione **F5** ou **Ctrl+R**

## ✅ Pronto!
O erro deve desaparecer e as coleções devem aparecer corretamente.

---

## 🔍 Se quiser aplicar TODAS as colunas (opcional)

Cole este SQL mais completo:

```sql
-- 1. rotation_type
ALTER TABLE collections ADD COLUMN IF NOT EXISTS rotation_type TEXT DEFAULT 'fixed' CHECK (rotation_type IN ('fixed', 'odd_months', 'even_months'));

-- 2. character_revelation_date
ALTER TABLE collections ADD COLUMN IF NOT EXISTS character_revelation_date TIMESTAMPTZ;

-- 3. revealed
ALTER TABLE collections ADD COLUMN IF NOT EXISTS revealed BOOLEAN DEFAULT false;

-- 4. character_name
ALTER TABLE collections ADD COLUMN IF NOT EXISTS character_name TEXT;

-- 5. character_image_url
ALTER TABLE collections ADD COLUMN IF NOT EXISTS character_image_url TEXT;

-- Índices
CREATE INDEX IF NOT EXISTS idx_collections_rotation ON collections(rotation_type);
CREATE INDEX IF NOT EXISTS idx_collections_revelation ON collections(character_revelation_date) WHERE revealed = false AND character_revelation_date IS NOT NULL;

-- Atualizar dados
UPDATE collections SET rotation_type = 'fixed' WHERE rotation_type IS NULL;
UPDATE collections SET revealed = false WHERE revealed IS NULL;

-- Verificar
SELECT 'SUCCESS ✅' AS status, COUNT(*) AS total FROM collections;
```

---

## 📝 Arquivo SQL pronto
Também criei o arquivo `temp_apply_rotation.sql` que você pode copiar e colar diretamente.
