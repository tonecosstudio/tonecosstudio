# ✅ Executar Teste de Notificação

**Data:** 26 de Fevereiro de 2026  
**Usuário Encontrado:** tonecos loja@gmail.com

---

## 🎯 Situação Atual

- ✅ Migration aplicada com sucesso
- ✅ Tabelas criadas
- ✅ Usuário encontrado: `tonecos loja@gmail.com`
- ⚠️ Precisa criar notificação de teste

---

## 🚀 SOLUÇÃO RÁPIDA

### Opção 1: Copiar e Colar no Supabase Dashboard (RECOMENDADO)

1. **Acesse o SQL Editor:**
   https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql

2. **Cole este SQL:**

```sql
-- Criar notificação de teste
SELECT create_user_notification(
  (SELECT id FROM auth.users WHERE email = 'tonecos loja@gmail.com'),
  'system_announcement'::user_notification_type,
  'Sistema de Notificações Ativado! 🎉',
  'O novo sistema de notificações está funcionando perfeitamente!',
  'high'::notification_priority,
  NULL,
  NULL,
  '/notificacoes',
  'Ver Notificações',
  'Megaphone',
  '{}'::jsonb
);

-- Verificar resultado
SELECT 
  n.id,
  u.email,
  n.title,
  n.is_read,
  n.created_at
FROM user_notifications n
JOIN auth.users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 5;
```

3. **Clique em RUN** (ou Ctrl+Enter)

4. **Resultado esperado:**
   - Primeira query retorna o ID da notificação
   - Segunda query mostra a notificação criada

---

### Opção 2: Usar o Arquivo SQL

O arquivo `teste-notificacao-final.sql` contém o SQL completo.

1. Abra o arquivo
2. Copie todo o conteúdo
3. Cole no Supabase SQL Editor
4. Execute

---

## ✅ Verificar na Aplicação

Após executar o SQL:

1. **Inicie a aplicação:**
   ```bash
   npm run dev
   ```

2. **Faça login com:**
   - Email: `tonecos loja@gmail.com`
   - Senha: (sua senha)

3. **Verifique:**
   - ✅ Sino no header com badge "1"
   - ✅ Clique no sino para ver a notificação
   - ✅ Acesse `/notificacoes` para ver o histórico

---

## 🧪 Criar Mais Notificações

### Notificação de Pedido
```sql
SELECT create_user_notification(
  (SELECT id FROM auth.users WHERE email = 'tonecos loja@gmail.com'),
  'order_status',
  'Pedido Confirmado',
  'Seu pedido #12345 foi confirmado.',
  'high',
  NULL,
  'orders',
  '/pedidos',
  'Ver Pedido',
  'Package'
);
```

### Notificação de Pagamento
```sql
SELECT create_user_notification(
  (SELECT id FROM auth.users WHERE email = 'tonecos loja@gmail.com'),
  'payment_confirmed',
  'Pagamento Confirmado',
  'Pagamento de R$ 500 confirmado.',
  'high',
  NULL,
  'payments',
  '/pagamentos',
  'Ver Comprovante',
  'DollarSign'
);
```

---

## 📊 Estatísticas

```sql
-- Ver todas as notificações
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_read = FALSE) as nao_lidas,
  COUNT(*) FILTER (WHERE is_read = TRUE) as lidas
FROM user_notifications;

-- Ver por tipo
SELECT 
  type,
  COUNT(*) as total
FROM user_notifications
GROUP BY type
ORDER BY total DESC;
```

---

## ❌ Troubleshooting

### Erro: "null value in column user_id"
**Causa:** Email não encontrado  
**Solução:** Use o email correto: `tonecos loja@gmail.com`

### Erro: "type user_notification_type does not exist"
**Causa:** Migration não foi aplicada  
**Solução:** Aplique a migration primeiro

### Notificação não aparece na aplicação
**Causa:** Usuário diferente logado  
**Solução:** Faça login com `tonecos loja@gmail.com`

---

## ✅ Checklist

- [ ] SQL executado no Supabase Dashboard
- [ ] Notificação criada (verificar query de resultado)
- [ ] Aplicação iniciada (`npm run dev`)
- [ ] Login realizado
- [ ] Badge visível no sino
- [ ] Notificação visível no dropdown
- [ ] Histórico acessível em `/notificacoes`

---

**Pronto para testar!** 🚀

Execute o SQL no link acima e teste na aplicação!
