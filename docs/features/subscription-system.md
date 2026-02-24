# 📦 Sistema de Assinaturas - Ordax

Documentação completa do sistema de assinaturas e planos.

---

## 📋 Visão Geral

Sistema de assinaturas que permite aos clientes receberem personagens colecionáveis mensalmente através de planos recorrentes.

### Características Principais
- 📦 Planos Trimestral e Semestral
- 🎁 Peça exclusiva no plano semestral
- 🔄 Trocas ilimitadas antes da produção
- 📅 Entregas mensais programadas
- 💳 Pagamento em 2 etapas (entrada + restante)
- 🎨 Escolha de coleções
- 📊 Acompanhamento de produção
- 🚚 Entrega rastreada

---

## 📊 Planos Disponíveis

### Plano Trimestral

**Duração**: 3 meses  
**Personagens**: 3 (1 por mês)  
**Preço**: R$ 1.350,00  
**Preço PIX**: R$ 1.282,50 (5% desconto)  
**Preço por peça**: R$ 450,00  
**Economia vs Avulso**: R$ 150,00 (10%)

**Benefícios**:
- 3 personagens consecutivos
- Trocas ilimitadas antes da produção
- Acompanhamento do processo
- Entrega rastreada
- Cancelamento simples

### Plano Semestral

**Duração**: 6 meses  
**Personagens**: 7 (6 + 1 exclusiva)  
**Preço**: R$ 2.700,00  
**Preço PIX**: R$ 2.565,00 (5% desconto)  
**Preço por peça**: R$ 385,71  
**Economia vs Avulso**: R$ 800,00 (23%)

**Benefícios**:
- 6 personagens + 1 peça exclusiva
- Trocas ilimitadas antes da produção
- Acompanhamento do processo
- Entrega rastreada
- Cancelamento simples
- Prioridade na produção

---

## 🏗️ Arquitetura

### Banco de Dados

#### Tabela: subscription_plans
```sql
- id (uuid)
- name (text) - "Trimestral", "Semestral"
- duration_months (integer) - 3, 6
- characters_count (integer) - 3, 7
- price_full (numeric)
- price_pix (numeric)
- deposit_amount (numeric)
- is_active (boolean)
- features (jsonb) - Lista de benefícios
- created_at (timestamp)
```

#### Tabela: subscriptions
```sql
- id (uuid)
- user_id (uuid) → profiles
- plan_id (uuid) → subscription_plans
- status (enum: pending, active, paused, cancelled, completed)
- payment_method (text)
- start_date (date)
- end_date (date)
- next_delivery_date (date)
- total_paid (numeric)
- created_at (timestamp)
- updated_at (timestamp)
```

#### Tabela: subscription_collections
```sql
- id (uuid)
- subscription_id (uuid) → subscriptions
- collection_id (uuid) → collections
- delivery_order (integer) - 1, 2, 3...
- status (enum: pending, in_production, shipped, delivered)
- character_id (uuid) → characters (opcional)
- shipped_at (timestamp)
- delivered_at (timestamp)
```

#### Tabela: subscription_deliveries
```sql
- id (uuid)
- subscription_id (uuid) → subscriptions
- delivery_number (integer) - 1, 2, 3...
- scheduled_date (date)
- character_id (uuid) → characters
- status (enum: pending, in_production, shipped, delivered)
- tracking_code (text)
- shipped_at (timestamp)
- delivered_at (timestamp)
```

---

## 💳 Fluxo de Pagamento

### Etapa 1: Entrada (No Ato da Assinatura)

**Valor**: R$ 100,00 (fixo)
- Não reembolsável
- Garante vaga no lote
- Pago no momento da assinatura

### Etapa 2: Restante (Quando Pronto)

**Trimestral**:
- PIX: R$ 1.182,50 (R$ 1.282,50 - R$ 100)
- Parcelado: R$ 1.250,00 (até 6x sem juros)

**Semestral**:
- PIX: R$ 2.465,00 (R$ 2.565,00 - R$ 100)
- Parcelado: R$ 2.600,00 (até 6x sem juros)

---

## 🎨 Interface do Cliente

### Página de Assinatura (/colecoes/:slug/assinar)

**Localização**: `src/pages/SubscribeCollection.tsx`

**Seções**:

1. **Seleção de Plano**
   - Cards com planos disponíveis
   - Destaque de economia
   - Benefícios listados
   - Preço PIX e parcelado

2. **Escolha de Coleções**
   - Grid de coleções disponíveis
   - Filtro por franquia
   - Preview de personagens
   - Seleção múltipla (até o limite do plano)

3. **Forma de Pagamento**
   - PIX (5% desconto)
   - Cartão (até 6x sem juros)
   - Resumo de valores

4. **Resumo do Pedido**
   - Plano selecionado
   - Coleções escolhidas
   - Forma de pagamento
   - Valor total
   - Botão "Assinar Agora"

### Minhas Assinaturas (/minhas-assinaturas)

**Localização**: `src/pages/MySubscriptions.tsx`

**Funcionalidades**:
- Lista de assinaturas ativas
- Status de cada entrega
- Próxima entrega programada
- Histórico de entregas
- Opção de trocar personagem
- Opção de pausar/cancelar

---

## 🛠️ Interface Admin

### AdminSubscriptions (/admin/assinaturas)

**Localização**: `src/pages/admin/AdminSubscriptions.tsx`

**Funcionalidades**:
- Lista de todas as assinaturas
- Filtros por status/plano
- Detalhes de cada assinatura
- Gerenciar entregas
- Atualizar status
- Processar pagamentos
- Cancelar/pausar assinaturas

### AdminPlans (/admin/planos)

**Localização**: `src/pages/admin/AdminPlans.tsx`

**Funcionalidades**:
- Gerenciar planos
- Criar/editar planos
- Ativar/desativar planos
- Configurar preços
- Definir benefícios

---

## 🔄 Fluxo Completo

### 1. Cliente Assina

```
1. Acessa /colecoes/:slug/assinar
2. Seleciona plano (Trimestral ou Semestral)
3. Escolhe coleções (3 ou 7)
4. Seleciona forma de pagamento
5. Clica "Assinar Agora"
6. Paga entrada (R$ 100)
7. Recebe confirmação
```

### 2. Sistema Processa

```
1. Cria registro em subscriptions
2. Cria registros em subscription_collections
3. Agenda primeira entrega
4. Envia email de confirmação
5. Notifica admin
```

### 3. Produção e Entrega

```
1. Admin inicia produção do primeiro personagem
2. Cliente acompanha status
3. Quando pronto, cliente paga restante
4. Admin envia personagem
5. Cliente recebe e confirma
6. Processo se repete para próximos personagens
```

### 4. Entregas Mensais

```
1. Cron job verifica entregas programadas
2. Cria próxima entrega automaticamente
3. Notifica cliente
4. Cliente pode trocar personagem (até X dias antes)
5. Produção inicia
6. Ciclo continua
```

---

## 💻 Hooks e Serviços

### useSubscriptions

```typescript
import { useSubscriptions } from '@/hooks/useSubscriptions';

function MyComponent() {
  const { data: subscriptions, isLoading } = useSubscriptions();
  
  return (
    <div>
      {subscriptions?.map(sub => (
        <div key={sub.id}>
          <h3>{sub.plan.name}</h3>
          <p>Status: {sub.status}</p>
          <p>Próxima entrega: {sub.next_delivery_date}</p>
        </div>
      ))}
    </div>
  );
}
```

### subscriptionService

```typescript
import { subscriptionService } from '@/lib/subscription-service';

// Criar assinatura
const subscription = await subscriptionService.create({
  plan_id: planId,
  collection_ids: [col1, col2, col3],
  payment_method: 'pix'
});

// Pausar assinatura
await subscriptionService.pause(subscriptionId);

// Cancelar assinatura
await subscriptionService.cancel(subscriptionId);

// Trocar personagem
await subscriptionService.swapCharacter(
  subscriptionId,
  deliveryNumber,
  newCharacterId
);
```

---

## 🎁 Sistema de Trocas

### Regras de Troca

**Permitido**:
- Trocar personagem antes da produção iniciar
- Trocas ilimitadas (dentro do prazo)
- Trocar por qualquer personagem da mesma coleção

**Não Permitido**:
- Trocar após produção iniciada
- Trocar por personagem de outra coleção
- Trocar após entrega

### Prazo de Troca

**Padrão**: Até 7 dias antes da data programada de produção

**Exemplo**:
```
Entrega programada: 15/03/2026
Produção inicia: 08/03/2026
Prazo de troca: Até 01/03/2026
```

### Interface de Troca

```typescript
// Cliente acessa "Minhas Assinaturas"
// Clica em "Trocar Personagem" na entrega desejada
// Seleciona novo personagem
// Confirma troca
// Sistema atualiza automaticamente
```

---

## 📅 Sistema de Entregas

### Agendamento Automático

**Cron Job**: Roda diariamente às 00:00

```typescript
// Pseudo-código
for each active subscription:
  if next_delivery_date is null:
    schedule_first_delivery(subscription)
  else if last_delivery was delivered:
    schedule_next_delivery(subscription)
```

### Cálculo de Datas

**Primeira Entrega**: 30 dias após assinatura

**Entregas Seguintes**: 30 dias após entrega anterior

**Exemplo Trimestral**:
```
Assinatura: 01/01/2026
Entrega 1: 01/02/2026
Entrega 2: 01/03/2026
Entrega 3: 01/04/2026
```

---

## 📧 Notificações

### Emails Automáticos

**Assinatura Criada**:
- Confirmação de assinatura
- Detalhes do plano
- Próximos passos
- Link para acompanhamento

**Entrega Programada**:
- 7 dias antes: Lembrete de troca
- 3 dias antes: Último aviso de troca
- No dia: Produção iniciada

**Produção Iniciada**:
- Status atualizado
- Previsão de conclusão
- Link para acompanhamento

**Pronto para Pagamento**:
- Personagem pronto
- Link de pagamento
- Prazo de pagamento

**Enviado**:
- Código de rastreamento
- Previsão de entrega
- Instruções de recebimento

**Entregue**:
- Confirmação de entrega
- Solicitação de feedback
- Próxima entrega programada

---

## 🔧 Edge Functions

### create-subscription

**Localização**: `supabase/functions/create-subscription/`

**Funcionalidade**:
```typescript
1. Validar autenticação
2. Validar dados (plano, coleções)
3. Criar assinatura no banco
4. Gerar link de pagamento (entrada)
5. Enviar email de confirmação
6. Retornar dados da assinatura
```

**Uso**:
```typescript
const response = await fetch(
  'https://xxx.supabase.co/functions/v1/create-subscription',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      plan_id: planId,
      collection_ids: [col1, col2, col3],
      payment_method: 'pix'
    })
  }
);
```

### process-subscription-payment

**Funcionalidade**:
```typescript
1. Receber webhook de pagamento
2. Validar assinatura do webhook
3. Atualizar status da assinatura
4. Agendar primeira entrega
5. Enviar email de confirmação
```

### schedule-deliveries (Cron)

**Funcionalidade**:
```typescript
1. Buscar assinaturas ativas
2. Verificar entregas pendentes
3. Criar próximas entregas
4. Enviar notificações
```

**Agendamento**: Diário às 00:00

---

## 📊 Status e Estados

### Status de Assinatura

- **pending**: Aguardando pagamento da entrada
- **active**: Ativa e recebendo entregas
- **paused**: Pausada temporariamente
- **cancelled**: Cancelada pelo cliente
- **completed**: Concluída (todas entregas feitas)

### Status de Entrega

- **pending**: Aguardando produção
- **in_production**: Em produção
- **ready**: Pronto, aguardando pagamento
- **payment_pending**: Aguardando pagamento do restante
- **shipped**: Enviado
- **delivered**: Entregue

---

## 🧪 Testes

### Testar Fluxo Completo

1. **Criar Assinatura**
   - Acessar /colecoes/marvel/assinar
   - Selecionar plano
   - Escolher coleções
   - Confirmar

2. **Verificar Criação**
   - Checar registro em subscriptions
   - Verificar subscription_collections
   - Confirmar email enviado

3. **Simular Entrega**
   - Admin marca como "em produção"
   - Admin marca como "pronto"
   - Cliente paga restante
   - Admin envia

4. **Verificar Próxima Entrega**
   - Cron job cria próxima entrega
   - Cliente recebe notificação
   - Pode trocar personagem

---

## 🎯 Melhores Práticas

### Para Maximizar Conversão

1. **Destacar Economia**: Mostrar quanto economiza vs avulso
2. **Linguagem Premium**: Evitar "desconto", "promoção"
3. **Benefícios Claros**: Listar vantagens específicas
4. **Social Proof**: Mostrar quantos assinantes
5. **Garantia**: Cancelamento simples

### Para Melhor Retenção

1. **Comunicação Constante**: Notificar em cada etapa
2. **Flexibilidade**: Permitir trocas e pausas
3. **Qualidade**: Garantir entregas no prazo
4. **Suporte**: Responder rápido a dúvidas
5. **Surpresas**: Brindes ocasionais

---

## 📚 Referências

### Código-Fonte

**Páginas Cliente**:
- `src/pages/SubscribeCollection.tsx`
- `src/pages/MySubscriptions.tsx`
- `src/pages/Plans.tsx`

**Páginas Admin**:
- `src/pages/admin/AdminSubscriptions.tsx`
- `src/pages/admin/AdminPlans.tsx`

**Serviços**:
- `src/lib/subscription-service.ts`
- `src/lib/delivery-service.ts`

**Hooks**:
- `src/hooks/useSubscriptions.ts`
- `src/hooks/useDeliveries.ts`

### Migrations

- `20260202115000_create_subscriptions_system.sql`
- `20260202140000_create_subscription_collections.sql`
- `20260202150000_create_subscription_plans.sql`
- `20260215160000_fix_subscription_discounts.sql`
- `20260215161000_clean_collections_data.sql`

### Edge Functions

- `supabase/functions/create-subscription/`
- `supabase/functions/cancel-subscription/`
- `supabase/functions/get-my-subscriptions/`

---

## 🔮 Roadmap

### Curto Prazo (1 mês)
- [ ] Implementar Edge Functions completas
- [ ] Integrar gateway de pagamento
- [ ] Configurar webhooks
- [ ] Testar fluxo completo

### Médio Prazo (3 meses)
- [ ] Sistema de pontos/recompensas
- [ ] Plano anual
- [ ] Gift subscriptions
- [ ] Programa de indicação

### Longo Prazo (6+ meses)
- [ ] Assinatura de múltiplas coleções
- [ ] Personalização de frequência
- [ ] Marketplace de trocas entre assinantes
- [ ] App mobile

---

**Última atualização**: 2026-02-24  
**Versão**: 1.0.0  
**Status**: ✅ Frontend Completo | ⏳ Backend em Desenvolvimento
