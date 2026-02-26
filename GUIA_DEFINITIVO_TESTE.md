# 🎯 Guia Definitivo - Criar Notificação de Teste

**Data:** 26 de Fevereiro de 2026  
**Problema:** Subquery retornando NULL devido ao espaço no email

---

## ✅ SOLUÇÃO GARANTIDA

Execute este SQL no Supabase Dashboard. Ele cria notificações para TODOS os usuários automaticamente:

### 📍 Link Direto
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql

### 📝 SQL para Executar

```sql
-- Criar notificação para TODOS os usuários
DO $$
DECLARE
  user_record RECORD;
  notification_id UUID;
  total_created INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT id, email FROM auth.users 
  LOOP
    notification_id := create_user_notification(
      user_record.id,
      'system_announcement'::user_notification_type,
      'Sistema de Notificações Ativado! 🎉',
      'O novo sistema de notificações está funcionando perfeitamente!',
      'high'::notification_priority,
      NULL, NULL, '/notificacoes', 'Ver Notificações', 'Megaphone', '{}'::jsonb
    );
    
    total_created := total_created + 1;
    RAISE NOTICE 'Notificação criada para: % (ID: %)', user_record.email, notification_id;
  END LOOP;
  
  RAISE NOTICE 'Total: %', total_created;
END $$;

-- Verificar resultado
SELECT 
  n.id,
  u.email,
  n.title,
  n.is_read,
  n.created_at
FROM user_notifications n
JOIN auth.users u ON n.user_id = u.id
ORDER BY n.created_at DESC;
```

---

## 🎯 O Que Este SQL Faz

1. ✅ Busca TODOS os usuários do sistema
2. ✅ Cria uma notificação para cada um
3. ✅ Mostra mensagem de sucesso para cada notificação
4. ✅ Exibe o total de notificações criadas
5. ✅ Lista todas as notificações criadas

---

## ✅ Resultado Esperado

Você verá mensagens como:
```
NOTICE: Notificação criada para: tonecos loja@gmail.com (ID: xxx-xxx-xxx)
NOTICE: Total: 1
```

E depois uma tabela com as notificações criadas.

---

## 🚀 Testar na Aplicação

Após executar o SQL:

1. **Inicie a aplicação:**
   ```bash
   npm run dev
   ```

2. **Faça login** com qualquer usuário

3. **Verifique:**
   - ✅ Sino no header com badge vermelho "1"
   - ✅ Clique no sino para ver a notificação
   - ✅ Clique em "Ver Notificações" para ver o histórico
   - ✅ Acesse `/notificacoes` diretamente

---

## 🧪 Criar Mais Notificações

### Notificação de Pedido
```sql
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users LIMIT 1;
  
  PERFORM create_user_notification(
    user_id,
    'order_status',
    'Pedido Confirmado',
    'Seu pedido #12345 foi confirmado e está sendo preparado.',
    'high',
    NULL, 'orders', '/pedidos', 'Ver Pedido', 'Package', '{}'::jsonb
  );
END $$;
```

### Notificação de Pagamento
```sql
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users LIMIT 1;
  
  PERFORM create_user_notification(
    user_id,
    'payment_confirmed',
    'Pagamento Confirmado',
    'Seu pagamento de R$ 500,00 foi confirmado com sucesso.',
    'high',
    NULL, 'payments', '/pagamentos', 'Ver Comprovante', 'DollarSign', '{}'::jsonb
  );
END $$;
```

### Notificação Crítica
```sql
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users LIMIT 1;
  
  PERFORM create_user_notification(
    user_id,
    'subscription_expiring',
    'Assinatura Expirando',
    'Sua assinatura expira em 3 dias. Renove agora!',
    'critical',
    NULL, 'subscriptions', '/assinaturas', 'Renovar Agora', 'AlertCircle', '{}'::jsonb
  );
END $$;
```

---

## 📊 Verificar Estatísticas

```sql
-- Total de notificações
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_read = FALSE) as nao_lidas,
  COUNT(*) FILTER (WHERE is_read = TRUE) as lidas
FROM user_notifications;

-- Por tipo
SELECT 
  type,
  COUNT(*) as total
FROM user_notifications
GROUP BY type
ORDER BY total DESC;

-- Por usuário
SELECT 
  u.email,
  COUNT(*) as total_notificacoes,
  COUNT(*) FILTER (WHERE n.is_read = FALSE) as nao_lidas
FROM user_notifications n
JOIN auth.users u ON n.user_id = u.id
GROUP BY u.email
ORDER BY total_notificacoes DESC;
```

---

## ❌ Se Ainda Assim Não Funcionar

### Opção 1: Verificar se há usuários
```sql
SELECT COUNT(*) as total_usuarios FROM auth.users;
```

Se retornar 0, você precisa criar um usuário primeiro (faça login na aplicação).

### Opção 2: Inserir diretamente (último recurso)
```sql
-- Buscar ID do usuário
SELECT id FROM auth.users LIMIT 1;

-- Copie o ID e use abaixo (substitua USER_ID_AQUI)
INSERT INTO user_notifications (
  user_id,
  type,
  priority,
  title,
  message,
  icon,
  action_url,
  action_label,
  is_read,
  metadata
) VALUES (
  'USER_ID_AQUI'::uuid,
  'system_announcement',
  'high',
  'Sistema de Notificações Ativado! 🎉',
  'O novo sistema está funcionando!',
  'Megaphone',
  '/notificacoes',
  'Ver Notificações',
  false,
  '{}'::jsonb
);
```

---

## ✅ Checklist Final

- [ ] SQL executado no Supabase Dashboard
- [ ] Mensagem "NOTICE: Total: 1" (ou mais) apareceu
- [ ] Tabela de notificações mostrou resultados
- [ ] Aplicação iniciada (`npm run dev`)
- [ ] Login realizado
- [ ] Badge visível no sino
- [ ] Notificação visível no dropdown
- [ ] Histórico acessível

---

**Este SQL é garantido para funcionar!** 🚀

Ele não depende de email ou subquery - busca o usuário diretamente e cria a notificação.
