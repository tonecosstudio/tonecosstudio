# Otimizações de Banco de Dados

## Requisitos: 18.1-18.15
## Tarefa: 25.1 Implementar otimizações de performance

Este documento descreve as otimizações de banco de dados implementadas para melhorar a performance do sistema de pagamento manual.

## Índices Implementados

### Tabela: manual_payments

```sql
-- Índice para busca por usuário (usado frequentemente)
CREATE INDEX IF NOT EXISTS idx_manual_payments_user_id 
ON manual_payments(user_id);

-- Índice para busca por status (usado em filtros)
CREATE INDEX IF NOT EXISTS idx_manual_payments_status 
ON manual_payments(status);

-- Índice para busca por método de pagamento
CREATE INDEX IF NOT EXISTS idx_manual_payments_payment_method_id 
ON manual_payments(payment_method_id);

-- Índice para busca por data de criação (usado em ordenação)
CREATE INDEX IF NOT EXISTS idx_manual_payments_created_at 
ON manual_payments(created_at DESC);

-- Índice composto para queries comuns (usuário + status)
CREATE INDEX IF NOT EXISTS idx_manual_payments_user_status 
ON manual_payments(user_id, status);

-- Índice para busca por número de referência (único, já existe)
-- CREATE UNIQUE INDEX idx_manual_payments_reference_number 
-- ON manual_payments(reference_number);

-- Índice para busca por quote_id
CREATE INDEX IF NOT EXISTS idx_manual_payments_quote_id 
ON manual_payments(quote_id) WHERE quote_id IS NOT NULL;

-- Índice para busca por subscription_id
CREATE INDEX IF NOT EXISTS idx_manual_payments_subscription_id 
ON manual_payments(subscription_id) WHERE subscription_id IS NOT NULL;
```

### Tabela: payment_files

```sql
-- Índice para busca por pagamento (usado frequentemente)
CREATE INDEX IF NOT EXISTS idx_payment_files_payment_id 
ON payment_files(payment_id);

-- Índice para busca por usuário que fez upload
CREATE INDEX IF NOT EXISTS idx_payment_files_uploaded_by 
ON payment_files(uploaded_by);

-- Índice para busca por data de upload
CREATE INDEX IF NOT EXISTS idx_payment_files_created_at 
ON payment_files(created_at DESC);
```

### Tabela: payment_audit_log

```sql
-- Índice para busca por pagamento (usado frequentemente)
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_payment_id 
ON payment_audit_log(payment_id);

-- Índice para busca por admin
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_admin_id 
ON payment_audit_log(admin_id) WHERE admin_id IS NOT NULL;

-- Índice para busca por tipo de ação
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_action_type 
ON payment_audit_log(action_type);

-- Índice para busca por data
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_created_at 
ON payment_audit_log(created_at DESC);
```

### Tabela: admin_payment_methods

```sql
-- Índice para busca por métodos ativos
CREATE INDEX IF NOT EXISTS idx_admin_payment_methods_is_active 
ON admin_payment_methods(is_active) WHERE is_active = true;

-- Índice para ordenação por display_order
CREATE INDEX IF NOT EXISTS idx_admin_payment_methods_display_order 
ON admin_payment_methods(display_order);
```

## Cache de Queries

### React Query Cache Configuration

```typescript
// Configuração de cache para métodos de pagamento (5 minutos)
const paymentMethodsQuery = useQuery({
  queryKey: ['payment-methods', 'active'],
  queryFn: listActivePaymentMethods,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
});

// Configuração de cache para detalhes de pagamento (1 minuto)
const paymentDetailsQuery = useQuery({
  queryKey: ['payment-details', paymentId],
  queryFn: () => getPaymentById(paymentId),
  staleTime: 1 * 60 * 1000, // 1 minute
  gcTime: 5 * 60 * 1000, // 5 minutes
});

// Configuração de cache para lista de pagamentos (30 segundos)
const paymentsListQuery = useQuery({
  queryKey: ['payments-list', filters],
  queryFn: () => listPayments(filters),
  staleTime: 30 * 1000, // 30 seconds
  gcTime: 2 * 60 * 1000, // 2 minutes
});
```

## Paginação

### Implementação de Paginação Server-Side

```typescript
// Paginação com 25 itens por página
const PAGE_SIZE = 25;

async function fetchPayments(pageParam: number = 0) {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from('manual_payments')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  return {
    payments: data || [],
    nextCursor: count && from + PAGE_SIZE < count ? pageParam + 1 : null,
  };
}
```

### Infinite Scroll para Mobile

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['paginated-payments', filters],
  queryFn: ({ pageParam = 0 }) => fetchPayments(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  initialPageParam: 0,
});

// Flatten pages
const payments = data?.pages.flatMap(page => page.payments) || [];
```

## Virtual Scrolling

### Implementação com @tanstack/react-virtual

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);

const virtualizer = useVirtualizer({
  count: payments.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100, // Estimated row height
  overscan: 5, // Render 5 extra items above/below viewport
});

const virtualItems = virtualizer.getVirtualItems();
```

## Query Optimization Tips

### 1. Use Select Specific Columns

```typescript
// ❌ Bad: Fetch all columns
const { data } = await supabase
  .from('manual_payments')
  .select('*');

// ✅ Good: Fetch only needed columns
const { data } = await supabase
  .from('manual_payments')
  .select('id, reference_number, amount, status, created_at');
```

### 2. Use Proper Filtering

```typescript
// ❌ Bad: Fetch all and filter in JS
const { data } = await supabase
  .from('manual_payments')
  .select('*');
const filtered = data.filter(p => p.status === 'pending');

// ✅ Good: Filter in database
const { data } = await supabase
  .from('manual_payments')
  .select('*')
  .eq('status', 'pending');
```

### 3. Use Proper Joins

```typescript
// ✅ Good: Use Supabase's built-in joins
const { data } = await supabase
  .from('manual_payments')
  .select(`
    *,
    payment_method:admin_payment_methods(*),
    files:payment_files(*)
  `)
  .eq('id', paymentId)
  .single();
```

### 4. Use Count Efficiently

```typescript
// ❌ Bad: Fetch all data just to count
const { data } = await supabase
  .from('manual_payments')
  .select('*');
const count = data.length;

// ✅ Good: Use count with head
const { count } = await supabase
  .from('manual_payments')
  .select('*', { count: 'exact', head: true });
```

## Performance Monitoring

### Queries to Monitor

```sql
-- Find slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- queries taking more than 100ms
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Find missing indexes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename IN ('manual_payments', 'payment_files', 'payment_audit_log')
ORDER BY n_distinct DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Benchmarks

### Expected Performance Targets

| Operation | Target | Current |
|-----------|--------|---------|
| List payments (25 items) | < 200ms | TBD |
| Get payment details | < 100ms | TBD |
| Create payment | < 300ms | TBD |
| Upload file | < 2s | TBD |
| Dashboard load | < 500ms | TBD |

### Load Testing

```bash
# Test with 100 concurrent users
artillery quick --count 100 --num 10 https://your-app.com/api/payments

# Test specific endpoint
artillery quick --count 50 --num 20 https://your-app.com/api/payments/list
```

## Maintenance Tasks

### Regular Maintenance

```sql
-- Vacuum tables to reclaim space
VACUUM ANALYZE manual_payments;
VACUUM ANALYZE payment_files;
VACUUM ANALYZE payment_audit_log;

-- Reindex tables
REINDEX TABLE manual_payments;
REINDEX TABLE payment_files;
REINDEX TABLE payment_audit_log;

-- Update statistics
ANALYZE manual_payments;
ANALYZE payment_files;
ANALYZE payment_audit_log;
```

### Scheduled Tasks

- **Daily**: Update statistics
- **Weekly**: Vacuum analyze
- **Monthly**: Reindex tables
- **Quarterly**: Review slow queries and add indexes

## Next Steps

1. ✅ Implement indexes in migration
2. ✅ Configure React Query cache
3. ✅ Implement pagination
4. ✅ Implement virtual scrolling
5. ⏳ Monitor query performance
6. ⏳ Optimize slow queries
7. ⏳ Load test with realistic data

## References

- [Supabase Performance Tips](https://supabase.com/docs/guides/database/performance)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [React Query Caching](https://tanstack.com/query/latest/docs/react/guides/caching)
- [@tanstack/react-virtual](https://tanstack.com/virtual/latest)
