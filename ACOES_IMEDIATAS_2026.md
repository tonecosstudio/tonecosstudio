# ⚡ AÇÕES IMEDIATAS - PROJETO ORDAX 2026

**Data**: 25 de fevereiro de 2026  
**Prioridade**: ALTA  
**Tempo Estimado**: 1-2 semanas

---

## 🎯 OBJETIVO

Limpar, organizar e otimizar o projeto Ordax para facilitar manutenção e crescimento futuro.

---

## ✅ CHECKLIST DE AÇÕES IMEDIATAS

### 1. REORGANIZAÇÃO DA DOCUMENTAÇÃO (Prioridade: CRÍTICA)

#### 1.1 Criar Estrutura de Pastas

```bash
mkdir -p docs-archive/{implementations,sprints,sessions,phases,corrections,improvements,analysis,migrations,summaries}
mkdir -p docs/{getting-started,architecture,features,api,development,deployment,guides/migration-guides}
```

#### 1.2 Mover Documentação Histórica

```bash
# Implementações
mv IMPLEMENTACAO_*.md docs-archive/implementations/
mv STATUS_IMPLEMENTACAO_*.md docs-archive/implementations/

# Sprints
mv SPRINT*.md docs-archive/sprints/

# Sessões
mv SESSAO_*.md docs-archive/sessions/

# Fases
mv FASE*.md docs-archive/phases/

# Correções
mv CORRECAO_*.md docs-archive/corrections/
mv CORRECOES_*.md docs-archive/corrections/

# Melhorias
mv MELHORIAS_*.md docs-archive/improvements/

# Análises
mv ANALISE_*.md docs-archive/analysis/

# Migrations
mv MIGRATION_*.md docs-archive/migrations/
mv APLICAR_*.md docs-archive/migrations/

# Resumos
mv RESUMO_*.md docs-archive/summaries/
```

#### 1.3 Organizar Documentação Técnica

```bash
# Guias
mv GUIA_*.md docs/guides/
mv DOCKER_GUIDE.md docs/getting-started/docker-setup.md

# Índices
mv INDICE_*.md docs-archive/summaries/

# Checklists
mv CHECKLIST_*.md docs/deployment/
```

#### 1.4 Criar README.md em Cada Pasta

- [ ] docs/README.md (índice principal)
- [ ] docs-archive/README.md
- [ ] docs/getting-started/README.md
- [ ] docs/architecture/README.md
- [ ] docs/features/README.md
- [ ] docs/api/README.md
- [ ] docs/development/README.md
- [ ] docs/deployment/README.md
- [ ] docs/guides/README.md

---

### 2. LIMPEZA DE CÓDIGO (Prioridade: ALTA)

#### 2.1 Remover Arquivos Obsoletos

```bash
# Versões antigas de componentes
rm src/pages/About-v2.tsx
rm src/pages/About-new.tsx
rm src/pages/About-final.tsx
# Manter apenas: src/pages/About.tsx

# Versões antigas de types
rm src/integrations/supabase/types-old.ts
rm src/integrations/supabase/types-new.ts
rm src/integrations/supabase/types-updated.ts
# Manter apenas: src/integrations/supabase/types.ts

# Componentes old
rm src/pages/admin/AdminCollections-old.tsx
```

#### 2.2 Mover Scripts para Pasta Apropriada

```bash
# Scripts de migration
mv apply-migration*.mjs scripts/database/
mv apply-migration*.js scripts/database/

# Scripts de teste
mv test-*.cjs src/test/
mv analise-ciclo2.cjs src/test/

# Scripts SQL
mv *.sql scripts/database/

# Scripts de atualização
mv atualizar-*.js scripts/database/
mv criar-colecoes-*.js scripts/database/
mv verificar-*.js scripts/development/
```

#### 2.3 Limpar Imports Não Utilizados

```bash
# Executar ESLint com fix
npm run lint -- --fix

# Verificar imports não utilizados
npx ts-prune
```

---

### 3. AUDITORIA DE DEPENDÊNCIAS (Prioridade: MÉDIA)

#### 3.1 Verificar Vulnerabilidades

```bash
npm audit
npm audit fix
```

#### 3.2 Atualizar Dependências Desatualizadas

```bash
npm outdated
npm update
```

#### 3.3 Remover Dependências Não Utilizadas

```bash
npx depcheck
```

---

### 4. MELHORIAS DE TESTES (Prioridade: MÉDIA)

#### 4.1 Verificar Coverage Atual

```bash
npm run test:coverage
```

#### 4.2 Identificar Gaps de Coverage

- [ ] Analisar relatório de coverage
- [ ] Listar arquivos com coverage < 70%
- [ ] Priorizar arquivos críticos

#### 4.3 Adicionar Testes Faltantes

- [ ] Serviços sem testes
- [ ] Hooks sem testes
- [ ] Componentes críticos sem testes

---

### 5. CONFIGURAÇÃO DE MONITORAMENTO (Prioridade: MÉDIA)

#### 5.1 Verificar Sentry

- [ ] Confirmar Sentry está ativo
- [ ] Verificar DSN configurado
- [ ] Testar envio de erro

#### 5.2 Configurar Logging

- [ ] Avaliar Winston vs Pino
- [ ] Implementar logging estruturado
- [ ] Configurar níveis de log

#### 5.3 Configurar Alertas

- [ ] Definir métricas críticas
- [ ] Configurar thresholds
- [ ] Integrar com canal de notificação

---

### 6. DOCUMENTAÇÃO ESSENCIAL (Prioridade: ALTA)

#### 6.1 Atualizar README.md Principal

- [ ] Remover informações obsoletas
- [ ] Adicionar badges atualizados
- [ ] Atualizar quick start
- [ ] Adicionar link para docs/

#### 6.2 Criar CONTRIBUTING.md

- [ ] Guia de contribuição
- [ ] Padrões de código
- [ ] Processo de PR
- [ ] Conventional commits

#### 6.3 Criar docs/README.md

- [ ] Índice navegável
- [ ] Links para todas as seções
- [ ] Descrição de cada seção

---

## 📊 PROGRESSO

### Status Geral

- [ ] 0% - Não iniciado
- [ ] 25% - Em andamento
- [ ] 50% - Metade completo
- [ ] 75% - Quase completo
- [ ] 100% - Completo

### Por Categoria

- [ ] Reorganização da Documentação: 0%
- [ ] Limpeza de Código: 0%
- [ ] Auditoria de Dependências: 0%
- [ ] Melhorias de Testes: 0%
- [ ] Configuração de Monitoramento: 0%
- [ ] Documentação Essencial: 0%

---

## 🎯 CRITÉRIOS DE SUCESSO

### Documentação

- ✅ < 10 arquivos .md na raiz
- ✅ Estrutura hierárquica clara
- ✅ Índice navegável criado
- ✅ Histórico preservado em docs-archive/

### Código

- ✅ 0 arquivos \*-old.tsx
- ✅ 0 arquivos \*-v2.tsx
- ✅ Scripts organizados em scripts/
- ✅ 0 imports não utilizados

### Qualidade

- ✅ 0 vulnerabilidades críticas
- ✅ 0 vulnerabilidades altas
- ✅ Dependências atualizadas
- ✅ Coverage > 70%

### Monitoramento

- ✅ Sentry ativo e testado
- ✅ Logging estruturado implementado
- ✅ Alertas configurados

---

## 🚀 ORDEM DE EXECUÇÃO RECOMENDADA

### Dia 1-2: Documentação

1. Criar estrutura de pastas
2. Mover documentação histórica
3. Organizar documentação técnica
4. Criar READMEs

### Dia 3-4: Limpeza de Código

1. Remover arquivos obsoletos
2. Mover scripts
3. Limpar imports
4. Executar linter

### Dia 5: Dependências

1. Audit de vulnerabilidades
2. Atualizar dependências
3. Remover não utilizadas

### Dia 6-7: Testes

1. Verificar coverage
2. Identificar gaps
3. Adicionar testes críticos

### Dia 8-9: Monitoramento

1. Configurar Sentry
2. Implementar logging
3. Configurar alertas

### Dia 10: Documentação Final

1. Atualizar README.md
2. Criar CONTRIBUTING.md
3. Criar docs/README.md
4. Revisão final

---

## 📝 NOTAS IMPORTANTES

### Backup

⚠️ **IMPORTANTE**: Fazer backup antes de qualquer mudança!

```bash
git checkout -b cleanup-and-reorganization
git add .
git commit -m "chore: backup before cleanup"
```

### Testes

⚠️ **IMPORTANTE**: Executar testes após cada mudança!

```bash
npm run test
npm run build
```

### Comunicação

⚠️ **IMPORTANTE**: Comunicar mudanças ao time!

- Avisar sobre reorganização de docs
- Atualizar links em wikis/notion
- Atualizar bookmarks

---

## 🔗 DOCUMENTOS RELACIONADOS

- [ANALISE_PROFUNDA_PROJETO_2026.md](ANALISE_PROFUNDA_PROJETO_2026.md) - Análise completa
- [PLANO_REORGANIZACAO_DOCS_V2.md](PLANO_REORGANIZACAO_DOCS_V2.md) - Plano detalhado de docs
- [README.md](README.md) - README principal

---

## ✅ APROVAÇÃO

- [ ] Aprovado por: ******\_\_\_******
- [ ] Data: ******\_\_\_******
- [ ] Iniciar execução: ******\_\_\_******

---

**Documento criado por**: Kiro AI  
**Data**: 25 de fevereiro de 2026  
**Versão**: 1.0  
**Status**: Pronto para execução
