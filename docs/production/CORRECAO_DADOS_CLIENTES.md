# Correção: Dados de Clientes Não Aparecendo

**Data**: 08/03/2026  
**Status**: ✅ CORRIGIDO

## Problema Reportado

Na página de pedidos (`/admin/pedidos`), os dados dos clientes não estavam aparecendo:
- Mostrava "Nome não disponível"
- Mostrava "Email não disponível"
- Afetava assinaturas, pagamentos manuais e orçamentos

## Causa Raiz Identificada

### 1. Assinaturas (subscription_deliveries)
**Problema**: `transformDeliveries()` recebia Maps vazios de profiles e collections

```typescript
// ❌ ANTES - Maps vazios
transformDeliveries(deliveriesResult.data || [], new Map(), new Map())
```

**Causa**: O serviço não estava buscando os dados de `profiles` e `collections` antes de transformar

### 2. Pagamentos Manuais (manual_payments)
**Problema**: Não estava buscando profiles dos usuários

**Causa**: A tabela `manual_payments` referencia `auth.users`, não `profiles` diretamente. Precisava buscar profiles separadamente.

### 3. Orçamentos (quotes)
**Problema**: Não estava buscando profiles dos usuários

**Causa**: A tabela `quotes` referencia `auth.users`, não `profiles` diretamente. Tentativa de JOIN falhou com erro:
```
Could not find a relationship between 'quotes' and 'profiles' in the schema cache
```

## Solução Implementada

### Estratégia: Buscar Profiles Separadamente

Como as tabelas referenciam `auth.users` e não `profiles`, a solução foi buscar todos os profiles necessários em queries separadas e passar via Map para os transformers.

### 1. Buscar Profiles para Todos os Tipos

```typescript
// Buscar profiles para assinaturas
if (deliveriesResult.data && deliveriesResult.data.length > 0) {
  const userIds = [...new Set(
    deliveriesResult.data
      .filter(d => d.subscriptions)
      .map(d => d.subscriptions!.user_id)
  )];

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profiles) {
      profiles.forEach(p => profilesMap.set(p.id, p));
    }
  }
}

// Buscar profiles para manual payments
if (paymentsResult.data && paymentsResult.data.length > 0) {
  const paymentUserIds = [...new Set(
    paymentsResult.data.map(p => p.user_id)
  )];

  if (paymentUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', paymentUserIds);

    if (profiles) {
      profiles.forEach(p => {
        if (!profilesMap.has(p.id)) {
          profilesMap.set(p.id, p);
        }
      });
    }
  }
}

// Buscar profiles para quotes
if (quotesResult.data && quotesResult.data.length > 0) {
  const quoteUserIds = [...new Set(
    quotesResult.data.map(q => q.user_id)
  )];

  if (quoteUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', quoteUserIds);

    if (profiles) {
      profiles.forEach(p => {
        if (!profilesMap.has(p.id)) {
          profilesMap.set(p.id, p);
        }
      });
    }
  }
}
```

### 2. Atualizar Transformers para Aceitar ProfilesMap

```typescript
// Transformer de pagamentos manuais
export function transformManualPayments(
  payments: any[],
  profilesMap: Map<string, any>,  // ✅ Novo parâmetro
  filesMap?: Map<...>
): UnifiedOrder[] {
  return payments.map((payment) => {
    const profile = profilesMap.get(payment.user_id) || payment.profiles;
    // ...
  });
}

// Transformer de orçamentos
export function transformQuotes(
  quotes: any[], 
  itemsMap: Map<string, any[]>,
  profilesMap: Map<string, any>  // ✅ Novo parâmetro
): UnifiedOrder[] {
  return quotes.map((quote) => {
    const profile = profilesMap.get(quote.user_id) || quote.profiles;
    // ...
  });
}
```

### 3. Remover JOINs Inválidos

Removidos os JOINs com `profiles` das queries de `manual_payments` e `quotes`, já que essas tabelas não têm relacionamento direto com `profiles` no schema.

## Arquivos Modificados

- `src/services/admin/orders-service-v2.ts`
  - Linha 107-195: Adicionada busca de profiles para todos os tipos
  - Linha 324-345: Removido JOIN inválido com profiles em manual_payments
  - Linha 366-380: Removido JOIN inválido com profiles em quotes
  - Linha 197-202: Atualizado chamadas dos transformers com profilesMap

- `src/services/admin/orders-transformer.ts`
  - Linha 380-400: Atualizado `transformManualPayments` para aceitar profilesMap
  - Linha 450-470: Atualizado `transformQuotes` para aceitar profilesMap

## Logs de Debug

Com DEBUG ativado, agora você verá:

```
🔍 [OrdersV2] Fetching orders with filters: {...}
📦 [OrdersV2] Deliveries: X items
🛒 [OrdersV2] Purchases: X items
💰 [OrdersV2] Payments: X items
📋 [OrdersV2] Quotes: X items
👥 [OrdersV2] Total profiles loaded: X
📚 [OrdersV2] Collections loaded: X
✅ [OrdersV2] Total unified orders: X
⏱️ [OrdersV2] Query completed in XXXms
```

## Resultado

✅ Nomes dos clientes aparecem corretamente  
✅ Emails dos clientes aparecem corretamente  
✅ Funciona para todos os tipos de pedidos  
✅ Performance mantida (queries em paralelo)  
✅ Logs detalhados para debug  
✅ Sem erros de relacionamento no Supabase

## Lições Aprendidas

1. **Schema Matters**: Sempre verificar o schema real antes de fazer JOINs
2. **auth.users vs profiles**: Tabelas podem referenciar `auth.users` diretamente, não `profiles`
3. **Busca Separada**: Quando não há relacionamento direto, buscar dados separadamente é a solução
4. **Maps para Performance**: Usar Maps para lookup rápido de dados relacionados


## Problema Adicional: Coleção Não Disponível

### Sintoma
Nos detalhes do pedido de assinatura, aparece "Coleção não disponível"

### Investigação em Andamento

Adicionados logs detalhados para identificar a causa:

1. **No Serviço** (`orders-service-v2.ts`):
   - Log de quantas deliveries têm subscriptions
   - Log de quantos collection_ids únicos foram encontrados
   - Log dos collection_ids extraídos
   - Log das collections buscadas do banco
   - Log de erros na busca de collections

2. **No Transformer** (`orders-transformer.ts`):
   - Warning quando collection_id existe mas não é encontrada no map
   - Warning quando subscription não tem collection_id
   - Lista de collections disponíveis no map

### Possíveis Causas

1. **Subscription sem collection_id**: A assinatura pode não ter `collection_id` preenchido no banco
2. **Collection não existe**: O `collection_id` aponta para uma collection que foi deletada
3. **Erro na query**: A busca de collections pode estar falhando silenciosamente
4. **Filtro incorreto**: O filtro de `collection_id` pode estar removendo IDs válidos

### Próximos Passos

1. Verificar os logs no console do navegador
2. Identificar qual das causas acima está ocorrendo
3. Corrigir o problema na raiz (dados ou código)
