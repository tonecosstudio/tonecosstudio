# 🏗️ Arquitetura - Ordax

Visão geral da arquitetura e tecnologias da plataforma Ordax.

---

## 📊 Visão Geral

**Ordax** é uma plataforma web moderna para catálogo e gestão de colecionáveis premium, desenvolvida pela **Tonecos Studios**.

### Características Principais
- **SPA (Single Page Application)** com React
- **Backend Serverless** com Supabase
- **Real-time** para chat e notificações
- **Type-safe** com TypeScript
- **Responsive** e acessível

---

## 🎯 Stack Tecnológico

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript** - Type safety
- **Vite** - Build tool e dev server
- **React Router** - Roteamento
- **TanStack Query** - Data fetching e cache
- **Tailwind CSS** - Styling
- **shadcn/ui** - Componentes UI
- **Radix UI** - Primitivos acessíveis

### Backend
- **Supabase** - Backend-as-a-Service
  - **PostgreSQL** - Banco de dados
  - **PostgREST** - API REST automática
  - **GoTrue** - Autenticação
  - **Realtime** - WebSockets
  - **Storage** - Armazenamento de arquivos
  - **Edge Functions** - Serverless functions (Deno)

### Integrações
- **OpenAI GPT-4o-mini** - Classificação de imagens
- **Google OAuth** - Login social
- **Email** - Notificações (via Supabase)

---

## 🏛️ Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Pages   │  │Components│  │  Hooks   │  │ Services│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │              │             │      │
│       └─────────────┴──────────────┴─────────────┘      │
│                         │                                │
│                    TanStack Query                        │
│                         │                                │
└─────────────────────────┼────────────────────────────────┘
                          │
                          │ HTTPS / WebSocket
                          │
┌─────────────────────────┼────────────────────────────────┐
│                    SUPABASE                               │
│  ┌──────────────────────┴─────────────────────────────┐  │
│  │              PostgREST API                          │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │                                │
│  ┌──────────┐  ┌───────┴──────┐  ┌──────────┐          │
│  │ GoTrue   │  │  PostgreSQL  │  │ Realtime │          │
│  │  (Auth)  │  │   (Database) │  │(WebSocket│          │
│  └──────────┘  └──────────────┘  └──────────┘          │
│                                                          │
│  ┌──────────┐  ┌──────────────┐                         │
│  │ Storage  │  │Edge Functions│                         │
│  │ (Files)  │  │    (Deno)    │                         │
│  └──────────┘  └──────────────┘                         │
└──────────────────────────────────────────────────────────┘
                          │
                          │ API Calls
                          │
┌─────────────────────────┼────────────────────────────────┐
│                  INTEGRAÇÕES                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ OpenAI   │  │  Google  │  │  Email   │               │
│  │   API    │  │  OAuth   │  │  SMTP    │               │
│  └──────────┘  └──────────┘  └──────────┘               │
└──────────────────────────────────────────────────────────┘
```

---

## 📦 Estrutura de Módulos

### Frontend Modules

```
src/
├── components/          # Componentes React
│   ├── admin/          # Painel administrativo
│   ├── chat/           # Sistema de chat
│   ├── groups/         # Grupos de comunicação
│   ├── customer/       # Área do cliente
│   ├── collections/    # Coleções
│   ├── production/     # Produção
│   └── ui/             # Componentes UI base
│
├── pages/              # Páginas/Rotas
│   ├── admin/          # Rotas admin
│   └── catalog/        # Rotas catálogo
│
├── lib/                # Lógica de negócio
│   ├── services/       # Serviços
│   ├── utils/          # Utilitários
│   ├── validations/    # Validações
│   └── permissions/    # Controle de acesso
│
├── hooks/              # React Hooks
├── integrations/       # Integrações externas
│   └── supabase/       # Cliente Supabase
│
└── types/              # TypeScript types
```

### Backend Modules

```
supabase/
├── functions/          # Edge Functions
│   ├── admin-list-users/
│   ├── admin-promote/
│   ├── analyze-preferences/
│   ├── auto-sync-groups/
│   ├── classify-image-vision/
│   ├── create-subscription/
│   ├── send-email/
│   └── send-group-emails-batch/
│
└── migrations/         # Database migrations
    └── [timestamp]_[description].sql
```

---

## 🗄️ Modelo de Dados

### Principais Entidades

#### Usuários e Autenticação
- `auth.users` - Usuários (Supabase Auth)
- `profiles` - Perfis de usuário
- `user_roles` - Papéis e permissões

#### Catálogo
- `characters` - Personagens/modelos
- `franchises` - Franquias
- `collections` - Coleções
- `collection_characters` - Relação coleção-personagem

#### Assinaturas e Pagamentos
- `subscription_plans` - Planos de assinatura
- `subscriptions` - Assinaturas ativas
- `subscription_collections` - Coleções por assinatura
- `payment_methods` - Métodos de pagamento
- `manual_payment_links` - Links de pagamento manual

#### Chat e Suporte
- `support_conversations` - Conversas de suporte
- `support_messages` - Mensagens
- `support_attachments` - Anexos
- `quick_replies` - Respostas rápidas
- `order_status_templates` - Templates de status

#### Grupos
- `chat_groups` - Grupos de comunicação
- `chat_group_members` - Membros dos grupos
- `chat_group_messages` - Mensagens dos grupos
- `chat_group_attachments` - Anexos dos grupos

#### Orçamentos e Pedidos
- `quotes` - Orçamentos
- `quote_items` - Itens do orçamento
- `preorders` - Pré-pedidos
- `order_production_stages` - Estágios de produção

#### Sistema
- `likes` - Curtidas
- `wishlist` - Lista de desejos
- `notifications` - Notificações
- `coupons` - Cupons de desconto
- `bulk_operations` - Operações em lote

---

## 🔐 Segurança

### Row Level Security (RLS)

Todas as tabelas possuem políticas RLS para garantir isolamento de dados:

```sql
-- Exemplo: Usuários só veem seus próprios dados
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Exemplo: Admins veem tudo
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### Autenticação

- **JWT Tokens** - Supabase Auth
- **Session Management** - Automático
- **OAuth** - Google (configurável)
- **Email/Password** - Padrão

### Validação

- **Frontend** - React Hook Form + Zod
- **Backend** - PostgreSQL constraints + triggers
- **Sanitização** - DOMPurify para XSS

---

## 🔄 Fluxo de Dados

### Leitura de Dados

```
1. Componente React
   ↓
2. TanStack Query Hook
   ↓
3. Supabase Client
   ↓
4. PostgREST API
   ↓
5. PostgreSQL (com RLS)
   ↓
6. Retorno via cache
   ↓
7. Renderização
```

### Escrita de Dados

```
1. Ação do Usuário
   ↓
2. Service Function
   ↓
3. Validação (Zod)
   ↓
4. Supabase Client
   ↓
5. PostgREST API
   ↓
6. PostgreSQL (com RLS + triggers)
   ↓
7. Invalidação de cache
   ↓
8. Re-fetch automático
```

### Real-time

```
1. Subscription no componente
   ↓
2. Supabase Realtime
   ↓
3. WebSocket connection
   ↓
4. Eventos do banco
   ↓
5. Broadcast para clientes
   ↓
6. Update automático da UI
```

---

## 🚀 Performance

### Otimizações Implementadas

#### Frontend
- **Code Splitting** - Lazy loading de rotas
- **Image Optimization** - Lazy loading + compression
- **Memoization** - React.memo, useMemo, useCallback
- **Virtual Lists** - Para listas grandes
- **Debouncing** - Em buscas e inputs

#### Backend
- **Indexes** - Em colunas frequentemente consultadas
- **Materialized Views** - Para queries complexas
- **Connection Pooling** - Supabase Pooler
- **Edge Functions** - Deploy global (Deno Deploy)

#### Cache
- **TanStack Query** - Cache automático de queries
- **Stale-While-Revalidate** - Dados sempre disponíveis
- **Optimistic Updates** - UI responsiva

---

## 📡 Real-time

### Sistemas Real-time

1. **Chat/Suporte**
   - Mensagens instantâneas
   - Typing indicators
   - Read receipts

2. **Notificações**
   - Notificações de sistema
   - Badges de contagem
   - Toast messages

3. **Grupos**
   - Mensagens de grupo
   - Membros online
   - Atualizações de status

4. **Pagamentos**
   - Status de pagamento
   - Confirmações
   - Atualizações de pedido

### Implementação

```typescript
// Exemplo: Subscribe to messages
const { data, error } = useQuery({
  queryKey: ['messages', conversationId],
  queryFn: () => fetchMessages(conversationId)
});

// Real-time subscription
useEffect(() => {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'support_messages',
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      queryClient.setQueryData(['messages', conversationId], (old) => 
        [...old, payload.new]
      );
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [conversationId]);
```

---

## 🧪 Testes

### Estratégia de Testes

- **Unit Tests** - Vitest
- **Component Tests** - React Testing Library
- **Integration Tests** - Vitest + jsdom
- **E2E Tests** - Vitest (simulado)

### Coverage

- **XSS Protection**: 42 testes
- **Error Boundaries**: 17 testes
- **Services**: ~30 testes
- **Components**: ~20 testes

**Total**: 59+ testes automatizados

---

## 📦 Deploy

### Ambientes

- **Development**: Local (localhost:8080)
- **Staging**: Vercel Preview
- **Production**: Vercel + Supabase

### CI/CD

```
1. Push to GitHub
   ↓
2. GitHub Actions (opcional)
   ↓
3. Vercel Build
   ↓
4. Deploy automático
   ↓
5. Supabase Migrations (manual)
```

---

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Sentry (opcional)
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# App
VITE_APP_VERSION=1.0.0
```

### Supabase Config

```toml
# supabase/config.toml
[api]
enabled = true
port = 54321
max_rows = 1000

[db]
port = 54322
major_version = 15

[studio]
enabled = true
port = 54323
```

---

## 📚 Padrões e Convenções

### Nomenclatura

- **Componentes**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase com prefixo `use` (`useAuth.ts`)
- **Services**: camelCase (`authService.ts`)
- **Types**: PascalCase (`User`, `Subscription`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)

### Estrutura de Arquivos

```
ComponentName/
├── ComponentName.tsx        # Componente principal
├── ComponentName.test.tsx   # Testes
├── ComponentName.types.ts   # Types (se necessário)
└── index.ts                 # Re-export
```

### Imports

```typescript
// 1. External
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal (@/)
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

// 3. Relative
import { UserCard } from './UserCard';
import type { User } from './types';
```

---

## 🎯 Próximos Passos

- **[Guia de Desenvolvimento](development/setup.md)** - Setup detalhado
- **[Funcionalidades](features/chat-system.md)** - Sistemas implementados
- **[API Reference](api/edge-functions.md)** - Documentação de API
- **[Deploy Guide](deployment.md)** - Como fazer deploy

---

**Última atualização**: 2026-02-24  
**Versão**: 1.0.0
