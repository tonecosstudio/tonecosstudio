# 📚 DOCUMENTAÇÃO OFICIAL - ORDAX

**Versão:** 3.0  
**Data:** 2026-02-15  
**Status:** ✅ DOCUMENTO ÚNICO E OFICIAL

---

## 🎯 ESTRUTURA DE PREÇOS

### 💰 PRODUTO AVULSO - R$ 500
- **1 personagem** do mês
- **Entrada:** R$ 100 (fixo, não reembolsável)
- **Restante quando pronto:**
  - **PIX:** R$ 375 (5% OFF) = Total R$ 475
  - **Parcelado:** R$ 400 em até 10x COM JUROS = Total R$ 500+

### 📦 PLANO TRIMESTRAL - R$ 1.350
- **3 personagens** consecutivos (1 por mês)
- **PIX:** R$ 1.282,50 (5% OFF)
- **Parcelado:** até 10x COM JUROS
- **Preço/peça:** R$ 450
- **Economia vs Avulso:** R$ 150 (10%)

### 💎 PLANO SEMESTRAL (PREMIUM) - R$ 2.700
- **6 personagens + 1 BÔNUS GRÁTIS** = 7 peças total
- **PIX:** R$ 2.565 (5% OFF)
- **Parcelado:** até 10x COM JUROS
- **Preço/peça:** R$ 385 (considerando 7 peças)
- **Economia vs Avulso:** R$ 800 (23%)

---

## 💳 FORMAS DE PAGAMENTO

### ✅ PIX (5% OFF - RECOMENDADO)
- Desconto automático de 5%
- Pagamento à vista
- Melhor custo-benefício

### 💳 Cartão de Crédito
- **6x SEM JUROS** (loja paga juros - não recomendado)
- **10x COM JUROS** (cliente paga juros - RECOMENDADO)
- Parcelamento facilitado
- Sem desconto

**Por que 10x com juros é melhor?**
- 6x sem juros: Você paga 14,94% de taxas
- 10x com juros: Cliente paga 20,65% a mais, você recebe quase o valor base
- Exemplo R$ 1.350: Recebe R$ 1.148 (6x) vs R$ 1.282 (10x) = +R$ 134!

### 📄 Boleto
- Preço cheio (sem desconto)
- Pagamento à vista

---

## 📊 TABELA COMPARATIVA

| Plano | Preço Full | Preço PIX | Peças | Bônus | Total | Preço/Peça | Economia |
|-------|------------|-----------|-------|-------|-------|------------|----------|
| **Avulso** | R$ 500 | R$ 475 | 1 | 0 | 1 | R$ 500 | - |
| **Trimestral** | R$ 1.350 | R$ 1.282,50 | 3 | 0 | 3 | R$ 450 | R$ 150 |
| **Semestral** | R$ 2.700 | R$ 2.565 | 6 | 1 | 7 | R$ 385 | R$ 800 |

---

## 🎁 REGRAS DE BÔNUS

- ❌ **Avulso:** Sem bônus
- ❌ **Trimestral:** Sem bônus
- ✅ **Semestral:** 1 peça GRÁTIS (6 + 1 = 7 total)

**Como funciona o bônus:**
- Cliente paga por 6 peças
- Recebe 7 peças (1 grátis)
- Bônus escolhido pelo cliente
- Bônus não entra no cálculo do preço

---

## 📅 CRONOGRAMA DE PRODUÇÃO

### Ciclo Mensal Fixo:

**1. Vendas:** Dia 15 ao dia 15 do mês seguinte
- Limite de produção: 50 peças/mês (exemplo)
- Quando atingir o limite, vendas fecham automaticamente

**2. Produção:** 15 dias
- Início: Dia 16 do mês
- Término: Dia 30/31 do mês
- Cliente acompanha com fotos

**3. Envio:** Até 5º dia útil do mês seguinte
- Considera feriados
- Rastreamento incluído

**Exemplo:**
- Compra: 15/02 a 15/03
- Produção: 16/03 a 30/03
- Envio: Até 5º dia útil de Abril

---

## 🏭 LIMITE DE PRODUÇÃO

### Sistema de Vagas Mensais:
- **Limite global:** 50 peças/mês (configurável)
- **Contagem:** Soma de todas as vendas (avulso + assinaturas)
- **Fechamento automático:** Quando atingir o limite
- **Próxima abertura:** Dia 15 do mês seguinte

### Regras:
- Entrada de R$ 100 garante a vaga
- Vagas são limitadas por mês
- Sistema atualiza em tempo real
- Badge mostra disponibilidade

---

## 🎨 ESPECIFICAÇÕES DO PRODUTO

### Características:
- **Tamanho:** 20cm de altura
- **Material:** Resina de alta qualidade
- **Pintura:** Artesanal, à mão
- **Embalagem:** MDF premium com logo
- **Peso:** ~500g (varia por personagem)

### Custos de Produção:
- Resina: R$ 50
- Pintura: R$ 80
- Embalagem MDF: R$ 30
- Frete: R$ 40
- **Total:** R$ 200/peça

---

## 💰 TAXAS DE GATEWAY (Mercado Pago)

| Forma | Taxa | Exemplo R$ 500 | Você Recebe |
|-------|------|----------------|-------------|
| **PIX** | 1,00% | R$ 5,00 | R$ 495,00 |
| **Boleto** | 1,05% | R$ 5,25 | R$ 494,75 |
| **Cartão 1x** | 2,49% | R$ 12,45 | R$ 487,55 |
| **Cartão 3x** | 2,99% | R$ 14,95 | R$ 485,05 |
| **Cartão 6x** | 3,49% | R$ 17,45 | R$ 482,55 |
| **Cartão 10x** | 4,49% | R$ 22,45 | R$ 477,55 |

---

## 🔄 SSOT (Single Source of Truth)

### Fonte Única: Banco de Dados
Todos os preços vêm da tabela `subscription_plans` no Supabase.

### Páginas que usam SSOT:
- ✅ `/admin/planos` - AdminPlans.tsx
- ✅ `/planos` - Plans.tsx
- ✅ `/colecoes` - Collections.tsx
- ✅ `/colecoes/:slug` - CollectionDetails.tsx
- ✅ `/assinar/:slug` - SubscribeCollection.tsx
- ✅ `/colecoes/:slug/comprar` - BuyCharacter.tsx

---

## 🎯 COMUNICAÇÃO NO SITE

### Avulso
```
💰 PRODUTO AVULSO - R$ 500
✅ 1 personagem do mês
✅ Entrada: R$ 100 (fixo)
✅ Restante: R$ 400 (ou R$ 375 no PIX)
✅ Sem compromisso
✅ Parcelamento em até 10x COM JUROS
```

### Trimestral
```
📦 PLANO TRIMESTRAL - R$ 1.350
✅ 3 personagens consecutivos
✅ R$ 450/peça
✅ Economize R$ 150
✅ PIX: R$ 1.282,50 ou Parcele COM JUROS
```

### Semestral (Premium)
```
💎 PLANO SEMESTRAL - R$ 2.700
✅ 6 personagens + 1 BÔNUS GRÁTIS!
✅ R$ 385/peça (7 no total!)
✅ Economize R$ 800
✅ PIX: R$ 2.565 ou Parcele COM JUROS
⭐ MELHOR CUSTO-BENEFÍCIO
```

---

## 📝 COMO ATUALIZAR PREÇOS

### 1. Atualizar no Banco
```sql
-- Atualizar Trimestral
UPDATE subscription_plans 
SET price_full = 1350.00, price_pix = 1282.50, deliveries_total = 3 
WHERE plan_type = 'trimestral';

-- Atualizar Semestral
UPDATE subscription_plans 
SET price_full = 2700.00, price_pix = 2565.00, deliveries_total = 7 
WHERE plan_type = 'semestral';

-- Verificar
SELECT plan_type, name, price_full, price_pix, deliveries_total, is_active 
FROM subscription_plans 
ORDER BY display_order;
```

### 2. Frontend Atualiza Automaticamente
Não precisa alterar código! O SSOT garante sincronização.

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [x] Valores definidos e validados
- [x] Trimestral: R$ 1.350 (3 peças)
- [x] Semestral: R$ 2.700 (7 peças = 6 + 1 bônus)
- [x] Desconto PIX: 5% em todos
- [x] Parcelamento: até 10x COM JUROS
- [x] SSOT implementado no código
- [x] Limite de produção implementado
- [x] Cronograma fixo documentado

---

## 🚀 PRÓXIMOS PASSOS

1. Testar fluxo completo de compra
2. Validar cálculos de parcelamento com juros
3. Testar limite de produção
4. Configurar notificações de vagas esgotadas

---

**Documento Oficial:** DOCUMENTACAO_OFICIAL_ORDAX.md  
**Versão:** 3.0  
**Data:** 2026-02-15  
**Próxima Revisão:** Quando houver mudança de preços ou regras
