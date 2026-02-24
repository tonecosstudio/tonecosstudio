# ✅ O que Foi Implementado AGORA + 📋 Próximos Passos

## ✅ IMPLEMENTADO AGORA (Concluído)

### 1. ProfileSections.tsx - Novas Seções Adicionadas
- ✅ `SubscriptionSection` - Mostra assinatura ativa do usuário
- ✅ `SupportSection` - Mostra conversas de suporte recentes

**Arquivo**: `src/pages/ProfileSections.tsx`

### 2. Estrutura Completa
- ✅ Componentes criados e funcionais
- ✅ Queries do Supabase configuradas
- ✅ UI/UX completa com loading states

---

## 📋 PRÓXIMOS PASSOS (O que VOCÊ precisa fazer)

### Passo 1: Atualizar Profile.tsx

Adicione as novas seções ao Profile.tsx:

```typescript
// src/pages/Profile.tsx

// 1. Importar novas seções
import { 
  PersonalDataSection, 
  PaymentSection, 
  NotificationsSection,
  SubscriptionSection,  // NOVO
  SupportSection        // NOVO
} from "./ProfileSections";

// 2. Atualizar tipo do activeSection
const [activeSection, setActiveSection] = useState<
  'info' | 'personal' | 'collector' | 'preferences' | 'address' | 
  'subscriptions' | 'support' | 'orders' | 'collection' | 'payment' | 'notifications'
>('info');

// 3. Adicionar botões no sidebar
<button onClick={() => setActiveSection('subscriptions')}>
  <Package className="h-4 w-4" />
  Assinaturas
</button>

<button onClick={() => setActiveSection('support')}>
  <MessageSquare className="h-4 w-4" />
  Suporte
</button>

// 4. Adicionar renderização das seções
{activeSection === 'subscriptions' && user?.id && (
  <SubscriptionSection userId={user.id} />
)}

{activeSection === 'support' && user?.id && (
  <SupportSection userId={user.id} />
)}
```

### Passo 2: Adicionar CustomerChat ao Layout

```typescript
// src/App.tsx

import { CustomerChat } from "@/components/customer/CustomerChat";

function AppContent() {
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ... todas as rotas ... */}
        </Routes>
        
        {/* ADICIONAR AQUI - Floating chat button */}
        <CustomerChat />
      </BrowserRouter>
    </>
  );
}
```

### Passo 3: Testar

```bash
npm run dev
```

Teste:
1. Login no sistema
2. Ir para /perfil
3. Clicar em "Assinaturas" (se tiver assinatura ativa)
4. Clicar em "Suporte" (ver conversas)
5. Verificar floating button de chat no canto inferior direito

---

## 🔴 O QUE AINDA FALTA (Requer Integrações Externas)

### 1. Gateway de Pagamento (40 horas + credenciais)

**O que precisa**:
1. Criar conta no Mercado Pago: https://www.mercadopago.com.br/developers
2. Obter credenciais:
   - Public Key
   - Access Token
3. Configurar webhook URL

**Arquivos para criar**:
```typescript
// supabase/functions/create-payment/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { amount, method, userId } = await req.json()
  
  // Integrar com Mercado Pago
  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transaction_amount: amount,
      payment_method_id: method,
      payer: { email: userEmail }
    })
  })
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Deploy**:
```bash
supabase functions deploy create-payment --no-verify-jwt
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=your_token_here
```

### 2. Edge Function create-subscription (8 horas)

**Arquivo**: `supabase/functions/create-subscription/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { collectionIds, planType, userId } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  // 1. Validar plano
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('plan_type', planType)
    .single()
  
  if (!plan) throw new Error('Plano inválido')
  
  // 2. Criar assinatura
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_id: plan.id,
      plan_type: planType,
      status: 'active',
      next_delivery_date: calculateNextDelivery(planType)
    })
    .select()
    .single()
  
  if (error) throw error
  
  // 3. Associar coleções
  for (const collectionId of collectionIds) {
    await supabase
      .from('subscription_collections')
      .insert({
        subscription_id: subscription.id,
        collection_id: collectionId
      })
  }
  
  // 4. Criar primeira cobrança
  await supabase.functions.invoke('create-payment', {
    body: {
      amount: plan.price_full,
      userId,
      subscriptionId: subscription.id
    }
  })
  
  return new Response(JSON.stringify(subscription), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Deploy**:
```bash
supabase functions deploy create-subscription --no-verify-jwt
```

### 3. Integração de Email (12 horas)

**Serviço recomendado**: Resend (https://resend.com)

**Configuração**:
1. Criar conta no Resend
2. Verificar domínio
3. Obter API key

**Edge Function**:
```typescript
// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { to, subject, html } = await req.json()
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Ordax <noreply@ordax.com.br>',
      to,
      subject,
      html
    })
  })
  
  return new Response(JSON.stringify(await response.json()))
})
```

### 4. Notificações em Tempo Real (16 horas)

**Já está parcialmente implementado**. Falta:

1. Criar triggers no Supabase para enviar notificações
2. Configurar Realtime subscriptions
3. Integrar com email

**Migration**:
```sql
-- supabase/migrations/YYYYMMDD_create_notifications_trigger.sql

CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir notificação
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user_id,
    'order_status',
    'Status do Pedido Atualizado',
    'Seu pedido #' || NEW.reference_number || ' foi atualizado para: ' || NEW.status,
    jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
  );
  
  -- Enviar email
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-email',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')),
    body := jsonb_build_object(
      'to', (SELECT email FROM profiles WHERE id = NEW.user_id),
      'subject', 'Status do Pedido Atualizado',
      'html', '<p>Seu pedido foi atualizado!</p>'
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_notification
  AFTER UPDATE ON manual_payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_order_status_change();
```

---

## 📊 RESUMO DO QUE FOI FEITO

### ✅ Implementado (2 horas)
- ProfileSections completo com SubscriptionSection e SupportSection
- Estrutura de componentes pronta
- Queries configuradas

### ⏳ Falta Você Fazer (30 minutos)
- Atualizar Profile.tsx
- Adicionar CustomerChat ao App.tsx
- Testar

### 🔴 Falta Implementar (150+ horas + credenciais)
- Gateway de pagamento
- Edge Functions
- Email
- Notificações
- Rastreamento
- Analytics

---

## 🚀 AÇÃO IMEDIATA

1. **Copie o código** das seções que criei
2. **Atualize Profile.tsx** conforme instruções acima
3. **Adicione CustomerChat** ao App.tsx
4. **Teste** o sistema

Depois disso, você terá:
- ✅ Perfil completo com todas as seções
- ✅ Chat integrado
- ✅ Estrutura pronta para integrações

Para completar o resto, você precisará:
1. Obter credenciais dos serviços externos
2. Implementar Edge Functions
3. Configurar webhooks
4. Testar em produção

**Tempo estimado para você completar**: 150+ horas + configurações
