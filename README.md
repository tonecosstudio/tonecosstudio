# 🎨 Ordax - Sistema de Gestão de Miniaturas

Sistema completo de gestão de produção, vendas e assinaturas de miniaturas personalizadas.

## 🚀 Tecnologias

- **Frontend:** React + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Pagamentos:** Integração com gateways de pagamento
- **Deploy:** Vercel

## 📋 Funcionalidades Principais

### Para Clientes
- 🛒 Catálogo de personagens e coleções
- 💳 Sistema de assinaturas com créditos (coins)
- 📦 Acompanhamento de pedidos e entregas
- 🎯 Escolha mensal de personagens
- 💰 Compras avulsas e orçamentos
- 👤 Perfil e histórico de compras

### Para Administradores
- 📊 Dashboard com métricas em tempo real
- 🏭 Gestão de produção e capacidade
- 💵 Sistema de preços contextual (SSOT)
- 🪙 Gerenciamento de créditos e ciclos
- 📦 Controle de pedidos unificado
- 👥 Gestão de usuários e assinaturas
- 💬 Central de comunicação
- ⚙️ Configurações centralizadas

## 🏗️ Arquitetura

### Painel Admin (Recém Refatorado)
O painel administrativo foi completamente refatorado em março/2026:
- ✅ Redução de 30% nas páginas (33 → 23)
- ✅ Navegação consolidada em hubs
- ✅ Arquitetura consistente e escalável
- ✅ 0 código legado

Ver [DOCS_INDEX.md](./DOCS_INDEX.md) para documentação completa.

### Estrutura de Pastas

```
ordax/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── admin/          # Componentes do admin
│   │   │   ├── credits/    # Sistema de créditos
│   │   │   ├── orders/     # Gestão de pedidos
│   │   │   ├── production/ # Produção
│   │   │   └── ...
│   │   └── ui/             # Componentes UI base
│   ├── pages/              # Páginas da aplicação
│   │   ├── admin/          # Páginas admin
│   │   └── ...
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilitários e serviços
│   ├── config/             # Configurações
│   └── integrations/       # Integrações (Supabase, etc)
├── supabase/
│   ├── functions/          # Edge functions
│   └── migrations/         # Migrações do banco
├── docs-archive/           # Documentos arquivados
└── scripts/                # Scripts de manutenção
```

## 🚀 Começando

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/ordax.git
cd ordax

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# Inicie o servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
# ... outras variáveis
```

## 📚 Documentação

### Documentação Principal
- **[DOCS_INDEX.md](./DOCS_INDEX.md)** - Índice completo da documentação
- **[REFATORACAO_ADMIN_CONCLUIDA.md](./REFATORACAO_ADMIN_CONCLUIDA.md)** - Refatoração do admin
- **[RESUMO_REFATORACAO_VISUAL.md](./RESUMO_REFATORACAO_VISUAL.md)** - Resumo visual

### Sistemas Específicos
- **Sistema de Prazos:** [SINGLE_SOURCE_OF_TRUTH_PRAZOS.md](./SINGLE_SOURCE_OF_TRUTH_PRAZOS.md)
- **Sistema de Preços:** [LIMPEZA_PRICING_MANAGEMENT.md](./LIMPEZA_PRICING_MANAGEMENT.md)
- **Análise Admin:** [ANALISE_ADMIN_PROFISSIONAL.md](./ANALISE_ADMIN_PROFISSIONAL.md)

### Documentos Arquivados
Ver [docs-archive/](./docs-archive/) para documentos de trabalho concluídos.

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch
```

## 🏗️ Build

```bash
# Build para produção
npm run build

# Preview do build
npm run preview
```

## 📦 Deploy

O projeto está configurado para deploy automático no Vercel:

1. Push para `main` → Deploy automático
2. Pull requests → Preview deployments
3. Variáveis de ambiente configuradas no Vercel

## 🔧 Scripts Úteis

```bash
# Linting
npm run lint

# Formatação
npm run format

# Type checking
npm run type-check

# Migrações Supabase
npm run migrate

# Seed do banco
npm run seed
```

## 📊 Status do Projeto

### ✅ Concluído
- Sistema de autenticação
- Catálogo de produtos
- Sistema de assinaturas
- Gestão de pedidos
- Painel administrativo (refatorado)
- Sistema de créditos (coins)
- Sistema de preços contextual

### 🔄 Em Desenvolvimento
- Melhorias de UX
- Otimizações de performance
- Testes automatizados

### 📋 Planejado
- App mobile
- Notificações push
- Integração com mais gateways

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- TypeScript strict mode
- ESLint + Prettier
- Conventional Commits
- Testes para novas features

## 📝 Changelog

Ver [REFATORACAO_ADMIN_CONCLUIDA.md](./REFATORACAO_ADMIN_CONCLUIDA.md) para mudanças recentes.

### Versão Atual: 2.0.0 (Março 2026)

**Principais Mudanças:**
- ✨ Refatoração completa do painel admin
- 🏗️ Arquitetura de hubs consolidados
- 🧹 Limpeza de código legado
- 📚 Documentação completa

## 📄 Licença

Este projeto é proprietário e confidencial.

## 👥 Equipe

- **Desenvolvimento:** Equipe Ordax
- **Design:** Equipe Ordax
- **Product:** Equipe Ordax

## 📞 Suporte

Para dúvidas ou suporte:
- 📧 Email: suporte@ordax.com
- 💬 Discord: [Link do servidor]
- 📖 Docs: [DOCS_INDEX.md](./DOCS_INDEX.md)

---

**Última Atualização:** Março 2026
**Versão:** 2.0.0
**Status:** ✅ Produção
