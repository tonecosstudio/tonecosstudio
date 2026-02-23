# ⚙️ CONFIGURAR SECRETS - AÇÃO NECESSÁRIA

## ✅ Deploy Concluído

- ✅ Migration aplicada com sucesso
- ✅ Edge Function `send-email` deployed
- ⏳ **PENDENTE**: Configurar secrets no Supabase Dashboard

---

## 🔑 Secrets Necessários

Você precisa configurar os seguintes secrets no Supabase Dashboard para que as notificações por email funcionem:

### Como Configurar:

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/functions

2. Clique em "Add new secret"

3. Adicione os seguintes secrets:

```
EMAIL_PROVIDER
Valor: resend
(ou 'sendgrid' se preferir usar SendGrid)

EMAIL_API_KEY
Valor: re_xxxxx
(Sua API key do Resend - obtenha em https://resend.com/api-keys)

EMAIL_FROM
Valor: suporte@ordax.com.br
(Email remetente - deve estar verificado no Resend)

EMAIL_FROM_NAME
Valor: Ordax Suporte
(Nome que aparece como remetente)

BASE_URL
Valor: https://ordax.com.br
(URL do seu site para links nos emails)
```

---

## 📝 Obter API Key do Resend

Se você ainda não tem uma API key do Resend:

1. Acesse: https://resend.com/
2. Faça login ou crie uma conta
3. Vá em "API Keys"
4. Clique em "Create API Key"
5. Dê um nome (ex: "Ordax Production")
6. Copie a key (começa com `re_`)
7. Cole no secret `EMAIL_API_KEY`

**Importante**: Você também precisa verificar o domínio `ordax.com.br` no Resend para poder enviar emails.

---

## 🔧 Configurar Database Settings (Opcional)

Para que o trigger do banco funcione corretamente, você pode configurar as variáveis do banco:

```sql
-- Execute no SQL Editor do Supabase
ALTER DATABASE postgres SET app.supabase_url = 'https://pabxpvqwtvbjaunjejud.supabase.co';
ALTER DATABASE postgres SET app.supabase_anon_key = 'SUA_ANON_KEY_AQUI';
```

**Nota**: Isso é opcional. O trigger pode funcionar sem essas configurações se você usar a abordagem alternativa (chamar a Edge Function diretamente do frontend).

---

## ✅ Verificar Deployment

Após configurar os secrets, você pode testar:

### 1. Verificar Edge Function:
```bash
curl -X POST \
  https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test",
    "messageId": "test",
    "recipientUserId": "test",
    "messageContent": "Teste"
  }'
```

### 2. Verificar Secrets:
```bash
npx supabase secrets list
```

---

## 🚀 Próximos Passos

Após configurar os secrets:

1. ✅ Testar email notifications manualmente
2. ✅ Testar attachment system (já funciona!)
3. ✅ Testar typing indicator (já funciona!)
4. ✅ Monitorar logs da Edge Function

---

## 📊 Status do Deployment

- ✅ Migration: APLICADA
- ✅ Edge Function: DEPLOYED
- ⏳ Secrets: PENDENTE (ação manual necessária)
- ✅ Frontend: Código pronto (já commitado)
- ✅ Attachment System: FUNCIONANDO
- ✅ Typing Indicator: FUNCIONANDO

---

## 🎯 Resumo

**O que está funcionando agora**:
- ✅ Attachment system com optimistic updates
- ✅ Typing indicator em tempo real
- ✅ Código limpo sem workarounds

**O que precisa de configuração**:
- ⏳ Email notifications (precisa configurar secrets)

**Tempo estimado para configurar secrets**: 5 minutos

---

**Link direto para configurar**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/functions

**Última atualização**: 2026-02-22
