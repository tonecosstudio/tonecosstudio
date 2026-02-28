# 🔧 Erro 400 - rotation_type não existe

## O Problema

O navegador está tentando buscar o campo `rotation_type` da tabela `collections`, mas esse campo ainda não existe no banco de dados.

```
GET .../collections?select=rotation_type&id=eq.58db8d94... 400 (Bad Request)
```

## A Solução

Você precisa aplicar a migration que cria esse campo. Siga os passos abaixo:

### ✅ PASSO 1: Acesse o Supabase Dashboard

1. Vá em https://app.supabase.com
2. Selecione seu projeto
3. Clique em **SQL Editor** no menu lateral

### ✅ PASSO 2: Execute o SQL

Cole este código e clique em **Run**:

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
SELECT COUNT(*) as total, rotation_type 
FROM collections 
GROUP BY rotation_type;
```

### ✅ PASSO 3: Recarregue a página

Depois de executar o SQL, recarregue a página no navegador (F5 ou Ctrl+R).

O erro deve desaparecer! 🎉

---

## O que esse campo faz?

O campo `rotation_type` controla quando cada coleção está disponível:

- **`fixed`** = Disponível todos os meses (padrão)
- **`odd_months`** = Disponível apenas em meses ímpares (Jan, Mar, Mai, Jul, Set, Nov)
- **`even_months`** = Disponível apenas em meses pares (Fev, Abr, Jun, Ago, Out, Dez)

Isso permite que você tenha coleções que alternam entre meses, criando variedade para os assinantes!

---

## Precisa de ajuda?

Se o erro persistir, veja o arquivo `APLICAR_ROTATION_TYPE.md` para outras opções de aplicar a migration.
