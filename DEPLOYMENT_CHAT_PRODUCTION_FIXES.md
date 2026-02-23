# Deployment Guide: Chat Production Fixes

## Status: PRONTO PARA DEPLOYMENT

### ✅ Implementações Completas

1. **Email Notifications System** (Fase 1)
2. **Attachment System Fix** (Fase 2) 
3. **Typing Indicator** (Fase 3)

---

## Passo 1: Aplicar Migration do Banco de Dados

### Local (Desenvolvimento):

```bash
# Aplicar migration
npx supabase migration up

# Ou resetar banco (cuidado: apaga dados!)
npx supabase db reset
```

### Produção:

```bash
# Push migration para produção
npx supabase db push
```

**Arquivo**: `supabase/migrations/20260222120000_create_email_notifications.sql`

**O que faz**:
- Cria tabela `email_notifications`
- Cria trigger `notify_new_message()` que chama Edge Function
- Adiciona indexes para performance

---

## Passo 2: Configurar Variáveis de Ambiente

### Edge Function (Supabase Dashboard):

Vá em: **Project Settings > Edge Functions > Secrets**

Adicione:

```bash
EMAIL_PROVIDER=resend          # ou 'sendgrid'
EMAIL_API_KEY=re_xxxxx         # Sua API key do Resend ou SendGrid
EMAIL_FROM=suporte@ordax.com.br
EMAIL_FROM_NAME=Ordax Suporte
BASE_URL=https://ordax.com.br  # URL do seu site
```

### Database Settings (para trigger):

```sql
-- Executar no SQL Editor do Supabase
ALTER DATABASE postgres SET app.supabase_url = 'https://seu-projeto.supabase.co';
ALTER DATABASE postgres SET app.supabase_anon_key = 'sua-anon-key';
```

---

## Passo 3: Deploy da Edge Function

```bash
# Deploy da função send-email
npx supabase functions deploy send-email

# Verificar deployment
npx supabase functions list
```

### Testar Edge Function:

```bash
curl -X POST \
  https://seu-projeto.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-conv-id",
    "messageId": "test-msg-id",
    "recipientUserId": "test-user-id",
    "messageContent": "Teste de email"
  }'
```

---

## Passo 4: Deploy do Frontend

```bash
# Instalar dependências (se necessário)
npm install

# Build
npm run build

# Deploy (Vercel/Netlify/etc)
npm run deploy
# ou
vercel --prod
```

---

## Passo 5: Verificação Pós-Deploy

### 1. Email Notifications ✅

**Teste Manual**:
1. Criar conversa como cliente
2. Fazer logout (simular offline)
3. Admin envia mensagem
4. Verificar email recebido
5. Verificar registro em `email_notifications` table

**SQL para verificar**:
```sql
SELECT * FROM email_notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

### 2. Attachment System ✅

**Teste Manual**:
1. Abrir chat como cliente
2. Anexar imagem
3. Verificar preview aparece IMEDIATAMENTE
4. Verificar barra de progresso
5. Verificar anexo persiste após refresh
6. Verificar NO CONSOLE: sem `setTimeout` logs

**Checklist**:
- [ ] Anexo aparece instantaneamente (optimistic update)
- [ ] Barra de progresso funciona
- [ ] Anexo persiste após reload
- [ ] Sem setTimeout no código
- [ ] Sem refreshKey no código

### 3. Typing Indicator ✅

**Teste Manual**:
1. Abrir chat em 2 navegadores (cliente + admin)
2. Cliente digita → Admin vê "Cliente está digitando..."
3. Admin digita → Cliente vê "Admin está digitando..."
4. Parar de digitar → Indicador desaparece após 3s
5. Enviar mensagem → Indicador desaparece imediatamente

**Checklist**:
- [ ] Indicador aparece após 300ms de digitação
- [ ] Indicador desaparece após 3s de inatividade
- [ ] Indicador desaparece ao enviar mensagem
- [ ] Funciona bidirecionalmente (admin ↔ customer)
- [ ] Múltiplos usuários: "João e Maria estão digitando..."

---

## Passo 6: Monitoramento

### Email Delivery Rate:

```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM email_notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### Attachment Upload Success Rate:

```sql
SELECT 
  COUNT(*) as total_attachments,
  COUNT(*) FILTER (WHERE file_url IS NOT NULL) as successful,
  COUNT(*) FILTER (WHERE file_url IS NULL) as failed,
  ROUND(COUNT(*) FILTER (WHERE file_url IS NOT NULL) * 100.0 / COUNT(*), 2) as success_rate
FROM support_attachments
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Realtime Connection Health:

- Monitorar Supabase Realtime dashboard
- Verificar broadcast channel activity
- Verificar connection drops

---

## Rollback Plan

### Se houver problemas:

#### Email Notifications:
```sql
-- Desabilitar trigger temporariamente
ALTER TABLE support_messages DISABLE TRIGGER trigger_notify_new_message;

-- Re-habilitar após fix
ALTER TABLE support_messages ENABLE TRIGGER trigger_notify_new_message;
```

#### Attachments:
- Reverter frontend para versão anterior
- Workaround antigo ainda funciona
- Sem perda de dados

#### Typing Indicator:
- Feature não-crítica
- Pode ser desabilitada removendo componente
- Sem impacto no chat principal

---

## Checklist Final de Deployment

### Pré-Deploy:
- [ ] Migration testada localmente
- [ ] Edge Function testada localmente
- [ ] Frontend build sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Backup do banco de dados

### Deploy:
- [ ] Migration aplicada em produção
- [ ] Edge Function deployed
- [ ] Secrets configurados no Supabase
- [ ] Frontend deployed

### Pós-Deploy:
- [ ] Email notifications funcionando
- [ ] Attachments sem setTimeout
- [ ] Typing indicator funcionando
- [ ] Sem erros no console
- [ ] Monitoramento configurado
- [ ] Equipe treinada

---

## Troubleshooting

### Problema: Emails não sendo enviados

1. Verificar logs da Edge Function:
```bash
npx supabase functions logs send-email
```

2. Verificar secrets:
```bash
npx supabase secrets list
```

3. Testar email service diretamente:
```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@example.com","to":"user@example.com","subject":"Test","html":"Test"}'
```

### Problema: Anexos não aparecem

1. Verificar console do browser
2. Verificar Realtime subscription status
3. Verificar Storage bucket permissions
4. Verificar attachment record no banco

### Problema: Typing indicator não aparece

1. Verificar Realtime connection status
2. Verificar broadcast events no console
3. Verificar user names sendo passados corretamente

---

## Contatos de Suporte

- **Supabase Support**: https://supabase.com/support
- **Resend Support**: https://resend.com/support
- **SendGrid Support**: https://support.sendgrid.com/

---

## Próximos Passos (Opcional)

### Melhorias Futuras:

1. **Email Notifications**:
   - [ ] Message grouping (5-minute window)
   - [ ] Email preferences per user
   - [ ] Digest emails (daily summary)
   - [ ] Push notifications

2. **Attachments**:
   - [ ] Image compression
   - [ ] Drag-and-drop upload
   - [ ] Paste from clipboard
   - [ ] Video support

3. **Typing Indicator**:
   - [ ] Show typing preview
   - [ ] Voice recording indicator
   - [ ] Read receipts
   - [ ] Delivery status

---

**Última atualização**: 2026-02-22
**Versão**: 1.0.0
**Status**: ✅ Pronto para produção
