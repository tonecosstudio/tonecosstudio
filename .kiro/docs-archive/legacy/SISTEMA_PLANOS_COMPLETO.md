# 🎯 Sistema Completo de Planos e Coins

## 📊 Visão Geral do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA DE PLANOS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  5 TIPOS DE PLANOS                                          │
│  ├─ Compra Avulsa (0 meses)                                │
│  ├─ Bimestral (2 meses)                                    │
│  ├─ Trimestral (3 meses)                                   │
│  ├─ Semestral (6 meses)                                    │
│  └─ Anual (12 meses)                                       │
│                                                              │
│  CADA PLANO CONFIGURA:                                      │
│  ├─ Preço mensal (R$)                                      │
│  ├─ Coins base                                             │
│  ├─ Coins bônus                                            │
│  ├─ Quantidade de peças                                    │
│  ├─ Entrada mínima (avulso)                                │
│  └─ Status (ativo/inativo)                                 │
│                                                              │
│  CÁLCULOS AUTOMÁTICOS:                                      │
│  ├─ Valor total = preço × meses                            │
│  ├─ Total coins = base + bônus                             │
│  ├─ Custo/coin = valor ÷ coins                             │
│  └─ Coins/peça = coins ÷ peças                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 Exemplo de Configuração Completa

### 1. COMPRA AVULSA

```
┌─────────────────────────────────────────┐
│ 📦 COMPRA AVULSA                        │
├─────────────────────────────────────────┤
│ Tipo: Compra única sem assinatura      │
│ Duração: 0 meses                        │
│                                         │
│ 💵 VALORES                              │
│ ├─ Preço Unitário: R$ 0,00            │
│ ├─ Entrada Mínima: R$ 100,00          │
│ └─ Valor Total: R$ 0,00                │
│                                         │
│ 🪙 COINS                                │
│ ├─ Base: 0 coins                       │
│ ├─ Bônus: 0 coins                      │
│ ├─ Total: 0 coins                      │
│ └─ Custo/Coin: R$ 0,00                 │
│                                         │
│ 📦 PEÇAS                                │
│ ├─ Quantidade: 1 peça                  │
│ └─ Coins/Peça: 0 coins                 │
│                                         │
│ Status: ✅ Ativo                        │
└─────────────────────────────────────────┘
```

### 2. BIMESTRAL

```
┌─────────────────────────────────────────┐
│ 📅 PLANO BIMESTRAL                      │
├─────────────────────────────────────────┤
│ Tipo: Assinatura bimestral             │
│ Duração: 2 meses                        │
│                                         │
│ 💵 VALORES                              │
│ ├─ Preço Mensal: R$ 200,00            │
│ ├─ Entrada: R$ 0,00                    │
│ └─ Valor Total: R$ 400,00              │
│     (200 × 2 meses)                    │
│                                         │
│ 🪙 COINS                                │
│ ├─ Base: 80 coins                      │
│ ├─ Bônus: 10 coins                     │
│ ├─ Total: 90 coins                     │
│ └─ Custo/Coin: R$ 4,44                 │
│     (400 ÷ 90)                         │
│                                         │
│ 📦 PEÇAS                                │
│ ├─ Quantidade: 2 peças                 │
│ └─ Coins/Peça: 45 coins                │
│     (90 ÷ 2)                           │
│                                         │
│ Status: ⚪ Inativo                      │
└─────────────────────────────────────────┘
```

### 3. TRIMESTRAL

```
┌─────────────────────────────────────────┐
│ 📅 PLANO TRIMESTRAL                     │
├─────────────────────────────────────────┤
│ Tipo: Assinatura trimestral            │
│ Duração: 3 meses                        │
│                                         │
│ 💵 VALORES                              │
│ ├─ Preço Mensal: R$ 450,00            │
│ ├─ Entrada: R$ 0,00                    │
│ └─ Valor Total: R$ 1.350,00            │
│     (450 × 3 meses)                    │
│                                         │
│ 🪙 COINS                                │
│ ├─ Base: 300 coins                     │
│ ├─ Bônus: 50 coins                     │
│ ├─ Total: 350 coins                    │
│ └─ Custo/Coin: R$ 3,86                 │
│     (1350 ÷ 350)                       │
│                                         │
│ 📦 PEÇAS                                │
│ ├─ Quantidade: 3 peças                 │
│ └─ Coins/Peça: 117 coins               │
│     (350 ÷ 3)                          │
│                                         │
│ Status: ✅ Ativo                        │
└─────────────────────────────────────────┘
```

### 4. SEMESTRAL

```
┌─────────────────────────────────────────┐
│ 📅 PLANO SEMESTRAL                      │
├─────────────────────────────────────────┤
│ Tipo: Assinatura semestral             │
│ Duração: 6 meses                        │
│                                         │
│ 💵 VALORES                              │
│ ├─ Preço Mensal: R$ 400,00            │
│ ├─ Entrada: R$ 0,00                    │
│ └─ Valor Total: R$ 2.400,00            │
│     (400 × 6 meses)                    │
│                                         │
│ 🪙 COINS                                │
│ ├─ Base: 600 coins                     │
│ ├─ Bônus: 50 coins                     │
│ ├─ Total: 650 coins                    │
│ └─ Custo/Coin: R$ 3,69                 │
│     (2400 ÷ 650)                       │
│                                         │
│ 📦 PEÇAS                                │
│ ├─ Quantidade: 6 peças                 │
│ └─ Coins/Peça: 108 coins               │
│     (650 ÷ 6)                          │
│                                         │
│ Status: ✅ Ativo                        │
└─────────────────────────────────────────┘
```

### 5. ANUAL

```
┌─────────────────────────────────────────┐
│ 📅 PLANO ANUAL                          │
├─────────────────────────────────────────┤
│ Tipo: Assinatura anual                 │
│ Duração: 12 meses                       │
│                                         │
│ 💵 VALORES                              │
│ ├─ Preço Mensal: R$ 350,00            │
│ ├─ Entrada: R$ 0,00                    │
│ └─ Valor Total: R$ 4.200,00            │
│     (350 × 12 meses)                   │
│                                         │
│ 🪙 COINS                                │
│ ├─ Base: 1200 coins                    │
│ ├─ Bônus: 100 coins                    │
│ ├─ Total: 1300 coins                   │
│ └─ Custo/Coin: R$ 3,23                 │
│     (4200 ÷ 1300)                      │
│                                         │
│ 📦 PEÇAS                                │
│ ├─ Quantidade: 12 peças                │
│ └─ Coins/Peça: 108 coins               │
│     (1300 ÷ 12)                        │
│                                         │
│ Status: ⚪ Inativo                      │
└─────────────────────────────────────────┘
```

---

## 📈 Comparativo de Planos

### Tabela de Valores

| Plano      | Meses | Preço/Mês | Total    | Base | Bônus | Total Coins | R$/Coin | Peças | Coins/Peça |
|------------|-------|-----------|----------|------|-------|-------------|---------|-------|------------|
| Avulso     | 0     | R$ 0      | R$ 0     | 0    | 0     | 0           | R$ 0    | 1     | 0          |
| Bimestral  | 2     | R$ 200    | R$ 400   | 80   | 10    | 90          | R$ 4,44 | 2     | 45         |
| Trimestral | 3     | R$ 450    | R$ 1.350 | 300  | 50    | 350         | R$ 3,86 | 3     | 117        |
| Semestral  | 6     | R$ 400    | R$ 2.400 | 600  | 50    | 650         | R$ 3,69 | 6     | 108        |
| Anual      | 12    | R$ 350    | R$ 4.200 | 1200 | 100   | 1300        | R$ 3,23 | 12    | 108        |

### Gráfico de Custo por Coin

```
R$ 5,00 │
        │
R$ 4,44 │ ██ Bimestral
        │
R$ 4,00 │
        │
R$ 3,86 │ ██ Trimestral
        │
R$ 3,69 │ ██ Semestral
        │
R$ 3,23 │ ██ Anual (MELHOR CUSTO)
        │
R$ 3,00 └─────────────────────────
```

### Vantagens por Plano

#### 🏆 ANUAL - Melhor Custo/Benefício
- ✅ Menor custo por coin (R$ 3,23)
- ✅ Maior bônus (100 coins)
- ✅ Mais peças (12)
- ✅ Economia de 27% vs Bimestral

#### 💎 SEMESTRAL - Equilíbrio
- ✅ Bom custo por coin (R$ 3,69)
- ✅ Compromisso médio (6 meses)
- ✅ Bônus razoável (50 coins)
- ✅ Economia de 17% vs Bimestral

#### ⚡ TRIMESTRAL - Popular
- ✅ Compromisso curto (3 meses)
- ✅ Custo acessível (R$ 1.350)
- ✅ Bônus de 50 coins
- ✅ Economia de 13% vs Bimestral

#### 🎯 BIMESTRAL - Teste
- ✅ Menor compromisso (2 meses)
- ✅ Investimento baixo (R$ 400)
- ⚠️ Custo por coin mais alto

#### 📦 AVULSO - Flexível
- ✅ Sem compromisso
- ✅ Entrada mínima R$ 100
- ⚠️ Sem coins inclusos

---

## 🔄 Fluxo de Uso do Sistema

### 1. Admin Configura Planos

```
Admin acessa /admin/creditos/planos
    ↓
Define valores para cada plano
    ↓
Ativa planos desejados
    ↓
Salva configurações
```

### 2. Usuário Escolhe Plano

```
Usuário acessa /planos
    ↓
Vê planos ativos
    ↓
Compara valores e coins
    ↓
Escolhe plano
    ↓
Realiza pagamento
```

### 3. Sistema Aloca Coins

```
Pagamento confirmado
    ↓
Sistema cria assinatura
    ↓
Aloca coins (base + bônus)
    ↓
Usuário pode usar coins
```

### 4. Usuário Usa Coins

```
Usuário acessa /catalogo-personagens
    ↓
Vê personagens e preços em coins
    ↓
Compra personagem com coins
    ↓
Coins são debitados
```

---

## 🎨 Interface da Página

### Dashboard de Resumo

```
┌─────────────────────────────────────────────────────────┐
│  📊 CONFIGURAÇÃO DE PLANOS                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ ✅ Planos    │  │ 💰 Receita   │  │ 🪙 Total     │ │
│  │    Ativos    │  │    Mensal    │  │    Coins     │ │
│  │              │  │              │  │              │ │
│  │      3       │  │  R$ 1.150    │  │    1.300     │ │
│  │  de 5 planos │  │  potencial   │  │  por ciclo   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Card de Configuração

```
┌─────────────────────────────────────────────────────────┐
│  📅 Plano Trimestral                    [✓] Ativo      │
│  3 meses de assinatura                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  💰 VALORES MONETÁRIOS                                  │
│  ┌──────────────┐  ┌──────────────────────────────┐   │
│  │ Preço Mensal │  │ Valor Total                  │   │
│  │ R$ [450.00]  │  │ 450 × 3 meses                │   │
│  └──────────────┘  │ R$ 1.350,00                  │   │
│                     └──────────────────────────────┘   │
│                                                          │
│  🪙 SISTEMA DE COINS                                    │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────────┐  │
│  │ Base   │  │ Bônus  │  │ Total  │  │ Custo/Coin │  │
│  │ [300]  │  │ [50]   │  │ 350    │  │ R$ 3,86    │  │
│  └────────┘  └────────┘  └────────┘  └────────────┘  │
│                                                          │
│  📦 PEÇAS POR ASSINATURA                                │
│  ┌────────────┐  ┌──────────────────────────────┐     │
│  │ Quantidade │  │ Coins por Peça               │     │
│  │ [3]        │  │ 350 ÷ 3                      │     │
│  └────────────┘  │ 117 coins/peça               │     │
│                   └──────────────────────────────┘     │
│                                                          │
│  📊 RESUMO DO PLANO                                     │
│  ┌────────────────────────────────────────────────┐   │
│  │ Investimento:     R$ 1.350,00                  │   │
│  │ Coins recebidos:  350 coins                    │   │
│  │ Valor por coin:   R$ 3,86                      │   │
│  │ Peças incluídas:  3 peças                      │   │
│  │ Bônus extra:      +50 coins                    │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
│                      [Cancelar] [Salvar]                │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Estrutura de Banco de Dados

### Tabela: subscription_credit_plans

```sql
CREATE TABLE subscription_credit_plans (
  id UUID PRIMARY KEY,
  plan_type TEXT CHECK (plan_type IN (
    'avulso', 'bimestral', 'trimestral', 
    'semestral', 'anual'
  )),
  name TEXT NOT NULL,
  duration_months INTEGER CHECK (duration_months >= 0),
  price DECIMAL(10, 2) CHECK (price >= 0),
  base_credits INTEGER CHECK (base_credits >= 0),
  bonus_credits INTEGER CHECK (bonus_credits >= 0),
  deposit_amount DECIMAL(10, 2) CHECK (deposit_amount >= 0),
  pieces_per_subscription INTEGER CHECK (pieces_per_subscription >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### View: subscription_credit_plans_with_calculations

```sql
CREATE VIEW subscription_credit_plans_with_calculations AS
SELECT 
  p.*,
  (p.base_credits + p.bonus_credits) as total_credits,
  (p.price * p.duration_months) as total_price,
  CASE 
    WHEN (p.base_credits + p.bonus_credits) > 0 
    THEN (p.price * p.duration_months) / (p.base_credits + p.bonus_credits)
    ELSE 0 
  END as coin_unit_cost,
  CASE 
    WHEN p.pieces_per_subscription > 0 
    THEN (p.base_credits + p.bonus_credits) / p.pieces_per_subscription
    ELSE 0 
  END as coins_per_piece
FROM subscription_credit_plans p;
```

---

## ✅ Checklist de Implementação

### Backend
- [x] Migration criada
- [x] Tabela estendida
- [x] View com cálculos
- [x] Constraints adicionados
- [x] Índices criados

### Frontend
- [x] Página criada
- [x] Interface completa
- [x] Cálculos automáticos
- [x] Validações
- [x] Feedback visual

### Integração
- [x] Rota adicionada
- [x] Navegação configurada
- [x] Permissões aplicadas

### Documentação
- [x] README criado
- [x] Exemplos fornecidos
- [x] Troubleshooting incluído

---

## 🚀 Próximos Passos

1. ✅ Aplicar migration
2. ✅ Configurar valores
3. ✅ Ativar planos
4. ⏳ Testar fluxo completo
5. ⏳ Ajustar conforme feedback

---

**Sistema completo e pronto para uso!** 🎉
