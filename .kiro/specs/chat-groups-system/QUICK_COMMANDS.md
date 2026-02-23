# Comandos Rápidos - Sistema de Grupos

## 🚀 Deployment

```bash
# Aplicar migrações
npx supabase db push

# Regenerar tipos TypeScript
npx supabase gen types typescript --project-id pabxpvqwtvbjaunjejud > src/integrations/supabase/types.ts

# Deploy Edge Functions
npx supabase functions deploy auto-sync-groups
npx supabase functions deploy send-group-emails-batch

# Listar functions deployadas
npx supabase functions list
```

## 🧪 Testes

```bash
# Rodar todos os testes
npm test

# Testes de validação
npm test -- src/lib/validations/groupValidations.test.ts --run

# Testes de permissões
npm test -- src/lib/permissions/groupPermissions.test.ts --run

# Testes de componentes
npm test -- src/components/groups --run

# Testes com coverage
npm test -- --coverage
```

## 📊 Monitoramento

```bash
# Ver logs do auto-sync
npx supabase functions logs auto-sync-groups

# Ver logs do email batch
npx supabase functions logs send-group-emails-batch

# Ver logs em tempo real
npx supabase functions logs auto-sync-groups --follow
```

## 🗄️ Queries SQL Úteis

### Verificar grupos criados
```sql
SELECT id, name, type, created_at 
FROM chat_groups 
WHERE deleted_at IS NULL 
ORDER BY created_at DESC;
```

### Contar membros por grupo
```sql
SELECT 
  g.name,
  COUNT(m.id) as total_members
FROM chat_groups g
LEFT JOIN chat_group_members m ON m.group_id = g.id
WHERE g.deleted_at IS NULL
GROUP BY g.id, g.name
ORDER BY total_members DESC;
```

### Ver últimas mensagens
```sql
SELECT 
  g.name as grupo,
  m.message,
  m.created_at
FROM chat_group_messages m
JOIN chat_groups g ON g.id = m.group_id
ORDER BY m.created_at DESC
LIMIT 10;
```

### Verificar cron jobs
```sql
-- Ver jobs configurados
SELECT * FROM cron.job;

-- Ver histórico de execuções
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
  end_time
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;

-- Ver apenas falhas
SELECT * FROM cron.job_run_details 
WHERE status = 'failed' 
ORDER BY start_time DESC;
```

### Testar auto-sync manualmente
```sql
SELECT
  net.http_post(
    url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/auto-sync-groups',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb,
    body:='{}'::jsonb
  );
```

### Testar email batch manualmente
```sql
SELECT
  net.http_post(
    url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/send-group-emails-batch',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb,
    body:='{}'::jsonb
  );
```

### Limpar dados de teste
```sql
-- CUIDADO: Isso remove TODOS os dados de grupos
DELETE FROM chat_group_attachments;
DELETE FROM chat_group_messages;
DELETE FROM chat_group_members;
DELETE FROM chat_groups;
```

## 🔧 Desenvolvimento

```bash
# Iniciar dev server
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

## 📦 Criar Dados de Teste

### Criar grupo manual
```sql
INSERT INTO chat_groups (name, type, created_by)
VALUES ('Grupo de Teste', 'manual', 'SEU_USER_ID');
```

### Adicionar membro
```sql
INSERT INTO chat_group_members (group_id, user_id)
VALUES ('GROUP_ID', 'USER_ID');
```

### Enviar mensagem de teste
```sql
INSERT INTO chat_group_messages (group_id, sender_id, message)
VALUES ('GROUP_ID', 'ADMIN_USER_ID', 'Mensagem de teste');
```

## 🔍 Debug

### Verificar RLS policies
```sql
-- Ver policies da tabela chat_groups
SELECT * FROM pg_policies WHERE tablename = 'chat_groups';

-- Ver policies da tabela chat_group_members
SELECT * FROM pg_policies WHERE tablename = 'chat_group_members';
```

### Verificar permissões de usuário
```sql
-- Ver role do usuário
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE id = 'USER_ID';
```

### Verificar membership
```sql
-- Ver grupos de um usuário
SELECT 
  g.name,
  m.joined_at,
  m.last_viewed_at
FROM chat_group_members m
JOIN chat_groups g ON g.id = m.group_id
WHERE m.user_id = 'USER_ID'
AND g.deleted_at IS NULL;
```

## 🎯 Atalhos de Navegação

### Admin
- Lista de grupos: http://localhost:5173/admin/grupos
- Detalhes: http://localhost:5173/admin/grupos/[GROUP_ID]

### Member
- Meus grupos: http://localhost:5173/grupos
- Mensagens: http://localhost:5173/grupos/[GROUP_ID]

## 📝 Notas

- Sempre use `--run` nos testes para evitar watch mode
- Service role key nunca deve ser commitada
- Cron jobs precisam ser configurados manualmente no Dashboard
- Logs das Edge Functions ficam disponíveis por 7 dias
- RLS policies são aplicadas automaticamente

## 🆘 Troubleshooting Rápido

### Erro 406 em queries
```bash
# Regenerar tipos
npx supabase gen types typescript --project-id pabxpvqwtvbjaunjejud > src/integrations/supabase/types.ts
```

### Edge Function não responde
```bash
# Redeploy
npx supabase functions deploy [function-name]

# Ver logs
npx supabase functions logs [function-name] --follow
```

### Cron job não executa
```sql
-- Verificar se está habilitado
SELECT * FROM cron.job WHERE jobname = 'auto-sync-groups';

-- Executar manualmente
SELECT cron.schedule('test-job', '* * * * *', 'SELECT 1');
SELECT cron.unschedule('test-job');
```

### Membros não sincronizam
```sql
-- Verificar critérios do grupo
SELECT id, name, type, membership_criteria 
FROM chat_groups 
WHERE id = 'GROUP_ID';

-- Executar sync manualmente (ver query acima)
```
