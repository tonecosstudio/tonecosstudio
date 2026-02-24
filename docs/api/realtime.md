# ⚡ Realtime System - Ordax

Documentação completa do sistema de real-time (Supabase Realtime).

---

## 📋 Visão Geral

O sistema de real-time usa Supabase Realtime (WebSocket) para comunicação bidirecional em tempo real entre cliente e servidor.

### Tecnologia
- **Protocol**: WebSocket
- **Engine**: Phoenix Channels (Elixir)
- **Features**: Broadcast, Presence, Postgres Changes

---

## 🔌 Tipos de Real-time

### 1. Postgres Changes

Escuta mudanças no banco de dados (INSERT, UPDATE, DELETE).

**Uso**: Chat, notificações, atualizações de status

### 2. Broadcast

Envia mensagens para todos os clientes em um canal.

**Uso**: Typing indicators, presença online

### 3. Presence

Rastreia quem está online em um canal.

**Uso**: Usuários online, status de conexão

---

## 💬 Chat Real-time

### Mensagens Instantâneas

**Tabela**: `support_messages`

**Evento**: INSERT

**Implementação**:
```typescript
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

function useChatRealtime(conversationId: string) {
  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('New message:', payload.new);
          // Adicionar mensagem à lista
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);
}
```

### Typing Indicator

**Canal**: Broadcast

**Implementação**:
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

function useTypingIndicator(conversationId: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, isTyping } = payload.payload;
        
        setTypingUsers(prev => {
          if (isTyping) {
            return [...new Set([...prev, userId])];
          } else {
            return prev.filter(id => id !== userId);
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const startTyping = () => {
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, isTyping: true }
    });
  };

  const stopTyping = () => {
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, isTyping: false }
    });
  };

  return { typingUsers, startTyping, stopTyping };
}
```

### Read Receipts

**Tabela**: `support_messages`

**Evento**: UPDATE

**Implementação**:
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'support_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        if (payload.new.read_at) {
          // Mensagem foi lida
          updateMessageReadStatus(payload.new.id);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [conversationId]);
```

---

## 👥 Grupos Real-time

### Mensagens de Grupo

**Tabela**: `chat_group_messages`

**Evento**: INSERT

**Implementação**:
```typescript
function useGroupMessages(groupId: string) {
  useEffect(() => {
    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          // Nova mensagem no grupo
          addMessage(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);
}
```

### Membros Online

**Canal**: Presence

**Implementação**:
```typescript
function useGroupPresence(groupId: string) {
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel(`presence:group:${groupId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const members = Object.keys(state);
        setOnlineMembers(members);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('User joined:', key);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('User left:', key);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUserId,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  return { onlineMembers };
}
```

---

## 🔔 Notificações Real-time

### Novas Notificações

**Tabela**: `notifications`

**Evento**: INSERT

**Implementação**:
```typescript
function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`
        },
        (payload) => {
          // Nova notificação
          setNotifications(prev => [payload.new, ...prev]);
          
          // Mostrar toast
          toast({
            title: payload.new.title,
            description: payload.new.message
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return { notifications };
}
```

### Badge de Contador

**Implementação**:
```typescript
function useNotificationCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Buscar contagem inicial
    const fetchCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUserId)
        .is('read_at', null);
      
      setCount(count || 0);
    };

    fetchCount();

    // Escutar mudanças
    const channel = supabase
      .channel('notification-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return { count };
}
```

---

## 💳 Pagamentos Real-time

### Status de Pagamento

**Tabela**: `manual_payment_links`

**Evento**: UPDATE

**Implementação**:
```typescript
function usePaymentStatus(paymentId: string) {
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    const channel = supabase
      .channel(`payment:${paymentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'manual_payment_links',
          filter: `id=eq.${paymentId}`
        },
        (payload) => {
          setStatus(payload.new.status);
          
          if (payload.new.status === 'paid') {
            toast({
              title: 'Pagamento Confirmado!',
              description: 'Seu pagamento foi processado com sucesso.'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paymentId]);

  return { status };
}
```

---

## 📦 Produção Real-time

### Status de Produção

**Tabela**: `preorders`

**Evento**: UPDATE

**Implementação**:
```typescript
function useProductionStatus(preorderId: string) {
  const [stage, setStage] = useState('');

  useEffect(() => {
    const channel = supabase
      .channel(`production:${preorderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'preorders',
          filter: `id=eq.${preorderId}`
        },
        (payload) => {
          setStage(payload.new.production_stage);
          
          // Notificar mudança de estágio
          toast({
            title: 'Atualização de Produção',
            description: `Seu pedido está em: ${payload.new.production_stage}`
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [preorderId]);

  return { stage };
}
```

---

## 🔧 Configuração

### Habilitar Realtime em Tabelas

```sql
-- No Supabase Dashboard > Database > Replication
-- Ou via SQL:

ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Configurar RLS

As políticas RLS se aplicam ao Realtime:

```sql
-- Usuários só recebem eventos de suas próprias mensagens
CREATE POLICY "Users receive own messages"
ON support_messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM support_conversations
    WHERE user_id = auth.uid()
  )
);
```

---

## 🎯 Padrões de Uso

### Hook Customizado

```typescript
// src/hooks/use-realtime.ts
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onPayload: (payload: any) => void;
}

export function useRealtime({
  table,
  event,
  filter,
  onPayload
}: UseRealtimeOptions) {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          ...(filter && { filter })
        },
        onPayload
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, filter]);
}
```

**Uso**:
```typescript
useRealtime({
  table: 'support_messages',
  event: 'INSERT',
  filter: `conversation_id=eq.${conversationId}`,
  onPayload: (payload) => {
    addMessage(payload.new);
  }
});
```

---

## 🔍 Debugging

### Ver Canais Ativos

```typescript
const channels = supabase.getChannels();
console.log('Active channels:', channels);
```

### Ver Estado do Canal

```typescript
const channel = supabase.channel('my-channel');
console.log('Channel state:', channel.state);
// 'closed' | 'errored' | 'joined' | 'joining' | 'leaving'
```

### Logs de Eventos

```typescript
const channel = supabase
  .channel('debug-channel')
  .on('*', (payload) => {
    console.log('Event:', payload);
  })
  .subscribe((status) => {
    console.log('Subscription status:', status);
  });
```

---

## ⚡ Performance

### Otimizações

1. **Reusar Canais**: Não criar múltiplos canais para mesma tabela
2. **Filtros Específicos**: Usar filtros para reduzir eventos
3. **Cleanup**: Sempre remover canais no cleanup
4. **Debounce**: Debounce em eventos frequentes (typing)

**Exemplo**:
```typescript
// ❌ Ruim - Múltiplos canais
useEffect(() => {
  const channel1 = supabase.channel('messages-1')...
  const channel2 = supabase.channel('messages-2')...
}, []);

// ✅ Bom - Canal único com filtros
useEffect(() => {
  const channel = supabase
    .channel('messages')
    .on('postgres_changes', { filter: 'conversation_id=eq.1' }, ...)
    .on('postgres_changes', { filter: 'conversation_id=eq.2' }, ...)
    .subscribe();
}, []);
```

---

## 🐛 Troubleshooting

### Eventos não chegam

**Possíveis causas**:
1. Tabela não habilitada para Realtime
2. RLS bloqueando eventos
3. Canal não subscrito corretamente

**Solução**:
```typescript
// 1. Verificar se tabela está habilitada
// Supabase Dashboard > Database > Replication

// 2. Verificar RLS
// SELECT * FROM table WHERE filter; -- Deve retornar dados

// 3. Verificar subscription
const channel = supabase.channel('test');
channel.subscribe((status) => {
  console.log('Status:', status); // Deve ser 'SUBSCRIBED'
});
```

### Múltiplos eventos duplicados

**Causa**: Múltiplas subscriptions para mesmo evento

**Solução**:
```typescript
// ✅ Usar cleanup correto
useEffect(() => {
  const channel = supabase.channel('unique-name')...
  
  return () => {
    supabase.removeChannel(channel);
  };
}, [dependencies]); // Dependências corretas
```

### Conexão perdida

**Causa**: Rede instável

**Solução**: Reconexão automática (built-in no Supabase)

```typescript
// Opcional: Detectar reconexão
const channel = supabase
  .channel('my-channel')
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Connected!');
    } else if (status === 'CHANNEL_ERROR') {
      console.log('Connection error, retrying...');
    }
  });
```

---

## 📚 Referências

### Código-Fonte

**Hooks**:
- `src/hooks/use-realtime.ts`
- `src/hooks/use-conversation-realtime.ts`
- `src/hooks/useTypingIndicator.ts`
- `src/hooks/useGroupMessages.ts`

**Documentação**:
- `src/hooks/REALTIME_HOOKS_GUIDE.md`

### Documentação Oficial

- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Realtime Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- [Realtime Presence](https://supabase.com/docs/guides/realtime/presence)
- [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)

---

## 🎯 Melhores Práticas

### 1. Sempre fazer cleanup

```typescript
useEffect(() => {
  const channel = supabase.channel('my-channel')...
  
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### 2. Usar filtros específicos

```typescript
// ✅ Bom
filter: `user_id=eq.${userId}`

// ❌ Ruim - Recebe todos os eventos
// Sem filter
```

### 3. Debounce eventos frequentes

```typescript
const debouncedTyping = debounce(() => {
  channel.send({ type: 'broadcast', event: 'typing', ... });
}, 300);
```

### 4. Tratar erros

```typescript
channel.subscribe((status, error) => {
  if (status === 'CHANNEL_ERROR') {
    console.error('Realtime error:', error);
    // Mostrar mensagem ao usuário
  }
});
```

### 5. Otimizar re-renders

```typescript
// ✅ Usar useCallback
const handleMessage = useCallback((payload) => {
  setMessages(prev => [...prev, payload.new]);
}, []);

useRealtime({
  onPayload: handleMessage // Não recria a cada render
});
```

---

**Última atualização**: 2026-02-24  
**Versão**: 1.0.0  
**Status**: ✅ Produção
