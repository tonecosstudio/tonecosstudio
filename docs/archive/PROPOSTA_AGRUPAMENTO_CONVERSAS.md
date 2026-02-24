# 📋 Proposta: Agrupamento de Conversas por Usuário

## 🎯 Objetivo

Melhorar a organização do chat admin para agrupar conversas por usuário, permitindo que o admin:
1. Veja lista de usuários com conversas ativas
2. Clique no usuário para ver todas as suas solicitações
3. Selecione qual solicitação específica quer atender

## 📊 Estrutura Atual vs Proposta

### Atual
```
┌─────────────────────────┐
│ Conversas               │
├─────────────────────────┤
│ João Silva              │ ← Conversa 1
│ Pagamento - Orçamento   │
├─────────────────────────┤
│ Maria Santos            │ ← Conversa 2
│ Dúvida sobre entrega    │
├─────────────────────────┤
│ João Silva              │ ← Conversa 3 (mesmo usuário!)
│ Problema com pedido     │
└─────────────────────────┘
```

### Proposta
```
┌─────────────────────────┐
│ Clientes                │
├─────────────────────────┤
│ 👤 João Silva       [2] │ ← Agrupado
│    2 conversas ativas   │
├─────────────────────────┤
│ 👤 Maria Santos     [1] │
│    1 conversa ativa     │
└─────────────────────────┘

Ao clicar em João Silva:
┌─────────────────────────┐
│ ← Voltar | João Silva   │
├─────────────────────────┤
│ 💬 Pagamento - Orçamento│
│    há 2 horas           │
├─────────────────────────┤
│ 💬 Problema com pedido  │
│    há 5 minutos         │
└─────────────────────────┘
```

## 🔧 Implementação

### 1. Novo Componente: CustomerGroupedList

```typescript
interface CustomerGroup {
  user_id: string;
  user_name: string;
  user_email: string;
  conversations: Conversation[];
  total_unread: number;
  last_activity: string;
  has_urgent: boolean;
}
```

### 2. Fluxo de Navegação

1. **Nível 1 - Lista de Clientes**
   - Mostra clientes agrupados
   - Badge com número de conversas
   - Badge com total de não lidas
   - Indicador de urgência

2. **Nível 2 - Conversas do Cliente**
   - Botão "Voltar" para lista de clientes
   - Header com nome do cliente
   - Lista de conversas daquele cliente
   - Informações do cliente na sidebar

3. **Nível 3 - Chat da Conversa**
   - Mensagens da conversa selecionada
   - Sidebar com detalhes do cliente e conversa

### 3. Vantagens

✅ **Organização**: Fácil ver quantos clientes precisam de atenção
✅ **Contexto**: Ver todas as solicitações de um cliente de uma vez
✅ **Priorização**: Identificar clientes com múltiplas solicitações
✅ **Eficiência**: Atender todas as dúvidas de um cliente de uma vez
✅ **Histórico**: Entender o contexto completo do cliente

### 4. Funcionalidades Adicionais

- **Busca por cliente**: Filtrar por nome ou email
- **Ordenação**:
  - Por última atividade
  - Por número de conversas
  - Por urgência
- **Filtros**:
  - Clientes com conversas não lidas
  - Clientes com conversas urgentes
  - Clientes com pagamentos pendentes
- **Badges**:
  - 🔴 Urgente
  - 💰 Pagamento pendente
  - ⚠️ Risco
  - 🕐 Atrasado

## 📐 Estrutura de Componentes

```
AdminSupportV2.tsx
├── CustomerGroupedList (NOVO)
│   ├── CustomerGroupCard
│   │   ├── Avatar
│   │   ├── Nome + Email
│   │   ├── Badges (conversas, não lidas, urgente)
│   │   └── Última atividade
│   └── CustomerConversationsList (quando cliente selecionado)
│       ├── Header com "Voltar"
│       ├── ConversationCard (lista de conversas)
│       └── Botão "Nova conversa"
├── ChatInterface (existente)
└── CustomerSidebar (existente)
```

## 🎨 Mockup Visual

### Vista de Clientes
```
┌─────────────────────────────────────┐
│ 🔍 Buscar cliente...                │
│ 📊 Ordenar: Última atividade ▼     │
├─────────────────────────────────────┤
│ 👤 João Silva                   [2] │
│    joao@email.com                   │
│    🔴 Urgente  💰 Pagamento         │
│    há 5 minutos                     │
├─────────────────────────────────────┤
│ 👤 Maria Santos                 [1] │
│    maria@email.com                  │
│    há 2 horas                       │
├─────────────────────────────────────┤
│ 👤 Pedro Costa                  [3] │
│    pedro@email.com                  │
│    ⚠️ Risco  🕐 Atrasado           │
│    há 1 dia                         │
└─────────────────────────────────────┘
```

### Vista de Conversas do Cliente
```
┌─────────────────────────────────────┐
│ ← Voltar | 👤 João Silva            │
│    joao@email.com                   │
├─────────────────────────────────────┤
│ 💬 Pagamento - Orçamento #abc123    │
│    🔴 Urgente  💰 Pendente          │
│    há 5 minutos • 2 não lidas       │
├─────────────────────────────────────┤
│ 💬 Dúvida sobre entrega #def456     │
│    ✅ Resolvida                     │
│    há 2 horas                       │
├─────────────────────────────────────┤
│ + Nova conversa com este cliente    │
└─────────────────────────────────────┘
```

## 🚀 Implementação Sugerida

### Fase 1: Estrutura Básica (2-3 horas)
- [ ] Criar componente CustomerGroupedList
- [ ] Agrupar conversas por user_id
- [ ] Implementar navegação entre níveis
- [ ] Adicionar botão "Voltar"

### Fase 2: Melhorias Visuais (1-2 horas)
- [ ] Adicionar avatares
- [ ] Melhorar badges e indicadores
- [ ] Adicionar animações de transição
- [ ] Responsividade mobile

### Fase 3: Funcionalidades Extras (2-3 horas)
- [ ] Busca por cliente
- [ ] Filtros e ordenação
- [ ] Botão "Nova conversa"
- [ ] Estatísticas do cliente

## 💡 Alternativa Simples

Se quiser algo mais rápido, podemos apenas:
1. Adicionar um toggle "Agrupar por cliente"
2. Quando ativado, mostra lista agrupada
3. Quando desativado, mostra lista atual (flat)

Isso permite testar a funcionalidade sem refatorar tudo.

## 🤔 Decisão

Qual abordagem você prefere?

**A) Implementação completa** (6-8 horas)
- Navegação em níveis
- Todas as funcionalidades
- Interface polida

**B) Implementação simples** (2-3 horas)
- Toggle para agrupar/desagrupar
- Funcionalidade básica
- Pode evoluir depois

**C) Híbrida** (3-4 horas)
- Agrupamento básico
- Navegação simples
- Sem funcionalidades extras

Qual você prefere que eu implemente?
