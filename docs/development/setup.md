# 🔧 Development Setup - Ordax

Guia completo de configuração do ambiente de desenvolvimento.

---

## 📋 Pré-requisitos

### Obrigatórios

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** 9+ ou **bun** 1.0+
- **Git** ([Download](https://git-scm.com/))

### Recomendados

- **VS Code** ([Download](https://code.visualstudio.com/))
- **Supabase CLI** ([Docs](https://supabase.com/docs/guides/cli))
- **PostgreSQL** (opcional, para desenvolvimento local)

---

## 🚀 Setup Inicial

### 1. Clone o Repositório

```bash
git clone <YOUR_GIT_URL>
cd ordax
```

### 2. Instale as Dependências

```bash
# Usando npm
npm install

# Ou usando bun (mais rápido)
bun install
```

### 3. Configure Variáveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:

```env
# Supabase
VITE_SUPABASE_URL="https://pabxpvqwtvbjaunjejud.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-aqui"

# Sentry (opcional)
VITE_SENTRY_DSN="https://xxx@sentry.io/xxx"

# App
VITE_APP_VERSION="1.0.0"
```

**Obter credenciais Supabase**:
1. Acesse [Supabase Dashboard](https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/api)
2. Copie `URL` e `anon/public key`

### 4. Inicie o Servidor de Desenvolvimento

```bash
npm run dev
```

Acesse: **http://localhost:8080**

---

## 🛠️ Ferramentas Recomendadas

### VS Code

**Extensões Essenciais**:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "supabase.supabase-vscode",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

**Configurações** (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

### Supabase CLI

**Instalação**:

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# npm (todas as plataformas)
npm install -g supabase
```

**Configuração**:

```bash
# Login
supabase login

# Link ao projeto
supabase link --project-ref pabxpvqwtvbjaunjejud
```

---

## 🗄️ Banco de Dados

### Desenvolvimento Local (Opcional)

**Iniciar Supabase Local**:

```bash
supabase start
```

Isso inicia:
- PostgreSQL (porta 54322)
- PostgREST API (porta 54321)
- Supabase Studio (porta 54323)
- Realtime (porta 54324)

**Parar**:

```bash
supabase stop
```

### Usar Banco de Produção

Para desenvolvimento, você pode usar o banco de produção (recomendado para este projeto):

```env
VITE_SUPABASE_URL="https://pabxpvqwtvbjaunjejud.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-aqui"
```

---

## 🔑 Criar Usuário Admin

### Via SQL

```sql
-- No Supabase SQL Editor
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'seu-email@exemplo.com';

-- Ou inserir diretamente
INSERT INTO user_roles (user_id, role)
VALUES ('uuid-do-usuario', 'admin');
```

### Via Edge Function

```bash
curl -X POST https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/admin-promote \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "uuid-do-usuario"}'
```

---

## 📦 Scripts Disponíveis

### Desenvolvimento

```bash
# Servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint
```

### Testes

```bash
# Rodar todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Testes de performance
npm run test:performance

# Testes E2E
npm run test:e2e
```

### Supabase

```bash
# Aplicar migrations
supabase db push

# Criar nova migration
supabase migration new nome_da_migration

# Deploy Edge Functions
supabase functions deploy

# Gerar tipos TypeScript
supabase gen types typescript --project-id pabxpvqwtvbjaunjejud > src/integrations/supabase/types.ts
```

---

## 🎨 Configuração do Projeto

### TypeScript

**tsconfig.json**:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Vite

**vite.config.ts**:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Tailwind CSS

**tailwind.config.ts**:

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Customizações
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

## 🔐 Secrets e Configurações

### Supabase Secrets

Para Edge Functions:

```bash
# Configurar secret
supabase secrets set EMAIL_API_KEY=xxx

# Listar secrets
supabase secrets list

# Ver valor (não recomendado em produção)
supabase secrets get EMAIL_API_KEY
```

### Variáveis de Ambiente

**Desenvolvimento** (`.env`):
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=xxx
```

**Produção** (Vercel/Netlify):
- Configure no dashboard da plataforma
- Nunca commite `.env` no git

---

## 🧪 Dados de Teste

### Seed do Banco

```bash
# Executar seed
psql -h localhost -p 54322 -U postgres -d postgres -f scripts/database/seeds/seed-chat-data.sql
```

### Criar Dados Manualmente

```sql
-- Criar usuário de teste
INSERT INTO profiles (id, full_name, email)
VALUES ('uuid', 'Teste User', 'teste@exemplo.com');

-- Criar conversa de teste
INSERT INTO support_conversations (user_id, subject)
VALUES ('uuid', 'Teste de Conversa');
```

---

## 🔄 Workflow de Desenvolvimento

### 1. Criar Branch

```bash
git checkout -b feature/nova-funcionalidade
```

### 2. Desenvolver

```bash
# Fazer mudanças
# Testar localmente
npm run dev
npm test
```

### 3. Commit

```bash
git add .
git commit -m "feat: adiciona nova funcionalidade"
```

**Convenção de Commits**:
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação
- `refactor:` - Refatoração
- `test:` - Testes
- `chore:` - Manutenção

### 4. Push e PR

```bash
git push origin feature/nova-funcionalidade
```

Criar Pull Request no GitHub.

---

## 🐛 Troubleshooting

### Erro: "Cannot find module '@/...'"

**Solução**:
```bash
# Reinstalar dependências
rm -rf node_modules
npm install

# Verificar tsconfig.json paths
```

### Erro: "Port 8080 already in use"

**Solução**:
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8080 | xargs kill -9
```

### Erro: "Supabase connection failed"

**Solução**:
1. Verificar `.env` está correto
2. Verificar projeto Supabase está ativo
3. Verificar internet

### Cache do Vite

**Solução**:
```bash
# Limpar cache
rm -rf node_modules/.vite
rm -rf dist

# Reinstalar
npm install
```

---

## 📚 Recursos Adicionais

### Documentação

- [Vite Docs](https://vitejs.dev/)
- [React Docs](https://react.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com/)

### Comunidade

- [Supabase Discord](https://discord.supabase.com/)
- [React Discord](https://discord.gg/react)

---

## ✅ Checklist de Setup

- [ ] Node.js 18+ instalado
- [ ] Repositório clonado
- [ ] Dependências instaladas
- [ ] `.env` configurado
- [ ] Servidor dev rodando
- [ ] VS Code com extensões
- [ ] Supabase CLI instalado
- [ ] Usuário admin criado
- [ ] Testes passando

---

**Última atualização**: 2026-02-24  
**Versão**: 1.0.0  
**Status**: ✅ Produção
