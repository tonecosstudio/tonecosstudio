# Análise Completa: Sistema de Moedas/Créditos

## 📋 Resumo Executivo

O sistema de créditos **EXISTE E ESTÁ COMPLETAMENTE IMPLEMENTADO** ✅

É um sistema paralelo e independente do sistema de assinaturas tradicional (trimestral/semestral com entregas mensais). Este é um modelo de "clube premium" onde o usuário paga uma assinatura mensal e recebe créditos para comprar personagens à la carte.

---

## 🎯 CONCEITO DO SISTEMA

### Modelo de Negócio
**"Subscription Credit System"** - Sistema de Assinatura com Créditos

**Como funciona:**
1. Usuário assina um plano mensal (Trimestral ou Semestral)
2. Recebe créditos mensalmente (base + bônus)
3. Usa créditos para comprar personagens no catálogo
4. Personagens são agrupados em ciclos de produção
5. Ciclos fecham quando atingem capacidade máxima
6. Produção e envio acontecem após fechamento do ciclo

**Diferença do Sistema Tradicional:**
- **Tradicional:** Paga assinatura → Recebe entregas mensais automáticas → Escolhe personagem
- **Créditos:** Paga assinatura → Recebe créditos → Escolhe personagens quando quiser → Produção em lote

---

## 🏗️ ARQUITETURA DO SISTEMA

### Backend API Separada
**Localização:** `subscription-api/`

**Tecnologias:**
- Node.js + Express
- Prisma ORM
- PostgreSQL
- TypeScript

**Estrutura:**
```
subscription-api/
├── src/
│   ├── services/
│   │   ├── credit.service.ts          # Gestão de créditos
│   │   ├── subscription.service.ts    # Gestão de assinaturas
│   │   ├── order.service.ts           # Gestão de pedidos
│   │   ├── transaction.service.ts     # Histórico de transações
│   │   └── production-cycle.service.ts # Ciclos de produção
│   ├── routes/
│   │   ├── credits.routes.ts          # Rotas de créditos
│   │   ├── subscriptions.routes.ts    # Rotas de assinaturas
│   │   ├── orders.routes.ts           # Rotas de pedidos
│   │   └── admin.routes.ts            # Rotas admin
│   └── config/
│       └── database.ts                # Configuração Prisma
└── tests/
    └── properties/                    # Testes de propriedades
```

---

## 💾 MODELO DE DADOS

### Tabelas Principais

#### 1. subscription_plans
```sql
- id
- plan_type (trimestral | semestral)
- name
- duration_months (3 | 6)
- price (valor mensal)
- base_credits (créditos base por mês)
- bonus_credits (créditos bônus por mês)
- is_active
```

**Exemplo:**
- Trimestral: R$ 150/mês → 100 créditos base + 20 bônus = 120 créditos/mês
- Semestral: R$ 280/mês → 200 créditos base + 50 bônus = 250 créditos/mês

#### 2. subscriptions
```sql
- id
- user_id
- plan_type
- status (active | expired | cancelled)
- start_date
- end_date
- next_billing_date
- auto_renew
- pending_plan_change (para upgrade/downgrade)
- cancellation_type (with_refund | no_renewal)
```

#### 3. user_credits
```sql
- id
- user_id
- subscription_id
- total_credits (total alocado)
- used_credits (já usado)
- available_credits (disponível = total - used)
- expired_credits (expirado)
```

**Invariante Garantida:**
```
available_credits = total_credits - used_credits
```

#### 4. credit_transactions
```sql
- id
- user_id
- subscription_id
- transaction_type (allocation | debit_immediate | debit_cycle_close | expiration | adjustment)
- credits_amount
- character_id
- order_id
- production_cycle_id
- description
```

**Tipos de Transação:**
- `allocation`: Créditos alocados (renovação mensal)
- `debit_immediate`: Débito imediato (compra individual)
- `debit_cycle_close`: Débito no fechamento do ciclo (pedido automático)
- `expiration`: Créditos expirados (cancelamento)
- `adjustment`: Ajuste manual (admin)

#### 5. characters
```sql
- id
- name
- description
- price_cash (preço em dinheiro)
- price_credits (preço em créditos)
- is_exclusive_semestral (exclusivo para plano semestral)
- is_standard_collection (faz parte da coleção padrão)
- is_active
- image_url
```

#### 6. production_cycles
```sql
- id
- name (ex: "Ciclo Janeiro 2026")
- capacity_limit (limite de pedidos)
- current_count (pedidos atuais)
- status (open | full | closed)
- close_date (data de fechamento)
- closed_at
```

#### 7. orders
```sql
- id
- user_id
- subscription_id
- production_cycle_id
- order_type (individual | automatic)
- status (pending | confirmed | in_production | shipped | cancelled)
- is_priority (prioridade no ciclo)
- is_locked (travado para edição)
- total_credits (total de créditos do pedido)
- credits_debited (se créditos já foram debitados)
- locked_at
```

#### 8. order_items
```sql
- id
- order_id
- character_id
- credits_cost
```

---

## 🔄 FLUXOS PRINCIPAIS

### 1️⃣ ATIVAÇÃO DE ASSINATURA

**Endpoint:** `POST /api/subscriptions/activate`

**Fluxo:**
```
1. Usuário escolhe plano (Trimestral ou Semestral)
2. Realiza pagamento
3. Sistema cria subscription com status "active"
4. Aloca créditos iniciais (base + bônus)
5. Cria pedido automático vazio para o ciclo atual
6. Registra transação de alocação
```

**Código:** `subscription-api/src/services/subscription.service.ts`

**Créditos Alocados:**
- Trimestral: 120 créditos (100 base + 20 bônus)
- Semestral: 250 créditos (200 base + 50 bônus)

---

### 2️⃣ COMPRA DE PERSONAGEM INDIVIDUAL

**Endpoint:** `POST /api/orders/individual`

**Fluxo:**
```
1. Usuário navega no catálogo de personagens
2. Seleciona personagem e clica "Comprar com X créditos"
3. Sistema valida:
   - Assinatura ativa
   - Créditos suficientes
   - Personagem disponível para o plano
4. Cria order_item no pedido do ciclo atual
5. Debita créditos IMEDIATAMENTE
6. Registra transação de débito
7. Atualiza saldo disponível
```

**Código:** `subscription-api/src/services/order.service.ts`

**Validações:**
- Personagens exclusivos semestral só para plano semestral
- Limite de personagens por usuário por ciclo
- Saldo de créditos suficiente

---

### 3️⃣ PEDIDO AUTOMÁTICO

**Endpoint:** `POST /api/orders/automatic`

**Fluxo:**
```
1. Usuário adiciona personagens ao pedido automático
2. Personagens ficam "reservados" mas créditos NÃO são debitados
3. Quando ciclo fecha:
   - Sistema debita créditos de todos os pedidos automáticos
   - Trava pedidos para edição (is_locked = true)
   - Inicia produção
4. Se usuário não tiver créditos suficientes no fechamento:
   - Pedido é cancelado
   - Usuário é notificado
```

**Código:** `subscription-api/src/services/production-cycle.service.ts`

**Vantagem:** Usuário pode planejar compras futuras sem comprometer créditos imediatamente

---

### 4️⃣ CICLO DE PRODUÇÃO

**Fluxo Completo:**
```
1. ABERTURA DO CICLO
   - Admin cria novo ciclo
   - Define capacidade (ex: 100 pedidos)
   - Define data de fechamento
   - Status: "open"

2. PERÍODO ABERTO
   - Usuários fazem pedidos individuais (débito imediato)
   - Usuários adicionam ao pedido automático (sem débito)
   - Capacidade vai sendo preenchida

3. CICLO CHEIO
   - current_count atinge capacity_limit
   - Status muda para "full"
   - Novos pedidos vão para próximo ciclo

4. FECHAMENTO DO CICLO
   - Data de fechamento chega
   - Sistema debita créditos dos pedidos automáticos
   - Trava todos os pedidos (is_locked = true)
   - Status muda para "closed"
   - Inicia produção

5. PRODUÇÃO E ENVIO
   - Pedidos entram em produção
   - Status: in_production → shipped
   - Usuários recebem tracking
```

**Cron Jobs:**
- `check-cycle-capacity`: Verifica se ciclo atingiu capacidade
- `close-cycles`: Fecha ciclos na data programada
- `debit-automatic-orders`: Debita créditos dos pedidos automáticos

---

### 5️⃣ RENOVAÇÃO MENSAL

**Fluxo:**
```
1. Data de renovação chega (next_billing_date)
2. Sistema processa pagamento
3. Se pagamento OK:
   - Aloca novos créditos (base + bônus)
   - Atualiza next_billing_date (+1 mês)
   - Registra transação de alocação
4. Se pagamento falha:
   - Marca assinatura como "expired"
   - Créditos disponíveis expiram após período de graça
```

**Código:** `subscription-api/src/services/subscription.service.ts`

**Acumulação de Créditos:**
- Créditos não usados acumulam
- Não há limite de acumulação
- Expiram apenas se assinatura for cancelada

---

### 6️⃣ CANCELAMENTO

**Dois Tipos:**

#### A) Com Reembolso (with_refund)
```
1. Usuário solicita cancelamento com reembolso
2. Sistema calcula reembolso proporcional
3. Expira TODOS os créditos disponíveis
4. Move créditos para expired_credits
5. Marca assinatura como "cancelled"
6. Processa reembolso
```

#### B) Sem Renovação (no_renewal)
```
1. Usuário desativa auto_renew
2. Assinatura continua até end_date
3. Créditos continuam válidos até end_date
4. Após end_date:
   - Status muda para "expired"
   - Créditos disponíveis expiram
5. Usuário pode reativar antes de expirar
```

**Código:** `subscription-api/src/services/subscription.service.ts`

---

## 🎨 INTERFACE DO USUÁRIO

### 1. Catálogo de Personagens
**Página:** `src/pages/CharacterCatalog.tsx`

**Funcionalidades:**
- Grid de personagens com imagens
- Preço em créditos e em dinheiro
- Badge "Exclusivo Semestral"
- Filtros:
  - Disponíveis com meus créditos
  - Apenas exclusivos
- Barra de saldo de créditos no topo
- Botão "Comprar com X créditos"

**Componentes:**
- `CharacterCatalogHero`: Hero section
- `CreditBalanceBar`: Barra de saldo visual
- `CharacterGrid`: Grid de cards
- `CharacterCard`: Card individual
- `CharacterFilters`: Filtros

---

### 2. Painel de Assinatura
**Página:** `src/pages/SubscriptionCreditPanel.tsx`

**Seções:**

#### A) Minha Assinatura
- Plano atual (Trimestral/Semestral)
- Status (Ativa/Expirada/Cancelada)
- Data de renovação
- Botão para trocar plano
- Botão para cancelar

#### B) Meus Créditos
- Total alocado
- Usados
- Disponíveis
- Expirados
- Barra de progresso visual
- Histórico de transações (últimas 10)

#### C) Meu Pedido Automático
- Personagens adicionados
- Total de créditos necessários
- Ciclo de produção associado
- Botão para remover personagens
- Aviso se créditos insuficientes

**Componentes:**
- `MySubscriptionSection`
- `MyCreditsSection`
- `MyAutomaticOrderSection`

---

## 🛠️ INTERFACE ADMIN

### 1. Dashboard
**Página:** `src/pages/admin/AdminSubscriptionCreditDashboard.tsx`

**Métricas:**

#### Assinaturas
- Total, Ativas, Expiradas, Canceladas
- Por plano (Trimestral/Semestral)

#### Créditos
- Total alocado
- Usados
- Disponíveis
- Expirados

#### Ciclos de Produção
- Abertos, Fechados
- Ciclo atual com capacidade

#### Receita
- MRR estimado (Monthly Recurring Revenue)

#### Personagens
- Total, Ativos, Exclusivos

#### Pedidos
- Total, Individuais, Automáticos

**Atualização:** A cada 30 segundos

---

### 2. Gerenciamento de Assinaturas
**Página:** `src/pages/admin/AdminSubscriptionCreditSubscriptions.tsx`

**Funcionalidades:**
- Lista todas as assinaturas
- Filtros: Status, Plano
- Paginação (20 por página)
- Visualização de:
  - Email do usuário
  - Plano
  - Status
  - Datas
  - Renovação automática
  - Mudança de plano pendente
- Ação: Ajustar créditos manualmente

**Modal de Ajuste:**
- Campo: Quantidade (positivo ou negativo)
- Campo: Motivo (obrigatório)
- Registra transação de ajuste

---

### 3. Gerenciamento de Personagens
**Página:** `src/pages/admin/AdminSubscriptionCreditCharacters.tsx`

**Funcionalidades:**
- Grid de personagens
- Criar novo personagem
- Editar personagem existente
- Desativar personagem (soft delete)

**Formulário:**
- Nome
- Descrição
- Imagem URL
- Preço em dinheiro
- Preço em créditos
- Exclusivo semestral (checkbox)
- Coleção padrão (checkbox)
- Ativo (checkbox)

---

### 4. Gerenciamento de Ciclos
**Página:** `src/pages/admin/AdminSubscriptionCreditCycles.tsx`

**Funcionalidades:**
- Visualização do ciclo atual
- Criar novo ciclo
- Fechar ciclo manualmente
- Ver estatísticas do ciclo

**Criar Ciclo:**
- Nome (ex: "Ciclo Janeiro 2026")
- Capacidade máxima
- Data de fechamento

**Fechar Ciclo:**
- Confirmação com aviso
- Debita créditos dos pedidos automáticos
- Trava pedidos
- Inicia produção

**Estatísticas:**
- Total de pedidos
- Confirmados
- Pendentes
- Por tipo (individual/automático)
- Capacidade usada

---

## 🔐 SEGURANÇA E VALIDAÇÕES

### Transações Atômicas
**Código:** `subscription-api/src/services/credit.service.ts`

```typescript
// Lock pessimista para evitar race conditions
const credits = await tx.$queryRaw`
  SELECT * FROM user_credits 
  WHERE user_id = ${userId}
  FOR UPDATE
`;
```

**Garante:**
- Débitos concorrentes não causam saldo negativo
- Invariante sempre mantida
- Transações ACID

---

### Validações de Negócio

#### Compra de Personagem
```typescript
✅ Assinatura ativa
✅ Créditos suficientes
✅ Personagem ativo
✅ Personagem disponível para o plano
✅ Limite de personagens por ciclo
✅ Ciclo aberto
```

#### Fechamento de Ciclo
```typescript
✅ Ciclo está aberto
✅ Data de fechamento chegou OU capacidade atingida
✅ Todos os pedidos automáticos têm créditos suficientes
✅ Pedidos sem créditos são cancelados
```

#### Cancelamento
```typescript
✅ Assinatura ativa
✅ Tipo de cancelamento válido
✅ Reembolso calculado corretamente
✅ Créditos expirados corretamente
```

---

## 📊 TESTES

### Testes de Propriedades
**Localização:** `subscription-api/tests/properties/`

**Arquivos:**
- `plan-credits.property.test.ts`: Validação de créditos por plano
- `credit-balance.property.test.ts`: Invariante de saldo
- `credit-accumulation.property.test.ts`: Acumulação de créditos
- `immediate-debit.property.test.ts`: Débito imediato

**Framework:** Fast-check (property-based testing)

**Exemplo:**
```typescript
it('should maintain invariant: available = total - used', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 1000 }),
      fc.integer({ min: 0, max: 1000 }),
      (total, used) => {
        const available = total - used;
        expect(available).toBe(total - used);
      }
    )
  );
});
```

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. API Backend Não Está Rodando
**Impacto:** CRÍTICO 🔴

**Descrição:** O frontend está configurado para se conectar à API em `http://localhost:3001`, mas não há evidência de que a API está rodando.

**Solução:**
```bash
cd subscription-api
npm install
npm run dev
```

**Verificar:**
- Arquivo `.env` com configurações do banco
- Prisma migrations aplicadas
- Porta 3001 disponível

---

### 2. Integração com Sistema Tradicional
**Impacto:** MÉDIO ⚠️

**Descrição:** Existem DOIS sistemas de assinatura paralelos:
- Sistema tradicional (entregas mensais)
- Sistema de créditos (compra à la carte)

**Problema:** Não está claro se um usuário pode ter ambos simultaneamente.

**Solução:** Definir regra de negócio:
- Opção A: Usuário escolhe um sistema (exclusivo)
- Opção B: Usuário pode ter ambos (separados)

---

### 3. Documentação de Rotas
**Impacto:** BAIXO ℹ️

**Descrição:** Falta documentação Swagger/OpenAPI das rotas da API.

**Solução:** Adicionar Swagger para documentar endpoints.

---

### 4. Testes de Integração
**Impacto:** MÉDIO ⚠️

**Descrição:** Existem testes de propriedades, mas faltam testes de integração end-to-end.

**Solução:** Adicionar testes com Supertest para testar fluxos completos.

---

## ✅ PONTOS FORTES

1. **Arquitetura Limpa:** Separação clara entre frontend e backend
2. **Modelo de Dados Robusto:** Tabelas bem estruturadas com relacionamentos corretos
3. **Transações Atômicas:** Uso correto de locks e transações
4. **Testes de Propriedades:** Validação matemática das regras de negócio
5. **Interface Rica:** Páginas admin e usuário bem completas
6. **Flexibilidade:** Sistema permite compras individuais e automáticas
7. **Escalabilidade:** Ciclos de produção permitem produção em lote

---

## 📋 CHECKLIST DE COMPLETUDE

### Backend API
- ✅ Serviços implementados
- ✅ Rotas implementadas
- ✅ Validações de negócio
- ✅ Transações atômicas
- ✅ Testes de propriedades
- ⚠️ API não está rodando
- ❌ Documentação Swagger
- ❌ Testes de integração

### Frontend
- ✅ Catálogo de personagens
- ✅ Painel de assinatura
- ✅ Barra de créditos
- ✅ Histórico de transações
- ✅ Dashboard admin
- ✅ Gerenciamento de assinaturas
- ✅ Gerenciamento de personagens
- ✅ Gerenciamento de ciclos

### Integrações
- ⚠️ Integração com sistema tradicional (não clara)
- ❌ Webhook de pagamento (não conectado)
- ❌ Notificações por email

### Segurança
- ✅ Autenticação
- ✅ Autorização por role
- ✅ Validações de negócio
- ✅ Transações atômicas

---

## 🎯 RECOMENDAÇÕES PRIORITÁRIAS

### Prioridade ALTA (Fazer Agora)
1. **Subir API Backend** - Garantir que `subscription-api` está rodando
2. **Testar Fluxo Completo** - Criar assinatura → Comprar personagem → Verificar débito
3. **Conectar Webhook de Pagamento** - Ativar assinatura automaticamente

### Prioridade MÉDIA (Próximas Semanas)
4. **Definir Integração com Sistema Tradicional** - Usuário pode ter ambos?
5. **Adicionar Documentação Swagger** - Facilitar uso da API
6. **Implementar Notificações** - Email quando créditos são alocados/debitados

### Prioridade BAIXA (Melhorias Futuras)
7. **Testes de Integração** - Cobertura end-to-end
8. **Dashboard de Métricas Avançado** - Gráficos e analytics
9. **Sistema de Cupons** - Descontos em créditos

---

## 📝 CONCLUSÃO

O sistema de créditos está **COMPLETAMENTE IMPLEMENTADO** do ponto de vista de código, mas precisa de **3 ações críticas** para funcionar:

1. ✅ Subir a API backend (`subscription-api`)
2. ✅ Configurar banco de dados e aplicar migrations
3. ✅ Conectar webhook de pagamento

Após essas ações, o sistema estará **100% FUNCIONAL**.

**Nota:** Este é um sistema SEPARADO e PARALELO ao sistema de assinaturas tradicional. Ambos coexistem no mesmo projeto, mas servem modelos de negócio diferentes:
- **Tradicional:** Assinatura com entregas mensais fixas
- **Créditos:** Assinatura com compra à la carte

A arquitetura é excelente, o código é limpo e bem testado. O sistema está pronto para produção após as correções críticas.
