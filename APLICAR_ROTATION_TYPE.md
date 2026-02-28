# Como Aplicar a Migration de rotation_type

O erro que você está vendo acontece porque a coluna `rotation_type` ainda não existe no banco de dados.

## Opção 1: Via Console do Supabase (MAIS FÁCIL)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Vá em **SQL Editor**
3. Cole o SQL abaixo e clique em **Run**:

```sql
-- =====================================================
-- Migration: Add Collection Rotation Fields
-- =====================================================

-- 1. Adicionar coluna rotation_type
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS rotation_type TEXT DEFAULT 'fixed' 
    CHECK (rotation_type IN ('fixed', 'odd_months', 'even_months'));

-- 2. Adicionar coluna character_revelation_date
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS character_revelation_date TIMESTAMPTZ;

-- 3. Adicionar coluna revealed
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS revealed BOOLEAN DEFAULT false;

-- 4. Adicionar coluna character_name
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS character_name TEXT;

-- 5. Adicionar coluna character_image_url
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS character_image_url TEXT;

-- 6. Criar índice para rotation_type
CREATE INDEX IF NOT EXISTS idx_collections_rotation ON collections(rotation_type);

-- 7. Criar índice parcial para character_revelation_date
CREATE INDEX IF NOT EXISTS idx_collections_revelation 
  ON collections(character_revelation_date) 
  WHERE revealed = false AND character_revelation_date IS NOT NULL;

-- 8. Atualizar coleções existentes para 'fixed'
UPDATE collections 
SET rotation_type = 'fixed' 
WHERE rotation_type IS NULL;

-- 9. Atualizar revealed para false
UPDATE collections 
SET revealed = false 
WHERE revealed IS NULL;

-- 10. Verificar resultado
SELECT 
  'SUCCESS' AS status,
  COUNT(*) AS total_collections,
  COUNT(*) FILTER (WHERE rotation_type = 'fixed') AS fixed_collections,
  COUNT(*) FILTER (WHERE rotation_type = 'odd_months') AS odd_months_collections,
  COUNT(*) FILTER (WHERE rotation_type = 'even_months') AS even_months_collections
FROM collections;
```

## Opção 2: Via Script Node.js

Execute no terminal:

```bash
node aplicar-rotation-fields-direto.mjs
```

## Opção 3: Via PowerShell

Execute no terminal:

```powershell
.\aplicar-rotation-fields.ps1
```

## Opção 4: Via Supabase CLI

Se você tem o Supabase CLI instalado:

```bash
supabase db push
```

## Verificar se funcionou

Após aplicar, execute este SQL no console para verificar:

```sql
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'collections' 
  AND column_name IN ('rotation_type', 'character_revelation_date', 'revealed', 'character_name', 'character_image_url')
ORDER BY column_name;
```

Você deve ver as 5 colunas listadas.

## O que cada campo faz?

- **rotation_type**: Define quando a coleção está disponível
  - `'fixed'`: Disponível todos os meses
  - `'odd_months'`: Disponível apenas em meses ímpares (Jan, Mar, Mai, Jul, Set, Nov)
  - `'even_months'`: Disponível apenas em meses pares (Fev, Abr, Jun, Ago, Out, Dez)

- **character_revelation_date**: Data/hora agendada para revelar um personagem

- **revealed**: Se o personagem já foi revelado (true) ou ainda é mistério (false)

- **character_name**: Nome do personagem a ser revelado

- **character_image_url**: URL da imagem do personagem a ser revelado

## Após aplicar

Recarregue a página no navegador e o erro deve desaparecer! 🎉
