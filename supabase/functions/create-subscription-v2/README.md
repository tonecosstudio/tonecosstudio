# Edge Function: create-subscription-v2

## Visão Geral

Edge Function para criar assinaturas no novo modelo Premium Club v2.0 com preço fixo por plano.

**Feature:** premium-club-fixed-price-model  
**Task:** 3.9  
**Spec:** `.kiro/specs/premium-club-fixed-price-model/`

## Funcionalidades

- ✅ Cria assinatura com preço fixo por plano (não por coleção)
- ✅ Vincula assinatura ao ciclo atual automaticamente
- ✅ Agenda entregas consecutivas (3 para trimestral, 6 para semestral)
- ✅ Cria peça bônus para plano semestral
- ✅ Verifica capacidade do ciclo
- ✅ Valida disponibilidade de coleção por plano
- ✅ Incrementa capacidade do ciclo

## Endpoint

```
POST /functions/v1/create-subscription-v2
```

## Autenticação

Requer token JWT do usuário no header `Authorization: Bearer <token>`.

## Request Body

```typescript
{
  planId: string;           // ID do plano (trimestral ou semestral)
  collectionId: string;     // ID da coleção escolhida
  paymentMethod: "pix" | "credit_card" | "boleto";
  paymentId?: string;       // ID do pagamento (opcional)
}
```

## Response

### Sucesso (200)

```json
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "collection_name": "Nome da Coleção",
    "plan_type": "trimestral",
    "deliveries_total": 3,
    "total_paid": 1350.00,
    "entry_cycle": {
      "cycle_number": 1,
      "month": 3,
      "year": 2026,
      "shipping_date": "2026-04-07"
    },
    "deliveries_scheduled": 3,
    "includes_bonus": false
  }
}
```

### Erros

**400 Bad Request**
```json
{
  "error": "planId, collectionId e paymentMethod são obrigatórios"
}
```

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found**
```json
{
  "error": "Plano não encontrado"
}
```

**500 Internal Server Error**
```json
{
  "error": "Mensagem de erro detalhada"
}
```

## Validações

1. **Plano ativo**: Verifica se o plano existe e está ativo
2. **Coleção ativa**: Verifica se a coleção existe e está ativa
3. **Disponibilidade**: Valida se coleção está disponível para o plano escolhido
4. **Assinatura única**: Verifica se usuário já tem assinatura ativa
5. **Capacidade**: Verifica se o ciclo atual tem capacidade disponível

## Fluxo de Execução

1. Autentica usuário
2. Valida entrada (planId, collectionId, paymentMethod)
3. Busca plano e valida se está ativo
4. Busca coleção e valida se está ativa
5. Valida disponibilidade da coleção para o plano
6. Verifica se usuário já tem assinatura ativa
7. Obtém ou cria ciclo atual
8. Verifica capacidade do ciclo
9. Cria assinatura vinculada ao ciclo
10. Agenda entregas consecutivas nos próximos ciclos
11. Cria peça bônus (se plano semestral)
12. Incrementa capacidade do ciclo
13. Retorna dados da assinatura criada

## Dependências

### Database Functions

- `get_or_create_current_cycle()`: Obtém ou cria o ciclo atual
- `schedule_consecutive_deliveries()`: Agenda entregas consecutivas
- `increment_cycle_capacity()`: Incrementa capacidade do ciclo

### Tables

- `subscription_plans`: Planos disponíveis
- `collections`: Coleções disponíveis
- `subscriptions`: Assinaturas criadas
- `cycles`: Ciclos de produção
- `subscription_deliveries`: Entregas agendadas
- `bonus_pieces`: Peças bônus

## Exemplo de Uso

### JavaScript/TypeScript

```typescript
const { data, error } = await supabase.functions.invoke('create-subscription-v2', {
  body: {
    planId: 'plan-trimestral-id',
    collectionId: 'collection-marvel-id',
    paymentMethod: 'pix',
    paymentId: 'payment-123'
  }
});

if (error) {
  console.error('Erro ao criar assinatura:', error);
} else {
  console.log('Assinatura criada:', data.subscription);
}
```

### cURL

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/create-subscription-v2' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "planId": "plan-trimestral-id",
    "collectionId": "collection-marvel-id",
    "paymentMethod": "pix"
  }'
```

## Diferenças do Modelo Antigo

| Aspecto | Modelo Antigo | Modelo v2.0 |
|---------|---------------|-------------|
| Preço | Por coleção | Por plano (fixo) |
| Entregas | Manual | Automáticas consecutivas |
| Ciclos | Não usa | Vinculado a ciclos |
| Bônus | Não tem | Semestral tem peça bônus |
| Capacidade | Ilimitada | Limitada por ciclo |

## Testes

Para testar a função localmente:

```bash
# Iniciar Supabase local
supabase start

# Servir função
supabase functions serve create-subscription-v2

# Testar com curl
curl -X POST 'http://localhost:54321/functions/v1/create-subscription-v2' \
  -H 'Authorization: Bearer YOUR_LOCAL_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"planId":"...","collectionId":"...","paymentMethod":"pix"}'
```

## Deploy

```bash
supabase functions deploy create-subscription-v2
```

## Logs

Ver logs no Supabase Dashboard:
- Edge Functions → create-subscription-v2 → Logs

## Related Files

- Design: `.kiro/specs/premium-club-fixed-price-model/design.md`
- Requirements: `.kiro/specs/premium-club-fixed-price-model/requirements.md`
- Tasks: `.kiro/specs/premium-club-fixed-price-model/tasks.md`
- Services:
  - `src/lib/services/cycleService.ts`
  - `src/lib/services/deliveryService.ts`
  - `src/lib/services/bonusPieceService.ts`
