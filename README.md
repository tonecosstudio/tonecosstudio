# ORDAX - Sistema de Gestão de Colecionáveis

Sistema profissional de gestão de assinaturas, coleções e produção de peças colecionáveis.

## 🚀 Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui + Radix UI
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Pagamentos:** Stripe
- **Testes:** Vitest + Testing Library
- **Linting:** ESLint + Prettier

## 📋 Pré-requisitos

- Node.js 18+ ou Bun
- Conta Supabase
- Conta Stripe (opcional, para pagamentos)

## 🛠️ Instalação

```bash
# Clonar repositório
git clone <repository-url>
cd ordax

# Instalar dependências
npm install
# ou
bun install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais

# Executar migrations do Supabase
# (Ver docs/configuration/database-setup.md)

# Iniciar desenvolvimento
npm run dev
```

## 📁 Estrutura do Projeto

```
ordax/
├── src/
│   ├── components/       # Componentes React
│   │   ├── admin/       # Componentes administrativos
│   │   ├── ui/          # Componentes UI base (shadcn)
│   │   └── ...
│   ├── hooks/           # React hooks customizados
│   ├── pages/           # Páginas da aplicação
│   ├── services/        # Serviços e lógica de negócio
│   ├── lib/             # Utilitários e helpers
│   └── types/           # Definições TypeScript
├── supabase/
│   ├── functions/       # Edge Functions
│   └── migrations/      # Migrations do banco
├── docs/                # Documentação principal
└── docs-archive/        # Documentação histórica
```

## 🧪 Testes

```bash
# Executar todos os testes
npm run test

# Testes em modo watch
npm run test:watch

# Cobertura de testes
npm run test:coverage

# Testes de performance
npm run test:performance
```

## 🏗️ Build

```bash
# Build de produção
npm run build

# Preview do build
npm run preview

# Build de desenvolvimento (com source maps)
npm run build:dev
```

## 📚 Documentação

- [Análise de Refatoração](docs/ANALISE_PROFISSIONAL_REFATORACAO.md)
- [Configuração do Banco de Dados](docs-archive/configuration/)
- [Histórico de Correções](docs-archive/corrections-2026-03/)

## 🔒 Segurança

- Row Level Security (RLS) habilitado em todas as tabelas
- Sanitização de inputs com DOMPurify
- Validação de tipos com TypeScript
- Autenticação via Supabase Auth

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Proprietary - Todos os direitos reservados

## 👥 Equipe

Desenvolvido com ❤️ pela equipe ORDAX

---

**Status:** 🚧 Em desenvolvimento ativo
**Versão:** 0.0.0
**Última atualização:** Março 2026
