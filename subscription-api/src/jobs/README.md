# Jobs Agendados - Sistema de Assinaturas

Este diretório contém os jobs agendados (cron jobs) do sistema de assinaturas.

## Jobs Implementados

### 1. Expiration Job (`expire-subscriptions.job.ts`)

**Propósito**: Expirar assinaturas que atingiram a data de término e não têm renovação automática ativa.

**Frequência**: Diariamente às 00:00 (meia-noite)

**Critérios de Seleção**:
- `status = 'active'`
- `auto_renew = FALSE`
- `end_date <= NOW()`

**Ações Executadas**:
1. Atualiza status da assinatura para `'expired'`
2. Expira todos os créditos disponíveis do usuário
3. Registra transação de expiração no histórico

**Validações**: Requisitos 2.2.4, 2.2.5

**Configuração**:
```typescript
// Formato do cron: "0 0 * * *"
// - Minuto: 0
// - Hora: 0 (meia-noite)
// - Dia do mês: * (todos)
// - Mês: * (todos)
// - Dia da semana: * (todos)
// - Timezone: America/Sao_Paulo
```

### 2. Auto-Renewal Job (`auto-renew-subscriptions.job.ts`)

**Propósito**: Renovar automaticamente assinaturas que atingiram a data de renovação e têm renovação automática ativa.

**Frequência**: Diariamente às 01:00

**Critérios de Seleção**:
- `status = 'active'`
- `auto_renew = TRUE`
- `next_billing_date <= NOW()`

**Ações Executadas**:
1. Verifica se há `pending_plan_change`
2. Se há mudança de plano agendada:
   - Encerra assinatura anterior
   - Cria nova assinatura com novo tipo de plano
   - Limpa `pending_plan_change`
3. Se não há mudança:
   - Renova plano atual (estende datas)
4. Processa pagamento
5. Aloca créditos do plano (atual ou novo)
6. Soma novos créditos ao saldo existente
7. Cria pedido automático com coleção padrão

**Validações**: Requisitos 2.4, 2.5, 8.3, 8.4, 8.5

**Configuração**:
```typescript
// Formato do cron: "0 1 * * *"
// - Minuto: 0
// - Hora: 1 (01:00)
// - Dia do mês: * (todos)
// - Mês: * (todos)
// - Dia da semana: * (todos)
// - Timezone: America/Sao_Paulo
// Executa às 01:00 para evitar sobreposição com o job de expiração (00:00)
```

## Como Funciona

### Inicialização

Os jobs são inicializados automaticamente quando o servidor inicia. Veja `src/index.ts`:

```typescript
import { scheduleExpirationJob } from './jobs/expire-subscriptions.job.js';
import { scheduleAutoRenewalJob } from './jobs/auto-renew-subscriptions.job.js';

// No startServer()
scheduleExpirationJob();
scheduleAutoRenewalJob();
```

### Execução Manual

Para testar os jobs manualmente sem esperar o horário agendado:

```typescript
// Expiration Job
import { runExpirationJob } from './jobs/expire-subscriptions.job';
await runExpirationJob();

// Auto-Renewal Job
import { runAutoRenewalJob } from './jobs/auto-renew-subscriptions.job';
await runAutoRenewalJob();
```

### Logs

Os jobs produzem logs detalhados:

**Expiration Job:**
```
[Expiration Job] Starting subscription expiration job...
[Expiration Job] Found 3 subscriptions to expire
[Expiration Job] Job completed:
  - Successful: 3
  - Failed: 0
  - Total credits expired: 1800
```

**Auto-Renewal Job:**
```
[Auto-Renewal Job] Starting subscription auto-renewal job...
[Auto-Renewal Job] Found 2 subscriptions to renew
[Auto-Renewal Job] Processing subscription 123 (User 456, Plan: trimestral, Pending: semestral)
[Auto-Renewal Job] Job completed:
  - Successful: 2
  - Failed: 0
  - Plan changes processed: 1
  - Total credits allocated: 2000
[Auto-Renewal Job] Plan changes:
  - Subscription 123 (User 456): trimestral → semestral
```

Em caso de erro:
```
[Expiration Job] Failed subscriptions:
  - Subscription 123 (User 456): Insufficient credits

[Auto-Renewal Job] Failed renewals:
  - Subscription 789 (User 101): Payment processing failed
```

## Testes

### Testes Unitários

Os testes estão em `expire-subscriptions.job.test.ts` e cobrem:

1. ✅ Expiração de assinatura com `end_date` no passado e `auto_renew = false`
2. ✅ NÃO expirar assinatura com `auto_renew = true`
3. ✅ NÃO expirar assinatura com `end_date` no futuro
4. ✅ Processar múltiplas assinaturas expiradas
5. ✅ Lidar com assinatura sem créditos disponíveis
6. ✅ Lidar com resultado vazio graciosamente

### Executar Testes

```bash
# Requer banco de dados rodando
npm test -- expire-subscriptions.job.test.ts
```

### Teste Manual

Para testar manualmente:

1. Crie uma assinatura de teste com `end_date` no passado:
```sql
INSERT INTO subscriptions (user_id, plan_type, status, start_date, end_date, auto_renew)
VALUES (1, 'trimestral', 'active', '2024-01-01', '2024-01-31', FALSE);
```

2. Aloque créditos para o usuário:
```sql
INSERT INTO user_credits (user_id, subscription_id, total_credits, available_credits)
VALUES (1, 1, 600, 600);
```

3. Execute o job manualmente:
```typescript
import { runExpirationJob } from './jobs/expire-subscriptions.job';
await runExpirationJob();
```

4. Verifique os resultados:
```sql
-- Assinatura deve estar expirada
SELECT status FROM subscriptions WHERE id = 1;
-- Resultado esperado: 'expired'

-- Créditos devem estar expirados
SELECT available_credits, expired_credits FROM user_credits WHERE user_id = 1;
-- Resultado esperado: available_credits = 0, expired_credits = 600

-- Transação deve estar registrada
SELECT * FROM credit_transactions 
WHERE user_id = 1 AND transaction_type = 'expiration';
-- Resultado esperado: 1 registro com credits_amount = -600
```

## Tratamento de Erros

O job é resiliente a erros:

1. **Erro em assinatura individual**: Continua processando as demais
2. **Erro fatal**: Loga o erro e lança exceção
3. **Transações atômicas**: Cada assinatura é processada em uma transação separada

## Monitoramento

Recomendações para produção:

1. **Logs**: Monitore os logs do job para identificar falhas
2. **Alertas**: Configure alertas se o job falhar consecutivamente
3. **Métricas**: Acompanhe:
   - Número de assinaturas expiradas por dia
   - Total de créditos expirados
   - Taxa de falha do job

## Próximos Jobs

Jobs planejados para implementação futura:

- **Cycle Close Job**: Fechar ciclos de produção automaticamente
- **Cleanup Job**: Arquivar dados antigos

## Dependências

- `node-cron`: Agendamento de tarefas
- `@types/node-cron`: Tipos TypeScript
- `@prisma/client`: Acesso ao banco de dados
- `credit.service.ts`: Serviço de expiração de créditos
- `transaction.service.ts`: Serviço de registro de transações
- `subscription.service.ts`: Serviço de renovação de assinaturas

## Referências

- Design Document: `.kiro/specs/subscription-credit-system/design.md`
- Requirements: `.kiro/specs/subscription-credit-system/requirements.md`
- Tasks: `.kiro/specs/subscription-credit-system/tasks.md`


### 3. Cycle Closing Job (`close-production-cycles.job.ts`)

**Propósito**: Fechar automaticamente ciclos de produção que atingiram a data de fechamento e processar débito de pedidos automáticos.

**Frequência**: A cada hora (no minuto 0)

**Critérios de Seleção**:
- `status = 'open'`
- `close_date <= NOW()`

**Ações Executadas**:
1. Fecha o ciclo (status = 'closed', closedAt = NOW())
2. Busca todos os pedidos automáticos não debitados do ciclo
3. Bloqueia todos os pedidos (isLocked = true, lockedAt = NOW())
4. Para cada pedido automático:
   - Calcula total de créditos necessários (soma dos order_items)
   - Valida saldo do usuário
   - **Se saldo suficiente**:
     * Debita créditos usando `debitCredits()`
     * Atualiza pedido: status='confirmed', creditsDebited=true
     * Registra transação de crédito tipo 'debit_cycle_close' para cada item
   - **Se saldo insuficiente**:
     * Mantém pedido: status='pending', creditsDebited=false
     * Usuário será notificado sobre saldo insuficiente
5. Toda operação é atômica (transação de banco de dados)

**Validações**: Requisitos 6.5-6.10, 7.5

**Configuração**:
```typescript
// Formato do cron: "0 * * * *"
// - Minuto: 0 (no início de cada hora)
// - Hora: * (todas as horas)
// - Dia do mês: * (todos)
// - Mês: * (todos)
// - Dia da semana: * (todos)
// - Timezone: America/Sao_Paulo
// Executa a cada hora para garantir que ciclos sejam fechados próximo ao horário programado
```

**Logs Detalhados**:
```
[Cycle Closing Job] Starting production cycle closing job...
[Cycle Closing Job] Found 2 cycles to close
[Cycle Closing Job] Processing cycle 1 (Ciclo Janeiro 2024, 50/100 items)
[Cycle Closing Job] Processing cycle 2 (Ciclo Fevereiro 2024, 75/100 items)
[Cycle Closing Job] Job completed:
  - Successful: 2
  - Failed: 0
  - Total orders processed: 25
  - Orders confirmed: 23
  - Orders pending: 2
[Cycle Closing Job] Closed cycles:
  - Cycle 1 (Ciclo Janeiro 2024): 10 confirmed, 1 pending
  - Cycle 2 (Ciclo Fevereiro 2024): 13 confirmed, 1 pending
```

**Execução Manual**:
```typescript
import { runCycleClosingJob } from './jobs/close-production-cycles.job';
await runCycleClosingJob();
```

**Integração**:
O job usa o serviço `closeProductionCycle()` de `production-cycle.service.ts` que já implementa toda a lógica de fechamento de ciclo, incluindo:
- Validação de ciclo aberto
- Bloqueio de pedidos
- Débito de créditos com validação de saldo
- Registro de transações
- Tratamento de saldo insuficiente
- Transação atômica

**Tratamento de Erros**:
- Se um ciclo falhar, o job continua processando os demais ciclos
- Erros são logados com detalhes completos
- Cada ciclo é processado independentemente
- Transações garantem consistência dos dados

**Testes**:
Testes de integração disponíveis em `close-production-cycles.job.test.ts`:
- ✅ Fecha ciclos com close_date no passado
- ✅ Não fecha ciclos com close_date no futuro
- ✅ Processa múltiplos ciclos elegíveis
- ✅ Não processa ciclos já fechados

```bash
# Requer banco de dados rodando
npm test -- close-production-cycles.job.test.ts
```

---

## Resumo de Todos os Jobs

| Job | Frequência | Horário | Função Principal |
|-----|-----------|---------|------------------|
| Expiration | Diário | 00:00 | Expira assinaturas sem renovação automática |
| Auto-Renewal | Diário | 01:00 | Renova assinaturas automaticamente |
| Cycle Closing | Horário | XX:00 | Fecha ciclos de produção e debita pedidos automáticos |

## Ordem de Execução

Os jobs são executados em horários diferentes para evitar sobrecarga:

1. **00:00** - Expiration Job (expira assinaturas)
2. **01:00** - Auto-Renewal Job (renova assinaturas)
3. **A cada hora** - Cycle Closing Job (fecha ciclos)

## Atualização da Inicialização

Os três jobs são inicializados em `src/index.ts`:

```typescript
import { scheduleExpirationJob } from './jobs/expire-subscriptions.job.js';
import { scheduleAutoRenewalJob } from './jobs/auto-renew-subscriptions.job.js';
import { scheduleCycleClosingJob } from './jobs/close-production-cycles.job.js';

// No startServer()
console.log('⏰ Configurando jobs agendados...');
scheduleExpirationJob();
scheduleAutoRenewalJob();
scheduleCycleClosingJob();
console.log('✅ Jobs agendados configurados');
```
