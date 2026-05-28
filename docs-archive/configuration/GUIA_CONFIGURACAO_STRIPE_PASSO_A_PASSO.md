# 🚀 Guia Completo: Como Configurar o Stripe

**Guia Passo a Passo para Configuração do Stripe no ORDAX**

---

## 📋 Índice

1. [Criar Conta no Stripe](#1-criar-conta-no-stripe)
2. [Obter Chaves de API](#2-obter-chaves-de-api)
3. [Configurar Variáveis de Ambiente](#3-configurar-variáveis-de-ambiente)
4. [Executar Migrations do Banco](#4-executar-migrations-do-banco)
5. [Configurar Webhooks](#5-configurar-webhooks)
6. [Testar Integração](#6-testar-integração)
7. [Configurar Produção](#7-configurar-produção)

---

## 1. Criar Conta no Stripe

### Passo 1.1: Acessar o Stripe

1. Acesse: https://stripe.com
2. Clique em **"Start now"** ou **"Sign in"**
3. Preencha o formulário de cadastro:
   - Email
   - Nome completo
   - Senha
   - País: **Brasil**

### Passo 1.2: Verificar Email

1. Acesse seu email
2. Clique no link de verificação enviado pelo Stripe
3. Complete o cadastro

### Passo 1.3: Configurar Conta

1. Preencha informações da empresa:
   - Nome da empresa: **ORDAX**
   - Tipo de negócio: **E-commerce**
   - Website: **seu-dominio.com**
2. Adicione informações bancárias (para receber pagamentos)
3. Complete a verificação de identidade

---

## 2. Obter Chaves de API

### Passo 2.1: Acessar Dashboard

1. Faça login em: https://dashboard.stripe.com
2. No menu lateral, clique em **"Developers"**
3. Clique em **"API keys"**

### Passo 2.2: Copiar Chaves de Teste

Você verá duas chaves:

#### Chave Publicável (Publishable key)
```
pk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
- ✅ Pode ser exposta no frontend
- ✅ Usada no navegador do cliente
- 📋 Copie esta chave

#### Chave Secreta (Secret key)
```
SUA_CHAVE_SECRETA_STRIPE
```
- ⚠️ NUNCA exponha no frontend
- ⚠️ Apenas no servidor
- 📋 Clique em "Reveal test key" e copie

### Passo 2.3: Salvar Chaves

Guarde as chaves em um local seguro (vamos usar no próximo passo).

---

## 3. Configurar Variáveis de Ambiente

### Passo 3.1: Copiar Arquivo de Exemplo

No terminal, execute:

```bash
cp .env.stripe.example .env.local
```

### Passo 3.2: Editar .env.local

Abra o arquivo `.env.local` e adicione suas chaves:

```bash
# =====================================================
# STRIPE CONFIGURATION
# =====================================================

# Chave secreta (server-side only)
STRIPE_SECRET_KEY=SUA_CHAVE_SECRETA_STRIPE

# Chave publicável (client-side)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_SUA_CHAVE_PUBLICA_AQUI

# Webhook secret (vamos configurar no passo 5)
STRIPE_WEBHOOK_SECRET=SEU_WEBHOOK_SECRET_STRIPE

# Configuração
VITE_STRIPE_CURRENCY=brl
VITE_STRIPE_COUNTRY=BR
VITE_STRIPE_API_VERSION=2023-10-16
```

### Passo 3.3: Exemplo Preenchido

```bash
# Exemplo (NÃO USE ESTAS CHAVES - são apenas exemplo)
STRIPE_SECRET_KEY=SUA_CHAVE_SECRETA_STRIPE

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51MxYz2ABC123def456GHI789jkl012MNO345pqr678STU901vwx234YZA567bcd890EFG123hij456KLM789nop012QRS345tuv678WXY901zab234CDE567fgh890IJK123lmn456OPQ789rst012UVW345xyz678ABC901def234GHI567jkl890MNO123pqr456STU789vwx012YZA345bcd678EFG901hij234KLM567nop890OPQ123rst456UVW789xyz012ABC345def678GHI901jkl234MNO567pqr890STU123vwx456YZA789bcd012EFG345hij678KLM901nop234OPQ567rst890UVW123xyz456ABC789def012GHI345jkl678MNO901pqr234STU567vwx890YZA123bcd456EFG789hij012KLM345nop678OPQ901rst234UVW567xyz890
```

### Passo 3.4: Verificar Configuração

Reinicie o servidor de desenvolvimento:

```bash
npm run dev
```

Verifique no console se aparece:
```
[stripe] Stripe configured successfully
```

---

## 4. Executar Migrations do Banco

### Passo 4.1: Verificar Supabase

Certifique-se de que o Supabase está configurado:

```bash
# Verificar se está logado
supabase status
```

### Passo 4.2: Executar Migration

```bash
# Aplicar migration do Stripe
supabase db push
```

Ou via Supabase Dashboard:

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Clique em **New Query**
5. Cole o conteúdo de `supabase/migrations/20260309180500_create_stripe_tables.sql`
6. Clique em **Run**

### Passo 4.3: Verificar Tabelas

No SQL Editor, execute:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'stripe_%';
```

Você deve ver:
- ✅ stripe_customers
- ✅ stripe_payment_intents
- ✅ stripe_subscriptions
- ✅ stripe_refunds
- ✅ stripe_webhook_events

---

## 5. Configurar Webhooks

### Passo 5.1: Acessar Webhooks no Stripe

1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em **"Add endpoint"**

### Passo 5.2: Configurar Endpoint

#### Para Desenvolvimento Local (Teste)

1. **Endpoint URL**: `http://localhost:3000/api/webhooks/stripe`
2. **Description**: `ORDAX - Desenvolvimento`
3. **Events to send**: Clique em **"Select events"**

Selecione os seguintes eventos:
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `payment_intent.canceled`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `charge.refunded`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

4. Clique em **"Add endpoint"**

### Passo 5.3: Copiar Webhook Secret

1. Após criar o endpoint, clique nele
2. Na seção **"Signing secret"**, clique em **"Reveal"**
3. Copie o secret do endpoint
4. Cole no `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=SEU_WEBHOOK_SECRET_STRIPE
```

### Passo 5.4: Testar Webhook Localmente

Para testar webhooks localmente, use o Stripe CLI:

#### Instalar Stripe CLI

**Windows (PowerShell como Admin):**
```powershell
scoop install stripe
```

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

#### Usar Stripe CLI

```bash
# Login
stripe login

# Encaminhar webhooks para localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Em outro terminal, testar evento
stripe trigger payment_intent.succeeded
```

---

## 6. Testar Integração

### Passo 6.1: Testar Criação de Payment Intent

Crie um arquivo de teste `test-stripe.ts`:

```typescript
import { stripeService } from '@/lib/stripe/stripe-service';

async function testStripe() {
  try {
    // Criar payment intent
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: 10000, // R$ 100.00
      currency: 'brl',
      description: 'Teste de pagamento',
      metadata: {
        orderId: 'test-123',
        userId: 'test-user'
      }
    });

    console.log('✅ Payment Intent criado:', paymentIntent.id);
    console.log('💰 Valor:', paymentIntent.amount / 100, 'BRL');
    console.log('📊 Status:', paymentIntent.status);
    
    return paymentIntent;
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testStripe();
```

Execute:
```bash
npx tsx test-stripe.ts
```

### Passo 6.2: Testar Componente de Checkout

Crie uma página de teste `src/pages/TestCheckout.tsx`:

```tsx
import { StripeCheckout } from '@/components/stripe/StripeCheckout';

export default function TestCheckout() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Teste de Checkout</h1>
      
      <StripeCheckout
        amount={10000} // R$ 100.00
        description="Teste de pagamento"
        metadata={{ orderId: 'test-123' }}
        onSuccess={(paymentIntent) => {
          console.log('✅ Pagamento aprovado!', paymentIntent);
          alert('Pagamento aprovado!');
        }}
        onError={(error) => {
          console.error('❌ Erro no pagamento:', error);
          alert('Erro no pagamento: ' + error.message);
        }}
      />
    </div>
  );
}
```

Acesse: `http://localhost:3000/test-checkout`

### Passo 6.3: Usar Cartões de Teste

Use estes cartões para testar:

#### Sucesso
```
Número: 4242 4242 4242 4242
Data: Qualquer data futura (ex: 12/34)
CVC: Qualquer 3 dígitos (ex: 123)
CEP: Qualquer (ex: 12345)
```

#### 3D Secure (Autenticação)
```
Número: 4000 0025 0000 3155
Data: Qualquer data futura
CVC: Qualquer 3 dígitos
```

#### Falha
```
Número: 4000 0000 0000 9995
Data: Qualquer data futura
CVC: Qualquer 3 dígitos
```

### Passo 6.4: Verificar no Dashboard

1. Acesse: https://dashboard.stripe.com/test/payments
2. Você deve ver os pagamentos de teste
3. Clique em um pagamento para ver detalhes

---

## 7. Configurar Produção

### Passo 7.1: Ativar Conta

1. Acesse: https://dashboard.stripe.com
2. Complete todas as informações necessárias:
   - Informações da empresa
   - Documentos fiscais
   - Conta bancária
   - Verificação de identidade

### Passo 7.2: Obter Chaves de Produção

1. No dashboard, alterne para **"Live mode"** (canto superior direito)
2. Vá em **Developers > API keys**
3. Copie as chaves de produção:
   - `pk_live_...` (Publishable key)
   - Secret key de producao

### Passo 7.3: Configurar Variáveis de Produção

No seu serviço de hosting (Vercel, Netlify, etc):

```bash
STRIPE_SECRET_KEY=SUA_CHAVE_SECRETA_STRIPE_PRODUCAO
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_SUA_CHAVE_PUBLICA_PRODUCAO
STRIPE_WEBHOOK_SECRET=SEU_WEBHOOK_SECRET_STRIPE_PRODUCAO
VITE_STRIPE_CURRENCY=brl
VITE_STRIPE_COUNTRY=BR
```

### Passo 7.4: Configurar Webhook de Produção

1. Acesse: https://dashboard.stripe.com/webhooks
2. Certifique-se de estar em **"Live mode"**
3. Clique em **"Add endpoint"**
4. **Endpoint URL**: `https://seu-dominio.com/api/webhooks/stripe`
5. Selecione os mesmos eventos do passo 5.2
6. Copie o webhook secret e adicione nas variáveis de ambiente

### Passo 7.5: Testar em Produção

1. Faça um pagamento real (valor pequeno)
2. Verifique no dashboard se apareceu
3. Verifique se o webhook foi recebido
4. Verifique se os dados foram salvos no banco

---

## 🔒 Checklist de Segurança

Antes de ir para produção, verifique:

- [ ] Chaves de teste NUNCA em produção
- [ ] Chaves de produção NUNCA no código
- [ ] Webhook secret configurado
- [ ] HTTPS habilitado
- [ ] Variáveis de ambiente seguras
- [ ] RLS policies ativas no Supabase
- [ ] Logs de erro configurados
- [ ] Monitoramento ativo

---

## 🐛 Troubleshooting

### Erro: "Stripe keys not configured"

**Solução**: Verifique se as variáveis de ambiente estão corretas no `.env.local`

### Erro: "Webhook verification failed"

**Solução**: Verifique se o `STRIPE_WEBHOOK_SECRET` está correto

### Erro: "Missing stripe-signature header"

**Solução**: Certifique-se de que o webhook está configurado corretamente no Stripe Dashboard

### Pagamento não aparece no banco

**Solução**: 
1. Verifique os logs do webhook
2. Verifique se as migrations foram executadas
3. Verifique as RLS policies

### Erro de CORS no webhook

**Solução**: Configure CORS na API route para aceitar requisições do Stripe

---

## 📚 Recursos Adicionais

### Documentação
- [Stripe Docs](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

### Suporte
- [Stripe Support](https://support.stripe.com)
- [Stripe Community](https://stripe.com/community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/stripe-payments)

### Ferramentas
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Status](https://status.stripe.com)

---

## ✅ Próximos Passos

Após configurar o Stripe:

1. ✅ Testar todos os fluxos de pagamento
2. ✅ Implementar emails de confirmação
3. ✅ Configurar notificações
4. ✅ Adicionar analytics
5. ✅ Monitorar transações

---

**Configuração criada por**: Kiro AI  
**Data**: 09/03/2026  
**Versão**: 1.0.0

**Dúvidas?** Consulte a documentação completa em `CONFIGURACAO_STRIPE_PROFISSIONAL.md`
