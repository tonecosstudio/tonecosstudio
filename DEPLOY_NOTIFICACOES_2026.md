# Guia de Deploy - Sistema de Notificações de Usuários

**Data:** 25 de Fevereiro de 2026  
**Versão:** 1.0.0

---

## 📋 Pré-requisitos

- ✅ Acesso ao Supabase Dashboard
- ✅ Acesso ao repositório Git
- ✅ Node.js e npm instalados
- ✅ Aplicação rodando localmente

---

## 🚀 Passo a Passo de Deploy

### 1. Aplicar Migration no Banco de Dados

#### Opção A: Via Supabase Dashboard (Recomendado)

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Copie o conteúdo de `supabase/migrations/20260228200000_create_user_notifications_system.sql`
5. Cole no editor
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Verifique se não há erros

#### Opção B: Via CLI do Supabase

```bash
# Aplicar migration
npx supabase db push

# Ou aplicar migration específica
npx supabase migration up --file 20260228200000_create_user_notifications_system.sql
```

### 2. Verificar Tabelas Criadas

Execute no SQL Editor:

```sql
-- Verificar tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_notifications', 'user_notification_settings');

-- Verificar enum
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'user_notification_type'::regtype;

-- Verificar RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_notifications', 'user_notification_settings');

-- Verificar realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'user_notifications';
```

### 3. Testar Criação de Notificação

```sql
-- Criar notificação de teste
SELECT create_user_notification(
  (SELECT id FROM auth.users LIMIT 1), -- Pegar primeiro usuário
  'system_announcement',
  'Sistema de Notificações Ativado',
  'O novo sistema de notificações está funcionando!',
  'high',
  NULL,
  NULL,
  '/notificacoes',
  'Ver Notificações',
  'Megaphone'
);

-- Verificar se foi criada
SELECT * FROM user_notifications ORDER BY created_at DESC LIMIT 5;
```

### 4. Build e Deploy da Aplicação

#### Desenvolvimento Local

```bash
# Instalar dependências (se necessário)
npm install

# Rodar aplicação
npm run dev
```

#### Produção

```bash
# Build
npm run build

# Testar build localmente
npm run preview

# Deploy (exemplo com Vercel)
vercel --prod

# Ou com Netlify
netlify deploy --prod
```

### 5. Verificar Funcionalidades

#### Checklist de Testes

- [ ] Login na aplicação
- [ ] Ver sino de notificações no header
- [ ] Criar notificação de teste via SQL
- [ ] Verificar badge com contador
- [ ] Abrir dropdown de notificações
- [ ] Ver notificação na lista
- [ ] Marcar como lida
- [ ] Deletar notificação
- [ ] Acessar página de histórico (`/notificacoes`)
- [ ] Testar busca
- [ ] Testar filtros
- [ ] Verificar notificação em tempo real (abrir em duas abas)
- [ ] Testar som de notificação
- [ ] Testar toast
- [ ] Testar notificação do navegador

---

## 🔧 Configurações Adicionais

### 1. Som de Notificação

Adicione o arquivo de som na pasta `public/`:

```
public/
  └── notification.mp3
```

Ou use um som padrão do sistema.

### 2. Permissões do Navegador

Para notificações do navegador, o usuário precisa conceder permissão. Isso é solicitado automaticamente quando uma notificação é recebida.

### 3. Configurações de Realtime

Verifique se o Realtime está habilitado no Supabase:

1. Acesse **Database** > **Replication**
2. Verifique se `user_notifications` está na lista
3. Se não estiver, adicione:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
```

---

## 🧪 Testes de Integração

### Teste 1: Notificação de Pedido

```sql
SELECT create_user_notification(
  'user-uuid-aqui',
  'order_status',
  'Pedido Confirmado',
  'Seu pedido #12345 foi confirmado e está sendo preparado.',
  'high',
  'order-uuid',
  'orders',
  '/pedidos/order-uuid',
  'Ver Pedido',
  'Package'
);
```

### Teste 2: Notificação de Pagamento

```sql
SELECT create_user_notification(
  'user-uuid-aqui',
  'payment_confirmed',
  'Pagamento Confirmado',
  'Seu pagamento de R$ 500,00 foi confirmado.',
  'high',
  'payment-uuid',
  'payments',
  '/pagamentos/payment-uuid',
  'Ver Comprovante',
  'DollarSign'
);
```

### Teste 3: Notificação de Grupo

```sql
SELECT create_user_notification(
  'user-uuid-aqui',
  'group_message',
  'Nova Mensagem no Grupo',
  'Você tem uma nova mensagem no grupo "Colecionadores".',
  'medium',
  'group-uuid',
  'groups',
  '/grupos/group-uuid',
  'Ver Grupo',
  'MessageSquare'
);
```

### Teste 4: Notificação Crítica

```sql
SELECT create_user_notification(
  'user-uuid-aqui',
  'subscription_expiring',
  'Assinatura Expirando',
  'Sua assinatura expira em 3 dias. Renove agora!',
  'critical',
  'subscription-uuid',
  'subscriptions',
  '/assinaturas',
  'Renovar Agora',
  'AlertCircle'
);
```

---

## 🔍 Troubleshooting

### Problema: Notificações não aparecem

**Solução:**
1. Verificar se a migration foi aplicada
2. Verificar RLS policies
3. Verificar se o usuário está autenticado
4. Verificar console do navegador para erros

```sql
-- Verificar RLS
SELECT * FROM user_notifications WHERE user_id = auth.uid();

-- Verificar configurações
SELECT * FROM user_notification_settings WHERE user_id = auth.uid();
```

### Problema: Realtime não funciona

**Solução:**
1. Verificar se Realtime está habilitado
2. Verificar conexão com Supabase
3. Verificar console do navegador

```sql
-- Verificar publicação
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'user_notifications';
```

### Problema: Som não toca

**Solução:**
1. Verificar se arquivo `notification.mp3` existe em `public/`
2. Verificar configurações de som do usuário
3. Verificar permissões do navegador

### Problema: Badge não atualiza

**Solução:**
1. Verificar query de notificações não lidas
2. Verificar invalidação de cache
3. Forçar refresh da página

---

## 📊 Monitoramento

### Queries Úteis

#### Contar notificações por tipo
```sql
SELECT type, COUNT(*) as total
FROM user_notifications
GROUP BY type
ORDER BY total DESC;
```

#### Notificações não lidas por usuário
```sql
SELECT 
  u.email,
  COUNT(*) as unread_count
FROM user_notifications n
JOIN auth.users u ON n.user_id = u.id
WHERE n.is_read = FALSE
GROUP BY u.email
ORDER BY unread_count DESC;
```

#### Taxa de leitura
```sql
SELECT 
  COUNT(*) FILTER (WHERE is_read = TRUE) * 100.0 / COUNT(*) as read_rate
FROM user_notifications;
```

#### Notificações antigas para limpeza
```sql
SELECT COUNT(*)
FROM user_notifications
WHERE (
  (is_read = TRUE AND read_at < NOW() - INTERVAL '30 days') OR
  (is_read = FALSE AND created_at < NOW() - INTERVAL '90 days')
);
```

---

## 🔄 Manutenção

### Limpeza Automática

Configure um cron job para limpar notificações antigas:

```sql
-- Executar diariamente
SELECT cleanup_old_user_notifications();
```

No Supabase, você pode usar **Database Webhooks** ou **Edge Functions** para automatizar isso.

### Backup

Antes de fazer mudanças, sempre faça backup:

```sql
-- Backup de notificações
CREATE TABLE user_notifications_backup AS 
SELECT * FROM user_notifications;

-- Backup de configurações
CREATE TABLE user_notification_settings_backup AS 
SELECT * FROM user_notification_settings;
```

---

## 📈 Métricas de Sucesso

Após o deploy, monitore:

- ✅ Taxa de entrega de notificações
- ✅ Taxa de leitura
- ✅ Tempo médio até leitura
- ✅ Taxa de clique em ações
- ✅ Notificações deletadas vs lidas
- ✅ Tipos de notificação mais engajados

---

## 🎯 Rollback (Se Necessário)

Se algo der errado, você pode reverter:

```sql
-- Desabilitar realtime
ALTER PUBLICATION supabase_realtime DROP TABLE user_notifications;

-- Remover tabelas (CUIDADO!)
DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS user_notification_settings CASCADE;
DROP TYPE IF EXISTS user_notification_type CASCADE;

-- Remover funções
DROP FUNCTION IF EXISTS create_user_notification CASCADE;
DROP FUNCTION IF EXISTS mark_user_notification_read CASCADE;
DROP FUNCTION IF EXISTS mark_all_user_notifications_read CASCADE;
DROP FUNCTION IF EXISTS delete_user_notification CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_user_notifications CASCADE;
```

---

## ✅ Checklist de Deploy

- [ ] Migration aplicada no banco
- [ ] Tabelas criadas e verificadas
- [ ] RLS policies ativas
- [ ] Realtime habilitado
- [ ] Notificação de teste criada
- [ ] Build da aplicação sem erros
- [ ] Deploy em produção
- [ ] Testes funcionais realizados
- [ ] Som de notificação funcionando
- [ ] Notificações em tempo real funcionando
- [ ] Histórico acessível
- [ ] Busca e filtros funcionando
- [ ] Responsividade verificada
- [ ] Monitoramento configurado
- [ ] Documentação atualizada

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar logs do Supabase
2. Verificar console do navegador
3. Verificar documentação do Supabase Realtime
4. Consultar este guia de troubleshooting

---

**Deploy realizado com sucesso!** 🎉

**Data:** 25/02/2026  
**Versão:** 1.0.0
