# Correção do Filtro de Período no Dashboard

## Problema Identificado

O dashboard estava mostrando dados totais independente do período selecionado (hoje, 7 dias, 30 dias, etc). Mesmo sem cadastros no dia atual, mostrava o total geral.

## Causa Raiz

Várias queries no `AdminHome.tsx` NÃO estavam aplicando os filtros de data (`fromDate` e `toDate`), buscando dados totais ao invés de dados do período selecionado.

## Queries Corrigidas

### 1. Assinaturas (subscriptions)

**Antes:**
```typescript
const { count: subscriptionsCount } = await supabase
  .from("subscriptions")
  .select("*", { count: "exact", head: true })
  .eq("status", "active");
// ❌ Sem filtro de data - retorna TODAS as assinaturas ativas
```

**Depois:**
```typescript
const { count: subscriptionsCount } = await supabase
  .from("subscriptions")
  .select("*", { count: "exact", head: true })
  .eq("status", "active")
  .gte("created_at", fromDate)
  .lte("created_at", toDate);
// ✅ Com filtro de data - retorna apenas assinaturas criadas no período
```

### 2. Pré-vendas (preorders/quotes)

**Antes:**
```typescript
const { data: preorders } = await supabase
  .from("quotes")
  .select("payment_status, deposit_amount, remaining_amount")
  .eq("is_preorder", true);
// ❌ Sem filtro de data - retorna TODOS os preorders
```

**Depois:**
```typescript
const { data: preorders } = await supabase
  .from("quotes")
  .select("payment_status, deposit_amount, remaining_amount, created_at")
  .eq("is_preorder", true)
  .gte("created_at", fromDate)
  .lte("created_at", toDate);
// ✅ Com filtro de data - retorna apenas preorders do período
```

### 3. Código Duplicado Removido

**Antes:**
```typescript
const { data: currentSubscriptions } = await supabase
  .from("subscriptions")
  .select("created_at, status")
  .eq("status", "active")
  .gte("created_at", fromDate)
  .lte("created_at", toDate);
  .select("created_at, status")  // ❌ DUPLICADO
  .gte("created_at", fromDate)   // ❌ DUPLICADO
  .lte("created_at", toDate);    // ❌ DUPLICADO
```

**Depois:**
```typescript
const { data: currentSubscriptions } = await supabase
  .from("subscriptions")
  .select("created_at, status")
  .eq("status", "active")
  .gte("created_at", fromDate)
  .lte("created_at", toDate);
// ✅ Sem duplicação
```

## Queries que NÃO Precisam de Filtro de Período

Estas queries estão corretas sem filtro de data porque representam contadores de estado atual:

### 1. Modelos Totais
```typescript
const { count: modelsCount } = await supabase
  .from("models")
  .select("*", { count: "exact", head: true });
// ✅ Correto - total de modelos cadastrados (não muda com período)
```

### 2. Usuários Totais
```typescript
const { count: usersCount } = await supabase
  .from("profiles")
  .select("*", { count: "exact", head: true });
// ✅ Correto - total de usuários cadastrados (usado para comparação)
```

### 3. Fila de Upload Pendente
```typescript
const { count: queueCount } = await supabase
  .from("images_queue")
  .select("*", { count: "exact", head: true })
  .eq("status", "pending");
// ✅ Correto - itens pendentes AGORA (estado atual)
```

### 4. Tickets de Suporte Abertos
```typescript
const { count: supportCount } = await supabase
  .from("support_conversations")
  .select("*", { count: "exact", head: true })
  .eq("status", "open");
// ✅ Correto - tickets abertos AGORA (estado atual)
```

### 5. Coleções Ativas
```typescript
const { count: collectionsCount } = await supabase
  .from("collections")
  .select("*", { count: "exact", head: true })
  .eq("is_active", true);
// ✅ Correto - coleções ativas AGORA (configuração)
```

### 6. Planos de Assinatura
```typescript
const { data: allSubscriptions } = await supabase
  .from("subscription_plans")
  .select("id, name, price_pix");
// ✅ Correto - planos disponíveis (configuração SSOT)
```

## Queries que JÁ Estavam Corretas

Estas queries já aplicavam o filtro de período corretamente:

### 1. Pedidos Unificados
```typescript
const ordersResult = await fetchUnifiedOrders(
  {
    type: 'all',
    status: [],
    dateFrom: fromDate,  // ✅ Filtro aplicado
    dateTo: toDate,      // ✅ Filtro aplicado
    searchQuery: ''
  },
  { page: 1, pageSize: 10000 }
);
```

### 2. Orçamentos (quotes)
```typescript
const { data: quotes } = await supabase
  .from("quotes")
  .select("status, created_at, total_amount")
  .gte("created_at", fromDate)  // ✅ Filtro aplicado
  .lte("created_at", toDate);   // ✅ Filtro aplicado
```

### 3. Usuários do Período
```typescript
const { data: currentUsers } = await supabase
  .from("profiles")
  .select("created_at")
  .gte("created_at", fromDate)  // ✅ Filtro aplicado
  .lte("created_at", toDate);   // ✅ Filtro aplicado
```

## Impacto das Correções

### Antes
- Filtro "Hoje" mostrava dados de todos os tempos
- Filtro "7 dias" mostrava dados de todos os tempos
- Filtro "30 dias" mostrava dados de todos os tempos
- Dashboard sempre mostrava os mesmos números

### Depois
- Filtro "Hoje" mostra apenas dados de hoje
- Filtro "7 dias" mostra apenas dados dos últimos 7 dias
- Filtro "30 dias" mostra apenas dados dos últimos 30 dias
- Dashboard atualiza corretamente conforme o período selecionado

## Performance

As correções também melhoram a performance:
- Menos dados retornados do banco
- Queries mais específicas e rápidas
- Filtros aplicados no banco (não em memória)

## Verificação

Para testar se está funcionando:

1. Acesse o dashboard
2. Selecione "Hoje" no filtro de período
3. Verifique se os números são menores que "30 dias"
4. Crie um novo pedido/assinatura
5. Selecione "Hoje" novamente
6. Verifique se o novo item aparece na contagem

## Status

**CORRIGIDO** - Filtros de período agora funcionam corretamente em todas as queries relevantes.
