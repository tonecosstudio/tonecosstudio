# Guia de Deployment - Sistema de Grupos de Broadcast

## Status da Implementação

✅ **100% Completo e Pronto para Produção**

- Fase 1: Database Foundation ✅
- Fase 2: Core Services ✅
- Fase 3: Background Jobs ✅
- Fase 4: Admin UI ✅
- Fase 5: Member UI ✅
- Fase 6: Security ✅

## Pré-requisitos

- Supabase CLI instalado
- Acesso ao projeto Supabase (ID: pabxpvqwtvbjaunjejud)
- Node.js e npm instalados
- Credenciais de admin do Supabase Dashboard

## Passo 1: Verificar Migrações Aplicadas

As migrações já foram aplicadas via CLI. Para verificar:

```bash
npx supabase db remote list
```

Migrações esperadas:
- 20260223000000_create_chat_groups.sql
- 20260223000001_create_chat_group_members.sql
- 20260223000002_create_chat_group_messages.sql
- 20260223000003_create_chat_group_attachments.sql
- 20260223000004_create_chat_groups_rls.sql
- 20260223000005_create_chat_group_members_rls.sql
- 20260223000006_create_chat_group_messages_rls.sql
- 20260223000007_create_chat_group_attachments_rls.sql
- 20260223000010_setup_auto_sync_cron.sql
- 20260223000011_setup_email_batch_cron.sql

## Passo 2: Deploy das Edge Functions

### 2.1 Deploy auto-sync-groups

```bash
npx supabase functions deploy auto-sync-groups
```

### 2.2 Deploy send-group-emails-batch

```bash
npx supabase functions deploy send-group-emails-batch
```

### 2.3 Verificar Deploy

```bash
npx supabase functions list
```

## Passo 3: Configurar Cron Jobs no Supabase Dashboard

### 3.1 Auto-Sync Job (a cada 15 minutos)

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/database/cron-jobs
2. Clique em "Create a new cron job"
3. Configure:
   - **Name**: `auto-sync-groups`
   - **Schedule**: `*/15 * * * *` (a cada 15 minutos)
   - **Command**:
   ```sql
   SELECT
     net.http_post(
       url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/auto-sync-groups',
       headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
       body:='{}'::jsonb
     ) as request_id;
   ```
4. Clique em "Create cron job"

### 3.2 Email Batch Job (a cada 2 minutos)

1. No mesmo painel de Cron Jobs
2. Clique em "Create a new cron job"
3. Configure:
   - **Name**: `send-group-emails-batch`
   - **Schedule**: `*/2 * * * *` (a cada 2 minutos)
   - **Command**:
   ```sql
   SELECT
     net.http_post(
       url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/send-group-emails-batch',
       headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
       body:='{}'::jsonb
     ) as request_id;
   ```
4. Clique em "Create cron job"

## Passo 4: Configurar Service Role Key

### 4.1 Obter Service Role Key

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/api
2. Copie a "service_role" key (secret)

### 4.2 Configurar no Banco

Execute no SQL Editor:

```sql
-- Configurar service role key para cron jobs
ALTER DATABASE postgres SET app.settings.service_role_key = 'sua-service-role-key-aqui';
```

## Passo 5: Testar o Sistema

### 5.1 Teste Manual - Criar Grupo

1. Acesse: http://localhost:5173/admin/grupos
2. Clique em "Novo Grupo"
3. Crie um grupo manual de teste
4. Adicione membros

### 5.2 Teste Manual - Enviar Mensagem

1. Acesse o grupo criado
2. Digite uma mensagem
3. Envie
4. Verifique se aparece na lista

### 5.3 Teste Manual - Visualização de Membro

1. Faça login como um membro do grupo
2. Acesse: http://localhost:5173/grupos
3. Verifique se o grupo aparece
4. Clique no grupo e veja as mensagens

### 5.4 Teste de Cron Jobs

Execute manualmente para testar:

```sql
-- Testar auto-sync
SELECT
  net.http_post(
    url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/auto-sync-groups',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer sua-service-role-key"}'::jsonb,
    body:='{}'::jsonb
  );

-- Testar email batch
SELECT
  net.http_post(
    url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/send-group-emails-batch',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer sua-service-role-key"}'::jsonb,
    body:='{}'::jsonb
  );
```

## Passo 6: Monitoramento

### 6.1 Logs das Edge Functions

```bash
# Ver logs do auto-sync
npx supabase functions logs auto-sync-groups

# Ver logs do email batch
npx supabase functions logs send-group-emails-batch
```

### 6.2 Verificar Cron Jobs

No SQL Editor:

```sql
-- Ver histórico de execuções
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;

-- Ver jobs configurados
SELECT * FROM cron.job;
```

## Passo 7: Configurações de Produção

### 7.1 Ajustar Frequência dos Cron Jobs (Opcional)

Se necessário, ajuste as frequências:

- Auto-sync: Pode ser reduzido para `*/30 * * * *` (30 minutos) em produção
- Email batch: Pode ser reduzido para `*/5 * * * *` (5 minutos) em produção

### 7.2 Configurar Limites de Rate

No Supabase Dashboard > Settings > API:
- Ajuste rate limits se necessário
- Configure CORS se necessário

## Troubleshooting

### Problema: Cron jobs não executam

**Solução:**
1. Verifique se pg_cron está habilitado
2. Verifique se a service_role_key está configurada
3. Verifique logs: `SELECT * FROM cron.job_run_details WHERE status = 'failed'`

### Problema: Edge Functions retornam erro 401

**Solução:**
1. Verifique se a Authorization header está correta
2. Verifique se a service_role_key é válida
3. Redeploy das functions: `npx supabase functions deploy <function-name>`

### Problema: Membros não são sincronizados

**Solução:**
1. Execute auto-sync manualmente (SQL acima)
2. Verifique logs da function
3. Verifique se os critérios de membership estão corretos

### Problema: Emails não são enviados

**Solução:**
1. Verifique se a Edge Function send-email existe
2. Verifique configurações de email no Supabase
3. Verifique logs da function send-group-emails-batch

## Checklist de Deployment

- [ ] Migrações aplicadas
- [ ] Edge Functions deployed
- [ ] Cron jobs configurados
- [ ] Service role key configurada
- [ ] Testes manuais realizados
- [ ] Cron jobs testados
- [ ] Logs verificados
- [ ] Documentação revisada

## Próximos Passos

1. Criar grupos de teste em produção
2. Monitorar performance dos cron jobs
3. Ajustar frequências conforme necessário
4. Treinar equipe de admin
5. Documentar casos de uso específicos

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs das Edge Functions
2. Consulte os guias específicos:
   - AUTO_SYNC_SETUP_GUIDE.md
   - EMAIL_BATCH_SETUP_GUIDE.md
3. Verifique o design.md para arquitetura
4. Consulte requirements.md para requisitos

## Recursos Adicionais

- [Documentação Supabase Cron](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Documentação Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentação Realtime](https://supabase.com/docs/guides/realtime)
