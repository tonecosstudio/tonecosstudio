# 🚀 Guia Rápido de Navegação - Ordax

**Bem-vindo ao projeto Ordax!** Este guia ajuda você a encontrar rapidamente o que precisa.

## 📍 Começando

### Primeiro Acesso

1. 📖 Leia [`README.md`](README.md) - Visão geral do projeto
2. 🚀 Siga [`docs/getting-started.md`](docs/getting-started.md) - Setup inicial
3. 🗺️ Explore [`docs/README.md`](docs/README.md) - Índice completo

### Setup Rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 3. Iniciar desenvolvimento
npm run dev
```

## 📚 Documentação por Necessidade

### "Preciso entender o sistema"

- 🏗️ **Arquitetura**: [`docs/architecture.md`](docs/architecture.md)
- 💬 **Chat**: [`docs/features/chat-system.md`](docs/features/chat-system.md)
- 💰 **Pagamentos**: [`docs/features/payment-system.md`](docs/features/payment-system.md)
- 📦 **Assinaturas**: [`docs/features/subscription-system.md`](docs/features/subscription-system.md)
- 🎨 **Coleções**: [`docs/features/collections-system.md`](docs/features/collections-system.md)
- 👨‍💼 **Admin**: [`docs/features/admin-panel.md`](docs/features/admin-panel.md)

### "Preciso desenvolver"

- ⚙️ **Setup**: [`docs/development/setup.md`](docs/development/setup.md)
- 🎨 **Code Style**: [`docs/development/code-style.md`](docs/development/code-style.md)
- 🧪 **Testes**: [`docs/development/testing.md`](docs/development/testing.md)
- 🔧 **Troubleshooting**: [`docs/development/troubleshooting.md`](docs/development/troubleshooting.md)

### "Preciso usar a API"

- ⚡ **Edge Functions**: [`docs/api/edge-functions.md`](docs/api/edge-functions.md)
- 🗄️ **Database**: [`docs/api/database-schema.md`](docs/api/database-schema.md)
- 🔄 **Realtime**: [`docs/api/realtime.md`](docs/api/realtime.md)

### "Preciso fazer deploy"

- 🚀 **Deploy**: [`docs/deployment.md`](docs/deployment.md)
- 📜 **Scripts**: [`scripts/deployment/`](scripts/deployment/)

## 🛠️ Scripts por Tarefa

### Deploy

```bash
# Ver scripts disponíveis
ls scripts/deployment/

# Deploy completo
scripts/deployment/deploy.bat

# Deploy de functions
scripts/deployment/deploy-functions.bat

# Aplicar migrations
scripts/deployment/aplicar-migrations.bat
```

### Testes

```bash
# Ver scripts disponíveis
ls scripts/testing/

# Teste completo
npm run test

# Teste específico
scripts/testing/testar-sistema-chat.bat
```

### Development

```bash
# Ver scripts disponíveis
ls scripts/development/

# Limpar cache
scripts/development/limpar-cache.bat

# Reiniciar dev server
scripts/development/reiniciar-dev.bat
```

### Database

```bash
# Ver scripts disponíveis
ls scripts/database/

# Migrations
ls scripts/database/migrations/

# Seeds (dados de teste)
ls scripts/database/seeds/

# Utilities (diagnóstico)
ls scripts/database/utilities/
```

## 🔍 Encontrando Informações

### Por Funcionalidade

| Funcionalidade | Documento                                                                      |
| -------------- | ------------------------------------------------------------------------------ |
| Chat e Suporte | [`docs/features/chat-system.md`](docs/features/chat-system.md)                 |
| Pagamentos     | [`docs/features/payment-system.md`](docs/features/payment-system.md)           |
| Assinaturas    | [`docs/features/subscription-system.md`](docs/features/subscription-system.md) |
| Coleções       | [`docs/features/collections-system.md`](docs/features/collections-system.md)   |
| Painel Admin   | [`docs/features/admin-panel.md`](docs/features/admin-panel.md)                 |

### Por Tipo de Trabalho

| Tarefa              | Documento                                                                    |
| ------------------- | ---------------------------------------------------------------------------- |
| Configurar ambiente | [`docs/development/setup.md`](docs/development/setup.md)                     |
| Escrever código     | [`docs/development/code-style.md`](docs/development/code-style.md)           |
| Criar testes        | [`docs/development/testing.md`](docs/development/testing.md)                 |
| Resolver problemas  | [`docs/development/troubleshooting.md`](docs/development/troubleshooting.md) |
| Fazer deploy        | [`docs/deployment.md`](docs/deployment.md)                                   |

### Por Tecnologia

| Tecnologia         | Documento                                                          |
| ------------------ | ------------------------------------------------------------------ |
| Edge Functions     | [`docs/api/edge-functions.md`](docs/api/edge-functions.md)         |
| Supabase Database  | [`docs/api/database-schema.md`](docs/api/database-schema.md)       |
| Realtime           | [`docs/api/realtime.md`](docs/api/realtime.md)                     |
| React + TypeScript | [`docs/development/code-style.md`](docs/development/code-style.md) |

## 🆘 Problemas Comuns

### Erro de Build

👉 [`docs/development/troubleshooting.md#build`](docs/development/troubleshooting.md)

### Erro 406 (Database)

👉 [`docs/development/troubleshooting.md#erro-406`](docs/development/troubleshooting.md)

### Erro 500 (Edge Functions)

👉 [`docs/development/troubleshooting.md#erro-500`](docs/development/troubleshooting.md)

### Modal Vazio

👉 [`docs/development/troubleshooting.md#modal-vazio`](docs/development/troubleshooting.md)

### Scroll Não Funciona

👉 [`docs/development/troubleshooting.md#scroll`](docs/development/troubleshooting.md)

### Email Não Envia

👉 [`docs/development/troubleshooting.md#email`](docs/development/troubleshooting.md)

## 📋 Comandos Mais Usados

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor
npm run build           # Build de produção
npm run preview         # Preview do build

# Testes
npm run test            # Rodar todos os testes
npm run test:watch      # Modo watch
npm run test:e2e        # Testes E2E

# Linting
npm run lint            # Verificar código

# Database
supabase db push        # Aplicar migrations
supabase gen types      # Gerar tipos TypeScript

# Deploy
npm run build           # Build
# + upload para hosting
```

## 🗂️ Estrutura do Projeto

```
ordax/
├── src/                    # Código fonte
│   ├── components/        # Componentes React
│   ├── pages/            # Páginas
│   ├── lib/              # Bibliotecas e utils
│   └── test/             # Testes
│
├── docs/                  # 📚 Documentação
│   ├── features/         # Funcionalidades
│   ├── api/              # API e Database
│   ├── development/      # Guias de dev
│   └── archive/          # Histórico
│
├── scripts/              # 🛠️ Scripts
│   ├── deployment/       # Deploy
│   ├── testing/          # Testes
│   ├── development/      # Dev tools
│   └── database/         # SQL scripts
│
└── supabase/             # Configuração Supabase
    └── functions/        # Edge Functions
```

## 🎯 Fluxos de Trabalho

### Nova Feature

1. Ler documentação da feature relacionada
2. Seguir code style guide
3. Escrever testes
4. Implementar
5. Testar localmente
6. Fazer PR

### Bug Fix

1. Consultar troubleshooting
2. Reproduzir o bug
3. Escrever teste que falha
4. Corrigir
5. Verificar teste passa
6. Fazer PR

### Deploy

1. Seguir checklist de deploy
2. Rodar testes
3. Build de produção
4. Aplicar migrations
5. Deploy de functions
6. Validar em produção

## 📞 Precisa de Ajuda?

1. 🔍 **Busque na documentação**: [`docs/README.md`](docs/README.md)
2. 🔧 **Troubleshooting**: [`docs/development/troubleshooting.md`](docs/development/troubleshooting.md)
3. 💬 **Abra uma issue**: Descreva o problema
4. 👥 **Pergunte ao time**: Slack/Discord

## 🎓 Recursos Externos

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [Vite Docs](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 📝 Contribuindo

1. Leia [`docs/development/code-style.md`](docs/development/code-style.md)
2. Siga os padrões estabelecidos
3. Escreva testes
4. Documente mudanças
5. Faça PR com descrição clara

---

**Dica**: Adicione este guia aos favoritos do seu navegador! 🔖

**Última atualização**: 2026-02-24
