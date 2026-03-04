# Análise: Discrepância entre Dashboard e Página de Pedidos

## Problema Reportado

"Na página pedidos existe 1, por que no dashboard não mostra?"

---

## Análise Técnica

### 1. O que o Dashboard Busca

**Arquivo:** `src/pages/admin/AdminHome.tsx` (linhas 110-120)

```typescript
// Orçamentos (período atual)
const { data: quotes } = await supabase
  .from("quotes")
  .select("status, created_at, total_amount")
  .gte("created_at", fromDate)
  .lte("created_at", toDate);
```

**Tabela consultada:** `quotes`
**Filtro:** Apenas registros dentro do período selecionado (últimos 30 dias por padrão)

---

### 2. O que a Página de Pedidos Busca

**Arquivo:** `src/services/admin/orders-service.ts`

```typescript
export async function fetchUnifiedOrders(
  filters: OrderFilters,
  pagination: PaginationParams
): Promise<PaginatedResponse<UnifiedOrder>> {
  
  // Busca de 4 tabelas diferentes:
  
  // 1. Entregas de assinatura
  if (filters.type === "all" || filters.type === "subscription_delivery") {
    deliveriesPromise = fetchSubscriptionDeliveries(filters);
  }

  // 2. Compras avulsas
  if (filters.type === "all" || filters.type === "standalone_purchase") {
    purchasesPromise = fetchStandalonePurchases(filters);
  }

  // 3. Pagamentos manuais
  if (filters.type === "all" || filters.type === "manual_payment") {
    paymentsPromise = fetchManualPayments(filters);
  }

  // 4. Orçamentos
  if (filters.type === "all" || filters.type === "quote") {
    quotesPromise = fetchQuotes(filters);
  }
}
```

**Tabelas consultadas:**
- `subscription_deliveries`
- `standalone_purchases`
- `manual_payments`
- `quotes`

**Filtro:** Sem filtro de data por padrão (mostra todos os registros)

---

## Causa Raiz da Discrepância

### ❌ Problema 1: Tabelas Diferentes

**Dashboard busca:** Apenas `quotes`
**Página Pedidos busca:** 4 tabelas diferentes

O pedido que aparece na página de pedidos pode estar em:
- `subscription_deliveries` (entrega de assinatura)
- `standalone_purchases` (compra avulsa)
- `manual_payments` (pagamento manual)

E NÃO estar em `quotes`.

### ❌ Problema 2: Filtro de Data

**Dashboard:** Filtra por período (últimos 30 dias por padrão)
**Página Pedidos:** Sem filtro de data por padrão

Se o pedido foi criado há mais de 30 dias, ele NÃO aparecerá no dashboard.

### ❌ Problema 3: Nomenclatura Confusa

O dashboard chama de "Orçamentos" mas a página chama de "Pedidos".

São conceitos diferentes:
- **Orçamento (quote):** Solicitação de preço, ainda não é pedido
- **Pedido (order):** Pode ser entrega de assinatura, compra avulsa, etc.

---

## Qual Página Está Errada?

### ⚠️ AMBAS têm problemas, mas de naturezas diferentes:

### Dashboard (AdminHome)

**Problemas:**
1. ❌ Busca apenas `quotes`, não pedidos reais
2. ❌ Filtro de data pode esconder dados
3. ❌ Nomenclatura confusa ("Orçamentos" vs "Pedidos")
4. ❌ Não mostra dados unificados

**O que deveria fazer:**
- Buscar de todas as tabelas de pedidos
- Mostrar total real de pedidos
- Ter opção de ver todos os períodos

### Página de Pedidos (OrdersPage)

**Problemas:**
1. ✅ Busca correta de múltiplas tabelas
2. ✅ Unifica dados corretamente
3. ⚠️ Sem filtro de data por padrão (pode ser lento com muitos dados)

**O que está certo:**
- Arquitetura correta
- Busca unificada
- Dados completos

---

## Precisa de SSOT?

### ❌ NÃO, este não é um problema de SSOT

**SSOT é para:** Configurações estáticas (preços, limites, textos)

**Este problema é:** Discrepância de queries e lógica de negócio

### O que precisa:

1. **Padronizar queries** - Dashboard deve usar mesma lógica da página de pedidos
2. **Unificar conceitos** - Decidir se é "orçamento" ou "pedido"
3. **Alinhar filtros** - Ambas páginas devem ter mesmos filtros disponíveis

---

## Solução Recomendada

### Opção 1: Dashboard Buscar Pedidos Unificados (RECOMENDADO)

```typescript
// AdminHome.tsx
import { fetchUnifiedOrders } from '@/services/admin/orders-service';

// Dentro do statsQuery:
const ordersResult = await fetchUnifiedOrders(
  {
    type: 'all',
    status: [],
    dateFrom: fromDate,
    dateTo: toDate,
    searchQuery: ''
  },
  {
    page: 1,
    pageSize: 10000 // Buscar todos para contagem
  }
);

const ordersStats = {
  total: ordersResult.total,
  byType: {
    subscriptions: ordersResult.data.filter(o => o.type === 'subscription_delivery').length,
    purchases: ordersResult.data.filter(o => o.type === 'standalone_purchase').length,
    payments: ordersResult.data.filter(o => o.type === 'manual_payment').length,
    quotes: ordersResult.data.filter(o => o.type === 'quote').length,
  },
  byStatus: {
    pending: ordersResult.data.filter(o => o.status === 'pending').length,
    confirmed: ordersResult.data.filter(o => o.status === 'confirmed').length,
    shipped: ordersResult.data.filter(o => o.status === 'shipped').length,
    delivered: ordersResult.data.filter(o => o.status === 'delivered').length,
  }
};
```

**Vantagens:**
- ✅ Dados consistentes entre dashboard e página
- ✅ Usa mesma lógica de negócio
- ✅ Fácil manutenção

**Desvantagens:**
- ⚠️ Pode ser mais lento (busca de múltiplas tabelas)
- ⚠️ Precisa otimizar para não buscar dados desnecessários

### Opção 2: Criar View no Banco (MELHOR PERFORMANCE)

```sql
CREATE VIEW unified_orders_summary AS
SELECT 
  'subscription_delivery' as type,
  id,
  created_at,
  status,
  user_id,
  collection_id
FROM subscription_deliveries
UNION ALL
SELECT 
  'standalone_purchase' as type,
  id,
  created_at,
  status,
  user_id,
  collection_id
FROM standalone_purchases
UNION ALL
SELECT 
  'manual_payment' as type,
  id,
  created_at,
  status,
  user_id,
  NULL as collection_id
FROM manual_payments
UNION ALL
SELECT 
  'quote' as type,
  id,
  created_at,
  status,
  user_id,
  NULL as collection_id
FROM quotes;
```

Depois no dashboard:

```typescript
const { count: ordersCount } = await supabase
  .from("unified_orders_summary")
  .select("*", { count: "exact", head: true })
  .gte("created_at", fromDate)
  .lte("created_at", toDate);
```

**Vantagens:**
- ✅ Performance excelente
- ✅ Query simples no código
- ✅ Dados consistentes

**Desvantagens:**
- ⚠️ Requer migração de banco
- ⚠️ Mais complexidade na infraestrutura

### Opção 3: Separar Métricas (MAIS CLARO)

Ter cards separados no dashboard:

- **Orçamentos** - Apenas `quotes`
- **Entregas de Assinatura** - Apenas `subscription_deliveries`
- **Compras Avulsas** - Apenas `standalone_purchases`
- **Pagamentos Manuais** - Apenas `manual_payments`
- **Total de Pedidos** - Soma de todos

**Vantagens:**
- ✅ Clareza total
- ✅ Fácil de entender
- ✅ Queries simples

**Desvantagens:**
- ⚠️ Mais cards no dashboard
- ⚠️ Pode ficar poluído

---

## Recomendação Final

### 🎯 Implementar Opção 1 + Opção 3

1. **Criar card "Total de Pedidos"** no dashboard usando `fetchUnifiedOrders`
2. **Manter cards separados** para cada tipo (orçamentos, assinaturas, etc.)
3. **Adicionar filtro de período** na página de pedidos
4. **Padronizar nomenclatura** em todo o sistema

### Exemplo de Cards no Dashboard:

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Total de Pedidos    │  │ Orçamentos          │  │ Entregas Assinatura │
│ 156                 │  │ 45 pendentes        │  │ 89 confirmadas      │
│ (últimos 30 dias)   │  │                     │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐
│ Compras Avulsas     │  │ Pagamentos Manuais  │
│ 12 em produção      │  │ 10 pendentes        │
│                     │  │                     │
└─────────────────────┘  └─────────────────────┘
```

---

## Conclusão

**Qual página está com erro?**

❌ **Dashboard** - Busca apenas `quotes`, não pedidos reais

✅ **Página de Pedidos** - Busca correta e unificada

**Precisa de SSOT?**

❌ **NÃO** - Este é um problema de lógica de negócio, não de configuração

**O que fazer?**

1. Corrigir dashboard para buscar pedidos unificados
2. Adicionar cards separados por tipo
3. Padronizar nomenclatura
4. Alinhar filtros entre páginas

**Prioridade:** ALTA - Dados inconsistentes confundem administradores
