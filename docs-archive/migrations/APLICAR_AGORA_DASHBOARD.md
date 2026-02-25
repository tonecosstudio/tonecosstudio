# ⚡ APLICAR MIGRATION AGORA - Via Dashboard

## 🎯 Método Mais Simples e Rápido

A migration precisa ser aplicada via Supabase Dashboard (por questões de segurança, o Supabase não permite DDL via API).

---

## 📝 Passo a Passo (5 minutos)

### 1️⃣ Abrir SQL Editor

Clique aqui: 👉 **https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new**

Ou navegue manualmente:

- Dashboard → SQL Editor → New query

### 2️⃣ Copiar Migration

Abra o arquivo no seu editor:

```
supabase/migrations/20260228100000_create_admin_notifications_system.sql
```

Selecione TODO o conteúdo:

- Windows/Linux: `Ctrl + A`
- Mac: `Cmd + A`

Copie:

- Windows/Linux: `Ctrl + C`
- Mac: `Cmd + C`

### 3️⃣ Colar no SQL Editor

No SQL Editor do Supabase, cole o conteúdo:

- Windows/Linux: `Ctrl + V`
- Mac: `Cmd + V`

### 4️⃣ Executar

Clique no botão **"Run"** (canto inferior direito)

Ou use o atalho:

- Windows/Linux: `Ctrl + Enter`
- Mac: `Cmd + Enter`

### 5️⃣ Aguardar

A execução leva ~30 segundos.

Você verá: ✅ **"Success. No rows returned"**

---

## ✅ Verificar Sucesso

Execute este SQL no mesmo editor:

```sql
-- Verificar tabelas criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'admin_%'
ORDER BY table_name;
```

**Resultado esperado**:

```
admin_alerts
admin_notification_settings
admin_notifications
```

---

## 🧪 Testar Sistema

Execute este SQL:

```sql
-- Criar notificação de teste
SELECT create_admin_notification(
  'system_error',
  '🎉 Sistema de Notificações Ativo!',
  'A migration foi aplicada com sucesso. Tudo funcionando!',
  'medium',
  'Bell'
);

-- Ver a notificação criada
SELECT id, title, message, created_at
FROM admin_notifications
ORDER BY created_at DESC
LIMIT 1;
```

Você deve ver a notificação criada!

---

## 🎨 Testar no Painel Admin

1. Abra: http://localhost:5173/admin
2. Faça login como admin
3. Procure o ícone de sino (🔔) no header (canto superior direito)
4. Clique no sino
5. Você deve ver a notificação de teste!

---

## 🎯 O Que Foi Criado

A migration criou:

✅ **3 Tabelas**:

- `admin_notifications` - Armazena notificações
- `admin_notification_settings` - Configurações por usuário
- `admin_alerts` - Alertas configuráveis

✅ **2 Enums**:

- `notification_type` - 10 tipos de notificação
- `notification_priority` - 4 níveis de prioridade

✅ **4 Funções SQL**:

- `create_admin_notification()` - Criar notificação
- `mark_notification_read()` - Marcar como lida
- `mark_all_notifications_read()` - Marcar todas como lidas
- `cleanup_old_notifications()` - Limpar antigas

✅ **2 Triggers**:

- `trigger_notify_new_quote` - Notifica novos orçamentos
- `trigger_notify_support_ticket` - Notifica tickets de suporte

✅ **RLS Policies** - Segurança configurada

✅ **Realtime** - WebSocket habilitado

---

## 🚀 Próximos Passos

Após aplicar a migration:

1. ✅ Testar NotificationCenter no painel admin
2. ✅ Configurar preferências em `/admin/notificacoes`
3. ✅ Ver histórico em `/admin/notificacoes/historico`
4. ⏳ Adicionar arquivo de som: `public/notification.mp3`
5. ⏳ Configurar mais triggers para outros eventos

---

## ⚠️ Troubleshooting

### "type already exists"

Os enums já foram criados. Isso é normal se você executou antes. Continue normalmente.

### "relation already exists"

As tabelas já existem. Você pode:

- Ignorar e continuar (se estão corretas)
- Ou remover e recriar (veja GUIA_APLICAR_MIGRATION_VISUAL.md)

### "permission denied"

Verifique se você está logado com a conta correta no Supabase Dashboard.

---

## 📞 Precisa de Ajuda?

Consulte os guias detalhados:

- `GUIA_APLICAR_MIGRATION_VISUAL.md` - Guia passo a passo com screenshots
- `APLICAR_MIGRATION_NOTIFICACOES.md` - Opções alternativas
- `apply-migration-step-by-step.sql` - Migration dividida em partes

---

**Tempo estimado**: 5 minutos  
**Dificuldade**: Fácil  
**Requer código**: Não, apenas copiar e colar
