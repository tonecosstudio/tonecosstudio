# Configuração de Notificações por Email

## Status Atual
✅ Sistema implementado
❌ Configuração pendente

## O que está funcionando
- Migration criada (`20260222120000_create_email_notifications.sql`)
- Edge Function implementada (`supabase/functions/send-email/index.ts`)
- Trigger automático para enviar emails quando admin responde cliente
- Sistema de retry com backoff exponencial
- Detecção de usuário online (não envia email se usuário está ativo)
- Suporte para Resend e SendGrid

## O que precisa ser configurado

### 1. Aplicar a Migration

```bash
# Aplicar a migration no Supabase
supabase db push
```

### 2. Habilitar extensão pg_net (se usar trigger automático)

No Supabase Dashboard:
1. Vá em Database > Extensions
2. Procure por `pg_net`
3. Clique em Enable

### 3. Configurar variáveis de ambiente

Adicione no arquivo `.env`:

```env
# Email Provider (resend ou sendgrid)
EMAIL_PROVIDER=resend

# API Key do provedor escolhido
EMAIL_API_KEY=re_xxxxxxxxxxxxx

# Email remetente
EMAIL_FROM=suporte@ordax.com.br
EMAIL_FROM_NAME=Ordax Suporte

# URL base da aplicação
BASE_URL=https://ordax.com.br
```

### 4. Configurar no Supabase Dashboard

1. Vá em Edge Functions
2. Clique em `send-email` (ou crie se não existir)
3. Adicione as variáveis de ambiente:
   - `EMAIL_PROVIDER`
   - `EMAIL_API_KEY`
   - `EMAIL_FROM`
   - `EMAIL_FROM_NAME`
   - `BASE_URL`

### 5. Deploy da Edge Function

```bash
# Deploy da função
supabase functions deploy send-email
```

## Provedores de Email Suportados

### Opção 1: Resend (Recomendado)
- Mais simples de configurar
- Ótima deliverability
- Plano gratuito: 100 emails/dia
- Cadastro: https://resend.com

**Configuração:**
```env
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_xxxxxxxxxxxxx
```

### Opção 2: SendGrid
- Mais recursos avançados
- Plano gratuito: 100 emails/dia
- Cadastro: https://sendgrid.com

**Configuração:**
```env
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=SG.xxxxxxxxxxxxx
```

## Como Funciona

1. **Admin envia mensagem** → Trigger detecta (`sender_type = 'admin'`)
2. **Verifica se usuário está online** → Se sim, não envia email
3. **Busca email do usuário** → Da tabela `profiles`
4. **Envia email** → Via Resend ou SendGrid
5. **Registra notificação** → Na tabela `email_notifications`
6. **Retry automático** → Até 3 tentativas com backoff exponencial

## Template do Email

O email enviado inclui:
- Nome do destinatário
- Assunto da conversa
- Nome do remetente (admin)
- Conteúdo da mensagem
- Botão para acessar a conversa
- Design responsivo (dark mode support)

## Testar o Sistema

### 1. Teste Manual via Edge Function

```bash
# Chamar a função diretamente
curl -X POST https://seu-projeto.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "uuid-da-conversa",
    "messageId": "uuid-da-mensagem",
    "recipientUserId": "uuid-do-usuario",
    "messageContent": "Teste de mensagem"
  }'
```

### 2. Teste via Chat

1. Faça login como admin
2. Responda uma conversa de cliente
3. Verifique se o email foi enviado
4. Confira a tabela `email_notifications` para ver o status

## Monitoramento

### Ver notificações enviadas

```sql
SELECT 
  en.*,
  sc.subject,
  sm.message,
  p.email
FROM email_notifications en
JOIN support_conversations sc ON en.conversation_id = sc.id
JOIN support_messages sm ON en.message_id = sm.id
JOIN profiles p ON en.recipient_user_id = p.id
ORDER BY en.created_at DESC
LIMIT 20;
```

### Ver falhas

```sql
SELECT *
FROM email_notifications
WHERE status = 'failed'
ORDER BY created_at DESC;
```

## Troubleshooting

### Email não está sendo enviado

1. Verifique se a migration foi aplicada
2. Verifique se as variáveis de ambiente estão configuradas
3. Verifique os logs da Edge Function no Supabase Dashboard
4. Verifique a tabela `email_notifications` para ver erros

### Usuário não recebe email

1. Verifique se o email está cadastrado na tabela `profiles`
2. Verifique se o usuário não está online (sistema não envia se estiver)
3. Verifique a caixa de spam
4. Verifique os logs do provedor de email (Resend/SendGrid)

## Próximos Passos

1. ✅ Aplicar migration
2. ✅ Configurar variáveis de ambiente
3. ✅ Deploy da Edge Function
4. ✅ Testar envio de email
5. ⬜ Configurar domínio personalizado no provedor
6. ⬜ Adicionar templates personalizados
7. ⬜ Implementar agrupamento de notificações (múltiplas mensagens em 1 email)

## Custos

- **Resend**: Gratuito até 100 emails/dia, depois $20/mês para 50k emails
- **SendGrid**: Gratuito até 100 emails/dia, depois $19.95/mês para 50k emails

## Segurança

- ✅ Emails enviados apenas para usuários autenticados
- ✅ Validação de permissões no trigger
- ✅ Rate limiting via provedor de email
- ✅ Logs de todas as tentativas de envio
- ✅ Retry com backoff para evitar spam
