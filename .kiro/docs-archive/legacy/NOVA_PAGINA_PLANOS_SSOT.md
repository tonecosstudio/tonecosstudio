# 🎯 Nova Página: Configuração de Planos (SSOT)

## ✨ O Que Mudou

Criei uma página completamente nova e melhorada que é o **SSOT (Single Source of Truth)** para configuração de planos.

---

## 📍 Nova Localização

### Antes:
- `/admin/creditos/planos` (dentro de "Sistema de Créditos")

### Agora:
- `/admin/planos` (seção "Operações")
- **Menu:** Admin → Operações → Configurar Planos

### Por quê?
Esta página não é apenas sobre créditos, é sobre a configuração central de TODOS os planos, peças e moedas do sistema.

---

## 🎯 Novo Conceito: Peças Base + Peças Bônus

### Como Funciona Agora

#### Exemplo: Plano Anual

```
┌─────────────────────────────────────────┐
│ 📦 PEÇAS                                │
├─────────────────────────────────────────┤
│ Peças Base:        12 peças             │
│ Peças Bônus:       +1 peça              │
│ Total de Peças:    13 peças             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🪙 MOEDAS                               │
├─────────────────────────────────────────┤
│ Coins por Peça Base:       100 coins    │
│ Coins por Peça Bônus:      100 coins    │
│                                         │
│ Coins Base:  12 × 100 = 1.200 coins    │
│ Coins Bônus:  1 × 100 =   100 coins    │
│ Total:                  1.300 coins     │
└─────────────────────────────────────────┘
```

---

## 🎨 Interface com Abas

### Aba 1: Valores 💰

Configure valores monetários:
- Preço mensal (R$)
- Valor total (calculado)
- Entrada mínima (avulso)
- Custo por coin (calculado)

### Aba 2: Peças 📦

Configure quantidade de peças:
- **Peças Base** - Peças principais do plano
- **Peças Bônus** - Peças extras/bônus
- **Total** - Calculado automaticamente

**Exemplo:**
- Anual: 12 base + 1 bônus = 13 total
- Semestral: 6 base + 0 bônus = 6 total
- Trimestral: 3 base + 0 bônus = 3 total

### Aba 3: Moedas 🪙

Configure coins por tipo de peça:
- **Coins por Peça Base** - Quanto vale cada peça normal
- **Coins por Peça Bônus** - Quanto vale cada peça extra
- **Coins Base** - Calculado (peças base × coins)
- **Coins Bônus** - Calculado (peças bônus × coins)
- **Total de Coins** - Soma automática

---

## 📊 Cálculos Automáticos

### 1. Total de Peças
```
Total de Peças = Peças Base + Peças Bônus
```

### 2. Coins Base
```
Coins Base = Peças Base × Coins por Peça Base
```

### 3. Coins Bônus
```
Coins Bônus = Peças Bônus × Coins por Peça Bônus
```

### 4. Total de Coins
```
Total de Coins = Coins Base + Coins Bônus
```

### 5. Custo por Coin
```
Custo por Coin = Valor Total ÷ Total de Coins
```

---

## 🎯 Exemplos Práticos

### Plano Anual: 12+1 Peças

```
CONFIGURAÇÃO:
├─ Preço Mensal: R$ 350,00
├─ Duração: 12 meses
├─ Peças Base: 12
├─ Peças Bônus: 1
├─ Coins/Peça Base: 100
└─ Coins/Peça Bônus: 100

RESULTADO AUTOMÁTICO:
├─ Valor Total: R$ 4.200,00 (350 × 12)
├─ Total Peças: 13 (12 + 1)
├─ Coins Base: 1.200 (12 × 100)
├─ Coins Bônus: 100 (1 × 100)
├─ Total Coins: 1.300
└─ Custo/Coin: R$ 3,23 (4200 ÷ 1300)
```

### Plano Semestral: 6+0 Peças

```
CONFIGURAÇÃO:
├─ Preço Mensal: R$ 400,00
├─ Duração: 6 meses
├─ Peças Base: 6
├─ Peças Bônus: 0
├─ Coins/Peça Base: 100
└─ Coins/Peça Bônus: 100

RESULTADO AUTOMÁTICO:
├─ Valor Total: R$ 2.400,00 (400 × 6)
├─ Total Peças: 6 (6 + 0)
├─ Coins Base: 600 (6 × 100)
├─ Coins Bônus: 0 (0 × 100)
├─ Total Coins: 600
└─ Custo/Coin: R$ 4,00 (2400 ÷ 600)
```

### Plano Trimestral: 3+0 Peças

```
CONFIGURAÇÃO:
├─ Preço Mensal: R$ 450,00
├─ Duração: 3 meses
├─ Peças Base: 3
├─ Peças Bônus: 0
├─ Coins/Peça Base: 100
└─ Coins/Peça Bônus: 100

RESULTADO AUTOMÁTICO:
├─ Valor Total: R$ 1.350,00 (450 × 3)
├─ Total Peças: 3 (3 + 0)
├─ Coins Base: 300 (3 × 100)
├─ Coins Bônus: 0 (0 × 100)
├─ Total Coins: 300
└─ Custo/Coin: R$ 4,50 (1350 ÷ 300)
```

---

## 🎨 Visual da Interface

### Dashboard de Resumo

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ✅ Planos    │ │ 💰 Receita   │ │ 📦 Peças     │ │ 🪙 Coins     │
│    Ativos    │ │    Mensal    │ │    Totais    │ │    Totais    │
│              │ │              │ │              │ │              │
│      3       │ │  R$ 1.150    │ │      21      │ │    2.100     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Card de Plano com Abas

```
┌─────────────────────────────────────────────────────────┐
│ 📅 Plano Anual                          [✓] Ativo      │
│ 12 meses de assinatura                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [💰 Valores] [📦 Peças] [🪙 Moedas]                    │
│                                                          │
│ ┌─ ABA PEÇAS ─────────────────────────────────────┐   │
│ │                                                   │   │
│ │ Peças Base:  [12]    Peças principais            │   │
│ │ Peças Bônus: [1]     Peças extras                │   │
│ │                                                   │   │
│ │ Total: 13 peças (12 + 1)                         │   │
│ │                                                   │   │
│ └───────────────────────────────────────────────────┘   │
│                                                          │
│ ┌─ ABA MOEDAS ────────────────────────────────────┐   │
│ │                                                   │   │
│ │ Coins/Peça Base:  [100]                          │   │
│ │ Coins/Peça Bônus: [100]                          │   │
│ │                                                   │   │
│ │ Coins Base:  12 × 100 = 1.200 coins              │   │
│ │ Coins Bônus:  1 × 100 =   100 coins              │   │
│ │ Total:              1.300 coins                  │   │
│ │                                                   │   │
│ └───────────────────────────────────────────────────┘   │
│                                                          │
│ 📊 RESUMO DO PLANO                                      │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Investimento:  R$ 4.200,00                       │   │
│ │ Peças totais:  13 (12+1)                         │   │
│ │ Coins totais:  1.300 coins                       │   │
│ │ Custo/coin:    R$ 3,23                           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                          │
│                      [Cancelar] [Salvar]                │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Configuração

### 1. Definir Valores Monetários

```
Aba "Valores" → Preencher preço mensal
```

### 2. Configurar Peças

```
Aba "Peças" → 
  - Definir peças base (ex: 12)
  - Definir peças bônus (ex: 1)
  - Ver total calculado (13)
```

### 3. Configurar Moedas

```
Aba "Moedas" →
  - Definir coins por peça base (ex: 100)
  - Definir coins por peça bônus (ex: 100)
  - Ver coins base calculado (1.200)
  - Ver coins bônus calculado (100)
  - Ver total calculado (1.300)
```

### 4. Revisar Resumo

```
Ver resumo automático com todos os valores
```

### 5. Ativar e Salvar

```
Ativar switch → Clicar "Salvar"
```

---

## 🎯 Vantagens da Nova Abordagem

### 1. Separação Clara
- Peças base vs peças bônus
- Coins por tipo de peça
- Cálculos transparentes

### 2. Flexibilidade
- Diferentes valores de coins para peças base e bônus
- Fácil adicionar promoções (aumentar peças bônus)
- Ajustar coins sem mexer em peças

### 3. SSOT (Single Source of Truth)
- Única fonte de verdade para:
  - Quantidade de peças
  - Valores de coins
  - Preços dos planos
  - Bônus e extras

### 4. Interface Intuitiva
- Abas organizadas por conceito
- Cálculos em tempo real
- Feedback visual imediato

---

## 📍 Localização no Menu

### Navegação:
```
Admin → Operações → Configurar Planos
```

### Badge:
```
[SSOT] - Indica que é a fonte única de verdade
```

---

## 🚀 Como Usar

### 1. Acessar

```
http://localhost:8081/admin/planos
```

### 2. Escolher Plano

Encontre o card do plano que deseja configurar

### 3. Configurar nas Abas

- **Valores:** Preços
- **Peças:** Quantidades
- **Moedas:** Coins

### 4. Revisar

Veja o resumo automático

### 5. Salvar

Ative e salve as configurações

---

## 📊 Comparação: Antes vs Agora

### Antes

```
- Campos soltos
- Cálculos manuais
- Sem separação de peças base/bônus
- Dentro de "créditos"
```

### Agora

```
✅ Abas organizadas
✅ Cálculos automáticos
✅ Peças base + bônus separadas
✅ Coins configuráveis por tipo
✅ Localização adequada (Operações)
✅ Badge SSOT
✅ Interface intuitiva
```

---

## 🎉 Conclusão

A nova página é a **central definitiva** para configuração de planos, peças e moedas!

**Acesse:** http://localhost:8081/admin/planos

---

**Sistema completo e pronto para uso!** 🚀
