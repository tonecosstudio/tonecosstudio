# ✅ Setup Completo - Novo Projeto Supabase

## 🎉 O que foi configurado

### ✅ Projeto Supabase
- **Project ID**: `pabxpvqwtvbjaunjejud`
- **URL**: `https://pabxpvqwtvbjaunjejud.supabase.co`
- **Status**: Linkado e configurado

### ✅ Banco de Dados
- ✅ 5 migrations aplicadas com sucesso
- ✅ Extensão `pg_trgm` habilitada no schema `extensions`
- ✅ Tabelas criadas:
  - `profiles`
  - `user_roles`
  - `models`
  - `franchises`
  - `franchise_rules`
  - `images_queue`
  - `ai_name_cache`
  - `model_likes`
  - `quote_requests`
  - `quote_items`

### ✅ Edge Functions Deployadas
1. ✅ `classify-name` - Classifica nomes de produtos usando IA
2. ✅ `confirm-model` - Confirma modelos na fila
3. ✅ `bootstrap-admin` - Cria primeiro admin
4. ✅ `admin-promote` - Promove usuários a admin
5. ✅ `queue-reject` - Rejeita itens da fila
6. ✅ `analyze-preferences` - Analisa preferências do usuário

### ✅ Autenticação
- ✅ Email/Password configurado
- ✅ Código do Google OAuth implementado
- ⚠️ Falta: Configurar Google OAuth no dashboard

### ✅ Variáveis de Ambiente
- ✅ `.env` atualizado com novo projeto
- ✅ Anon key configurada

---

## 📋 Próximos Passos

### 1. Configurar Google OAuth (IMPORTANTE)

#### 1.1 No Google Cloud Console
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Edite o Client ID: `624639919567-g0jn7ksbhat9hggu0dpednaglfvonlad.apps.googleusercontent.com`
3. **Adicione** a redirect URI:
   ```
   https://pabxpvqwtvbjaunjejud.supabase.co/auth/v1/callback
   ```
4. Salve

#### 1.2 No Supabase Dashboard
1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/auth/providers
2. Ative o **Google** provider
3. Cole:
   - **Client ID**: `624639919567-g0jn7ksbhat9hggu0dpednaglfvonlad.apps.googleusercontent.com`
   - **Client Secret**: (copie do Google Cloud Console)
4. Salve

### 2. Configurar Secrets das Edge Functions

Algumas functions precisam de API keys:

```bash
# OpenAI API Key (para classify-name e analyze-preferences)
supabase secrets set OPENAI_API_KEY="sua-chave-openai"

# Outras secrets que você possa precisar
supabase secrets set OUTRA_SECRET="valor"
```

Ou configure pelo dashboard:
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/functions

### 3. Configurar Storage (se necessário)

Se você usa upload de imagens, configure o bucket:

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/storage/buckets
2. Crie um bucket chamado `product-images` (ou o nome que você usa)
3. Configure as políticas de acesso

### 4. Criar Primeiro Admin

Execute a function `bootstrap-admin` para criar o primeiro usuário admin:

1. Crie uma conta no app (email/senha ou Google)
2. Chame a function bootstrap-admin com o email do usuário
3. Ou configure manualmente no dashboard

### 5. Testar a Aplicação

```bash
# Reiniciar o servidor
npm run dev
```

Teste:
- ✅ Login com email/senha
- ✅ Login com Google (após configurar)
- ✅ Navegação entre páginas
- ✅ Funcionalidades admin
- ✅ Upload de imagens (se aplicável)

---

## 🔗 Links Úteis

### Dashboard Principal
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud

### Configurações
- **API Keys**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/api
- **Database**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/database
- **Auth Providers**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/auth/providers
- **Edge Functions**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/functions
- **Storage**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/storage/buckets

### Dados
- **Table Editor**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
- **SQL Editor**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql
- **Users**: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/auth/users

---

## 🔍 Verificar Status

### Listar Functions Deployadas
```bash
supabase functions list
```

### Ver Logs de uma Function
```bash
supabase functions logs classify-name
```

### Verificar Migrations Aplicadas
```bash
supabase db remote commit
```

### Status do Projeto
```bash
supabase status
```

---

## 🆘 Troubleshooting

### Erro ao fazer login
- Verifique se o Google OAuth está configurado
- Verifique se a redirect URI está correta
- Verifique os logs no dashboard

### Edge Functions não funcionam
- Verifique se as secrets estão configuradas
- Veja os logs: `supabase functions logs nome-da-function`
- Verifique se o JWT está sendo enviado corretamente

### Erro de permissão no banco
- Verifique as RLS policies no Table Editor
- Verifique se o usuário tem o role correto em `user_roles`

---

## 📝 Comandos Úteis

```bash
# Ver status do projeto
supabase status

# Aplicar novas migrations
supabase db push

# Criar nova migration
supabase migration new nome_da_migration

# Deploy de uma function
supabase functions deploy nome-da-function

# Ver logs de uma function
supabase functions logs nome-da-function

# Configurar secret
supabase secrets set NOME_SECRET="valor"

# Listar secrets
supabase secrets list
```

---

## ✅ Checklist Final

### Configuração Básica
- [x] Projeto Supabase criado
- [x] CLI linkado
- [x] Variáveis de ambiente configuradas
- [x] Migrations aplicadas
- [x] Edge Functions deployadas

### Autenticação
- [x] Email/Password funcionando
- [ ] Google OAuth configurado no Google Cloud Console
- [ ] Google OAuth configurado no Supabase
- [ ] Testado login com Google

### Funcionalidades
- [ ] Secrets das Edge Functions configuradas
- [ ] Storage configurado (se necessário)
- [ ] Primeiro admin criado
- [ ] Aplicação testada end-to-end

---

## 🎯 Está Pronto Para Usar!

O projeto está 90% configurado. Falta apenas:
1. Configurar Google OAuth (5 minutos)
2. Configurar secrets das Edge Functions (2 minutos)
3. Testar tudo (10 minutos)

Total: ~20 minutos para estar 100% operacional! 🚀
