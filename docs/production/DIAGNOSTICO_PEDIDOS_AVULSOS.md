# Diagnóstico: Pedidos Avulsos Não Aparecem

**Data**: 2026-03-08  
**Status**: Em Investigação  
**Prioridade**: Alta

## Problema Reportado

O usuário reportou que a página de pedidos (`/admin/orders`) está mostrando apenas assinaturas (subscription_deliveries), mas os pedidos avulsos (standalone_purchases) não estão aparecendo.

## Análise do Código

### 1. Estrutura da Query Principal

A função `fetchUnifiedOrders()` em `src/services/admin/orders-service.ts` busca dados de 4 tipos:

```typescript
// Linha 52-67
if (filters.type === "all" || filters.type === "subscription_delivery") {
  deliveriesPromise = fetchSubscriptionDeliveries(filters);
}

if (filters.type === "all" || filters.type === "standalone_purchase") {
  purchasesPromise = fetchStandalonePurchases(filters);
}

if (filters.type === "all" || filters.type === "manual_payment") {
  paymentsPromise = fetchManualPayments(filters);
}

if (filters.type === "all" || filters.type === "quote") {
  quotesPromise = fetchQuotes(filters);
}
```

✅ **Lógica correta**: Quando `filters.type === "all"`, todos os tipos são buscados.

### 2. Query de Standalone Purchases

A função `fetchStandalonePurchases()` (linhas 267-327):

```typescript
async function fetchStandalonePurchases(filters: OrderFilters) {
  let query = supabase.from("standalone_purchases").select(
    `
      id,
      status,
      user_id,
      collection_id,
      cycle_id,
      character_id,
      price_deposit,
      price_balance,
      price_full,
      deposit_paid_at,
      balance_paid_at,
      balance_due_date,
      deposit_voucher_url,
      balance_voucher_url,
      tracking_code,
      expected_delivery_date,
      actual_delivery_date,
      created_at,
      updated_at,
      profiles (
        id,
        full_name,
        email
      ),
      collections (
        id,
        name,
        slug
      ),
      collection_characters (
        id,
        name,
        image_url
      )
    `,
    { count: "exact" }
  );

  // Aplicar filtros de status
  if (filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  // Aplicar filtros de data
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const result = await query;
  
  if (result.error) {
    console.error('❌ Error fetching standalone purchases (orders-service):', result.error);
    console.error('Error details:', JSON.stringify(result.error, null, 2));
  }

  return result;
}
```

✅ **Query parece correta**: Usa joins apropriados e filtros.

⚠️ **Possível problema**: Há um log de erro que indica que erros podem estar ocorrendo silenciosamente.

### 3. Transformação dos Dados

Os dados são transformados em `orders-transformer.ts`:

```typescript
// Linha 127-131
const unifiedOrders: UnifiedOrder[] = [
  ...transformDeliveries(deliveriesResult.data || [], profilesMap, collectionsMap),
  ...transformPurchases(purchasesResult.data || []),
  ...transformManualPayments(paymentsResult.data || []),
  ...transformQuotes(quotesResult.data || [], quoteItemsMap),
];
```

✅ **Lógica correta**: Todos os tipos são unificados em um único array.

## Possíveis Causas

### Causa 1: Erro Silencioso na Query ⚠️

**Probabilidade**: Alta

O código tem tratamento de erro, mas pode estar retornando `{ data: [], count: 0 }` em caso de erro:

```typescript
// Linha 70-73
const [deliveriesResult, purchasesResult, paymentsResult, quotesResult] = await Promise.all([
  deliveriesPromise || Promise.resolve({ data: [], count: 0 }),
  purchasesPromise || Promise.resolve({ data: [], count: 0 }),
  // ...
]);
```

Se `fetchStandalonePurchases()` lançar um erro, ele é capturado mas pode não ser propagado corretamente.

### Causa 2: Problema com Joins no Supabase ⚠️

**Probabilidade**: Média

A query usa joins para `profiles`, `collections` e `collection_characters`. Se algum desses relacionamentos estiver quebrado (foreign keys inválidas, dados órfãos), o Supabase pode retornar erro ou dados vazios.

### Causa 3: Filtros Aplicados Incorretamente ⚠️

**Probabilidade**: Baixa

Se o filtro de status estiver ativo e não incluir os status dos pedidos avulsos, eles não aparecerão. Mas o código parece correto.

### Causa 4: Não Há Dados no Banco ⚠️

**Probabilidade**: Média

Pode simplesmente não haver pedidos avulsos cadastrados no banco de dados.

## Próximos Passos

### 1. Verificar Dados no Banco ✅

Execute o script de diagnóstico:

```bash
# No Supabase SQL Editor
psql -f scripts/diagnostics/verificar-pedidos-avulsos.sql
```

Ou execute manualmente no Supabase Dashboard:

```sql
-- Contar pedidos avulsos
SELECT COUNT(*) FROM standalone_purchases;

-- Ver últimos 10 pedidos avulsos
SELECT id, status, user_id, collection_id, created_at 
FROM standalone_purchases 
ORDER BY created_at DESC 
LIMIT 10;
```

### 2. Verificar Logs de Erro no Console

Abra o console do navegador na página `/admin/orders` e procure por:

```
❌ Error fetching standalone purchases (orders-service):
```

### 3. Testar Query Diretamente no Supabase

Execute a query exata no Supabase SQL Editor para ver se retorna dados:

```sql
SELECT 
  sp.id,
  sp.status,
  sp.user_id,
  sp.collection_id,
  sp.created_at,
  p.full_name,
  p.email,
  c.name as collection_name
FROM standalone_purchases sp
LEFT JOIN profiles p ON sp.user_id = p.id
LEFT JOIN collections c ON sp.collection_id = p.id
ORDER BY sp.created_at DESC
LIMIT 10;
```

### 4. Adicionar Logging Detalhado

Temporariamente adicionar logs para debug:

```typescript
// Em fetchUnifiedOrders()
console.log('🔍 Fetching orders with filters:', filters);
console.log('📦 Deliveries result:', deliveriesResult);
console.log('🛒 Purchases result:', purchasesResult);
console.log('💰 Payments result:', paymentsResult);
console.log('📋 Quotes result:', quotesResult);
```

## Solução Proposta

Após identificar a causa raiz, implementar uma das seguintes soluções:

### Se for erro silencioso:
- Melhorar tratamento de erros
- Adicionar logs mais detalhados
- Mostrar mensagem de erro na UI

### Se for problema com joins:
- Verificar integridade referencial no banco
- Corrigir dados órfãos
- Ajustar query para usar LEFT JOIN se necessário

### Se não houver dados:
- Criar dados de teste
- Documentar como criar pedidos avulsos
- Adicionar mensagem informativa na UI

### Se for problema de filtros:
- Revisar lógica de filtros
- Garantir que filtros padrão incluam todos os status

## Decisão: Criar Nova Página

O usuário solicitou criar uma página TOTALMENTE NOVA, repaginada e profissional. Isso é uma boa oportunidade para:

1. ✅ Corrigir o problema dos pedidos avulsos
2. ✅ Melhorar a arquitetura e design
3. ✅ Implementar melhores práticas
4. ✅ Separar responsabilidades
5. ✅ Adicionar testes

## Próximo Documento

Após diagnóstico, criar:
- `NOVA_PAGINA_PEDIDOS_DESIGN.md` - Design e arquitetura da nova página
- `NOVA_PAGINA_PEDIDOS_IMPLEMENTACAO.md` - Plano de implementação
