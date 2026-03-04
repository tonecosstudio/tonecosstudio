# 🔍 DIAGNÓSTICO E FIX - Subscription Sem Collections

## 🎯 Problema Provável

O erro 406 persiste porque a subscription existe, mas não tem registros em `subscription_collections`. Isso acontece quando:
- Subscription foi criada antes do modelo N:N
- Campo `collection_id` existe em `subscriptions`, mas não foi migrado para `subscription_collections`

## 📋 PASSO 1: Diagnóstico

### Abrir SQL Editor
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

### Executar Query de Diagnóstico

```sql
-- Verificar se subscription tem collection_id mas não tem subscription_collections
SELECT 
  s.id,
  s.collection_id,
  s.plan_type,
  s.status,
  CASE 
    WHEN sc.id IS NULL THEN '❌ SEM subscription_collections'
    ELSE '✅ COM subscription_collections'
  END as status_migracao
FROM subscriptions s
LEFT JOIN subscription_collections sc ON sc.subscription_id = s.id
WHERE s.user_id = '8cdbe271-76da-4f74-ac93-7d92f57ed244'
AND s.status = 'active';
```

### Interpretar Resultado

**Se mostrar "❌ SEM subscription_collections"**:
- A subscription existe
- Tem `collection_id` preenchido
- MAS não tem registro em `subscription_collections`
- **Solução**: Executar PASSO 2

**Se mostrar "✅ COM subscription_collections"**:
- A subscription está OK
- Problema é outro (vá para PASSO 3)

**Se não retornar nada**:
- Usuário não tem subscription ativa
- Ou o user_id está errado

## 🔧 PASSO 2: Migrar Dados (Se necessário)

Se o PASSO 1 mostrou "❌ SEM subscription_collections", execute:

```sql
-- Migrar collection_id para subscription_collections
INSERT INTO subscription_collections (subscription_id, collection_id)
SELECT 
  s.id,
  s.collection_id
FROM subscriptions s
LEFT JOIN subscription_collections sc ON sc.subscription_id = s.id
WHERE s.user_id = '8cdbe271-76da-4f74-ac93-7d92f57ed244'
AND s.status = 'active'
AND s.collection_id IS NOT NULL
AND sc.id IS NULL
ON CONFLICT (subscription_id, collection_id) DO NOTHING
RETURNING *;
```

**Resultado esperado**:
```
id | subscription_id | collection_id | added_at
---+----------------+--------------+----------
... | ... | ... | 2026-05-03...
```

Se retornar dados = Migração OK ✅

## 🧪 PASSO 3: Testar Novamente

Após executar o PASSO 2:

1. **No navegador**: Ctrl + Shift + R (hard refresh)
2. **Verificar console**: Erro 406 deve desaparecer
3. **Verificar perfil**: Assinatura deve aparecer

## 🔍 PASSO 4: Diagnóstico Avançado (Se ainda não funcionar)

### Verificar Políticas RLS

```sql
-- Ver políticas de collections
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'collections'
ORDER BY policyname;
```

Deve retornar 3 políticas:
- `collections_select_active`
- `collections_select_admin`
- `collections_select_from_subscriptions`

### Verificar Políticas de subscription_collections

```sql
-- Ver políticas de subscription_collections
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'subscription_collections'
ORDER BY policyname;
```

Deve retornar:
- `Users can view their subscription collections`
- `Admins can manage all subscription collections`

### Testar Query Manualmente

```sql
-- Simular a query que o frontend faz
SELECT 
  s.id,
  s.user_id,
  s.status,
  s.plan_type,
  json_agg(
    json_build_object(
      'collection_id', sc.collection_id,
      'collection_name', c.name,
      'collection_slug', c.slug
    )
  ) as collections
FROM subscriptions s
LEFT JOIN subscription_collections sc ON sc.subscription_id = s.id
LEFT JOIN collections c ON c.id = sc.collection_id
WHERE s.user_id = '8cdbe271-76da-4f74-ac93-7d92f57ed244'
AND s.status = 'active'
GROUP BY s.id;
```

**Se retornar dados**: RLS está OK, problema é no frontend
**Se retornar vazio**: RLS está bloqueando

## 🆘 PASSO 5: Fix Alternativo (Se RLS estiver bloqueando)

Se a query manual do PASSO 4 não retornar dados, o RLS está bloqueando. Tente:

```sql
-- Desabilitar RLS temporariamente para testar (APENAS PARA DIAGNÓSTICO!)
ALTER TABLE collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_collections DISABLE ROW LEVEL SECURITY;

-- Testar query novamente
SELECT 
  s.id,
  s.status,
  sc.collection_id,
  c.name
FROM subscriptions s
LEFT JOIN subscription_collections sc ON sc.subscription_id = s.id
LEFT JOIN collections c ON c.id = sc.collection_id
WHERE s.user_id = '8cdbe271-76da-4f74-ac93-7d92f57ed244'
AND s.status = 'active';

-- IMPORTANTE: Reabilitar RLS depois!
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_collections ENABLE ROW LEVEL SECURITY;
```

## 📊 Resumo dos Problemas Possíveis

1. ❌ **Subscription sem subscription_collections** (Mais provável)
   - Solução: PASSO 2

2. ❌ **RLS bloqueando join**
   - Solução: Verificar políticas (PASSO 4)

3. ❌ **Collection não existe ou está inativa**
   - Solução: Verificar `collections.is_active = true`

4. ❌ **Usuário não tem subscription ativa**
   - Solução: Verificar `subscriptions.status = 'active'`

## 🎯 Ação Imediata

Execute o SQL do PASSO 1 e me diga o resultado. Isso vai mostrar exatamente qual é o problema.

**Link**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
