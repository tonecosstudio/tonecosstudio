# 🔑 Guia de Configuração de Credenciais

**Data:** 29 de Abril de 2026
**Fase:** 3 - Configurar Variáveis de Ambiente
**Tempo Estimado:** 1-2 horas

---

## 🎯 OBJETIVO

Configurar todas as credenciais necessárias para que o sistema funcione completamente em produção.

---

## 📋 CREDENCIAIS NECESSÁRIAS

### ✅ Já Configuradas
- ✅ `VITE_SUPABASE_URL` - https://pdytjhtjlxvbbeuxgnms.supabase.co
- ✅ `VITE_SUPABASE_PUBLISHABLE_KEY` - Configurada
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Configurada

### ❌ Faltando (CRÍTICO)
- ❌ `GOOGLE_CLIENT_ID` - Login com Google
- ❌ `GOOGLE_CLIENT_SECRET` - Login com Google
- ❌ `VITE_STRIPE_PUBLISHABLE_KEY` - Pagamentos
- ❌ `STRIPE_SECRET_KEY` - Pagamentos
- ❌ `STRIPE_WEBHOOK_SECRET` - Webhooks Stripe

### 🟡 Opcionais
- 🟡 `VITE_SENTRY_DSN` - Error tracking
- 🟡 `OPENAI_API_KEY` - Features de AI
- 🟡 `RESEND_API_KEY` - Emails (alternativa)
- 🟡 `SENDGRID_API_KEY` - Emails (alternativa)

---

## 🔐 PASSO 1: Google OAuth

### 1.1. Acessar Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Faça login com sua conta Google
3. Selecione ou crie um projeto

### 1.2. Habilitar Google+ API

1. No menu lateral, vá em **APIs & Services** > **Library**
2. Busque por "Google+ API"
3. Clique em **Enable**

### 1.3. Criar Credenciais OAuth 2.0

1. Vá em **APIs & Services** > **Credentials**
2. Clique em **+ CREATE CREDENTIALS**
3. Selecione **OAuth client ID**
4. Configure:
   - **Application type:** Web application
   - **Name:** ORDAX Production
   - **Authorized JavaScript origins:**
     ```
     http://localhost:8080
     https://seu-dominio.com
     https://seu-dominio.vercel.app
     ```
   - **Authorized redirect URIs:**
     ```
     http://localhost:8080/auth/callback
     https://seu-dominio.com/auth/callback
     https://pdytjhtjlxvbbeuxgnms.supabase.co/auth/v1/callback
     ```
5. Clique em **CREATE**
6. **Copie** o Client ID e Client Secret

### 1.4. Adicionar ao .env.local

```bash
# Google OAuth
GOOGLE_CLIENT_ID="seu-client-id-aqui.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="seu-client-secret-aqui"
```

### 1.5. Configurar no Supabase

1. Acesse: https://supabase.com/dashboard/project/pdytjhtjlxvbbeuxgnms
2. Vá em **Authentication** > **Providers**
3. Encontre **Google** e clique em **Enable**
4. Cole o Client ID e Client Secret
5. Clique em **Save**

---

## 💳 PASSO 2: Stripe

### 2.1. Acessar Stripe Dashboard

1. Acesse: https://dashboard.stripe.com/
2. Faça login com sua conta Stripe
3. **IMPORTANTE:** Certifique-se de estar em **Test Mode** (toggle no canto superior direito)

### 2.2. Obter API Keys

1. No menu lateral, vá em **Developers** > **API keys**
2. Você verá duas chaves:
   - **Publishable key** (começa com `pk_test_`)
   - **Secret key** (começa com `sk_test_`)
3. **Copie** ambas as chaves

### 2.3. Criar Webhook

1. Vá em **Developers** > **Webhooks**
2. Clique em **+ Add endpoint**
3. Configure:
   - **Endpoint URL:** `https://seu-dominio.com/api/webhooks/stripe`
   - **Events to send:**
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. Clique em **Add endpoint**
5. **Copie** o Signing secret (começa com `whsec_`)

### 2.4. Adicionar ao .env.local

```bash
# Stripe
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_seu-publishable-key-aqui"
STRIPE_SECRET_KEY="sk_test_seu-secret-key-aqui"
STRIPE_WEBHOOK_SECRET="whsec_seu-webhook-secret-aqui"
```

---

## 🔧 PASSO 3: Configurar Supabase Config

### 3.1. Atualizar supabase/config.toml

O arquivo já está configurado, mas verifique se as variáveis de ambiente estão corretas:

```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
skip_nonce_check = false
```

### 3.2. Reiniciar Supabase Local (se usando)

```bash
supabase stop
supabase start
```

---

## ✅ PASSO 4: Validar Configuração

### 4.1. Verificar .env.local

Seu arquivo `.env.local` deve ter:

```bash
# Supabase Configuration
VITE_SUPABASE_URL="https://pdytjhtjlxvbbeuxgnms.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sua-key-aqui"
SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key-aqui"

# Google OAuth
GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="seu-client-secret"

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Optional
VITE_SENTRY_DSN=""
OPENAI_API_KEY=""
```

### 4.2. Reiniciar Servidor de Desenvolvimento

```bash
npm run dev
```

### 4.3. Testar Login com Google

1. Acesse: http://localhost:8080/login
2. Clique em "Login com Google"
3. Selecione sua conta Google
4. Verifique se o login funciona

### 4.4. Testar Pagamento Stripe

1. Acesse uma página de pagamento
2. Use cartão de teste:
   - **Número:** 4242 4242 4242 4242
   - **Data:** Qualquer data futura
   - **CVC:** Qualquer 3 dígitos
   - **CEP:** Qualquer CEP
3. Verifique se o pagamento é processado

---

## 🚨 TROUBLESHOOTING

### Erro: "Invalid client_id"

**Causa:** Client ID incorreto ou não configurado no Supabase

**Solução:**
1. Verifique se o Client ID está correto no `.env.local`
2. Verifique se está configurado no Supabase Dashboard
3. Certifique-se de que não há espaços extras

### Erro: "Redirect URI mismatch"

**Causa:** URI de redirecionamento não autorizada

**Solução:**
1. Adicione a URI no Google Cloud Console
2. Formato correto: `https://pdytjhtjlxvbbeuxgnms.supabase.co/auth/v1/callback`
3. Aguarde alguns minutos para propagar

### Erro: "Invalid API key"

**Causa:** Stripe key incorreta ou em modo errado

**Solução:**
1. Verifique se está usando keys de **Test Mode**
2. Verifique se não há espaços extras
3. Regenere as keys se necessário

### Erro: "Webhook signature verification failed"

**Causa:** Webhook secret incorreto

**Solução:**
1. Copie o signing secret correto do Stripe Dashboard
2. Certifique-se de que está usando o secret do endpoint correto
3. Verifique se não há espaços extras

---

## 📝 CHECKLIST DE VALIDAÇÃO

### Google OAuth ✅
- [ ] Client ID obtido
- [ ] Client Secret obtido
- [ ] Adicionado ao .env.local
- [ ] Configurado no Supabase
- [ ] URIs de redirecionamento configuradas
- [ ] Login testado e funcionando

### Stripe ✅
- [ ] Publishable key obtida
- [ ] Secret key obtida
- [ ] Webhook secret obtido
- [ ] Adicionado ao .env.local
- [ ] Webhook endpoint criado
- [ ] Pagamento testado e funcionando

### Geral ✅
- [ ] Servidor reiniciado
- [ ] Build executado sem erros
- [ ] Testes passando
- [ ] Documentação atualizada

---

## 🔒 SEGURANÇA

### ⚠️ NUNCA COMMITAR

**NUNCA** commite o arquivo `.env.local` ou `.env` com credenciais reais!

```bash
# Adicione ao .gitignore (já está)
.env.local
.env
.env*.local
```

### ✅ Usar Variáveis de Ambiente

**Produção (Vercel):**
1. Acesse: https://vercel.com/jogo-brasils-projects/ordax
2. Vá em **Settings** > **Environment Variables**
3. Adicione todas as variáveis
4. Redeploy o projeto

**Produção (Outro Host):**
- Configure as variáveis de ambiente no painel do host
- Certifique-se de que todas estão configuradas
- Teste após deploy

---

## 📊 IMPACTO

### Antes
```
❌ Login com Google: NÃO FUNCIONA
❌ Pagamentos Stripe: NÃO FUNCIONA
❌ Webhooks: NÃO CONFIGURADOS
```

### Depois
```
✅ Login com Google: FUNCIONA
✅ Pagamentos Stripe: FUNCIONA
✅ Webhooks: CONFIGURADOS
```

---

## 🎯 PRÓXIMOS PASSOS

Após configurar as credenciais:

1. ✅ Testar login com Google
2. ✅ Testar fluxo de pagamento
3. ✅ Testar webhooks
4. ✅ Validar em staging
5. ✅ Configurar em produção

---

## 💡 DICAS

### Desenvolvimento
- Use **Test Mode** do Stripe sempre
- Mantenha credenciais de dev separadas de prod
- Documente onde cada credencial está

### Produção
- Use **Live Mode** do Stripe
- Configure variáveis no host (Vercel, etc)
- Monitore webhooks no Stripe Dashboard
- Configure alertas para falhas

### Segurança
- Nunca compartilhe Secret Keys
- Rotacione keys periodicamente
- Use diferentes keys para dev/staging/prod
- Monitore uso de API keys

---

## 📞 SUPORTE

### Google OAuth
- Documentação: https://developers.google.com/identity/protocols/oauth2
- Suporte: https://support.google.com/cloud

### Stripe
- Documentação: https://stripe.com/docs
- Suporte: https://support.stripe.com/

### Supabase
- Documentação: https://supabase.com/docs/guides/auth/social-login/auth-google
- Suporte: https://supabase.com/support

---

**Responsável:** Kiro AI
**Data:** 29 de Abril de 2026
**Status:** 📋 GUIA COMPLETO
**Próxima Ação:** Configurar credenciais

🔑 **Siga este guia passo a passo!**
