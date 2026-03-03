# 🔍 Diagnóstico: Pagamento Aprovado no Admin Não Aparece no Perfil

## Problema Relatado

Você aceitou/aprovou um pagamento manual no painel admin, mas ele não está aparecendo no perfil do usuário.

## Análise do Fluxo

### 1. Aprovação no Admin (✅ Funcionando)

**Arquivo**: `src/services/admin/orders-service.ts` (linha 1358)

```typescript
export async function approveManualPayment(paymentId: string): Promise<void> {
  // 1. Valida o pagamento
  // 2. Atualiza status para 'approved'
  // 3. Registra approved_at e approved_by
  // 4. Cria notificação para o usuário
}
```

**O que acontece**:
- Status muda de `pending`/`under_review` → `approved`
- Campo `approved_at` é preenchido
- Campo `approved_by` recebe o ID do admin
- Notificação é criada em `user_notifications`

### 2. Visualização no Perfil do Usuário

**Arquivo**: `src/pages/MyPaymentsPage.tsx` (linha 57)

```typescript
const { data: payments = [] } = useQuery({
  queryKey: ["user-payments", user?.id, statusFilter, dateRange, searchQuery],
  queryFn: () => listPaymentsByUser(user.id, filters),
  enabled: !!user?.id,
});
```

**Arquivo**: `src/lib/payment-service.ts` (linha 278)

```typescript
export async function listPaymentsByUser(userId: string, filters?: PaymentFilters) {
  let query = supabase
    .from("manual_payments")
    .select("*")
    .eq("user_id", userId);
  
  // Aplica filtros de status, data, etc.
  // Ordena por created_at DESC
}
```

## 🎯 Causas Possíveis

### Causa 1: Cache do React Query (MAIS PROVÁVEL)

O React Query no lado do **admin** invalida a query quando aprova:

```typescript
// src/hooks/admin/useOrderMutations.ts (linha 475)
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
  queryClient.refetchQueries({ queryKey: [ORDERS_QUERY_KEY] });
}
```

Mas isso **NÃO invalida** a query no lado do **usuário**, que usa uma query key diferente:
- Admin: `[ORDERS_QUERY_KEY]` ou `["admin-orders"]`
- Usuário: `["user-payments", userId, ...]`

**Solução**: O usuário precisa recarregar a página ou a query precisa ser invalidada.

### Causa 2: Filtro de Status

Se o usuário estiver com filtro de status ativo (ex: apenas "pending"), os pagamentos aprovados não aparecerão.

**Verificar**: O filtro está em "Todos" ou "Aprovado"?

### Causa 3: RLS (Menos Provável)

As políticas RLS estão corretas:

```sql
CREATE POLICY "Usuários veem seus próprios pagamentos"
  ON manual_payments FOR SELECT
  USING (auth.uid() = user_id);
```

Isso permite que usuários vejam TODOS os seus pagamentos, independente do status.

## ✅ Soluções

### Solução Imediata (Para Testar Agora)

1. **No perfil do usuário**:
   - Recarregue a página (F5 ou Ctrl+R)
   - Verifique se o filtro de status está em "Todos"
   - Procure pelo número de referência do pagamento

2. **Verificar no banco de dados**:
   ```sql
   SELECT id, reference_number, status, user_id, approved_at
   FROM manual_payments
   WHERE user_id = 'USER_ID_AQUI'
   ORDER BY created_at DESC;
   ```

### Solução Permanente: Invalidar Cache Cross-User

Precisamos fazer com que quando o admin aprova um pagamento, o cache do usuário também seja invalidado.

**Opção A: Realtime Subscription** (Recomendado)

Adicionar um listener realtime na página do usuário que escuta mudanças em `manual_payments`:

```typescript
// Em MyPaymentsPage.tsx
useEffect(() => {
  const channel = supabase
    .channel('user-payments')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'manual_payments',
        filter: `user_id=eq.${user.id}`
      },
      () => {
        // Invalidar e refetch quando houver mudança
        refetch();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id, refetch]);
```

**Opção B: Polling** (Mais Simples)

Fazer refetch automático a cada X segundos:

```typescript
const { data: payments } = useQuery({
  queryKey: ["user-payments", user?.id],
  queryFn: () => listPaymentsByUser(user.id),
  refetchInterval: 30000, // Refetch a cada 30 segundos
});
```

**Opção C: Botão de Atualizar**

Adicionar um botão "Atualizar" na página:

```typescript
<Button onClick={() => refetch()}>
  <RefreshCw className="h-4 w-4 mr-2" />
  Atualizar
</Button>
```

## 🧪 Como Testar

1. **Criar um pagamento manual** como usuário
2. **Aprovar no admin**
3. **Verificar no perfil do usuário**:
   - Sem recarregar (deve não aparecer - problema confirmado)
   - Após recarregar (deve aparecer - RLS OK)
   - Com realtime (deve aparecer automaticamente - solução implementada)

## 📝 Próximos Passos

1. Confirmar que o problema é cache (recarregar resolve?)
2. Implementar solução realtime ou polling
3. Adicionar indicador visual de "atualizando" quando houver mudanças
4. Considerar adicionar notificação toast quando pagamento for aprovado

## 🔗 Arquivos Relacionados

- `src/pages/MyPaymentsPage.tsx` - Página de pagamentos do usuário
- `src/lib/payment-service.ts` - Serviço de listagem de pagamentos
- `src/services/admin/orders-service.ts` - Serviço de aprovação (admin)
- `src/hooks/admin/useOrderMutations.ts` - Hook de mutação (admin)
- `supabase/migrations/20260216000000_create_manual_payment_system.sql` - Schema e RLS
