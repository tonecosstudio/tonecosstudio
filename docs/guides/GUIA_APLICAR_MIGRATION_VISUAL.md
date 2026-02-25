# 🎯 Guia Visual: Aplicar Migration de Notificações

## 📋 Pré-requisitos

- ✅ Acesso ao Supabase Dashboard
- ✅ Permissões de admin no projeto
- ✅ Navegador web atualizado

---

## 🚀 Passo a Passo

### Passo 1: Acessar o SQL Editor

1. Abra seu navegador
2. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud
3. No menu lateral, clique em **"SQL Editor"**
4. Clique no botão **"New query"** (canto superior direito)

```
Dashboard → SQL Editor → New query
```

---

### Passo 2: Preparar a Migration

**Opção A: Executar Tudo de Uma Vez (Recomendado)**

1. Abra o arquivo: `supabase/migrations/20260228100000_create_admin_notifications_system.sql`
2. Selecione TODO o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)
4. Cole no SQL Editor do Supabase (Ctrl+V)
5. Clique em **"Run"** (ou pressione Ctrl+Enter)
6. Aguarde a execução (pode levar 10-30 segundos)

**Opção B: Executar Passo a Passo (Mais Seguro)**

1. Abra o arquivo: `apply-migration-step-by-step.sql`
2. Copie a **PARTE 1: ENUMS**
3. Cole no SQL Editor
4. Clique em **"Run"**
5. Aguarde a confirmação de sucesso
6. Repita para cada parte (PARTE 2, PARTE 3, etc.)

---

### Passo 3: Verificar Sucesso

Após executar, você deve ver uma das seguintes mensagens:

✅ **Sucesso**:

```
Success. No rows returned
```

✅ **Ou**:

```
Success. Rows returned: X
```

❌ **Erro**:
Se você ver uma mensagem de erro vermelha, leia a mensagem e veja a seção "Troubleshooting" abaixo.

---

### Passo 4: Verificar Tabelas Criadas

1. No menu lateral, clique em **"Table Editor"**
2. Você deve ver as novas tabelas:
   - ✅ `admin_notifications`
   - ✅ `admin_notification_settings`
   - ✅ `admin_alerts`

```
Dashboard → Table Editor → Procure por "admin_"
```

---

### Passo 5: Testar o Sistema

Execute este SQL no SQL Editor:

```sql
-- Criar notificação de teste
SELECT create_admin_notification(
  'system_error',
  'Teste de Notificação',
  'Esta é uma notificação de teste. O sistema está funcionando!',
  'medium',
  'Bell'
);

-- Verificar se foi criada
SELECT * FROM admin_notifications
ORDER BY created_at DESC
LIMIT 1;
```

Você deve ver a notificação criada com todos os campos preenchidos.

---

### Passo 6: Verificar no Painel Admin

1. Abra sua aplicação: http://localhost:5173/admin
2. Faça login como admin
3. Procure o ícone de sino (🔔) no header
4. Clique no sino
5. Você deve ver a notificação de teste!

---

## 🔍 Verificações Detalhadas

### Verificar Enums

```sql
SELECT typname
FROM pg_type
WHERE typname IN ('notification_type', 'notification_priority');
```

**Resultado esperado**:

```
notification_type
notification_priority
```

---

### Verificar Funções

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%notification%'
ORDER BY routine_name;
```

**Resultado esperado**:

```
cleanup_old_notifications
create_admin_notification
mark_all_notifications_read
mark_notification_read
notify_new_quote
notify_support_ticket
```

---

### Verificar Triggers

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%notify%';
```

**Resultado esperado**:

```
trigger_notify_new_quote       | quotes
trigger_notify_support_ticket  | support_tickets
```

---

### Verificar RLS Policies

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename LIKE 'admin_%'
ORDER BY tablename, policyname;
```

**Resultado esperado**: Várias policies para cada tabela (admin_notifications, admin_notification_settings, admin_alerts)

---

### Verificar Realtime

```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE tablename = 'admin_notifications';
```

**Resultado esperado**:

```
public | admin_notifications
```

---

## ⚠️ Troubleshooting

### Erro: "type already exists"

**Causa**: Os enums já foram criados anteriormente.

**Solução**: Pule a PARTE 1 (ENUMS) e continue com a PARTE 2.

---

### Erro: "relation already exists"

**Causa**: As tabelas já foram criadas anteriormente.

**Solução 1 - Remover e Recriar** (⚠️ APAGA DADOS):

```sql
DROP TABLE IF EXISTS admin_notifications CASCADE;
DROP TABLE IF EXISTS admin_notification_settings CASCADE;
DROP TABLE IF EXISTS admin_alerts CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS notification_priority CASCADE;

-- Depois execute a migration novamente
```

**Solução 2 - Verificar e Continuar**:
Se as tabelas já existem e estão corretas, você pode pular para o Passo 5 (Testar o Sistema).

---

### Erro: "permission denied"

**Causa**: Você não tem permissões suficientes.

**Solução**:

1. Verifique se você está logado com a conta correta
2. Verifique se você é admin do projeto no Supabase
3. Tente usar a service role key (veja APLICAR_MIGRATION_NOTIFICACOES.md)

---

### Erro: "function does not exist"

**Causa**: As funções não foram criadas corretamente.

**Solução**: Execute novamente as PARTES 8, 9, 10 e 11 do arquivo `apply-migration-step-by-step.sql`.

---

### Erro: "table does not exist" ao criar trigger

**Causa**: A tabela referenciada (quotes ou support_tickets) não existe.

**Solução**: Os triggers são opcionais. Você pode comentá-los ou criar as tabelas necessárias primeiro.

---

## 📊 Checklist de Verificação

Marque cada item após verificar:

- [ ] Enums criados (notification_type, notification_priority)
- [ ] Tabela admin_notifications criada
- [ ] Tabela admin_notification_settings criada
- [ ] Tabela admin_alerts criada
- [ ] Índices criados
- [ ] RLS policies configuradas
- [ ] Funções criadas (4 funções)
- [ ] Triggers criados (2 triggers)
- [ ] Realtime habilitado
- [ ] Notificação de teste criada
- [ ] NotificationCenter funcionando no painel admin

---

## 🎉 Sucesso!

Se todos os itens do checklist estão marcados, a migration foi aplicada com sucesso!

### Próximos Passos

1. ✅ Adicionar arquivo de som: `public/notification.mp3`
2. ✅ Testar notificações em tempo real
3. ✅ Configurar preferências de notificação
4. ✅ Verificar histórico de notificações
5. ✅ Adicionar mais triggers para outros eventos

---

## 🆘 Precisa de Ajuda?

Se você encontrou algum problema não listado aqui:

1. Verifique os logs de erro no Supabase Dashboard
2. Consulte a documentação: [Supabase SQL](https://supabase.com/docs/guides/database/overview)
3. Revise o arquivo de migration: `supabase/migrations/20260228100000_create_admin_notifications_system.sql`

---

## 📝 Notas Importantes

- ⚠️ A migration cria triggers para as tabelas `quotes` e `support_tickets`. Se essas tabelas não existirem, os triggers falharão (mas isso não afeta o resto do sistema).
- ✅ As notificações funcionam mesmo sem os triggers - você pode criar notificações manualmente usando a função `create_admin_notification()`.
- 🔒 As RLS policies garantem que apenas admins podem ver e gerenciar notificações.
- 🔄 O Realtime está habilitado, então as notificações aparecem instantaneamente sem refresh.

---

**Tempo estimado**: 5-10 minutos  
**Dificuldade**: Fácil  
**Requer reiniciar aplicação**: Não
