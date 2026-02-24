# 💬 Sistema de Chat e Suporte - Ordax

Documentação completa do sistema de chat e suporte ao cliente.

---

## 📋 Visão Geral

O sistema de chat da Ordax é uma solução completa de atendimento ao cliente em tempo real, com funcionalidades profissionais comparáveis a plataformas como Zendesk e Intercom.

### Características Principais
- 💬 Chat em tempo real (WebSocket)
- 📧 Notificações por email
- 📎 Anexos de arquivos
- ⌨️ Indicador de digitação
- 🏷️ Tags e categorização
- 📝 Notas internas
- 🚨 Flags de risco
- 📊 Métricas de atendimento
- 🤖 Respostas rápidas
- 📅 Lembretes agendados

---

## 🏗️ Arquitetura

### Componentes Principais

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ ChatButton   │  │CustomerChat  │  │ContactForm   │  │
│  │ (Flutuante)  │  │  (Modal)     │  │ (Público)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
└─────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │
          │         Supabase Realtime           │
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼──────────┐
│         │                  │                  │          │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  │
│  │ConversationList│ │ChatInterface│  │CustomerSidebar│ │
│  │              │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                    ADMIN                                 │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

```
1. Cliente envia mensagem
   ↓
2. Optimistic update (UI instantânea)
   ↓
3. Upload para Supabase
   ↓
4. Broadcast via Realtime
   ↓
5. Admin recebe em tempo real
   ↓
6. Se cliente offline → Email notification
```

---

## 📊 Banco de Dados

### Tabelas Principais

#### support_conversations
```sql
- id (uuid)
- user_id (uuid) → profiles
- subject (text)
- status (enum: open, in_progress, resolved, closed)
- priority (enum: low, normal, high, urgent)
- tags (text[])
- risk_flags (text[])
- promised_date (timestamp)
- last_message_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

#### support_messages
```sql
- id (uuid)
- conversation_id (uuid) → support_conversations
- sender_id (uuid) → profiles
- content (text)
- is_internal_note (boolean)
- is_deleted (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

#### support_attachments
```sql
- id (uuid)
- message_id (uuid) → support_messages
- file_name (text)
- file_path (text)
- file_size (integer)
- mime_type (text)
- thumbnail_path (text)
- created_at (timestamp)
```

#### quick_replies
```sql
- id (uuid)
- title (text)
- content (text)
- category (text)
- is_active (boolean)
- created_at (timestamp)
```

#### order_status_templates
```sql
- id (uuid)
- status (text)
- title (text)
- message_template (text)
- is_active (boolean)
- created_at (timestamp)
```

---

## 🎨 Interface do Cliente

### ChatButton (Botão Flutuante)

Botão flutuante no canto inferior direito de todas as páginas.

**Localização**: `src/components/customer/ChatButton.tsx`

**Funcionalidades**:
- Badge com contador de mensagens não lidas
- Abre modal de chat ao clicar
- Indicador de digitação do admin
- Animação de entrada/saída

**Uso**:
```tsx
import { ChatButton } from '@/components/customer/ChatButton';

function App() {
  return (
    <>
      {/* Seu conteúdo */}
      <ChatButton />
    </>
  );
}
```

### CustomerChat (Modal de Chat)

Modal completo de chat com todas as funcionalidades.

**Localização**: `src/components/customer/CustomerChat.tsx`

**Funcionalidades**:
- Lista de mensagens em tempo real
- Input com suporte a anexos
- Preview de imagens
- Indicador de digitação
- Scroll automático
- Optimistic updates

### ContactForm (Formulário Público)

Formulário para usuários não autenticados iniciarem conversa.

**Localização**: `src/pages/Contact.tsx`

**Funcionalidades**:
- Campos: nome, email, assunto, mensagem
- Validação com Zod
- Criação automática de conversa
- Email de confirmação

---

## 🛠️ Interface Admin

### AdminSupport (Página Principal)

Dashboard completo de atendimento.

**Localização**: `src/pages/admin/AdminSupport.tsx`

**URL**: `/admin/suporte`

**Funcionalidades**:
- Lista de conversas com filtros
- Métricas em tempo real
- Busca por cliente/assunto
- Filtros por status/prioridade/tags

### ConversationList (Lista de Conversas)

Lista lateral com todas as conversas.

**Localização**: `src/components/admin/ConversationList.tsx`

**Funcionalidades**:
- Ordenação por última mensagem
- Badge de mensagens não lidas
- Indicador de status
- Preview da última mensagem
- Filtros e busca

### ChatInterface (Interface de Chat)

Interface principal de chat para admin.

**Localização**: `src/components/admin/ChatInterface.tsx`

**Funcionalidades**:
- Mensagens em tempo real
- Notas internas (visíveis só para admins)
- Quick replies
- Upload de anexos
- Indicador de digitação
- Marcar como lido/não lido

### CustomerSidebar (Dados do Cliente)

Sidebar com informações do cliente.

**Localização**: `src/components/admin/CustomerSidebar.tsx`

**Funcionalidades**:
- Dados pessoais
- Histórico de pedidos
- Assinaturas ativas
- Tags e flags
- Promised date
- Estágios de produção

---

## ⚡ Funcionalidades em Tempo Real

### Mensagens Instantâneas

Implementado com Supabase Realtime (WebSocket).

**Hook**: `src/hooks/useMessages.ts`

```typescript
// Exemplo de uso
const { messages, sendMessage, isLoading } = useMessages(conversationId);

// Enviar mensagem
await sendMessage({
  content: 'Olá!',
  attachments: [file1, file2]
});
```

**Características**:
- Optimistic updates (UI instantânea)
- Sincronização automática
- Retry em caso de erro
- Progress tracking para uploads

### Indicador de Digitação

Mostra quando o outro usuário está digitando.

**Hook**: `src/hooks/useTypingIndicator.ts`

```typescript
// Exemplo de uso
const { isTyping, startTyping, stopTyping } = useTypingIndicator(conversationId);

// Ao digitar
<input onChange={() => startTyping()} />

// Exibir indicador
{isTyping && <TypingIndicator users={typingUsers} />}
```

**Características**:
- Debounce de 300ms
- Auto-timeout de 3 segundos
- Multi-user support
- Bidirecionalmente (cliente ↔ admin)

### Notificações por Email

Envia email quando cliente está offline.

**Edge Function**: `supabase/functions/send-email/index.ts`

**Características**:
- Verifica se usuário está online (5 min)
- Template HTML responsivo
- Dark mode support
- Retry com exponential backoff
- Suporte a Resend e SendGrid

**Configuração**:
```env
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_xxx
EMAIL_FROM=suporte@ordax.com.br
EMAIL_FROM_NAME=Ordax Suporte
BASE_URL=https://ordax.com.br
```

---

## 📎 Sistema de Anexos

### Upload de Arquivos

Suporte a múltiplos tipos de arquivo.

**Serviço**: `src/lib/file-upload-service.ts`

**Tipos Suportados**:
- Imagens: JPG, PNG, GIF, WebP
- Documentos: PDF, DOC, DOCX
- Outros: ZIP, TXT

**Limites**:
- Tamanho máximo: 10 MB por arquivo
- Máximo de arquivos: 5 por mensagem

**Funcionalidades**:
- Compressão automática de imagens
- Geração de thumbnails
- Progress tracking
- Preview instantâneo
- Optimistic updates

### Storage

Arquivos armazenados no Supabase Storage.

**Bucket**: `support-attachments`

**Estrutura**:
```
support-attachments/
├── {conversation_id}/
│   ├── {message_id}/
│   │   ├── original/
│   │   │   └── {filename}
│   │   └── thumbnails/
│   │       └── {filename}_thumb.jpg
```

**Políticas RLS**:
- Usuários veem apenas seus anexos
- Admins veem todos os anexos

---

## 🏷️ Tags e Categorização

### Tags

Tags para categorizar conversas.

**Tipos Comuns**:
- `duvida` - Dúvida geral
- `pedido` - Relacionado a pedido
- `pagamento` - Questão de pagamento
- `producao` - Status de produção
- `reclamacao` - Reclamação
- `elogio` - Elogio

**Uso**:
```typescript
// Adicionar tag
await conversationService.addTag(conversationId, 'duvida');

// Remover tag
await conversationService.removeTag(conversationId, 'duvida');

// Filtrar por tag
const conversations = await conversationService.getByTag('pedido');
```

### Flags de Risco

Flags para identificar situações de risco.

**Tipos**:
- `cliente_insatisfeito` - Cliente demonstrou insatisfação
- `atraso_producao` - Produção atrasada
- `problema_pagamento` - Problema com pagamento
- `cancelamento_risco` - Risco de cancelamento

**Uso**:
```typescript
// Adicionar flag
await conversationService.addRiskFlag(conversationId, 'cliente_insatisfeito');

// Remover flag
await conversationService.removeRiskFlag(conversationId, 'cliente_insatisfeito');
```

---

## 📝 Notas Internas

Notas visíveis apenas para admins.

**Uso**:
```typescript
// Criar nota interna
await messageService.create({
  conversation_id: conversationId,
  content: 'Cliente mencionou interesse em coleção X',
  is_internal_note: true
});
```

**Características**:
- Não visíveis para clientes
- Destacadas visualmente na interface admin
- Podem ser editadas (5 minutos)
- Não geram notificações para cliente

---

## 🤖 Respostas Rápidas

Templates de mensagens pré-definidas.

**Localização**: `src/pages/admin/AdminQuickReplies.tsx`

**Uso**:
1. Admin clica em "Quick Replies"
2. Seleciona template
3. Mensagem é inserida no input
4. Admin pode editar antes de enviar

**Exemplos**:
```
Título: Boas-vindas
Conteúdo: Olá! Obrigado por entrar em contato. Como posso ajudar?

Título: Status do Pedido
Conteúdo: Seu pedido está em produção. Previsão de entrega: [DATA]

Título: Problema Resolvido
Conteúdo: Ótimo! Fico feliz que conseguimos resolver. Algo mais?
```

---

## 📅 Promised Date

Data prometida para resolução/entrega.

**Uso**:
```typescript
// Definir promised date
await conversationService.setPromisedDate(conversationId, new Date('2026-03-01'));

// Remover promised date
await conversationService.setPromisedDate(conversationId, null);
```

**Funcionalidades**:
- Countdown na lista de conversas
- Destaque visual quando atrasada
- Alert ao abrir conversa vencida
- Filtro por promessas atrasadas

---

## 📊 Métricas e Analytics

### Métricas em Tempo Real

**Localização**: `src/components/admin/DashboardMetrics.tsx`

**Métricas Disponíveis**:
- Total de conversas abertas
- Tempo médio de resposta
- Taxa de resolução
- Conversas por status
- Conversas por prioridade
- Conversas com promessa atrasada

### Relatórios

**Localização**: `src/pages/admin/AdminAnalytics.tsx`

**Relatórios Disponíveis**:
- Conversas por período
- Performance de atendimento
- Satisfação do cliente
- Tags mais usadas
- Tempo de resolução

---

## 🧪 Testes

### Testes Automatizados

**Localização**: `src/test/`

**Cobertura**:
- Services: ~85%
- Components: ~70%
- Hooks: ~80%

**Executar**:
```bash
npm test
```

### Testes Manuais

**Checklist Básico**:

1. **Cliente envia mensagem**
   - [ ] Mensagem aparece instantaneamente
   - [ ] Admin recebe em tempo real
   - [ ] Contador de não lidas atualiza

2. **Admin responde**
   - [ ] Cliente recebe em tempo real
   - [ ] Se offline, recebe email
   - [ ] Indicador de digitação funciona

3. **Upload de anexo**
   - [ ] Progress bar aparece
   - [ ] Preview instantâneo
   - [ ] Arquivo persiste após refresh

4. **Notas internas**
   - [ ] Visível apenas para admin
   - [ ] Destacada visualmente
   - [ ] Não notifica cliente

---

## 🔧 Troubleshooting

### Mensagens não aparecem em tempo real

**Possíveis causas**:
1. Realtime desconectado
2. RLS bloqueando acesso
3. Cache do navegador

**Solução**:
```typescript
// Verificar conexão Realtime
const channel = supabase.channel('test');
console.log(channel.state); // Deve ser 'joined'

// Verificar RLS
// SQL Editor: SELECT * FROM support_messages WHERE conversation_id = 'xxx';

// Limpar cache
localStorage.clear();
location.reload();
```

### Email não chega

**Possíveis causas**:
1. Secrets não configurados
2. Domínio não verificado
3. Email na pasta spam

**Solução**:
```bash
# Verificar logs
npx supabase functions logs send-email --tail

# Verificar secrets
# Supabase Dashboard > Edge Functions > send-email > Secrets

# Verificar domínio
# Resend Dashboard > Domains
```

### Anexos não fazem upload

**Possíveis causas**:
1. Arquivo muito grande (> 10 MB)
2. Tipo de arquivo não suportado
3. Permissões do bucket

**Solução**:
```typescript
// Verificar tamanho
console.log(file.size / 1024 / 1024, 'MB');

// Verificar tipo
console.log(file.type);

// Verificar permissões
// Supabase Dashboard > Storage > support-attachments > Policies
```

---

## 📚 Referências

### Código-Fonte

**Serviços**:
- `src/lib/conversation-service.ts`
- `src/lib/message-service.ts`
- `src/lib/file-upload-service.ts`
- `src/lib/notification-service.ts`

**Hooks**:
- `src/hooks/useMessages.ts`
- `src/hooks/useConversations.ts`
- `src/hooks/useTypingIndicator.ts`

**Componentes Cliente**:
- `src/components/customer/ChatButton.tsx`
- `src/components/customer/CustomerChat.tsx`
- `src/components/customer/CustomerMessageInput.tsx`
- `src/components/customer/CustomerMessageList.tsx`

**Componentes Admin**:
- `src/pages/admin/AdminSupport.tsx`
- `src/components/admin/ConversationList.tsx`
- `src/components/admin/ChatInterface.tsx`
- `src/components/admin/CustomerSidebar.tsx`

### Migrations

- `20260202000001_create_support_system.sql` - Tabelas principais
- `20260221000004_update_support_conversations.sql` - Campos adicionais
- `20260221000005_update_support_messages.sql` - Soft delete
- `20260221000006_create_support_attachments.sql` - Sistema de anexos
- `20260222120000_create_email_notifications.sql` - Notificações

### Edge Functions

- `supabase/functions/send-email/` - Envio de emails
- `supabase/functions/auto-sync-groups/` - Sincronização de grupos

---

## 🎯 Roadmap

### Curto Prazo (1 mês)
- [ ] Message grouping (agrupar mensagens em 5 min)
- [ ] Email preferences por usuário
- [ ] Image compression para anexos
- [ ] Read receipts

### Médio Prazo (3 meses)
- [ ] Push notifications (web push)
- [ ] Voice messages
- [ ] Video calls
- [ ] Chatbot com IA

### Longo Prazo (6+ meses)
- [ ] Mobile app
- [ ] WhatsApp integration
- [ ] Instagram DM integration
- [ ] Analytics avançado

---

**Última atualização**: 2026-02-24  
**Versão**: 1.0.0  
**Status**: ✅ Produção
