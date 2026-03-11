# Configurar Google Authentication no Supabase

## Passo 1: Obter Credenciais do Google Cloud

### 1.1. Acessar Google Cloud Console
1. Acesse: https://console.cloud.google.com/
2. Faça login com sua conta Google
3. Crie um novo projeto ou selecione um existente

### 1.2. Habilitar Google+ API
1. No menu lateral, vá em "APIs & Services" > "Library"
2. Procure por "Google+ API"
3. Clique em "Enable"

### 1.3. Criar Credenciais OAuth 2.0
1. Vá em "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "OAuth 2.0 Client ID"
3. Se solicitado, configure a "OAuth consent screen":
   - User Type: External
   - App name: Ordax (ou o nome do seu app)
   - User support email: seu email
   - Developer contact: seu email
   - Clique em "Save and Continue"
   - Em "Scopes", adicione: email, profile, openid
   - Clique em "Save and Continue"
   - Em "Test users", adicione seu email para testes
   - Clique em "Save and Continue"

4. Volte para "Credentials" e crie o OAuth Client ID:
   - Application type: **Web application**
   - Name: Ordax Web Client
   
5. **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   https://pdytjhtjlxvbbeuxgnms.supabase.co
   ```

6. **Authorized redirect URIs:**
   ```
   http://localhost:3000/auth/callback
   https://pdytjhtjlxvbbeuxgnms.supabase.co/auth/v1/callback
   ```

7. Clique em "Create"
8. **COPIE** o Client ID e Client Secret que aparecerem

---

## Passo 2: Configurar no Supabase Dashboard

### 2.1. Acessar Configurações de Auth
1. Acesse: https://supabase.com/dashboard/project/pdytjhtjlxvbbeuxgnms/auth/providers
2. Faça login no Supabase

### 2.2. Habilitar Google Provider
1. Na lista de providers, encontre "Google"
2. Clique para expandir
3. Ative o toggle "Enable Sign in with Google"
4. Cole as credenciais:
   - **Client ID (for OAuth):** Cole o Client ID do Google
   - **Client Secret (for OAuth):** Cole o Client Secret do Google
5. Clique em "Save"

### 2.3. Configurar Site URL (se necessário)
1. Vá em: https://supabase.com/dashboard/project/pdytjhtjlxvbbeuxgnms/auth/url-configuration
2. Configure:
   - **Site URL:** `http://localhost:3000` (para desenvolvimento)
   - **Redirect URLs:** Adicione:
     ```
     http://localhost:3000/**
     http://localhost:3000/auth/callback
     ```

---

## Passo 3: Testar a Autenticação

### 3.1. No código do seu app (já deve estar implementado)

```typescript
import { supabase } from './lib/supabase'

// Login com Google
async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  
  if (error) console.error('Erro:', error)
}
```

### 3.2. Testar
1. Inicie seu app: `npm run dev`
2. Clique no botão de login com Google
3. Você será redirecionado para o Google
4. Faça login e autorize o app
5. Será redirecionado de volta para seu app autenticado

---

## Passo 4: Verificar se funcionou

### 4.1. No Supabase Dashboard
1. Vá em: https://supabase.com/dashboard/project/pdytjhtjlxvbbeuxgnms/auth/users
2. Você deve ver seu usuário listado após fazer login

### 4.2. No código
```typescript
// Verificar usuário logado
const { data: { user } } = await supabase.auth.getUser()
console.log('Usuário:', user)
```

---

## Troubleshooting

### Erro: "redirect_uri_mismatch"
- Verifique se as URLs no Google Cloud Console estão EXATAMENTE iguais às configuradas
- Certifique-se de incluir `/auth/v1/callback` no final da URL do Supabase

### Erro: "Access blocked: This app's request is invalid"
- Configure a OAuth consent screen no Google Cloud Console
- Adicione seu email como test user

### Erro: "Invalid login credentials"
- Verifique se o Client ID e Secret estão corretos no Supabase
- Tente recriar as credenciais no Google Cloud Console

---

## URLs Importantes

- **Google Cloud Console:** https://console.cloud.google.com/
- **Supabase Auth Providers:** https://supabase.com/dashboard/project/pdytjhtjlxvbbeuxgnms/auth/providers
- **Supabase Auth Users:** https://supabase.com/dashboard/project/pdytjhtjlxvbbeuxgnms/auth/users
- **Supabase URL Config:** https://supabase.com/dashboard/project/pdytjhtjlxvbbeuxgnms/auth/url-configuration

---

## Próximos Passos

Após configurar o Google Auth:

1. ✅ Testar login no ambiente de desenvolvimento
2. ✅ Adicionar outros providers se necessário (GitHub, Facebook, etc.)
3. ✅ Configurar as URLs de produção quando fizer deploy
4. ✅ Implementar logout e gerenciamento de sessão
