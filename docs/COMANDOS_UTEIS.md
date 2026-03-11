# Comandos Úteis - ORDAX

Referência rápida de comandos para desenvolvimento, testes e deploy.

---

## 🚀 Desenvolvimento

### Iniciar Servidor de Desenvolvimento
```bash
npm run dev
# ou
bun dev
```
Acesse: http://localhost:8080

### Build de Produção
```bash
npm run build
```

### Preview do Build
```bash
npm run preview
```

### Build de Desenvolvimento (com source maps)
```bash
npm run build:dev
```

---

## 🧪 Testes

### Executar Todos os Testes
```bash
npm run test
```

### Testes em Modo Watch
```bash
npm run test:watch
```

### Cobertura de Testes
```bash
npm run test:coverage
```

### Cobertura com UI
```bash
npm run test:coverage:ui
```

### Testes de Performance
```bash
npm run test:performance
```

### Testes E2E/Integração
```bash
npm run test:e2e
```

---

## 🎨 Linting e Formatação

### Executar ESLint
```bash
npm run lint
```

### Formatar Código
```bash
npm run format
```

### Verificar Formatação
```bash
npm run format:check
```

---

## 📦 Gerenciamento de Dependências

### Instalar Dependências
```bash
npm install
# ou
bun install
```

### Adicionar Dependência
```bash
npm install <package>
# ou
bun add <package>
```

### Adicionar Dependência de Desenvolvimento
```bash
npm install -D <package>
# ou
bun add -d <package>
```

### Atualizar Dependências
```bash
npm update
# ou
bun update
```

### Verificar Dependências Desatualizadas
```bash
npm outdated
```

---

## 🐳 Docker

### Desenvolvimento

#### Iniciar Containers
```bash
npm run docker:dev
```

#### Parar Containers
```bash
npm run docker:dev:stop
```

#### Ver Logs
```bash
npm run docker:dev:logs
```

### Produção

#### Build da Imagem
```bash
npm run docker:prod:build
```

#### Iniciar Containers
```bash
npm run docker:prod
```

#### Parar Containers
```bash
npm run docker:prod:stop
```

#### Ver Logs
```bash
npm run docker:prod:logs
```

### Limpeza

#### Limpar Todos os Containers e Volumes
```bash
npm run docker:clean
```

---

## 🗄️ Supabase

### Migrations

#### Criar Nova Migration
```bash
supabase migration new <nome_da_migration>
```

#### Aplicar Migrations
```bash
supabase db push
```

#### Reset do Banco (LOCAL)
```bash
supabase db reset
```

### Functions

#### Servir Functions Localmente
```bash
supabase functions serve
```

#### Deploy de Function
```bash
supabase functions deploy <nome_da_function>
```

#### Logs de Function
```bash
supabase functions logs <nome_da_function>
```

### Tipos

#### Gerar Tipos TypeScript
```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

---

## 🔍 Análise de Código

### Verificar Tamanho do Bundle
```bash
npm run build
npx vite-bundle-visualizer
```

### Análise de Dependências
```bash
npm ls
# ou
npm ls --depth=0  # Apenas top-level
```

### Encontrar Código Não Utilizado
```bash
npx depcheck
```

### Análise de Segurança
```bash
npm audit
npm audit fix
```

---

## 🔧 Utilitários

### Limpar Cache
```bash
# Node modules
rm -rf node_modules
npm install

# Build
rm -rf dist

# Coverage
rm -rf coverage

# Tudo
rm -rf node_modules dist coverage
npm install
```

### Verificar Versões
```bash
node --version
npm --version
bun --version
```

### Verificar Portas em Uso
```bash
# Windows
netstat -ano | findstr :8080

# Linux/Mac
lsof -i :8080
```

---

## 📝 Git

### Commits Convencionais
```bash
# Feature
git commit -m "feat: adiciona nova funcionalidade"

# Fix
git commit -m "fix: corrige bug no login"

# Docs
git commit -m "docs: atualiza README"

# Style
git commit -m "style: formata código"

# Refactor
git commit -m "refactor: reorganiza componentes"

# Test
git commit -m "test: adiciona testes unitários"

# Chore
git commit -m "chore: atualiza dependências"
```

### Branches
```bash
# Criar e mudar para nova branch
git checkout -b feature/nova-funcionalidade

# Listar branches
git branch

# Deletar branch
git branch -d feature/antiga
```

### Stash
```bash
# Salvar mudanças temporariamente
git stash

# Listar stashes
git stash list

# Aplicar último stash
git stash pop

# Aplicar stash específico
git stash apply stash@{0}
```

---

## 🚀 Deploy

### Vercel

#### Deploy Manual
```bash
vercel
```

#### Deploy de Produção
```bash
vercel --prod
```

#### Ver Logs
```bash
vercel logs
```

### Variáveis de Ambiente

#### Adicionar Variável
```bash
vercel env add <NOME_DA_VARIAVEL>
```

#### Listar Variáveis
```bash
vercel env ls
```

---

## 🔍 Debugging

### TypeScript

#### Verificar Erros
```bash
npx tsc --noEmit
```

#### Verificar Arquivo Específico
```bash
npx tsc --noEmit src/path/to/file.ts
```

### ESLint

#### Verificar Arquivo Específico
```bash
npx eslint src/path/to/file.ts
```

#### Fix Automático
```bash
npx eslint src/path/to/file.ts --fix
```

### Prettier

#### Verificar Arquivo
```bash
npx prettier --check src/path/to/file.ts
```

#### Formatar Arquivo
```bash
npx prettier --write src/path/to/file.ts
```

---

## 📊 Performance

### Lighthouse
```bash
# Instalar
npm install -g lighthouse

# Executar
lighthouse http://localhost:8080 --view
```

### Bundle Analyzer
```bash
npm run build
npx vite-bundle-visualizer
```

---

## 🛠️ Troubleshooting

### Problemas Comuns

#### Port Already in Use
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8080
kill -9 <PID>
```

#### Node Modules Corrompidos
```bash
rm -rf node_modules package-lock.json
npm install
```

#### Cache do Vite
```bash
rm -rf node_modules/.vite
npm run dev
```

#### Problemas com Supabase
```bash
supabase stop
supabase start
```

---

## 📚 Documentação

### Gerar Documentação de API
```bash
npx typedoc --out docs/api src
```

### Servir Documentação Localmente
```bash
npx http-server docs/api
```

---

## 🔐 Segurança

### Verificar Vulnerabilidades
```bash
npm audit
```

### Corrigir Vulnerabilidades
```bash
npm audit fix
```

### Verificar Secrets no Código
```bash
npx secretlint "**/*"
```

---

## 📦 Release

### Criar Nova Versão
```bash
# Patch (0.0.X)
npm run release

# Minor (0.X.0)
npm run release:minor

# Major (X.0.0)
npm run release:major
```

### Publicar Tag
```bash
git push --follow-tags origin main
```

---

## 💡 Dicas

### Aliases Úteis (adicionar ao .bashrc ou .zshrc)
```bash
alias dev="npm run dev"
alias build="npm run build"
alias test="npm run test"
alias lint="npm run lint"
alias format="npm run format"
```

### VS Code Tasks
Adicionar ao `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "dev",
      "type": "npm",
      "script": "dev",
      "problemMatcher": []
    },
    {
      "label": "test",
      "type": "npm",
      "script": "test",
      "problemMatcher": []
    }
  ]
}
```

---

**Última atualização:** 11 de Março de 2026
