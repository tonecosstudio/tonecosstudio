# Plano de Implementação: Sistema de Assinaturas com Créditos (MVP)

## Visão Geral

Este plano foca no MVP funcional do sistema de assinaturas com créditos. Implementação simplificada priorizando funcionalidades core que protegem dinheiro/créditos.

## Tecnologias

- **Linguagem:** TypeScript
- **Runtime:** Node.js
- **Framework Web:** Express.js
- **Banco de Dados:** PostgreSQL
- **ORM:** Prisma
- **Testes:** Jest + fast-check (apenas propriedades críticas)
- **Validação:** Zod

## Tasks

- [x] 1. Configuração Inicial do Projeto
  - [x] 1.1 Criar estrutura base do projeto TypeScript
    - Inicializar projeto Node.js com TypeScript
    - Configurar tsconfig.json com strict mode
    - Criar estrutura de diretórios (src/models, src/services, src/controllers, src/routes)
    - _Requirements: Base para todos os requisitos_

  - [x] 1.2 Configurar banco de dados PostgreSQL com Prisma
    - Instalar e configurar Prisma
    - Criar arquivo de configuração do banco de dados
    - Configurar variáveis de ambiente
    - _Requirements: 3.1, 13.1_

  - [x] 1.3 Configurar framework de testes
    - Instalar Jest e configurar para TypeScript
    - Instalar fast-check para property-based testing (apenas propriedades críticas)
    - Configurar scripts de teste no package.json
    - _Requirements: Base para testes críticos_

- [x] 2. Implementação do Modelo de Dados
  - [x] 2.1 Criar schema Prisma com todas as 9 tabelas
    - Definir modelo `User` (base)
    - Definir modelo `SubscriptionPlan` com enums
    - Definir modelo `Subscription` com status e datas
    - Definir modelo `UserCredit` com invariante de saldo
    - Definir modelo `CreditTransaction` com tipos de transação
    - Definir modelo `Character` com precificação e flags
    - Definir modelo `ProductionCycle` com capacidade
    - Definir modelo `Order` com tipos e status
    - Definir modelo `OrderItem`
    - Adicionar índices básicos (user_id, subscription_id, cycle_id)
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 7.1_

  - [x] 2.2 Criar migrations e seed inicial
    - Gerar migration inicial com Prisma
    - Adicionar constraints básicos (UNIQUE, FOREIGN KEY)
    - Criar seed com planos de assinatura (trimestral/semestral)
    - _Requirements: 1.1, 3.1, 4.1_

  - [x]* 2.3 Escrever teste de propriedade: Invariante de Saldo
    - **Property: Invariante de Saldo de Créditos**
    - **Valida: Requisito 3.4**
    - Validar que available_credits = total_credits - used_credits sempre
    - _Requirements: 3.4_

- [x] 3. Implementação do Sistema de Créditos
  - [x] 3.1 Criar serviço de gerenciamento de créditos
    - Implementar função `allocateCredits(userId, subscriptionId, amount)` com transação
    - Implementar função `debitCredits(userId, amount)` com validação de saldo
    - Implementar função `getUserCredits(userId)`
    - Implementar função `expireCredits(userId)` para cancelamentos
    - _Requirements: 2.1, 2.2, 3.2, 3.3, 3.4_

  - [x] 3.2 Criar serviço de transações de crédito
    - Implementar função `recordTransaction(userId, type, amount, metadata)`
    - Implementar função `getTransactionHistory(userId)` com paginação básica
    - Implementar tipos de transação (allocation, debit_immediate, debit_cycle_close, expiration)
    - _Requirements: 3.5, 3.6_

  - [ ]* 3.3 Escrever testes unitários básicos
    - Testar alocação de créditos
    - Testar débito com saldo suficiente
    - Testar rejeição de débito com saldo insuficiente
    - Testar expiração de créditos
    - _Requirements: 2.1, 3.2, 3.3_

  - [ ]* 3.4 Escrever testes de propriedade críticos
    - **Property: Débito Imediato em Compras Individuais**
    - **Valida: Requisitos 5.3, 5.7**
    - **Property: Validação de Saldo Antes de Compra**
    - **Valida: Requisitos 5.1, 5.2**
    - _Requirements: 5.1, 5.2, 5.3, 5.7_

- [x] 4. Implementação do Sistema de Assinaturas
  - [x] 4.1 Criar serviço de gerenciamento de planos
    - Implementar função `getSubscriptionPlans()`
    - Implementar função `calculateCreditsForPlan(planType)` (base + bônus)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 4.2 Criar serviço de ativação de assinatura
    - Implementar função `activateSubscription(userId, planType, paymentMethodId)`
    - Integrar com gateway de pagamento (Stripe/Mercado Pago direto)
    - Criar registro de assinatura com datas calculadas
    - Alocar créditos via serviço de créditos
    - Criar pedido automático com coleção padrão
    - Implementar transação atômica
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 6.1, 6.2_

  - [x] 4.3 Criar serviço de renovação de assinatura
    - Implementar função `renewSubscription(subscriptionId)`
    - Verificar se há pending_plan_change
    - Se pending_plan_change existe: processar mudança de plano (encerrar anterior, criar novo)
    - Se não: renovar plano atual
    - Processar pagamento
    - Atualizar datas de assinatura
    - Somar novos créditos ao saldo existente
    - Criar novo pedido automático
    - Limpar pending_plan_change após processar
    - _Requirements: 2.4, 2.5, 8.3, 8.4, 8.5_

  - [x] 4.4 Criar serviço de agendamento de mudança de plano
    - Implementar função `schedulePlanChange(subscriptionId, newPlanType)`
    - Validar que novo plano é diferente do atual
    - Marcar assinatura com pending_plan_change = newPlanType
    - Retornar data em que mudança entrará em vigor (next_billing_date)
    - Enviar notificação ao usuário
    - NOTA: Mudança só entra em vigor na renovação (protege contra exploit financeiro)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 4.5 Criar serviço de cancelamento com extorno
    - Implementar função `cancelWithRefund(subscriptionId)`
    - Calcular reembolso proporcional baseado EXCLUSIVAMENTE em tempo restante
    - Fórmula: reembolso = (preço_plano * dias_restantes) / dias_totais
    - NÃO considerar créditos usados ou disponíveis no cálculo
    - Processar reembolso via gateway
    - Expirar todos os créditos imediatamente
    - Atualizar status da assinatura
    - _Requirements: 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.7_

  - [x] 4.6 Criar serviço de não-renovação
    - Implementar função `setNoRenewal(subscriptionId)`
    - Desativar auto_renew
    - Remover next_billing_date
    - Limpar pending_plan_change se existir (mudança agendada é cancelada)
    - Manter assinatura ativa até end_date
    - _Requirements: 2.2.1, 2.2.2, 2.2.3, 2.2.6_

  - [ ]* 4.7 Escrever testes unitários básicos
    - Testar ativação de plano trimestral
    - Testar ativação de plano semestral
    - Testar renovação simples (sem mudança de plano)
    - Testar renovação com pending_plan_change (upgrade/downgrade)
    - Testar agendamento de mudança de plano
    - Testar cancelamento com extorno (cálculo baseado em tempo)
    - Testar não-renovação (limpa pending_plan_change)
    - _Requirements: 1.1-1.8, 2.1-2.2, 8.1-8.8_

  - [ ]* 4.8 Escrever testes de propriedade críticos
    - **Property: Cálculo Correto de Créditos por Plano**
    - **Valida: Requisitos 1.2, 1.3, 1.4, 1.5**
    - **Property: Acumulação de Créditos na Renovação**
    - **Valida: Requisitos 2.4, 2.5**
    - **Property: Cálculo de Reembolso Proporcional Baseado em Tempo**
    - **Valida: Requisitos 2.1.1, 2.1.2, 2.1.3**
    - Validar que reembolso = (preço * dias_restantes) / dias_totais
    - Validar que créditos usados NÃO afetam reembolso
    - **Property: Mudança de Plano Só na Renovação**
    - **Valida: Requisitos 8.1, 8.2, 8.3**
    - Validar que pending_plan_change não afeta plano atual
    - Validar que mudança só ocorre quando renovação é processada
    - _Requirements: 1.2-1.5, 2.1.1-2.1.3, 2.4, 2.5, 8.1-8.8_

- [x] 5. Implementação do Catálogo de Personagens
  - [x] 5.1 Criar serviço de gerenciamento de personagens
    - Implementar função `getCharacters(filters, planType)` com filtragem por exclusividade
    - Implementar função `getCharacterById(id, planType)` com validação de acesso
    - Implementar função `getStandardCollection()` para coleção padrão
    - Implementar paginação básica
    - _Requirements: 4.2, 4.3, 4.5, 4.6, 6.1_

  - [x] 5.2 Criar serviço administrativo de personagens
    - Implementar função `createCharacter(data)` com validação
    - Implementar função `updateCharacter(id, data)`
    - Implementar função `deactivateCharacter(id)` (soft delete)
    - _Requirements: 4.7, 9.2_

  - [ ]* 5.3 Escrever testes unitários básicos
    - Testar filtragem por plano trimestral (sem exclusivos)
    - Testar filtragem por plano semestral (com exclusivos)
    - Testar busca de coleção padrão
    - _Requirements: 4.2, 4.3, 4.5, 4.6_

- [x] 6. Implementação do Sistema de Ciclos de Produção
  - [x] 6.1 Criar serviço de gerenciamento de ciclos
    - Implementar função `createProductionCycle(name, capacityLimit, closeDate)`
    - Implementar função `getCurrentOpenCycle()`
    - Implementar função `getCycleById(id)`
    - _Requirements: 7.1, 7.2_

  - [x] 6.2 Criar serviço de fechamento de ciclo (manual para MVP)
    - Implementar função `closeProductionCycle(cycleId)`
    - Buscar todos os pedidos automáticos do ciclo
    - Bloquear todos os pedidos (is_locked = TRUE)
    - Para cada pedido automático: calcular total, validar saldo, debitar créditos
    - Tratar pedidos com saldo insuficiente (manter pending)
    - Registrar transações de crédito
    - Implementar como transação atômica
    - _Requirements: 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 7.6, 7.7_

  - [ ]* 6.3 Escrever testes unitários básicos
    - Testar criação de ciclo
    - Testar fechamento de ciclo
    - Testar débito de pedidos automáticos
    - Testar tratamento de saldo insuficiente
    - _Requirements: 6.5-6.10, 7.1-7.7_

  - [ ]* 6.4 Escrever testes de propriedade críticos
    - **Property: Débito no Fechamento de Ciclo**
    - **Valida: Requisitos 6.6, 6.7, 6.8**
    - **Property: Expiração de Créditos ao Cancelar**
    - **Valida: Requisitos 2.2, 2.1.2**
    - _Requirements: 6.6, 6.7, 6.8, 2.2, 2.1.2_

- [x] 7. Implementação do Sistema de Pedidos
  - [x] 7.1 Criar serviço de pedidos individuais
    - Implementar função `createIndividualOrder(userId, characterId, useCredits)`
    - Validar saldo de créditos
    - Validar acesso a personagem (exclusividade)
    - Identificar ciclo disponível
    - Debitar créditos imediatamente
    - Criar pedido confirmado e bloqueado
    - Registrar transação de crédito
    - Implementar como transação atômica
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 7.2 Criar serviço de pedidos automáticos
    - Implementar função `createAutomaticOrder(userId, subscriptionId, cycleId)`
    - Buscar personagens da coleção padrão
    - Criar pedido com order_type = 'automatic'
    - Criar order_items para cada personagem
    - Calcular total de créditos
    - NÃO debitar créditos (credits_debited = FALSE)
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 7.3 Criar serviço de modificação de pedido automático
    - Implementar função `updateAutomaticOrder(orderId, characterIds)`
    - Validar que pedido não está bloqueado (is_locked = FALSE)
    - Atualizar order_items
    - Recalcular total de créditos
    - _Requirements: 6.4, 6.5_

  - [x] 7.4 Criar serviço de consulta de pedidos
    - Implementar função `getUserOrders(userId)` com paginação básica
    - Implementar função `getOrderById(orderId)` com validação de propriedade
    - _Requirements: 7.4, 10.5_

  - [ ]* 7.5 Escrever testes unitários básicos
    - Testar criação de pedido individual
    - Testar rejeição por saldo insuficiente
    - Testar criação de pedido automático
    - Testar modificação de pedido automático
    - _Requirements: 5.1-5.8, 6.1-6.5_

- [x] 8. Implementação das APIs REST
  - [x] 8.1 Criar middleware básico
    - Implementar middleware de autenticação JWT
    - Implementar middleware de autorização por role (user, admin)
    - Implementar validação de entrada com Zod
    - Implementar tratamento centralizado de erros
    - _Requirements: 13.7_

  - [x] 8.2 Implementar endpoints de assinaturas
    - POST /api/subscriptions/activate - ativar assinatura
    - POST /api/subscriptions/:id/schedule-plan-change - agendar upgrade/downgrade para próxima renovação
    - POST /api/subscriptions/:id/cancel - cancelar com extorno (reembolso baseado em tempo)
    - POST /api/subscriptions/:id/no-renewal - desativar renovação (limpa pending_plan_change)
    - GET /api/subscriptions/:id - consultar assinatura (incluir pending_plan_change se existir)
    - _Requirements: 1.1-1.8, 2.1-2.2, 8.1-8.8_

  - [x] 8.3 Implementar endpoints de créditos
    - GET /api/credits/balance - consultar saldo
    - GET /api/credits/transactions - listar histórico com paginação
    - _Requirements: 3.1-3.6, 10.3, 10.4_

  - [x] 8.4 Implementar endpoints de personagens
    - GET /api/characters - listar catálogo com filtros e paginação
    - GET /api/characters/:id - detalhes de personagem
    - GET /api/characters/standard-collection - coleção padrão
    - _Requirements: 4.1-4.6_

  - [x] 8.5 Implementar endpoints de pedidos
    - POST /api/orders/individual - criar pedido individual
    - GET /api/orders/automatic/:id - consultar pedido automático
    - PUT /api/orders/automatic/:id - modificar pedido automático
    - GET /api/orders - listar pedidos do usuário
    - _Requirements: 5.1-5.8, 6.4, 6.5, 7.4_

  - [x] 8.6 Implementar endpoints de ciclos
    - GET /api/production-cycles/current - ciclo aberto atual
    - GET /api/production-cycles/:id - detalhes do ciclo
    - _Requirements: 7.1-7.7_

  - [ ]* 8.7 Escrever testes de integração básicos
    - Testar fluxo: ativação → compra individual → fechamento
    - Testar fluxo: ativação → modificação pedido automático → fechamento
    - Testar autenticação e autorização
    - _Requirements: Fluxos principais_

- [x] 9. Implementação das APIs Administrativas
  - [x] 9.1 Implementar endpoints admin de assinaturas
    - GET /admin/subscriptions - listar todas com filtros básicos
    - POST /admin/subscriptions/:id/adjust-credits - ajustar créditos manualmente
    - _Requirements: 9.3, 9.4, 9.5_

  - [x] 9.2 Implementar endpoints admin de personagens
    - POST /admin/characters - criar personagem
    - PUT /admin/characters/:id - atualizar personagem
    - DELETE /admin/characters/:id - desativar personagem
    - _Requirements: 9.2_

  - [x] 9.3 Implementar endpoints admin de ciclos
    - POST /admin/production-cycles - criar ciclo
    - POST /admin/production-cycles/:id/close - fechar ciclo manualmente
    - GET /admin/production-cycles/:id/statistics - estatísticas básicas
    - _Requirements: 7.1, 7.5, 9.8_

  - [x] 9.4 Implementar dashboard administrativo básico
    - GET /admin/dashboard/metrics - métricas principais
    - Calcular total de assinaturas ativas
    - Calcular créditos em circulação
    - Calcular capacidade usada do ciclo atual
    - _Requirements: 9.1-9.12_

- [x] 10. Implementação de Jobs Agendados (Críticos)
  - [x] 10.1 Criar job de expiração de assinaturas
    - Implementar função que busca assinaturas com end_date <= NOW() e auto_renew = FALSE
    - Atualizar status para 'expired'
    - Expirar todos os créditos
    - Registrar transações
    - Configurar execução diária
    - _Requirements: 2.2.4, 2.2.5_

  - [x] 10.2 Criar job de renovação automática
    - Implementar função que busca assinaturas com next_billing_date <= NOW() e auto_renew = TRUE
    - Verificar se há pending_plan_change
    - Se pending_plan_change existe: processar mudança de plano (encerrar anterior, criar novo com novo tipo)
    - Se não: renovar plano atual
    - Processar pagamento
    - Estender assinatura ou criar nova (se mudança de plano)
    - Alocar créditos do plano (atual ou novo)
    - Criar pedido automático
    - Limpar pending_plan_change após processar
    - Configurar execução diária
    - _Requirements: 2.4, 2.5, 8.3, 8.4, 8.5_

  - [x] 10.3 Criar job de fechamento automático de ciclos
    - Implementar função que busca ciclos com close_date <= NOW() e status = 'open'
    - Executar fluxo de fechamento de ciclo
    - Processar débitos de pedidos automáticos
    - Configurar execução a cada hora
    - _Requirements: 6.5-6.10, 7.5_

- [x] 11. Implementação de Integrações Básicas
  - [x] 11.1 Criar integração com gateway de pagamento
    - Implementar serviço de processamento de pagamentos (Stripe/Mercado Pago)
    - Implementar função `processPayment(amount, paymentMethodId)`
    - Implementar função `processRefund(transactionId, amount)`
    - Implementar webhook handler básico para confirmações
    - _Requirements: Base para assinaturas_

  - [x] 11.2 Criar sistema de notificações simples
    - Implementar serviço de envio de emails básico
    - Criar template: confirmação de assinatura
    - Criar template: fechamento de ciclo
    - Criar template: cancelamento
    - _Requirements: Base para comunicação_

- [x] 12. Implementação das Interfaces de Usuário (MVP)
  - [x] 12.1 Criar componentes do Painel do Usuário
    - Implementar seção "Minha Assinatura" com status e ações básicas
    - Exibir pending_plan_change se existir: "Mudança para [plano] agendada para [data]"
    - Implementar seção "Meus Créditos" com saldo e histórico
    - Implementar seção "Meu Pedido Automático" com lista de personagens
    - Implementar botões de ação:
      - Agendar upgrade/downgrade (deixar claro que entra em vigor na renovação)
      - Cancelar com extorno (mostrar valor estimado de reembolso baseado em tempo)
      - Não-renovar (avisar que cancela mudança agendada se existir)
    - _Requirements: 8.8, 10.1-10.14_

  - [x] 12.2 Criar componentes do Catálogo de Personagens
    - Implementar grid de personagens com cards
    - Implementar visualização de preços (dinheiro para não-assinantes, créditos para assinantes)
    - Implementar badge "Exclusivo Semestral"
    - Implementar filtros básicos
    - Implementar botões de compra
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [x] 12.3 Criar componentes do Painel Administrativo
    - Implementar dashboard com métricas principais
    - Implementar tabela de assinaturas com ações básicas
    - Implementar formulário de criação/edição de personagens
    - Implementar lista de ciclos com ação de fechamento
    - _Requirements: 9.1-9.12_

- [x] 13. Validação Final e Deploy
  - [x] 13.1 Executar suite de testes
    - Executar todos os testes unitários
    - Executar testes de propriedade críticos (~10 propriedades)
    - Executar testes de integração básicos
    - _Requirements: Todos os requisitos_

  - [x] 13.2 Criar documentação básica
    - Criar README com setup e instruções
    - Documentar variáveis de ambiente
    - Documentar processo de migrations
    - Documentar endpoints principais da API
    - _Requirements: Base para deployment_

  - [x] 13.3 Preparar para deploy
    - Criar script de build de produção
    - Criar Dockerfile básico
    - Configurar variáveis de ambiente de produção
    - _Requirements: Base para deployment_

## Notas Importantes

### Foco do MVP

Este plano foi simplificado para focar no MVP funcional:

1. Ativar assinatura (trimestral/semestral) com créditos corretos
2. Comprar personagem individual (débito imediato)
3. Pedido automático da coleção (débito no fechamento)
4. Fechar ciclo manualmente (admin)
5. Cancelar com extorno
6. Não-renovar
7. Upgrade/downgrade
8. Catálogo com filtros básicos
9. Painel admin básico
10. Painel usuário básico

### Propriedades Críticas (~10)

Apenas propriedades que protegem dinheiro/créditos:
- Invariante de saldo (available = total - used)
- Débito imediato em compras individuais
- Débito no fechamento para pedidos automáticos
- Expiração de créditos ao cancelar
- Validação de saldo antes de compra
- Cálculo correto de créditos por plano
- Acumulação em renovação/upgrade
- Reembolso proporcional

### Simplificações do MVP

- Sem Redis/cache (usar banco direto)
- Sem métricas complexas (logs básicos com console.log)
- Sem testes de performance/stress
- Sem retry exponencial/circuit breaker
- Sem job de limpeza de dados antigos
- Sem sistema de limites complexo por ciclo
- Sem compra com complemento (pode ser adicionado depois)
- Fechamento de ciclo manual via admin (automação depois)
- Notificações simples por email (sem fila complexa)

### Sobre Tasks Opcionais (marcadas com *)

Tasks marcadas com `*` são opcionais e focadas em testes. Podem ser puladas para MVP mais rápido, mas são recomendadas para garantir qualidade.

### Sobre Implementação Incremental

As tasks estão organizadas para permitir implementação incremental:
1. Configuração e modelo de dados
2. Serviços core (créditos, assinaturas, catálogo, ciclos, pedidos)
3. APIs REST
4. Jobs agendados e integrações básicas
5. Interfaces de usuário
6. Validação e deploy

### Tecnologias Recomendadas

- **TypeScript:** Linguagem principal
- **Node.js + Express.js:** Backend
- **Prisma + PostgreSQL:** Banco de dados
- **Jest + fast-check:** Testes
- **Zod:** Validação
- **Stripe/Mercado Pago:** Pagamentos

