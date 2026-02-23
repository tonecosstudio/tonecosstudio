# 🐛 Debug: Anexos não aparecem no chat do cliente

## Problema
Anexei imagem no chat do usuário e não apareceu na conversa.

## Verificações Realizadas

### ✅ CustomerMessageList.tsx
- Código correto
- Exibe anexos quando presentes em `message.attachments`
- Usa `getAttachmentUrl()` para gerar URL pública
- Mostra imagens e PDFs corretamente

### ✅ useMessages.ts
- Hook carrega anexos via `messageService.listMessages()`
- Subscription do Realtime busca anexos quando nova mensagem chega
- Subscription separada para anexos (`attachments_${conversationId}`)

### ✅ messageService.ts
- `listMessages()` busca anexos separadamente para cada mensagem
- `sendMessage()` não cria anexos (isso é feito pelo fileUploadService)

### ✅ CustomerMessageInput.tsx
- Upload funciona via `fileUploadService.uploadFile()`
- Logs adicionados para debug

## Possíveis Causas

### 1. Timing Issue
**Problema:** Anexos são inseridos DEPOIS da mensagem, mas o Realtime já disparou o evento INSERT da mensagem SEM os anexos.

**Solução:** Aguardar 500ms após upload antes de limpar o estado.

### 2. Subscription de Anexos não está funcionando
**Problema:** A subscription `attachments_${conversationId}` pode não estar ativa ou não está atualizando a mensagem correta.

**Teste:** Verificar console do navegador para logs:
```
[useMessages] Attachment added: ...
[useMessages] Adicionando anexo à mensagem: ...
```

### 3. fileUploadService não está criando registro em support_attachments
**Problema:** Upload para Storage funciona, mas registro no banco não é criado.

**Teste:** Verificar tabela `support_attachments` no Supabase.

## Como Testar

### Passo 1: Abrir Console (F12)
Verificar logs ao enviar mensagem com anexo:

```
[CustomerMessageInput] Enviando 1 anexos para mensagem <uuid>
[CustomerMessageInput] Anexo enviado com sucesso: ...
[CustomerMessageInput] Todos os anexos foram enviados
[useMessages] Attachment added: ...
[useMessages] Adicionando anexo à mensagem: <uuid>
```

### Passo 2: Verificar Banco de Dados
```sql
-- Ver mensagens recentes
SELECT id, message, created_at, sender_type
FROM support_messages
ORDER BY created_at DESC
LIMIT 5;

-- Ver anexos recentes
SELECT id, message_id, file_name, file_path, created_at
FROM support_attachments
ORDER BY created_at DESC
LIMIT 5;

-- Ver anexos de uma mensagem específica
SELECT *
FROM support_attachments
WHERE message_id = '<message_id>';
```

### Passo 3: Verificar Storage
1. Ir para Supabase Dashboard
2. Storage → support-attachments
3. Verificar se arquivo foi enviado

### Passo 4: Verificar URL Pública
```javascript
// No console do navegador
const { data } = supabase.storage
  .from('support-attachments')
  .getPublicUrl('caminho/do/arquivo.jpg');
console.log(data.publicUrl);
```

## Soluções Possíveis

### Solução 1: Forçar Reload após Upload
Adicionar no `CustomerMessageInput` após upload:

```typescript
// Após todos os uploads
window.location.reload(); // Força reload da página
```

### Solução 2: Aguardar mais tempo
Aumentar delay de 500ms para 1000ms ou 2000ms.

### Solução 3: Recarregar mensagens manualmente
Adicionar botão "Atualizar" que chama `refresh()` do hook.

### Solução 4: Verificar RLS (Row Level Security)
Verificar se políticas RLS da tabela `support_attachments` permitem SELECT para o usuário.

```sql
-- Ver políticas RLS
SELECT * FROM pg_policies 
WHERE tablename = 'support_attachments';
```

## Próximos Passos

1. **Verificar console** - Procurar logs de erro ou avisos
2. **Verificar banco** - Confirmar que anexo foi inserido
3. **Verificar storage** - Confirmar que arquivo foi enviado
4. **Testar RLS** - Verificar permissões

## Teste Rápido

Execute no console do navegador após enviar mensagem com anexo:

```javascript
// Buscar última mensagem
const { data: messages } = await supabase
  .from('support_messages')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(1);

console.log('Última mensagem:', messages[0]);

// Buscar anexos dessa mensagem
const { data: attachments } = await supabase
  .from('support_attachments')
  .select('*')
  .eq('message_id', messages[0].id);

console.log('Anexos:', attachments);
```

Se `attachments` estiver vazio, o problema é no upload.
Se `attachments` tiver dados, o problema é na exibição.
