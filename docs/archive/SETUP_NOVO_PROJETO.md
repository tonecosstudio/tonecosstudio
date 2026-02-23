# Setup do Novo Projeto Supabase

## ✅ Progresso Atual
- ✅ Projeto atualizado: `pabxpvqwtvbjaunjejud`
- ✅ Supabase CLI linkado com sucesso
- ✅ config.toml atualizado
- ⚠️ Falta: Atualizar anon key no .env

---

## 📋 Passo 1: Obter Credenciais do Supabase

### 1.1 Acessar o Dashboard
Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/api

### 1.2 Copiar as Credenciais
Na página de **Settings** → **API**, você vai encontrar:

1. **Project URL**: `https://pabxpvqwtvbjaunjejud.supabase.co`
2. **anon public key**: Uma chave JWT longa começando com `eyJ...`

### 1.3 Atualizar o arquivo .env
Abra o arquivo `.env` e cole a chave anon no lugar de `COLE_AQUI_O_ANON_KEY`:

```env
# Supabase Configuration
VITE_SUPABASE_PROJECT_ID="pabxpvqwtvbjaunjejud"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ... COLE AQUI A CHAVE ANON COMPLETA"
VITE_SUPABASE_URL="https://pabxpvqwtvbjaunjejud.supabase.co"

# Google OAuth (apenas para referência - configurar no Supabase Dashboard)
# GOOGLE_CLIENT_ID="624639919567-g0jn7ksbhat9hggu0dpednaglfvonlad.apps.googleusercontent.com"
```

---

## 📋 Passo 2: Configurar Google OAuth

### 2.1 Atualizar Redirect URI no Google Cloud Console
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Encontre o Client ID: `624639919567-g0jn7ksbhat9hggu0dpednaglfvonlad.apps.googleusercontent.com`
3. Clique para editar
4. **ADICIONE** (não substitua) a nova redirect URI:
   ```
   https://pabxpvqwtvbjaunjejud.supabase.co/auth/v1/callback
   ```
5. Salve

### 2.2 Configurar no Supabase
1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/auth/providers
2. Vá em **Authentication** → **Providers**
3. Ative o **Google** provider
4. Cole:
   - **Client ID**: `624639919567-g0jn7ksbhat9hggu0dpednaglfvonlad.apps.googleusercontent.com`
   - **Client Secret**: (copie do Google Cloud Console)
5. Salve

---

## 📋 Passo 3: Migrar o Banco de Dados

### 3.1 Aplicar Migrations Existentes
Você tem 4 migrations no projeto. Para aplicá-las no novo banco:

```bash
supabase db push
```

### 3.2 Verificar se Aplicou Corretamente
Acesse o Table Editor:
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor

Verifique se as tabelas foram criadas.

---

## 📋 Passo 4: Deploy das Edge Functions

### 4.1 Deploy de Todas as Functions
```bash
supabase functions deploy classify-name
supabase functions deploy confirm-model
supabase functions deploy bootstrap-admin
supabase functions deploy admin-promote
supabase functions deploy queue-reject
supabase functions deploy analyze-preferences
```

### 4.2 Ou Deploy de Todas de Uma Vez
```bash
cd supabase/functions
for /d %d in (*) do supabase functions deploy %d
```

---

## 📋 Passo 5: Configurar Secrets das Edge Functions

As Edge Functions precisam de secrets para funcionar (ex: OpenAI API Key).

### 5.1 Listar Secrets Necessários
Verifique nos arquivos das functions quais secrets são usados:
- `OPENAI_API_KEY` (para analyze-preferences e classify-name)
- Outros que você possa ter configurado

### 5.2 Configurar Secrets
```bash
supabase secrets set OPENAI_API_KEY="sua-chave-aqui"
```

Ou configure pelo dashboard:
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/functions

---

## 📋 Passo 6: Testar a Aplicação

### 6.1 Reiniciar o Servidor
```bash
# Pare o servidor (Ctrl+C) e reinicie
npm run dev
```

### 6.2 Testar Login
1. Acesse: http://localhost:5173/login
2. Teste login com email/senha
3. Teste login com Google

### 6.3 Verificar Autenticação
Após login, verifique no dashboard se o usuário foi criado:
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/auth/users

---

## 🔄 Checklist Completo

### Configuração Básica
- [ ] Copiar anon key do dashboard
- [ ] Atualizar .env com a nova anon key
- [ ] Reiniciar servidor de desenvolvimento

### Google OAuth
- [ ] Adicionar nova redirect URI no Google Cloud Console
- [ ] Ativar Google provider no Supabase
- [ ] Configurar Client ID e Secret no Supabase

### Banco de Dados
- [ ] Aplicar migrations: `supabase db push`
- [ ] Verificar tabelas no Table Editor

### Edge Functions
- [ ] Deploy de todas as functions
- [ ] Configurar secrets necessários
- [ ] Testar functions no dashboard

### Testes
- [ ] Testar login com email/senha
- [ ] Testar login com Google
- [ ] Verificar criação de usuários no dashboard
- [ ] Testar funcionalidades admin

---

## 🔗 Links Rápidos

- **Dashboard**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud
- **API Settings**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/api
- **Auth Providers**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/auth/providers
- **Table Editor**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
- **Edge Functions**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/functions
- **Users**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/auth/users

---

## 🆘 Precisa de Ajuda?

Se encontrar algum erro, me avise e eu te ajudo a resolver!
