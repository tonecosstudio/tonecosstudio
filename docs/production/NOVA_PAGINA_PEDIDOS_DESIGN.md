# Design da Nova Página de Pedidos

**Data**: 2026-03-08  
**Status**: Planejamento  
**Objetivo**: Criar página profissional que mostre TODOS os tipos de pedidos

## Visão Geral

Criar uma página de pedidos moderna, profissional e eficiente que:
- ✅ Mostre TODOS os tipos: assinaturas, avulsos, pagamentos manuais, orçamentos
- ✅ Tenha performance otimizada
- ✅ Seja fácil de usar e manter
- ✅ Siga melhores práticas de React e TypeScript

## Arquitetura

### Estrutura de Componentes

```
src/pages/admin/
  └── OrdersPageV2.tsx (nova página principal)

src/components/admin/orders-v2/
  ├── OrdersHeader.tsx          # Cabeçalho com título e stats
  ├── OrdersFilters.tsx         # Filtros (tipo, status, data)
  ├── OrdersSearch.tsx          # Busca
  ├── OrdersTable.tsx           # Tabela principal
  ├── OrderRow.tsx              # Linha da tabela
  ├── OrderDetailPanel.tsx      # Painel lateral de detalhes
  ├── OrderActions.tsx          # Ações em massa
  └── OrdersPagination.tsx      # Paginação

src/hooks/admin/orders-v2/
  ├── useOrdersData.ts          # Hook principal de dados
  ├── useOrdersFilters.ts       # Gerenciamento de filtros
  └── useOrdersActions.ts       # Ações (atualizar, exportar, etc)

src/services/admin/
  └── orders-service-v2.ts      # Serviço otimizado
```


## Princípios de Design

### 1. Simplicidade
- Interface limpa e intuitiva
- Informações essenciais visíveis
- Detalhes acessíveis sob demanda

### 2. Performance
- Queries otimizadas
- Paginação eficiente
- Prefetch inteligente
- Cache apropriado

### 3. Manutenibilidade
- Código limpo e documentado
- Componentes pequenos e focados
- Tipagem completa
- Testes unitários

### 4. Profissionalismo
- Design moderno
- Feedback visual claro
- Tratamento de erros robusto
- Acessibilidade

## Layout da Página

### Header
```
┌─────────────────────────────────────────────────────────┐
│ Pedidos                                    📊 1,234 total│
│ Gerencie todos os pedidos do sistema                    │
└─────────────────────────────────────────────────────────┘
```

### Filtros
```
┌─────────────────────────────────────────────────────────┐
│ Tipo: [Todos ▼] Status: [Todos ▼] Data: [Últimos 30d ▼]│
│ 🔍 Buscar por cliente, email, código...                 │
└─────────────────────────────────────────────────────────┘
```

### Tabela
```
┌─────────────────────────────────────────────────────────┐
│ ☐ | Tipo | Cliente | Coleção | Status | Valor | Data   │
├─────────────────────────────────────────────────────────┤
│ ☐ | 📦   | João    | Marvel  | Enviado| R$150 | 08/03  │
│ ☐ | 🛒   | Maria   | DC      | Pago   | R$200 | 07/03  │
│ ☐ | 💰   | Pedro   | -       | Análise| R$100 | 06/03  │
└─────────────────────────────────────────────────────────┘
```

### Ações em Massa
```
┌─────────────────────────────────────────────────────────┐
│ 3 selecionados | [Atualizar Status] [Exportar] [Limpar]│
└─────────────────────────────────────────────────────────┘
```

## Tipos de Pedidos

### 1. Assinaturas (📦 subscription_delivery)
- Entregas mensais de assinatura
- Mostra: número da entrega, personagem, data de revelação
- Status: scheduled, pending_choice, confirmed, in_production, shipped, delivered, revealed

### 2. Avulsos (🛒 standalone_purchase)
- Compras únicas de personagens
- Mostra: personagem, valores (depósito/saldo), datas de pagamento
- Status: awaiting_deposit, deposit_paid, awaiting_balance, balance_paid, in_production, shipped, delivered

### 3. Pagamentos Manuais (💰 manual_payment)
- Pagamentos via PIX, transferência, etc
- Mostra: método de pagamento, valor, comprovante
- Status: pending, under_review, requires_info, approved, rejected

### 4. Orçamentos (📋 quote)
- Solicitações de orçamento
- Mostra: itens solicitados, prazo, notas
- Status: pending, reviewing, answered, archived

## Funcionalidades

### Filtros
- ✅ Por tipo (todos, assinaturas, avulsos, pagamentos, orçamentos)
- ✅ Por status (múltipla seleção)
- ✅ Por data (range picker)
- ✅ Busca full-text (cliente, email, código)

### Visualização
- ✅ Tabela responsiva
- ✅ Ícones por tipo
- ✅ Badges de status coloridos
- ✅ Formatação de valores
- ✅ Datas relativas (hoje, ontem, 3 dias atrás)

### Ações
- ✅ Ver detalhes (painel lateral)
- ✅ Atualizar status (individual ou massa)
- ✅ Exportar CSV
- ✅ Gerar etiquetas (quando aplicável)

### Detalhes
- ✅ Informações completas do pedido
- ✅ Histórico de status
- ✅ Dados do cliente
- ✅ Dados de pagamento
- ✅ Dados de entrega
- ✅ Ações rápidas

## Melhorias vs Página Atual

### Problemas Corrigidos
1. ✅ Pedidos avulsos não aparecem → Todos os tipos visíveis
2. ✅ Código duplicado → Componentes reutilizáveis
3. ✅ Queries N+1 → Queries otimizadas com joins
4. ✅ Busca em memória → Full-text search no PostgreSQL
5. ✅ Tipagem fraca → TypeScript strict mode

### Novas Funcionalidades
1. ✅ Visualização unificada de todos os tipos
2. ✅ Filtros mais poderosos
3. ✅ Busca mais rápida
4. ✅ Melhor feedback visual
5. ✅ Ações em massa otimizadas

## Próximos Passos

1. ✅ Criar serviço otimizado (orders-service-v2.ts)
2. ✅ Criar hooks de dados (useOrdersData.ts)
3. ✅ Criar componentes base (Header, Filters, Table)
4. ✅ Criar página principal (OrdersPageV2.tsx)
5. ✅ Testar com dados reais
6. ✅ Migrar rota de /admin/orders para nova página
7. ✅ Remover página antiga após validação
