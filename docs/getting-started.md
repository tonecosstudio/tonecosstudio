# 🚀 Getting Started - Ordax

Guia rápido para começar a desenvolver na plataforma Ordax.

---

## 📋 Pré-requisitos

- **Node.js** 18+ ([instalar com nvm](https://github.com/nvm-sh/nvm))
- **npm** ou **bun**
- **Git**
- Conta no **Supabase** (para desenvolvimento)

---

## ⚡ Quick Start

### 1. Clone o Repositório

```bash
git clone <YOUR_GIT_URL>
cd ordax
```

### 2. Instale as Dependências

```bash
npm install
# ou
bun install
```

### 3. Configure as Variáveis de Ambiente

O arquivo `.env` já está configurado com o projeto Supabase de produção:

```env
VITE_SUPABASE_URL="https://pabxpvqwtvbjaunjejud.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-aqui"
```

Para desenvolvimento local, você pode criar um projeto Supabase separado.

### 4. Inicie o Servidor de Desenvolvimento

```bash
npm run dev
```

Acesse: **http://localhost:8080**

---

## 🏗️ Estrutura do Projeto

```
ordax/
├── src/
│   ├── components/       # Componentes React reutilizáveis
│   │   ├── admin/       # Componentes do painel admin
│   │   ├── chat/        # Componentes de chat
│   │   ├── groups/      # Componentes de grupos
│   │   ├── customer/    # Componentes da área do cliente
│   │   └── ui/          # Componentes UI (shadcn)
│   │
│   ├── pages/           # Páginas da aplicação
│   │   ├── admin/       # Páginas administrativas
│   │   └── catalog/     # Páginas do catálogo
│   │
│   ├── lib/             # Utilitários e serviços
│   │   ├── services/    # Serviços de negócio
│   │   ├── utils/       # Utilitários gerais
│   │   └── validations/ # Validações
│   │
│   ├── hooks/           # React Hooks customizados
│   ├── integrations/    # Integrações (Supabase)
│   ├── types/           # TypeScript types
│   └── test/            # Testes
│
├── supabase/
│   ├── functions/       # Edge Functions
│   └── migrations/      # Migrations do banco
│
├── docs/                # Documentação
├── scripts/             # Scripts utilitários
└── public/              # Assets estáticos
```

---

## 🎯 Comandos Essenciais

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
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

# Rodar testes em modo watch
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

# Deploy Edge Functions
supabase functions deploy

# Gerar tipos TypeScript
supabase gen types typescript --project-id pabxpvqwtvbjaunjejud > src/integrations/supabase/types.ts
```

---

## 🔑 Acesso ao Sistema

### Área Pública
- **Home**: http://localhost:8080
- **Catálogo**: http://localhost:8080/catalogo
- **Coleções**: http://localhost:8080/colecoes
- **Planos**: http://localhost:8080/planos

### Área do Cliente (requer login)
- **Perfil**: http://localhost:8080/perfil
- **Minhas Assinaturas**: http://localhost:8080/minhas-assinaturas
- **Meus Pagamentos**: http://localhost:8080/meus-pagamentos
- **Suporte**: http://localhost:8080/suporte
- **Wishlist**: http://localhost:8080/wishlist

### Área Administrativa (requer admin)
- **Dashboard**: http://localhost:8080/admin
- **Usuários**: http://localhost:8080/admin/usuarios
- **Chat/Suporte**: http://localhost:8080/admin/suporte
- **Grupos**: http://localhost:8080/admin/grupos
- **Coleções**: http://localhost:8080/admin/colecoes
- **Assinaturas**: http://localhost:8080/admin/assinaturas
- **Pagamentos**: http://localhost:8080/admin/pagamentos
- **Orçamentos**: http://localhost:8080/admin/orcamentos

---

## 👤 Criar Usuário Admin

Para tornar um usuário administrador:

```sql
-- Execute no Supabase SQL Editor
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'seu-email@exemplo.com';
```

Ou use a Edge Function:

```bash
curl -X POST https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/admin-promote \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "uuid-do-usuario"}'
```

---

## 🧪 Dados de Teste

### Criar Dados de Teste para Chat

```bash
# Execute no Supabase SQL Editor
-- Ver: scripts/database/seeds/seed-chat-data.sql
```

### Popular Coleções de Teste

```bash
# Execute no Supabase SQL Editor
-- Ver: scripts/database/seeds/popular-franquias-exemplo.sql
```

---

## 🔧 Troubleshooting

### Erro: "Cannot find module '@/...'"

Certifique-se de que o TypeScript está configurado corretamente:

```bash
# Verificar erros TypeScript
npx tsc --noEmit
```

### Erro: "Supabase connection failed"

1. Verifique se as variáveis de ambiente estão corretas
2. Verifique se o projeto Supabase está ativo
3. Verifique sua conexão com a internet

### Erro: "Port 8080 already in use"

```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8080 | xargs kill -9
```

### Cache do Vite

Se encontrar problemas de cache:

```bash
# Limpar cache do Vite
rm -rf node_modules/.vite

# Reinstalar dependências
rm -rf node_modules
npm install
```

---

## 📚 Próximos Passos

Agora que você tem o projeto rodando:

1. **[Entenda a Arquitetura](architecture.md)** - Visão geral do sistema
2. **[Leia o Guia de Desenvolvimento](development/setup.md)** - Padrões e práticas
3. **[Explore as Funcionalidades](features/chat-system.md)** - Sistemas implementados
4. **[Configure seu Ambiente](development/setup.md)** - IDE, extensões, etc.

---

## 🆘 Precisa de Ajuda?

- **Documentação**: [docs/README.md](README.md)
- **Troubleshooting**: [development/troubleshooting.md](development/troubleshooting.md)
- **Issues**: GitHub Issues
- **Email**: suporte@tonecos.com.br

---

**Última atualização**: 2026-02-24  
**Tempo estimado**: 15 minutos
