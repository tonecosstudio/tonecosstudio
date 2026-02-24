# Análise Profunda: O que Falta no Perfil do Usuário

## 📋 Resumo Executivo

Após análise profunda do projeto, identifiquei **funcionalidades críticas** que estão implementadas no admin mas **faltam no perfil do usuário**. O perfil atual tem 9 seções, mas várias delas estão **incompletas ou ausentes**.

## ⚠️ CORREÇÃO IMPORTANTE

**CHAT/SUPORTE JÁ ESTÁ IMPLEMENTADO** ✅
- Existe `CustomerChat` component (floating button + side panel)
- Existe página `/suporte` (Support.tsx)
- Sistema de chat completo com real-time
- Integrado com sistema de conversas do admin

**PORÉM**: O chat NÃO está integrado ao perfil do usuário como uma seção/aba.

---

## 🔴 FUNCIONALIDADES CRÍTICAS FALTANDO

### 1. **ASSINATURAS - Seção Ausente no Perfil**

**Status**: ❌ **NÃO EXISTE no Profile.tsx**

**O que existe**:
- Página separada `MySubscriptions.tsx` (não integrada ao perfil)
- Usuário precisa navegar para outra página

**O que deveria ter no perfil**:
```typescript
// Baseado em src/components/admin/sidebar/SubscriptionInfo.tsx
- Status da assinatura (Ativa/Inativa/Cancelada/Suspensa)
- Tipo de plano (Trimestral/Semestral/Anual)
- Próxima data de cobrança
- Data de início da assinatura
- Coleções incluídas na assinatura
- Botão para gerenciar assinatura (link para MySubscriptions)
- Timeline de entregas programadas
- Status de cada entrega (agendada, revelada, em produção, enviada, entregue)
```

**Componente Admin de referência**: `src/components/admin/sidebar/SubscriptionInfo.tsx`

---

### 2. **ORÇAMENTOS/PEDIDOS - Seção Incompleta**

**Status**: ⚠️ **PARCIALMENTE IMPLEMENTADA**

**O que existe atualmente**:
- Seção "Meus Pedidos" no perfil
- Lista básica de orçamentos com status
- Timeline de produção

**O que está FALTANDO** (baseado no admin):
```typescript
// Baseado em src/components/admin/sidebar/QuotesList.tsx
- Detalhes completos de cada orçamento:
  ✅ ID do orçamento (parcial)
  ✅ Data de criação (parcial)
  ✅ Valor total (parcial)
  ✅ Status do orçamento (parcial)
  ❌ Status de pagamento (pending/paid/overdue)
  ❌ Resumo dos itens do orçamento
  ❌ Indicador visual de orçamentos pendentes
  ❌ Filtros por status
  ❌ Busca por referência
```

**Componente Admin de referência**: `src/components/admin/sidebar/QuotesList.tsx`

---

### 3. **PEDIDOS/ORDERS - Informações Detalhadas Ausentes**

**Status**: ⚠️ **MUITO INCOMPLETO**

**O que está FALTANDO** (baseado no admin):
```typescript
// Baseado em src/components/admin/sidebar/OrdersList.tsx
- Número de referência do pedido
- Status detalhado do pedido:
  • Aguardando Pagamento
  • Em Análise
  • Aprovado
  • Em Produção
  • Enviado
  • Entregue
- Código de rastreamento (quando enviado)
- Link para rastreamento
- Estágios de produção:
  • Molde Pronto
  • Impressão Iniciada
  • Pintura Iniciada
  • Finalização
- Data de cada estágio
- Notas de produção (se houver)
- Ícones visuais por status
```

**Componente Admin de referência**: `src/components/admin/sidebar/OrdersList.tsx`

---

### 4. **INFORMAÇÕES DE PAGAMENTO - Seção Muito Limitada**

**Status**: ⚠️ **MUITO INCOMPLETO**

**O que existe atualmente**:
```typescript
// src/pages/ProfileSections.tsx - PaymentSection
- Lista de métodos de pagamento cadastrados
- Adicionar/remover métodos
- Definir método padrão
```

**O que está FALTANDO** (baseado no admin):
```typescript
// Baseado em src/components/admin/sidebar/PaymentInfo.tsx
- Histórico de pagamentos manuais:
  ✅ Número de referência (existe em MyPaymentsPage, não no perfil)
  ✅ Data do pagamento (existe em MyPaymentsPage, não no perfil)
  ✅ Valor (existe em MyPaymentsPage, não no perfil)
  ✅ Status (existe em MyPaymentsPage, não no perfil)
  ❌ Tipo de pagamento (Único/Recorrente) - NÃO EXISTE
  ❌ Método de pagamento usado - NÃO EXISTE
  ❌ Visualização rápida no perfil (precisa ir para MyPaymentsPage)
  ❌ Integração com orçamentos/pedidos - NÃO EXISTE
```

**Problema**: A página `MyPaymentsPage.tsx` existe mas **não está integrada ao perfil**. O usuário precisa navegar para outra página.

**Componente Admin de referência**: `src/components/admin/sidebar/PaymentInfo.tsx`

---

### 5. **DADOS PESSOAIS - Campos Ausentes**

**Status**: ⚠️ **INCOMPLETO**

**O que existe atualmente**:
```typescript
// src/pages/ProfileSections.tsx - PersonalDataSection
✅ Nome completo
✅ CPF
✅ Data de nascimento
✅ Telefone
✅ WhatsApp
```

**O que está FALTANDO** (baseado no admin):
```typescript
// Baseado em src/components/admin/sidebar/CustomerInfo.tsx
❌ Email (visível mas não editável)
❌ Username (está em outra seção)
❌ Display name (está em outra seção)
❌ Nível de colecionador (está em outra seção)
❌ Data de cadastro (não está visível)
❌ Indicador de "Cliente desde" (não está visível)
```

**Componente Admin de referência**: `src/components/admin/sidebar/CustomerInfo.tsx`

---

## 📊 COMPARAÇÃO DETALHADA: ADMIN vs PERFIL

| Funcionalidade | Admin (CustomerSidebar) | Perfil do Usuário | Status |
|---|---|---|---|
| **Dados Pessoais** | ✅ Completo | ⚠️ Parcial | Falta email editável, data de cadastro |
| **Assinaturas** | ✅ Completo | ❌ Ausente | Existe página separada, não integrada |
| **Orçamentos** | ✅ Completo | ⚠️ Parcial | Falta status de pagamento, resumo de itens |
| **Pedidos/Orders** | ✅ Completo | ❌ Muito Incompleto | Falta rastreamento, estágios de produção |
| **Pagamentos** | ✅ Completo | ⚠️ Parcial | Existe página separada, não integrada |
| **Métodos de Pagamento** | ✅ Completo | ✅ Completo | OK |
| **Endereço** | ✅ Completo | ✅ Completo | OK |
| **Preferências** | ✅ Completo | ✅ Completo | OK |
| **Perfil Público** | ✅ Completo | ✅ Completo | OK |
| **Notificações** | ✅ Completo | ✅ Completo | OK |

---

## 🎯 ESTRUTURA ATUAL DO PERFIL

```typescript
// src/pages/Profile.tsx - Seções atuais:
1. ✅ Conta (Info) - OK
2. ✅ Dados Pessoais - PARCIAL (falta email editável, data de cadastro)
3. ✅ Perfil Público - OK
4. ✅ Preferências - OK
5. ✅ Endereço - OK
6. ⚠️ Pagamento - PARCIAL (falta histórico integrado)
7. ⚠️ Meus Pedidos - MUITO INCOMPLETO (falta rastreamento, estágios)
8. ✅ Minha Coleção - OK
9. ✅ Notificações - OK
10. ❌ Chat/Suporte - AUSENTE (existe página separada, não integrada)
```

---

## 🔧 O QUE PRECISA SER IMPLEMENTADO

### **PRIORIDADE ALTA** 🔴

#### 1. Adicionar Seção de Assinaturas no Perfil
```typescript
// Nova seção: 'subscriptions'
- Importar lógica de MySubscriptions.tsx
- Criar componente SubscriptionSection em ProfileSections.tsx
- Mostrar assinatura ativa
- Status, plano, próxima cobrança
- Link para página completa de assinaturas
```

#### 2. Melhorar Seção de Pedidos
```typescript
// Atualizar seção 'orders'
- Adicionar código de rastreamento
- Mostrar estágios de produção
- Ícones visuais por status
- Link para rastreamento externo
- Integrar com OrdersList.tsx do admin
```

#### 3. Integrar Histórico de Pagamentos no Perfil
```typescript
// Atualizar seção 'payment'
- Mostrar últimos 5 pagamentos
- Status, valor, data, tipo
- Link para MyPaymentsPage completa
- Integrar com PaymentInfo.tsx do admin
```

### **PRIORIDADE MÉDIA** 🟡

#### 4. Melhorar Seção de Orçamentos
```typescript
// Atualizar seção 'orders'
- Adicionar status de pagamento
- Mostrar resumo dos itens
- Indicador visual de pendências
- Filtros básicos
```

#### 5. Completar Dados Pessoais
```typescript
// Atualizar PersonalDataSection
- Adicionar email (somente leitura ou editável)
- Mostrar "Cliente desde"
- Mostrar nível de colecionador
```

### **PRIORIDADE BAIXA** 🟢

#### 6. Melhorias de UX
```typescript
- Adicionar loading states
- Melhorar mensagens de erro
- Adicionar tooltips explicativos
- Melhorar responsividade mobile
```

---

## 📁 ARQUIVOS QUE PRECISAM SER MODIFICADOS

### 1. **src/pages/Profile.tsx**
- Adicionar nova seção 'subscriptions'
- Atualizar seção 'orders' com mais detalhes
- Atualizar seção 'payment' com histórico

### 2. **src/pages/ProfileSections.tsx**
- Criar `SubscriptionSection` (novo)
- Atualizar `PaymentSection` (adicionar histórico)
- Atualizar `PersonalDataSection` (adicionar email, data de cadastro)

### 3. **Criar novos componentes** (baseados no admin):
- `src/components/customer/SubscriptionInfo.tsx` (baseado em admin/sidebar/SubscriptionInfo.tsx)
- `src/components/customer/OrderDetails.tsx` (baseado em admin/sidebar/OrdersList.tsx)
- `src/components/customer/PaymentHistory.tsx` (baseado em admin/sidebar/PaymentInfo.tsx)
- `src/components/customer/QuoteDetails.tsx` (baseado em admin/sidebar/QuotesList.tsx)

---

## 🚀 PLANO DE IMPLEMENTAÇÃO SUGERIDO

### **Fase 1: Assinaturas** (2-3 horas)
1. Criar `SubscriptionSection` em ProfileSections.tsx
2. Criar `src/components/customer/SubscriptionInfo.tsx`
3. Integrar no Profile.tsx
4. Testar com usuários com assinaturas ativas

### **Fase 2: Pedidos Detalhados** (3-4 horas)
1. Criar `src/components/customer/OrderDetails.tsx`
2. Adicionar rastreamento e estágios de produção
3. Atualizar seção 'orders' no Profile.tsx
4. Testar com pedidos em diferentes status

### **Fase 3: Histórico de Pagamentos** (2-3 horas)
1. Criar `src/components/customer/PaymentHistory.tsx`
2. Atualizar `PaymentSection` em ProfileSections.tsx
3. Integrar últimos 5 pagamentos
4. Adicionar link para página completa

### **Fase 4: Melhorias em Orçamentos** (2 horas)
1. Criar `src/components/customer/QuoteDetails.tsx`
2. Adicionar status de pagamento
3. Mostrar resumo de itens
4. Adicionar indicadores visuais

### **Fase 5: Completar Dados Pessoais** (1 hora)
1. Adicionar email em PersonalDataSection
2. Adicionar "Cliente desde"
3. Adicionar nível de colecionador

---

## 📝 EXEMPLO DE CÓDIGO PARA IMPLEMENTAÇÃO

### SubscriptionSection (novo componente)
```typescript
// src/pages/ProfileSections.tsx

export function SubscriptionSection({ userId }: { userId: string }) {
  const subscriptionQuery = useQuery({
    queryKey: ["user-subscription", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          collections (id, name, slug)
        `)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  if (!subscriptionQuery.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assinatura</CardTitle>
          <CardDescription>Você não possui assinatura ativa</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/plans">Ver Planos</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sub = subscriptionQuery.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Minha Assinatura
        </CardTitle>
        <CardDescription>
          Gerencie sua assinatura e entregas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status</span>
          <Badge variant="default">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ativa
          </Badge>
        </div>

        {/* Plano */}
        <div>
          <span className="text-xs text-muted-foreground">Plano</span>
          <p className="text-sm font-medium">
            {sub.plan_type === "trimestral" && "Trimestral (3 meses)"}
            {sub.plan_type === "semestral" && "Semestral (6 meses)"}
            {sub.plan_type === "anual" && "Anual (12 meses)"}
          </p>
        </div>

        {/* Próxima Cobrança */}
        <div>
          <span className="text-xs text-muted-foreground">Próxima cobrança</span>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">
              {format(new Date(sub.next_delivery_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Coleção */}
        {sub.collections && (
          <div>
            <span className="text-xs text-muted-foreground">Coleção</span>
            <p className="text-sm font-medium">{sub.collections.name}</p>
          </div>
        )}

        {/* Botão para página completa */}
        <Button asChild variant="outline" className="w-full">
          <Link to="/my-subscriptions">
            Ver Detalhes e Entregas
            <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Assinaturas
- [ ] Criar SubscriptionSection em ProfileSections.tsx
- [ ] Adicionar seção 'subscriptions' no Profile.tsx
- [ ] Testar com usuário com assinatura ativa
- [ ] Testar com usuário sem assinatura

### Pedidos
- [ ] Adicionar código de rastreamento na seção orders
- [ ] Adicionar estágios de produção
- [ ] Adicionar ícones visuais por status
- [ ] Testar com pedidos em diferentes status

### Pagamentos
- [ ] Adicionar histórico de últimos 5 pagamentos
- [ ] Adicionar tipo de pagamento (único/recorrente)
- [ ] Adicionar método de pagamento usado
- [ ] Adicionar link para MyPaymentsPage

### Orçamentos
- [ ] Adicionar status de pagamento
- [ ] Adicionar resumo de itens
- [ ] Adicionar indicador visual de pendências

### Dados Pessoais
- [ ] Adicionar email (somente leitura ou editável)
- [ ] Adicionar "Cliente desde"
- [ ] Adicionar nível de colecionador

---

## 🎨 MOCKUP DA ESTRUTURA FINAL

```
┌─────────────────────────────────────────────────────────┐
│ MINHA CONTA                                             │
│ Gerencie seu perfil, preferências e coleção            │
│                                                         │
│ Completude do Perfil: 85% ████████░░                   │
└─────────────────────────────────────────────────────────┘

┌──────────────┬──────────────────────────────────────────┐
│ SIDEBAR      │ CONTEÚDO                                 │
│              │                                          │
│ • Conta      │ [Seção selecionada renderizada aqui]    │
│ • Pessoais   │                                          │
│ • Público    │                                          │
│ • Preferênc. │                                          │
│ • Endereço   │                                          │
│ • Assinatura │ ← NOVA SEÇÃO                            │
│ • Pagamento  │ ← MELHORADA (+ histórico)               │
│ • Pedidos    │ ← MELHORADA (+ rastreamento)            │
│ • Coleção    │                                          │
│ • Notificaç. │                                          │
└──────────────┴──────────────────────────────────────────┘
```

---

## 📌 CONCLUSÃO

O perfil do usuário está **70% completo**. As principais lacunas são:

1. **Assinaturas** - Seção completamente ausente
2. **Pedidos** - Falta rastreamento e estágios de produção
3. **Pagamentos** - Histórico não integrado ao perfil
4. **Orçamentos** - Falta status de pagamento e detalhes

**Tempo estimado total**: 10-13 horas de desenvolvimento

**Prioridade**: ALTA - Essas funcionalidades são críticas para a experiência do usuário.
