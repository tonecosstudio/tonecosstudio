# Próximos Passos: Correção da Página de Pedidos

## Status Atual: Fase 1 Concluída ✅

---

## FASE 2: OTIMIZAÇÃO DE QUERIES (PRÓXIMA)

### Prioridade: 🔴 Alta
### Tempo Estimado: 3-4 horas
### Complexidade: Média-Alta

---

## OBJETIVOS DA FASE 2

1. ✅ Eliminar queries N+1
2. ✅ Implementar joins corretos no Supabase
3. ✅ Implementar full-text search no PostgreSQL
4. ✅ Adicionar índices necessários
5. ✅ Otimizar busca de dados relacionados

---

## PROBLEMAS A RESOLVER

### 1. Queries N+1 em fetchSubscriptionDeliveries

**Arquivo**: `src/services/admin/orders-service.ts`
**Linhas**: ~100-140

**Problema Atual**:
```typescript
// 1. Busca deliveries
const deliveriesResult = await fetchSubscriptionDeliveries(filters);

// 2. Extrai IDs únicos
const userIds = [...new Set(deliveriesResult.data.map(d => d.subscriptions?.user_id))];
const collectionIds = [...new Set(deliveriesResult.data.map(d => d.subscriptions?.collection_id))];

// 3. Busca profiles separadamente (N+1)
const { data: profiles } = await supabase
  .from("profiles")
  .select("id, full_name, email")
  .in("id", userIds);

// 4. Busca collections separadamente (N+1)
const { data: collections } = await supabase
  .from("collections")
  .select("id, name, slug")
  .in("id", collectionIds);
```

**Solução**:
```typescript
// Buscar tudo em uma única query usando joins
const { data, error } = await supabase
  .from("subscription_deliveries")
  .select(`
    id,
    status,
    delivery_number,
    tracking_code,
    expected_delivery_date,
    actual_delivery_date,
    reveal_date,
    created_at,
    updated_at,
    subscription_id,
    character_id,
    subscriptions!inner (
      id,
      user_id,
      collection_id,
      plan_type,
      deliveries_completed,
      deliveries_total,
      status,
      profiles!inner (
        id,
        full_name,
        email
      ),
      collections!inner (
        id,
        name,
        slug
      )
    ),
    collection_characters (
      id,
      name,
      image_url
    )
  `)
  .in("status", filters.status)
  .gte("created_at", filters.dateFrom)
  .lte("created_at", filters.dateTo);
```

### 2. Busca em Memória

**Arquivo**: `src/services/admin/orders-service.ts`
**Linhas**: ~180-195

**Problema Atual**:
```typescript
// Busca TODOS os pedidos e depois filtra em memória
if (filters.searchQuery && filters.searchQuery.trim()) {
  const query = filters.searchQuery.toLowerCase().trim();
  filteredOrders = unifiedOrders.filter(
    (order) =>
      order.customer.name.toLowerCase().includes(query) ||
      order.customer.email.toLowerCase().includes(query) ||
      order.id.toLowerCase().includes(query) ||
      (order.trackingCode && order.trackingCode.toLowerCase().includes(query))
  );
}
```

**Solução**:
1. Implementar full-text search no PostgreSQL
2. Criar índices GIN para busca eficiente
3. Usar a função RPC `search_unified_orders()`

**Migration Necessária**:
```sql
-- Criar índices GIN para full-text search
CREATE INDEX IF NOT EXISTS idx_profiles_fulltext 
ON profiles USING GIN (to_tsvector('portuguese', full_name || ' ' || email));

CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_fulltext 
ON subscription_deliveries USING GIN (to_tsvector('portuguese', id || ' ' || COALESCE(tracking_code, '')));

CREATE INDEX IF NOT EXISTS idx_standalone_purchases_fulltext 
ON standalone_purchases USING GIN (to_tsvector('portuguese', id || ' ' || COALESCE(tracking_code, '')));

-- Criar função RPC para busca unificada
CREATE OR REPLACE FUNCTION search_unified_orders(
  search_query TEXT,
  order_type_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
  order_id UUID,
  order_type TEXT,
  rank REAL
) AS $$
BEGIN
  -- Implementação da busca full-text
  -- Ver migration 20260426000000_create_fulltext_search_indexes.sql
END;
$$ LANGUAGE plpgsql;
```

### 3. Prefetch Agressivo

**Arquivo**: `src/hooks/admin/useOrdersQuery.ts`
**Linhas**: ~110-120

**Problema Atual**:
```typescript
// Prefetch automático de TODAS as páginas
useEffect(() => {
  if (query.data && query.isSuccess && pagination.page < query.data.totalPages) {
    const timeoutId = setTimeout(() => {
      prefetchNextPage(); // Pode carregar dados desnecessários
    }, 100);
    return () => clearTimeout(timeoutId);
  }
}, [query.data, query.isSuccess, pagination.page, filters]);
```

**Solução**:
```typescript
// Prefetch apenas quando usuário está próximo do fim da página
// Usar hook useScrollPrefetch com threshold de 0.5 (50% da página)
useScrollPrefetch({
  onPrefetch: prefetchNextPage,
  threshold: 0.5, // Prefetch quando chegar na metade da página
  enabled: !isLastPage && !isLoading && !isError
});
```

---

## ARQUIVOS A MODIFICAR

### 1. Serviço de Pedidos
**Arquivo**: `src/services/admin/orders-service.ts`

**Mudanças**:
- Refatorar `fetchSubscriptionDeliveries()` para usar joins
- Refatorar `fetchStandalonePurchases()` para usar joins
- Implementar `searchOrdersWithFullText()` corretamente
- Remover busca em memória

### 2. Migration de Índices
**Arquivo**: `supabase/migrations/20260308120000_optimize_orders_queries.sql` (novo)

**Conteúdo**:
```sql
-- Índices para full-text search
CREATE INDEX IF NOT EXISTS idx_profiles_fulltext 
ON profiles USING GIN (to_tsvector('portuguese', full_name || ' ' || email));

CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_fulltext 
ON subscription_deliveries USING GIN (to_tsvector('portuguese', id::text || ' ' || COALESCE(tracking_code, '')));

CREATE INDEX IF NOT EXISTS idx_standalone_purchases_fulltext 
ON standalone_purchases USING GIN (to_tsvector('portuguese', id::text || ' ' || COALESCE(tracking_code, '')));

-- Índices para joins
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_subscription_id 
ON subscription_deliveries(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
ON subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_collection_id 
ON subscriptions(collection_id);

CREATE INDEX IF NOT EXISTS idx_standalone_purchases_user_id 
ON standalone_purchases(user_id);

CREATE INDEX IF NOT EXISTS idx_standalone_purchases_collection_id 
ON standalone_purchases(collection_id);

-- Índices para filtros
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_status 
ON subscription_deliveries(status);

CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_created_at 
ON subscription_deliveries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_standalone_purchases_status 
ON standalone_purchases(status);

CREATE INDEX IF NOT EXISTS idx_standalone_purchases_created_at 
ON standalone_purchases(created_at DESC);
```

### 3. Hook de Query
**Arquivo**: `src/hooks/admin/useOrdersQuery.ts`

**Mudanças**:
- Remover prefetch automático agressivo
- Manter apenas prefetch baseado em scroll (já implementado)

---

## TESTES NECESSÁRIOS

### 1. Teste de Performance

**Antes**:
```bash
# Medir tempo de carregamento
# Contar número de queries
# Verificar uso de memória
```

**Depois**:
```bash
# Comparar tempo de carregamento
# Verificar redução de queries
# Confirmar uso de memória otimizado
```

### 2. Teste de Funcionalidade

- [ ] Busca retorna resultados corretos
- [ ] Filtros funcionam corretamente
- [ ] Paginação funciona
- [ ] Detalhes de pedido carregam
- [ ] Joins retornam dados completos

### 3. Teste de Escalabilidade

- [ ] Testar com 100 pedidos
- [ ] Testar com 1000 pedidos
- [ ] Testar com 10000 pedidos
- [ ] Verificar tempo de resposta

---

## CHECKLIST DE IMPLEMENTAÇÃO

### Preparação
- [ ] Ler documentação do Supabase sobre joins
- [ ] Ler documentação do PostgreSQL sobre full-text search
- [ ] Fazer backup do código atual
- [ ] Criar branch para Fase 2

### Implementação
- [ ] Criar migration de índices
- [ ] Aplicar migration no banco de desenvolvimento
- [ ] Refatorar `fetchSubscriptionDeliveries()`
- [ ] Refatorar `fetchStandalonePurchases()`
- [ ] Implementar `searchOrdersWithFullText()`
- [ ] Remover busca em memória
- [ ] Ajustar prefetch

### Testes
- [ ] Testar queries no banco diretamente
- [ ] Testar busca com diferentes termos
- [ ] Testar filtros combinados
- [ ] Testar paginação
- [ ] Medir performance

### Validação
- [ ] Verificar diagnósticos TypeScript
- [ ] Testar funcionalidade completa
- [ ] Comparar performance antes/depois
- [ ] Documentar mudanças

### Finalização
- [ ] Atualizar documentação
- [ ] Criar PR com descrição detalhada
- [ ] Solicitar code review
- [ ] Merge após aprovação

---

## RECURSOS ÚTEIS

### Documentação
- [Supabase Joins](https://supabase.com/docs/guides/database/joins-and-nesting)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [PostgreSQL GIN Indexes](https://www.postgresql.org/docs/current/gin.html)

### Exemplos de Código
- Ver `supabase/migrations/20260426000000_create_fulltext_search_indexes.sql`
- Ver `src/services/admin/orders-service.ts` linha 1000+ (função searchOrdersWithFullText)

---

## ESTIMATIVA DE TEMPO

| Tarefa | Tempo Estimado |
|--------|----------------|
| Criar migration de índices | 30 min |
| Refatorar queries com joins | 1-1.5 horas |
| Implementar full-text search | 1-1.5 horas |
| Testes e validação | 30-45 min |
| Documentação | 15-30 min |
| **TOTAL** | **3-4 horas** |

---

## APÓS CONCLUSÃO DA FASE 2

### Próxima Fase: Fase 3 (Correção de Lógica)

**Objetivos**:
- Consolidar validação de status
- Implementar sanitização de entrada
- Melhorar feedback visual
- Remover código duplicado

**Tempo Estimado**: 2-3 horas

---

## CONTATO E SUPORTE

Para dúvidas ou assistência durante a implementação:
- Consulte `docs/production/ANALISE_COMPLETA_PEDIDOS.md`
- Consulte `docs/production/RESUMO_CORRECOES_PEDIDOS.md`
- Consulte este documento para instruções detalhadas

---

**Boa sorte com a Fase 2! 🚀**
