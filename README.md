# Ordax - Plataforma de Colecionáveis Premium

## Sobre o Projeto

**Ordax** é a plataforma de catálogo e gestão de pedidos da **Tonecos Studios**, estúdio brasileiro especializado em colecionáveis artesanais premium.

**URL de Produção**: https://pabxpvqwtvbjaunjejud.supabase.co  
**Supabase Project**: pabxpvqwtvbjaunjejud

## Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Auth**: Supabase Auth (Email + Google OAuth)
- **Storage**: Supabase Storage
- **AI**: OpenAI GPT-4o-mini (classificação e análise)

## Como Desenvolver

**Use seu IDE preferido**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```bash
# 1. Clone o repositório
git clone <YOUR_GIT_URL>
cd ordax

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
# O arquivo .env já está configurado com o projeto Supabase

# 4. Inicie o servidor de desenvolvimento
npm run dev

# 5. Acesse http://localhost:8080
```

## Estrutura do Projeto

```
ordax/
├── src/
│   ├── components/       # Componentes React reutilizáveis
│   ├── pages/           # Páginas da aplicação
│   │   ├── admin/       # Área administrativa
│   │   └── catalog/     # Catálogo de produtos
│   ├── lib/             # Utilitários e helpers
│   └── integrations/    # Integrações (Supabase)
├── supabase/
│   ├── functions/       # Edge Functions
│   └── migrations/      # Migrations do banco de dados
└── public/              # Assets estáticos
```

## Funcionalidades Principais

### Para Usuários
- 🔍 Catálogo de colecionáveis com busca e filtros
- ❤️ Sistema de likes e favoritos
- 💬 Solicitação de orçamentos personalizados
- 👤 Perfil de colecionador público
- 🏆 Sistema de badges e níveis
- 📦 Acompanhamento de pedidos

### Para Administradores
- 📤 Upload massivo de imagens (até 2000 por vez)
- 🤖 Classificação automática por IA
- 🎨 Modo esteira para aprovação rápida
- 👥 Gestão de usuários e permissões
- 📊 Gestão de orçamentos
- 🎯 Gestão de modelos e franquias

## Deploy

O projeto está configurado para deploy no Supabase:

```bash
# Deploy das Edge Functions
supabase functions deploy

# Aplicar migrations
supabase db push
```

Para configurar um domínio customizado, acesse:
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/general

## 📚 Documentação

### 🚀 Início Rápido
- **Novo no projeto?** Leia o [Guia Rápido de Navegação](GUIA_RAPIDO_NAVEGACAO.md)
- **Setup inicial**: [Getting Started](docs/getting-started.md)
- **Documentação completa**: [docs/README.md](docs/README.md)

### 📖 Documentação Organizada

#### Principais
- [Getting Started](docs/getting-started.md) - Setup e primeiros passos
- [Architecture](docs/architecture.md) - Arquitetura e tecnologias
- [Deployment](docs/deployment.md) - Guia de deploy
- [CHANGELOG.md](CHANGELOG.md) - Histórico de mudanças

#### Features
- [Sistema de Chat](docs/features/chat-system.md)
- [Sistema de Pagamentos](docs/features/payment-system.md)
- [Sistema de Assinaturas](docs/features/subscription-system.md)
- [Sistema de Coleções](docs/features/collections-system.md)
- [Painel Administrativo](docs/features/admin-panel.md)

#### API
- [Edge Functions](docs/api/edge-functions.md)
- [Database Schema](docs/api/database-schema.md)
- [Realtime](docs/api/realtime.md)

#### Development
- [Setup](docs/development/setup.md)
- [Testing](docs/development/testing.md)
- [Code Style](docs/development/code-style.md)
- [Troubleshooting](docs/development/troubleshooting.md)

## 🚀 Status do Projeto

**Versão**: 1.0.0  
**Status**: ✅ PRODUÇÃO  
**Última Atualização**: 2026-02-24

### Qualidade
- ✅ 59 testes automatizados (100% passando)
- ✅ 0 erros TypeScript
- ✅ Proteção XSS completa (42 testes)
- ✅ Error Boundaries implementados (17 testes)
- ✅ Performance otimizada (95% redução de queries)

### Funcionalidades
- ✅ Sistema de Catálogo
- ✅ Sistema de Autenticação
- ✅ Sistema de Chat/Suporte
- ✅ Sistema de Assinaturas
- ✅ Sistema de Pagamentos
- ✅ Sistema de Coleções
- ✅ Painel Administrativo
- ✅ Sistema de Grupos
- ✅ Sistema de Notificações
