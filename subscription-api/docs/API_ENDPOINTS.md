# API Endpoints - Referência Rápida

## Índice

- [Autenticação](#autenticação)
- [Assinaturas](#assinaturas)
- [Créditos](#créditos)
- [Personagens](#personagens)
- [Pedidos](#pedidos)
- [Ciclos de Produção](#ciclos-de-produção)
- [Admin - Assinaturas](#admin---assinaturas)
- [Admin - Personagens](#admin---personagens)
- [Admin - Ciclos](#admin---ciclos)
- [Admin - Dashboard](#admin---dashboard)

## Autenticação

Todos os endpoints (exceto públicos) requerem autenticação via JWT:

```
Authorization: Bearer <token>
```

Endpoints administrativos requerem role `admin` no token.

---

## Assinaturas

### POST /api/subscriptions/activate

Ativa nova assinatura para usuário.

**Request:**
```json
{
  "user_id": 1,
  "plan_type": "trimestral",  // "trimestral" | "semestral"
  "payment_method_id": "pm_xxx"
}
```

**Response:**
```json
{
  "subscription_id": 1,
  "credits_allocated": 600,
  "order_id": 1
}
```

**Ações:**
1. Valida e processa pagamento
2. Cria assinatura ativa
3. Aloca créditos (600 para trimestral, 1400 para semestral)
4. Cria pedido automático com coleção padrão
5. Vincula ao ciclo de produção aberto

---

### POST /api/subscriptions/:id/schedule-plan-change

Agenda upgrade ou downgrade de plano para próxima renovação.

**Request:**
```json
{
  "new_plan_type": "semestral"  // "trimestral" | "semestral"
}
```

**Response:**
```json
{
  "pending_plan_change": "semestral",
  "effective_date": "2024-06-01T00:00:00Z"
}
```

**Notas:**
- Mudança só entra em vigor na próxima renovação
- Protege contra exploits financeiros
- Usuário continua com plano atual até a data efetiva

---

### POST /api/subscriptions/:id/cancel

Cancela assinatura com extorno proporcional.

**Request:**
```json
{
  "cancellation_type": "with_refund"
}
```

**Response:**
```json
{
  "refund_amount": 66.60,
  "credits_expired": 400
}
```

**Cálculo do reembolso:**
```
reembolso = (preço_plano × dias_restantes) ÷ dias_totais
```

**Ações:**
1. Calcula reembolso baseado APENAS em tempo restante
2. Processa reembolso via gateway
3. Expira TODOS os créditos imediatamente
4. Marca assinatura como cancelada

---

### POST /api/subscriptions/:id/no-renewal

Desativa renovação automática (mantém acesso até fim do período).

**Request:**
```json
{
  "cancellation_type": "no_renewal"
}
```

**Response:**
```json
{
  "end_date": "2024-06-01T00:00:00Z",
  "credits_valid_until": "2024-06-01T00:00:00Z"
}
```

**Diferenças vs cancelamento com extorno:**
- ✅ Mantém assinatura ativa até end_date
- ✅ Créditos permanecem válidos até end_date
- ❌ Sem reembolso
- ❌ Não renova automaticamente

---

### GET /api/subscriptions/:id

Consulta detalhes da assinatura.

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "plan_type": "trimestral",
  "status": "active",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-04-01T00:00:00Z",
  "next_billing_date": "2024-04-01T00:00:00Z",
  "auto_renew": true,
  "pending_plan_change": null
}
```

---

## Créditos

### GET /api/credits/balance

Consulta saldo de créditos do usuário autenticado.

**Response:**
```json
{
  "total_credits": 600,
  "used_credits": 150,
  "available_credits": 450,
  "expired_credits": 0,
  "subscription_status": "active"
}
```

**Invariante:**
```
available_credits = total_credits - used_credits
```

---

### GET /api/credits/transactions

Lista histórico de transações de créditos.

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `transaction_type` (opcional): `allocation` | `debit_immediate` | `debit_cycle_close` | `expiration` | `adjustment`

**Response:**
```json
{
  "transactions": [
    {
      "id": 1,
      "transaction_type": "allocation",
      "credits_amount": 600,
      "character_id": null,
      "order_id": null,
      "description": "Alocação inicial - Plano Trimestral",
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "transaction_type": "debit_immediate",
      "credits_amount": -100,
      "character_id": 5,
      "order_id": 2,
      "description": "Compra individual - Personagem X",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

---

## Personagens

### GET /api/characters

Lista personagens do catálogo.

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `plan_type` (opcional): usado para filtrar exclusivos

**Response:**
```json
{
  "characters": [
    {
      "id": 1,
      "name": "Personagem A",
      "description": "Descrição do personagem",
      "price_cash": 29.90,
      "price_credits": 100,
      "is_exclusive_semestral": false,
      "is_standard_collection": true,
      "image_url": "https://..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "total_pages": 3
  }
}
```

**Filtragem automática:**
- Não autenticado: todos os personagens ativos
- Plano trimestral: apenas não exclusivos
- Plano semestral: todos os personagens

---

### GET /api/characters/:id

Detalhes de personagem específico.

**Response:**
```json
{
  "id": 1,
  "name": "Personagem A",
  "description": "Descrição detalhada do personagem",
  "price_cash": 29.90,
  "price_credits": 100,
  "is_exclusive_semestral": false,
  "is_standard_collection": true,
  "image_url": "https://..."
}
```

---

### GET /api/characters/standard-collection

Lista personagens da coleção padrão (entregue automaticamente ao assinar).

**Response:**
```json
{
  "characters": [
    {
      "id": 1,
      "name": "Personagem Padrão 1",
      "price_credits": 50
    },
    {
      "id": 2,
      "name": "Personagem Padrão 2",
      "price_credits": 50
    }
  ]
}
```

---

## Pedidos

### POST /api/orders/individual

Cria pedido de compra individual (débito imediato de créditos).

**Request:**
```json
{
  "character_id": 5,
  "use_credits": true
}
```

**Response:**
```json
{
  "order_id": 10,
  "credits_debited": 100,
  "production_cycle_id": 1,
  "status": "confirmed"
}
```

**Validações:**
- ✅ Usuário tem assinatura ativa
- ✅ Saldo de créditos suficiente
- ✅ Personagem está ativo
- ✅ Se exclusivo, usuário tem plano semestral
- ✅ Ciclo tem capacidade disponível

**Ações:**
1. Valida saldo e acesso
2. Debita créditos IMEDIATAMENTE
3. Cria pedido confirmado e bloqueado
4. Vincula ao ciclo de produção
5. Registra transação de crédito

---

### GET /api/orders/automatic/:id

Consulta pedido automático (coleção padrão).

**Response:**
```json
{
  "order_id": 1,
  "order_type": "automatic",
  "characters": [
    {
      "id": 1,
      "name": "Personagem Padrão 1",
      "credits_cost": 50
    },
    {
      "id": 2,
      "name": "Personagem Padrão 2",
      "credits_cost": 50
    }
  ],
  "total_credits": 100,
  "is_locked": false,
  "credits_debited": false,
  "production_cycle": {
    "id": 1,
    "name": "Ciclo Janeiro 2024",
    "close_date": "2024-02-01T00:00:00Z",
    "status": "open"
  }
}
```

---

### PUT /api/orders/automatic/:id

Modifica pedido automático (apenas se ciclo ainda está aberto).

**Request:**
```json
{
  "character_ids": [1, 2, 3]
}
```

**Response:**
```json
{
  "order_id": 1,
  "characters": [...],
  "total_credits": 150
}
```

**Validações:**
- ✅ Pedido não está bloqueado (is_locked = false)
- ✅ Ciclo ainda está aberto
- ✅ Personagens pertencem à coleção padrão

---

### GET /api/orders

Lista pedidos do usuário autenticado.

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `order_type` (opcional): `individual` | `automatic`
- `status` (opcional): `pending` | `confirmed` | `in_production` | `shipped`

**Response:**
```json
{
  "orders": [
    {
      "id": 1,
      "order_type": "automatic",
      "status": "confirmed",
      "total_credits": 100,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

## Ciclos de Produção

### GET /api/production-cycles/current

Retorna ciclo de produção aberto atual.

**Response:**
```json
{
  "id": 1,
  "name": "Ciclo Janeiro 2024",
  "capacity_limit": 10000,
  "current_count": 5432,
  "status": "open",
  "close_date": "2024-02-01T00:00:00Z",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Status possíveis:**
- `open`: Aceitando novos pedidos
- `full`: Capacidade atingida
- `closed`: Fechado (processando)

---

### GET /api/production-cycles/:id/orders

Lista pedidos de um ciclo específico.

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `priority_only` (opcional): `true` | `false`

**Response:**
```json
{
  "orders": [
    {
      "id": 1,
      "user_id": 1,
      "order_type": "automatic",
      "is_priority": true,
      "total_credits": 100,
      "status": "confirmed"
    }
  ],
  "pagination": {...}
}
```

---

## Admin - Assinaturas

### GET /admin/subscriptions

Lista todas as assinaturas (paginado).

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (opcional): `active` | `expired` | `cancelled`
- `plan_type` (opcional): `trimestral` | `semestral`

**Response:**
```json
{
  "subscriptions": [
    {
      "id": 1,
      "user_id": 1,
      "plan_type": "trimestral",
      "status": "active",
      "start_date": "2024-01-01T00:00:00Z",
      "end_date": "2024-04-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### GET /admin/subscriptions/:id

Detalhes completos de uma assinatura.

**Response:**
```json
{
  "subscription": {
    "id": 1,
    "user_id": 1,
    "plan_type": "trimestral",
    "status": "active",
    ...
  },
  "user": {
    "id": 1,
    "email": "user@example.com",
    ...
  },
  "credits": {
    "total_credits": 600,
    "used_credits": 150,
    "available_credits": 450
  },
  "orders": [...]
}
```

---

### POST /admin/subscriptions/:id/adjust-credits

Ajusta manualmente saldo de créditos de um usuário.

**Request:**
```json
{
  "credits_adjustment": 100,  // Positivo para adicionar, negativo para remover
  "reason": "Compensação por erro no sistema"
}
```

**Response:**
```json
{
  "new_balance": {
    "total_credits": 700,
    "used_credits": 150,
    "available_credits": 550
  },
  "transaction_id": 123
}
```

---

### POST /admin/subscriptions/:id/force-cancel

Cancela assinatura administrativamente.

**Request:**
```json
{
  "reason": "Violação dos termos de uso",
  "refund_amount": 50.00  // Opcional, valor customizado de reembolso
}
```

**Response:**
```json
{
  "cancelled_at": "2024-01-15T10:30:00Z",
  "refund_processed": true,
  "refund_amount": 50.00
}
```

---

## Admin - Personagens

### POST /admin/characters

Cria novo personagem no catálogo.

**Request:**
```json
{
  "name": "Novo Personagem",
  "description": "Descrição detalhada",
  "price_cash": 29.90,
  "price_credits": 100,
  "is_exclusive_semestral": false,
  "is_standard_collection": false,
  "image_url": "https://..."
}
```

**Response:**
```json
{
  "character_id": 10,
  "name": "Novo Personagem",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### PUT /admin/characters/:id

Atualiza personagem existente.

**Request:**
```json
{
  "name": "Nome Atualizado",
  "price_cash": 34.90,
  "price_credits": 120,
  "is_active": true
}
```

**Response:**
```json
{
  "character": {
    "id": 10,
    "name": "Nome Atualizado",
    ...
  }
}
```

---

### DELETE /admin/characters/:id

Desativa personagem (soft delete).

**Response:**
```json
{
  "success": true,
  "message": "Personagem desativado com sucesso"
}
```

**Nota:** Personagens não são deletados fisicamente, apenas marcados como `is_active = false`.

---

## Admin - Ciclos

### POST /admin/production-cycles

Cria novo ciclo de produção.

**Request:**
```json
{
  "name": "Ciclo Fevereiro 2024",
  "capacity_limit": 10000,
  "close_date": "2024-03-01T00:00:00Z"
}
```

**Response:**
```json
{
  "cycle_id": 2,
  "name": "Ciclo Fevereiro 2024",
  "status": "open",
  "created_at": "2024-02-01T00:00:00Z"
}
```

---

### POST /admin/production-cycles/:id/close

Fecha ciclo manualmente (processa débitos de pedidos automáticos).

**Response:**
```json
{
  "closed_at": "2024-02-01T00:00:00Z",
  "orders_processed": 150,
  "credits_debited": 15000,
  "insufficient_balance_count": 5
}
```

**Ações:**
1. Marca ciclo como fechado
2. Bloqueia todos os pedidos (is_locked = true)
3. Processa débito de pedidos automáticos
4. Registra transações de crédito
5. Notifica usuários com saldo insuficiente

---

### GET /admin/production-cycles/:id/statistics

Estatísticas detalhadas do ciclo.

**Response:**
```json
{
  "cycle": {
    "id": 1,
    "name": "Ciclo Janeiro 2024",
    "status": "closed"
  },
  "statistics": {
    "total_orders": 150,
    "priority_orders": 80,
    "total_characters": 450,
    "capacity_used_percent": 54.32,
    "total_credits_debited": 15000,
    "average_credits_per_order": 100
  }
}
```

---

### POST /admin/production-cycles/:id/limits

Define limites de personagens por usuário para o ciclo.

**Request:**
```json
{
  "plan_type": "trimestral",  // "trimestral" | "semestral" | "global"
  "character_limit": 5
}
```

**Response:**
```json
{
  "limit_id": 1,
  "production_cycle_id": 1,
  "plan_type": "trimestral",
  "character_limit": 5
}
```

---

## Admin - Dashboard

### GET /admin/dashboard/metrics

Métricas gerais do sistema.

**Response:**
```json
{
  "subscriptions": {
    "total_active": 1250,
    "trimestral_count": 800,
    "semestral_count": 450,
    "monthly_recurring_revenue": 125000.00
  },
  "credits": {
    "total_in_circulation": 750000,
    "total_used": 300000,
    "total_available": 450000,
    "conversion_rate": 40.00
  },
  "current_cycle": {
    "id": 1,
    "name": "Ciclo Janeiro 2024",
    "capacity_used_percent": 54.32,
    "orders_count": 150
  },
  "recent_activity": {
    "new_subscriptions_today": 15,
    "orders_today": 45,
    "revenue_today": 1500.00
  }
}
```

---

## Códigos de Status HTTP

- `200 OK` - Requisição bem-sucedida
- `201 Created` - Recurso criado com sucesso
- `400 Bad Request` - Dados inválidos
- `401 Unauthorized` - Não autenticado
- `403 Forbidden` - Sem permissão (não é admin)
- `404 Not Found` - Recurso não encontrado
- `409 Conflict` - Conflito (ex: saldo insuficiente)
- `500 Internal Server Error` - Erro no servidor

## Formato de Erros

```json
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Saldo de créditos insuficiente",
    "details": {
      "required": 100,
      "available": 50
    }
  }
}
```
