# COMANDOS ÚTEIS - ORDAX

Referência rápida de comandos para desenvolvimento, testes e deploy.

---

## 🚀 DESENVOLVIMENTO

### Iniciar Servidor de Desenvolvimento
```bash
npm run dev
```

### Build de Produção
```bash
npm run build
```

### Preview do Build
```bash
npm run preview
```

### Verificar Tipos TypeScript
```bash
npm run type-check
# ou
npx tsc --noEmit
```

### Lint
```bash
npm run lint
```

### Format
```bash
npm run format
```

---

## 🧪 TESTES

### Executar Todos os Testes
```bash
npm run test
```

### Testes em Watch Mode
```bash
npm run test:watch
```

### Coverage
```bash
npm run test:coverage
```

### Testes E2E
```bash
npm run test:e2e
```

---

## 📦 SUPABASE

### Gerar Tipos TypeScript
```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Iniciar Supabase Local
```bash
npx supabase start
```

### Parar Supabase Local
```bash
npx supabase stop
```

### Reset Database Local
```bash
npx supabase db reset
```

### Criar Nova Migration
```bash
npx supabase migration new nome_da_migration
```

### Aplicar Migrations
```bash
npx supabase db push
```

---

## 🔍 ANÁLISE E DEBUG

### Analisar Bundle Size
```bash
npm run build -- --analyze
# ou
npx vite-bundle-visualizer
```

### Verificar Dependências Desatualizadas
```bash
npm outdated
```

### Atualizar Dependências
```bash
npm update
```

### Verificar Vulnerabilidades
```bash
npm audit
```

### Corrigir Vulnerabilidades
```bash
npm audit fix
```

### Limpar Cache
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

---

## 🔒 SEGURANÇA

### Verificar Headers de Segurança
```bash
curl -I https://ordax.com.br
```

### Testar CSP
```bash
curl -I https://ordax.com.br | grep -i "content-security-policy"
```

### Scan de Vulnerabilidades
```bash
npm audit
npx snyk test
```

### Verificar Certificado SSL
```bash
openssl s_client -connect ordax.com.br:443 -servername ordax.com.br
```

---

## 📊 PERFORMANCE

### Lighthouse CI
```bash
npx lighthouse https://ordax.com.br --view
```

### Lighthouse com Configuração Customizada
```bash
npx lighthouse https://ordax.com.br \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=html \
  --output-path=./lighthouse-report.html \
  --view
```

### WebPageTest
```bash
# Usar https://www.webpagetest.org/
```

### Analisar Core Web Vitals
```bash
npx web-vitals-cli https://ordax.com.br
```

---

## 🗄️ DATABASE

### Backup Database
```bash
npx supabase db dump -f backup.sql
```

### Restore Database
```bash
psql -h localhost -U postgres -d postgres -f backup.sql
```

### Executar Query
```bash
npx supabase db query "SELECT * FROM profiles LIMIT 10"
```

---

## 🚢 DEPLOY

### Deploy para Vercel (Produção)
```bash
vercel --prod
```

### Deploy para Vercel (Preview)
```bash
vercel
```

### Ver Logs do Vercel
```bash
vercel logs
```

### Ver Deployments
```bash
vercel ls
```

### Remover Deployment
```bash
vercel rm [deployment-url]
```

---

## 🔧 MANUTENÇÃO

### Limpar Build
```bash
rm -rf dist
```

### Limpar Cache do Vite
```bash
rm -rf node_modules/.vite
```

### Reinstalar Dependências
```bash
rm -rf node_modules package-lock.json
npm install
```

### Verificar Espaço em Disco
```bash
du -sh node_modules
du -sh dist
```

---

## 📝 GIT

### Commit Convencional
```bash
git commit -m "feat: adiciona sanitização no login"
git commit -m "fix: corrige erro de tipo no usePaginatedQuery"
git commit -m "docs: atualiza documentação de segurança"
git commit -m "refactor: melhora estrutura do código"
git commit -m "perf: otimiza carregamento de imagens"
git commit -m "test: adiciona testes de sanitização"
```

### Ver Histórico
```bash
git log --oneline --graph --all
```

### Ver Diferenças
```bash
git diff
git diff --staged
```

### Desfazer Último Commit (mantém alterações)
```bash
git reset --soft HEAD~1
```

### Desfazer Último Commit (descarta alterações)
```bash
git reset --hard HEAD~1
```

---

## 🐛 DEBUG

### Debug com Chrome DevTools
```bash
# Adicionar no package.json:
"scripts": {
  "dev:debug": "vite --debug"
}

npm run dev:debug
```

### Ver Logs do Supabase
```bash
npx supabase logs
```

### Ver Logs de Edge Functions
```bash
npx supabase functions logs [function-name]
```

### Debug de Edge Function Local
```bash
npx supabase functions serve [function-name] --debug
```

---

## 📱 MOBILE

### Testar em Dispositivo Móvel
```bash
# Obter IP local
ipconfig getifaddr en0  # macOS
hostname -I  # Linux
ipconfig  # Windows

# Acessar de dispositivo móvel
http://[SEU-IP]:5173
```

### Lighthouse Mobile
```bash
npx lighthouse https://ordax.com.br \
  --preset=mobile \
  --view
```

---

## 🔄 CI/CD

### Executar Checks Localmente
```bash
# Simular CI pipeline
npm run type-check && \
npm run lint && \
npm run test && \
npm run build
```

### Verificar se Build Funciona
```bash
npm run build && npm run preview
```

---

## 📊 MONITORAMENTO

### Ver Uso de Memória
```bash
node --max-old-space-size=4096 node_modules/.bin/vite build
```

### Profiling de Performance
```bash
node --prof node_modules/.bin/vite build
```

### Analisar Profiling
```bash
node --prof-process isolate-*.log > processed.txt
```

---

## 🎨 ASSETS

### Otimizar Imagens
```bash
# Instalar imagemin
npm install -g imagemin-cli

# Otimizar todas as imagens
imagemin src/assets/*.{jpg,png} --out-dir=src/assets/optimized
```

### Converter para WebP
```bash
# Instalar cwebp
brew install webp  # macOS
apt-get install webp  # Linux

# Converter
cwebp -q 80 input.jpg -o output.webp
```

### Gerar Favicons
```bash
# Usar https://realfavicongenerator.net/
```

---

## 🔐 ENVIRONMENT VARIABLES

### Ver Variáveis de Ambiente
```bash
printenv | grep VITE_
```

### Testar com Diferentes Ambientes
```bash
# Development
npm run dev

# Production
VITE_ENV=production npm run dev

# Staging
VITE_ENV=staging npm run dev
```

---

## 📦 PACKAGE MANAGEMENT

### Adicionar Dependência
```bash
npm install [package]
```

### Adicionar Dev Dependency
```bash
npm install -D [package]
```

### Remover Dependência
```bash
npm uninstall [package]
```

### Listar Dependências
```bash
npm list --depth=0
```

### Verificar Versão de Package
```bash
npm view [package] version
```

---

## 🚨 TROUBLESHOOTING

### Erro: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Port already in use"
```bash
# Encontrar processo usando a porta
lsof -i :5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows

# Matar processo
kill -9 [PID]  # macOS/Linux
taskkill /PID [PID] /F  # Windows
```

### Erro: "Out of memory"
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Erro: "ENOSPC: System limit for number of file watchers reached"
```bash
# Linux
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## 📚 DOCUMENTAÇÃO

### Gerar Documentação de API
```bash
npx typedoc --out docs src
```

### Servir Documentação
```bash
npx http-server docs
```

---

## 🎯 QUICK WINS

### Verificar Tudo Antes de Commit
```bash
npm run type-check && npm run lint && npm run test && echo "✅ Tudo OK!"
```

### Build e Deploy Rápido
```bash
npm run build && vercel --prod
```

### Atualizar Tipos do Supabase e Verificar
```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts && npm run type-check
```

### Limpar Tudo e Reinstalar
```bash
rm -rf node_modules package-lock.json dist .vite && npm install
```

---

## 💡 ALIASES ÚTEIS

Adicione ao seu `.bashrc` ou `.zshrc`:

```bash
# ORDAX Aliases
alias ordax-dev="npm run dev"
alias ordax-build="npm run build"
alias ordax-test="npm run type-check && npm run lint && npm run test"
alias ordax-types="npx supabase gen types typescript --local > src/integrations/supabase/types.ts"
alias ordax-clean="rm -rf node_modules package-lock.json dist .vite && npm install"
alias ordax-deploy="npm run build && vercel --prod"
```

---

## 🔗 LINKS ÚTEIS

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://app.supabase.com
- **Lighthouse**: https://developers.google.com/web/tools/lighthouse
- **WebPageTest**: https://www.webpagetest.org/
- **Can I Use**: https://caniuse.com/
- **Bundle Phobia**: https://bundlephobia.com/

---

**Dica**: Salve este arquivo nos favoritos para acesso rápido! 🚀
