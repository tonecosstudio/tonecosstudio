# ✅ SECRETS CONFIGURADOS - TESTAR EMAIL AGORA

## 🎉 Configuração Completa!

Todos os secrets foram configurados com sucesso no Supabase:

- ✅ `EMAIL_PROVIDER` = resend
- ✅ `EMAIL_API_KEY` = re_c1tpEyD8_NKFusih9vKVQknRAQfmFcWCv
- ✅ `EMAIL_FROM` = suporte@ordax.com.br
- ✅ `EMAIL_FROM_NAME` = Ordax Suporte
- ✅ `BASE_URL` = https://ordax.com.br

---

## 🧪 Teste Rápido da Edge Function

### Opção 1: Teste via cURL (Recomendado)

```bash
curl -X POST \
  https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NTU5NzksImV4cCI6MjA1MTIzMTk3OX0.Ql_Qs-Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8Qs8" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-conv-123",
    "messageId": "test-msg-456",
    "recipientUserId": "SEU_USER_ID_AQUI",
    "messageContent": "Esta é uma mensagem de teste do sistema de chat!"
  }'
```

**Nota**: Substitua `SEU_USER_ID_AQUI` por um ID de usuário real do seu banco.

### Opção 2: Teste via Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/functions/send-email
2. Clique em "Invoke function"
3. Cole o JSON:
```json
{
  "conversationId": "test-conv-123",
  "messageId": "test-msg-456",
  "recipientUserId": "SEU_USER_ID_AQUI",
  "messageContent": "Teste de email!"
}
```
4. Clique em "Run"

---

## 🎯 Teste End-to-End (Recomendado)

### Cenário Completo:

1. **Preparação** (2 min):
   ```
   - Abrir 2 navegadores
   - Browser 1: Login como cliente
   - Browser 2: Login como admin
   ```

2. **Criar Conversa** (1 min):
   ```
   - Cliente: Ir para /contato
   - Cliente: Preencher formulário
   - Cliente: Enviar mensagem
   ```

3. **Simular Offline** (30s):
   ```
   - Cliente: Fazer logout
   - Ou: Fechar aba do cliente
   ```

4. **Admin Responde** (30s):
   ```
   - Admin: Abrir conversa do cliente
   - Admin: Enviar mensagem de resposta
   ```

5. **Verificar Email** (1 min):
   ```
   - Abrir email do cliente
   - Verificar se recebeu notificação
   - Clicar no link da conversa
   ```

---

## ✅ Checklist de Verificação

### Email Recebido:
- [ ] Email chegou na caixa de entrada
- [ ] Remetente: "Ordax Suporte <suporte@ordax.com.br>"
- [ ] Assunto: "Nova mensagem: [Assunto da Conversa]"
- [ ] Corpo do email contém:
  - [ ] Nome do admin que enviou
  - [ ] Conteúdo da mensagem
  - [ ] Link para a conversa
  - [ ] Template HTML renderizado corretamente
  - [ ] Responsivo (testar no mobile)

### Banco de Dados:
```sql
-- Verificar registro de email
SELECT * FROM email_notifications 
ORDER BY created_at DESC 
LIMIT 5;
```

Deve mostrar:
- [ ] `status = 'sent'`
- [ ] `sent_at` preenchido
- [ ] `error_message = NULL`
- [ ] `retry_count = 0`

### Logs da Edge Function:
```bash
npx supabase functions logs send-email --tail
```

Deve mostrar:
- [ ] "Email sent successfully"
- [ ] Sem erros de API
- [ ] Tempo de resposta < 1s

---

## 🐛 Troubleshooting

### Email não chegou?

1. **Verificar spam/lixo eletrônico**
   - Emails de teste podem ir para spam

2. **Verificar domínio no Resend**
   ```
   - Acesse: https://resend.com/domains
   - Verifique se ordax.com.br está verificado
   - Se não, adicione os registros DNS necessários
   ```

3. **Verificar logs**
   ```bash
   npx supabase functions logs send-email
   ```

4. **Verificar user está offline**
   ```sql
   -- Verificar última atividade do usuário
   SELECT 
     id,
     email,
     last_sign_in_at,
     NOW() - last_sign_in_at as tempo_offline
   FROM auth.users
   WHERE id = 'SEU_USER_ID';
   ```

### Erro "User email not found"?

```sql
-- Verificar se usuário tem email
SELECT id, email FROM auth.users WHERE id = 'SEU_USER_ID';

-- Verificar se tem profile
SELECT * FROM profiles WHERE id = 'SEU_USER_ID';
```

### Erro de API do Resend?

1. Verificar API key válida:
   ```bash
   curl https://api.resend.com/emails \
     -H "Authorization: Bearer re_c1tpEyD8_NKFusih9vKVQknRAQfmFcWCv" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "suporte@ordax.com.br",
       "to": "seu-email@teste.com",
       "subject": "Teste",
       "html": "<p>Teste</p>"
     }'
   ```

2. Verificar limites do plano:
   - Resend free tier: 100 emails/dia
   - Resend free tier: 3,000 emails/mês

---

## 📊 Monitoramento

### Query para Dashboard:

```sql
-- Email delivery rate (últimas 24h)
SELECT 
  status,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM email_notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Emails por hora (hoje)
SELECT 
  DATE_TRUNC('hour', created_at) as hora,
  COUNT(*) as emails_enviados,
  COUNT(*) FILTER (WHERE status = 'sent') as sucesso,
  COUNT(*) FILTER (WHERE status = 'failed') as falhas
FROM email_notifications
WHERE created_at > CURRENT_DATE
GROUP BY hora
ORDER BY hora DESC;
```

---

## 🎉 Próximos Passos

Após confirmar que emails estão funcionando:

1. ✅ Testar attachment system
2. ✅ Testar typing indicator
3. ✅ Configurar monitoramento de produção
4. ✅ Documentar para equipe

---

## 📞 Suporte

### Resend:
- Dashboard: https://resend.com/
- Docs: https://resend.com/docs
- Support: https://resend.com/support

### Supabase:
- Dashboard: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud
- Functions: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/functions
- Logs: `npx supabase functions logs send-email`

---

**Status**: ✅ PRONTO PARA TESTAR  
**Última atualização**: 2026-02-22  
**Próxima ação**: Executar teste end-to-end
