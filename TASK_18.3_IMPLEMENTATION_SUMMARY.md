# Task 18.3 - Integração com Trigger de Mensagens

## Resumo da Implementação

Esta tarefa integrou o `notificationService` com o sistema de mensagens para enviar notificações por email automaticamente quando mensagens são enviadas.

## Mudanças Realizadas

### 1. Modificação do `messageService.ts`

**Arquivo:** `src/lib/services/messageService.ts`

**Mudanças:**
- Importado `notificationService` 
- Modificado método `sendMessage()` para chamar `notificationService.sendEmailNotification()` após inserir mensagem
- Implementada lógica para determinar o destinatário da notificação
- Adicionado tratamento de erros para não falhar o envio da mensagem se a notificação falhar

**Lógica Implementada:**
```typescript
// Após inserir mensagem com sucesso:
if (!messageData.is_internal) {
  // Buscar conversa para determinar destinatário
  const conversation = await supabase
    .from("support_conversations")
    .select("user_id")
    .eq("id", messageData.conversation_id)
    .single();

  // Se admin enviou para customer
  if (messageData.sender_type === "admin" && 
      messageData.sender_id !== conversation.user_id) {
    await notificationService.sendEmailNotification(
      conversation.user_id,      // destinatário
      messageData.conversation_id,
      messageData.message
    );
  }
}
```

### 2. Testes de Integração

**Arquivo:** `src/lib/services/messageService.integration.test.ts`

**Testes Criados:**
1. ✅ Verifica que `notificationService` é chamado quando admin envia mensagem
2. ✅ Verifica que notificações NÃO são enviadas para notas internas
3. ✅ Verifica que notificações NÃO são enviadas quando sender = recipient
4. ✅ Verifica que erros de notificação não impedem envio da mensagem
5. ✅ Verifica delegação da verificação de usuário online
6. ✅ Verifica ordem correta: mensagem → notificação
7. ✅ Documenta comportamento futuro para mensagens de customers

**Resultado:** Todos os 7 testes passaram ✅

## Requisitos Atendidos

### Requirement 16.2: Enviar email quando destinatário está offline
- ✅ `messageService` chama `notificationService.sendEmailNotification()`
- ✅ `notificationService` verifica se usuário está online via `isUserOnline()`
- ✅ Email só é enviado se usuário estiver offline (lógica no `notificationService`)

### Requirement 16.5: NÃO enviar email se usuário está online
- ✅ Verificação implementada no `notificationService.sendEmailNotification()`
- ✅ Método `isUserOnline()` verifica atividade nos últimos 5 minutos
- ✅ Se usuário está online, notificação não é enviada

## Fluxo de Execução

```
1. Admin envia mensagem via useMessages.sendMessage()
   ↓
2. messageService.sendMessage() insere mensagem no banco
   ↓
3. Mensagem inserida com sucesso
   ↓
4. messageService busca conversation.user_id (destinatário)
   ↓
5. messageService chama notificationService.sendEmailNotification()
   ↓
6. notificationService.isUserOnline() verifica se destinatário está online
   ↓
7a. Se ONLINE: notificação não é enviada (return early)
7b. Se OFFLINE: notificação é enfileirada via queueNotification()
   ↓
8. Após 5 minutos, processNotificationQueue() envia email agrupado
```

## Comportamento Especial

### Notas Internas
- ❌ Notificações NÃO são enviadas para notas internas (`is_internal = true`)
- Justificativa: Notas internas são visíveis apenas para admins

### Mensagens de Customers
- ⚠️ Atualmente, mensagens de customers NÃO geram notificações para admins
- Justificativa: Admins são notificados via interface em tempo real (Realtime)
- TODO: Implementar notificação para admins quando necessário

### Tratamento de Erros
- ✅ Se notificação falhar, mensagem ainda é enviada com sucesso
- ✅ Erro é logado no console mas não propaga
- Justificativa: Envio da mensagem é mais crítico que notificação

## Agrupamento de Notificações (Requirement 16.6)

O `notificationService` agrupa mensagens enviadas dentro de 5 minutos em um único email:

1. Mensagem é enfileirada via `queueNotification()`
2. `processNotificationQueue()` roda a cada 1 minuto
3. Notificações com idade >= 5 minutos são enviadas
4. Múltiplas mensagens são agrupadas em um único email

## Verificação de Usuário Online

**Método:** `notificationService.isUserOnline(userId)`

**Lógica:**
- Busca mensagens do usuário nos últimos 5 minutos
- Se encontrar mensagens recentes, usuário está online
- Threshold: 5 minutos (configurável via `ONLINE_THRESHOLD_MS`)

**Query:**
```typescript
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

const { data } = await supabase
  .from('support_messages')
  .select('created_at')
  .eq('sender_id', userId)
  .gte('created_at', fiveMinutesAgo.toISOString())
  .limit(1);

return (data && data.length > 0);
```

## Testes Executados

### Testes de Integração
```bash
npm test -- messageService.integration.test.ts --run
```
**Resultado:** ✅ 7/7 testes passaram

### Testes do NotificationService
```bash
npm test -- notificationService.test.ts --run
```
**Resultado:** ✅ 14/14 testes passaram

## Próximos Passos (Fora do Escopo desta Task)

1. **Implementar notificação para admins** quando customer envia mensagem
2. **Configurar serviço de email real** (Resend, SendGrid, etc.)
3. **Adicionar preferências de notificação** por usuário
4. **Implementar notificações push** além de email

## Arquivos Modificados

- ✏️ `src/lib/services/messageService.ts` - Adicionada integração com notificationService
- ➕ `src/lib/services/messageService.integration.test.ts` - Testes de integração
- ➕ `TASK_18.3_IMPLEMENTATION_SUMMARY.md` - Esta documentação

## Conclusão

A tarefa 18.3 foi implementada com sucesso. O sistema agora:

1. ✅ Envia notificações por email quando mensagens são enviadas
2. ✅ Verifica se destinatário está online antes de enviar
3. ✅ Agrupa mensagens em 5 minutos para evitar spam
4. ✅ Não envia notificações para notas internas
5. ✅ Trata erros graciosamente sem impactar envio de mensagens
6. ✅ Todos os testes passam

**Status:** ✅ COMPLETO
