# Comandos Rápidos de Deployment

## 🚀 Deploy Completo em 5 Minutos

### 1. Aplicar Migration (30s)
```bash
npx supabase db push
```

### 2. Deploy Edge Function (1min)
```bash
npx supabase functions deploy send-email
```

### 3. Configurar Secrets no Supabase Dashboard (2min)
```
Ir para: Project Settings > Edge Functions > Secrets

Adicionar:
- EMAIL_PROVIDER = resend
- EMAIL_API_KEY = re_xxxxx
- EMAIL_FROM = suporte@ordax.com.br
- EMAIL_FROM_NAME = Ordax Suporte
- BASE_URL = https://ordax.com.br
```

### 4. Deploy Frontend (1.5min)
```bash
npm run build
vercel --prod
```

---

## ✅ Verificação Rápida (2min)

### Teste 1: Email (30s)
```bash
# Enviar mensagem de admin para cliente offline
# Verificar email recebido
```

### Teste 2: Attachments (30s)
```bash
# Upload de imagem
# Verificar aparece instantaneamente
# Console: sem setTimeout logs
```

### Teste 3: Typing (30s)
```bash
# Cliente digita → Admin vê indicador
# Admin digita → Cliente vê indicador
```

### Teste 4: Monitoramento (30s)
```sql
-- Email delivery rate
SELECT status, COUNT(*) 
FROM email_notifications 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;

-- Attachment success rate
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE file_url IS NOT NULL) as success
FROM support_attachments
WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## 🐛 Troubleshooting Rápido

### Email não enviado?
```bash
# Ver logs
npx supabase functions logs send-email --tail

# Verificar secrets
npx supabase secrets list

# Testar API
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"from":"test@test.com","to":"user@test.com","subject":"Test","html":"Test"}'
```

### Anexos não aparecem?
```javascript
// Console do browser
// Verificar erros de Realtime
// Verificar Storage bucket permissions
```

### Typing não funciona?
```javascript
// Console do browser
// Verificar Realtime connection status
// Verificar broadcast events
```

---

## 🔄 Rollback Rápido

```sql
-- Desabilitar email notifications
ALTER TABLE support_messages DISABLE TRIGGER trigger_notify_new_message;

-- Re-habilitar
ALTER TABLE support_messages ENABLE TRIGGER trigger_notify_new_message;
```

---

## 📊 Monitoramento Contínuo

```sql
-- Dashboard query (executar a cada hora)
SELECT 
  'emails' as metric,
  COUNT(*) FILTER (WHERE status = 'sent') as success,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / COUNT(*), 2) as success_rate
FROM email_notifications
WHERE created_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
  'attachments' as metric,
  COUNT(*) FILTER (WHERE file_url IS NOT NULL) as success,
  COUNT(*) FILTER (WHERE file_url IS NULL) as failed,
  ROUND(COUNT(*) FILTER (WHERE file_url IS NOT NULL) * 100.0 / COUNT(*), 2) as success_rate
FROM support_attachments
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

**Tempo total de deployment**: ~7 minutos  
**Tempo total de verificação**: ~2 minutos  
**Total**: ~10 minutos do código ao ar! 🚀
