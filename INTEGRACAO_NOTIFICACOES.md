# 🔔 Guia de Integração - Sistema de Notificações

**Data:** 26 de Fevereiro de 2026  
**Versão:** 1.0.0

---

## 🎯 Objetivo

Este guia mostra como integrar o sistema de notificações com os eventos do seu sistema para que novos usuários recebam notificações automaticamente.

---

## ✅ O Que Já Está Pronto

- ✅ Sistema de notificações completo
- ✅ Configurações padrão automáticas para novos usuários
- ✅ Frontend com centro de notificações e histórico
- ✅ Notificações em tempo real
- ✅ 14 tipos de notificações disponíveis

---

## 📊 Tipos de Notificações Disponíveis

1. **order_status** - Status de pedidos
2. **payment_confirmed** - Pagamento confirmado
3. **payment_pending** - Pagamento pendente
4. **shipping_update** - Atualização de envio
5. **delivery_completed** - Entrega concluída
6. **subscription_renewal** - Renovação de assinatura
7. **subscription_expiring** - Assinatura expirando
8. **new_collection** - Nova coleção disponível
9. **group_message** - Mensagem em grupo
10. **group_invitation** - Convite para grupo
11. **support_response** - Resposta do suporte
12. **wishlist_available** - Item da wishlist disponível
13. **price_drop** - Queda de preço
14. **system_announcement** - Anúncio do sistema

---

## 🔧 Como Criar Notificações

### Método 1: Via RPC (Recomendado)

```typescript
import { supabase } from '@/integrations/supabase/client';

async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  relatedId?: string,
  relatedType?: string,
  actionUrl?: string,
  actionLabel?: string,
  icon?: string
) {
  const { data, error } = await supabase.rpc('create_user_notification', {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_message: message,
    p_priority: priority,
    p_related_id: relatedId || null,
    p_related_type: relatedType || null,
    p_action_url: actionUrl || null,
    p_action_label: actionLabel || null,
    p_icon: icon || null,
    p_metadata: {}
  });

  if (error) {
    console.error('Erro ao criar notificação:', error);
    return null;
  }

  return data;
}
```

### Método 2: Via SQL Direto

```sql
SELECT create_user_notification(
  'user-uuid-here'::uuid,
  'order_status'::user_notification_type,
  'Pedido Confirmado',
  'Seu pedido foi confirmado!',
  'high'::notification_priority,
  'order-uuid'::uuid,
  'orders',
  '/pedidos/order-uuid',
  'Ver Pedido',
  'Package',
  '{}'::jsonb
);
```

---

## 📦 Exemplos de Integração

### 1. Pedidos

#### Quando Pedido é Criado
```typescript
// Em: src/lib/orders.ts ou similar

export async function createOrder(orderData: OrderData) {
  // Criar pedido
  const { data: order, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single();

  if (error) throw error;

  // Criar notificação
  await supabase.rpc('create_user_notification', {
    p_user_id: orderData.user_id,
    p_type: 'order_status',
    p_title: 'Pedido Criado',
    p_message: `Seu pedido #${order.id} foi criado com sucesso!`,
    p_priority: 'medium',
    p_related_id: order.id,
    p_related_type: 'orders',
    p_action_url: `/pedidos/${order.id}`,
    p_action_label: 'Ver Pedido',
    p_icon: 'Package',
    p_metadata: {}
  });

  return order;
}
```

#### Quando Status do Pedido Muda
```typescript
export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  userId: string
) {
  // Atualizar status
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) throw error;

  // Mapear status para mensagem
  const statusMessages = {
    confirmed: 'Seu pedido foi confirmado!',
    processing: 'Seu pedido está sendo preparado.',
    shipped: 'Seu pedido foi enviado!',
    delivered: 'Seu pedido foi entregue!',
  };

  // Criar notificação
  await supabase.rpc('create_user_notification', {
    p_user_id: userId,
    p_type: newStatus === 'delivered' ? 'delivery_completed' : 'order_status',
    p_title: 'Status do Pedido Atualizado',
    p_message: statusMessages[newStatus] || `Status: ${newStatus}`,
    p_priority: newStatus === 'delivered' ? 'high' : 'medium',
    p_related_id: orderId,
    p_related_type: 'orders',
    p_action_url: `/pedidos/${orderId}`,
    p_action_label: 'Ver Pedido',
    p_icon: 'Package',
    p_metadata: {}
  });
}
```

---

### 2. Pagamentos

#### Quando Pagamento é Confirmado
```typescript
export async function confirmPayment(paymentId: string, userId: string, amount: number) {
  // Confirmar pagamento
  const { error } = await supabase
    .from('payments')
    .update({ status: 'paid' })
    .eq('id', paymentId);

  if (error) throw error;

  // Criar notificação
  await supabase.rpc('create_user_notification', {
    p_user_id: userId,
    p_type: 'payment_confirmed',
    p_title: 'Pagamento Confirmado',
    p_message: `Seu pagamento de R$ ${amount.toFixed(2)} foi confirmado com sucesso!`,
    p_priority: 'high',
    p_related_id: paymentId,
    p_related_type: 'payments',
    p_action_url: `/pagamentos/${paymentId}`,
    p_action_label: 'Ver Comprovante',
    p_icon: 'DollarSign',
    p_metadata: {}
  });
}
```

#### Quando Pagamento Está Pendente
```typescript
export async function notifyPendingPayment(paymentId: string, userId: string) {
  await supabase.rpc('create_user_notification', {
    p_user_id: userId,
    p_type: 'payment_pending',
    p_title: 'Pagamento Pendente',
    p_message: 'Seu pagamento está aguardando confirmação.',
    p_priority: 'medium',
    p_related_id: paymentId,
    p_related_type: 'payments',
    p_action_url: `/pagamentos/${paymentId}`,
    p_action_label: 'Ver Status',
    p_icon: 'Clock',
    p_metadata: {}
  });
}
```

---

### 3. Assinaturas

#### Quando Assinatura Está Expirando (Job Diário)
```typescript
// Em: src/jobs/checkExpiringSubscriptions.ts

export async function checkExpiringSubscriptions() {
  // Buscar assinaturas expirando em 3 dias
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, user_id, expires_at')
    .eq('status', 'active')
    .gte('expires_at', new Date().toISOString())
    .lte('expires_at', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());

  // Notificar cada usuário
  for (const sub of subscriptions || []) {
    const daysLeft = Math.ceil(
      (new Date(sub.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    await supabase.rpc('create_user_notification', {
      p_user_id: sub.user_id,
      p_type: 'subscription_expiring',
      p_title: 'Assinatura Expirando',
      p_message: `Sua assinatura expira em ${daysLeft} dia(s). Renove agora!`,
      p_priority: 'critical',
      p_related_id: sub.id,
      p_related_type: 'subscriptions',
      p_action_url: '/assinaturas',
      p_action_label: 'Renovar Agora',
      p_icon: 'AlertCircle',
      p_metadata: {}
    });
  }
}
```

---

### 4. Grupos

#### Quando Usuário Recebe Mensagem em Grupo
```typescript
export async function notifyGroupMessage(
  groupId: string,
  senderId: string,
  memberIds: string[],
  message: string
) {
  // Notificar todos os membros exceto o remetente
  const recipients = memberIds.filter(id => id !== senderId);

  for (const userId of recipients) {
    await supabase.rpc('create_user_notification', {
      p_user_id: userId,
      p_type: 'group_message',
      p_title: 'Nova Mensagem no Grupo',
      p_message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      p_priority: 'medium',
      p_related_id: groupId,
      p_related_type: 'groups',
      p_action_url: `/grupos/${groupId}`,
      p_action_label: 'Ver Grupo',
      p_icon: 'MessageSquare',
      p_metadata: {}
    });
  }
}
```

---

### 5. Suporte

#### Quando Admin Responde Ticket
```typescript
export async function notifySupportResponse(
  ticketId: string,
  userId: string,
  response: string
) {
  await supabase.rpc('create_user_notification', {
    p_user_id: userId,
    p_type: 'support_response',
    p_title: 'Nova Resposta do Suporte',
    p_message: 'Seu ticket recebeu uma nova resposta.',
    p_priority: 'high',
    p_related_id: ticketId,
    p_related_type: 'support',
    p_action_url: `/suporte/${ticketId}`,
    p_action_label: 'Ver Resposta',
    p_icon: 'HeadphonesIcon',
    p_metadata: {}
  });
}
```

---

## 🔄 Triggers Automáticos (Opcional)

Para notificações totalmente automáticas, você pode criar triggers SQL:

### Exemplo: Notificar quando pedido é atualizado

```sql
CREATE OR REPLACE FUNCTION notify_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas se status mudou
  IF NEW.status != OLD.status THEN
    PERFORM create_user_notification(
      NEW.user_id,
      'order_status'::user_notification_type,
      'Status do Pedido Atualizado',
      'Seu pedido #' || NEW.id || ' está agora: ' || NEW.status,
      'medium'::notification_priority,
      NEW.id,
      'orders',
      '/pedidos/' || NEW.id,
      'Ver Pedido',
      'Package',
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_order_update
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_update();
```

---

## 📊 Boas Práticas

### 1. Prioridades
- **critical**: Assinaturas expirando, problemas urgentes
- **high**: Pagamentos confirmados, pedidos enviados
- **medium**: Status de pedidos, mensagens de grupos
- **low**: Anúncios gerais, novidades

### 2. Mensagens
- Seja claro e conciso
- Use emojis com moderação
- Inclua informações relevantes (valores, IDs, etc)
- Limite a 200 caracteres

### 3. Ações
- Sempre forneça um `action_url` relevante
- Use `action_label` descritivo ("Ver Pedido", não "Clique Aqui")
- Escolha ícones apropriados

### 4. Performance
- Não crie notificações em loops grandes sem batch
- Use jobs para notificações em massa
- Considere rate limiting

---

## ✅ Checklist de Integração

- [ ] Integrar com criação de pedidos
- [ ] Integrar com atualização de status de pedidos
- [ ] Integrar com confirmação de pagamentos
- [ ] Integrar com envio de pedidos
- [ ] Integrar com entrega de pedidos
- [ ] Criar job para assinaturas expirando
- [ ] Integrar com mensagens de grupos
- [ ] Integrar com respostas de suporte
- [ ] Integrar com novos itens na wishlist
- [ ] Integrar com quedas de preço
- [ ] Criar notificações de boas-vindas para novos usuários

---

## 🚀 Próximos Passos

1. Escolha os eventos mais importantes
2. Implemente as integrações uma por uma
3. Teste cada integração
4. Monitore o engajamento dos usuários
5. Ajuste mensagens e prioridades conforme necessário

---

**Sistema pronto para integração!** 🎉

Qualquer notificação criada será automaticamente:
- ✅ Exibida no header
- ✅ Enviada em tempo real
- ✅ Armazenada no histórico
- ✅ Configurável pelo usuário
