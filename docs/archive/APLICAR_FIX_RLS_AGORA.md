# 🔧 APLICAR FIX RLS - URGENTE

## 🎯 Problema Identificado

A query está CORRETA (`subscription_collections(collections(...))`), mas o erro 406 persiste porque as **políticas RLS** da tabela `collections` não foram aplicadas corretamente no banco de dados.

## ⚡ Solução Imediata

### Passo 1: Abrir Supabase SQL Editor

Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

### Passo 2: Copiar e Colar o SQL

Abra o arquivo `check_and_fix_rls.sql` e copie TODO o conteúdo.

Ou copie daqui:

```sql
-- Remover políticas antigas de collections
DROP POLICY IF EXISTS "Coleções ativas são públicas" ON collections;
DROP POLICY IF EXISTS "Admins podem ver todas as coleções" ON collections;
DROP POLICY IF EXISTS "Users can view active collections" ON collections;
DROP POLICY IF EXISTS "Users can view collections from their subscriptions" ON collections;
DROP POLICY IF EXISTS "Admins can view all collections" ON collections;

-- Criar políticas novas e corretas
CREATE POLICY "collections_select_active"
  ON collections FOR SELECT
  USING (is_active = true);

CREATE POLICY "collections_select_from_subscriptions"
  ON collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM subscription_collections sc
      JOIN subscriptions s ON s.id = sc.subscription_id
      WHERE sc.collection_id = collections.id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "collections_select_admin"
  ON collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
```

### Passo 3: Executar

Clique no botão **"Run"** (ou pressione Ctrl+Enter)

### Passo 4: Verificar

Deve aparecer:
```
Success. No rows returned
```

## 🧪 Testar

Após aplicar o SQL:

1. **No navegador**: Pressione **Ctrl + Shift + R** (hard refresh)
2. **Verificar console**: Não deve haver erro 406
3. **Verificar perfil**: Assinatura deve aparecer

## 🔍 O Que Esse SQL Faz?

### Remove Políticas Antigas
- Remove todas as políticas antigas que podem estar conflitando
- Garante que começamos do zero

### Cria 3 Novas Políticas

1. **collections_select_active**
   - Permite que qualquer usuário autenticado veja coleções ativas
   - Usado para: Catálogo público de coleções

2. **collections_select_from_subscriptions**
   - Permite que usuários vejam coleções de suas próprias subscriptions
   - Usado para: Join `subscriptions → subscription_collections → collections`
   - **ESTA É A CHAVE PARA RESOLVER O 406!**

3. **collections_select_admin**
   - Permite que admins vejam todas as coleções
   - Usado para: Painel administrativo

## 📊 Por Que o Erro 406 Acontecia?

### Fluxo da Query
```
1. User faz query: subscriptions → subscription_collections → collections
2. Supabase verifica RLS em cada tabela:
   ✅ subscriptions: OK (user_id = auth.uid())
   ✅ subscription_collections: OK (EXISTS subscription com user_id)
   ❌ collections: BLOQUEADO (política antiga não permite join)
3. Resultado: 406 Not Acceptable
```

### Com a Nova Política
```
1. User faz query: subscriptions → subscription_collections → collections
2. Supabase verifica RLS em cada tabela:
   ✅ subscriptions: OK (user_id = auth.uid())
   ✅ subscription_collections: OK (EXISTS subscription com user_id)
   ✅ collections: OK (nova política permite join via subscription_collections)
3. Resultado: 200 OK ✅
```

## 🆘 Se Não Funcionar

### Verificar se o SQL foi executado

No Supabase SQL Editor, execute:

```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'collections'
ORDER BY policyname;
```

Deve retornar:
```
collections_select_active
collections_select_admin
collections_select_from_subscriptions
```

### Verificar se há erro no SQL

Se aparecer erro ao executar, copie a mensagem de erro e me envie.

### Testar query diretamente

No Supabase SQL Editor:

```sql
-- Substitua USER_ID pelo ID do usuário
SELECT 
  s.id,
  s.status,
  sc.collection_id,
  c.name as collection_name
FROM subscriptions s
LEFT JOIN subscription_collections sc ON sc.subscription_id = s.id
LEFT JOIN collections c ON c.id = sc.collection_id
WHERE s.user_id = 'USER_ID'
AND s.status = 'active';
```

Se retornar dados = RLS OK
Se retornar vazio = Problema de dados ou RLS

## 📝 Alternativa: Via Migration

Se preferir aplicar via migration (para versionamento):

```bash
# Criar nova migration
npx supabase migration new fix_collections_rls_final

# Copiar o SQL para o arquivo criado
# Aplicar
npx supabase db push
```

## 🎯 Resumo

1. ✅ Código corrigido (query usa `subscription_collections`)
2. ⏳ RLS precisa ser corrigido (aplicar SQL acima)
3. 🧪 Testar após aplicar

**Link direto**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

**SQL**: Copie de `check_and_fix_rls.sql` (linhas 24-56)
