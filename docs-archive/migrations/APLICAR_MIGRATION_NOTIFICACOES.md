# 🚀 Como Aplicar a Migration de Notificações

## Opção 1: Via Supabase Dashboard (Recomendado)

### Passo 1: Acessar o SQL Editor

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
2. Ou navegue: Dashboard → SQL Editor → New Query

### Passo 2: Copiar e Executar a Migration

1. Abra o arquivo: `supabase/migrations/20260228100000_create_admin_notifications_system.sql`
2. Copie TODO o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em "Run" (ou pressione Ctrl+Enter)

### Passo 3: Verificar Sucesso

Após executar, você deve ver:

- ✅ "Success. No rows returned"
- Ou mensagens de sucesso para cada statement

### Passo 4: Verificar Tabelas Criadas

Navegue para: Dashboard → Table Editor

Você deve ver as novas tabelas:

- `admin_notifications`
- `admin_notification_settings`
- `admin_alerts`

---

## Opção 2: Via CLI do Supabase (Avançado)

### Pré-requisitos

```bash
# Instalar Supabase CLI
npm install -g supabase

# Fazer login
npx supabase login
```

### Linkar Projeto

```bash
npx supabase link --project-ref pabxpvqwtvbjaunjejud
```

### Aplicar Migration

```bash
npx supabase db push
```

---

## Opção 3: Via Script Node.js

### Pré-requisitos

Adicione ao arquivo `.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

Você pode encontrar a service role key em:
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/api

### Executar Script

```bash
node apply-notifications-migration.js
```

---

## 🔍 Verificação Pós-Migration

### 1. Verificar Tabelas

Execute no SQL Editor:

```sql
-- Verificar tabelas criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'admin_%';

-- Deve retornar:
-- admin_notifications
-- admin_notification_settings
-- admin_alerts
```

### 2. Verificar Enums

```sql
-- Verificar enums criados
SELECT typname
FROM pg_type
WHERE typname IN ('notification_type', 'notification_priority');

-- Deve retornar ambos os tipos
```

### 3. Verificar Funções

```sql
-- Verificar funções criadas
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%notification%';

-- Deve retornar:
-- create_admin_notification
-- mark_notification_read
-- mark_all_notifications_read
-- cleanup_old_notifications
```

### 4. Verificar Triggers

```sql
-- Verificar triggers criados
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%notify%';

-- Deve retornar:
-- trigger_notify_new_quote (quotes)
-- trigger_notify_support_ticket (support_tickets)
```

### 5. Verificar RLS Policies

```sql
-- Verificar policies criadas
SELECT tablename, policyname
FROM pg_policies
WHERE tablename LIKE 'admin_%';

-- Deve retornar várias policies para cada tabela
```

### 6. Verificar Realtime

```sql
-- Verificar se realtime está habilitado
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE tablename = 'admin_notifications';

-- Deve retornar a tabela admin_notifications
```

---

## 🧪 Testar Sistema de Notificações

### 1. Criar Notificação de Teste

Execute no SQL Editor:

```sql
-- Criar notificação de teste
SELECT create_admin_notification(
  'system_error',
  'Teste de Notificação',
  'Esta é uma notificação de teste para verificar o sistema.',
  'medium',
  'Bell',
  NULL,
  NULL,
  NULL
);
```

### 2. Verificar Notificação Criada

```sql
-- Listar notificações
SELECT * FROM admin_notifications
ORDER BY created_at DESC
LIMIT 5;
```

### 3. Marcar como Lida

```sql
-- Marcar notificação como lida (substitua o ID)
SELECT mark_notification_read('id-da-notificacao-aqui');
```

### 4. Verificar Configurações

```sql
-- Verificar configurações padrão
SELECT * FROM admin_notification_settings;
```

---

## ⚠️ Troubleshooting

### Erro: "relation already exists"

Se você já executou a migration antes:

```sql
-- Remover tabelas existentes (CUIDADO: apaga dados!)
DROP TABLE IF EXISTS admin_notifications CASCADE;
DROP TABLE IF EXISTS admin_notification_settings CASCADE;
DROP TABLE IF EXISTS admin_alerts CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS notification_priority CASCADE;

-- Depois execute a migration novamente
```

### Erro: "permission denied"

Certifique-se de estar usando uma conta com permissões de admin no Supabase.

### Erro: "function does not exist"

Verifique se todas as funções foram criadas:

```sql
-- Recriar função específica (exemplo)
CREATE OR REPLACE FUNCTION create_admin_notification(...)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- ... código da função
$$;
```

---

## 📝 Próximos Passos

Após aplicar a migration com sucesso:

1. ✅ Testar NotificationCenter no painel admin
2. ✅ Configurar preferências de notificação
3. ✅ Verificar histórico de notificações
4. ✅ Testar notificações em tempo real
5. ✅ Adicionar arquivo de som (`public/notification.mp3`)
6. ✅ Configurar triggers para eventos reais

---

## 🔗 Links Úteis

- [Supabase Dashboard](https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud)
- [SQL Editor](https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new)
- [Table Editor](https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor)
- [API Settings](https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/api)
- [Migration File](./supabase/migrations/20260228100000_create_admin_notifications_system.sql)

---

**Recomendação**: Use a Opção 1 (Supabase Dashboard) para aplicar a migration de forma rápida e segura.
