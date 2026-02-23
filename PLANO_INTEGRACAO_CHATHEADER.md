# Plano de Implementação: Integração Completa do ChatHeader

## 📋 Visão Geral

Este documento detalha o plano completo para integrar todas as funcionalidades pendentes no componente `ChatHeader`, conforme especificado na **Task 12.2** do arquivo `tasks.md`.

## 🎯 Objetivo

Completar a implementação do `ChatHeader` com todas as funcionalidades especificadas:
1. ✅ Exibir nome do usuário e email (já implementado)
2. ❌ Exibir e permitir editar status da conversa
3. ❌ Exibir e permitir editar tags (múltiplas tags)
4. ❌ Adicionar botão para toggle CustomerSidebar
5. ❌ Adicionar campo "Promessa feita" (date picker) - componente criado, precisa integrar
6. ❌ Exibir flags de risco se existirem - componente criado, precisa integrar

## 📦 Componentes Já Criados

### 1. PromisedDatePicker
- **Localização**: `src/components/admin/PromisedDatePicker.tsx`
- **Status**: ✅ Criado, aguardando integração
- **Funcionalidades**:
  - Date picker com validação (apenas datas futuras)
  - Countdown visual (dias restantes)
  - Alert visual quando atrasado
  - Botão para remover data prometida
  - Integração com conversationService

### 2. RiskFlagManager
- **Localização**: `src/components/admin/RiskFlagManager.tsx`
- **Status**: ✅ Criado, aguardando integração
- **Funcionalidades**:
  - Dropdown com flags disponíveis
  - Multi-seleção de flags
  - Badges visuais para flags ativas
  - Integração com conversationService

## 🔧 Componentes a Criar

### 3. ConversationStatusSelector
- **Funcionalidade**: Dropdown para alterar status da conversa
- **Estados disponíveis**: new, waiting_admin, waiting_customer, resolved, closed
- **Comportamento**: 
  - Exibir status atual com cor correspondente
  - Permitir mudança de status
  - Atualizar via conversationService.updateStatus()

### 4. ConversationTagsSelector
- **Funcionalidade**: Multi-select para tags da conversa
- **Tags disponíveis**: pedido, orcamento, duvida, reclamacao, assinatura, urgente
- **Comportamento**:
  - Exibir tags atuais como badges coloridos
  - Permitir adicionar/remover múltiplas tags
  - Atualizar via conversationService.updateTags()

## 📝 Implementação Detalhada

### ETAPA 1: Adicionar método updatePromisedDate ao conversationService

**Arquivo**: `src/lib/services/conversationService.ts`

**Localização**: Após o método `updateRiskFlags` (linha ~220)

```typescript
/**
 * Atualiza a data prometida de uma conversa
 */
async updatePromisedDate(id: string, promised_date: string | null): Promise<Conversation> {
  const { data, error } = await supabase
    .from("support_conversations")
    .update({ promised_date })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar data prometida:", error);
    throw new Error("Erro ao atualizar data prometida");
  }

  return {
    ...data,
    user_email: "carregando...",
    user_name: "Usuário",
    risk_flags: data.risk_flags || [],
    tags: data.tags || [],
  };
}
```

**Validação**: Verificar se o método já existe antes de adicionar.

---

### ETAPA 2: Criar ConversationStatusSelector

**Arquivo**: `src/components/admin/ConversationStatusSelector.tsx`

```typescript
/**
 * ConversationStatusSelector - Seletor de status da conversa
 * Requirement 12.2: Exibir e permitir editar status da conversa
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { conversationService } from "@/lib/services/conversationService";
import type { ConversationStatus } from "@/types/support";
import { getStatusLabel, CONVERSATION_STATUSES } from "@/types/support";

interface ConversationStatusSelectorProps {
  conversationId: string;
  currentStatus: ConversationStatus;
  onUpdate?: (status: ConversationStatus) => void;
}

const STATUS_COLORS: Record<ConversationStatus, string> = {
  new: "bg-blue-500",
  waiting_admin: "bg-yellow-500",
  waiting_customer: "bg-orange-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
};

export function ConversationStatusSelector({
  conversationId,
  currentStatus,
  onUpdate,
}: ConversationStatusSelectorProps) {
  const [status, setStatus] = useState<ConversationStatus>(currentStatus);
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusChange = async (newStatus: ConversationStatus) => {
    if (newStatus === status) return;

    try {
      await conversationService.updateStatus(conversationId, newStatus);
      setStatus(newStatus);
      setIsOpen(false);
      onUpdate?.(newStatus);
      toast.success(`Status atualizado para: ${getStatusLabel(newStatus)}`);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
          {getStatusLabel(status)}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuRadioGroup value={status} onValueChange={(value) => handleStatusChange(value as ConversationStatus)}>
          {CONVERSATION_STATUSES.map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]}`} />
                {getStatusLabel(s)}
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

### ETAPA 3: Criar ConversationTagsSelector

**Arquivo**: `src/components/admin/ConversationTagsSelector.tsx`

```typescript
/**
 * ConversationTagsSelector - Seletor de tags da conversa
 * Requirement 12.2: Exibir e permitir editar tags (múltiplas tags)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tag } from "lucide-react";
import { toast } from "sonner";
import { conversationService } from "@/lib/services/conversationService";
import type { ConversationTag } from "@/types/support";
import { getTagLabel, CONVERSATION_TAGS } from "@/types/support";

interface ConversationTagsSelectorProps {
  conversationId: string;
  currentTags: ConversationTag[];
  onUpdate?: (tags: ConversationTag[]) => void;
}

const TAG_COLORS: Record<ConversationTag, string> = {
  pedido: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  orcamento: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  duvida: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  reclamacao: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  assinatura: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  urgente: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export function ConversationTagsSelector({
  conversationId,
  currentTags,
  onUpdate,
}: ConversationTagsSelectorProps) {
  const [tags, setTags] = useState<ConversationTag[]>(currentTags);
  const [isOpen, setIsOpen] = useState(false);

  const toggleTag = async (tag: ConversationTag) => {
    const newTags = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];

    try {
      await conversationService.updateTags(conversationId, newTags);
      setTags(newTags);
      onUpdate?.(newTags);
      toast.success(
        tags.includes(tag)
          ? `Tag "${getTagLabel(tag)}" removida`
          : `Tag "${getTagLabel(tag)}" adicionada`
      );
    } catch (error) {
      console.error("Erro ao atualizar tags:", error);
      toast.error("Erro ao atualizar tags");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Tag className="h-4 w-4" />
            Tags
            {tags.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {tags.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {CONVERSATION_TAGS.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag}
              checked={tags.includes(tag)}
              onCheckedChange={() => toggleTag(tag)}
            >
              {getTagLabel(tag)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag} className={TAG_COLORS[tag]}>
              {getTagLabel(tag)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### ETAPA 4: Atualizar ChatHeader.tsx

**Arquivo**: `src/components/admin/ChatHeader.tsx`

**Mudanças necessárias**:

1. **Adicionar imports**:
```typescript
import { PromisedDatePicker } from "./PromisedDatePicker";
import { RiskFlagManager } from "./RiskFlagManager";
import { ConversationStatusSelector } from "./ConversationStatusSelector";
import { ConversationTagsSelector } from "./ConversationTagsSelector";
import { PanelRightOpen } from "lucide-react";
import type { Conversation, ConversationStatus, ConversationTag, RiskFlag } from "@/types/support";
```

2. **Atualizar interface ChatHeaderProps**:
```typescript
interface ChatHeaderProps {
  conversationId: string;
  conversation?: Conversation; // Passar objeto completo
  onUserClick?: (userId: string) => void;
  onReminderCreated?: (reminder: ConversationReminder) => void;
  onConversationUpdate?: () => void; // Callback para recarregar conversa
  onToggleSidebar?: () => void; // Toggle do CustomerSidebar
}
```

3. **Atualizar componente**:
```typescript
export function ChatHeader({
  conversationId,
  conversation,
  onUserClick,
  onReminderCreated,
  onConversationUpdate,
  onToggleSidebar,
}: ChatHeaderProps) {
  const [reminderModalOpen, setReminderModalOpen] = useState(false);

  const handleUserClick = () => {
    if (conversation?.user_id && onUserClick) {
      onUserClick(conversation.user_id);
    }
  };

  const handleUpdate = () => {
    onConversationUpdate?.();
  };

  return (
    <>
      <div className="border-b bg-background">
        {/* Linha 1: Informações do usuário */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 
                className={`text-lg font-semibold ${
                  conversation?.user_id && onUserClick ? 'cursor-pointer hover:text-primary transition-colors' : ''
                }`}
                onClick={handleUserClick}
                title={conversation?.user_id && onUserClick ? 'Clique para ver dados do cliente' : undefined}
              >
                {conversation?.user_name || conversation?.user_email || "Conversa"}
              </h2>
              {conversation?.user_id && onUserClick && (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {conversation?.subject && (
              <p className="text-sm text-muted-foreground">{conversation.subject}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReminderModalOpen(true)}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Agendar Lembrete
            </Button>

            {onToggleSidebar && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleSidebar}
                title="Abrir dados do cliente"
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Linha 2: Controles da conversa */}
        <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
          {conversation && (
            <>
              <ConversationStatusSelector
                conversationId={conversationId}
                currentStatus={conversation.status}
                onUpdate={handleUpdate}
              />

              <ConversationTagsSelector
                conversationId={conversationId}
                currentTags={conversation.tags}
                onUpdate={handleUpdate}
              />

              <PromisedDatePicker
                conversationId={conversationId}
                promisedDate={conversation.promised_date}
                onUpdate={handleUpdate}
              />

              <RiskFlagManager
                conversationId={conversationId}
                riskFlags={conversation.risk_flags}
                onUpdate={handleUpdate}
              />
            </>
          )}
        </div>
      </div>

      <ReminderScheduler
        conversationId={conversationId}
        open={reminderModalOpen}
        onOpenChange={setReminderModalOpen}
        onReminderCreated={onReminderCreated}
      />
    </>
  );
}
```

---

### ETAPA 5: Atualizar ChatInterface.tsx

**Arquivo**: `src/components/admin/ChatInterface.tsx`

**Mudanças necessárias**:

1. **Adicionar estado para controlar sidebar**:
```typescript
const [sidebarOpen, setSidebarOpen] = useState(false);
```

2. **Adicionar função para recarregar conversa**:
```typescript
const reloadConversation = async () => {
  try {
    const conv = await conversationService.getConversation(conversationId);
    setConversation(conv);
  } catch (error) {
    console.error("Erro ao recarregar conversa:", error);
  }
};
```

3. **Atualizar chamada do ChatHeader**:
```typescript
<ChatHeader
  conversationId={conversationId}
  conversation={conversation}
  onUserClick={onOpenUserSidebar}
  onConversationUpdate={reloadConversation}
  onToggleSidebar={() => {
    if (conversation?.user_id && onOpenUserSidebar) {
      onOpenUserSidebar(conversation.user_id);
    }
  }}
/>
```

---

### ETAPA 6: Atualizar ConversationList para exibir indicadores

**Arquivo**: `src/components/admin/ConversationList.tsx`

**Adicionar indicadores visuais**:

1. **Countdown de data prometida** (se existir e estiver próxima)
2. **Badge de flags de risco** (se existirem)
3. **Tags coloridas** (já existe, verificar se está funcionando)

**Exemplo de adição no ConversationCard**:

```typescript
{/* Indicadores de promessa e risco */}
<div className="flex items-center gap-2 mt-1">
  {conversation.promised_date && (
    <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-xs">
      {isOverdue ? `${daysOverdue}d atraso` : `${daysUntil}d restantes`}
    </Badge>
  )}
  
  {conversation.risk_flags && conversation.risk_flags.length > 0 && (
    <Badge variant="destructive" className="text-xs">
      <AlertTriangle className="h-3 w-3 mr-1" />
      {conversation.risk_flags.length} alerta(s)
    </Badge>
  )}
</div>
```

---

## 🧪 Testes Necessários

### Testes Manuais

1. **Status da Conversa**:
   - [ ] Alterar status e verificar atualização no banco
   - [ ] Verificar que status aparece corretamente na lista
   - [ ] Testar todos os 5 status disponíveis

2. **Tags**:
   - [ ] Adicionar múltiplas tags
   - [ ] Remover tags
   - [ ] Verificar cores das tags
   - [ ] Verificar filtro por tags na lista

3. **Data Prometida**:
   - [ ] Adicionar data futura
   - [ ] Verificar countdown
   - [ ] Testar data passada (deve mostrar atraso)
   - [ ] Remover data prometida

4. **Flags de Risco**:
   - [ ] Adicionar múltiplas flags
   - [ ] Remover flags
   - [ ] Verificar indicadores na lista
   - [ ] Verificar filtro por flags

5. **Toggle Sidebar**:
   - [ ] Botão abre/fecha sidebar
   - [ ] Clique no nome do usuário abre sidebar

### Testes Automatizados (Opcional)

Criar testes para:
- `ConversationStatusSelector.test.tsx`
- `ConversationTagsSelector.test.tsx`
- `ChatHeader.test.tsx` (atualizar)

---

## 📊 Checklist de Implementação

### Preparação
- [ ] Ler este documento completamente
- [ ] Verificar que o servidor de desenvolvimento está rodando
- [ ] Fazer backup dos arquivos que serão modificados

### Implementação
- [ ] **ETAPA 1**: Adicionar `updatePromisedDate` ao conversationService
- [ ] **ETAPA 2**: Criar `ConversationStatusSelector.tsx`
- [ ] **ETAPA 3**: Criar `ConversationTagsSelector.tsx`
- [ ] **ETAPA 4**: Atualizar `ChatHeader.tsx`
- [ ] **ETAPA 5**: Atualizar `ChatInterface.tsx`
- [ ] **ETAPA 6**: Atualizar `ConversationList.tsx` (opcional mas recomendado)

### Validação
- [ ] Compilar sem erros TypeScript
- [ ] Testar cada funcionalidade manualmente
- [ ] Verificar responsividade mobile
- [ ] Testar com dados reais
- [ ] Verificar performance (sem lentidão)

### Finalização
- [ ] Atualizar `IMPLEMENTACAO_COMPLETA_CHAT.md` marcando itens como concluídos
- [ ] Atualizar `tasks.md` se necessário
- [ ] Documentar quaisquer problemas encontrados
- [ ] Criar commit com mensagem descritiva

---

## 🚨 Problemas Conhecidos

### 1. Erros de Tipo TypeScript

**Problema**: O arquivo `conversationService.ts` mostra erros de tipo porque os tipos do Supabase não incluem `risk_flags`, `tags`, e `promised_date`.

**Solução Temporária**: Os erros não impedem a execução. O código funciona em runtime.

**Solução Definitiva**: Regenerar tipos do Supabase após confirmar que as migrations foram aplicadas:
```bash
npx supabase gen types typescript --project-id [PROJECT_ID] > src/integrations/supabase/types.ts
```

### 2. Dados de Usuário "carregando..."

**Problema**: Os métodos do conversationService retornam `user_email: "carregando..."` e `user_name: "Usuário"` como placeholders.

**Solução Futura**: Implementar join com tabela `profiles` ou buscar dados do usuário separadamente.

---

## 📚 Referências

- **Spec**: `.kiro/specs/advanced-chat-support-system/`
- **Task 12.2**: `.kiro/specs/advanced-chat-support-system/tasks.md` (linha ~270)
- **Requirements**: Requirements 1.3, 12.1, 12.2, 13.1, 24.2, 24.3
- **Componentes Existentes**:
  - `PromisedDatePicker.tsx`
  - `RiskFlagManager.tsx`
  - `ReminderScheduler.tsx`

---

## 💡 Próximos Passos Após Esta Implementação

Após completar esta integração, as próximas prioridades são:

1. **Infinite Scroll para Mensagens** (Task 12.3)
2. **Busca Avançada** (Task 27)
3. **Formulário de Contato Público** (Task 17)
4. **Edição de Mensagens** (Task 21.2)

---

## ✅ Critérios de Sucesso

Esta implementação será considerada completa quando:

1. ✅ Todos os 6 itens da Task 12.2 estiverem funcionando
2. ✅ Não houver erros de compilação TypeScript (exceto os conhecidos do Supabase)
3. ✅ Todos os testes manuais passarem
4. ✅ A interface estiver responsiva e sem bugs visuais
5. ✅ As atualizações refletirem em tempo real na lista de conversas

---

**Documento criado em**: 21/02/2026  
**Versão**: 1.0  
**Autor**: Kiro AI Assistant
