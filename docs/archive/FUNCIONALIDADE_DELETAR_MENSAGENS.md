# Funcionalidade: Deletar Mensagens

## Implementação Completa

### 1. Migration - Soft Delete
**Arquivo**: `supabase/migrations/20260222000004_add_message_delete.sql`

Adicionados campos:
- `deleted_at` (TIMESTAMPTZ) - Timestamp da deleção
- `deleted_by` (UUID) - ID do usuário que deletou
- Índice para performance

✅ Migration aplicada com sucesso

### 2. Service - messageService
**Arquivo**: `src/lib/services/messageService.ts`

Nova função `deleteMessage()`:
- Verifica autenticação
- Verifica se usuário é admin
- Faz soft delete (atualiza `deleted_at` e `deleted_by`)
- Apenas admins podem deletar

### 3. Tipos
**Arquivo**: `src/types/support.ts`

Interface `Message` atualizada com:
- `deleted_at?: string`
- `deleted_by?: string`

### 4. UI - ChatInterface
**Arquivo**: `src/components/admin/ChatInterface.tsx`

Implementado:
- Botão de deletar (ícone lixeira) que aparece ao passar mouse
- Confirmação antes de deletar
- Mensagens deletadas aparecem como "Mensagem deletada" (estilo diferenciado)
- Botão apenas visível para mensagens de admin
- Toast de sucesso/erro

### 5. Realtime
**Arquivo**: `src/hooks/useMessages.ts`

- Mensagens deletadas são mantidas na lista
- UPDATE via Realtime atualiza a mensagem para mostrar como deletada
- Não são filtradas, apenas exibidas diferente

## Como Funciona

### Para Admin:
1. Passa o mouse sobre uma mensagem (própria ou do cliente)
2. Aparece botão de lixeira no canto superior direito
3. Clica no botão
4. Confirma a deleção
5. Mensagem é marcada como deletada
6. Aparece como "Mensagem deletada" (cinza, tracejado)

### Para Cliente:
- Não vê botão de deletar
- Vê mensagens deletadas como "Mensagem deletada"

## Características

✅ Soft delete (dados não são perdidos)
✅ Apenas admins podem deletar
✅ Confirmação antes de deletar
✅ Atualização em tempo real via Realtime
✅ Visual diferenciado para mensagens deletadas
✅ Mantém histórico (timestamp original)
✅ Rastreabilidade (quem deletou)

## Teste Agora

1. **Como Admin**:
   - Abra uma conversa
   - Envie uma mensagem
   - Passe o mouse sobre a mensagem
   - Clique no ícone de lixeira
   - Confirme
   - ✅ Mensagem deve aparecer como "Mensagem deletada"

2. **Verificar Realtime**:
   - Abra a mesma conversa em outra aba
   - Delete uma mensagem em uma aba
   - ✅ Deve atualizar automaticamente na outra aba

3. **Verificar Permissões**:
   - Como cliente, não deve ver botão de deletar
   - Apenas admins podem deletar

## Arquivos Modificados

1. `supabase/migrations/20260222000004_add_message_delete.sql` (novo)
2. `src/lib/services/messageService.ts` (função deleteMessage)
3. `src/types/support.ts` (campos deleted_at e deleted_by)
4. `src/components/admin/ChatInterface.tsx` (UI e botão)
5. `src/hooks/useMessages.ts` (comentário sobre não filtrar)

## Próximos Passos (Opcional)

Se quiser adicionar mais funcionalidades:

1. **Restaurar mensagem deletada**
   - Adicionar botão "Desfazer" para admins
   - Limpar `deleted_at` e `deleted_by`

2. **Deletar permanentemente**
   - Adicionar opção de hard delete após X dias
   - Criar job para limpar mensagens antigas

3. **Log de auditoria**
   - Registrar todas as deleções em tabela separada
   - Dashboard de mensagens deletadas

4. **Deletar anexos junto**
   - Ao deletar mensagem, deletar anexos do Storage
   - Liberar espaço automaticamente
