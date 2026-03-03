# 🎯 SOLUÇÃO DEFINITIVA - Erro 406

## 📋 Resumo do Problema

- ✅ Código está correto (query usa `subscription_collections`)
- ❌ Políticas RLS do banco não permitem o join
- 🔧 Solução: Atualizar políticas RLS no banco

## ⚡ AÇÃO IMEDIATA (2 minutos)

### Passo 1: Abrir SQL Editor do Supabase

**Link direto**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

### Passo 2: Copiar e Colar Este SQL

```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Coleções ativas são públicas" ON collections;
DROP POLICY IF EXISTS "Admins podem ver todas as coleções" ON collections;
DROP POLICY IF EXISTS "Users can view active collections" ON collections;
DROP POLICY IF EXISTS "Users can view collections from their subscriptions" ON collections;
DROP POLICY IF EXISTS "Admins can view all collections" ON collections;

-- Criar políticas corretas
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

### Passo 3: Clicar em "Run"

Deve aparecer: `Success. No rows returned`

### Passo 4: Testar no Navegador

1. Pressione **Ctrl + Shift + R** (hard refresh)
2. Verifique o console - erro 406 deve desaparecer
3. Acesse `/profile` - assinatura deve aparecer

## 🔍 O Que Esse SQL Faz?

### Problema Anterior
```
Query: subscriptions → subscription_collections → collections
                                                    ↑
                                                    ❌ RLS bloqueava aqui
```

### Solução
```
Query: subscriptions → subscription_collections → collections
                                                    ↑
                                                    ✅ Nova política permite!
```

A nova política `collections_select_from_subscriptions` permite que o Supabase faça o join através de `subscription_collections`, verificando se o usuário é dono da subscription.

## ✅ Verificação

### Console do Navegador
**Antes**:
```
GET /subscriptions?...subscription_collections(collections(...))... 406
```

**Depois**:
```
GET /subscriptions?...subscription_collections(collections(...))... 200 ✅
```

### Página de Perfil
**Antes**: "Você não possui assinatura ativa"
**Depois**: "Minha Assinatura" com todos os detalhes

## 🆘 Troubleshooting

### Ainda mostra erro 406?

1. **Verificar se SQL foi executado**:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'collections';
   ```
   Deve retornar 3 políticas com nomes `collections_select_*`

2. **Limpar cache do navegador**:
   - Ctrl + Shift + R (hard refresh)
   - Ou modo anônimo (Ctrl + Shift + N)

3. **Verificar dados**:
   ```sql
   -- Substitua USER_ID
   SELECT s.*, sc.*, c.name
   FROM subscriptions s
   LEFT JOIN subscription_collections sc ON sc.subscription_id = s.id
   LEFT JOIN collections c ON c.id = sc.collection_id
   WHERE s.user_id = 'USER_ID' AND s.status = 'active';
   ```
   Se retornar vazio = usuário não tem subscription_collections associadas

### Usuário tem subscription mas não tem collections?

Pode ser que a subscription foi criada antes do modelo N:N. Precisa associar:

```sql
-- Verificar subscription sem collections
SELECT s.id, s.collection_id
FROM subscriptions s
LEFT JOIN subscription_collections sc ON sc.subscription_id = s.id
WHERE s.user_id = 'USER_ID' 
AND s.status = 'active'
AND sc.id IS NULL;

-- Se retornar algo, associar a collection legada:
INSERT INTO subscription_collections (subscription_id, collection_id)
SELECT id, collection_id
FROM subscriptions
WHERE user_id = 'USER_ID'
AND status = 'active'
AND collection_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

## 📊 Arquitetura

### Tabelas
```
subscriptions (1) ←→ (N) subscription_collections (N) ←→ (1) collections
```

### Políticas RLS
```
subscriptions:
  ✅ Users see their own (user_id = auth.uid())

subscription_collections:
  ✅ Users see their own (via subscriptions.user_id)

collections:
  ✅ Active collections (is_active = true)
  ✅ From subscriptions (via subscription_collections join) ← NOVA!
  ✅ Admins see all
```

## 🎉 Resultado Final

Após aplicar o SQL:
- ✅ Erro 406 desaparece
- ✅ Assinatura aparece no perfil
- ✅ Todas as páginas funcionam
- ✅ Join funciona corretamente

## 📝 Arquivos Relacionados

- `supabase/migrations/20260503000000_fix_collections_rls_final.sql` - Migration completa
- `check_and_fix_rls.sql` - SQL para verificação e fix
- `APLICAR_FIX_RLS_AGORA.md` - Guia detalhado

---

**TL;DR**: Copie o SQL acima → Cole no Supabase SQL Editor → Run → Hard refresh no navegador
