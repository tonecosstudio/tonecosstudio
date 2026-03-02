# Implementação de Atualização de Status - Tasks 7.3 e 7.4

## Visão Geral

Este documento descreve a implementação completa das tasks 7.3 e 7.4 do spec orders-consolidation-page, que implementam o controle e persistência de atualização de status de pedidos.

## Task 7.3: Controle de Atualização de Status

### Implementação

**Arquivo**: `src/components/admin/orders/OrderDetailPanel.tsx`

#### 1. Dropdown de Status

```typescript
<Select
  value={selectedStatus || order.status}
  onValueChange={(value) => {
    setSelectedStatus(value as OrderStatus);
    handleStatusChange(value as OrderStatus);
  }}
  disabled={validNextStatuses.length === 0 || updateStatus.isPending}
>
  <SelectTrigger id="status-select" className="w-full">
    <SelectValue placeholder="Selecione um status" />
  </SelectTrigger>
  <SelectContent>
    {/* Status atual (desabilitado) */}
    <SelectItem value={order.status} disabled>
      {getStatusLabel(order.status)} (atual)
    </SelectItem>
    
    {/* Status válidos para transição */}
    {validNextStatuses.map((status) => (
      <SelectItem key={status} value={status}>
        {getStatusLabel(status)}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Características**:
- Exibe apenas status válidos para transição
- Status atual aparece desabilitado
- Desabilita durante atualização (loading state)
- Labels amigáveis em português

#### 2. Handler de Mudança de Status

```typescript
const handleStatusChange = (newStatus: OrderStatus) => {
  if (!order) return;

  // Validar transição
  const validationError = validateStatusTransition(
    order.status,
    newStatus,
    order.type
  );

  if (validationError) {
    toast({
      title: 'Transição inválida',
      description: validationError.message,
      variant: 'destructive',
    });
    return;
  }

  // Verificar se é uma mudança crítica (cancelamento)
  if (newStatus === 'cancelled') {
    setPendingStatus(newStatus);
    setShowConfirmDialog(true);
    return;
  }

  // Executar mudança diretamente
  executeStatusChange(newStatus);
};
```

**Características**:
- Valida transição antes de executar
- Exibe mensagem de erro para transições inválidas
- Detecta mudanças críticas (cancelamento)
- Executa mudança ou mostra confirmação

#### 3. Validação de Transição

**Arquivo**: `src/services/admin/orders-validator.ts`

```typescript
export function validateStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  orderType: 'subscription_delivery' | 'standalone_purchase'
): StatusTransitionError | null {
  // Matriz de transições válidas
  const transitionMatrix = orderType === 'subscription_delivery'
    ? SUBSCRIPTION_DELIVERY_TRANSITIONS
    : STANDALONE_PURCHASE_TRANSITIONS;

  // Verificar se a transição é permitida
  const validTransitions = transitionMatrix[currentStatus];
  
  if (!validTransitions.includes(newStatus)) {
    return {
      type: 'validation_error',
      field: 'status',
      message: `Transição de "${getStatusLabel(currentStatus)}" para "${getStatusLabel(newStatus)}" não é permitida.`,
      currentStatus,
      attemptedStatus: newStatus
    };
  }

  return null;
}
```

**Matrizes de Transição**:

**Entregas de Assinatura**:
- `scheduled` → `pending_choice`, `confirmed`, `cancelled`
- `pending_choice` → `confirmed`, `cancelled`
- `confirmed` → `in_production`, `cancelled`
- `in_production` → `shipped`, `cancelled`
- `shipped` → `delivered`
- `delivered` → `revealed`
- `revealed` → (estado final)
- `cancelled` → (estado final)

**Compras Avulsas**:
- `awaiting_deposit` → `deposit_paid`, `cancelled`
- `deposit_paid` → `awaiting_balance`, `cancelled`
- `awaiting_balance` → `balance_paid`, `cancelled`
- `balance_paid` → `in_production`, `cancelled`
- `in_production` → `shipped`, `cancelled`
- `shipped` → `delivered`
- `delivered` → `completed`
- `completed` → (estado final)
- `cancelled` → (estado final)

#### 4. Confirmação para Mudanças Críticas

```typescript
<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        Confirmar Cancelamento
      </AlertDialogTitle>
      <AlertDialogDescription>
        Você está prestes a cancelar este pedido. Esta ação é crítica e pode não ser reversível.
        {order && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Pedido: {order.id}</p>
            <p className="text-sm">Status atual: {getStatusLabel(order.status)}</p>
            <p className="text-sm">Novo status: Cancelada</p>
          </div>
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={handleCancelCriticalChange}>
        Cancelar
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={handleConfirmCriticalChange}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Confirmar Cancelamento
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Características**:
- Dialog modal com aviso visual (ícone de alerta)
- Exibe informações do pedido
- Botões de cancelar e confirmar
- Estilo destrutivo para ação crítica

## Task 7.4: Persistência de Mudança de Status

### Implementação

**Arquivo**: `src/hooks/admin/useOrderMutations.ts`

#### 1. Mutation para Atualizar Status

```typescript
const updateStatus = useMutation({
  mutationFn: async (params: UpdateOrderStatusParams) => {
    const { orderId, orderType, newStatus } = params;

    const table = orderType === 'subscription_delivery'
      ? 'subscription_deliveries'
      : 'standalone_purchases';

    const { data, error } = await supabase
      .from(table as any)
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    // O histórico é registrado automaticamente pelo trigger do banco de dados
    return data;
  },
  onSuccess: () => {
    // Invalidar cache de pedidos
    queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
  },
  onError: (error: any) => {
    console.error('Erro ao atualizar status:', error);
  }
});
```

**Características**:
- Seleciona tabela correta baseada no tipo de pedido
- Atualiza status e timestamp
- Retorna dados atualizados
- Invalida cache automaticamente
- Trata erros apropriadamente

#### 2. Timestamp e ID do Admin

**Timestamp**: Salvo automaticamente via campo `updated_at` no update.

**ID do Admin**: Capturado automaticamente pelo trigger do banco de dados via `auth.uid()`.

#### 3. Registro no Histórico (Automático via Triggers)

**Arquivo**: `supabase/migrations/20260424000000_create_order_status_history.sql`

**Trigger para Entregas de Assinatura**:
```sql
CREATE OR REPLACE FUNCTION log_subscription_delivery_status_change()
RETURNS TRIGGER AS $
DECLARE
  admin_name TEXT;
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get admin name if available
    IF auth.uid() IS NOT NULL THEN
      SELECT full_name INTO admin_name
      FROM profiles
      WHERE id = auth.uid();
    END IF;
    
    -- Insert history record
    INSERT INTO order_status_history (
      order_id,
      order_type,
      old_status,
      new_status,
      changed_by_admin_id,
      changed_by_admin_name
    ) VALUES (
      NEW.id,
      'subscription_delivery',
      OLD.status,
      NEW.status,
      auth.uid(),
      COALESCE(admin_name, 'System')
    );
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_subscription_delivery_status_change
  AFTER UPDATE ON subscription_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_delivery_status_change();
```

**Trigger para Compras Avulsas**:
```sql
CREATE OR REPLACE FUNCTION log_standalone_purchase_status_change()
RETURNS TRIGGER AS $
DECLARE
  admin_name TEXT;
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get admin name if available
    IF auth.uid() IS NOT NULL THEN
      SELECT full_name INTO admin_name
      FROM profiles
      WHERE id = auth.uid();
    END IF;
    
    -- Insert history record
    INSERT INTO order_status_history (
      order_id,
      order_type,
      old_status,
      new_status,
      changed_by_admin_id,
      changed_by_admin_name
    ) VALUES (
      NEW.id,
      'standalone_purchase',
      OLD.status,
      NEW.status,
      auth.uid(),
      COALESCE(admin_name, 'System')
    );
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_standalone_purchase_status_change
  AFTER UPDATE ON standalone_purchases
  FOR EACH ROW
  EXECUTE FUNCTION log_standalone_purchase_status_change();
```

**Características dos Triggers**:
- Executam automaticamente após UPDATE
- Registram apenas quando status realmente muda
- Capturam ID e nome do admin via `auth.uid()`
- Registram status antigo e novo
- Timestamp automático via `created_at DEFAULT now()`
- Não requerem código adicional no frontend

#### 4. Invalidação de Cache e Atualização de UI

```typescript
onSuccess: () => {
  // Invalidar cache de pedidos
  queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
}
```

**Características**:
- Invalida cache automaticamente após sucesso
- Força re-fetch dos dados
- UI atualiza automaticamente via React Query
- Mantém sincronização entre lista e detalhes

## Fluxo Completo de Atualização

1. **Usuário seleciona novo status** no dropdown
2. **Sistema valida transição** usando `validateStatusTransition()`
3. **Se inválida**: Exibe toast de erro e cancela operação
4. **Se é cancelamento**: Exibe dialog de confirmação
5. **Se válida**: Chama `executeStatusChange()`
6. **Mutation executa**: Atualiza no Supabase via `updateStatus.mutateAsync()`
7. **Trigger do banco**: Registra automaticamente no histórico
8. **Cache invalidado**: Via `queryClient.invalidateQueries()`
9. **UI atualiza**: React Query re-fetch automático
10. **Toast de sucesso**: Confirma operação ao usuário

## Testes

### Testes Unitários

**Arquivo**: `src/hooks/admin/useOrderMutations.test.ts`
- ✅ Atualização de status para subscription_delivery
- ✅ Atualização de status para standalone_purchase
- ✅ Tratamento de erros
- ✅ Atualização em massa
- ✅ Invalidação de cache

**Arquivo**: `src/components/admin/orders/OrderDetailPanel.status-update.test.tsx`
- ✅ Exibição do dropdown de status
- ✅ Exibição apenas de status válidos
- ✅ Validação de transição
- ✅ Confirmação para mudanças críticas
- ✅ Criação de mutation
- ✅ Salvamento de timestamp e admin ID
- ✅ Registro no histórico via trigger
- ✅ Invalidação de cache
- ✅ Fluxo completo de atualização

### Cobertura de Requisitos

**Requisito 6.1**: ✅ Controle de seleção de status no painel de detalhes
**Requisito 6.2**: ✅ Validação de transição de status
**Requisito 6.3**: ✅ Mensagem de erro para transições inválidas
**Requisito 6.4**: ✅ Salvamento com timestamp e ID do admin
**Requisito 6.5**: ✅ Atualização automática da lista
**Requisito 12.3**: ✅ Registro em log de auditoria
**Requisito 12.4**: ✅ Inclusão de userId e timestamp

## Segurança

### Row Level Security (RLS)

A tabela `order_status_history` possui políticas RLS:

```sql
-- Policy: Admins can view all history
CREATE POLICY "Admins can view all order status history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: System can insert history records
CREATE POLICY "System can insert order status history"
  ON order_status_history FOR INSERT
  WITH CHECK (true);
```

### Auditoria

Todos os campos necessários para auditoria são capturados:
- `order_id`: ID do pedido
- `order_type`: Tipo do pedido
- `old_status`: Status anterior
- `new_status`: Novo status
- `changed_by_admin_id`: ID do admin (via `auth.uid()`)
- `changed_by_admin_name`: Nome do admin (via lookup)
- `created_at`: Timestamp da mudança

## Conclusão

As tasks 7.3 e 7.4 foram implementadas com sucesso, fornecendo:

1. ✅ Interface intuitiva para atualização de status
2. ✅ Validação robusta de transições
3. ✅ Confirmação para ações críticas
4. ✅ Persistência confiável no banco de dados
5. ✅ Auditoria completa via triggers automáticos
6. ✅ Sincronização automática da UI
7. ✅ Testes abrangentes
8. ✅ Segurança via RLS

A implementação segue as melhores práticas:
- Separação de responsabilidades
- Validação em múltiplas camadas
- Auditoria automática via triggers
- Testes abrangentes
- Feedback claro ao usuário
- Segurança via RLS
