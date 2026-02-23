# ✅ Configuração de Email - EXECUTAR AGORA

## Status
✅ Migration aplicada
✅ Edge Function deployada
⏳ Falta configurar variáveis de ambiente

## Passo 1: Configurar Variáveis de Ambiente no Supabase

Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/functions

Clique na função `send-email` e adicione as seguintes variáveis:

```
EMAIL_PROVIDER=resend
EMAIL_API_KEY=<SUA_KEY_DO_RESEND_AQUI>
EMAIL_FROM=suporte@ordax.com.br
EMAIL_FROM_NAME=Ordax Suporte
BASE_URL=http://localhost:8080
```

**IMPORTANTE:** Substitua `<SUA_KEY_DO_RESEND_AQUI>` pela sua chave do Resend que você já tem.

## Passo 2: Habilitar pg_net (Opcional - para trigger automático)

Se quiser que os emails sejam enviados automaticamente via trigger do banco:

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/database/extensions
2. Procure por `pg_net`
3. Clique em Enable

**OU** você pode chamar a função manualmente via código (mais confiável).

## Passo 3: Testar o Sistema

### Opção A: Teste via Dashboard do Supabase

1. Vá em Edge Functions
2. Clique em `send-email`
3. Clique em "Invoke"
4. Use este payload de teste:

```json
{
  "conversationId": "uuid-de-uma-conversa-real",
  "messageId": "uuid-de-uma-mensagem-real",
  "recipientUserId": "uuid-de-um-usuario-real",
  "messageContent": "Teste de email - esta é uma mensagem de teste"
}
```

### Opção B: Teste via Chat Real

1. Faça login como admin
2. Responda uma conversa de cliente
3. O email deve ser enviado automaticamente

## Verificar se Funcionou

### 1. Verificar logs da função

```sql
-- Ver últimas notificações
SELECT 
  en.*,
  sc.subject,
  p.email
FROM email_notifications en
JOIN support_conversations sc ON en.conversation_id = sc.id
JOIN profiles p ON en.recipient_user_id = p.id
ORDER BY en.created_at DESC
LIMIT 10;
```

### 2. Ver erros (se houver)

```sql
SELECT *
FROM email_notifications
WHERE status = 'failed'
ORDER BY created_at DESC;
```

## Troubleshooting

### Se não funcionar:

1. **Verifique as variáveis de ambiente** no Dashboard
2. **Verifique os logs** da Edge Function no Dashboard
3. **Verifique se o email do usuário existe** na tabela profiles
4. **Verifique se a API key do Resend está correta**

### Logs da Edge Function

Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/functions/send-email/logs

## Próximos Passos

Depois que testar e confirmar que está funcionando:

1. ✅ Atualizar BASE_URL para produção quando fizer deploy
2. ✅ Configurar domínio personalizado no Resend (opcional)
3. ✅ Monitorar uso de emails no Resend Dashboard

## Comandos Úteis

```bash
# Ver logs da função em tempo real
supabase functions logs send-email

# Redeployar se fizer alterações
supabase functions deploy send-email
```

## Limites do Resend (Plano Gratuito)

- 100 emails por dia
- 3,000 emails por mês
- Depois disso: $20/mês para 50,000 emails

## Está Pronto!

Assim que configurar as variáveis de ambiente no Dashboard, o sistema estará 100% funcional! 🎉
