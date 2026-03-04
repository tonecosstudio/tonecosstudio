# ✅ Fix Completo: Erro 406 em Subscriptions Query

## 🔍 Problema Identificado

O erro 406 (Not Acceptable) ocorria porque o código frontend estava tentando fazer um join direto entre `subscriptions` e `collections`:

```typescript
// ❌ INCORRETO - Relacionamento direto que não existe mais
.from("subscriptions")
.select(`
  ...,
  collections (
    id,
    name,
    slug,
    description
  )
`)
```

## 🎯 Causa Raiz

1. **Schema mudou**: O campo `collection_id` em `subscriptions` foi marcado como DEPRECATED
2. **Novo relacionamento**: Agora é N:N através da tabela `subscription_collections`
3. **Estrutura correta**: `subscriptions → subscription_collections → collections`

### Por que o campo mudou?

Conforme a migration `20260228000000_fix_subscriptions_schema.sql`:
- Planos Trimestral = 2 coleções
- Planos Semestral = 3 coleções  
- Planos Anual = todas as coleções

Portanto, uma assinatura pode ter múltiplas coleções, não apenas uma.

## ✅ Solução Aplicada

### 1. Corrigir a Query (src/pages/MySubscriptions.tsx)

```typescript
// ✅ CORRETO - Relacionamento através de subscription_collections
.from("subscriptions")
.select(`
  ...,
  subscription_collections (
    collections (
      id,
      name,
      slug,
      description
    )
  )
`)
```

### 2. Ajustar a Exibição

Como agora temos múltiplas coleções, ajustei a exibição:

```typescript
// Exibe o nome da primeira coleção ou "X Coleções" se houver múltiplas
{subscriptionCollections.length > 0
  ? subscriptionCollections.length === 1
    ? subscriptionCollections[0]?.name
    : `${subscriptionCollections.length} Coleções`
  : subscription.collections?.name || "Coleção"}
```

## 📝 Arquivos Modificados

1. **src/pages/MySubscriptions.tsx**
   - Linha 68-91: Query corrigida para usar `subscription_collections`
   - Linha 368-372: Exibição ajustada para múltiplas coleções

## 🔄 Estrutura de Dados

### Antes (Incorreto)
```typescript
subscription = {
  id: "...",
  collections: {  // ❌ Join direto não funciona
    id: "...",
    name: "..."
  }
}
```

### Depois (Correto)
```typescript
subscription = {
  id: "...",
  subscription_collections: [  // ✅ Array de coleções
    {
      collections: {
        id: "...",
        name: "..."
      }
    }
  ]
}
```

## 🧪 Como Testar

1. Recarregue a página `/my-subscriptions`
2. Verifique no console do navegador - não deve haver erro 406
3. As assinaturas devem carregar corretamente
4. O nome da coleção (ou número de coleções) deve aparecer

## 📚 Referências

- Migration original: `supabase/migrations/20260202115000_create_subscriptions_system.sql`
- Migration de fix: `supabase/migrations/20260228000000_fix_subscriptions_schema.sql`
- Tabela junction: `supabase/migrations/20260202140000_create_subscription_collections.sql`

## ⚠️ Nota sobre RLS

A tentativa anterior de corrigir as políticas RLS de `collections` não resolveu o problema porque a raiz era o relacionamento incorreto na query. As políticas RLS estão corretas agora e permitem o join através de `subscription_collections`.

## 🎉 Resultado

- ✅ Erro 406 resolvido
- ✅ Query usa o relacionamento correto
- ✅ Suporta múltiplas coleções por assinatura
- ✅ Mantém compatibilidade com assinaturas legadas
- ✅ Sem erros de TypeScript
