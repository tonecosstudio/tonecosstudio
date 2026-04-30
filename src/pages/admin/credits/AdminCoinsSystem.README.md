# Página Admin - Sistema de Coins

## 📍 Localização
- **Rota**: `/admin/coins`
- **Arquivo**: `src/pages/admin/AdminCoinsSystem.tsx`
- **Menu**: Admin → Sistema de Créditos → Sistema de Coins

## 🎯 Objetivo

Página administrativa completa para gerenciar e visualizar o sistema de coins (créditos internos) da plataforma Ordax.

## 📊 Funcionalidades

### 1. Visão Geral
- **O que são Coins**: Explicação completa do sistema de créditos
- **Estatísticas em Tempo Real**:
  - Coins em circulação (saldo total)
  - Total distribuído (coins adicionados)
  - Total gasto (coins utilizados)
  - Usuários ativos com saldo
- **Métricas**:
  - Taxa de utilização (% de coins gastos)
  - Média de coins por usuário
  - Total de compras realizadas

### 2. Regras e Preços
Tabela completa com os valores de personagens por tipo:

| Tipo | Coins | Descrição |
|------|-------|-----------|
| **Coleção Ativa** | 200 | Coleção escolhida pelo assinante (Naruto, Dragon Ball, Marvel) |
| **Coleção Secundária** | 240 | Personagens de outras coleções disponíveis |
| **Catálogo Geral** | 300 | Modelos especiais ou menos produzidos |
| **Premium** | 450 | Peças maiores ou mais complexas |

### 3. Pacotes de Coins
Visualização dos pacotes disponíveis para venda:
- Nome do pacote
- Quantidade de coins
- Bônus incluído
- Total de coins
- Preço em R$
- Status (ativo/inativo)

### 4. Transações Recentes
Histórico das últimas 10 transações:
- Data e hora
- Tipo de transação (purchase, spend, refund, bonus, etc.)
- ID do usuário
- Quantidade de coins
- Descrição

## 🎨 Design

### Cards de Estatísticas
- **Coins em Circulação**: Amarelo (🟡)
- **Total Distribuído**: Verde (🟢)
- **Total Gasto**: Azul (🔵)
- **Usuários Ativos**: Roxo (🟣)

### Cards de Preços
Cada tipo de personagem tem um card colorido:
- **Coleção Ativa**: Amarelo claro
- **Coleção Secundária**: Azul claro
- **Catálogo Geral**: Roxo claro
- **Premium**: Laranja claro

## 🔗 Integração com Backend

### Queries Utilizadas

```typescript
// Estatísticas de coins
const { data: userCoins } = await supabase
  .from("user_coins")
  .select("balance, total_earned, total_spent");

// Transações recentes
const { data: transactions } = await supabase
  .from("coin_transactions")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(10);

// Pacotes de coins
const { data: packages } = await supabase
  .from("coin_packages")
  .select("*")
  .eq("is_active", true)
  .order("coins_amount", { ascending: true });

// Personagens adquiridos com coins
const { data: purchases } = await supabase
  .from("user_characters")
  .select("*")
  .eq("acquisition_type", "coins");
```

## 📋 Regras de Negócio

### O que são Coins?
Coins são créditos internos da plataforma Ordax que servem exclusivamente para:
- ✓ Selecionar personagens do catálogo
- ✓ Trocar personagens já selecionados
- ✓ Acessar personagens de outras coleções
- ✓ Acessar o catálogo premium

### Importante
⚠️ Coins **NÃO SÃO**:
- Moeda
- Dinheiro
- Conversíveis em dinheiro

Eles representam créditos de seleção dentro do catálogo de colecionáveis sob encomenda.

## 🚀 Como Usar

### Para Administradores

1. **Visualizar Estatísticas**
   - Acesse `/admin/coins`
   - Veja os cards de estatísticas no topo
   - Analise a taxa de utilização e média por usuário

2. **Consultar Regras de Preços**
   - Clique na aba "Regras e Preços"
   - Veja os valores de cada tipo de personagem
   - Leia as explicações detalhadas

3. **Gerenciar Pacotes**
   - Clique na aba "Pacotes"
   - Veja todos os pacotes disponíveis
   - Identifique pacotes ativos/inativos

4. **Auditar Transações**
   - Clique na aba "Transações"
   - Veja as últimas 10 transações
   - Identifique tipos e valores

## 🔄 Atualizações Futuras

Funcionalidades planejadas:
- [ ] Filtros avançados de transações
- [ ] Exportação de relatórios
- [ ] Gráficos de evolução temporal
- [ ] Edição de pacotes de coins
- [ ] Ajuste manual de saldo de usuários
- [ ] Notificações de transações suspeitas

## 📚 Documentação Relacionada

- `COIN_SYSTEM_COMPLETE.md` - Documentação completa do sistema
- `COIN_SYSTEM_SETUP.md` - Guia de instalação
- `COIN_SYSTEM_EXAMPLES.sql` - Exemplos de queries SQL
- `supabase/migrations/20260512000000_create_coin_system.sql` - Tabelas
- `supabase/migrations/20260512000001_create_coin_functions.sql` - Funções

## 🎯 Métricas de Sucesso

- Taxa de utilização de coins > 60%
- Média de coins por usuário > 500
- Tempo de resposta da página < 2s
- Zero erros de carregamento de dados
