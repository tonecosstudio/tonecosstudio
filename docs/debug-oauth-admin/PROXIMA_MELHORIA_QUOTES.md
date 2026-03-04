# Próxima Melhoria: Incluir Orçamentos na Página Consolidada

## Resumo

Incluir orçamentos (`quotes`) na página consolidada de pedidos `/admin/pedidos` para ter uma visão completa de TODAS as transações do sistema.

## Status Atual

### ✅ Já Implementado
- Entregas de Assinatura (`subscription_deliveries`)
- Compras Avulsas (`standalone_purchases`)
- Pagamentos Manuais (`manual_payments`)

### ❌ Faltando
- **Orçamentos (`quotes`)** ← PRÓXIMA IMPLEMENTAÇÃO

## Estrutura Atual dos Orçamentos

### Tabelas
- `quotes` - Orçamento principal
- `quote_items` - Itens do orçamento
- `models` - Modelos/personagens solicitados

### Campos de `quotes`
```typescript
{
  id: string;
  user_id: string;
  status: 'pending' | 'reviewing' | 'answered' | 'archived';
  deadline: string | null;  // Prazo desejado pelo cliente
  notes: string | null;     // Observações do cliente
  created_at: string;
  updated_at: string;
}
```

### Campos de `quote_items`
```typescript
{
  id: string;
  quote_id: string;
  model_id: string;
  quantity: number;
  scale: string;  // Ex: "1/6", "1/4", "1/3"
}
```

### Página Atual
- `/admin/orcamentos` (AdminQuotesPage.tsx)
- Exibe orçamentos em cards
- Permite mudar status (reviewing, answered, archived)
- Mostra timeline de produção
- Não está integrada com a página consolidada

## Implementação Necessária

### 1. Backend (`orders-service.ts`)

#### Nova função: `fetchQuotes()`
```typescript
async function fetchQuotes(filters: OrderFilters) {
  let query = supabase
    .from('quotes')
    .select(`
      id,
      user_id,
      status,
      deadline,
      notes,
      created_at,
      updated_at,
      profiles (
        id,
        full_name,
        email
      )
    `, { count: 'exact' });

  // Aplicar filtros de status
  if (filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  // Aplicar filtros de data
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  return await query;
}
```

#### Nova função: `fetchQuoteItems()`
```typescript
async function fetchQuoteItems(quoteIds: string[]) {
  const { data, error } = await supabase
    .from('quote_items')
    .select(`
      id,
      quote_id,
      model_id,
      quantity,
      scale,
      models (
        id,
        name,
        franchise
      )
    `)
    .in('quote_id', quoteIds);

  if (error) throw error;
  return data || [];
}
```

#### Atualizar `fetchUnifiedOrders()`
```typescript
// Adicionar busca de quotes
let quotesPromise: Promise<any> | null = null;
if (filters.type === 'all' || filters.type === 'quote') {
  quotesPromise = fetchQuotes(filters);
}

// Executar em paralelo
const [deliveriesResult, purchasesResult, paymentsResult, quotesResult] = await Promise.all([
  deliveriesPromise || Promise.resolve({ data: [], count: 0 }),
  purchasesPromise || Promise.resolve({ data: [], count: 0 }),
  paymentsPromise || Promise.resolve({ data: [], count: 0 }),
  quotesPromise || Promise.resolve({ data: [], count: 0 })
]);

// Buscar itens dos orçamentos
let quoteItemsMap = new Map<string, any[]>();
if (quotesResult.data && quotesResult.data.length > 0) {
  const quoteIds = quotesResult.data.map(q => q.id);
  const items = await fetchQuoteItems(quoteIds);
  
  items.forEach(item => {
    const arr = quoteItemsMap.get(item.quote_id) || [];
    arr.push(item);
    quoteItemsMap.set(item.quote_id, arr);
  });
}

// Transformar quotes
const unifiedOrders: UnifiedOrder[] = [
  ...transformDeliveries(deliveriesResult.data || [], profilesMap, collectionsMap),
  ...transformPurchases(purchasesResult.data || []),
  ...transformManualPayments(paymentsResult.data || []),
  ...transformQuotes(quotesResult.data || [], quoteItemsMap)
];
```

### 2. Transformer (`orders-transformer.ts`)

#### Nova função: `transformQuotes()`
```typescript
export function transformQuotes(
  quotes: any[],
  itemsMap: Map<string, any[]>
): UnifiedOrder[] {
  return quotes.map(quote => {
    const profile = quote.profiles;
    const items = itemsMap.get(quote.id) || [];

    const unifiedOrder: UnifiedOrder = {
      id: quote.id,
      type: 'quote',
      status: quote.status as any,
      createdAt: quote.created_at || new Date().toISOString(),
      updatedAt: quote.updated_at || new Date().toISOString(),

      // Dados do cliente
      customer: {
        id: quote.user_id,
        name: profile?.full_name || 'Nome não disponível',
        email: profile?.email || 'Email não disponível'
      },

      // Orçamentos não têm coleção específica
      collection: null,

      // Orçamentos não têm valor definido até serem respondidos
      amount: 0,

      // Orçamentos não têm dados de entrega
      trackingCode: null,
      expectedDeliveryDate: null,
      actualDeliveryDate: null,

      // Dados específicos de orçamento
      quote: {
        quoteId: quote.id,
        items: items.map(item => ({
          id: item.id,
          modelId: item.model_id,
          modelName: item.models?.name || 'Modelo não disponível',
          franchise: item.models?.franchise || null,
          quantity: item.quantity,
          scale: item.scale
        })),
        deadline: quote.deadline,
        notes: quote.notes
      }
    };

    return unifiedOrder;
  });
}
```

### 3. Tipos (`orders.ts`)

#### Adicionar tipo de orçamento
```typescript
export type QuoteStatus =
  | 'pending'      // Aguardando análise
  | 'reviewing'    // Em análise
  | 'answered'     // Respondido/Aprovado
  | 'archived';    // Arquivado

export type OrderStatus = 
  | SubscriptionDeliveryStatus 
  | StandalonePurchaseStatus 
  | ManualPaymentStatus
  | QuoteStatus;  // NOVO

export interface QuoteData {
  quoteId: string;
  items: Array<{
    id: string;
    modelId: string;
    modelName: string;
    franchise: string | null;
    quantity: number;
    scale: string;
  }>;
  deadline: string | null;
  notes: string | null;
}

export interface UnifiedOrder {
  // ... campos existentes
  quote?: QuoteData;  // NOVO
}
```

#### Adicionar type guard
```typescript
export function isQuote(order: UnifiedOrder): order is UnifiedOrder & {
  type: 'quote';
  quote: QuoteData;
} {
  return order.type === 'quote' && !!order.quote;
}

export function isQuoteStatus(status: OrderStatus): status is QuoteStatus {
  return ['pending', 'reviewing', 'answered', 'archived'].includes(status);
}
```

### 4. Frontend

#### Atualizar `OrderFilters.tsx`
```typescript
// Adicionar tipo 'quote' ao filtro
const ORDER_TYPES = [
  { value: 'all', label: 'Todos' },
  { value: 'subscription_delivery', label: 'Entregas de Assinatura' },
  { value: 'standalone_purchase', label: 'Compras Avulsas' },
  { value: 'manual_payment', label: 'Pagamentos Manuais' },
  { value: 'quote', label: 'Orçamentos' }  // NOVO
];

// Adicionar status de quotes
const QUOTE_STATUSES = [
  { value: 'pending', label: 'Pendente', color: 'gray' },
  { value: 'reviewing', label: 'Em Análise', color: 'blue' },
  { value: 'answered', label: 'Respondido', color: 'green' },
  { value: 'archived', label: 'Arquivado', color: 'gray' }
];
```

#### Criar `QuoteDetails.tsx`
```typescript
export function QuoteDetails({ order }: { order: UnifiedOrder }) {
  if (order.type !== 'quote' || !order.quote) {
    return null;
  }

  const quoteData = order.quote;

  return (
    <>
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Detalhes do Orçamento
        </h3>
        
        <div className="space-y-3">
          {/* Prazo Desejado */}
          {quoteData.deadline && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prazo Desejado</span>
              <span className="text-sm font-medium">{quoteData.deadline}</span>
            </div>
          )}

          {/* Observações */}
          {quoteData.notes && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">Observações</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {quoteData.notes}
              </p>
            </div>
          )}
        </div>
      </section>

      <Separator />

      {/* Itens do Orçamento */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Itens Solicitados
          </h3>
        </div>

        <div className="space-y-2">
          {quoteData.items.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-muted rounded-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.modelName}</p>
                  {item.franchise && (
                    <p className="text-xs text-muted-foreground">{item.franchise}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{item.quantity}x</p>
                  <p className="text-xs text-muted-foreground">{item.scale}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Ações de Admin */}
      {order.status !== 'answered' && order.status !== 'archived' && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Ações
          </h3>
          
          <div className="space-y-2">
            <Button
              variant="default"
              className="w-full"
              onClick={() => handleUpdateStatus('reviewing')}
            >
              Marcar como Em Análise
            </Button>

            <Button
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => handleUpdateStatus('answered')}
            >
              Marcar como Respondido
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleUpdateStatus('archived')}
            >
              Arquivar
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
```

#### Atualizar `OrderDetailPanel.tsx`
```typescript
// Adicionar renderização de QuoteDetails
{order.type === 'quote' && <QuoteDetails order={order} />}
```

#### Atualizar `OrderStatusBadge.tsx`
```typescript
// Adicionar cores para status de quotes
const colors: Record<string, string> = {
  // ... cores existentes
  'pending': 'gray',
  'reviewing': 'blue',
  'answered': 'green',
  'archived': 'gray'
};

// Adicionar labels para status de quotes
const labels: Record<OrderStatus, string> = {
  // ... labels existentes
  'pending': 'Pendente',
  'reviewing': 'Em Análise',
  'answered': 'Respondido',
  'archived': 'Arquivado'
};
```

#### Atualizar `OrderTypeIndicator.tsx`
```typescript
// Adicionar ícone e cor para quotes
if (order.type === 'quote') {
  return (
    <div className="flex items-center gap-2">
      <FileText className="h-4 w-4 text-purple-600" />
      <span className="text-sm font-medium text-purple-600">Orçamento</span>
    </div>
  );
}
```

### 5. Validação (`orders-validator.ts`)

#### Adicionar matriz de transições para quotes
```typescript
const quoteTransitions: Record<string, string[]> = {
  'pending': ['reviewing', 'archived'],
  'reviewing': ['answered', 'archived'],
  'answered': ['archived'],
  'archived': []
};
```

### 6. Mutations (`useOrderMutations.ts`)

Orçamentos usam as mesmas mutations de atualização de status que já existem. Não precisa de mutations específicas.

## Estimativa de Esforço

- **Backend**: 3-4 horas
  - Queries e transformers
  - Busca de itens relacionados
  
- **Frontend**: 4-6 horas
  - Componente QuoteDetails
  - Atualização de filtros e badges
  - Integração com painel de detalhes
  
- **Testes**: 2-3 horas
  - Verificar queries
  - Testar filtros
  - Validar exibição de dados

**Total**: 9-13 horas

## Benefícios

1. **Visão Completa**: Admin vê TODOS os tipos de transações em um único lugar
2. **Eficiência**: Não precisa alternar entre páginas diferentes
3. **Consistência**: Interface unificada para todos os tipos de pedidos
4. **Busca Global**: Buscar orçamentos junto com outros pedidos
5. **Filtros Avançados**: Filtrar por tipo, status, data, etc.

## Próximos Passos

1. Implementar backend (queries e transformers)
2. Atualizar tipos TypeScript
3. Criar componente QuoteDetails
4. Atualizar filtros e badges
5. Testar integração completa
6. Documentar mudanças

## Observações

- Orçamentos não têm valor definido até serem respondidos (amount = 0)
- Orçamentos não têm coleção específica (collection = null)
- Orçamentos não têm dados de entrega (trackingCode, dates = null)
- Status de orçamentos são diferentes dos outros tipos
- Itens do orçamento precisam ser buscados separadamente (join com quote_items e models)

## Conclusão

Após implementar orçamentos, a página `/admin/pedidos` estará COMPLETA com todos os 4 tipos principais de transações:
- ✅ Entregas de Assinatura
- ✅ Compras Avulsas
- ✅ Pagamentos Manuais
- ✅ Orçamentos (após esta implementação)

Isso tornará a página verdadeiramente consolidada e completa para gerenciamento de todas as transações do sistema.
