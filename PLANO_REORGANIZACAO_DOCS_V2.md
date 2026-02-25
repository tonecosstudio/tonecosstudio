# 📚 PLANO DE REORGANIZAÇÃO DA DOCUMENTAÇÃO - V2

**Data**: 25 de fevereiro de 2026  
**Objetivo**: Organizar 200+ arquivos de documentação em estrutura navegável  
**Status**: Proposta

---

## 🎯 OBJETIVOS

1. **Reduzir** arquivos na raiz de 150+ para < 10
2. **Organizar** documentação em hierarquia clara
3. **Preservar** histórico sem poluir estrutura principal
4. **Facilitar** navegação e onboarding
5. **Manter** apenas docs essenciais e atualizados

---

## 📊 SITUAÇÃO ATUAL

### Arquivos na Raiz

```
Total: ~150 arquivos .md
Categorias:
- ANALISE_*.md (15+)
- IMPLEMENTACAO_*.md (10+)
- SPRINT*.md (8+)
- FASE*.md (5+)
- SESSAO_*.md (10+)
- RESUMO_*.md (15+)
- CORRECAO_*.md (10+)
- MELHORIAS_*.md (8+)
- GUIA_*.md (10+)
- Outros (60+)
```

### Pasta docs/

```
Total: ~50 arquivos
Estrutura:
- docs/api/
- docs/features/
- docs/development/
- docs/docker/
- docs/historico/
- docs/implementation/
- docs/tecnico/
- Arquivos soltos (30+)
```

---

## 🗂️ ESTRUTURA PROPOSTA

### Raiz (< 10 arquivos)

```
ordax/
├── README.md                    # README principal
├── CHANGELOG.md                 # Changelog do projeto
├── CONTRIBUTING.md              # Guia de contribuição
├── LICENSE.md                   # Licença
├── .env.example                 # Exemplo de env
└── ...                          # Configs (package.json, etc)
```

### docs/ (Documentação Técnica Ativa)

```
docs/
├── README.md                    # Índice principal
│
├── getting-started/             # 🚀 Início Rápido
│   ├── README.md
│   ├── installation.md
│   ├── quick-start.md
│   ├── docker-setup.md
│   └── first-steps.md
│
├── architecture/                # 🏗️ Arquitetura
│   ├── README.md
│   ├── overview.md
│   ├── database-schema.md
│   ├── services.md
│   ├── realtime.md
│   └── security.md
│
├── features/                    # ✨ Funcionalidades
│   ├── README.md
│   ├── authentication.md
│   ├── catalog.md
│   ├── collections.md
│   ├── subscriptions.md
│   ├── payments.md
│   ├── chat-support.md
│   ├── groups.md
│   ├── notifications.md
│   ├── admin-panel.md
│   └── batch-system.md
│
├── api/                         # 🔌 API
│   ├── README.md
│   ├── authentication.md
│   ├── endpoints.md
│   ├── realtime.md
│   ├── edge-functions.md
│   └── webhooks.md
│
├── development/                 # 💻 Desenvolvimento
│   ├── README.md
│   ├── setup.md
│   ├── coding-standards.md
│   ├── testing.md
│   ├── debugging.md
│   └── troubleshooting.md
│
├── deployment/                  # 🚀 Deploy
│   ├── README.md
│   ├── preparation.md
│   ├── docker.md
│   ├── vercel.md
│   ├── supabase.md
│   ├── monitoring.md
│   └── rollback.md
│
└── guides/                      # 📖 Guias
    ├── README.md
    ├── admin-guide.md
    ├── user-guide.md
    ├── analytics-guide.md
    ├── dark-mode-guide.md
    └── migration-guides/
        ├── v1-to-v2.md
        └── constants-migration.md
```

### docs-archive/ (Documentação Histórica)

```
docs-archive/
├── README.md                    # Índice do arquivo
│
├── implementations/             # Docs de implementação
│   ├── 2026-02/
│   │   ├── IMPLEMENTACAO_MODELO_V2_COMPLETA.md
│   │   ├── IMPLEMENTACAO_FINAL_CONFIGURACOES.md
│   │   └── ...
│   └── ...
│
├── sprints/                     # Docs de sprints
│   ├── SPRINT1_IMPLEMENTADO.md
│   ├── SPRINT2_GRUPOS_COMPLETO.md
│   ├── SPRINT3_GRUPOS_COMPLETO.md
│   ├── SPRINT4_GRUPOS_COMPLETO.md
│   └── ...
│
├── sessions/                    # Docs de sessões
│   ├── SESSAO_COMPLETA_V1.3.md
│   ├── SESSAO_COMPLETA_V2.1.md
│   ├── SESSAO_MODO_ESCURO_V2.0.md
│   └── ...
│
├── phases/                      # Docs de fases
│   ├── FASE2_100_COMPLETA_V1.5.md
│   ├── FASE5_NOTIFICACOES_INTEGRADA.md
│   └── ...
│
├── corrections/                 # Docs de correções
│   ├── CORRECAO_SIDEBAR_GRUPOS_FINAL.md
│   ├── CORRECAO_RODAPE_COMPLETA.md
│   ├── CORRECOES_ANALYTICS_V1.3.1.md
│   └── ...
│
├── improvements/                # Docs de melhorias
│   ├── MELHORIAS_ADMIN_V1.1.md
│   ├── MELHORIAS_UX_FASE4_IMPLEMENTADAS.md
│   └── ...
│
├── analysis/                    # Docs de análise
│   ├── ANALISE_ADMIN_COMPLETA.md
│   ├── ANALISE_MELHORIAS_GRUPOS.md
│   ├── ANALISE_RODAPE_DADOS_REAIS.md
│   └── ...
│
├── migrations/                  # Docs de migrations
│   ├── MIGRATION_APLICADA_SUCESSO.md
│   ├── APLICAR_MIGRATION_NOTIFICACOES.md
│   └── ...
│
└── summaries/                   # Resumos executivos
    ├── RESUMO_EXECUTIVO_MODELO_V2.md
    ├── RESUMO_FINAL_MELHORIAS.md
    └── ...
```

---

## 📋 PLANO DE EXECUÇÃO

### Fase 1: Preparação (1 dia)

1. ✅ Criar estrutura de pastas
2. ✅ Criar README.md em cada pasta
3. ✅ Definir índices

### Fase 2: Migração (2-3 dias)

1. ✅ Mover docs técnicos para docs/
2. ✅ Mover docs históricos para docs-archive/
3. ✅ Atualizar links internos
4. ✅ Verificar integridade

### Fase 3: Consolidação (1-2 dias)

1. ✅ Consolidar docs redundantes
2. ✅ Atualizar docs desatualizados
3. ✅ Remover docs obsoletos
4. ✅ Criar docs faltantes

### Fase 4: Validação (1 dia)

1. ✅ Revisar estrutura
2. ✅ Testar navegação
3. ✅ Validar links
4. ✅ Obter feedback

---

## 📝 MAPEAMENTO DE ARQUIVOS

### Arquivos a Manter na Raiz

```
✅ README.md
✅ CHANGELOG.md
✅ CONTRIBUTING.md (criar)
✅ LICENSE.md (verificar)
```

### Arquivos para docs/

```
architecture.md → docs/architecture/overview.md
getting-started.md → docs/getting-started/quick-start.md
deployment.md → docs/deployment/preparation.md
DOCKER_GUIDE.md → docs/getting-started/docker-setup.md
GUIA_USO_ANALYTICS.md → docs/guides/analytics-guide.md
GUIA_USO_MODO_ESCURO.md → docs/guides/dark-mode-guide.md
```

### Arquivos para docs-archive/

```
IMPLEMENTACAO_*.md → docs-archive/implementations/
SPRINT*.md → docs-archive/sprints/
SESSAO_*.md → docs-archive/sessions/
FASE*.md → docs-archive/phases/
CORRECAO_*.md → docs-archive/corrections/
MELHORIAS_*.md → docs-archive/improvements/
ANALISE_*.md → docs-archive/analysis/
RESUMO_*.md → docs-archive/summaries/
```

### Arquivos a Consolidar

```
ANTES_DEPOIS_SSOT.md + ANTES_E_DEPOIS.md
  → docs/guides/migration-guides/ssot-migration.md

INDICE_*.md (múltiplos)
  → docs/README.md (índice único)

README_*.md (múltiplos)
  → Consolidar em docs apropriados
```

### Arquivos a Remover

```
*.sql (mover para scripts/database/)
*.js, *.cjs, *.mjs (mover para scripts/)
test-*.cjs (mover para src/test/)
```

---

## 🎯 BENEFÍCIOS ESPERADOS

### Para Desenvolvedores

1. ✅ Onboarding mais rápido
2. ✅ Fácil localização de informação
3. ✅ Menos confusão
4. ✅ Melhor manutenção

### Para o Projeto

1. ✅ Raiz limpa e profissional
2. ✅ Documentação organizada
3. ✅ Histórico preservado
4. ✅ Melhor impressão para novos contribuidores

### Para Manutenção

1. ✅ Docs atualizados mais facilmente
2. ✅ Menos duplicação
3. ✅ Melhor versionamento
4. ✅ Redução de conflitos

---

## 📊 MÉTRICAS DE SUCESSO

### Antes

- Arquivos na raiz: ~150
- Tempo para encontrar doc: ~5-10 min
- Docs desatualizados: ~30%
- Docs redundantes: ~20%

### Depois (Meta)

- Arquivos na raiz: < 10
- Tempo para encontrar doc: < 2 min
- Docs desatualizados: < 5%
- Docs redundantes: 0%

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Aprovar estrutura proposta
2. ✅ Executar Fase 1 (Preparação)
3. ✅ Executar Fase 2 (Migração)
4. ✅ Executar Fase 3 (Consolidação)
5. ✅ Executar Fase 4 (Validação)
6. ✅ Comunicar mudanças ao time
7. ✅ Atualizar CONTRIBUTING.md

---

**Documento criado por**: Kiro AI  
**Data**: 25 de fevereiro de 2026  
**Versão**: 2.0  
**Status**: Proposta
