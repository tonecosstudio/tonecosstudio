# 📚 Índice: Sistema SSOT - Documentação Completa

Navegação rápida para toda a documentação do sistema SSOT (Single Source of Truth).

**Versão:** 2.0 (Modelo Recorrente Mensal)  
**Última Atualização:** 24/02/2026

---

## 🆕 NOVO: Modelo Recorrente Mensal (v2.0)

### ⭐ Documentação do Novo Modelo

#### [`MODELO_OPERACIONAL_RECORRENTE.md`](MODELO_OPERACIONAL_RECORRENTE.md) 🔥 NOVO

**O que é:** Descrição completa do novo modelo de 2 ciclos por mês  
**Quando usar:** Para entender o novo sistema operacional  
**Conteúdo:**

- Regra fixa: 2 ciclos por mês
- Ciclo 1 (primeira quinzena) e Ciclo 2 (segunda quinzena)
- Exemplos práticos com Março 2026
- Calendário anual 2026
- Comparação com modelo antigo
- Vantagens do novo modelo

**Público:** Todos  
**Tempo de leitura:** 15 minutos  
**Status:** ✅ Implementado

---

#### [`GUIA_MIGRACAO_MODELO_RECORRENTE.md`](GUIA_MIGRACAO_MODELO_RECORRENTE.md) 🔥 NOVO

**O que é:** Guia completo de migração do modelo v1 para v2  
**Quando usar:** Durante a implementação do novo modelo  
**Conteúdo:**

- Checklist de migração (8 fases)
- Alterações no banco de dados
- Atualizações de código
- Plano de rollback
- Cronograma de implementação
- Testes de validação

**Público:** Desenvolvedores, DevOps  
**Tempo de leitura:** 30 minutos  
**Status:** 📋 Planejamento

---

#### `src/lib/services/batchCalculator.ts` (v2) 🔥 ATUALIZADO

**O que é:** Calculadora automática de ciclos (versão 2.0)  
**Quando usar:** Para calcular datas de ciclos automaticamente  
**Funcionalidades:**

- Suporte a 2 ciclos por mês
- Detecção automática do ciclo atual
- Cálculo de dias úteis (5º dia útil)
- Funções de formatação
- Cálculo de prazos para cliente
- Geração de calendário futuro

**Público:** Desenvolvedores  
**Status:** ✅ Implementado

---

#### `supabase/migrations/20260224000000_add_cycle_system.sql` 🔥 NOVO

**O que é:** Migration para implementar o novo modelo no banco  
**Quando usar:** Durante o deploy do novo sistema  
**Conteúdo:**

- Backup de dados antigos
- Novos campos de ciclo
- Atualização de pedidos existentes
- Funções SQL auxiliares
- View consolidada
- Validações automáticas

**Público:** DevOps, DBAs  
**Status:** ✅ Pronto para deploy

---

#### `test-batch-calculator-v2.cjs` 🔥 NOVO

**O que é:** Testes automatizados do novo calculador  
**Quando usar:** Para validar o funcionamento do novo modelo  
**Testes incluídos:**

- Ciclo 1 e Ciclo 2 de Março 2026
- Fevereiro (28 dias)
- Fevereiro bissexto (29 dias)
- Sequência de ciclos
- Calendário anual (12 ciclos)
- Virada de ano
- Prazos para cliente

**Público:** QA, Desenvolvedores  
**Status:** ✅ Implementado

---

## 📋 Documentação Original (v1.0)

### 🎯 Para Começar

### Você é Administrador?

👉 Comece aqui: [`GUIA_ADMIN_SSOT.md`](GUIA_ADMIN_SSOT.md)

- Guia passo a passo para atualizar o cronograma
- Tempo de leitura: 5 minutos
- Nível: Iniciante
- **Nota:** Será atualizado para o novo modelo em breve

### Você é Desenvolvedor?

👉 Comece aqui:

1. [`MODELO_OPERACIONAL_RECORRENTE.md`](MODELO_OPERACIONAL_RECORRENTE.md) ⭐ NOVO
2. [`GUIA_MIGRACAO_MODELO_RECORRENTE.md`](GUIA_MIGRACAO_MODELO_RECORRENTE.md) ⭐ NOVO
3. [`CORRECOES_SSOT_IMPLEMENTADAS.md`](CORRECOES_SSOT_IMPLEMENTADAS.md)

### Você é Gestor/Tomador de Decisão?

👉 Comece aqui:

1. [`MODELO_OPERACIONAL_RECORRENTE.md`](MODELO_OPERACIONAL_RECORRENTE.md) - Seção "Vantagens"
2. [`RESUMO_CORRECOES_SSOT.md`](RESUMO_CORRECOES_SSOT.md)

---

## 📖 Documentação por Tipo

### 📊 Análise e Planejamento

#### [`ANALISE_DIVERGENCIAS_CRONOGRAMA.md`](ANALISE_DIVERGENCIAS_CRONOGRAMA.md)

**O que é:** Análise detalhada dos problemas encontrados (modelo v1)  
**Quando usar:** Para entender o contexto e motivação das mudanças  
**Conteúdo:**

- Identificação de dados hardcoded
- Análise de divergências
- Plano de correção detalhado
- Exemplos de código antes/depois

**Público:** Desenvolvedores, Gestores Técnicos  
**Tempo de leitura:** 20 minutos

---

### ✅ Implementação

#### [`CORRECOES_SSOT_IMPLEMENTADAS.md`](CORRECOES_SSOT_IMPLEMENTADAS.md)

**O que é:** Documentação técnica completa da implementação (v1)  
**Quando usar:** Para entender o que foi feito e como funciona  
**Conteúdo:**

- Alterações realizadas (8 arquivos)
- Nova página admin
- Componentes criados/modificados
- Processo de atualização mensal
- Variáveis disponíveis no SSOT

**Público:** Desenvolvedores  
**Tempo de leitura:** 15 minutos  
**Nota:** Será complementado com documentação do v2

---

### 📘 Guias Práticos

#### [`GUIA_ADMIN_SSOT.md`](GUIA_ADMIN_SSOT.md)

**O que é:** Guia passo a passo para administradores (v1)  
**Quando usar:** Toda vez que precisar atualizar o cronograma  
**Conteúdo:**

- Passo a passo com screenshots
- Padrão de datas
- Calendário de atualizações 2026
- Dicas e problemas comuns

**Público:** Administradores, Não-técnicos  
**Tempo de leitura:** 5 minutos  
**Frequência de uso:** Quinzenal (no novo modelo)  
**Nota:** Será atualizado para o novo modelo

---

### 📊 Resumos e Visão Geral

#### [`RESUMO_CORRECOES_SSOT.md`](RESUMO_CORRECOES_SSOT.md)

**O que é:** Resumo executivo com métricas de impacto  
**Quando usar:** Para apresentações ou decisões estratégicas  
**Conteúdo:**

- Problema vs Solução
- Métricas de impacto (antes/depois)
- Benefícios alcançados
- ROI e economia de tempo

**Público:** Gestores, Executivos, Stakeholders  
**Tempo de leitura:** 3 minutos

---

### 🔄 Comparações Visuais

#### [`ANTES_DEPOIS_SSOT.md`](ANTES_DEPOIS_SSOT.md)

**O que é:** Comparação visual detalhada das mudanças  
**Quando usar:** Para entender o impacto das mudanças visualmente  
**Conteúdo:**

- Código antes vs depois
- Fluxo de trabalho antes vs depois
- Métricas visuais
- Exemplos práticos

**Público:** Todos (visual e didático)  
**Tempo de leitura:** 10 minutos

---

### ✅ Testes e Validação

#### [`CHECKLIST_TESTES_SSOT.md`](CHECKLIST_TESTES_SSOT.md)

**O que é:** Checklist completo de testes (v1)  
**Quando usar:** Antes de deploy ou após alterações  
**Conteúdo:**

- 23 testes funcionais
- Testes de interface
- Testes de integração
- Testes de segurança
- Testes de performance

**Público:** QA, Desenvolvedores  
**Tempo de execução:** 30-45 minutos  
**Nota:** Será atualizado para incluir testes do v2

---

## 🗂️ Organização por Persona

### 👨‍💼 Administrador (Não-técnico)

**Leitura obrigatória (v2):**

1. [`MODELO_OPERACIONAL_RECORRENTE.md`](MODELO_OPERACIONAL_RECORRENTE.md) ⭐ NOVO
2. [`GUIA_ADMIN_SSOT.md`](GUIA_ADMIN_SSOT.md) (será atualizado)

**Leitura opcional:** 3. [`ANTES_DEPOIS_SSOT.md`](ANTES_DEPOIS_SSOT.md) - Para entender o contexto 4. [`RESUMO_CORRECOES_SSOT.md`](RESUMO_CORRECOES_SSOT.md) - Para ver os benefícios

**Tempo total:** 20-25 minutos

---

### 👨‍💻 Desenvolvedor

**Leitura obrigatória (v2):**

1. [`MODELO_OPERACIONAL_RECORRENTE.md`](MODELO_OPERACIONAL_RECORRENTE.md) ⭐ NOVO
2. [`GUIA_MIGRACAO_MODELO_RECORRENTE.md`](GUIA_MIGRACAO_MODELO_RECORRENTE.md) ⭐ NOVO
3. [`CORRECOES_SSOT_IMPLEMENTADAS.md`](CORRECOES_SSOT_IMPLEMENTADAS.md)
4. [`ANALISE_DIVERGENCIAS_CRONOGRAMA.md`](ANALISE_DIVERGENCIAS_CRONOGRAMA.md)

**Leitura recomendada:** 5. [`ANTES_DEPOIS_SSOT.md`](ANTES_DEPOIS_SSOT.md) - Exemplos de código 6. [`CHECKLIST_TESTES_SSOT.md`](CHECKLIST_TESTES_SSOT.md) - Para validação

**Tempo total:** 90-120 minutos

---

### 👔 Gestor/Executivo

**Leitura obrigatória (v2):**

1. [`MODELO_OPERACIONAL_RECORRENTE.md`](MODELO_OPERACIONAL_RECORRENTE.md) - Seção "Vantagens" ⭐ NOVO
2. [`RESUMO_CORRECOES_SSOT.md`](RESUMO_CORRECOES_SSOT.md)

**Leitura recomendada:** 3. [`ANTES_DEPOIS_SSOT.md`](ANTES_DEPOIS_SSOT.md) - Visualização do impacto

**Tempo total:** 15-20 minutos

---

### 🧪 QA/Tester

**Leitura obrigatória (v2):**

1. [`MODELO_OPERACIONAL_RECORRENTE.md`](MODELO_OPERACIONAL_RECORRENTE.md) ⭐ NOVO
2. `test-batch-calculator-v2.cjs` ⭐ NOVO
3. [`CHECKLIST_TESTES_SSOT.md`](CHECKLIST_TESTES_SSOT.md)
4. [`CORRECOES_SSOT_IMPLEMENTADAS.md`](CORRECOES_SSOT_IMPLEMENTADAS.md)

**Tempo total:** 60-90 minutos

---

## 🔍 Busca Rápida por Tópico

### Quero saber como...

#### ...entender o novo modelo de 2 ciclos por mês

👉 [`MODELO_OPERACIONAL_RECORRENTE.md`](MODELO_OPERACIONAL_RECORRENTE.md) ⭐ NOVO

#### ...migrar do modelo antigo para o novo

👉 [`GUIA_MIGRACAO_MODELO_RECORRENTE.md`](GUIA_MIGRACAO_MODELO_RECORRENTE.md) ⭐ NOVO

#### ...testar o novo calculador

👉 `test-batch-calculator-v2.cjs` ⭐ NOVO

#### ...atualizar o cronograma mensalmente

👉 [`GUIA_ADMIN_SSOT.md`](GUIA_ADMIN_SSOT.md) - Seção "Passo a Passo"

#### ...entender o código implementado

👉 [`CORRECOES_SSOT_IMPLEMENTADAS.md`](CORRECOES_SSOT_IMPLEMENTADAS.md) - Seção "Alterações Realizadas"

#### ...ver exemplos de antes e depois

👉 [`ANTES_DEPOIS_SSOT.md`](ANTES_DEPOIS_SSOT.md) - Todo o documento

#### ...testar se está funcionando

👉 [`CHECKLIST_TESTES_SSOT.md`](CHECKLIST_TESTES_SSOT.md) - Seção "Testes Funcionais"

#### ...entender o ROI/benefícios

👉 [`RESUMO_CORRECOES_SSOT.md`](RESUMO_CORRECOES_SSOT.md) - Seção "Resultados"

#### ...saber quais variáveis usar

👉 [`CORRECOES_SSOT_IMPLEMENTADAS.md`](CORRECOES_SSOT_IMPLEMENTADAS.md) - Seção "Variáveis Disponíveis"

#### ...resolver problemas comuns

👉 [`GUIA_ADMIN_SSOT.md`](GUIA_ADMIN_SSOT.md) - Seção "Problemas Comuns"

---

## 📂 Estrutura de Arquivos

```
projeto/
├── INDICE_SSOT.md                                    ← Você está aqui
│
├── 🆕 NOVO MODELO (v2.0)
├── MODELO_OPERACIONAL_RECORRENTE.md                  ← Descrição do novo modelo ⭐
├── GUIA_MIGRACAO_MODELO_RECORRENTE.md                ← Guia de migração ⭐
├── test-batch-calculator-v2.cjs                      ← Testes do novo modelo ⭐
│
├── DOCUMENTAÇÃO ORIGINAL (v1.0)
├── ANALISE_DIVERGENCIAS_CRONOGRAMA.md                ← Análise inicial
├── CORRECOES_SSOT_IMPLEMENTADAS.md                   ← Doc técnica
├── GUIA_ADMIN_SSOT.md                                ← Guia prático
├── RESUMO_CORRECOES_SSOT.md                          ← Resumo executivo
├── ANTES_DEPOIS_SSOT.md                              ← Comparações visuais
├── CHECKLIST_TESTES_SSOT.md                          ← Testes
│
├── src/
│   ├── lib/
│   │   └── services/
│   │       └── batchCalculator.ts                    ← Calculador v2 ⭐
│   ├── pages/
│   │   └── admin/
│   │       └── AdminContentSettings.tsx              ← Página admin
│   ├── components/
│   │   ├── content/
│   │   │   ├── BatchInfoBanner.tsx                   ← Banner dinâmico
│   │   │   └── DynamicFAQ.tsx                        ← FAQ dinâmico
│   │   └── collections/
│   │       └── ReleaseTimeline.tsx                   ← Timeline dinâmico
│   └── hooks/
│       └── useContentSettings.ts                     ← Hook SSOT
│
└── supabase/
    └── migrations/
        ├── 20260222094000_add_content_settings.sql   ← Migration SSOT v1
        └── 20260224000000_add_cycle_system.sql       ← Migration v2 ⭐
```

---

## 🎯 Fluxo de Leitura Recomendado

### Para Implementação do Novo Modelo (v2)

```
1. MODELO_OPERACIONAL_RECORRENTE.md ⭐
   ↓ (Entender o novo modelo)

2. GUIA_MIGRACAO_MODELO_RECORRENTE.md ⭐
   ↓ (Planejar a migração)

3. test-batch-calculator-v2.cjs ⭐
   ↓ (Validar o calculador)

4. Executar migration 20260224000000_add_cycle_system.sql ⭐
   ↓ (Atualizar banco de dados)

5. Atualizar componentes frontend
   ↓ (Implementar UI)

6. CHECKLIST_TESTES_SSOT.md
   ↓ (Validar tudo)

7. GUIA_ADMIN_SSOT.md (atualizado)
   (Treinar usuários)
```

### Para Uso Diário (após migração)

```
1. GUIA_ADMIN_SSOT.md
   (Consultar quando precisar atualizar - quinzenalmente)
```

### Para Onboarding de Novos Membros (v2)

```
1. MODELO_OPERACIONAL_RECORRENTE.md ⭐
   ↓ (Entender o sistema)

2. RESUMO_CORRECOES_SSOT.md
   ↓ (Visão geral do SSOT)

3. GUIA_ADMIN_SSOT.md (se admin)
   ou
   CORRECOES_SSOT_IMPLEMENTADAS.md (se dev)
```

---

## 📊 Estatísticas da Documentação

**Total de documentos:** 10 (+3 novos)  
**Total de páginas:** ~80 (+30 novas)  
**Tempo total de leitura:** ~150 minutos  
**Nível de detalhe:** Completo

### Por Tipo

- 📦 Modelo Operacional: 1 documento ⭐ NOVO
- 🔄 Migração: 1 documento ⭐ NOVO
- 🧪 Testes: 1 script ⭐ NOVO
- 📊 Análise: 1 documento
- ✅ Implementação: 1 documento
- 📘 Guias: 1 documento
- 📊 Resumos: 1 documento
- 🔄 Comparações: 1 documento
- ✅ Testes: 1 documento
- 📚 Índice: 1 documento (este)

### Por Versão

- **v2.0 (Novo Modelo):** 3 documentos novos
- **v1.0 (Original):** 7 documentos

### Por Público

- 👨‍💼 Administradores: 3 documentos principais
- 👨‍💻 Desenvolvedores: 5 documentos principais
- 👔 Gestores: 3 documentos principais
- 🧪 QA: 3 documentos principais

---

## 🔗 Links Rápidos

### Documentação v2.0 (Novo)

- [Modelo Operacional Recorrente](MODELO_OPERACIONAL_RECORRENTE.md) ⭐
- [Guia de Migração](GUIA_MIGRACAO_MODELO_RECORRENTE.md) ⭐
- [Testes v2](test-batch-calculator-v2.cjs) ⭐

### Documentação v1.0 (Original)

- [Análise Inicial](ANALISE_DIVERGENCIAS_CRONOGRAMA.md)
- [Implementação](CORRECOES_SSOT_IMPLEMENTADAS.md)
- [Guia Admin](GUIA_ADMIN_SSOT.md)
- [Resumo Executivo](RESUMO_CORRECOES_SSOT.md)
- [Antes/Depois](ANTES_DEPOIS_SSOT.md)
- [Checklist de Testes](CHECKLIST_TESTES_SSOT.md)

### Código

- [batchCalculator.ts (v2)](src/lib/services/batchCalculator.ts) ⭐
- [AdminContentSettings.tsx](src/pages/admin/AdminContentSettings.tsx)
- [ReleaseTimeline.tsx](src/components/collections/ReleaseTimeline.tsx)
- [DynamicFAQ.tsx](src/components/content/DynamicFAQ.tsx)
- [contentService.ts](src/lib/services/contentService.ts)
- [useContentSettings.ts](src/hooks/useContentSettings.ts)

### Banco de Dados

- [Migration v2 (Ciclos)](supabase/migrations/20260224000000_add_cycle_system.sql) ⭐
- [Migration v1 (SSOT)](supabase/migrations/20260222094000_add_content_settings.sql)

---

## 📞 Suporte

**Dúvidas sobre:**

- **Novo modelo de ciclos:** Consulte [`MODELO_OPERACIONAL_RECORRENTE.md`](MODELO_OPERACIONAL_RECORRENTE.md) ⭐
- **Migração v1→v2:** Consulte [`GUIA_MIGRACAO_MODELO_RECORRENTE.md`](GUIA_MIGRACAO_MODELO_RECORRENTE.md) ⭐
- **Uso do sistema:** Consulte [`GUIA_ADMIN_SSOT.md`](GUIA_ADMIN_SSOT.md)
- **Implementação técnica:** Consulte [`CORRECOES_SSOT_IMPLEMENTADAS.md`](CORRECOES_SSOT_IMPLEMENTADAS.md)
- **Problemas/Bugs:** Consulte [`CHECKLIST_TESTES_SSOT.md`](CHECKLIST_TESTES_SSOT.md)
- **Métricas/ROI:** Consulte [`RESUMO_CORRECOES_SSOT.md`](RESUMO_CORRECOES_SSOT.md)

---

## 🎓 Glossário

**SSOT:** Single Source of Truth - Fonte única de verdade  
**Ciclo:** Período de vendas + produção + envio (v2: 2 por mês)  
**Ciclo 1:** Primeira quinzena (dia 01-15)  
**Ciclo 2:** Segunda quinzena (dia 16-último dia)  
**Lote:** Termo antigo para ciclo (v1)  
**Admin:** Administrador do sistema  
**Cronograma:** Calendário de vendas, produção e envio  
**Migration:** Script de atualização do banco de dados  
**Hook:** Função React para acessar dados  
**Component:** Componente React reutilizável  
**Service:** Serviço para lógica de negócio  
**Dia útil:** Dia que não é sábado nem domingo (futuramente: excluindo feriados)

---

## 🚀 Status da Migração v2.0

### ✅ Concluído

- [x] Documentação do novo modelo
- [x] Calculador de ciclos (batchCalculator.ts v2)
- [x] Testes automatizados
- [x] Migration do banco de dados
- [x] Guia de migração

### 🔄 Em Andamento

- [ ] Atualização do contentService.ts
- [ ] Atualização do AdminContentSettings.tsx
- [ ] Atualização dos componentes frontend
- [ ] Atualização do GUIA_ADMIN_SSOT.md

### ⏳ Pendente

- [ ] Testes de integração
- [ ] Deploy em staging
- [ ] Validação com usuários
- [ ] Deploy em produção

---

**Última atualização:** 24/02/2026  
**Versão:** 2.0 (Modelo Recorrente Mensal)  
**Status:** 🔄 Em migração para v2.0
