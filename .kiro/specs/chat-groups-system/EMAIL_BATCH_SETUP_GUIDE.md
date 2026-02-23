# Guia de Configuração - Email Batch Job

## Visão Geral

Este guia documenta como configurar o cron job `send-group-emails-batch` que envia notificações por email para membros de grupos a cada 2 minutos.

**Contexto**: Quando um admin envia uma mensagem broadcast em um grupo, o sistema:
1. Entrega via Realtime para membros online
2. Envia email para TODOS os membros (respeitando preferências de notificação)

**Abordagem V1 Simples**: Sempre envia email para todos os membros (respeitando `email_notifications_enabled`).

## Pré-requisitos

Antes de configurar o cron job, certifique-se de que:

1. ✅ A Edge Function `send-group-emails-batch` está deployada
2. ✅ A migration `20260223000011_setup_email_batch_cron.sql` foi executada
3. ✅ Você tem acesso ao Supabase Dashboard (SQL Editor)
4. ✅ Você tem a Service Role Key do seu projeto
5. ✅ O provedor de email (Resend ou SendGrid) está configurado

## Passo 1: Obter Informações Necessárias

### 1.1 Project Reference (Project URL)

No Supabase Dashboard:
1. Vá em **Settings** → **API**
2. Copie o **Project URL**: `https://[YOUR-PROJECT-REF].supabase.co`
3. Anote o `[YOUR-PROJECT-REF]` (ex: `abcdefghijklmnop`)

### 1.2 Service Role Key

No Supabase Dashboard:
1. Vá em **Settings** → **API**
2. Copie a **service_role key** (secret)
3. ⚠️ **IMPORTANTE**: Esta chave é secreta, nunca commite no código!

### 1.3 Verificar Edge Function Deployada

```bash
# Listar Edge Functions deployadas
supabase functions list

# Deve aparecer: send-group-emails-batch
```

Se não estiver deployada:

```bash
# Deploy da Edge Function
supabase functions deploy send-group-emails-batch
```

## Passo 2: Configurar Secrets da Edge Function

A Edge Function precisa de secrets configurados para enviar emails:

```bash
# Configurar provedor de email (resend ou sendgrid)
supabase secrets set EMAIL_PROVIDER=resend

# Configurar API Key do provedor
supabase secrets set EMAIL_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

# Configurar email de origem
supabase secrets set EMAIL_FROM=suporte@ordax.com.br

# Configurar nome de origem
supabase secrets set EMAIL_FROM_NAME=Ordax

# Configurar URL base da aplicação
supabase secrets set BASE_URL=https://ordax.com.br
```

### Verificar Secrets Configurados

```bash
supabase secrets list
```

Deve mostrar:
- `EMAIL_PROVIDER`
- `EMAIL_API_KEY`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `BASE_URL`

## Passo 3: Agendar o Cron Job

### 3.1 Abrir SQL Editor

No Supabase Dashboard:
1. Vá em **SQL Editor**
2. Clique em **New Query**

### 3.2 Executar SQL de Agendamento

Copie e cole o SQL abaixo, **substituindo os placeholders**:

```sql
-- Agendar cron job para envio de emails a cada 2 minutos
SELECT cron.schedule(
  'send-group-emails-batch',
  '*/2 * * * *',
  $$ 
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/send-group-emails-batch',
    headers := '{"Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Substitua**:
- `[YOUR-PROJECT-REF]` → Seu project reference (ex: `abcdefghijklmnop`)
- `[YOUR-SERVICE-ROLE-KEY]` → Sua service role key (secret)

### 3.3 Exemplo Real

```sql
-- EXEMPLO (use seus valores reais!)
SELECT cron.schedule(
  'send-group-emails-batch',
  '*/2 * * * *',
  $$ 
  SELECT net.http_post(
    url := 'https://abcdefghijklmnop.supabase.co/functions/v1/send-group-emails-batch',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### 3.4 Executar Query

Clique em **Run** ou pressione `Ctrl+Enter`.

Resultado esperado:
```
schedule
--------
1
```

## Passo 4: Verificar Configuração

### 4.1 Verificar Job Agendado

```sql
-- Listar todos os cron jobs
SELECT * FROM cron.job WHERE jobname = 'send-group-emails-batch';
```

Deve retornar uma linha com:
- `jobid`: ID do job
- `schedule`: `*/2 * * * *`
- `command`: O comando SQL configurado
- `active`: `true`

### 4.2 Verificar Histórico de Execução

```sql
-- Ver últimas 10 execuções
SELECT 
  jobid,
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-group-emails-batch')
ORDER BY start_time DESC 
LIMIT 10;
```

**Status esperados**:
- `succeeded`: Job executou com sucesso
- `failed`: Job falhou (verificar `return_message`)

## Passo 5: Testar Manualmente

### 5.1 Criar Grupo de Teste

```sql
-- Criar grupo de teste
INSERT INTO chat_groups (name, type, created_by)
VALUES ('Grupo Teste Email', 'manual', auth.uid())
RETURNING id;
```

### 5.2 Adicionar Você Como Membro

```sql
-- Adicionar você ao grupo (substitua [GROUP_ID] e [YOUR_USER_ID])
INSERT INTO chat_group_members (group_id, user_id)
VALUES ('[GROUP_ID]', '[YOUR_USER_ID]');
```

### 5.3 Enviar Mensagem de Teste

```sql
-- Enviar mensagem de teste (substitua [GROUP_ID] e [YOUR_USER_ID])
INSERT INTO chat_group_messages (group_id, sender_id, message)
VALUES ('[GROUP_ID]', '[YOUR_USER_ID]', 'Teste de email batch - esta mensagem deve gerar um email!')
RETURNING id;
```

### 5.4 Chamar Edge Function Manualmente

```bash
# Testar Edge Function diretamente (substitua valores)
curl -X POST \
  'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/send-group-emails-batch' \
  -H 'Authorization: Bearer [YOUR-SERVICE-ROLE-KEY]' \
  -H 'Content-Type: application/json' \
  -d '{
    "groupId": "[GROUP_ID]",
    "messageId": "[MESSAGE_ID]"
  }'
```

**Resposta esperada**:
```json
{
  "success": true,
  "sent": 1,
  "failed": 0,
  "total": 1
}
```

### 5.5 Verificar Email Recebido

1. Verifique sua caixa de entrada
2. Procure por email com assunto: "Nova mensagem em Grupo Teste Email"
3. Verifique se o conteúdo está correto:
   - Nome do grupo
   - Nome do remetente
   - Preview da mensagem
   - Link para visualizar mensagem completa

## Monitoramento

### Ver Execuções Recentes

```sql
-- Ver últimas 20 execuções com detalhes
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time,
  (end_time - start_time) AS duration
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-group-emails-batch')
ORDER BY start_time DESC 
LIMIT 20;
```

### Ver Estatísticas

```sql
-- Estatísticas de execução
SELECT 
  status,
  COUNT(*) AS count,
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))) AS avg_duration_seconds
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-group-emails-batch')
GROUP BY status;
```

## Troubleshooting

### Problema: Job não está executando

**Verificar se pg_cron está habilitado**:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

Se não estiver habilitado:
```sql
CREATE EXTENSION pg_cron;
```

**Verificar se job está ativo**:
```sql
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'send-group-emails-batch';
```

Se `active = false`:
```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'send-group-emails-batch';
```

### Problema: Job falha com erro de autenticação

**Verificar service role key**:
1. Vá em Supabase Dashboard → Settings → API
2. Copie novamente a service_role key
3. Re-agende o job com a chave correta

### Problema: Emails não estão sendo enviados

**Verificar secrets da Edge Function**:
```bash
supabase secrets list
```

**Verificar logs da Edge Function**:
```bash
supabase functions logs send-group-emails-batch
```

**Verificar se EMAIL_API_KEY está correto**:
- Para Resend: Deve começar com `re_`
- Para SendGrid: Deve começar com `SG.`

**Verificar se usuários têm email_notifications_enabled**:
```sql
SELECT 
  u.id,
  u.email,
  p.email_notifications_enabled
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.id IN (
  SELECT user_id FROM chat_group_members WHERE group_id = '[GROUP_ID]'
);
```

### Problema: Job executa mas retorna erro

**Ver mensagem de erro**:
```sql
SELECT 
  return_message,
  start_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-group-emails-batch')
  AND status = 'failed'
ORDER BY start_time DESC 
LIMIT 5;
```

**Erros comuns**:
- `EMAIL_API_KEY not configured`: Configure o secret
- `Message not found`: Verifique se a mensagem existe
- `Resend API error` / `SendGrid API error`: Verifique API key e limites

## Ajustar Intervalo de Execução

### Executar a cada 5 minutos (em vez de 2)

```sql
-- Desagendar job atual
SELECT cron.unschedule('send-group-emails-batch');

-- Reagendar com novo intervalo
SELECT cron.schedule(
  'send-group-emails-batch',
  '*/5 * * * *',
  $$ 
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/send-group-emails-batch',
    headers := '{"Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Executar a cada 1 minuto

```sql
-- Desagendar job atual
SELECT cron.unschedule('send-group-emails-batch');

-- Reagendar com novo intervalo
SELECT cron.schedule(
  'send-group-emails-batch',
  '* * * * *',
  $$ 
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/send-group-emails-batch',
    headers := '{"Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

## Desabilitar/Remover Job

### Desabilitar temporariamente

```sql
-- Desabilitar job (não executa, mas mantém configuração)
UPDATE cron.job 
SET active = false 
WHERE jobname = 'send-group-emails-batch';
```

### Reabilitar

```sql
-- Reabilitar job
UPDATE cron.job 
SET active = true 
WHERE jobname = 'send-group-emails-batch';
```

### Remover completamente

```sql
-- Desagendar job (remove completamente)
SELECT cron.unschedule('send-group-emails-batch');
```

## Notas Importantes

### V1 Simple Approach

**Comportamento atual**: Envia email para TODOS os membros (respeitando `email_notifications_enabled`).

**Não implementado na V1**:
- ❌ Detecção de "offline" (não abriu grupo em 24h)
- ❌ Envio apenas para membros que não visualizaram
- ❌ Agrupamento de múltiplas mensagens em um email

**Futuro V2**:
- Implementar detecção de "offline" baseada em `last_viewed_at`
- Enviar apenas para membros que não abriram o grupo recentemente
- Agrupar múltiplas mensagens não lidas em um único email

### Retry Logic

A Edge Function implementa retry automático:
- **Tentativas**: Até 3 tentativas por email
- **Backoff**: Exponencial (1s, 2s, 4s)
- **Logging**: Todas as tentativas são logadas

### Limites de Email

**Resend**:
- Free tier: 100 emails/dia
- Paid tier: Conforme plano

**SendGrid**:
- Free tier: 100 emails/dia
- Paid tier: Conforme plano

⚠️ **Atenção**: Com muitos grupos e membros, você pode atingir limites rapidamente!

### Performance

**Estimativa de tempo**:
- 1 email: ~200-500ms
- 10 emails: ~2-5 segundos
- 100 emails: ~20-50 segundos

**Recomendação**: Se você tem grupos com 100+ membros, considere:
1. Aumentar intervalo do cron (ex: 5 minutos)
2. Implementar fila de emails (V2)
3. Usar provedor de email com melhor throughput

## Referências

- **Migration**: `supabase/migrations/20260223000011_setup_email_batch_cron.sql`
- **Edge Function**: `supabase/functions/send-group-emails-batch/index.ts`
- **Design Doc**: `.kiro/specs/chat-groups-system/design.md` (seção Email Batch Job)
- **Requirements**: `.kiro/specs/chat-groups-system/requirements.md` (Requirement 11)
- **pg_cron docs**: https://github.com/citusdata/pg_cron

## Checklist de Configuração

- [ ] Migration `20260223000011_setup_email_batch_cron.sql` executada
- [ ] Edge Function `send-group-emails-batch` deployada
- [ ] Secrets configurados (EMAIL_PROVIDER, EMAIL_API_KEY, etc.)
- [ ] Project Reference obtido
- [ ] Service Role Key obtido
- [ ] Cron job agendado via SQL
- [ ] Job aparece em `cron.job` com `active = true`
- [ ] Teste manual executado com sucesso
- [ ] Email de teste recebido
- [ ] Monitoramento configurado

## Suporte

Se encontrar problemas:
1. Verifique logs da Edge Function: `supabase functions logs send-group-emails-batch`
2. Verifique histórico de execução: `SELECT * FROM cron.job_run_details`
3. Verifique secrets: `supabase secrets list`
4. Consulte este guia novamente
5. Consulte documentação do Supabase: https://supabase.com/docs
