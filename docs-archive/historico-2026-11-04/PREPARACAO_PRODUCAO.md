# Preparação para Produção - Checklist

**Data:** 11 de Março de 2026  
**Status:** 🚧 Em Progresso

## ✅ Limpeza Realizada

### Documentação
- [x] 44 arquivos MD movidos para `docs-archive/`
- [x] Estrutura organizada em:
  - `docs-archive/corrections-2026-03/` - Correções históricas
  - `docs-archive/configuration/` - Guias de configuração
  - `docs-archive/analysis/` - Análises e checklists
- [x] README.md profissional criado
- [x] docs/README.md com índice criado
- [x] .env.example criado

### Arquivos Obsoletos Removidos
- [x] `sql_arquivos_antigos_nao_usar/` - Diretório legado
- [x] `subscription-api/` - API antiga não utilizada
- [x] `extract_expected_schema_from_code.sh` - Script obsoleto
- [x] `reset_remote_migrations.sql` - SQL legado
- [x] `test_api_curl.sh` - Script de teste obsoleto
- [x] `cleanup-docs.ps1` - Script temporário

### Estrutura Atual da Raiz
```
ordax/
├── .env.example          ✅ Novo
├── .gitignore
├── README.md             ✅ Atualizado
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── components.json
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── docs/                 ✅ Organizado
├── docs-archive/         ✅ Novo
├── src/
├── supabase/
├── public/
└── ...
```

---

## 🔴 CRÍTICO - Fazer Antes do Launch

### 1. TypeScript Strict Mode
**Status:** ❌ Não Iniciado  
**Prioridade:** CRÍTICA  
**Tempo Estimado:** 2-3 dias

```json
// tsconfig.json - Atualizar para:
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Impacto:** Previne bugs em produção, melhora manutenibilidade

### 2. Remover @ts-nocheck (25+ arquivos)
**Status:** ❌ Não Iniciado  
**Prioridade:** CRÍTICA  
**Tempo Estimado:** 5-7 dias

**Arquivos prioritários:**
1. `src/services/collection-service.ts`
2. `src/services/subscription-credit-api.ts`
3. `src/services/admin/production-service.ts`
4. `src/hooks/useCollectionPricing.ts`
5. `src/hooks/useAdminNotifications.ts`
... (20+ arquivos restantes)

**Impacto:** Segurança de tipos, previne erros em runtime

### 3. Remover Console.log de Produção
**Status:** ❌ Não Iniciado  
**Prioridade:** CRÍTICA  
**Tempo Estimado:** 1 dia

**Ações:**
- [ ] Implementar logger profissional (Winston/Pino)
- [ ] Remover todos console.log
- [ ] Adicionar environment-based logging
- [ ] Configurar log levels (error, warn, info, debug)

**Impacto:** Performance, segurança, profissionalismo

### 4. Variáveis de Ambiente
**Status:** ⚠️ Parcial  
**Prioridade:** CRÍTICA  
**Tempo Estimado:** 2 horas

**Ações:**
- [x] Criar .env.example
- [ ] Validar todas variáveis necessárias
- [ ] Documentar cada variável
- [ ] Configurar variáveis no Vercel/hosting
- [ ] Testar build sem variáveis locais

---

## 🟡 ALTO - Fazer na Sprint Atual

### 5. Consolidar Código Duplicado
**Status:** ❌ Não Iniciado  
**Tempo Estimado:** 2 dias

**Arquivos:**
- `src/services/admin/orders-service.ts` - `fetchUnifiedOrders()`
- `src/services/admin/orders-service-v3.ts` - `fetchAllOrders()`

**Ação:** Manter apenas uma implementação, deprecar outras

### 6. Corrigir Sanitização
**Status:** ❌ Não Iniciado  
**Tempo Estimado:** 1 dia

**Arquivo:** `src/lib/sanitizer.ts`

**Ação:** Remover regex patterns de SQL injection (Supabase RLS já protege)

### 7. ESLint Configuration
**Status:** ❌ Não Iniciado  
**Tempo Estimado:** 1 dia

```javascript
// eslint.config.js - Atualizar para:
rules: {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-unused-vars": "error",
  "react-hooks/exhaustive-deps": "error",
}
```

### 8. Testes de Integração
**Status:** ⚠️ Parcial (96 testes existentes)  
**Tempo Estimado:** 3 dias

**Ações:**
- [ ] Testar fluxo completo de compra
- [ ] Testar fluxo de assinatura
- [ ] Testar admin workflows
- [ ] Testar edge cases
- [ ] Testar error handling

---

## 🟡 MÉDIO - Fazer Antes do Launch

### 9. Reorganizar Componentes Admin
**Status:** ❌ Não Iniciado  
**Tempo Estimado:** 3 dias

**Estrutura proposta:**
```
src/components/admin/
├── analytics/
├── collections/
├── orders/
│   ├── list/
│   ├── detail/
│   └── filters/
├── payments/
├── production/
└── settings/
```

### 10. Reorganizar Páginas Admin
**Status:** ❌ Não Iniciado  
**Tempo Estimado:** 2 dias

**Estrutura proposta:**
```
src/pages/admin/
├── analytics/
├── collections/
├── orders/
├── payments/
└── settings/
```

### 11. Consolidar Migrations
**Status:** ❌ Não Iniciado  
**Tempo Estimado:** 1 dia  
**Risco:** Alto

**Ação:** Criar migration consolidada limpa para novos ambientes

### 12. Performance Optimization
**Status:** ❌ Não Iniciado  
**Tempo Estimado:** 2 dias

**Ações:**
- [ ] Lazy loading de componentes
- [ ] Code splitting
- [ ] Image optimization
- [ ] Bundle size analysis
- [ ] Lighthouse audit

---

## 🟢 BAIXO - Nice to Have

### 13. Documentação de API
**Status:** ❌ Não Iniciado  
**Tempo Estimado:** 2 dias

### 14. Storybook para Componentes
**Status:** ❌ Não Iniciado  
**Tempo Estimado:** 3 dias

### 15. CI/CD Pipeline
**Status:** ❌ Não Iniciado  
**Tempo Estimado:** 2 dias

---

## 📊 Progresso Geral

| Categoria | Progresso | Status |
|-----------|-----------|--------|
| Limpeza de Código | 30% | 🟡 |
| Type Safety | 0% | 🔴 |
| Testes | 60% | 🟡 |
| Documentação | 80% | 🟢 |
| Performance | 0% | 🔴 |
| Segurança | 70% | 🟡 |

**Progresso Total:** 40% ⚠️

---

## 🎯 Timeline Sugerido

### Semana 1 (Crítico)
- Dias 1-3: TypeScript Strict Mode
- Dias 4-5: Remover @ts-nocheck (prioridade alta)
- Dia 6: Remover console.log
- Dia 7: Configurar variáveis de ambiente

### Semana 2 (Alto)
- Dias 1-2: Consolidar código duplicado
- Dia 3: Corrigir sanitização
- Dia 4: ESLint configuration
- Dias 5-7: Testes de integração

### Semana 3 (Médio)
- Dias 1-3: Reorganizar componentes
- Dias 4-5: Reorganizar páginas
- Dias 6-7: Performance optimization

### Semana 4 (Final)
- Dias 1-2: Consolidar migrations
- Dias 3-4: Testes finais
- Dias 5-7: Deploy e monitoramento

---

## ✅ Checklist Final Antes do Launch

### Código
- [ ] TypeScript strict mode habilitado
- [ ] Zero arquivos com @ts-nocheck
- [ ] Zero console.log em produção
- [ ] ESLint sem warnings
- [ ] Todos testes passando
- [ ] Bundle size otimizado

### Segurança
- [ ] RLS policies testadas
- [ ] Variáveis de ambiente configuradas
- [ ] Secrets não commitados
- [ ] HTTPS configurado
- [ ] CORS configurado corretamente

### Performance
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Bundle size < 500KB

### Documentação
- [ ] README.md atualizado
- [ ] .env.example completo
- [ ] Guias de setup atualizados
- [ ] API documentada

### Infraestrutura
- [ ] Backup do banco configurado
- [ ] Monitoring configurado
- [ ] Error tracking configurado (Sentry)
- [ ] Analytics configurado

### Legal
- [ ] Termos de uso
- [ ] Política de privacidade
- [ ] LGPD compliance

---

## 🚨 Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Bugs ao habilitar strict mode | Alta | Alto | Fazer em branch separada, testar extensivamente |
| Breaking changes ao remover @ts-nocheck | Alta | Alto | Fazer arquivo por arquivo, testar cada um |
| Performance issues em produção | Média | Alto | Load testing antes do launch |
| Migrations falharem | Baixa | Crítico | Backup completo antes de consolidar |

---

## 📞 Contatos de Emergência

- **DevOps:** [contato]
- **DBA:** [contato]
- **Tech Lead:** [contato]

---

**Última atualização:** 11 de Março de 2026  
**Próxima revisão:** [data]
