# 🚀 Onboarding - Novo Desenvolvedor

Bem-vindo ao Projeto Ordax! Este guia vai te ajudar a começar em menos de 5 minutos.

## ⚡ Setup Rápido (< 5 minutos)

### Opção 1: Docker (Recomendado)

```bash
git clone <repo-url>
cd ordax
cp .env.example .env
npm run docker:dev
```

Acesse: http://localhost:5173

### Opção 2: Local

```bash
git clone <repo-url>
cd ordax
npm install
npm run dev
```

## 📚 Documentação Essencial

1. [README.md](README.md) - Visão geral
2. [INDICE_DOCUMENTACAO.md](INDICE_DOCUMENTACAO.md) - Índice completo
3. [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Guia Docker
4. [docs/architecture.md](docs/architecture.md) - Arquitetura

## 🎯 Comandos Principais

```bash
npm run dev              # Dev server
npm run test             # Testes
npm run lint             # Lint
npm run format           # Formatar
npm run docker:dev       # Docker dev
```

## 🏗️ Estrutura

```
src/
├── components/     # Componentes React
├── hooks/          # Custom hooks
├── lib/            # Utilities
├── pages/          # Páginas
└── test/           # Testes
```

## ✅ Checklist

- [ ] Clone o repositório
- [ ] Configure .env
- [ ] Rode `npm install` ou `npm run docker:dev`
- [ ] Acesse http://localhost:5173
- [ ] Leia a documentação
- [ ] Faça seu primeiro commit

Pronto! Você está pronto para desenvolver! 🎉
