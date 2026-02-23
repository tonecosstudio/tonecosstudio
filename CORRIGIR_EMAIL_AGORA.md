# 🔧 Corrigir Sistema de Email - Guia Rápido

## Problema Identificado

O erro `500 Internal Server Error` indica que a Edge Function não está conseguindo acessar as variáveis de ambiente (secrets) necessárias.

## Solução em 3 Passos

### Passo 1: Executar Script de Correção

Execute o arquivo batch que vai configurar tudo automaticamente:

```bash
corrigir-email-completo.bat
```

Este script vai:
1. ✅ Verificar secrets atuais
2. ✅ Configurar todos os secrets necessários (incluindo sua API key do Resend)
3. ✅ Redeploy da Edge Function
4. ✅ Verificar configuração final

### Passo 2: Verificar Logs

Após executar o script, verifique os logs da função:

```bash
supabase functions logs send-email --follow
```

### Passo 3: Testar

1. Abra o admin: http://localhost:8080/admin/suporte
2. Responda uma conversa de cliente
3. Verifique se o email foi enviado

## O Que Foi Corrigido

### 1. Edge Function (`supabase/functions/send-email/index.ts`)

- ✅ Melhor tratamento de variáveis de ambiente ausentes
- ✅ Logs detalhados para debug
- ✅ Retorna erro 500 com mensagem clara se API key não estiver configurada
- ✅ Registra falhas na tabela `email_notifications`

### 2. Message Service (`src/lib/services/messageService.ts`)

- ✅ Re-habilitado o envio de email
- ✅ Não falha a operação se o email falhar (catch error)
- ✅ Logs claros de erro

### 3. Configuração de Secrets

O script `corrigir-email-completo.bat` configura:

```
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_c1tpEyD8_NKFusih9vKVQknRAQfmFcWCv
EMAIL_FROM=suporte@ordax.com.br
EMAIL_FROM_NAME=Ordax Suporte
BASE_URL=http://localhost:8080
```

## Verificar Se Funcionou

### Opção 1: Via SQL

```bash
supabase db execute testar-edge-function-direto.sql
```

### Opção 2: Via Chat

1. Login como admin
2. Responda uma conversa
3. Verifique a tabela:

```sql
SELECT * FROM email_notifications ORDER BY created_at DESC LIMIT 5;
```

### Opção 3: Ver Logs em Tempo Real

```bash
supabase functions logs send-email --follow
```

## Troubleshooting

### Se ainda der erro 500:

1. **Verifique se os secrets foram configurados:**
   ```bash
   supabase secrets list
   ```
   
   Deve mostrar:
   - EMAIL_PROVIDER
   - EMAIL_API_KEY
   - EMAIL_FROM
   - EMAIL_FROM_NAME
   - BASE_URL

2. **Verifique os logs da função:**
   ```bash
   supabase functions logs send-email
   ```
   
   Procure por:
   - "Email config check" - mostra se as variáveis foram carregadas
   - "EMAIL_API_KEY not configured" - indica que o secret não foi carregado

3. **Redeploy manual:**
   ```bash
   supabase functions deploy send-email --no-verify-jwt
   ```

### Se o email não chegar:

1. **Verifique spam/lixo eletrônico**

2. **Verifique se o usuário tem email cadastrado:**
   ```sql
   SELECT id, email, full_name FROM profiles WHERE email IS NOT NULL;
   ```

3. **Verifique a tabela de notificações:**
   ```sql
   SELECT 
     en.*,
     p.email,
     sc.subject
   FROM email_notifications en
   JOIN profiles p ON en.recipient_user_id = p.id
   JOIN support_conversations sc ON en.conversation_id = sc.id
   ORDER BY en.created_at DESC
   LIMIT 5;
   ```

4. **Teste a API do Resend diretamente:**
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer re_c1tpEyD8_NKFusih9vKVQknRAQfmFcWCv" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "Ordax Suporte <suporte@ordax.com.br>",
       "to": "seu-email@exemplo.com",
       "subject": "Teste",
       "html": "<p>Teste de email</p>"
     }'
   ```

## Arquivos Criados/Modificados

1. ✅ `supabase/functions/send-email/index.ts` - Edge Function corrigida
2. ✅ `src/lib/services/messageService.ts` - Email re-habilitado
3. ✅ `corrigir-email-completo.bat` - Script de correção automática
4. ✅ `redeploy-email-function.bat` - Script de redeploy rápido
5. ✅ `testar-edge-function-direto.sql` - Script de teste
6. ✅ `CORRIGIR_EMAIL_AGORA.md` - Este guia

## Próximos Passos

Após corrigir:

1. ✅ Execute `corrigir-email-completo.bat`
2. ✅ Teste enviando uma mensagem como admin
3. ✅ Verifique os logs
4. ✅ Confirme que o email chegou

## Suporte

Se ainda tiver problemas:

1. Compartilhe os logs: `supabase functions logs send-email`
2. Compartilhe o resultado de: `supabase secrets list`
3. Compartilhe o resultado de: `SELECT * FROM email_notifications ORDER BY created_at DESC LIMIT 5;`
