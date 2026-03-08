# Correção: Arquitetura de Pedidos - Assinaturas Duplicadas

## Problema Identificado

**Sintoma**: Lista de pedidos mostrando múltiplas linhas para o mesmo cliente com a mesma assinatura.

**Exemplo**:
- Pedro Anual aparecia 12 vezes (uma para cada entrega da assinatura anual)
- Maria Semestral aparecia 6 vezes (uma para cada entrega da assinatura semestral)
- Ana Legacy aparecia 3 vezes (uma para cada entrega da assinatura trimestral)

## Causa Raiz

### Arquitetura Incorreta

O sistema estava tratando cada `subscription_delivery` como um pedido separado:

```typescript
// ERRADO: orders-service-v2.ts
function transformDeliveries(deliveries) {
  return deliveries.map(delivery => {
    // Cada entrega vira um UnifiedOrder
    return {
      id: delivery.id,  // ID da entrega, não da assinatura
      type: 'subscription_delivery',
      // ...
    };
  });
}
```

**Resultado**: Uma assinatura anual (12 entregas) = 12 "pedidos" na lista

### Conceito Correto

Uma assinatura é UM pedido com múltiplas entregas:

```
Assinatura Anual (1 pedido)
├── Entrega #1 (Janeiro)
├── Entrega #2 (Fevereiro)
├── Entrega #3 (Março)
├── ...
└── Entrega #12 (Dezembro)
```

## Solução Implementada

### 1. Novo Service (orders-service-v3.ts)

**Mudança Fundamental**: Buscar e agrupar por assinatura, não por entrega

```typescript
// CORRETO: orders-service-v3.ts
async function fetchSubscriptions(filters) {
  // 1. Buscar assinaturas
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*');

  // 2. Buscar TODAS as entregas
  const { data: deliveries } = await supabase
    .from('subscription_deliveries')
    .select('*')
    .in('subscription_id', subscriptionIds);

  // 3. AGRUPAR entregas por assinatura
  const deliveriesBySubscription = new Map();
  deliveries.forEach(delivery => {
    const subId = delivery.subscription_id;
    if (!deliveriesBySubscription.has(subId)) {
      deliveriesBySubscription.set(subId, []);
    }
    deliveriesBySubscription.get(subId).push(delivery);
  });

  // 4. Combinar: 1 assinatura = 1 objeto
  return subscriptions.map(sub => ({
    ...sub,
    deliveries: deliveriesBySubscription.get(sub.id) || []
  }));
}

function transformSubscription(subscription) {
  // 1 assinatura = 1 UnifiedOrder
  return {
    id: subscription.id,  // ID da assinatura
    type: 'subscription_delivery',
    amount: subscription.total_paid,
    
    subscriptionDelivery: {
      subscriptionId: subscription.id,
      // Dados da próxima entrega
      deliveryNumber: nextDelivery.delivery_number,
      
      subscription: {
        deliveriesCompleted: subscription.deliveries_completed,
        deliveriesTotal: subscription.deliveries_total,
      },
      
      // NOVO: Lista completa de entregas
      allDeliveries: subscription.deliveries.map(d => ({
        id: d.id,
        deliveryNumber: d.delivery_number,
        status: d.status,
        // ...
      }))
    }
  };
}
```

### 2. Atualização do Hook

```typescript
// src/hooks/admin/orders-v2/useOrdersData.ts
import { fetchAllOrders } from '@/services/admin/orders-service-v3';
```

### 3. Estrutura de Dados

**Antes (V2)**:
```json
[
  { "id": "delivery-1", "type": "subscription_delivery", "customer": "Pedro" },
  { "id": "delivery-2", "type": "subscription_delivery", "customer": "Pedro" },
  { "id": "delivery-3", "type": "subscription_delivery", "customer": "Pedro" },
  // ... 12 objetos para a mesma assinatura
]
```

**Depois (V3)**:
```json
[
  {
    "id": "subscription-1",
    "type": "subscription_delivery",
    "customer": "Pedro",
    "subscriptionDelivery": {
      "allDeliveries": [
        { "id": "delivery-1", "deliveryNumber": 1, "status": "revealed" },
        { "id": "delivery-2", "deliveryNumber": 2, "status": "scheduled" },
        // ... todas as 12 entregas dentro de 1 objeto
      ]
    }
  }
]
```

## Comparação: V2 vs V3

| Aspecto | V2 (Incorreto) | V3 (Correto) |
|---------|----------------|--------------|
| **Conceito** | 1 entrega = 1 pedido | 1 assinatura = 1 pedido |
| **Assinatura Anual** | 12 linhas na tabela | 1 linha na tabela |
| **ID do Pedido** | ID da entrega | ID da assinatura |
| **Entregas** | Dados de 1 entrega | Lista de todas as entregas |
| **Progresso** | Não visível | deliveries_completed / deliveries_total |

## Benefícios da Correção

### 1. Interface Limpa
- ✅ 1 linha por assinatura (em vez de 12)
- ✅ Progresso visível (ex: "2 de 12 entregas")
- ✅ Fácil identificar qual cliente tem assinatura

### 2. Dados Corretos
- ✅ ID do pedido = ID da assinatura
- ✅ Valor total da assinatura (não por entrega)
- ✅ Histórico completo de entregas disponível

### 3. Performance
- ✅ Menos linhas para renderizar
- ✅ Paginação mais eficiente
- ✅ Queries mais otimizadas

## Impacto nos Componentes

### OrdersTable
- Continua funcionando normalmente
- Agora recebe 1 linha por assinatura
- Pode expandir para mostrar todas as entregas (futuro)

### OrderDetailModal
- Agora tem acesso a `allDeliveries`
- Pode mostrar histórico completo de entregas
- Progresso correto da assinatura

## Migração

### Passo 1: Novo Service
✅ Criado `orders-service-v3.ts`

### Passo 2: Atualizar Hook
✅ `useOrdersData.ts` agora usa V3

### Passo 3: Testar
- [ ] Verificar lista de pedidos
- [ ] Verificar detalhes do pedido
- [ ] Verificar filtros e busca
- [ ] Verificar paginação

### Passo 4: Remover V2 (após testes)
- [ ] Deletar `orders-service-v2.ts`
- [ ] Deletar `orders-transformer.ts`
- [ ] Atualizar documentação

## Arquivos Criados/Modificados

### Novos
- `src/services/admin/orders-service-v3.ts` (600+ linhas)
- `docs/production/CORRECAO_ARQUITETURA_PEDIDOS.md`

### Modificados
- `src/hooks/admin/orders-v2/useOrdersData.ts` (1 linha)

## Resultado Esperado

**Antes**:
```
Pedro Anual - Entrega #1
Pedro Anual - Entrega #2
Pedro Anual - Entrega #3
...
Pedro Anual - Entrega #12
```

**Depois**:
```
Pedro Anual - Assinatura Anual (1 de 12 entregas)
```

## Data da Correção

8 de março de 2026

## Próximos Passos

1. Testar a nova implementação
2. Adicionar visualização expandida de entregas
3. Remover código V2 após validação
4. Atualizar testes unitários
