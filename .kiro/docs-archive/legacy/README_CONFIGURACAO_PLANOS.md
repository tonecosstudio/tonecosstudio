# 📋 Configuração de Planos de Assinatura

## 🎯 Visão Geral

Nova página completa para configurar todos os planos de assinatura com sistema de coins integrado.

**Acesso:** `/admin/creditos/planos`

---

## ✨ Funcionalidades

### 1️⃣ Tipos de Planos Suportados

- **Compra Avulsa** - Compra única sem assinatura
- **Bimestral** - 2 meses de assinatura
- **Trimestral** - 3 meses de assinatura
- **Semestral** - 6 meses de assinatura
- **Anual** - 12 meses de assinatura

### 2️⃣ Configurações por Plano

Cada plano pode ser configurado com:

#### Valores Monetários
- **Preço Mensal (R$)** - Valor cobrado por mês
- **Valor Total** - Calculado automaticamente (preço × meses)
- **Entrada Mínima** - Para compra avulsa (padrão: R$ 100)

#### Sistema de Coins
- **Coins Base** - Quantidade principal de coins
- **Bônus Extra** - Coins adicionais de bônus
- **Total de Coins** - Calculado automaticamente (base + bônus)
- **Custo por Coin** - Calculado automaticamente (valor total ÷ total coins)

#### Peças por Assinatura
- **Quantidade de Peças** - Número de peças incluídas
- **Coins por Peça** - Calculado automaticamente (total coins ÷ peças)

#### Status
- **Ativo/Inativo** - Ativar ou desativar plano

---

## 📊 Exemplo de Configuração

### Plano Trimestral

```
Valores Monetários:
├─ Preço Mensal: R$ 450,00
└─ Valor Total: R$ 1.350,00 (450 × 3)

Sistema de Coins:
├─ Coins Base: 300
├─ Bônus Extra: 50
├─ Total de Coins: 350 coins
└─ Custo por Coin: R$ 3,86

Peças por Assinatura:
├─ Quantidade: 3 peças
└─ Coins por Peça: 117 coins/peça

Status: ✅ Ativo
```

### Plano Semestral

```
Valores Monetários:
├─ Preço Mensal: R$ 400,00
└─ Valor Total: R$ 2.400,00 (400 × 6)

Sistema de Coins:
├─ Coins Base: 600
├─ Bônus Extra: 50
├─ Total de Coins: 650 coins
└─ Custo por Coin: R$ 3,69

Peças por Assinatura:
├─ Quantidade: 6 peças
└─ Coins por Peça: 108 coins/peça

Status: ✅ Ativo
```

### Plano Anual

```
Valores Monetários:
├─ Preço Mensal: R$ 350,00
└─ Valor Total: R$ 4.200,00 (350 × 12)

Sistema de Coins:
├─ Coins Base: 1200
├─ Bônus Extra: 100
├─ Total de Coins: 1300 coins
└─ Custo por Coin: R$ 3,23

Peças por Assinatura:
├─ Quantidade: 12 peças
└─ Coins por Peça: 108 coins/peça

Status: ✅ Ativo
```

---

## 🚀 Como Usar

### 1. Aplicar Migration

```powershell
.\aplicar-migration-planos-estendidos.ps1
```

Ou manualmente:
```powershell
supabase db push
```

### 2. Regenerar Tipos TypeScript

```powershell
npm run generate-types
```

### 3. Acessar a Página

Navegue para: `http://localhost:5173/admin/creditos/planos`

### 4. Configurar Planos

Para cada plano:

1. **Defina o Preço Mensal**
   - Digite o valor em reais
   - O valor total será calculado automaticamente

2. **Configure os Coins**
   - Defina quantos coins base o plano oferece
   - Adicione bônus extra se desejar
   - Veja o custo por coin calculado automaticamente

3. **Defina Peças Incluídas**
   - Informe quantas peças o plano inclui
   - Veja quantos coins cada peça custará

4. **Ative o Plano**
   - Use o switch para ativar/desativar
   - Apenas planos ativos aparecem para usuários

5. **Salve as Configurações**
   - Clique em "Salvar Configurações"

---

## 📈 Dashboard de Resumo

No topo da página, você verá:

### Planos Ativos
Quantidade de planos atualmente ativos

### Receita Mensal Potencial
Soma dos valores mensais de todos os planos ativos

### Total de Coins
Soma de todos os coins alocados por ciclo

---

## 🎨 Interface

### Card de Configuração

Cada plano tem seu próprio card com:

```
┌─────────────────────────────────────────┐
│ 📅 Plano Trimestral          [✓] Ativo │
│ 3 meses de assinatura                   │
├─────────────────────────────────────────┤
│                                         │
│ 💰 Valores Monetários                   │
│ ├─ Preço Mensal: R$ 450,00             │
│ └─ Valor Total: R$ 1.350,00            │
│                                         │
│ 🪙 Sistema de Coins                     │
│ ├─ Coins Base: 300                     │
│ ├─ Bônus Extra: 50                     │
│ ├─ Total: 350 coins                    │
│ └─ Custo/Coin: R$ 3,86                 │
│                                         │
│ 📦 Peças por Assinatura                │
│ ├─ Quantidade: 3 peças                 │
│ └─ Coins/Peça: 117 coins               │
│                                         │
│ 📊 Resumo do Plano                      │
│ ├─ Investimento: R$ 1.350,00           │
│ ├─ Coins recebidos: 350 coins          │
│ ├─ Valor por coin: R$ 3,86             │
│ ├─ Peças incluídas: 3 peças            │
│ └─ Bônus extra: +50 coins              │
│                                         │
│         [Cancelar] [Salvar]            │
└─────────────────────────────────────────┘
```

---

## 🔄 Cálculos Automáticos

A página calcula automaticamente:

### Valor Total
```
Valor Total = Preço Mensal × Duração em Meses
```

### Total de Coins
```
Total de Coins = Coins Base + Bônus Extra
```

### Custo por Coin
```
Custo por Coin = Valor Total ÷ Total de Coins
```

### Coins por Peça
```
Coins por Peça = Total de Coins ÷ Quantidade de Peças
```

---

## 💡 Dicas de Uso

### Estratégia de Preços

1. **Planos Longos = Melhor Custo/Coin**
   - Anual: R$ 3,23/coin
   - Semestral: R$ 3,69/coin
   - Trimestral: R$ 3,86/coin

2. **Use Bônus para Incentivar**
   - Adicione bônus extra em planos longos
   - Exemplo: Anual com +100 coins de bônus

3. **Peças Incluídas**
   - Defina quantas peças cada plano oferece
   - Ajuda usuários a entenderem o valor

### Compra Avulsa

- Configure entrada mínima (ex: R$ 100)
- Não tem duração (0 meses)
- Pode ter coins base para conversão

---

## 🗄️ Estrutura de Dados

### Tabela: subscription_credit_plans

```sql
- id (UUID)
- plan_type (avulso|bimestral|trimestral|semestral|anual)
- name (TEXT)
- duration_months (INTEGER)
- price (DECIMAL) -- Preço mensal
- base_credits (INTEGER)
- bonus_credits (INTEGER)
- deposit_amount (DECIMAL) -- Entrada mínima
- pieces_per_subscription (INTEGER)
- is_active (BOOLEAN)
```

### View: subscription_credit_plans_with_calculations

Adiciona campos calculados:
- `total_credits` - base + bônus
- `total_price` - preço × meses
- `coin_unit_cost` - preço total ÷ coins
- `coins_per_piece` - coins ÷ peças

---

## 🔐 Segurança

- ✅ Apenas admins podem acessar
- ✅ Validações de valores positivos
- ✅ Constraints no banco de dados
- ✅ RLS policies aplicadas

---

## 🐛 Troubleshooting

### Erro: "plan_type_check constraint"

**Causa:** Migration não foi aplicada

**Solução:**
```powershell
.\aplicar-migration-planos-estendidos.ps1
```

### Erro: "Column does not exist"

**Causa:** Tipos TypeScript desatualizados

**Solução:**
```powershell
npm run generate-types
```

### Plano não aparece na lista

**Causa:** Plano está inativo

**Solução:** Ative o plano usando o switch

---

## 📝 Changelog

### v1.0.0 (2026-05-10)

- ✅ Suporte para 5 tipos de planos
- ✅ Configuração de coins base e bônus
- ✅ Cálculo automático de valores
- ✅ Sistema de peças por assinatura
- ✅ Ativação/desativação de planos
- ✅ Dashboard de resumo
- ✅ Interface intuitiva com cards

---

## 🎯 Próximos Passos

1. Aplicar migration
2. Configurar valores dos planos
3. Ativar planos desejados
4. Testar fluxo de assinatura
5. Ajustar valores conforme necessário

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique este README
2. Consulte logs do console
3. Verifique Supabase Dashboard

---

**Desenvolvido com ❤️ para ORDAX**
