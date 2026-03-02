# Plano de Implementação - Página Consolidada de Pedidos

## Visão Geral

Este plano detalha a implementação completa da consolidação das três páginas administrativas existentes (`/admin/assinaturas`, `/admin/entregas`, `/admin/compras-avulsas`) em uma única página unificada `/admin/pedidos`.

**Linguagem de Implementação**: TypeScript + React

**Estimativa Total**: 15-20 dias de desenvolvimento

**Arquitetura**: Frontend React + Supabase (PostgreSQL) + TanStack Query

---

## FASE 1: Fundação - Tipos e Interfaces

- [x] 1.1 Criar tipos TypeScript base para pedidos unificados
  - Criar arquivo `src/types/admin/orders.ts`
  - Definir interface `UnifiedOrder` com campos comuns
  - Definir tipos `SubscriptionDeliveryData` e `StandalonePurchaseData`
  - Definir enum `OrderStatus` com todos os status possíveis
  - Definir interfaces `OrderFilters`, `PaginationParams`, `PaginatedResponse`
  - _Requisitos: 1.1, 1.2, 2.1_

- [x] 1.2 Criar serviço base de pedidos
  - Criar arquivo `src/services/admin/orders-service.ts`
  - Implementar função `fetchUnifiedOrders()` com queries Supabase
  - Implementar queries separadas para `subscription_deliveries` e `standalone_purchases`
  - Adicionar suporte a filtros de tipo, status e data
  - Implementar paginação server-side com `.range()`
  - _Requisitos: 1.1, 2.2, 2.3, 11.2, 11.4_

- [x] 1.3 Criar funções de transformação de dados
  - Criar arquivo `src/services/admin/orders-transformer.ts`
  - Implementar `transformDeliveries()` para normalizar entregas de assinatura
  - Implementar `transformPurchases()` para normalizar compras avulsas
  - Garantir que ambos retornem estrutura `UnifiedOrder` consistente
  - Adicionar tratamento de dados nulos/indefinidos
  - _Requisitos: 1.2, 10.1, 10.2, 10.3, 10.4_


- [ ]* 1.4 Escrever testes unitários para transformação de dados
  - Testar `transformDeliveries()` com dados válidos e inválidos
  - Testar `transformPurchases()` com dados válidos e inválidos
  - Testar tratamento de campos nulos
  - Verificar estrutura de saída consistente
  - _Requisitos: 1.2_

---

## FASE 2: Hooks e Gerenciamento de Estado

- [x] 2.1 Criar hook de query de pedidos
  - Criar arquivo `src/hooks/admin/useOrdersQuery.ts`
  - Implementar hook usando TanStack Query
  - Configurar cache com `staleTime: 30000` e `cacheTime: 300000`
  - Adicionar prefetch da próxima página
  - Implementar tratamento de erros
  - _Requisitos: 1.5, 11.1, 11.5_

- [x] 2.2 Criar hook de gerenciamento de filtros
  - Criar arquivo `src/hooks/admin/useOrderFilters.ts`
  - Implementar estado de filtros (tipo, status, datas, busca)
  - Adicionar persistência de filtros em URL query params
  - Implementar lógica de reset de filtros
  - _Requisitos: 2.5, 3.5_

- [x] 2.3 Criar hook de seleção múltipla
  - Criar arquivo `src/hooks/admin/useOrderSelection.ts`
  - Implementar estado de seleção de pedidos
  - Adicionar funções `selectAll()`, `deselectAll()`, `toggleSelection()`
  - Implementar lógica de seleção por página
  - _Requisitos: 7.1_

- [x] 2.4 Criar hook de mutações de pedidos
  - Criar arquivo `src/hooks/admin/useOrderMutations.ts`
  - Implementar mutação para atualização de status individual
  - Implementar mutação para ações em massa
  - Adicionar invalidação de cache após mutações
  - Implementar tratamento de erros específicos
  - _Requisitos: 6.1, 6.5, 7.3_


---

## FASE 3: Componentes Base da UI

- [x] 3.1 Criar página principal OrdersPage
  - Criar arquivo `src/pages/admin/OrdersPage.tsx`
  - Implementar layout principal com header e área de conteúdo
  - Integrar hooks de filtros, query e seleção
  - Adicionar estados de loading, erro e vazio
  - Implementar verificação de permissões de admin
  - _Requisitos: 1.1, 12.1, 12.2_

- [x] 3.2 Criar componente OrdersTable
  - Criar arquivo `src/components/admin/orders/OrdersTable.tsx`
  - Implementar tabela responsiva com colunas: checkbox, tipo, ID, cliente, status, data, valor, ações
  - Adicionar header com checkbox "selecionar todos"
  - Implementar skeleton loading state
  - Adicionar mensagem de "nenhum pedido encontrado"
  - _Requisitos: 1.2, 4.4, 13.2_

- [x] 3.3 Criar componente OrderRow
  - Criar arquivo `src/components/admin/orders/OrderRow.tsx`
  - Implementar linha da tabela com todos os campos
  - Adicionar checkbox de seleção
  - Implementar click handler para abrir detalhes
  - Adicionar hover effects e estados visuais
  - _Requisitos: 1.2, 13.5_

- [x] 3.4 Criar componentes de badge de status e tipo
  - Criar arquivo `src/components/admin/orders/OrderStatusBadge.tsx`
  - Implementar badge com cores por status
  - Criar arquivo `src/components/admin/orders/OrderTypeIndicator.tsx`
  - Implementar indicador visual de tipo de pedido
  - _Requisitos: 1.2_

- [x] 3.5 Implementar paginação
  - Adicionar controles de paginação no OrdersTable
  - Implementar navegação entre páginas
  - Exibir informações de página atual e total
  - Adicionar seletor de itens por página (20, 50, 100)
  - _Requisitos: 1.4, 11.2, 11.4_


---

## FASE 4: Sistema de Filtros

- [x] 4.1 Criar componente OrderFilters
  - Criar arquivo `src/components/admin/orders/OrderFilters.tsx`
  - Implementar filtro de tipo (Todos, Entregas de Assinatura, Compras Avulsas)
  - Adicionar filtro de status com seleção múltipla
  - Implementar filtros de data (de/até)
  - Adicionar botão de limpar filtros
  - _Requisitos: 2.1, 2.2, 2.3, 3.1, 3.3_

- [x] 4.2 Implementar contadores de status
  - Adicionar query para contar pedidos por status
  - Exibir contagem ao lado de cada opção de status
  - Atualizar contadores quando filtros mudam
  - _Requisitos: 3.4_

- [x] 4.3 Implementar persistência de filtros na URL
  - Sincronizar estado de filtros com URL query params
  - Restaurar filtros ao carregar página
  - Manter filtros durante navegação entre páginas
  - _Requisitos: 2.5_

- [x] 4.4 Adicionar validação de filtros de data
  - Validar que data inicial não é posterior à data final
  - Exibir mensagem de erro para datas inválidas
  - Limitar seleção de datas a intervalos razoáveis
  - _Requisitos: 15.2_

---

## FASE 5: Funcionalidade de Busca

- [x] 5.1 Criar componente OrderSearchBar
  - Criar arquivo `src/components/admin/orders/OrderSearchBar.tsx`
  - Implementar campo de busca com ícone
  - Adicionar placeholder descritivo
  - Implementar botão de limpar busca
  - _Requisitos: 4.1_

- [x] 5.2 Implementar busca com debounce
  - Adicionar debounce de 300ms usando hook customizado
  - Implementar busca em nome do cliente, email, ID do pedido e código de rastreamento
  - Adicionar indicador visual de "buscando..."
  - _Requisitos: 4.2, 4.3_

- [x] 5.3 Implementar destaque de termos de busca
  - Adicionar função para destacar texto correspondente
  - Aplicar destaque visual nos resultados
  - _Requisitos: 4.5_


- [x] 5.4 Adicionar sanitização de input de busca
  - Criar arquivo `src/lib/sanitizer.ts`
  - Implementar função `sanitizeSearchInput()` usando DOMPurify
  - Remover padrões de SQL injection
  - Aplicar sanitização antes de enviar query
  - _Requisitos: 12.5_

---

## FASE 6: Painel de Detalhes

- [x] 6.1 Criar componente OrderDetailPanel
  - Criar arquivo `src/components/admin/orders/OrderDetailPanel.tsx`
  - Implementar painel lateral deslizante
  - Adicionar header com botão de fechar
  - Implementar seções: informações básicas, cliente, status, histórico
  - Adicionar skeleton loading para detalhes
  - _Requisitos: 5.1_

- [x] 6.2 Criar componente SubscriptionDeliveryDetails
  - Criar arquivo `src/components/admin/orders/SubscriptionDeliveryDetails.tsx`
  - Exibir informações da assinatura (plano, entregas completadas/total)
  - Exibir informações do ciclo de produção
  - Exibir informações da coleção
  - Exibir informações do personagem (se disponível)
  - Exibir data de revelação
  - _Requisitos: 5.2, 10.1, 10.4_

- [x] 6.3 Criar componente StandalonePurchaseDetails
  - Criar arquivo `src/components/admin/orders/StandalonePurchaseDetails.tsx`
  - Exibir informações do produto e coleção
  - Exibir valores (depósito, saldo, total)
  - Exibir datas de pagamento (depósito, saldo)
  - Exibir links para comprovantes de pagamento
  - Exibir informações do ciclo
  - _Requisitos: 5.3, 10.2, 10.3_

- [x] 6.4 Implementar seção de histórico de status
  - Adicionar query para buscar histórico de mudanças
  - Exibir timeline de mudanças de status
  - Mostrar timestamp e admin responsável por cada mudança
  - Adicionar ícones visuais para cada status
  - _Requisitos: 5.4, 12.3, 12.4_

- [x] 6.5 Adicionar link de rastreamento externo
  - Verificar se pedido possui código de rastreamento
  - Gerar link para serviço de rastreamento (Correios, etc.)
  - Exibir botão clicável "Rastrear Pedido"
  - Abrir link em nova aba
  - _Requisitos: 5.5_


---

## FASE 7: Atualização de Status Individual

- [x] 7.1 Criar validador de transições de status
  - Criar arquivo `src/services/admin/orders-validator.ts`
  - Implementar função `validateStatusTransition()`
  - Definir matriz de transições válidas por tipo de pedido
  - Retornar erros descritivos para transições inválidas
  - _Requisitos: 6.2, 6.3_

- [ ]* 7.2 Escrever testes unitários para validação de status
  - Testar todas as transições válidas
  - Testar transições inválidas
  - Verificar mensagens de erro apropriadas
  - _Requisitos: 6.2, 6.3_

- [x] 7.3 Implementar controle de atualização de status
  - Adicionar dropdown de status no painel de detalhes
  - Implementar handler de mudança de status
  - Validar transição antes de enviar
  - Exibir confirmação para mudanças críticas
  - _Requisitos: 6.1_

- [x] 7.4 Implementar persistência de mudança de status
  - Criar mutation para atualizar status no Supabase
  - Salvar timestamp e ID do admin
  - Registrar mudança no histórico
  - Invalidar cache e atualizar UI
  - _Requisitos: 6.4, 6.5, 12.3, 12.4_

- [x] 7.5 Adicionar feedback visual de sucesso/erro
  - Exibir toast de sucesso após atualização
  - Exibir toast de erro com mensagem descritiva
  - Adicionar loading state durante atualização
  - _Requisitos: 13.5, 15.1, 15.2_

---

## FASE 8: Ações em Massa

- [x] 8.1 Criar componente BulkActionsBar
  - Criar arquivo `src/components/admin/orders/BulkActionsBar.tsx`
  - Exibir barra fixa quando pedidos estão selecionados
  - Mostrar contagem de pedidos selecionados
  - Adicionar botões: Atualizar Status, Gerar Etiquetas, Exportar CSV
  - Adicionar botão de cancelar seleção
  - _Requisitos: 7.2_


- [x] 8.2 Implementar modal de confirmação para ações em massa
  - Criar componente de modal reutilizável
  - Exibir lista de pedidos que serão afetados
  - Mostrar ação que será executada
  - Adicionar botões de confirmar e cancelar
  - _Requisitos: 7.4_

- [x] 8.3 Implementar atualização de status em massa
  - Criar função `bulkUpdateStatus()` no serviço
  - Processar pedidos em lote
  - Validar cada transição individualmente
  - Coletar sucessos e falhas
  - _Requisitos: 7.3_

- [x] 8.4 Implementar feedback de progresso e resultado
  - Exibir barra de progresso durante processamento
  - Mostrar resultado com contagem de sucessos e falhas
  - Listar pedidos que falharam com motivo do erro
  - Adicionar opção de retry para falhas
  - _Requisitos: 7.5, 15.3_

- [ ]* 8.5 Escrever testes de integração para ações em massa
  - Testar atualização em massa com todos sucessos
  - Testar atualização em massa com falhas parciais
  - Verificar tratamento de erros
  - Validar atualização de UI
  - _Requisitos: 7.5, 15.3_

---

## FASE 9: Geração de Etiquetas

- [x] 9.1 Implementar validação de endereço
  - Criar função `validateDeliveryAddress()`
  - Verificar campos obrigatórios (rua, número, cidade, estado, CEP)
  - Retornar lista de campos faltantes
  - _Requisitos: 8.3, 8.4_

- [x] 9.2 Implementar geração de etiqueta individual
  - Criar serviço de integração com API de etiquetas
  - Validar endereço antes de gerar
  - Gerar PDF da etiqueta
  - Disponibilizar download
  - _Requisitos: 8.1, 8.5_

- [x] 9.3 Implementar geração de etiquetas em massa
  - Validar endereços de todos os pedidos selecionados
  - Gerar etiquetas em lote
  - Combinar PDFs ou abrir em múltiplas abas
  - Exibir lista de pedidos com endereços inválidos
  - _Requisitos: 8.2, 8.4_


- [x] 9.4 Adicionar tratamento de erros específico
  - Tratar erro de endereço inválido
  - Tratar erro de API de etiquetas
  - Exibir mensagens descritivas
  - Adicionar opção de corrigir endereço
  - _Requisitos: 8.4, 15.1, 15.2_

---

## FASE 10: Exportação CSV

- [x] 10.1 Criar serviço de exportação
  - Criar arquivo `src/services/admin/orders-export.ts`
  - Implementar função `exportOrdersToCSV()`
  - Aplicar filtros atuais aos dados exportados
  - Formatar dados para CSV
  - _Requisitos: 9.1, 9.2_

- [x] 10.2 Definir colunas de exportação
  - Incluir: ID, Tipo, Cliente (nome e email), Status, Data de Criação, Valor, Código de Rastreamento
  - Adicionar colunas específicas por tipo (opcional)
  - Formatar datas e valores monetários
  - _Requisitos: 9.3_

- [x] 10.3 Implementar geração e download de arquivo
  - Gerar nome de arquivo com timestamp `pedidos_YYYYMMDD_HHMMSS.csv`
  - Criar blob e trigger download automático
  - Adicionar encoding UTF-8 com BOM para Excel
  - _Requisitos: 9.5_

- [x] 10.4 Adicionar limite e paginação para exportação
  - Limitar exportação a 10.000 pedidos por vez
  - Exibir aviso se limite for excedido
  - Sugerir aplicar filtros para reduzir conjunto
  - Implementar progresso para exportações grandes
  - _Requisitos: 9.4_

- [ ]* 10.5 Escrever testes unitários para exportação
  - Testar geração de CSV com dados válidos
  - Testar aplicação de filtros
  - Testar formato de nome de arquivo
  - Verificar encoding e formatação
  - _Requisitos: 9.3, 9.5_


---

## FASE 11: Otimizações de Performance

- [x] 11.1 Criar índices de banco de dados
  - Criar migration para índices
  - Adicionar índice em `subscription_deliveries(status)`
  - Adicionar índice em `subscription_deliveries(created_at DESC)`
  - Adicionar índice em `subscription_deliveries(tracking_code)`
  - Adicionar índice em `standalone_purchases(status)`
  - Adicionar índice em `standalone_purchases(created_at DESC)`
  - Adicionar índice em `standalone_purchases(user_id)`
  - Adicionar índices compostos para filtros comuns
  - _Requisitos: 11.3_

- [x] 11.2 Implementar full-text search no PostgreSQL
  - Criar índice GIN para busca em profiles
  - Otimizar query de busca usando `to_tsvector`
  - Testar performance de busca
  - _Requisitos: 4.2, 11.5_

- [x] 11.3 Otimizar queries com joins
  - Garantir que todas as queries relacionadas usem joins
  - Evitar N+1 queries
  - Usar `.select()` com relacionamentos aninhados no Supabase
  - Testar performance com datasets grandes
  - _Requisitos: 10.5, 11.1_

- [x] 11.4 Implementar prefetch de próxima página
  - Adicionar lógica de prefetch no hook de query
  - Prefetch quando usuário está na metade da página
  - Configurar cache apropriado
  - _Requisitos: 11.1_

- [x] 11.5 Adicionar lazy loading de componentes pesados
  - Usar React.lazy() para OrderDetailPanel
  - Usar React.lazy() para BulkActionsBar
  - Adicionar Suspense com fallback apropriado
  - _Requisitos: 11.1_

- [x] 11.6 Implementar virtualização de lista (opcional)
  - Avaliar necessidade de virtualização
  - Implementar usando @tanstack/react-virtual se necessário
  - Testar com datasets de 1000+ pedidos
  - _Requisitos: 11.1, 11.2_


---

## FASE 12: Segurança e Auditoria

- [x] 12.1 Implementar verificação de permissões
  - Criar middleware de verificação de admin
  - Verificar role do usuário antes de carregar dados
  - Redirecionar para página de acesso negado se não autorizado
  - Adicionar verificação em todas as mutações
  - _Requisitos: 12.1, 12.2_

- [x] 12.2 Configurar Row Level Security (RLS) no Supabase
  - Criar políticas RLS para subscription_deliveries
  - Criar políticas RLS para standalone_purchases
  - Garantir que apenas admins podem acessar
  - Testar políticas com diferentes roles
  - _Requisitos: 12.1, 12.2_

- [x] 12.3 Implementar sistema de auditoria
  - Criar tabela `audit_logs` no banco de dados
  - Implementar função `logAuditAction()`
  - Registrar todas as mudanças de status
  - Incluir userId, timestamp, IP e user agent
  - _Requisitos: 12.3, 12.4_

- [x] 12.4 Implementar rate limiting
  - Criar arquivo `src/lib/rate-limiter.ts`
  - Implementar rate limiting para busca (30 req/min)
  - Implementar rate limiting para ações em massa (10 req/min)
  - Exibir mensagem apropriada quando limite excedido
  - _Requisitos: 12.5_

- [x] 12.5 Implementar proteção CSRF
  - Criar arquivo `src/lib/csrf.ts`
  - Gerar tokens CSRF para mutações
  - Validar tokens no servidor
  - Adicionar tokens em todos os formulários
  - _Requisitos: 12.5_

- [x] 12.6 Adicionar validação de dados com Zod
  - Criar schemas de validação para filtros
  - Criar schemas de validação para mutações
  - Validar dados antes de enviar ao servidor
  - Exibir erros de validação apropriados
  - _Requisitos: 12.5_


---

## FASE 13: Testes Unitários

- [ ]* 13.1 Testes para serviço de pedidos
  - Testar `fetchUnifiedOrders()` com diferentes filtros
  - Testar paginação
  - Testar tratamento de erros
  - Mockar Supabase client
  - _Requisitos: 1.1, 2.2, 2.3_

- [ ]* 13.2 Testes para transformação de dados
  - Testar `transformDeliveries()` com dados completos
  - Testar `transformPurchases()` com dados completos
  - Testar tratamento de dados nulos
  - Verificar estrutura de saída
  - _Requisitos: 1.2, 10.1, 10.2_

- [ ]* 13.3 Testes para validação de status
  - Testar todas as transições válidas
  - Testar transições inválidas
  - Verificar mensagens de erro
  - _Requisitos: 6.2, 6.3_

- [ ]* 13.4 Testes para sanitização de inputs
  - Testar remoção de SQL injection patterns
  - Testar remoção de tags HTML
  - Testar caracteres especiais
  - _Requisitos: 12.5_

- [ ]* 13.5 Testes para exportação CSV
  - Testar geração de CSV
  - Testar aplicação de filtros
  - Testar formato de arquivo
  - Testar encoding
  - _Requisitos: 9.2, 9.3_

- [ ]* 13.6 Testes para componentes React
  - Testar OrdersTable com diferentes estados
  - Testar OrderFilters com diferentes seleções
  - Testar OrderDetailPanel com diferentes tipos
  - Usar React Testing Library
  - _Requisitos: 1.2, 2.1, 5.1_


---

## FASE 14: Testes de Propriedade (PBT)

- [ ]* 14.1 Configurar fast-check para testes de propriedade
  - Instalar fast-check
  - Configurar arbitraries para tipos de pedidos
  - Configurar mínimo de 100 iterações por teste
  - _Requisitos: Todas as propriedades_

- [ ]* 14.2 Propriedade 1: Lista unificada contém ambos os tipos
  - **Property 1: Unified List Contains Both Types**
  - **Valida: Requisitos 1.1, 2.4**
  - Gerar datasets de entregas e compras
  - Verificar que lista unificada contém ambos
  - Tag: `Feature: orders-consolidation-page, Property 1`

- [ ]* 14.3 Propriedade 2: Campos obrigatórios presentes
  - **Property 2: Required Fields Present**
  - **Valida: Requisitos 1.2**
  - Verificar que todos os pedidos têm campos obrigatórios
  - Tag: `Feature: orders-consolidation-page, Property 2`

- [ ]* 14.4 Propriedade 3: Ordenação padrão por data
  - **Property 3: Default Sort Order**
  - **Valida: Requisitos 1.3**
  - Verificar ordenação decrescente por created_at
  - Tag: `Feature: orders-consolidation-page, Property 3`

- [ ]* 14.5 Propriedade 4: Limite de paginação
  - **Property 4: Pagination Limit**
  - **Valida: Requisitos 1.4, 11.4**
  - Verificar que páginas não excedem pageSize
  - Tag: `Feature: orders-consolidation-page, Property 4`

- [ ]* 14.6 Propriedade 5 e 6: Filtros de tipo
  - **Property 5: Type Filter - Subscription Deliveries Only**
  - **Property 6: Type Filter - Standalone Purchases Only**
  - **Valida: Requisitos 2.2, 2.3**
  - Verificar que filtros retornam apenas tipo correto
  - Tag: `Feature: orders-consolidation-page, Property 5/6`

- [ ]* 14.7 Propriedade 7: Persistência de filtros
  - **Property 7: Filter State Persistence**
  - **Valida: Requisitos 2.5**
  - Verificar que filtros persistem entre páginas
  - Tag: `Feature: orders-consolidation-page, Property 7`


- [ ]* 14.8 Propriedade 8 e 9: Filtros de status
  - **Property 8: Status Filter Correctness**
  - **Property 9: Multiple Status Selection**
  - **Valida: Requisitos 3.2, 3.3**
  - Verificar que filtros de status funcionam corretamente
  - Tag: `Feature: orders-consolidation-page, Property 8/9`

- [ ]* 14.9 Propriedade 10: Contagem de status
  - **Property 10: Status Count Accuracy**
  - **Valida: Requisitos 3.4**
  - Verificar que contagens correspondem aos dados
  - Tag: `Feature: orders-consolidation-page, Property 10`

- [ ]* 14.10 Propriedade 11: Busca em múltiplos campos
  - **Property 11: Search Across Fields**
  - **Valida: Requisitos 4.2**
  - Verificar busca em nome, email, ID e tracking
  - Tag: `Feature: orders-consolidation-page, Property 11`

- [ ]* 14.11 Propriedades 12 e 13: Completude de detalhes
  - **Property 12: Subscription Delivery Details Completeness**
  - **Property 13: Standalone Purchase Details Completeness**
  - **Valida: Requisitos 5.2, 5.3, 10.1-10.4**
  - Verificar que detalhes contêm todos os campos
  - Tag: `Feature: orders-consolidation-page, Property 12/13`

- [ ]* 14.12 Propriedade 16: Validação de transição de status
  - **Property 16: Status Transition Validation**
  - **Valida: Requisitos 6.2, 6.3**
  - Verificar que transições inválidas são rejeitadas
  - Tag: `Feature: orders-consolidation-page, Property 16`

- [ ]* 14.13 Propriedade 18: Rastreamento de ações em massa
  - **Property 18: Bulk Action Success Tracking**
  - **Valida: Requisitos 7.5, 15.3**
  - Verificar que sucessos e falhas são rastreados
  - Tag: `Feature: orders-consolidation-page, Property 18`

- [ ]* 14.14 Propriedade 19: Validação de endereço
  - **Property 19: Label Generation Address Validation**
  - **Valida: Requisitos 8.3, 8.4**
  - Verificar que endereços incompletos são rejeitados
  - Tag: `Feature: orders-consolidation-page, Property 19`


- [ ]* 14.15 Propriedades 20-22: Exportação CSV
  - **Property 20: CSV Export Filtered Data**
  - **Property 21: CSV Export Column Completeness**
  - **Property 22: CSV Filename Format**
  - **Valida: Requisitos 9.2, 9.3, 9.5**
  - Verificar exportação correta de dados
  - Tag: `Feature: orders-consolidation-page, Property 20/21/22`

- [ ]* 14.16 Propriedade 26: Sanitização de inputs
  - **Property 26: Input Sanitization**
  - **Valida: Requisitos 12.5**
  - Verificar que inputs são sanitizados
  - Tag: `Feature: orders-consolidation-page, Property 26`

---

## FASE 15: Testes de Integração

- [ ]* 15.1 Teste de fluxo completo: visualização de pedidos
  - Carregar página
  - Verificar que pedidos são exibidos
  - Verificar paginação funciona
  - Verificar estados de loading e erro

- [ ]* 15.2 Teste de fluxo completo: aplicação de filtros
  - Aplicar filtro de tipo
  - Aplicar filtro de status
  - Aplicar filtro de data
  - Verificar que resultados são filtrados corretamente

- [ ]* 15.3 Teste de fluxo completo: busca
  - Inserir termo de busca
  - Verificar debounce funciona
  - Verificar resultados corretos
  - Limpar busca

- [ ]* 15.4 Teste de fluxo completo: visualização de detalhes
  - Clicar em pedido
  - Verificar painel de detalhes abre
  - Verificar dados corretos são exibidos
  - Fechar painel

- [ ]* 15.5 Teste de fluxo completo: atualização de status
  - Abrir detalhes de pedido
  - Alterar status
  - Verificar validação
  - Confirmar mudança
  - Verificar atualização na lista


- [ ]* 15.6 Teste de fluxo completo: ações em massa
  - Selecionar múltiplos pedidos
  - Executar ação em massa
  - Verificar confirmação
  - Verificar resultado com sucessos e falhas

- [ ]* 15.7 Teste de fluxo completo: exportação CSV
  - Aplicar filtros
  - Exportar CSV
  - Verificar arquivo gerado
  - Verificar conteúdo e formato

---

## FASE 16: Responsividade Mobile

- [x] 16.1 Adaptar OrdersTable para mobile
  - Implementar layout de cards para telas pequenas
  - Ocultar colunas menos importantes em mobile
  - Garantir área de toque mínima de 44x44px
  - Testar em diferentes tamanhos de tela (320px+)
  - _Requisitos: 13.1, 13.2, 13.4_

- [x] 16.2 Adaptar OrderFilters para mobile
  - Implementar filtros em modal/drawer para mobile
  - Adicionar botão de "Filtros" com badge de contagem
  - Garantir todos os filtros acessíveis
  - _Requisitos: 13.3_

- [x] 16.3 Adaptar OrderDetailPanel para mobile
  - Implementar painel em tela cheia para mobile
  - Adicionar header com botão de voltar
  - Garantir scroll suave
  - _Requisitos: 13.3_

- [x] 16.4 Adaptar BulkActionsBar para mobile
  - Implementar barra fixa no bottom para mobile
  - Reduzir número de ações visíveis
  - Adicionar menu de overflow para ações secundárias
  - _Requisitos: 13.4_

- [x] 16.5 Testar responsividade em dispositivos reais
  - Testar em iPhone (Safari)
  - Testar em Android (Chrome)
  - Testar em tablet
  - Verificar performance e usabilidade
  - _Requisitos: 13.1, 13.5_


---

## FASE 17: Feature Flag e Redirecionamentos

- [x] 17.1 Implementar feature flag
  - Adicionar variável de ambiente `VITE_ENABLE_UNIFIED_ORDERS`
  - Criar configuração de feature flags
  - Implementar roteamento condicional
  - Testar com flag habilitada e desabilitada
  - _Requisitos: 14.3_

- [x] 17.2 Criar componente de redirecionamento
  - Criar arquivo `src/pages/admin/RedirectToOrders.tsx`
  - Implementar redirecionamento de `/admin/assinaturas` com filtro de entregas
  - Implementar redirecionamento de `/admin/entregas` com filtro de entregas
  - Implementar redirecionamento de `/admin/compras-avulsas` com filtro de compras
  - Adicionar indicador visual de "Redirecionando..."
  - _Requisitos: 14.1, 14.2_

- [x] 17.3 Atualizar rotas da aplicação
  - Adicionar rota `/admin/pedidos`
  - Configurar redirecionamentos das URLs antigas
  - Testar navegação direta para URLs antigas
  - Verificar que filtros são aplicados corretamente
  - _Requisitos: 14.1, 14.2_

- [x] 17.4 Adicionar analytics para monitoramento
  - Implementar tracking de uso da página
  - Rastrear uso de páginas antigas vs nova
  - Adicionar eventos para ações principais
  - Configurar dashboard de monitoramento
  - _Requisitos: 14.3_

---

## FASE 18: Período de Transição e Monitoramento

- [x] 18.1 Deploy em ambiente de staging
  - Fazer deploy da nova página
  - Testar todas as funcionalidades
  - Verificar performance
  - Coletar feedback inicial

- [x] 18.2 Habilitar feature flag em produção
  - Habilitar flag para grupo de teste (beta testers)
  - Monitorar erros e performance
  - Coletar feedback dos usuários
  - Ajustar conforme necessário


- [x] 18.3 Período de transição (2 semanas)
  - Manter ambas as versões disponíveis
  - Monitorar uso e erros
  - Coletar feedback contínuo
  - Fazer ajustes incrementais
  - _Requisitos: 14.3_

- [x] 18.4 Análise de feedback e ajustes finais
  - Revisar feedback coletado
  - Priorizar ajustes necessários
  - Implementar melhorias
  - Re-testar funcionalidades ajustadas

- [x] 18.5 Habilitar para todos os usuários
  - Habilitar feature flag para 100% dos usuários
  - Monitorar métricas de performance
  - Verificar que não há regressões
  - Preparar para remoção das páginas antigas

---

## FASE 19: LIMPEZA E ORGANIZAÇÃO (CRÍTICO)

**IMPORTANTE**: Esta fase é dedicada à remoção completa das páginas antigas e organização do código, conforme solicitado explicitamente pelo usuário.

- [x] 19.1 Remover páginas antigas
  - Deletar `src/pages/admin/AdminSubscriptions.tsx`
  - Deletar `src/pages/admin/DeliveryManagement.tsx`
  - Deletar `src/pages/admin/StandalonePurchases.tsx`
  - Deletar `src/pages/admin/CycleDashboard.tsx` (se não usado em outro contexto)
  - _Requisitos: 14.3_

- [x] 19.2 Remover componentes obsoletos
  - Identificar componentes usados apenas pelas páginas antigas
  - Deletar `src/components/admin/DeliveryDetailModal.tsx` (se não usado)
  - Deletar `src/components/admin/BulkUpdateModal.tsx` (se não usado)
  - Deletar outros componentes específicos não mais necessários
  - Verificar dependências antes de deletar

- [x] 19.3 Remover testes obsoletos
  - Deletar testes das páginas antigas
  - Deletar testes de componentes removidos
  - Atualizar suíte de testes
  - Verificar que todos os testes passam


- [x] 19.4 Limpar rotas e navegação
  - Remover rotas antigas do arquivo de rotas
  - Remover links para páginas antigas do menu admin
  - Atualizar breadcrumbs
  - Atualizar navegação lateral/header
  - Verificar que não há links quebrados

- [x] 19.5 Limpar imports e dependências
  - Remover imports não utilizados
  - Executar linter para identificar código morto
  - Remover dependências npm não mais necessárias
  - Atualizar package.json

- [x] 19.6 Organizar estrutura de arquivos
  - Verificar que todos os arquivos estão nas pastas corretas
  - Renomear arquivos se necessário para consistência
  - Organizar imports por ordem alfabética
  - Aplicar formatação consistente

- [x] 19.7 Limpar código duplicado
  - Identificar código duplicado entre componentes
  - Extrair para funções/componentes reutilizáveis
  - Refatorar para DRY (Don't Repeat Yourself)
  - Documentar funções utilitárias

- [x] 19.8 Atualizar configurações
  - Remover feature flag `VITE_ENABLE_UNIFIED_ORDERS`
  - Atualizar variáveis de ambiente
  - Atualizar configurações de build
  - Atualizar configurações de CI/CD

- [x] 19.9 Limpar banco de dados (se necessário)
  - Verificar se há tabelas/colunas não mais usadas
  - Criar migration para limpeza (se aplicável)
  - Documentar mudanças no schema
  - Fazer backup antes de aplicar

- [x] 19.10 Verificação final de limpeza
  - Executar build de produção
  - Verificar que não há erros
  - Executar todos os testes
  - Verificar bundle size
  - Confirmar que aplicação funciona corretamente


---

## FASE 20: Documentação Final

- [x] 20.1 Atualizar documentação técnica
  - Documentar arquitetura da nova página
  - Documentar APIs e serviços
  - Documentar componentes principais
  - Adicionar diagramas de fluxo
  - _Requisitos: 14.5_

- [x] 20.2 Criar guia de usuário para administradores
  - Documentar como usar a nova página
  - Criar screenshots e vídeos tutoriais
  - Documentar todas as funcionalidades
  - Incluir FAQs
  - _Requisitos: 14.5_

- [x] 20.3 Documentar mudanças e migração
  - Criar changelog detalhado
  - Documentar diferenças das páginas antigas
  - Criar guia de migração
  - Documentar breaking changes (se houver)
  - _Requisitos: 14.5_

- [x] 20.4 Atualizar README do projeto
  - Atualizar seção de admin
  - Adicionar link para nova página
  - Atualizar instruções de desenvolvimento
  - Atualizar instruções de deploy

- [x] 20.5 Criar documentação de troubleshooting
  - Documentar problemas comuns e soluções
  - Adicionar guia de debugging
  - Documentar logs e monitoramento
  - Incluir contatos de suporte

---

## Checkpoint Final

- [x] 21. Revisão completa e deploy final
  - Verificar que todas as tasks foram completadas
  - Executar todos os testes (unitários, propriedade, integração)
  - Fazer code review completo
  - Verificar performance em produção
  - Confirmar que todas as 29 propriedades de corretude são validadas
  - Verificar que todos os 15 requisitos são atendidos
  - Deploy final em produção
  - Monitorar por 48h após deploy
  - Celebrar o sucesso! 🎉



---

## Resumo de Estimativas por Fase

| Fase | Descrição | Estimativa | Complexidade |
|------|-----------|------------|--------------|
| 1 | Fundação - Tipos e Interfaces | 1-2 dias | Média |
| 2 | Hooks e Gerenciamento de Estado | 1-2 dias | Média |
| 3 | Componentes Base da UI | 2-3 dias | Alta |
| 4 | Sistema de Filtros | 1-2 dias | Média |
| 5 | Funcionalidade de Busca | 1 dia | Baixa |
| 6 | Painel de Detalhes | 2 dias | Alta |
| 7 | Atualização de Status Individual | 1-2 dias | Média |
| 8 | Ações em Massa | 2-3 dias | Alta |
| 9 | Geração de Etiquetas | 1-2 dias | Média |
| 10 | Exportação CSV | 1 dia | Baixa |
| 11 | Otimizações de Performance | 1-2 dias | Média |
| 12 | Segurança e Auditoria | 1-2 dias | Alta |
| 13 | Testes Unitários | 2-3 dias | Média |
| 14 | Testes de Propriedade (PBT) | 2-3 dias | Alta |
| 15 | Testes de Integração | 1-2 dias | Média |
| 16 | Responsividade Mobile | 1-2 dias | Média |
| 17 | Feature Flag e Redirecionamentos | 1 dia | Baixa |
| 18 | Período de Transição | 2 semanas | N/A |
| 19 | **LIMPEZA E ORGANIZAÇÃO** | 1-2 dias | Média |
| 20 | Documentação Final | 1-2 dias | Baixa |
| **TOTAL** | **20-30 dias + 2 semanas de transição** | | |

---

## Notas Importantes

### Sobre Tasks Opcionais (marcadas com *)

Tasks marcadas com `*` são opcionais e focadas em testes. Elas podem ser puladas para acelerar o MVP, mas são altamente recomendadas para garantir qualidade e robustez do sistema.

### Sobre a Fase 19 (Limpeza e Organização)

Esta fase foi explicitamente solicitada pelo usuário e é **CRÍTICA** para o sucesso do projeto. Ela garante que:
- Código antigo não cause confusão
- Não haja código morto no repositório
- A base de código fique limpa e manutenível
- Não haja conflitos entre implementações antigas e novas

### Ordem de Execução

As fases devem ser executadas na ordem apresentada, pois cada fase depende das anteriores. No entanto, dentro de cada fase, algumas tasks podem ser executadas em paralelo.

### Cobertura de Requisitos

Todas as 15 user stories e seus critérios de aceitação estão cobertos pelas tasks. Cada task referencia explicitamente os requisitos que implementa.

### Cobertura de Propriedades

Todas as 29 propriedades de corretude definidas no design estão cobertas pelos testes de propriedade na Fase 14.

### Tecnologias Utilizadas

- **Frontend**: React 18+ com TypeScript
- **State Management**: TanStack Query (React Query)
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Testing**: Vitest + React Testing Library + fast-check
- **Build**: Vite

---

## Próximos Passos

Para iniciar a implementação:

1. Abra este arquivo `tasks.md`
2. Clique em "Start task" na primeira task da Fase 1
3. Siga as instruções e requisitos de cada task
4. Marque tasks como completas conforme avança
5. Use os checkpoints para validar progresso

Boa implementação! 🚀
