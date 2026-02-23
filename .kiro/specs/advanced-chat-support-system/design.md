# Design Document - Sistema de Chat Centralizado (MVP)

## Overview

Este documento descreve o design técnico do Sistema de Chat e Suporte Centralizado da plataforma Ordax. O sistema substituirá a implementação básica atual (`AdminSupport.tsx`) por uma solução robusta, pragmática e focada em resolver problemas reais de atendimento ao cliente.

### Objetivos do Design

1. **Centralização**: Unificar todas as conversas de suporte em uma interface única
2. **Automação**: Reduzir carga manual através de notificações automáticas de status de pedidos
3. **Integração**: Conectar com sistemas existentes (pedidos, orçamentos, assinaturas, pagamentos)
4. **Real-time**: Proporcionar experiência fluida com atualizações instantâneas via Supabase Realtime
5. **Simplicidade**: Manter arquitetura simples e manutenível para equipe pequena (1-2 atendentes)

### Princípios de Design

- **Aproveitar infraestrutura existente**: Usar Supabase Realtime, tabelas existentes, componentes shadcn/ui
- **Modularidade**: Componentes React reutilizáveis e serviços desacoplados
- **Pragmatismo**: Resolver problemas reais de hoje, não problemas hipotéticos de amanhã
- **Performance adequada**: Otimizado para 200 conversas/mês, não para 10k usuários simultâneos

### Escopo do MVP

**Incluído:**
- Interface de chat em tempo real para admins e clientes
- Automação de notificações de status de pedidos (PRIORIDADE MÁXIMA)
- Visualização de contexto do cliente (pedidos, orçamentos, assinaturas, pagamentos)
- Notas internas, tags, status de conversas
- Respostas rápidas configuráveis
- Anexos básicos (imagens e PDFs)
- Notificações por email
- Dashboard simples com métricas básicas

**Não incluído no MVP:**
- Atribuição de conversas entre múltiplos atendentes
- Mensagens em massa
- Agendamento de mensagens
- Modo offline
- Indicadores de digitação
- Busca avançada dentro do conteúdo das mensagens


## Architecture

### High-Level Architecture

O sistema segue uma arquitetura em camadas típica de aplicações React modernas:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │  Admin Pages     │              │  Customer Pages  │    │
│  │  - AdminSupportV2│              │  - CustomerChat  │    │
│  └──────────────────┘              └──────────────────┘    │
│           │                                  │               │
│  ┌────────▼──────────────────────────────────▼─────────┐   │
│  │           React Components Layer                     │   │
│  │  - ConversationList  - ChatInterface                 │   │
│  │  - MessageBubble     - CustomerSidebar               │   │
│  │  - QuickReplies      - AttachmentUpload              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     Business Logic Layer                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Custom Hooks (State + Realtime)          │  │
│  │  - useConversations  - useMessages                    │  │
│  │  - useOrderStatus    - useQuickReplies                │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Service Layer                       │  │
│  │  - conversationService  - messageService              │  │
│  │  - orderStatusService   - fileUploadService           │  │
│  │  - notificationService  - integrationService          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Supabase Client                          │  │
│  │  - PostgreSQL Database                                │  │
│  │  - Realtime Subscriptions                             │  │
│  │  - Storage (Attachments)                              │  │
│  │  - Auth                                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### Admin Interface

```
AdminSupportV2
├── ConversationList (30% width)
│   ├── SearchBar
│   ├── StatusFilter
│   ├── ConversationCard[]
│   └── Pagination
│
└── ChatArea (70% width)
    ├── ChatHeader
    │   ├── UserInfo
    │   ├── ConversationStatus
    │   └── ConversationTags
    │
    ├── CustomerSidebar (collapsible)
    │   ├── OrdersList
    │   ├── QuotesList
    │   ├── SubscriptionInfo
    │   └── PaymentInfo
    │
    ├── MessageList
    │   ├── DateSeparator[]
    │   ├── MessageBubble[]
    │   ├── InternalNote[]
    │   └── SystemMessage[]
    │
    └── MessageInput
        ├── TextArea
        ├── AttachmentButton
        ├── InternalNoteToggle
        ├── QuickRepliesButton
        └── SendButton
```

#### Customer Interface

```
CustomerChat (Modal or Side Panel)
├── ChatHeader
│   ├── Title
│   └── CloseButton
│
├── MessageList
│   ├── MessageBubble[]
│   ├── SystemMessage[]
│   └── OrderStatusUpdate[]
│
└── MessageInput
    ├── TextArea
    ├── AttachmentButton
    └── SendButton
```

### Real-time Strategy

O sistema utiliza Supabase Realtime para atualizações instantâneas:

**Subscriptions:**

1. **Conversation List Updates** (Admin)
   - Table: `support_conversations`
   - Events: INSERT, UPDATE
   - Filters: None (admin vê todas)
   - Updates: Nova conversa, mudança de status, nova mensagem

2. **Message Updates** (Admin + Customer)
   - Table: `support_messages`
   - Events: INSERT, UPDATE
   - Filters: `conversation_id = current_conversation`
   - Updates: Nova mensagem, mensagem editada

3. **Order Status Updates** (Trigger automático)
   - Table: `manual_payments` (ou tabela de pedidos futura)
   - Events: UPDATE
   - Trigger: Cria mensagem automática quando status muda
   - Flow: Status change → Trigger → Insert message → Realtime notification

**Connection Management:**
- Subscriptions criadas quando componente monta
- Cleanup quando componente desmonta
- Reconnection automática via Supabase client
- Error handling com fallback para polling (se necessário)


## Components and Interfaces

### Core Components

#### 1. ConversationList

**Purpose:** Exibir lista de conversas com filtros e busca

**Props:**
```typescript
interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSearch: (term: string) => void;
  onFilterStatus: (status: ConversationStatus) => void;
}
```

**State:**
- `searchTerm: string`
- `statusFilter: ConversationStatus | 'all'`
- `filteredConversations: Conversation[]`

**Responsibilities:**
- Renderizar lista de conversas ordenadas por `last_message_at`
- Aplicar filtros de busca e status
- Destacar conversas com mensagens não lidas
- Atualizar em tempo real via Supabase Realtime

#### 2. ChatInterface

**Purpose:** Interface principal de chat com mensagens e input

**Props:**
```typescript
interface ChatInterfaceProps {
  conversationId: string;
  userId: string;
  userType: 'admin' | 'customer';
}
```

**State:**
- `messages: Message[]`
- `newMessage: string`
- `isLoading: boolean`
- `isSending: boolean`
- `attachments: File[]`

**Responsibilities:**
- Carregar e exibir histórico de mensagens
- Enviar novas mensagens
- Upload de anexos
- Auto-scroll para mensagem mais recente
- Infinite scroll para mensagens antigas
- Atualização em tempo real

#### 3. MessageBubble

**Purpose:** Renderizar mensagem individual

**Props:**
```typescript
interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
}
```

**Variants:**
- User message (left-aligned, gray)
- Admin message (right-aligned, blue)
- Internal note (yellow background, admin only)
- System message (centered, gray, italic)

#### 4. CustomerSidebar

**Purpose:** Exibir contexto do cliente (pedidos, orçamentos, etc.)

**Props:**
```typescript
interface CustomerSidebarProps {
  userId: string;
  isOpen: boolean;
  onToggle: () => void;
}
```

**Sections:**
- **Orders:** Lista de pedidos com status e tracking
- **Quotes:** Lista de orçamentos com status de pagamento
- **Subscription:** Informações de assinatura ativa
- **Payments:** Histórico de pagamentos manuais

**Data Loading:**
- Lazy loading quando sidebar abre
- Cache com React Query
- Atualização em tempo real para mudanças de status

#### 5. QuickReplies

**Purpose:** Gerenciar e inserir respostas rápidas

**Props:**
```typescript
interface QuickRepliesProps {
  onSelect: (message: string) => void;
}
```

**Features:**
- Lista de respostas rápidas categorizadas
- CRUD de respostas (admin only)
- Busca por categoria ou texto
- Inserção no campo de mensagem

#### 6. AttachmentUpload

**Purpose:** Upload de imagens e PDFs

**Props:**
```typescript
interface AttachmentUploadProps {
  onUpload: (files: File[]) => void;
  maxSize: number; // 5MB
  acceptedTypes: string[]; // ['image/jpeg', 'image/png', 'application/pdf']
}
```

**Features:**
- Drag & drop
- Validação de tipo e tamanho
- Preview de imagens
- Progress indicator
- Error handling

### Service Interfaces

#### ConversationService

```typescript
interface ConversationService {
  // Listar conversas
  listConversations(filters?: ConversationFilters): Promise<Conversation[]>;
  
  // Obter conversa específica
  getConversation(id: string): Promise<Conversation>;
  
  // Criar nova conversa
  createConversation(data: CreateConversationData): Promise<Conversation>;
  
  // Atualizar status
  updateStatus(id: string, status: ConversationStatus): Promise<void>;
  
  // Atualizar tag
  updateTag(id: string, tag: ConversationTag): Promise<void>;
  
  // Buscar conversas
  searchConversations(query: string): Promise<Conversation[]>;
}
```

#### MessageService

```typescript
interface MessageService {
  // Listar mensagens de uma conversa
  listMessages(conversationId: string, options?: PaginationOptions): Promise<Message[]>;
  
  // Enviar mensagem
  sendMessage(data: SendMessageData): Promise<Message>;
  
  // Adicionar nota interna
  addInternalNote(conversationId: string, note: string): Promise<Message>;
  
  // Editar nota interna (dentro de 5 minutos)
  editInternalNote(id: string, note: string): Promise<Message>;
  
  // Deletar nota interna
  deleteInternalNote(id: string): Promise<void>;
  
  // Marcar mensagens como lidas
  markAsRead(conversationId: string, userType: 'admin' | 'customer'): Promise<void>;
}
```

#### OrderStatusService

```typescript
interface OrderStatusService {
  // Atualizar status de pedido (trigger automático de mensagem)
  updateOrderStatus(orderId: string, status: OrderStatus, trackingCode?: string): Promise<void>;
  
  // Obter template de mensagem automática
  getStatusMessageTemplate(status: OrderStatus): string;
  
  // Customizar template
  updateStatusMessageTemplate(status: OrderStatus, template: string): Promise<void>;
  
  // Criar conversa automática se não existir
  ensureConversationExists(userId: string, orderId: string): Promise<string>;
}
```

#### FileUploadService

```typescript
interface FileUploadService {
  // Upload de arquivo
  uploadFile(file: File, conversationId: string): Promise<FileMetadata>;
  
  // Gerar thumbnail (para imagens)
  generateThumbnail(file: File): Promise<Blob>;
  
  // Validar arquivo
  validateFile(file: File): ValidationResult;
  
  // Obter URL pública
  getPublicUrl(path: string): string;
  
  // Deletar arquivo
  deleteFile(path: string): Promise<void>;
}
```

#### NotificationService

```typescript
interface NotificationService {
  // Enviar notificação por email
  sendEmailNotification(userId: string, conversationId: string, message: string): Promise<void>;
  
  // Verificar se usuário está online
  isUserOnline(userId: string): Promise<boolean>;
  
  // Agrupar notificações (5 minutos)
  queueNotification(userId: string, message: string): void;
  
  // Processar fila de notificações
  processNotificationQueue(): Promise<void>;
}
```

#### IntegrationService

```typescript
interface IntegrationService {
  // Obter pedidos do usuário
  getUserOrders(userId: string): Promise<Order[]>;
  
  // Obter orçamentos do usuário
  getUserQuotes(userId: string): Promise<Quote[]>;
  
  // Obter assinatura do usuário
  getUserSubscription(userId: string): Promise<Subscription | null>;
  
  // Obter pagamentos manuais do usuário
  getUserPayments(userId: string): Promise<ManualPayment[]>;
  
  // Atualizar status de pagamento
  updatePaymentStatus(paymentId: string, status: PaymentStatus): Promise<void>;
}
```


## Data Models

### Database Schema

#### Tabelas Existentes (Reutilizadas)

##### support_conversations

```sql
CREATE TABLE support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'waiting_admin', 'waiting_customer', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  tags TEXT[] DEFAULT '{}', -- Array de tags (múltiplas tags permitidas)
  risk_flags TEXT[] DEFAULT '{}', -- Array de flags de risco
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  promised_date TIMESTAMPTZ, -- Data prometida ao cliente
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Integrações
  order_id UUID REFERENCES manual_payments(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES manual_payments(id) ON DELETE SET NULL
);

CREATE INDEX idx_support_conversations_user ON support_conversations(user_id);
CREATE INDEX idx_support_conversations_status ON support_conversations(status);
CREATE INDEX idx_support_conversations_last_message ON support_conversations(last_message_at DESC);
CREATE INDEX idx_support_conversations_assigned ON support_conversations(assigned_to);
CREATE INDEX idx_support_conversations_order ON support_conversations(order_id);
CREATE INDEX idx_support_conversations_quote ON support_conversations(quote_id);
CREATE INDEX idx_support_conversations_payment ON support_conversations(payment_id);
CREATE INDEX idx_support_conversations_tags ON support_conversations USING GIN(tags);
CREATE INDEX idx_support_conversations_risk_flags ON support_conversations USING GIN(risk_flags);
CREATE INDEX idx_support_conversations_promised_date ON support_conversations(promised_date) WHERE promised_date IS NOT NULL;
```

##### support_messages

```sql
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'customer', 'system')),
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  read_by_admin BOOLEAN NOT NULL DEFAULT false,
  read_by_customer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX idx_support_messages_conversation ON support_messages(conversation_id, created_at);
CREATE INDEX idx_support_messages_sender ON support_messages(sender_id);
CREATE INDEX idx_support_messages_unread_admin ON support_messages(conversation_id) 
  WHERE is_internal = false AND read_by_admin = false;
CREATE INDEX idx_support_messages_unread_customer ON support_messages(conversation_id) 
  WHERE is_internal = false AND read_by_customer = false;
```

#### Novas Tabelas

##### order_production_stages

```sql
CREATE TABLE order_production_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES manual_payments(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('molde_pronto', 'impressao_iniciada', 'pintura_iniciada', 'finalizacao')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_production_stages_order ON order_production_stages(order_id, created_at DESC);
```

##### support_attachments

```sql
CREATE TABLE support_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  thumbnail_path TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_attachments_message ON support_attachments(message_id);
CREATE INDEX idx_support_attachments_uploaded_by ON support_attachments(uploaded_by);
```

##### quick_replies

```sql
CREATE TABLE quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quick_replies_category ON quick_replies(category);
CREATE INDEX idx_quick_replies_active ON quick_replies(is_active);
CREATE INDEX idx_quick_replies_order ON quick_replies(display_order);
```

##### conversation_reminders

```sql
CREATE TABLE conversation_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('quote_followup', 'payment_pending', 'promised_date')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_reminders_scheduled ON conversation_reminders(scheduled_for) 
  WHERE is_active = true AND sent_at IS NULL;
CREATE INDEX idx_conversation_reminders_conversation ON conversation_reminders(conversation_id);
```

##### order_status_templates

```sql
CREATE TABLE order_status_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL UNIQUE CHECK (status IN ('aguardando_pagamento', 'em_producao', 'enviado', 'entregue')),
  message_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Templates padrão
INSERT INTO order_status_templates (status, message_template) VALUES
('aguardando_pagamento', 'Olá! Seu pedido #{order_number} está aguardando confirmação de pagamento. Valor: R$ {amount}'),
('em_producao', 'Ótimas notícias! Seu pedido #{order_number} entrou em produção. Previsão de envio: {estimated_ship_date}'),
('enviado', 'Seu pedido #{order_number} foi enviado! 📦\n\nCódigo de rastreamento: {tracking_code}\n\nAcompanhe em: {tracking_url}'),
('entregue', 'Seu pedido #{order_number} foi entregue! 🎉\n\nEsperamos que você goste. Se tiver alguma dúvida, estamos aqui para ajudar.');
```

### TypeScript Interfaces

```typescript
// Conversation
interface Conversation {
  id: string;
  user_id: string;
  subject: string;
  status: 'new' | 'waiting_admin' | 'waiting_customer' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: ConversationTag[]; // Array de tags (múltiplas permitidas)
  risk_flags: RiskFlag[]; // Array de flags de risco
  assigned_to?: string;
  promised_date?: string; // Data prometida ao cliente
  first_response_at?: string;
  resolved_at?: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  
  // Relacionamentos
  order_id?: string;
  quote_id?: string;
  subscription_id?: string;
  payment_id?: string;
  
  // Dados computados
  user_email?: string;
  user_name?: string;
  unread_count?: number;
  hours_since_last_message?: number; // Para SLA
  is_overdue?: boolean; // promised_date passou
}

type ConversationTag = 
  | 'pedido' 
  | 'orcamento' 
  | 'duvida' 
  | 'reclamacao' 
  | 'assinatura'
  | 'urgente';

type RiskFlag = 
  | 'cliente_conflito' 
  | 'atraso_critico' 
  | 'pagamento_problema';

// Message
interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'admin' | 'customer' | 'system';
  message: string;
  is_internal: boolean;
  read_by_admin: boolean;
  read_by_customer: boolean;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  
  // Relacionamentos
  attachments?: Attachment[];
  sender_name?: string;
}

// Attachment
interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  thumbnail_path?: string;
  uploaded_by: string;
  created_at: string;
}

// Order Production Stage
interface OrderProductionStage {
  id: string;
  order_id: string;
  stage: 'molde_pronto' | 'impressao_iniciada' | 'pintura_iniciada' | 'finalizacao';
  notes?: string;
  created_by: string;
  created_at: string;
}

// Conversation Reminder
interface ConversationReminder {
  id: string;
  conversation_id: string;
  reminder_type: 'quote_followup' | 'payment_pending' | 'promised_date';
  scheduled_for: string;
  sent_at?: string;
  is_active: boolean;
  created_at: string;
}

// Quick Reply
interface QuickReply {
  id: string;
  category: string;
  title: string;
  message: string;
  display_order: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Order Status Template
interface OrderStatusTemplate {
  id: string;
  status: 'aguardando_pagamento' | 'em_producao' | 'enviado' | 'entregue';
  message_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Integration Types
interface Order {
  id: string;
  reference_number: string;
  user_id: string;
  amount: number;
  status: string;
  payment_type: string;
  created_at: string;
  tracking_code?: string;
  production_stages?: OrderProductionStage[]; // Estágios internos de produção
}

interface Quote {
  id: string;
  user_id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  next_billing_date: string;
  created_at: string;
}

// Dashboard SLA Metrics
interface DashboardMetrics {
  open_count: number;
  waiting_customer_count: number;
  resolved_today_count: number;
  total_count: number;
  overdue_24h_count: number; // SLA: conversas abertas há mais de 24h
  avg_first_response_minutes: number; // SLA: tempo médio de primeira resposta
  conversations_with_risk: number;
  conversations_overdue_promise: number; // Promessas não cumpridas
}
```

### Database Triggers

#### Trigger: Atualizar last_message_at

```sql
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_conversations
  SET 
    last_message_at = NEW.created_at,
    status = CASE
      WHEN NEW.sender_type = 'customer' THEN 'waiting_admin'
      WHEN NEW.sender_type = 'admin' THEN 'waiting_customer'
      ELSE status
    END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();
```

#### Trigger: Marcar first_response_at

```sql
CREATE OR REPLACE FUNCTION mark_first_admin_response()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_conversation_user_id UUID;
BEGIN
  -- Verifica se sender é admin
  SELECT has_role(NEW.sender_id, 'admin'::app_role) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN NEW;
  END IF;
  
  -- Busca user_id da conversa
  SELECT user_id INTO v_conversation_user_id
  FROM support_conversations
  WHERE id = NEW.conversation_id;
  
  -- Se é admin e não é o dono da conversa
  IF v_is_admin AND NEW.sender_id != v_conversation_user_id THEN
    UPDATE support_conversations
    SET first_response_at = NEW.created_at
    WHERE id = NEW.conversation_id
      AND first_response_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_first_admin_response
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION mark_first_admin_response();
```

#### Trigger: Automação de Status de Pedidos

```sql
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
  v_template TEXT;
  v_message TEXT;
BEGIN
  -- Apenas processa se status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Busca ou cria conversa para este pedido
  SELECT id INTO v_conversation_id
  FROM support_conversations
  WHERE order_id = NEW.id;
  
  IF v_conversation_id IS NULL THEN
    INSERT INTO support_conversations (user_id, subject, status, tag, order_id)
    VALUES (NEW.user_id, 'Pedido ' || NEW.reference_number, 'waiting_customer', 'pedido', NEW.id)
    RETURNING id INTO v_conversation_id;
  END IF;
  
  -- Busca template de mensagem
  SELECT message_template INTO v_template
  FROM order_status_templates
  WHERE status = NEW.status AND is_active = true;
  
  IF v_template IS NOT NULL THEN
    -- Substitui variáveis no template
    v_message := replace(v_template, '{order_number}', NEW.reference_number);
    v_message := replace(v_message, '{amount}', NEW.amount::TEXT);
    v_message := replace(v_message, '{tracking_code}', COALESCE(NEW.tracking_code, 'Em breve'));
    
    -- Insere mensagem automática
    INSERT INTO support_messages (conversation_id, sender_id, sender_type, message)
    VALUES (v_conversation_id, NEW.user_id, 'system', v_message);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_order_status_change
  AFTER UPDATE ON manual_payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:

**Redundancies Eliminated:**
- 5.1 is identical to 3.3 (store messages permanently) - removed
- 13.5 is identical to 1.5 (filter by status) - removed
- 18.2 is identical to 1.4 (search by name/email) - removed
- 20.4 is identical to 4.6 (validate file uploads) - removed
- 14.5 is covered by 4.1 and 4.2 (file upload validation applies to all users) - removed

**Properties Combined:**
- 6.1, 6.2, 6.3 combined into single property about order status automation
- 17.1, 17.2, 17.3, 17.4 combined into single property about metric calculations
- 19.3 and 19.4 combined into single property about payment status notifications

### Core Properties

#### Property 1: Conversation List Ordering

*For any* set of conversations, when displayed in the conversation list, they should be ordered by `last_message_at` in descending order (most recent first).

**Validates: Requirements 1.1**

#### Property 2: Conversation Display Completeness

*For any* conversation in the list, the rendered output should contain user name, last message preview (truncated to 50 characters), timestamp, and unread count.

**Validates: Requirements 1.2**

#### Property 3: Search Functionality

*For any* search query and set of conversations, all returned results should contain the search term in either the user name or user email (case-insensitive).

**Validates: Requirements 1.4, 18.2**

#### Property 4: Status Filtering

*For any* status filter and set of conversations, all returned results should have the specified status, or all conversations should be returned if filter is "all".

**Validates: Requirements 1.5, 13.5**

#### Property 5: Unread Indicator

*For any* conversation with `unread_count > 0`, the rendered element should have a visual indicator (CSS class or attribute) distinguishing it from conversations with no unread messages.

**Validates: Requirements 1.7**

#### Property 6: Message Chronological Ordering

*For any* set of messages in a conversation, they should be displayed in chronological order sorted by `created_at` ascending, and each message should display sender name and timestamp in HH:mm format.

**Validates: Requirements 2.3**

#### Property 7: Message Visual Distinction

*For any* message, if `sender_type` is 'admin', it should have right-aligned blue styling, and if `sender_type` is 'customer', it should have left-aligned gray styling.

**Validates: Requirements 2.4**

#### Property 8: Message Length Validation

*For any* message input, messages with length ≤ 2000 characters should be accepted, and messages with length > 2000 characters should be rejected.

**Validates: Requirements 2.6**

#### Property 9: Message Persistence

*For any* message sent through the system, it should be stored permanently in the `support_messages` table and retrievable by `conversation_id`.

**Validates: Requirements 3.3, 5.1**

#### Property 10: Line Break Support

*For any* message containing newline characters (\n), the message should be stored with newlines preserved and displayed with line breaks rendered correctly.

**Validates: Requirements 3.4**

#### Property 11: Empty Message Prevention

*For any* message input that is empty or contains only whitespace characters, the system should reject it and prevent sending.

**Validates: Requirements 3.6**

#### Property 12: Message Status Display

*For any* message being sent, the UI should display one of three states: "enviando" (sending), "enviado" (sent), or "falhou" (failed).

**Validates: Requirements 3.7**

#### Property 13: Image Upload Validation

*For any* file upload, if the file type is JPEG or PNG and size is ≤ 5MB, it should be accepted; otherwise it should be rejected.

**Validates: Requirements 4.1**

#### Property 14: PDF Upload Validation

*For any* file upload, if the file type is PDF and size is ≤ 5MB, it should be accepted; otherwise it should be rejected.

**Validates: Requirements 4.2**

#### Property 15: Image Thumbnail Display

*For any* attached image, the rendered attachment should include a thumbnail element with dimensions approximately 200x200px.

**Validates: Requirements 4.3**

#### Property 16: PDF Display Format

*For any* attached PDF, the rendered attachment should display the filename and include a PDF icon indicator.

**Validates: Requirements 4.4**

#### Property 17: File Validation Before Upload

*For any* file selected for upload, validation for type and size should occur before the upload request is sent to the server.

**Validates: Requirements 4.6, 20.4, 14.5**

#### Property 18: Message Pagination

*For any* conversation, when initially loaded, the system should return at most the 50 most recent messages.

**Validates: Requirements 5.2**

#### Property 19: Date Separator Insertion

*For any* sequence of messages spanning multiple calendar days, date separator elements should be inserted between messages from different days.

**Validates: Requirements 5.4**

#### Property 20: Order Status Automation

*For any* order status change to 'em_producao', 'enviado', or 'entregue', the system should automatically create a system message in the associated conversation (creating the conversation if it doesn't exist).

**Validates: Requirements 6.1, 6.2, 6.3, 6.8**

#### Property 21: Order Status Validation

*For any* order status value, only 'aguardando_pagamento', 'em_producao', 'enviado', and 'entregue' should be accepted; other values should be rejected.

**Validates: Requirements 6.4**

#### Property 22: Automatic Conversation Creation

*For any* order status change, if no conversation exists for that order's user, a new conversation should be created automatically with tag 'pedido'.

**Validates: Requirements 6.5**

#### Property 23: Order Details in Automatic Messages

*For any* automatic order status message, the message content should include the order number, and if available, order value and tracking code.

**Validates: Requirements 6.6**

#### Property 24: Order Display Completeness

*For any* order displayed in the sidebar, it should show order number, date, total value, and current status.

**Validates: Requirements 7.2**

#### Property 25: Tracking Code Conditional Display

*For any* order with status 'enviado' or 'entregue', the tracking code should be displayed; for other statuses, it should not be required.

**Validates: Requirements 7.4**

#### Property 26: Status Update Triggers Notification

*For any* order status update performed through the chat interface, an automatic notification message should be created in the conversation.

**Validates: Requirements 7.6**

#### Property 27: Quote Conversation Creation

*For any* new quote request, a conversation should be created automatically with tag 'orcamento'.

**Validates: Requirements 8.1**

#### Property 28: Quote Display Completeness

*For any* quote displayed in the sidebar, it should show quote number, date, items summary, and status.

**Validates: Requirements 8.3**

#### Property 29: Quote Acceptance Notification

*For any* quote accepted by a user, a notification message should be created in the associated conversation.

**Validates: Requirements 8.5**

#### Property 30: Subscription Display Completeness

*For any* subscriber viewing a conversation, the sidebar should display subscription plan, status, and next billing date.

**Validates: Requirements 9.1, 9.2**

#### Property 31: Subscription Payment Failure Notification

*For any* subscription payment failure, an automatic notification message should be created in the subscriber's conversation.

**Validates: Requirements 9.4**

#### Property 32: Quick Reply Category Organization

*For any* set of quick replies, they should be organizable and filterable by category.

**Validates: Requirements 10.7**

#### Property 33: Internal Note Visibility

*For any* message with `is_internal = true`, it should only be visible to admin users and never to customer users.

**Validates: Requirements 11.2**

#### Property 34: Internal Note Visual Distinction

*For any* internal note, it should have distinct visual styling (yellow background) different from regular messages.

**Validates: Requirements 11.3**

#### Property 35: Internal Note Metadata Display

*For any* internal note, it should display the author name and timestamp.

**Validates: Requirements 11.4**

#### Property 36: Internal Note Edit Time Window

*For any* internal note, it should be editable if `created_at` is within 5 minutes of current time, and not editable otherwise.

**Validates: Requirements 11.5**

#### Property 37: Conversation Tag Validation

*For any* conversation tag value, only 'pedido', 'orcamento', 'duvida', 'reclamacao', and 'assinatura' should be accepted; other values should be rejected.

**Validates: Requirements 12.1**

#### Property 38: Single Tag Assignment

*For any* conversation, it should have at most one tag assigned at any time.

**Validates: Requirements 12.2**

#### Property 39: Tag Display in List

*For any* conversation with an assigned tag, the tag should be visible in the conversation list view.

**Validates: Requirements 12.3**

#### Property 40: Tag Filtering

*For any* tag filter and set of conversations, all returned results should have the specified tag.

**Validates: Requirements 12.4**

#### Property 41: Tag Color Coding

*For any* conversation tag, different tags should have different color coding in the UI.

**Validates: Requirements 12.6**

#### Property 42: Conversation Status Validation

*For any* conversation status value, only 'new', 'waiting_admin', 'waiting_customer', 'resolved', and 'closed' should be accepted; other values should be rejected.

**Validates: Requirements 13.1**

#### Property 43: Admin Message Status Update

*For any* message sent by an admin, the conversation status should automatically update to 'waiting_customer'.

**Validates: Requirements 13.3**

#### Property 44: Customer Message Status Update

*For any* message sent by a customer, the conversation status should automatically update to 'waiting_admin'.

**Validates: Requirements 13.4**

#### Property 45: Status Visual Indicator

*For any* conversation, the status should be displayed with a visual indicator (color dot or badge).

**Validates: Requirements 13.6**

#### Property 46: Pending Count Calculation

*For any* set of conversations, the pending count should equal the number of conversations with status 'waiting_admin'.

**Validates: Requirements 13.7**

#### Property 47: Client Conversation History Display

*For any* authenticated client, they should only see conversations where `user_id` matches their user ID.

**Validates: Requirements 14.3**

#### Property 48: Unread Message Count Display

*For any* client, the chat button should display the count of unread messages across all their conversations.

**Validates: Requirements 14.6**

#### Property 49: Order Status Updates in Client Chat

*For any* order status update message, it should be visible in the client's chat interface.

**Validates: Requirements 14.8**

#### Property 50: Contact Form Required Fields

*For any* contact form submission, name, email, and message fields should be required and validated.

**Validates: Requirements 15.2**

#### Property 51: Contact Form Conversation Creation

*For any* valid contact form submission, a new conversation should be created with the provided information.

**Validates: Requirements 15.3**

#### Property 52: Contact Form Auto-Tagging

*For any* conversation created from a contact form, it should automatically have tag 'duvida' assigned.

**Validates: Requirements 15.7**

#### Property 53: Email Notification Content

*For any* email notification sent, it should include the message content and a link to the conversation.

**Validates: Requirements 16.3, 16.4**

#### Property 54: Online User Email Suppression

*For any* user currently online in the chat, email notifications should not be sent.

**Validates: Requirements 16.5**

#### Property 55: Email Message Grouping

*For any* multiple messages sent to the same user within 5 minutes, they should be grouped into a single email notification.

**Validates: Requirements 16.6**

#### Property 56: Dashboard Metrics Calculation

*For any* set of conversations, the dashboard should correctly calculate and display: count with status 'waiting_admin', count with status 'waiting_customer', count resolved today (resolved_at is today), and total count.

**Validates: Requirements 17.1, 17.2, 17.3, 17.4**

#### Property 57: Search Result Highlighting

*For any* search results, matching text in user names or emails should be highlighted in the UI.

**Validates: Requirements 18.4**

#### Property 58: Payment Status Display

*For any* client conversation, the sidebar should display payment status for each associated order.

**Validates: Requirements 19.1, 19.2**

#### Property 59: Payment Status Change Notifications

*For any* payment status change to 'approved' or 'rejected', an automatic notification message should be created in the associated conversation.

**Validates: Requirements 19.3, 19.4**

#### Property 60: Payment Method Display

*For any* order displayed in the sidebar, the payment method used should be shown.

**Validates: Requirements 19.5**

#### Property 61: Input Sanitization

*For any* user input (message text, search queries, form fields), dangerous characters and scripts should be sanitized before storage and display.

**Validates: Requirements 20.3**

#### Property 62: Admin Action Audit Logging

*For any* admin action (status change, tag assignment, internal note creation), an audit log entry should be created.

**Validates: Requirements 20.6**

#### Property 63: Migration Data Preservation

*For any* conversation migrated from the old system, the message content, timestamps, and sender information should match the source data.

**Validates: Requirements 22.2**

#### Property 64: Migration User Association Preservation

*For any* conversation migrated from the old system, the user associations (user_id, sender_id) should be preserved correctly.

**Validates: Requirements 22.3**


## Error Handling

### Error Categories

#### 1. Network Errors

**Scenarios:**
- Failed API requests to Supabase
- Realtime connection drops
- File upload failures

**Handling Strategy:**
- Display user-friendly error messages via toast notifications
- Implement automatic retry with exponential backoff (max 3 attempts)
- Provide manual retry button for user-initiated actions
- Maintain optimistic UI updates with rollback on failure
- Log errors to console for debugging

**Example:**
```typescript
async function sendMessage(message: string) {
  try {
    // Optimistic update
    addMessageToUI(message, 'sending');
    
    const { data, error } = await supabase
      .from('support_messages')
      .insert({ message });
    
    if (error) throw error;
    
    updateMessageStatus(data.id, 'sent');
  } catch (error) {
    updateMessageStatus(tempId, 'failed');
    toast.error('Falha ao enviar mensagem. Tente novamente.');
    console.error('Send message error:', error);
  }
}
```

#### 2. Validation Errors

**Scenarios:**
- Empty message submission
- Invalid file type or size
- Invalid conversation status or tag
- Missing required fields in contact form

**Handling Strategy:**
- Validate on client-side before submission
- Display inline validation errors near input fields
- Prevent form submission until validation passes
- Provide clear, actionable error messages
- Use Zod or similar for schema validation

**Example:**
```typescript
const messageSchema = z.object({
  message: z.string()
    .min(1, 'Mensagem não pode estar vazia')
    .max(2000, 'Mensagem não pode ter mais de 2000 caracteres')
    .refine(val => val.trim().length > 0, 'Mensagem não pode conter apenas espaços')
});

function validateMessage(message: string): ValidationResult {
  try {
    messageSchema.parse({ message });
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      errors: error.errors.map(e => e.message) 
    };
  }
}
```

#### 3. Authentication Errors

**Scenarios:**
- Session expired
- Unauthorized access attempts
- Missing authentication token

**Handling Strategy:**
- Redirect to login page on session expiration
- Display clear "Session expired" message
- Preserve user's current state (draft message, selected conversation)
- Restore state after re-authentication
- Implement RLS policies at database level

**Example:**
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    if (!session) {
      // Save current state
      saveToLocalStorage('draftMessage', currentMessage);
      saveToLocalStorage('selectedConversation', conversationId);
      
      // Redirect to login
      navigate('/login', { 
        state: { returnTo: '/admin/support' } 
      });
    }
  }
});
```

#### 4. Realtime Connection Errors

**Scenarios:**
- Realtime subscription fails
- Connection drops during active session
- Reconnection failures

**Handling Strategy:**
- Display connection status indicator
- Attempt automatic reconnection
- Fall back to polling if realtime fails
- Notify user of degraded experience
- Sync missed messages on reconnection

**Example:**
```typescript
function setupRealtimeSubscription() {
  const channel = supabase
    .channel('support_messages')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'support_messages' },
      handleNewMessage
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('connected');
      } else if (status === 'CHANNEL_ERROR') {
        setConnectionStatus('error');
        toast.error('Conexão em tempo real falhou. Tentando reconectar...');
        setTimeout(setupRealtimeSubscription, 5000);
      }
    });
  
  return () => {
    supabase.removeChannel(channel);
  };
}
```

#### 5. File Upload Errors

**Scenarios:**
- File too large
- Invalid file type
- Storage quota exceeded
- Upload interrupted

**Handling Strategy:**
- Validate file before upload
- Show upload progress
- Allow cancellation during upload
- Provide specific error messages
- Suggest solutions (compress image, use different format)

**Example:**
```typescript
async function uploadFile(file: File): Promise<UploadResult> {
  // Validate
  const validation = validateFile(file);
  if (!validation.valid) {
    return { 
      success: false, 
      error: validation.error 
    };
  }
  
  // Upload with progress
  try {
    const { data, error } = await supabase.storage
      .from('support-attachments')
      .upload(`${conversationId}/${file.name}`, file, {
        onUploadProgress: (progress) => {
          setUploadProgress(progress.loaded / progress.total * 100);
        }
      });
    
    if (error) throw error;
    
    return { success: true, path: data.path };
  } catch (error) {
    if (error.message.includes('quota')) {
      return { 
        success: false, 
        error: 'Limite de armazenamento atingido. Contate o suporte.' 
      };
    }
    return { 
      success: false, 
      error: 'Falha no upload. Tente novamente.' 
    };
  }
}
```

#### 6. Data Consistency Errors

**Scenarios:**
- Conversation not found
- Message sent to deleted conversation
- User deleted during active session
- Orphaned messages

**Handling Strategy:**
- Use database constraints (foreign keys, cascades)
- Implement soft deletes where appropriate
- Handle missing data gracefully in UI
- Refresh data on 404 errors
- Log inconsistencies for investigation

**Example:**
```typescript
async function loadConversation(id: string) {
  try {
    const { data, error } = await supabase
      .from('support_conversations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        toast.error('Conversa não encontrada');
        navigate('/admin/support');
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Load conversation error:', error);
    toast.error('Erro ao carregar conversa');
    return null;
  }
}
```

### Error Logging

All errors should be logged with context for debugging:

```typescript
interface ErrorLog {
  timestamp: string;
  userId: string;
  action: string;
  error: Error;
  context: Record<string, any>;
}

function logError(action: string, error: Error, context: Record<string, any>) {
  const log: ErrorLog = {
    timestamp: new Date().toISOString(),
    userId: currentUser?.id || 'anonymous',
    action,
    error,
    context
  };
  
  console.error('Error Log:', log);
  
  // In production, send to error tracking service (Sentry, etc.)
  if (import.meta.env.PROD) {
    sendToErrorTracking(log);
  }
}
```

### User-Facing Error Messages

Error messages should be:
- **Clear**: Explain what went wrong in simple terms
- **Actionable**: Tell user what they can do about it
- **Friendly**: Maintain supportive tone, avoid technical jargon
- **Consistent**: Use same patterns across the application

**Examples:**

| Error Type | Bad Message | Good Message |
|------------|-------------|--------------|
| Network | "Error 500" | "Não foi possível enviar a mensagem. Verifique sua conexão e tente novamente." |
| Validation | "Invalid input" | "A mensagem não pode estar vazia. Digite algo antes de enviar." |
| File Upload | "Upload failed" | "O arquivo é muito grande. O tamanho máximo é 5MB. Tente comprimir a imagem." |
| Auth | "Unauthorized" | "Sua sessão expirou. Faça login novamente para continuar." |


## Testing Strategy

### Dual Testing Approach

The system will use both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property tests**: Verify universal properties across all inputs through randomization
- Both approaches are complementary and necessary for comprehensive coverage

Unit tests catch concrete bugs and validate specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Property-Based Testing Configuration

**Library Selection:**
- **JavaScript/TypeScript**: Use `fast-check` library
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `Feature: advanced-chat-support-system, Property {number}: {property_text}`

**Example Property Test:**

```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('Feature: advanced-chat-support-system', () => {
  it('Property 1: Conversation List Ordering', () => {
    // Feature: advanced-chat-support-system, Property 1: Conversation list ordering
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.uuid(),
          last_message_at: fc.date(),
          subject: fc.string(),
          status: fc.constantFrom('new', 'waiting_admin', 'waiting_customer', 'resolved'),
        })),
        (conversations) => {
          const sorted = sortConversations(conversations);
          
          // Verify descending order by last_message_at
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(
              new Date(sorted[i].last_message_at).getTime()
            ).toBeGreaterThanOrEqual(
              new Date(sorted[i + 1].last_message_at).getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: Empty Message Prevention', () => {
    // Feature: advanced-chat-support-system, Property 11: Empty message prevention
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\n\n'),
          fc.constant('\t\t'),
          fc.stringOf(fc.constantFrom(' ', '\n', '\t'))
        ),
        (emptyMessage) => {
          const result = validateMessage(emptyMessage);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('vazia');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 20: Order Status Automation', () => {
    // Feature: advanced-chat-support-system, Property 20: Order status automation
    fc.assert(
      fc.property(
        fc.record({
          orderId: fc.uuid(),
          userId: fc.uuid(),
          oldStatus: fc.constantFrom('aguardando_pagamento', 'em_producao'),
          newStatus: fc.constantFrom('em_producao', 'enviado', 'entregue'),
        }),
        async ({ orderId, userId, oldStatus, newStatus }) => {
          // Update order status
          await updateOrderStatus(orderId, newStatus);
          
          // Verify automatic message was created
          const messages = await getConversationMessages(userId);
          const automaticMessage = messages.find(
            m => m.sender_type === 'system' && 
                 m.message.includes(orderId)
          );
          
          expect(automaticMessage).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Strategy

Unit tests should focus on:

1. **Specific Examples**: Concrete scenarios that demonstrate correct behavior
2. **Edge Cases**: Boundary conditions and special cases
3. **Error Conditions**: How the system handles failures
4. **Integration Points**: Interactions between components

**Avoid writing too many unit tests** - property-based tests handle covering lots of inputs. Focus unit tests on scenarios that are difficult to express as properties.

**Example Unit Tests:**

```typescript
describe('ConversationList Component', () => {
  it('should display two-panel layout with correct widths', () => {
    // Feature: advanced-chat-support-system, Example: Two-panel layout
    render(<AdminSupportV2 />);
    
    const conversationList = screen.getByTestId('conversation-list');
    const chatArea = screen.getByTestId('chat-area');
    
    expect(conversationList).toHaveStyle({ width: '30%' });
    expect(chatArea).toHaveStyle({ width: '70%' });
  });

  it('should auto-scroll to most recent message when opening conversation', () => {
    // Feature: advanced-chat-support-system, Example: Auto-scroll behavior
    const { container } = render(<ChatInterface conversationId="123" />);
    
    const messageList = container.querySelector('.message-list');
    expect(messageList?.scrollTop).toBe(messageList?.scrollHeight);
  });

  it('should display error message when message sending fails', async () => {
    // Feature: advanced-chat-support-system, Example: Error handling
    mockSupabase.from().insert.mockRejectedValue(new Error('Network error'));
    
    render(<ChatInterface conversationId="123" />);
    
    const input = screen.getByPlaceholderText('Digite sua mensagem...');
    const sendButton = screen.getByRole('button', { name: /enviar/i });
    
    await userEvent.type(input, 'Test message');
    await userEvent.click(sendButton);
    
    expect(await screen.findByText(/falha ao enviar mensagem/i)).toBeInTheDocument();
  });
});

describe('FileUploadService', () => {
  it('should allow download when user clicks attachment', () => {
    // Feature: advanced-chat-support-system, Example: Attachment download
    render(<MessageBubble message={messageWithAttachment} />);
    
    const attachment = screen.getByText('document.pdf');
    expect(attachment).toHaveAttribute('href');
    expect(attachment).toHaveAttribute('download');
  });

  it('should display clear error for oversized file', () => {
    // Feature: advanced-chat-support-system, Example: File validation error
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg'
    });
    
    const result = validateFile(largeFile);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('5MB');
  });
});

describe('QuickReplies Component', () => {
  it('should provide quick reply button in message input', () => {
    // Feature: advanced-chat-support-system, Example: Quick reply button
    render(<MessageInput />);
    
    const quickReplyButton = screen.getByRole('button', { name: /respostas rápidas/i });
    expect(quickReplyButton).toBeInTheDocument();
  });

  it('should display list when quick reply button is clicked', async () => {
    // Feature: advanced-chat-support-system, Example: Quick reply list display
    render(<MessageInput />);
    
    const button = screen.getByRole('button', { name: /respostas rápidas/i });
    await userEvent.click(button);
    
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('should insert text into input when reply is selected', async () => {
    // Feature: advanced-chat-support-system, Example: Quick reply insertion
    render(<MessageInput />);
    
    const button = screen.getByRole('button', { name: /respostas rápidas/i });
    await userEvent.click(button);
    
    const reply = screen.getByText('Olá! Como posso ajudar?');
    await userEvent.click(reply);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Olá! Como posso ajudar?');
  });
});

describe('Migration Script', () => {
  it('should provide migration script for old system', () => {
    // Feature: advanced-chat-support-system, Example: Migration script exists
    expect(migrationScript).toBeDefined();
    expect(typeof migrationScript.run).toBe('function');
  });

  it('should generate migration report with counts', async () => {
    // Feature: advanced-chat-support-system, Example: Migration report
    const result = await migrationScript.run();
    
    expect(result).toHaveProperty('successCount');
    expect(result).toHaveProperty('failureCount');
    expect(result).toHaveProperty('errors');
  });

  it('should continue migration when individual conversation fails', async () => {
    // Feature: advanced-chat-support-system, Example: Migration error handling
    const conversations = [
      { id: '1', valid: true },
      { id: '2', valid: false }, // This will fail
      { id: '3', valid: true },
    ];
    
    const result = await migrationScript.run(conversations);
    
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(1);
    expect(result.errors).toHaveLength(1);
  });
});
```

### Integration Testing

Integration tests verify that components work together correctly:

```typescript
describe('Chat System Integration', () => {
  it('should create conversation and send message end-to-end', async () => {
    // Setup
    const user = await createTestUser();
    const admin = await createTestAdmin();
    
    // User submits contact form
    await submitContactForm({
      name: 'Test User',
      email: user.email,
      message: 'I need help'
    });
    
    // Verify conversation created
    const conversations = await getConversations();
    expect(conversations).toHaveLength(1);
    expect(conversations[0].tag).toBe('duvida');
    
    // Admin responds
    await sendMessage({
      conversationId: conversations[0].id,
      senderId: admin.id,
      message: 'How can I help you?'
    });
    
    // Verify message stored
    const messages = await getMessages(conversations[0].id);
    expect(messages).toHaveLength(2);
    expect(messages[1].sender_type).toBe('admin');
  });

  it('should trigger automatic notification when order status changes', async () => {
    // Setup
    const user = await createTestUser();
    const order = await createTestOrder({ userId: user.id });
    
    // Update order status
    await updateOrderStatus(order.id, 'enviado', 'BR123456789');
    
    // Verify conversation created
    const conversations = await getConversations({ userId: user.id });
    expect(conversations).toHaveLength(1);
    
    // Verify automatic message
    const messages = await getMessages(conversations[0].id);
    const automaticMessage = messages.find(m => m.sender_type === 'system');
    
    expect(automaticMessage).toBeDefined();
    expect(automaticMessage?.message).toContain('enviado');
    expect(automaticMessage?.message).toContain('BR123456789');
  });
});
```

### Test Coverage Goals

- **Unit Tests**: 80% code coverage minimum
- **Property Tests**: All 64 correctness properties implemented
- **Integration Tests**: All critical user flows covered
- **E2E Tests**: Happy path for admin and customer workflows

### Testing Tools

- **Test Runner**: Vitest
- **Property Testing**: fast-check
- **Component Testing**: React Testing Library
- **Mocking**: vitest mocks + MSW for API mocking
- **E2E**: Playwright (optional, for critical flows)

### Continuous Integration

All tests should run on:
- Every commit (pre-commit hook)
- Every pull request
- Before deployment to production

Failed tests should block deployment.


## File Structure

### Directory Organization

```
src/
├── components/
│   ├── admin/
│   │   ├── chat/
│   │   │   ├── ConversationList.tsx
│   │   │   ├── ConversationCard.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── InternalNote.tsx
│   │   │   ├── SystemMessage.tsx
│   │   │   ├── DateSeparator.tsx
│   │   │   ├── AttachmentUpload.tsx
│   │   │   ├── AttachmentPreview.tsx
│   │   │   ├── CustomerSidebar.tsx
│   │   │   ├── OrdersList.tsx
│   │   │   ├── QuotesList.tsx
│   │   │   ├── SubscriptionInfo.tsx
│   │   │   ├── PaymentInfo.tsx
│   │   │   ├── QuickReplies.tsx
│   │   │   ├── QuickReplyManager.tsx
│   │   │   ├── ConversationFilters.tsx
│   │   │   ├── ConversationSearch.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── TagBadge.tsx
│   │   │   └── ChatDashboard.tsx
│   │   └── AdminLayout.tsx
│   │
│   ├── customer/
│   │   ├── CustomerChat.tsx
│   │   ├── CustomerChatButton.tsx
│   │   ├── CustomerMessageList.tsx
│   │   └── ContactForm.tsx
│   │
│   └── ui/
│       └── (shadcn/ui components)
│
├── hooks/
│   ├── chat/
│   │   ├── useConversations.ts
│   │   ├── useConversation.ts
│   │   ├── useMessages.ts
│   │   ├── useSendMessage.ts
│   │   ├── useQuickReplies.ts
│   │   ├── useConversationRealtime.ts
│   │   ├── useMessageRealtime.ts
│   │   ├── useCustomerContext.ts
│   │   ├── useOrderStatus.ts
│   │   └── useFileUpload.ts
│   └── use-toast.ts
│
├── lib/
│   ├── services/
│   │   ├── conversationService.ts
│   │   ├── messageService.ts
│   │   ├── orderStatusService.ts
│   │   ├── fileUploadService.ts
│   │   ├── notificationService.ts
│   │   ├── integrationService.ts
│   │   ├── quickReplyService.ts
│   │   └── migrationService.ts
│   │
│   ├── utils/
│   │   ├── messageValidation.ts
│   │   ├── fileValidation.ts
│   │   ├── dateFormatting.ts
│   │   ├── textSanitization.ts
│   │   └── templateEngine.ts
│   │
│   └── supabase.ts
│
├── types/
│   ├── chat.ts
│   ├── conversation.ts
│   ├── message.ts
│   ├── attachment.ts
│   ├── quickReply.ts
│   └── integration.ts
│
├── pages/
│   ├── admin/
│   │   ├── AdminSupportV2.tsx (main admin chat page)
│   │   └── AdminQuickReplies.tsx (quick reply management)
│   │
│   └── customer/
│       └── Support.tsx (customer support page)
│
└── test/
    ├── unit/
    │   ├── components/
    │   ├── hooks/
    │   ├── services/
    │   └── utils/
    │
    ├── integration/
    │   ├── chat-flow.test.ts
    │   ├── order-automation.test.ts
    │   └── realtime.test.ts
    │
    └── properties/
        ├── conversation.properties.test.ts
        ├── message.properties.test.ts
        ├── validation.properties.test.ts
        └── automation.properties.test.ts

supabase/
├── migrations/
│   ├── 20240320000000_create_support_tables.sql
│   ├── 20240320000001_create_quick_replies.sql
│   ├── 20240320000002_create_order_status_templates.sql
│   ├── 20240320000003_create_support_attachments.sql
│   ├── 20240320000004_create_triggers.sql
│   └── 20240320000005_create_rls_policies.sql
│
└── functions/
    ├── send-email-notification/
    │   └── index.ts
    └── process-notification-queue/
        └── index.ts
```

### Key Files Description

#### Components

**ConversationList.tsx**
- Displays list of conversations with filters and search
- Handles real-time updates
- Manages selection state

**ChatInterface.tsx**
- Main chat container
- Coordinates MessageList, MessageInput, and CustomerSidebar
- Manages conversation state

**MessageBubble.tsx**
- Renders individual messages
- Handles different message types (user, admin, system, internal)
- Displays attachments

**CustomerSidebar.tsx**
- Shows customer context (orders, quotes, subscriptions, payments)
- Lazy loads data when opened
- Provides quick actions (update order status, etc.)

**QuickReplies.tsx**
- Displays quick reply selector
- Inserts selected reply into message input
- Manages quick reply CRUD

#### Hooks

**useConversations.ts**
- Fetches and manages conversation list
- Handles filtering and search
- Subscribes to real-time updates

**useMessages.ts**
- Fetches messages for a conversation
- Implements infinite scroll pagination
- Subscribes to real-time message updates

**useSendMessage.ts**
- Handles message sending logic
- Implements optimistic updates
- Manages retry logic

**useOrderStatus.ts**
- Manages order status updates
- Triggers automatic notifications
- Updates conversation context

#### Services

**conversationService.ts**
- CRUD operations for conversations
- Search and filter logic
- Status and tag management

**messageService.ts**
- CRUD operations for messages
- Internal note management
- Read status tracking

**orderStatusService.ts**
- Order status update logic
- Template rendering
- Automatic conversation creation

**fileUploadService.ts**
- File upload to Supabase Storage
- Thumbnail generation
- File validation

**notificationService.ts**
- Email notification logic
- Online status checking
- Message batching

#### Types

**conversation.ts**
```typescript
export interface Conversation {
  id: string;
  user_id: string;
  subject: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  tag?: ConversationTag;
  assigned_to?: string;
  first_response_at?: string;
  resolved_at?: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  order_id?: string;
  quote_id?: string;
  subscription_id?: string;
  payment_id?: string;
}

export type ConversationStatus = 
  | 'new' 
  | 'waiting_admin' 
  | 'waiting_customer' 
  | 'resolved' 
  | 'closed';

export type ConversationPriority = 
  | 'low' 
  | 'normal' 
  | 'high' 
  | 'urgent';

export type ConversationTag = 
  | 'pedido' 
  | 'orcamento' 
  | 'duvida' 
  | 'reclamacao' 
  | 'assinatura';
```

**message.ts**
```typescript
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: MessageSenderType;
  message: string;
  is_internal: boolean;
  read_by_admin: boolean;
  read_by_customer: boolean;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  attachments?: Attachment[];
}

export type MessageSenderType = 
  | 'admin' 
  | 'customer' 
  | 'system';

export interface SendMessageData {
  conversation_id: string;
  message: string;
  is_internal?: boolean;
  attachments?: File[];
}
```

## Data Flow Diagrams

### 1. Message Sending Flow

```
User Types Message
       ↓
Validate Input (client-side)
       ↓
[Valid?] → No → Display Error
       ↓ Yes
Optimistic UI Update (show "sending")
       ↓
Send to Supabase
       ↓
[Success?] → No → Rollback UI, Show Error, Allow Retry
       ↓ Yes
Update UI (show "sent")
       ↓
Trigger: Update conversation.last_message_at
       ↓
Trigger: Update conversation.status
       ↓
Realtime: Notify other clients
       ↓
[Recipient Online?] → Yes → Show in UI
       ↓ No
Queue Email Notification
```

### 2. Order Status Automation Flow

```
Admin Updates Order Status
       ↓
Update manual_payments.status
       ↓
Trigger: notify_order_status_change()
       ↓
[Conversation Exists?] → No → Create Conversation
       ↓ Yes
Fetch Template for Status
       ↓
Render Template with Order Data
       ↓
Insert System Message
       ↓
Trigger: Update conversation.last_message_at
       ↓
Realtime: Notify Customer
       ↓
[Customer Online?] → Yes → Show in Chat
       ↓ No
Send Email Notification
```

### 3. Real-time Update Flow

```
Database Change (INSERT/UPDATE)
       ↓
PostgreSQL Trigger
       ↓
Supabase Realtime
       ↓
WebSocket Broadcast
       ↓
Client Subscription Handler
       ↓
[Event Type?]
  ├─ INSERT → Add to Local State
  ├─ UPDATE → Update Local State
  └─ DELETE → Remove from Local State
       ↓
React State Update
       ↓
Component Re-render
       ↓
UI Updates
```

### 4. File Upload Flow

```
User Selects File
       ↓
Validate Type & Size (client-side)
       ↓
[Valid?] → No → Display Error
       ↓ Yes
[Is Image?] → Yes → Generate Thumbnail
       ↓
Show Upload Progress
       ↓
Upload to Supabase Storage
       ↓
[Success?] → No → Display Error, Allow Retry
       ↓ Yes
Insert Attachment Record
       ↓
Link to Message
       ↓
Display in Chat
```

### 5. Customer Context Loading Flow

```
Admin Opens Conversation
       ↓
Load Conversation Data
       ↓
Display Chat Interface
       ↓
[Sidebar Opened?] → No → Wait
       ↓ Yes
Fetch Customer Orders (parallel)
Fetch Customer Quotes (parallel)
Fetch Customer Subscription (parallel)
Fetch Customer Payments (parallel)
       ↓
Display in Sidebar
       ↓
Subscribe to Real-time Updates
       ↓
[Status Changes?] → Yes → Update Sidebar
```

### 6. Contact Form Submission Flow

```
Visitor Fills Form
       ↓
Validate Required Fields
       ↓
[Valid?] → No → Display Errors
       ↓ Yes
Submit to API
       ↓
Create Conversation (tag: 'duvida')
       ↓
Create Initial Message
       ↓
Generate Unique Link
       ↓
Send Confirmation Email
       ↓
Notify Admin (Realtime)
       ↓
Display Success Message
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- Database migrations (tables, triggers, RLS)
- Base services (conversation, message)
- Type definitions
- Basic components (ConversationList, ChatInterface, MessageBubble)

### Phase 2: Admin Interface (Week 2)
- Complete admin chat page
- Message sending/receiving
- Real-time subscriptions
- Filters and search
- Status and tag management

### Phase 3: Automation (Week 3) ⭐ PRIORITY
- Order status automation
- Template system
- Automatic conversation creation
- System messages

### Phase 4: Customer Interface (Week 4)
- Customer chat component
- Contact form
- Email notifications
- Unread count badge

### Phase 5: Advanced Features (Week 5)
- File attachments
- Internal notes
- Quick replies
- Customer sidebar (orders, quotes, etc.)

### Phase 6: Polish & Testing (Week 6)
- Error handling refinement
- Performance optimization
- Comprehensive testing
- Migration script
- Documentation

## Performance Considerations

### Optimization Strategies

1. **Pagination**: Load messages in chunks of 50
2. **Lazy Loading**: Load customer context only when sidebar opens
3. **Debouncing**: Debounce search input (300ms)
4. **Caching**: Use React Query for data caching
5. **Optimistic Updates**: Update UI immediately, sync with server
6. **Virtual Scrolling**: For very long conversation lists (if needed)
7. **Image Optimization**: Compress images before upload, use thumbnails

### Database Indexes

All critical queries have indexes:
- `support_conversations(last_message_at DESC)` - conversation list
- `support_conversations(user_id)` - user's conversations
- `support_conversations(status)` - status filtering
- `support_messages(conversation_id, created_at)` - message history
- `support_messages(conversation_id) WHERE read_by_admin = false` - unread count

### Real-time Connection Management

- Single Supabase client instance
- Reuse channels when possible
- Clean up subscriptions on unmount
- Automatic reconnection on connection loss
- Fallback to polling if realtime fails

## Security Considerations

### Row Level Security (RLS)

All tables have RLS policies:

**support_conversations:**
- Admins see all conversations
- Users see only their own conversations

**support_messages:**
- Admins see all messages
- Users see only messages in their conversations
- Internal notes (`is_internal = true`) visible only to admins

**support_attachments:**
- Same as messages (linked via message_id)

**quick_replies:**
- Admins can CRUD
- No public access

### Input Sanitization

All user input is sanitized:
- HTML tags stripped from messages
- SQL injection prevented by Supabase parameterized queries
- XSS prevention via React's built-in escaping
- File upload validation (type, size, content)

### Authentication

- All chat endpoints require authentication
- Session validation on every request
- Automatic logout on session expiration
- CSRF protection via Supabase

### Audit Logging

All admin actions logged:
- Status changes
- Tag assignments
- Internal note creation/editing/deletion
- Order status updates
- Quick reply management

## Deployment Checklist

- [ ] Run all database migrations
- [ ] Seed order status templates
- [ ] Configure Supabase Storage bucket for attachments
- [ ] Set up email templates in Supabase
- [ ] Configure RLS policies
- [ ] Run migration script for existing data
- [ ] Test real-time subscriptions
- [ ] Verify email notifications work
- [ ] Load test with expected volume (200 conversations/month)
- [ ] Security audit
- [ ] Performance testing
- [ ] Documentation for admins
- [ ] Training for support team

