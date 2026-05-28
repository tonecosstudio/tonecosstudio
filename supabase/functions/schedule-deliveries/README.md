# Edge Function: schedule-deliveries

## Visão Geral

Edge Function para gerenciamento manual de entregas por administradores. Permite reagendar entregas, atualizar status e trocar personagens.

**Feature:** premium-club-fixed-price-model  
**Task:** 3.10  
**Spec:** `.kiro/specs/premium-club-fixed-price-model/`

## Funcionalidades

- ✅ Reagendar entrega para outro ciclo
- ✅ Atualizar status de entrega
- ✅ Trocar personagem de entrega (se ciclo permitir)
- ✅ Validar permissões de modificação por status do ciclo
- ✅ Adicionar código de rastreamento

## Endpoint

```
POST /functions/v1/schedule-deliveries
```

## Autenticação

**Requer permissão de administrador.**

Token JWT do admin no header `Authorization: Bearer <token>`.

## Request Body

### Ação: Reagendar Entrega

```typescript
{
  action: "reschedule";
  deliveryId: string;
  cycleId: string;  // ID do novo ciclo
}
```

### Ação: Atualizar Status

```typescript
{
  action: "update_status";
  deliveryId: string;
  status: "scheduled" | "pending_production" | "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  trackingCode?: string;  // Opcional, usado quando status = "shipped"
}
```

### Ação: Trocar Personagem

```typescript
{
  action: "change_character";
  deliveryId: string;
  characterId: string;  // ID do novo personagem
}
```

## Response

### Sucesso (200)

```json
{
  "success": true,
  "message": "Entrega reagendada com sucesso",
  "delivery": {
    "id": "uuid",
    "subscription_id": "uuid",
    "cycle_id": "uuid",
    "character_id": "uuid",
    "delivery_number": 2,
    "status": "scheduled",
    "scheduled_date": "2026-05-07",
    "cycle": {
      "cycle_number": 1,
      "month": 5,
      "year": 2026,
      "shipping_date": "2026-05-07",
      "status": "open"
    }
  }
}
```

### Erros

**400 Bad Request**
```json
{
  "error": "action e deliveryId são obrigatórios"
}
```

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden**
```json
{
  "error": "Forbidden: admin only"
}
```

**404 Not Found**
```json
{
  "error": "Entrega não encontrada"
}
```

**500 Internal Server Error**
```json
{
  "error": "Mensagem de erro detalhada"
}
```

## Validações

### Reagendamento
- Ciclo de destino deve existir
- Ciclo de destino deve estar com status "open"
- Entrega deve existir

### Atualização de Status
- Status deve ser válido
- Entrega deve existir
- Timestamps são adicionados automaticamente (shipped_at, delivered_at)

### Troca de Personagem
- Ciclo da entrega deve estar "open"
- Personagem deve existir
- Entrega deve existir

## Regras de Negócio

### Status do Ciclo

| Status do Ciclo | Permite Modificações? |
|-----------------|----------------------|
| open | ✅ Sim |
| production | ❌ Não |
| shipping | ❌ Não |
| completed | ❌ Não |

**Importante:** Apenas ciclos com status "open" permitem modificações (reagendamento e troca de personagem).

### Transições de Status

```
scheduled → pending_production → pending → processing → shipped → delivered
                                                              ↓
                                                          cancelled
```

## Exemplos de Uso

### 1. Reagendar Entrega

```typescript
const { data, error } = await supabase.functions.invoke('schedule-deliveries', {
  body: {
    action: 'reschedule',
    deliveryId: 'delivery-123',
    cycleId: 'cycle-456'
  }
});
```

### 2. Atualizar Status para Enviado

```typescript
const { data, error } = await supabase.functions.invoke('schedule-deliveries', {
  body: {
    action: 'update_status',
    deliveryId: 'delivery-123',
    status: 'shipped',
    trackingCode: 'BR123456789'
  }
});
```

### 3. Trocar Personagem

```typescript
const { data, error } = await supabase.functions.invoke('schedule-deliveries', {
  body: {
    action: 'change_character',
    deliveryId: 'delivery-123',
    characterId: 'character-789'
  }
});
```

### cURL - Reagendar

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/schedule-deliveries' \
  -H 'Authorization: Bearer ADMIN_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "reschedule",
    "deliveryId": "delivery-123",
    "cycleId": "cycle-456"
  }'
```

### cURL - Atualizar Status

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/schedule-deliveries' \
  -H 'Authorization: Bearer ADMIN_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "update_status",
    "deliveryId": "delivery-123",
    "status": "shipped",
    "trackingCode": "BR123456789"
  }'
```

### cURL - Trocar Personagem

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/schedule-deliveries' \
  -H 'Authorization: Bearer ADMIN_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "change_character",
    "deliveryId": "delivery-123",
    "characterId": "character-789"
  }'
```

## Casos de Uso

### Admin Panel

Esta função é projetada para ser usada pelo Admin Panel para:

1. **Reagendamento de Emergência**
   - Cliente solicitou mudança de data
   - Problema de produção requer adiamento
   - Ajuste de capacidade entre ciclos

2. **Gestão de Status**
   - Marcar entregas como enviadas
   - Adicionar código de rastreamento
   - Marcar como entregue
   - Cancelar entregas

3. **Ajustes de Personagem**
   - Cliente solicitou troca (dentro do prazo)
   - Erro na seleção inicial
   - Personagem indisponível

## Fluxo de Execução

### Reagendamento
1. Verifica permissão de admin
2. Valida entrada
3. Busca entrega
4. Busca novo ciclo
5. Verifica se novo ciclo está "open"
6. Atualiza entrega com novo ciclo e data
7. Retorna entrega atualizada

### Atualização de Status
1. Verifica permissão de admin
2. Valida entrada
3. Busca entrega
4. Atualiza status e timestamps
5. Adiciona tracking code (se fornecido)
6. Retorna entrega atualizada

### Troca de Personagem
1. Verifica permissão de admin
2. Valida entrada
3. Busca entrega
4. Verifica se ciclo está "open"
5. Valida personagem
6. Atualiza entrega com novo personagem
7. Retorna entrega atualizada

## Dependências

### Tables
- `subscription_deliveries`: Entregas
- `cycles`: Ciclos de produção
- `collection_characters`: Personagens
- `profiles.role`: Verificação de admin (`admin` ou `super_admin`)

## Testes

```bash
# Iniciar Supabase local
supabase start

# Servir função
supabase functions serve schedule-deliveries

# Testar reagendamento
curl -X POST 'http://localhost:54321/functions/v1/schedule-deliveries' \
  -H 'Authorization: Bearer ADMIN_LOCAL_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"action":"reschedule","deliveryId":"...","cycleId":"..."}'
```

## Deploy

```bash
supabase functions deploy schedule-deliveries
```

## Logs

Ver logs no Supabase Dashboard:
- Edge Functions → schedule-deliveries → Logs

## Segurança

- ✅ Requer autenticação JWT
- ✅ Requer permissão de admin (verificado via `assertAdmin`)
- ✅ Valida existência de recursos
- ✅ Valida regras de negócio (status do ciclo)
- ✅ Logs de todas as operações

## Related Files

- Design: `.kiro/specs/premium-club-fixed-price-model/design.md`
- Requirements: `.kiro/specs/premium-club-fixed-price-model/requirements.md`
- Tasks: `.kiro/specs/premium-club-fixed-price-model/tasks.md`
- Services:
  - `src/lib/services/deliveryService.ts`
  - `src/lib/services/cycleService.ts`
- Admin Components:
  - `src/pages/admin/AdminCycleManager.tsx`
