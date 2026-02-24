# Guia de Hooks de Realtime para Sistema de Pagamento

## Visão Geral

Este guia documenta os hooks de realtime implementados para o sistema de pagamento manual. Os hooks usam Supabase Realtime para fornecer atualizações em tempo real de pagamentos e conversas, com tratamento robusto de erros, reconexão automática e backoff exponencial.

## Hooks Disponíveis

### 1. `usePaymentRealtime` - Hook Principal para Pagamentos

**Propósito:** Assinar mudanças na tabela `manual_payments`.

**Importação:**

```typescript
import { usePaymentRealtime } from "@/hooks/use-realtime";
```

**Uso Básico:**

```typescript
const { isConnected, isReconnecting, error, disconnect, reconnect } = usePaymentRealtime({
  paymentId: "payment-id", // Opcional: filtrar por ID específico
  userId: "user-id", // Opcional: filtrar por usuário
  status: "pending", // Opcional: filtrar por status
  events: ["INSERT", "UPDATE", "DELETE"], // Eventos para assinar
  onPaymentChange: (payload) => {
    console.log("Mudança recebida:", payload.event, payload.new);
  },
});
```

**Opções:**

- `paymentId`: ID do pagamento específico
- `userId`: ID do usuário para filtrar
- `status`: Status ou array de status para filtrar
- `events`: Eventos para assinar (INSERT, UPDATE, DELETE, \*)
- `reconnectionConfig`: Configuração personalizada de reconexão
- `onPaymentChange`: Callback quando há mudança
- `onConnected`: Callback quando conectado
- `onDisconnected`: Callback quando desconectado

### 2. `useConversationRealtime` - Hook Principal para Conversas

**Propósito:** Assinar mudanças nas tabelas `support_messages` e `support_conversations`.

**Importação:**

```typescript
import { useConversationRealtime } from "@/hooks/use-realtime";
```

**Uso Básico:**

```typescript
const { isConnected, isReconnecting, error } = useConversationRealtime({
  conversationId: "conv-id", // Opcional: filtrar por conversa
  userId: "user-id", // Opcional: filtrar por usuário
  paymentId: "payment-id", // Opcional: filtrar por pagamento
  subscribeToMessages: true, // Assinar mensagens (padrão)
  subscribeToConversations: false, // Assinar conversas
  onNewMessage: (message) => {
    console.log("Nova mensagem:", message);
  },
  onMessageUpdate: (message, oldMessage) => {
    console.log("Mensagem atualizada:", message);
  },
});
```

### 3. Hooks Especializados

#### `usePaymentStatusRealtime`

Assina apenas mudanças de status de um pagamento específico.

```typescript
const { isConnected } = usePaymentStatusRealtime("payment-id", (newStatus, oldStatus, payment) => {
  console.log(`Status mudou: ${oldStatus} → ${newStatus}`);
});
```

#### `useNewPaymentsRealtime`

Assina apenas novos pagamentos de um usuário.

```typescript
const { isConnected } = useNewPaymentsRealtime("user-id", (payment) => {
  console.log("Novo pagamento:", payment);
});
```

#### `useConversationMessagesRealtime`

Assina apenas novas mensagens de uma conversa.

```typescript
const { isConnected } = useConversationMessagesRealtime("conversation-id", (message) => {
  console.log("Nova mensagem:", message);
});
```

#### `useMessageReadRealtime`

Assina quando mensagens são marcadas como lidas.

```typescript
const { isConnected } = useMessageReadRealtime(
  "conversation-id",
  (message, wasReadByCustomer, wasReadByAdmin) => {
    console.log("Mensagem lida:", message.id);
  }
);
```

### 4. Hooks Combinados

#### `usePaymentSystemRealtime`

Combina assinaturas de pagamento e conversa.

```typescript
const { isConnected, paymentConnected, conversationConnected, disconnectAll, reconnectAll } =
  usePaymentSystemRealtime({
    paymentOptions: {
      /* opções de pagamento */
    },
    conversationOptions: {
      /* opções de conversa */
    },
  });
```

#### `usePaymentWithConversationRealtime`

Assina um pagamento específico e sua conversa associada.

```typescript
const { isConnected } = usePaymentWithConversationRealtime(
  "payment-id",
  (payment, oldPayment) => {
    /* pagamento atualizado */
  },
  (conversation) => {
    /* conversa atualizada */
  },
  (message) => {
    /* nova mensagem */
  }
);
```

#### `useUserPaymentsRealtime`

Assina todos os pagamentos e conversas de um usuário.

```typescript
const { isConnected } = useUserPaymentsRealtime(
  "user-id",
  (payment) => {
    /* novo pagamento */
  },
  (paymentId, newStatus, oldStatus) => {
    /* status mudou */
  },
  (message) => {
    /* nova mensagem */
  }
);
```

#### `useAdminDashboardRealtime`

Assina todos os pagamentos pendentes e novas mensagens (para dashboard admin).

```typescript
const { isConnected } = useAdminDashboardRealtime(
  (payment) => {
    /* novo pagamento */
  },
  (paymentId, newStatus, oldStatus) => {
    /* status mudou */
  },
  (message) => {
    /* nova mensagem */
  }
);
```

## Configuração de Reconexão

Os hooks implementam backoff exponencial para reconexão automática:

**Configuração Padrão:**

```typescript
{
  maxRetries: 10,      // Máximo de tentativas
  baseDelayMs: 1000,   // Delay base (1 segundo)
  backoffFactor: 2,    // Fator de multiplicação
  maxDelayMs: 30000,   // Delay máximo (30 segundos)
}
```

**Configuração Personalizada:**

```typescript
usePaymentRealtime({
  reconnectionConfig: {
    maxRetries: 5,
    baseDelayMs: 2000,
    backoffFactor: 1.5,
    maxDelayMs: 60000,
  },
});
```

## Tratamento de Erros

Os hooks fornecem informações detalhadas de erro:

```typescript
const { error, isConnected, isReconnecting } = usePaymentRealtime();

if (error) {
  console.error("Erro de conexão:", error.message);
}

if (isReconnecting) {
  // Mostrar indicador de reconexão
}
```

## Boas Práticas

### 1. Otimização de Performance

- Use filtros específicos (`paymentId`, `userId`, `status`) para reduzir tráfego
- Assine apenas os eventos necessários (`events` option)
- Desconecte quando o componente não estiver visível

### 2. Gerenciamento de Estado

- Use callbacks para atualizar estado local
- Implemente debounce para atualizações frequentes
- Limpe assinaturas no cleanup do useEffect

### 3. Experiência do Usuário

- Mostre indicadores de conexão/desconexão
- Forneça botão de reconexão manual
- Cache dados locais para fallback offline

## Exemplos de Casos de Uso

### Dashboard Admin

```typescript
function AdminDashboard() {
  const { isConnected } = useAdminDashboardRealtime(
    (payment) => {
      // Adicionar novo pagamento à lista
    },
    (paymentId, newStatus, oldStatus) => {
      // Atualizar status na lista
    }
  );

  return (
    <div>
      <RealtimeStatusBadge />
      {/* Lista de pagamentos atualizada em tempo real */}
    </div>
  );
}
```

### Detalhes do Pagamento (Cliente)

```typescript
function CustomerPaymentDetails({ paymentId }) {
  const [payment, setPayment] = useState(null);

  usePaymentStatusRealtime(paymentId, (newStatus, oldStatus, updatedPayment) => {
    setPayment(updatedPayment);
    showToast(`Status atualizado: ${oldStatus} → ${newStatus}`);
  });

  return (
    <div>
      {payment && (
        <PaymentStatusBadge status={payment.status} />
      )}
    </div>
  );
}
```

### Chat de Suporte

```typescript
function SupportChat({ conversationId }) {
  const [messages, setMessages] = useState([]);

  useConversationMessagesRealtime(conversationId, (newMessage) => {
    setMessages(prev => [...prev, newMessage]);
    playNotificationSound();
  });

  return (
    <div>
      {messages.map(message => (
        <Message key={message.id} message={message} />
      ))}
    </div>
  );
}
```

## Integração com Componentes Existentes

### Atualizar `CustomerPaymentDetails`

```typescript
// No componente CustomerPaymentDetails.tsx
import { usePaymentStatusRealtime } from "@/hooks/use-realtime";

function CustomerPaymentDetails({ paymentId }) {
  // Hook existente para buscar dados
  const { data: payment, isLoading } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => getPaymentById(paymentId),
  });

  // Hook de realtime para atualizações
  usePaymentStatusRealtime(paymentId, (newStatus, oldStatus, updatedPayment) => {
    // Atualizar dados locais ou invalidar query
    queryClient.setQueryData(["payment", paymentId], updatedPayment);
  });

  // Resto do componente...
}
```

### Atualizar Dashboard Admin

```typescript
// No componente PaymentDashboard
import { useAdminDashboardRealtime } from "@/hooks/use-realtime";

function PaymentDashboard() {
  const queryClient = useQueryClient();

  useAdminDashboardRealtime(
    (newPayment) => {
      // Adicionar à lista otimisticamente
      queryClient.setQueryData(["payments", "pending"], (old: any) => [newPayment, ...(old || [])]);
    },
    (paymentId, newStatus, oldStatus) => {
      // Remover da lista se aprovado/rejeitado
      if (newStatus === "approved" || newStatus === "rejected") {
        queryClient.setQueryData(
          ["payments", "pending"],
          (old: any) => old?.filter((p) => p.id !== paymentId) || []
        );
      }
    }
  );

  // Resto do componente...
}
```

## Testes

Os hooks incluem testes abrangentes:

```bash
# Executar testes dos hooks
npm test -- use-payment-realtime.test.ts
npm test -- use-conversation-realtime.test.ts
```

## Solução de Problemas

### Conexão Não Estabelecida

1. Verifique se o Supabase Realtime está habilitado
2. Confirme permissões RLS para as tabelas
3. Verifique filtros muito restritivos

### Reconexão Excessiva

1. Ajuste `reconnectionConfig.maxRetries`
2. Verifique estabilidade da rede
3. Considere aumentar `baseDelayMs`

### Performance

1. Use filtros específicos
2. Limite número de assinaturas simultâneas
3. Implemente debounce em callbacks frequentes

## Requisitos Atendidos

Estes hooks atendem aos requisitos 16.1-16.15 do sistema de pagamento manual:

- ✅ 16.1: Usar Supabase Realtime
- ✅ 16.2: Broadcast de mudanças de status
- ✅ 16.3-16.7: Atualização em tempo real de interfaces
- ✅ 16.8: Indicador visual de atualizações
- ✅ 16.9-16.11: Tratamento de perda de conexão e reconexão
- ✅ 16.12: Otimização de assinaturas
- ✅ 16.13: Unsubscribe ao navegar
- ✅ 16.14: Backoff exponencial
- ✅ 16.15: Debounce para evitar thrashing

## Próximos Passos

1. **Integração com componentes existentes**: Atualizar `CustomerPaymentDetails`, `PaymentDashboard`, etc.
2. **Otimização de performance**: Implementar virtualização para listas grandes
3. **Offline support**: Cache local e sincronização quando online
4. **Monitoramento**: Logs e métricas de uso do realtime
5. **Testes E2E**: Cenários completos de conexão/desconexão
