# 📊 SISTEMA DE ANÁLISE FINANCEIRA DAS COLEÇÕES

**Data:** 2026-02-15  
**Status:** ✅ Implementado

---

## 🎯 OBJETIVO

Sistema robusto para gerenciar custos e analisar a rentabilidade de cada coleção, com:
- Custos de produção detalhados
- Cálculo automático de lucro e margem
- Comparação de formas de pagamento
- ROI e breakeven
- Recomendações inteligentes

---

## 📦 ARQUIVOS CRIADOS

### Backend
1. ✅ `supabase/migrations/20260215150000_add_collection_costs_analytics.sql`
   - Campos de custo nas coleções
   - Funções de cálculo financeiro
   - View de resumo
   - Análise completa

### Frontend
2. ✅ `src/pages/admin/AdminCollectionFinancials.tsx`
   - Dashboard financeiro completo
   - 4 tabs de análise
   - Edição de custos
   - Métricas em tempo real

---

## 🗄️ ESTRUTURA DO BANCO

### Novos Campos em `collections`:

```sql
cost_material NUMERIC(10,2) DEFAULT 50.00    -- Resina, materiais
cost_labor NUMERIC(10,2) DEFAULT 80.00       -- Pintura, escultura
cost_packaging NUMERIC(10,2) DEFAULT 30.00   -- Embalagem MDF
cost_shipping NUMERIC(10,2) DEFAULT 40.00    -- Frete médio
cost_other NUMERIC(10,2) DEFAULT 0.00        -- Marketing, overhead
cost_notes TEXT                               -- Observações
```

**Custo Total Padrão:** R$ 200,00 por peça

---

## 🔧 FUNÇÕES CRIADAS

### 1. `calculate_production_cost(collection_id)`
Soma todos os custos de uma coleção:
```sql
SELECT calculate_production_cost('uuid'); -- Retorna 200.00
```

### 2. `get_collection_financial_analysis(collection_id)`
Retorna análise financeira completa:

**Retorna:**
- Preços (full, pix, entrada)
- Custos detalhados
- Lucro bruto e líquido
- Margens
- ROI
- Taxas por forma de pagamento
- Breakeven
- Estatísticas de vendas

---

## 💻 INTERFACE ADMIN

### Acesso
```
/admin/financeiro
```

### Estrutura

#### 1. Cards de Resumo Geral
- Total de coleções
- Lucro médio (PIX)
- Margem média
- Melhor margem

#### 2. Lista de Coleções
Grid com cards mostrando:
- Nome da coleção
- Status (ativa/inativa)
- Preço PIX
- Custo total
- Lucro bruto
- Margem

**Clique em uma coleção** para ver análise detalhada.

#### 3. Análise Detalhada (4 Tabs)

**Tab 1: Visão Geral**
- Preços e custos
- Lucro líquido (PIX)
- Margem líquida
- ROI
- Breakeven

**Tab 2: Custos**
- Editar custos por categoria
- Gráfico de distribuição
- Custo total calculado
- Salvar alterações

**Tab 3: Comparação**
- PIX vs Cartão 6x vs 10x
- Lucro líquido por forma
- Margem por forma
- ROI por forma
- Gráfico comparativo

**Tab 4: Recomendações**
- Análise automática
- Sugestões de melhoria
- Ações recomendadas
- Resumo executivo

---

## 📊 MÉTRICAS CALCULADAS

### 1. Lucro Bruto
```
Lucro Bruto = Preço - Custo Total
```

**Exemplo:**
- Preço PIX: R$ 475
- Custo: R$ 200
- **Lucro Bruto: R$ 275**

### 2. Lucro Líquido (com taxas)
```
Lucro Líquido = Preço - Custo - Taxa MP
```

**Exemplo PIX:**
- Preço PIX: R$ 475
- Custo: R$ 200
- Taxa MP (1%): R$ 4,75
- **Lucro Líquido: R$ 270,25**

### 3. Margem Líquida
```
Margem = (Lucro Líquido / Preço) × 100
```

**Exemplo:**
- Lucro Líquido: R$ 270,25
- Preço PIX: R$ 475
- **Margem: 56,9%**

### 4. ROI (Return on Investment)
```
ROI = (Lucro Líquido / Custo) × 100
```

**Exemplo:**
- Lucro Líquido: R$ 270,25
- Custo: R$ 200
- **ROI: 135,1%**

Significa: Para cada R$ 1 investido, você lucra R$ 1,35

### 5. Breakeven
```
Breakeven = Custos Fixos / Lucro Líquido por Unidade
```

**Exemplo:**
- Custos Fixos: R$ 1.000
- Lucro por Peça: R$ 270,25
- **Breakeven: 4 unidades**

Precisa vender 4 peças para cobrir R$ 1.000 de custos fixos.

---

## 💡 EXEMPLOS PRÁTICOS

### Exemplo 1: Coleção Marvel

**Configuração:**
- Preço: R$ 700 (PIX R$ 665)
- Material: R$ 60
- Mão de Obra: R$ 100
- Embalagem: R$ 40
- Frete: R$ 50
- **Custo Total: R$ 250**

**Resultados:**
- Lucro Bruto PIX: R$ 415
- Taxa MP (1%): R$ 6,65
- **Lucro Líquido: R$ 408,35**
- **Margem: 61,4%**
- **ROI: 163,3%**

**Recomendação:** Excelente! Margem e ROI ótimos.

### Exemplo 2: Coleção Anime

**Configuração:**
- Preço: R$ 500 (PIX R$ 475)
- Material: R$ 70
- Mão de Obra: R$ 120
- Embalagem: R$ 30
- Frete: R$ 40
- **Custo Total: R$ 260**

**Resultados:**
- Lucro Bruto PIX: R$ 215
- Taxa MP (1%): R$ 4,75
- **Lucro Líquido: R$ 210,25**
- **Margem: 44,3%**
- **ROI: 80,9%**

**Recomendação:** Margem OK, mas pode melhorar. Considere:
- Reduzir custo de mão de obra
- Aumentar preço para R$ 550

---

## 🎨 COMPARAÇÃO DE FORMAS DE PAGAMENTO

### Exemplo: Preço R$ 500, Custo R$ 200

| Forma | Cliente Paga | Taxa MP | Lucro Líquido | Margem | ROI |
|-------|--------------|---------|---------------|--------|-----|
| **PIX** | R$ 475 | R$ 4,75 | R$ 270,25 | 56,9% | 135% |
| **6x sem juros** | R$ 500 | R$ 74,70 | R$ 225,30 | 45,1% | 113% |
| **10x loja paga** | R$ 500 | R$ 99,55 | R$ 200,45 | 40,1% | 100% |
| **10x cliente paga** | R$ 603,25 | R$ 128,15 | R$ 275,10 | 45,6% | 138% |

**Conclusão:** 
- Melhor: 10x com juros (R$ 275,10)
- Segundo: PIX (R$ 270,25)
- Pior: 10x loja paga (R$ 200,45)

---

## 🚀 COMO USAR

### 1. Aplicar Migration

**Via Supabase SQL Editor:**
```
1. Copiar: supabase/migrations/20260215150000_add_collection_costs_analytics.sql
2. Colar no SQL Editor
3. Executar
```

### 2. Acessar Dashboard

```
http://localhost:5173/admin/financeiro
```

### 3. Configurar Custos

1. Clicar em uma coleção
2. Ir na tab "Custos"
3. Editar valores:
   - Material
   - Mão de Obra
   - Embalagem
   - Frete
   - Outros
4. Clicar "Salvar"

### 4. Analisar Resultados

- **Tab Visão Geral:** Ver lucro e margem
- **Tab Comparação:** Comparar formas de pagamento
- **Tab Recomendações:** Ver sugestões automáticas

---

## 📈 RECOMENDAÇÕES AUTOMÁTICAS

O sistema analisa automaticamente e sugere:

### Se Margem < 30%
⚠️ **Margem Baixa**
- Aumentar preço
- Reduzir custos
- Negociar com fornecedores

### Se Margem > 60%
✅ **Margem Excelente**
- Manter preços
- Investir em marketing
- Escalar produção

### Se ROI < 100%
⚠️ **ROI Baixo**
- Revisar custos
- Aumentar preço
- Otimizar produção

### Se ROI > 200%
✅ **ROI Excelente**
- Escalar esta coleção
- Usar como referência
- Investir em divulgação

### Maior Custo
ℹ️ **Identificação**
- Mostra qual custo é maior
- Sugere negociação
- Buscar alternativas

---

## ✅ BENEFÍCIOS

### Para Você (Admin)
✅ Visão completa de rentabilidade  
✅ Decisões baseadas em dados  
✅ Identificar coleções mais lucrativas  
✅ Otimizar custos  
✅ Comparar formas de pagamento  
✅ Recomendações automáticas

### Para o Negócio
✅ Maximizar lucro  
✅ Reduzir custos  
✅ Melhorar margens  
✅ Escalar coleções certas  
✅ Evitar prejuízos  
✅ Crescimento sustentável

---

## 🎯 CASOS DE USO

### 1. Lançar Nova Coleção
1. Estimar custos
2. Definir preço
3. Calcular margem esperada
4. Validar viabilidade

### 2. Otimizar Coleção Existente
1. Ver análise atual
2. Identificar maior custo
3. Negociar redução
4. Recalcular margem

### 3. Decidir Preço
1. Ver lucro em diferentes preços
2. Comparar com outras coleções
3. Validar margem mínima
4. Definir preço ideal

### 4. Escolher Forma de Pagamento
1. Ver comparação
2. Identificar mais lucrativa
3. Incentivar no site
4. Maximizar lucro

---

## 📊 DASHBOARD VISUAL

```
┌─────────────────────────────────────────────────────┐
│ 📊 Análise Financeira das Coleções                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [12 Coleções] [R$ 270 Lucro Médio] [54% Margem]   │
│                                                     │
│ ┌─ Marvel ──────────┐ ┌─ DC ───────────┐          │
│ │ Preço: R$ 665     │ │ Preço: R$ 475  │          │
│ │ Custo: R$ 250     │ │ Custo: R$ 200  │          │
│ │ Lucro: R$ 408     │ │ Lucro: R$ 270  │          │
│ │ Margem: 61%       │ │ Margem: 57%    │          │
│ └───────────────────┘ └────────────────┘          │
│                                                     │
│ [Clique para análise detalhada]                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Análise Detalhada - Marvel                         │
├─────────────────────────────────────────────────────┤
│ [Visão Geral] [Custos] [Comparação] [Recomendações]│
│                                                     │
│ Lucro Líquido (PIX): R$ 408,35                     │
│ Margem Líquida: 61,4%                              │
│ ROI: 163,3%                                        │
│ Breakeven: 3 unidades                              │
│                                                     │
│ ✅ Margem Excelente!                               │
│ ✅ ROI Ótimo!                                      │
│ ℹ️ Maior custo: Mão de Obra (R$ 100)              │
└─────────────────────────────────────────────────────┘
```

---

**Sistema completo e pronto para uso!** 🎉

Agora você tem controle total sobre a rentabilidade de cada coleção!

