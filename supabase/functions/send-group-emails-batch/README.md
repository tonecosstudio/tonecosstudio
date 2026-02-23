# Edge Function: send-group-emails-batch

## Visão Geral

Edge Function responsável por enviar emails em lote para membros de grupos quando uma nova mensagem é enviada. Esta função implementa a abordagem V1 simples: sempre envia email para todos os membros que têm notificações por email habilitadas.

## Arquitetura

### V1 Simple Approach

- **Sempre envia email** para todos os membros do grupo
- **Respeita preferências de notificação** (`email_notifications_enabled`)
- **NÃO há lógica complexa** de "offline detection"
- **Retry logic** com até 3 tentativas e exponential backoff

### Fluxo de Execução

1. Recebe `groupId` e `messageId` no payload
2. Busca detalhes da mensagem (conteúdo, remetente, grupo)
3. Busca todos os membros do grupo
4. Filtra membros com `email_notifications_enabled = true`
5. Para cada membro:
   - Gera HTML do email com preview da mensagem
   - Envia email usando a função `send-email` existente
   - Implementa retry logic (até 3 tentativas com exponential backoff)
6. Retorna estatísticas: total enviado, falhas, erros

## Request Format

```typescript
POST /functions/v1/send-group-emails-batch

{
  "groupId": "uuid",
  "messageId": "uuid"
}
```

## Response Format

### Success Response

```json
{
  "success": true,
  "sent": 45,
  "failed": 2,
  "total": 47,
  "errors": [
    "user@example.com: Resend API error: Invalid email",
    "another@example.com: Max retries exceeded"
  ]
}
```

### No Members to Notify

```json
{
  "success": true,
  "sent": 0,
  "skipped": 10,
  "reason": "no_members_with_notifications_enabled"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Message not found"
}
```

## Email Template

O email inclui:

- **Nome do grupo** (badge destacado)
- **Nome do remetente** (admin que enviou a mensagem)
- **Preview da mensagem** (primeiros 200 caracteres)
- **Link direto** para visualizar mensagem completa no sistema
- **Design responsivo** com suporte a dark mode

## Retry Logic

### Estratégia de Retry

- **Máximo de tentativas**: 3
- **Exponential backoff**: 1s, 2s, 4s
- **Comportamento**: Se uma tentativa falha, aguarda o delay e tenta novamente
- **Logging**: Cada tentativa é logada para debugging

### Exemplo de Retry

```
Attempt 1: Failed (Resend API timeout)
Wait 1 second...
Attempt 2: Failed (Network error)
Wait 2 seconds...
Attempt 3: Success (Email sent)
```

## Environment Variables

Variáveis de ambiente necessárias:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Provider (resend ou sendgrid)
EMAIL_PROVIDER=resend
EMAIL_API_KEY=your-api-key
EMAIL_FROM=suporte@ordax.com.br
EMAIL_FROM_NAME=Ordax

# Application
BASE_URL=https://your-app.com
```

## Deployment

### Deploy da Edge Function

```bash
# Deploy para Supabase
supabase functions deploy send-group-emails-batch

# Configurar secrets
supabase secrets set EMAIL_API_KEY=your-api-key
supabase secrets set EMAIL_PROVIDER=resend
supabase secrets set EMAIL_FROM=suporte@ordax.com.br
supabase secrets set EMAIL_FROM_NAME=Ordax
supabase secrets set BASE_URL=https://your-app.com
```

### Testar Localmente

```bash
# Iniciar função localmente
supabase functions serve send-group-emails-batch

# Testar com curl
curl -X POST http://localhost:54321/functions/v1/send-group-emails-batch \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "uuid-do-grupo",
    "messageId": "uuid-da-mensagem"
  }'
```

## Integração com Sistema

### Chamada após Envio de Mensagem

```typescript
// Após criar mensagem no grupo
const message = await supabase
  .from('chat_group_messages')
  .insert({
    group_id: groupId,
    sender_id: adminId,
    message: messageContent,
  })
  .select()
  .single();

// Enviar emails em batch (assíncrono)
await supabase.functions.invoke('send-group-emails-batch', {
  body: {
    groupId: groupId,
    messageId: message.data.id,
  },
});
```

### Chamada via Trigger (Opcional)

Alternativamente, pode-se criar um trigger no banco de dados:

```sql
-- Trigger para enviar emails automaticamente
CREATE OR REPLACE FUNCTION trigger_send_group_emails()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-group-emails-batch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'groupId', NEW.group_id,
      'messageId', NEW.id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER send_group_emails_after_insert
AFTER INSERT ON chat_group_messages
FOR EACH ROW
EXECUTE FUNCTION trigger_send_group_emails();
```

## Error Handling

### Tipos de Erros

1. **Validation Errors**
   - Missing `groupId` or `messageId`
   - Message not found
   - Group not found

2. **Configuration Errors**
   - `EMAIL_API_KEY` not configured
   - Invalid email provider

3. **Email Service Errors**
   - Resend/SendGrid API errors
   - Network timeouts
   - Invalid email addresses

4. **Database Errors**
   - Failed to fetch message details
   - Failed to fetch group members

### Logging

Todos os erros são logados com contexto:

```typescript
console.error('Error sending email to user@example.com:', error);
console.log('Batch email results:', { sent: 45, failed: 2 });
```

## Performance Considerations

### Batch Size

- **Sem limite de batch size** na V1
- Envia emails sequencialmente (não em paralelo)
- Para grupos muito grandes (1000+ membros), considerar:
  - Processar em chunks
  - Usar queue system (ex: pg_cron + queue table)

### Timing

- **Retry delays**: 1s, 2s, 4s (total ~7s por email com falhas)
- **Tempo estimado**: ~100ms por email bem-sucedido
- **Exemplo**: Grupo com 100 membros = ~10 segundos

## Monitoring

### Métricas Importantes

- **Taxa de sucesso**: `sent / total`
- **Taxa de falha**: `failed / total`
- **Erros comuns**: Analisar array `errors` na resposta

### Logs para Monitorar

```bash
# Ver logs da função
supabase functions logs send-group-emails-batch

# Filtrar por erros
supabase functions logs send-group-emails-batch --level error
```

## Troubleshooting

### Email não enviado

1. Verificar se membro tem `email_notifications_enabled = true`
2. Verificar se `EMAIL_API_KEY` está configurado
3. Verificar logs da função para erros específicos
4. Testar email provider manualmente

### Retry não funcionando

1. Verificar se erro é retryable (network errors, timeouts)
2. Verificar logs para ver tentativas
3. Aumentar delays se necessário

### Performance lenta

1. Verificar tamanho do grupo
2. Considerar processar em chunks
3. Verificar latência do email provider

## Future Improvements (V2)

Melhorias planejadas para versões futuras:

1. **Offline Detection**
   - Enviar email apenas para membros offline (não abriram grupo nas últimas 24h)
   - Reduz volume de emails

2. **Batch Processing**
   - Processar emails em chunks paralelos
   - Melhor performance para grupos grandes

3. **Queue System**
   - Usar queue table para processar emails assincronamente
   - Melhor controle de retry e priorização

4. **Email Digest**
   - Agrupar múltiplas mensagens em um único email
   - Reduz spam para grupos muito ativos

5. **Unsubscribe Link**
   - Link para desabilitar notificações de grupo específico
   - Melhor UX para usuários

## Requirements Validation

Esta implementação valida os seguintes requisitos:

- **Requirement 11.1**: Envia email para membros quando mensagem é criada
- **Requirement 11.2**: Inclui nome do grupo, remetente e preview da mensagem
- **Requirement 11.3**: Inclui link direto para visualizar mensagem completa
- **Requirement 11.4**: Respeita preferências de notificação (`email_notifications_enabled`)

## Related Files

- `supabase/functions/send-email/index.ts` - Edge Function base reutilizada
- `.kiro/specs/chat-groups-system/design.md` - Design document
- `.kiro/specs/chat-groups-system/requirements.md` - Requirements document
