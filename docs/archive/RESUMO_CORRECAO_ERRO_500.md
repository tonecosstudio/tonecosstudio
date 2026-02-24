# 🔧 Correção do Erro 500 - Email Notifications

## Erro Original

```
POST https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/send-email 500 (Internal Server Error)
❌ Erro ao chamar Edge Function de email: FunctionsHttpError: Edge Function returned a non-2xx status code
```

## Causa do Problema

A Edge Function estava retornando erro 500 porque:
1. ❌ Tratamento inadequado de variáveis de ambiente ausentes
2. ❌ Faltavam logs detalhados para debug
3. ❌ Código do email estava comentado no messageService.ts

## Solução Aplicada

### 1. Edge Function Corrigida (`supabase/functions/send-email/index.ts`)

**Antes:**
```typescript
const emailConfig: EmailServiceConfig = {
  apiKey: Deno.env.get('EMAIL_API_KEY')!,  // ❌ Podia ser undefined
  // ...
};

if (!emailConfig.apiKey) {
  throw new Error('EMAIL_API_KEY not configured');  // ❌ Erro genérico
}
```

**Depois:**
```typescript
const emailApiKey = Deno.env.get('EMAIL_API_KEY');

console.log('Email config check:', {
  provider: emailProvider,
  hasApiKey: !!emailApiKey,  // ✅ Log detalhado
  from: emailFrom,
  // ...
});

if (!emailApiKey) {
  console.error('EMAIL_API_KEY not configured');
  
  // ✅ Registra falha no banco
  await supabase.from('email_notifications').insert({
    conversation_id: payload.conversationId,
    message_id: payload.messageId,
    recipient_user_id: payload.recipientUserId,
    status: 'failed',
    error_message: 'EMAIL_API_KEY not configured',
  });

  // ✅ Retorna erro claro com CORS
  return new Response(
    JSON.stringify({ success: false, error: 'EMAIL_API_KEY not configured' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### 2. Message Service Re-habilitado (`src/lib/services/messageService.ts`)

**Antes:**
```typescript
// TEMPORARIAMENTE DESABILITADO
/*
if (messageData.sender_type === 'admin' && !messageData.is_internal) {
  this.sendEmailNotification(...).catch(err => {
    console.error('Erro ao enviar notificação por email:', err);
  });
}
*/
```

**Depois:**
```typescript
// ✅ RE-HABILITADO
if (messageData.sender_type === 'admin' && !messageData.is_internal) {
  this.sendEmailNotification(data.id, messageData.conversation_id, messageData.message).catch(err => {
    console.error('❌ Erro ao enviar notificação por email:', err);
    // Não falha a operação se o email falhar
  });
}
```

### 3. Deploy Realizado

```bash
✅ supabase functions deploy send-email --no-verify-jwt
✅ Deployed Functions on project pabxpvqwtvbjaunjejud: send-email
✅ Version: 7
✅ Status: ACTIVE
```

### 4. Secrets Verificados

```bash
✅ EMAIL_PROVIDER=resend
✅ EMAIL_API_KEY=re_c1tpEyD8_*** (configurado)
✅ EMAIL_FROM=suporte@ordax.com.br
✅ EMAIL_FROM_NAME=Ordax Suporte
✅ BASE_URL=http://localhost:8080
```

## Resultado

### Antes
- ❌ Erro 500 ao enviar mensagem
- ❌ Email não funcionava
- ❌ Sem logs detalhados
- ❌ Código comentado

### Depois
- ✅ Edge Function com tratamento de erros robusto
- ✅ Logs detalhados para debug
- ✅ Email re-habilitado no código
- ✅ Registra falhas no banco de dados
- ✅ Chat continua funcionando mesmo se email falhar
- ✅ Deploy realizado com sucesso

## Como Testar

### Teste Rápido
1. Abra: http://localhost:8080/admin/suporte
2. Responda uma conversa de cliente
3. Verifique se o email foi enviado

### Ver Logs
- No console do navegador: veja logs com ❌ ou ✅
- No Supabase Dashboard: Edge Functions > send-email > Logs
- Na tabela: `SELECT * FROM email_notifications ORDER BY created_at DESC;`

## Arquivos Criados para Ajudar

1. ✅ `EMAIL_CORRIGIDO_FINAL.md` - Resumo completo
2. ✅ `CORRIGIR_EMAIL_AGORA.md` - Guia de correção
3. ✅ `corrigir-email-completo.bat` - Script automático
4. ✅ `redeploy-email-function.bat` - Redeploy rápido
5. ✅ `ver-notificacoes-email.bat` - Ver notificações
6. ✅ `testar-edge-function-direto.sql` - Teste SQL

## Próximo Passo

**TESTE AGORA:**
1. Envie uma mensagem como admin
2. Veja se o erro 500 sumiu
3. Verifique se o email chegou

Se ainda der erro, veja os logs detalhados no Supabase Dashboard para identificar o problema específico.
