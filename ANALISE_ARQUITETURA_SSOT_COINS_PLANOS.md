# 🏗️ ANÁLISE: ARQUITETURA SSOT - COINS & PLANOS

## 📋 Status: ANÁLISE SEM APLICAÇÃO

Data: 2026-03-06

---

## 🎯 Pergunta do Usuário

> "A página admin planos está alinhada com a de admin coins? Exemplo, a página de planos deveria receber os valores da de coins, e a de planos ajusta os planos de acordo com o que foi no coin, ou teria outra forma? Analise sem me agradar, pois deve ter somente um local para definir as regras, e outros locais apenas usam como referência. Exemplo: lá tem coleção ativa por 200, na página planos poderia definir quais coleções terão esse valor, é isso?"

---

## 🔍 ANÁLISE DA ARQUITETURA ATUAL

### 1. Página Admin Coins (`/admin/coins`)

**Responsabilidade Atual**:
- ✅ Define preços BASE de personagens por tipo de coleção
- ✅ Define multiplicadores contextuais (assinante/não assinante)
- ✅ Calcula preços finais: base × multiplicador

**Valores Definidos**:
```
Coleção Ativa (escolhida):     200 coins (base × 1.0)
Coleção Secundária (não escolhida): 240 coins (base × 1.2)
Catálogo Geral:                 300 coins (base × 1.5)
Premium:                        450 coins (base × 2.25)
```

**Tabelas Usadas**:
- `collection_base_pricing` - Preços base por tipo
- `collection_pricing_by_context` - Preços por contexto de usuário
- `pricing_context_multipliers` - Multiplicadores

**Escopo**: PREÇOS DE PERSONAGENS (quanto custa cada personagem)

---

### 2. Página Admin Planos (`/admin/plans`)

**Responsabilidade Atual**:
- ✅ Define planos de assinatura (Bimestral, Trimestral, etc.)
- ✅ Define quantas PEÇAS cada plano dá
- ✅ Define quantos COINS cada plano dá
- ✅ Define cotação do coin (R$ por coin)
- ✅ Calcula custo por coin do plano

**Valores Definidos**:
```
Exemplo Plano Semestral:
- Preço: R$ 300,00
- Peças base: 6
- Peças bônus: 1
- Total peças: 7
- Coins por peça: 100
- Total coins: 700 coins
- Custo por coin: R$ 0,43
```

**Tabelas Usadas**:
- `subscription_credit_plans` - Planos de assinatura
- `coin_exchange_rate` - Cotação R$ → coin

**Escopo**: PLANOS DE ASSINATURA (quanto o usuário paga e recebe)

---

## ❌ PROBLEMA IDENTIFICADO: FALTA DE INTEGRAÇÃO

### Situação Atual (DESALINHADA)

```
┌─────────────────────────────────────┐
│   Admin Coins (/admin/coins)       │
│                                     │
│   Define: Preços de personagens    │
│   - Coleção Ativa: 200 coins       │
│   - Coleção Secundária: 240 coins  │
│   - Catálogo Geral: 300 coins      │
│   - Premium: 450 coins              │
└─────────────────────────────────────┘
              ❌ SEM CONEXÃO
┌─────────────────────────────────────┐
│   Admin Planos (/admin/plans)      │
│                                     │
│   Define: Planos de assinatura     │
│   - Semestral: 700 coins            │
│   - Anual: 1500 coins               │
│   - Coins por peça: 100             │
└─────────────────────────────────────┘
```

**Problemas**:
1. ❌ Não há referência entre as páginas
2. ❌ Admin Planos não sabe quanto custam os personagens
3. ❌ Admin Coins não sabe quantos coins os planos dão
4. ❌ Não há validação de consistência
5. ❌ Usuário pode criar plano com 100 coins mas personagens custam 200+

---

## ✅ ARQUITETURA SSOT PROPOSTA

### Conceito: Hierarquia de Responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│                    SSOT LAYER 1                             │
│              Admin Coins (/admin/coins)                     │
│                                                             │
│  DEFINE: Regras de Preços (FONTE DA VERDADE)               │
│  ✓ Preço base de referência: 200 coins                     │
│  ✓ Multiplicadores contextuais                             │
│  ✓ Tipos de coleção e seus preços                          │
│  ✓ Fórmulas de cálculo                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    USA COMO REFERÊNCIA
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SSOT LAYER 2                             │
│              Admin Planos (/admin/plans)                    │
│                                                             │
│  DEFINE: Planos de Assinatura (USA PREÇOS DO LAYER 1)      │
│  ✓ Quantos coins cada plano dá                             │
│  ✓ Preço em R$ de cada plano                               │
│  ✓ Validação: coins suficientes para X personagens         │
│  ✓ Sugestões baseadas nos preços de personagens            │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    AMBOS SÃO USADOS POR
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CONSUMPTION LAYER                        │
│              Frontend (Catálogo, Compras, etc.)             │
│                                                             │
│  USA: Preços e Planos (SOMENTE LEITURA)                    │
│  ✓ Exibe preços de personagens                             │
│  ✓ Exibe planos disponíveis                                │
│  ✓ Calcula se usuário tem coins suficientes                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 PROPOSTA DE IMPLEMENTAÇÃO

### 1. Admin Coins (SSOT Layer 1) - MANTÉM COMO ESTÁ

**Responsabilidade**: Definir TODAS as regras de preços

**Não muda nada**, continua sendo a fonte da verdade para:
- Preços base (200, 300, 450)
- Multiplicadores (1.0, 1.2, 1.5, 2.25)
- Contextos (escolhida, não escolhida, sem assinatura)

---

### 2. Admin Planos (SSOT Layer 2) - ADICIONAR INTEGRAÇÃO

**Mudanças Propostas**:

#### A. Exibir Referência de Preços de Personagens

Adicionar seção na página de planos:

```tsx
┌─────────────────────────────────────────────────────────────┐
│  📊 REFERÊNCIA: PREÇOS DE PERSONAGENS                       │
│                                                             │
│  Estes são os preços atuais definidos em /admin/coins:     │
│                                                             │
│  • Coleção Ativa (escolhida):     200 coins                │
│  • Coleção Secundária:             240 coins                │
│  • Catálogo Geral:                 300 coins                │
│  • Premium:                        450 coins                │
│                                                             │
│  Use estes valores como referência ao definir planos.      │
│  [Ver Detalhes em /admin/coins →]                          │
└─────────────────────────────────────────────────────────────┘
```

#### B. Calculadora Inteligente

Ao configurar um plano, mostrar:

```tsx
┌─────────────────────────────────────────────────────────────┐
│  🧮 CALCULADORA: O QUE O USUÁRIO PODE COMPRAR               │
│                                                             │
│  Plano Semestral: 700 coins                                 │
│                                                             │
│  Com esses coins, o assinante pode comprar:                 │
│  ✓ 3 personagens da Coleção Ativa (3 × 200 = 600)          │
│  ✓ 2 personagens da Coleção Ativa (2 × 200 = 400)          │
│    + 1 da Secundária (1 × 240 = 240)                        │
│  ✓ 2 personagens do Catálogo Geral (2 × 300 = 600)         │
│  ✓ 1 personagem Premium (1 × 450 = 450)                    │
│                                                             │
│  ⚠️ Sobram: 100 coins (não suficiente para mais nada)      │
│  💡 Sugestão: Ajuste para 800 coins (4 × 200)              │
└─────────────────────────────────────────────────────────────┘
```

#### C. Validação Automática

```tsx
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ AVISO: PLANO PODE SER INSUFICIENTE                     │
│                                                             │
│  O plano atual dá 150 coins, mas:                          │
│  • Personagem mais barato: 200 coins                        │
│                                                             │
│  ❌ Usuário não conseguirá comprar NENHUM personagem!      │
│                                                             │
│  Sugestões:                                                 │
│  • Mínimo recomendado: 200 coins (1 personagem)            │
│  • Ideal: 400 coins (2 personagens)                        │
└─────────────────────────────────────────────────────────────┘
```

#### D. Sugestões de Configuração

```tsx
┌─────────────────────────────────────────────────────────────┐
│  💡 SUGESTÕES INTELIGENTES                                  │
│                                                             │
│  Baseado nos preços atuais, sugerimos:                     │
│                                                             │
│  Plano Básico:                                              │
│  • 400 coins (2 personagens da Coleção Ativa)              │
│  • R$ 50,00 (R$ 0,125 por coin)                            │
│                                                             │
│  Plano Intermediário:                                       │
│  • 800 coins (4 personagens da Coleção Ativa)              │
│  • R$ 90,00 (R$ 0,1125 por coin) - 10% desconto            │
│                                                             │
│  Plano Premium:                                             │
│  • 1600 coins (8 personagens da Coleção Ativa)             │
│  • R$ 160,00 (R$ 0,10 por coin) - 20% desconto             │
│                                                             │
│  [Aplicar Sugestão]                                         │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Integração Técnica

#### A. Hook Compartilhado

Criar hook que busca preços de personagens:

```typescript
// src/hooks/useCharacterPrices.ts
export function useCharacterPricesReference() {
  return useQuery({
    queryKey: ['character-prices-reference'],
    queryFn: async () => {
      // Buscar preços de collection_base_pricing
      const { data } = await supabase
        .from('collection_base_pricing')
        .select('*');
      
      return {
        colecaoAtiva: 200,
        colecaoSecundaria: 240,
        catalogoGeral: 300,
        premium: 450,
      };
    },
  });
}
```

#### B. Componente de Referência

```typescript
// src/components/admin/CharacterPricesReference.tsx
export function CharacterPricesReference() {
  const { data: prices } = useCharacterPricesReference();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Referência: Preços de Personagens</CardTitle>
        <CardDescription>
          Definidos em /admin/coins
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <PriceCard 
            label="Coleção Ativa" 
            coins={prices.colecaoAtiva} 
          />
          <PriceCard 
            label="Coleção Secundária" 
            coins={prices.colecaoSecundaria} 
          />
          <PriceCard 
            label="Catálogo Geral" 
            coins={prices.catalogoGeral} 
          />
          <PriceCard 
            label="Premium" 
            coins={prices.premium} 
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

#### C. Calculadora de Poder de Compra

```typescript
// src/components/admin/PurchasingPowerCalculator.tsx
export function PurchasingPowerCalculator({ totalCoins }: { totalCoins: number }) {
  const { data: prices } = useCharacterPricesReference();
  
  const calculations = {
    colecaoAtiva: Math.floor(totalCoins / prices.colecaoAtiva),
    colecaoSecundaria: Math.floor(totalCoins / prices.colecaoSecundaria),
    catalogoGeral: Math.floor(totalCoins / prices.catalogoGeral),
    premium: Math.floor(totalCoins / prices.premium),
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Poder de Compra: {totalCoins} coins</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            ✓ {calculations.colecaoAtiva} personagens da Coleção Ativa
          </div>
          <div>
            ✓ {calculations.colecaoSecundaria} personagens da Coleção Secundária
          </div>
          <div>
            ✓ {calculations.catalogoGeral} personagens do Catálogo Geral
          </div>
          <div>
            ✓ {calculations.premium} personagens Premium
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 📊 EXEMPLO PRÁTICO

### Cenário: Admin quer criar Plano Semestral

#### ANTES (Situação Atual - Desalinhada)
```
1. Admin vai em /admin/plans
2. Define: 700 coins por R$ 300
3. ❌ Não sabe se 700 coins é suficiente
4. ❌ Não sabe quantos personagens o usuário pode comprar
5. ❌ Pode criar plano inútil (ex: 50 coins)
```

#### DEPOIS (Com Integração - Alinhada)
```
1. Admin vai em /admin/plans
2. Vê referência:
   "Personagens custam 200-450 coins"
3. Define: 800 coins por R$ 300
4. ✅ Sistema mostra: "Usuário pode comprar 4 personagens"
5. ✅ Sistema valida: "Plano adequado"
6. ✅ Sistema sugere: "Considere 1000 coins para 5 personagens"
```

---

## 🎯 RESPOSTA À PERGUNTA DO USUÁRIO

### "Deveria ter somente um local para definir as regras?"

**SIM!** E já temos:

1. **SSOT de Preços**: `/admin/coins`
   - Define: Quanto custa cada tipo de personagem
   - Tabelas: `collection_base_pricing`, `pricing_context_multipliers`

2. **SSOT de Planos**: `/admin/plans`
   - Define: Quanto o usuário paga e recebe
   - Tabelas: `subscription_credit_plans`, `coin_exchange_rate`

**MAS**: Falta a INTEGRAÇÃO entre eles!

---

### "A página de planos deveria receber os valores da de coins?"

**SIM!** Proposta:

```
Admin Coins (DEFINE) → Admin Planos (USA COMO REFERÊNCIA)
```

**Como**:
1. Admin Planos BUSCA preços de personagens do banco
2. Admin Planos EXIBE esses preços como referência
3. Admin Planos CALCULA poder de compra baseado nesses preços
4. Admin Planos VALIDA se plano é suficiente
5. Admin Planos SUGERE valores ideais

**Mas NÃO**:
- ❌ Admin Planos NÃO altera preços de personagens
- ❌ Admin Planos NÃO define multiplicadores
- ❌ Admin Planos NÃO muda regras de preços

---

### "Na página planos poderia definir quais coleções terão esse valor?"

**NÃO!** Isso seria DUPLICAÇÃO de responsabilidade.

**Arquitetura Correta**:

```
/admin/coins:
  ✓ Define: Coleção Ativa = 200 coins
  ✓ Define: Quais coleções são "Ativa", "Secundária", etc.
  ✓ Define: Multiplicadores por contexto

/admin/plans:
  ✓ Define: Planos e quantos coins cada um dá
  ✓ USA: Preços definidos em /admin/coins (somente leitura)
  ✓ CALCULA: Poder de compra baseado nesses preços
  ✓ VALIDA: Se plano é adequado
```

**Mas poderia ter**:
```
/admin/collections:
  ✓ Define: Quais coleções existem (Naruto, Dragon Ball, etc.)
  ✓ Define: Tipo de cada coleção (subscription, standard, premium)
  ✓ Associa: Coleção → Tipo → Preço (via /admin/coins)
```

---

## 📋 RESUMO DA PROPOSTA

### O Que Manter
1. ✅ `/admin/coins` continua sendo SSOT de preços
2. ✅ `/admin/plans` continua sendo SSOT de planos
3. ✅ Separação de responsabilidades

### O Que Adicionar
1. ➕ Componente de referência de preços em `/admin/plans`
2. ➕ Calculadora de poder de compra
3. ➕ Validação automática de planos
4. ➕ Sugestões inteligentes
5. ➕ Link entre as páginas

### O Que NÃO Fazer
1. ❌ NÃO permitir editar preços em `/admin/plans`
2. ❌ NÃO duplicar regras de preços
3. ❌ NÃO criar dependência circular

---

## 🚀 PRÓXIMOS PASSOS (SE APROVADO)

1. Criar hook `useCharacterPricesReference()`
2. Criar componente `CharacterPricesReference`
3. Criar componente `PurchasingPowerCalculator`
4. Criar componente `PlanValidator`
5. Criar componente `PlanSuggestions`
6. Integrar componentes em `/admin/plans`
7. Adicionar links entre páginas
8. Documentar arquitetura

---

## 💡 BENEFÍCIOS DA PROPOSTA

1. ✅ **SSOT Mantido**: Cada página tem sua responsabilidade clara
2. ✅ **Integração**: Páginas se comunicam via banco de dados
3. ✅ **Validação**: Sistema previne erros de configuração
4. ✅ **UX Melhor**: Admin vê impacto das decisões
5. ✅ **Manutenibilidade**: Mudanças em preços refletem automaticamente
6. ✅ **Escalabilidade**: Fácil adicionar novos tipos de coleção/plano

---

**Data**: 2026-03-06  
**Status**: ⏸️ AGUARDANDO APROVAÇÃO  
**Próximo Passo**: Usuário decide se implementa ou ajusta proposta
