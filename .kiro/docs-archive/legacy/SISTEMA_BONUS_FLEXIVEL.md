# ✅ Sistema de Bônus Flexível

## 🎯 Nova Funcionalidade

Agora cada plano pode escolher o tipo de bônus: **Peças Extras** OU **Coins Extras**

---

## 🎨 Como Funciona

### Seletor de Tipo de Bônus

Na aba "Peças" de cada plano, há um card destacado no topo com 2 botões:

```
┌─────────────────────────────────────────────┐
│ Tipo de Bônus                               │
│ Escolha se o bônus será em peças ou coins   │
│                                             │
│  [📦 Peças Extras]  [🪙 Coins Extras]      │
└─────────────────────────────────────────────┘
```

---

## 📊 Opção 1: Peças Extras

### Quando Usar
- Cliente recebe peças físicas adicionais
- Bônus vinculado a entregas mensais
- Exemplo: Plano Anual = 12 peças + 1 bônus

### Configuração
1. Selecione "Peças Extras"
2. Defina quantidade de peças bônus
3. Defina coins por peça bônus
4. Sistema calcula automaticamente

### Exemplo: Plano Anual
```
Peças Base: 12
Peças Bônus: 1
Total: 13 peças

Coins Base: 12 × 100 = 1.200 coins
Coins Bônus: 1 × 100 = 100 coins
Total: 1.300 coins
```

### Cálculo
- Coins Base = Peças Base × Coins por Peça
- Coins Bônus = Peças Bônus × Coins por Peça Bônus
- Total Coins = Coins Base + Coins Bônus

---

## 💰 Opção 2: Coins Extras

### Quando Usar
- Cliente recebe coins adicionais sem peças físicas
- Bônus em créditos para usar como quiser
- Exemplo: Plano Semestral = 6 peças + 50 coins extras

### Configuração
1. Selecione "Coins Extras"
2. Defina quantidade de coins bônus diretos
3. Peças bônus = 0 (automático)
4. Coins extras não vinculados a peças

### Exemplo: Plano Semestral
```
Peças Base: 6
Peças Bônus: 0 (sem peças extras)
Total: 6 peças

Coins Base: 6 × 100 = 600 coins
Coins Bônus: 50 coins (diretos)
Total: 650 coins
```

### Cálculo
- Coins Base = Peças Base × Coins por Peça
- Coins Bônus = Valor definido diretamente
- Total Coins = Coins Base + Coins Bônus
- Total Peças = Apenas peças base

---

## 🎯 Comparação

| Aspecto | Peças Extras | Coins Extras |
|---------|--------------|--------------|
| **Peças Físicas** | Sim, inclui bônus | Não, apenas base |
| **Coins Bônus** | Vinculados às peças | Diretos, sem peças |
| **Flexibilidade** | Menos (precisa entregar) | Mais (cliente escolhe) |
| **Exemplo** | 12 + 1 peça = 13 | 6 peças + 50 coins |
| **Uso** | Planos longos (Anual) | Planos médios (Semestral) |

---

## 🎨 Interface Atualizada

### Tab "Peças"

**Com Peças Extras:**
```
┌─────────────────────────────────────────────┐
│ [📦 Peças Extras] [🪙 Coins Extras]        │
└─────────────────────────────────────────────┘

Peças Base: [12]
Peças Bônus: [1]
Total: 13 peças

Exemplo: Anual
12 base + 1 bônus = 13 peças total
```

**Com Coins Extras:**
```
┌─────────────────────────────────────────────┐
│ [📦 Peças Extras] [🪙 Coins Extras]        │
└─────────────────────────────────────────────┘

Peças Base: [6]
Coins Bônus Diretos: [50]
Total: 6 peças

Exemplo: Semestral
6 peças base + 50 coins extras
```

### Tab "Moedas"

**Com Peças Extras:**
```
Coins por Peça Base: [100]
Coins por Peça Bônus: [100]

Coins Base: 12 × 100 = 1.200 coins
Coins Bônus: 1 × 100 = 100 coins

Distribuição:
- Peças base: 12 × 100 = 1.200
- Peças bônus: 1 × 100 = 100
Total: 1.300 coins
```

**Com Coins Extras:**
```
Coins por Peça Base: [100]
(Sem campo de coins por peça bônus)

Coins Base: 6 × 100 = 600 coins
Coins Bônus: 50 coins (diretos)

Distribuição:
- Peças base: 6 × 100 = 600
- Coins extras: +50 coins
Total: 650 coins
```

---

## 📋 Casos de Uso

### Caso 1: Plano Anual com Peça Bônus
```
Tipo: Peças Extras
Peças Base: 12
Peças Bônus: 1
Coins/Peça: 100

Resultado:
- 13 entregas mensais
- 1.300 coins total
- Cliente recebe 1 peça extra no final
```

### Caso 2: Plano Semestral com Coins Extras
```
Tipo: Coins Extras
Peças Base: 6
Coins Bônus: 50
Coins/Peça: 100

Resultado:
- 6 entregas mensais
- 650 coins total
- Cliente usa 50 coins extras como quiser
```

### Caso 3: Plano Trimestral com Coins Extras
```
Tipo: Coins Extras
Peças Base: 3
Coins Bônus: 20
Coins/Peça: 100

Resultado:
- 3 entregas mensais
- 320 coins total
- 20 coins extras de bônus
```

---

## 🔧 Implementação Técnica

### Estado do Componente
```typescript
const [bonusType, setBonusType] = useState<'pieces' | 'coins'>('pieces');
```

### Lógica de Cálculo

**Peças Extras:**
```typescript
total_pieces = base_pieces + bonus_pieces
base_credits = base_pieces × coins_per_piece
bonus_credits = bonus_pieces × coins_per_bonus_piece
total_credits = base_credits + bonus_credits
```

**Coins Extras:**
```typescript
total_pieces = base_pieces (bonus_pieces = 0)
base_credits = base_pieces × coins_per_piece
bonus_credits = valor definido diretamente
total_credits = base_credits + bonus_credits
```

---

## ✅ Benefícios

### 1. Flexibilidade
- ✅ Cada plano pode ter estratégia diferente
- ✅ Adapta-se ao tipo de cliente
- ✅ Mais opções de configuração

### 2. Clareza
- ✅ Interface visual clara
- ✅ Botões destacados
- ✅ Exemplos contextuais

### 3. Controle
- ✅ Admin escolhe o melhor para cada plano
- ✅ Cálculos automáticos
- ✅ Preview em tempo real

---

## 🎯 Recomendações de Uso

### Peças Extras
**Recomendado para:**
- Planos longos (Anual)
- Clientes que valorizam entregas físicas
- Quando há capacidade de produção extra

**Exemplo:**
- Anual: 12 + 1 peça
- Bimestral: 2 + 0 peças (sem bônus)

### Coins Extras
**Recomendado para:**
- Planos médios (Semestral, Trimestral)
- Clientes que querem flexibilidade
- Quando não há capacidade para peças extras

**Exemplo:**
- Semestral: 6 peças + 50 coins
- Trimestral: 3 peças + 20 coins

---

## 🚀 Como Configurar

### Passo 1: Acesse o Plano
1. Vá para `/admin/planos`
2. Aba "Planos de Assinatura"
3. Clique em um plano (ex: Semestral)

### Passo 2: Escolha o Tipo de Bônus
1. Vá para a tab "Peças"
2. No card destacado no topo
3. Clique em "Peças Extras" OU "Coins Extras"

### Passo 3: Configure o Bônus

**Se escolheu Peças Extras:**
1. Defina quantidade de peças bônus
2. Vá para tab "Moedas"
3. Defina coins por peça bônus
4. Veja o cálculo automático

**Se escolheu Coins Extras:**
1. Defina quantidade de coins bônus diretos
2. Peças bônus fica em 0 automaticamente
3. Veja o total de coins

### Passo 4: Salve
1. Revise o resumo do plano
2. Clique em "Salvar Configurações"

---

## 🎉 Resultado

Sistema flexível que permite:
- ✅ Bônus em peças físicas extras
- ✅ Bônus em coins extras
- ✅ Escolha por plano
- ✅ Interface intuitiva
- ✅ Cálculos automáticos

**Perfeito para diferentes estratégias de negócio!** 🚀
