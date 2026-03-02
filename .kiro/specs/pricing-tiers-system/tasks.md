# Plano de Implementação: Sistema de Níveis de Preço

## Visão Geral

Este documento detalha as tarefas de implementação para o sistema de níveis de preço (pricing tiers), que substituirá o modelo atual de precificação individual por coleção. O sistema permitirá que administradores definam níveis de preço reutilizáveis e atribuam múltiplas coleções a cada nível, com propagação automática de mudanças de preço.

## Stack Tecnológica

- Backend: Supabase (PostgreSQL + Edge Functions)
- Frontend: React 18 + TypeScript + Vite
- UI: Radix UI + Tailwind CSS + shadcn/ui
- State Management: TanStack Query (React Query)
- Validação: Zod
- Testes: Vitest + fast-check (property-based testing)

## Tarefas

- [x] 1. Configurar estrutura base do banco de dados
  - [x] 1.1 Criar tabela pricing_tiers com constraints e índices
    - Criar tabela com campos: id, name, description, price_full, deposit_amount, pix_discount_percentage, price_pix (calculado), is_active, is_default, display_order, created_at, updated_at, created_by, updated_by
    - Adicionar constraints: CHECK para valores positivos, UNIQUE para name, CHECK para deposit < price_full, CHECK para apenas um nível padrão
    - Criar índices: idx_pricing_tiers_active, idx_pricing_tiers_default, idx_pricing_tiers_display_order
    - _Requisitos: 1.2, 1.3, 7.1, 7.2, 7.3, 9.2_

  - [x] 1.2 Criar tabela collection_tier_assignments
    - Criar tabela com campos: id, collection_id, tier_id, assigned_at, assigned_by, previous_tier_id
    - Adicionar constraint UNIQUE(collection_id) para garantir apenas um nível por coleção
    - Criar índices: idx_collection_tier_assignments_collection, idx_collection_tier_assignments_tier, idx_collection_tier_assignments_assigned_at
    - _Requisitos: 2.3_

  - [x] 1.3 Criar tabela pricing_history para auditoria
    - Criar tabela com campos: id, tier_id, collection_id, change_type, old_price_full, new_price_full, old_price_pix, new_price_pix, old_deposit_amount, new_deposit_amount, changed_at, changed_by, metadata (JSONB)
    - Adicionar constraint CHECK para garantir tier_id OU collection_id presente
    - Criar índices: idx_pricing_history_tier, idx_pricing_history_collection, idx_pricing_history_changed_at, idx_pricing_history_change_type
    - _Requisitos: 3.5, 8.1, 8.2, 8.4_

  - [x] 1.4 Criar tabela migration_audit
    - Criar tabela com campos: id, migration_type, collections_affected, tiers_created, started_at, completed_at, status, executed_by, error_message, migration_data (JSONB)
    - Adicionar constraint CHECK para validar status e completed_at
    - Criar índices: idx_migration_audit_status, idx_migration_audit_started_at
    - _Requisitos: 5.6, 5.7_


  - [x] 1.5 Modificar tabela collections para suportar níveis
    - Adicionar coluna uses_tier_pricing BOOLEAN NOT NULL DEFAULT false
    - Criar índice idx_collections_uses_tier_pricing
    - Manter campos existentes (price_full, price_pix, deposit_amount, is_price_custom) para compatibilidade
    - _Requisitos: 2.2, 6.2_

- [x] 2. Implementar funções e stored procedures do banco de dados
  - [x] 2.1 Criar função create_pricing_tier
    - Implementar validações: price_full > 0, deposit_amount > 0, deposit < price_full, pix_discount entre 0-100
    - Remover flag is_default de outros níveis se novo nível for padrão
    - Calcular price_pix automaticamente: ROUND(price_full * (1 - pix_discount_percentage / 100), 2)
    - Registrar criação em pricing_history
    - _Requisitos: 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 2.2 Escrever teste de propriedade para create_pricing_tier
    - **Propriedade 1: Cálculo Automático de Preço PIX**
    - **Propriedade 17: Validação de Preço Cheio Positivo**
    - **Propriedade 18: Validação de Entrada Positiva**
    - **Propriedade 19: Validação de Entrada Menor que Preço Cheio**
    - **Propriedade 20: Validação de Percentual de Desconto**
    - **Valida: Requisitos 1.4, 7.1, 7.2, 7.3, 7.4**

  - [x] 2.3 Criar função update_pricing_tier
    - Implementar mesmas validações de create_pricing_tier
    - Buscar valores atuais do nível
    - Verificar se preços mudaram para decidir se propaga
    - Atualizar nível com novos valores (usar COALESCE para campos opcionais)
    - Registrar mudança em pricing_history
    - Chamar propagate_tier_prices se preços mudaram
    - _Requisitos: 1.6, 3.1, 3.2, 3.3, 8.1, 8.2_

  - [ ]* 2.4 Escrever teste de propriedade para update_pricing_tier
    - **Propriedade 9: Auditoria de Mudanças de Preço**
    - **Valida: Requisitos 3.5, 8.1, 8.2**

  - [x] 2.5 Criar função propagate_tier_prices
    - Buscar dados do nível
    - Iterar sobre coleções atribuídas (WHERE tier_id = p_tier_id AND uses_tier_pricing = true)
    - Para cada coleção: UPDATE prices, INSERT pricing_history
    - Capturar exceções individuais e continuar processando
    - Retornar TABLE com collection_id, old_price, new_price, success, error_message
    - Registrar contadores de sucesso/falha
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.6_

  - [ ]* 2.6 Escrever teste de propriedade para propagate_tier_prices
    - **Propriedade 8: Propagação de Mudanças de Preço**
    - **Propriedade 10: Propagação Continua Após Falhas Parciais**
    - **Valida: Requisitos 3.1, 3.2, 3.3, 3.6**

  - [x] 2.7 Criar função assign_collection_to_tier
    - Validar que nível existe e está ativo (is_active = true)
    - Validar que coleção existe
    - Buscar atribuição anterior (se existir)
    - Remover atribuição anterior e registrar em pricing_history
    - Criar nova atribuição em collection_tier_assignments
    - Atualizar coleção: uses_tier_pricing = true, is_price_custom = false, copiar preços do nível
    - Registrar atribuição em pricing_history
    - _Requisitos: 2.1, 2.2, 2.5, 2.6, 8.4_

  - [ ]* 2.8 Escrever teste de propriedade para assign_collection_to_tier
    - **Propriedade 4: Desativação Previne Novas Atribuições**
    - **Propriedade 5: Atribuição Atualiza Preços da Coleção**
    - **Propriedade 22: Auditoria de Atribuições de Nível**
    - **Valida: Requisitos 1.8, 2.2, 2.6, 8.4**

  - [x] 2.9 Criar função unassign_collection_from_tier
    - Buscar atribuição atual
    - Buscar dados atuais da coleção
    - Buscar preços padrão de system_settings
    - Remover atribuição de collection_tier_assignments
    - Atualizar coleção: uses_tier_pricing = false, is_price_custom = false, aplicar preços padrão
    - Registrar remoção em pricing_history
    - _Requisitos: 2.7, 2.8_

  - [ ]* 2.10 Escrever teste de propriedade para unassign_collection_from_tier
    - **Propriedade 7: Remoção de Nível Reverte para Padrão**
    - **Valida: Requisitos 2.8**

  - [x] 2.11 Criar função analyze_pricing_for_migration
    - Agrupar coleções por (price_full, price_pix, deposit_amount) idênticos
    - Contar coleções em cada grupo
    - Agregar collection_ids em array
    - Sugerir nome de nível baseado na contagem (ex: "Nível 1", "Nível 2")
    - Retornar TABLE com price_full, price_pix, deposit_amount, collection_count, collection_ids, suggested_tier_name
    - _Requisitos: 5.2, 5.3_

  - [ ]* 2.12 Escrever teste de propriedade para analyze_pricing_for_migration
    - **Propriedade 12: Agrupamento de Coleções por Preços Idênticos**
    - **Valida: Requisitos 5.2, 5.3**


- [x] 3. Criar views e triggers do banco de dados
  - [x] 3.1 Criar view pricing_tiers_with_stats
    - Juntar pricing_tiers com contagem de coleções atribuídas
    - Calcular collections_count, active_collections_count
    - Incluir todos os campos de pricing_tiers
    - _Requisitos: 1.9, 11.2_

  - [x] 3.2 Criar view collection_effective_pricing
    - Mostrar preços efetivos de cada coleção (de nível ou customizado ou padrão)
    - Incluir: collection_id, collection_name, slug, is_price_custom, pricing_tier_id, tier_name, effective_price_full, effective_price_pix, effective_deposit_amount, pricing_source
    - Usar CASE para determinar pricing_source: 'custom', 'tier', ou 'default'
    - _Requisitos: 4.1, 4.2, 4.3, 4.5_

  - [x] 3.3 Criar trigger para garantir apenas um nível padrão
    - Trigger BEFORE INSERT OR UPDATE em pricing_tiers
    - Se is_default = true, UPDATE outros níveis para is_default = false
    - _Requisitos: 9.2_

  - [ ]* 3.4 Escrever teste de propriedade para trigger de nível padrão único
    - **Propriedade 23: Apenas Um Nível Padrão**
    - **Valida: Requisitos 9.2**

  - [x] 3.5 Criar trigger para atribuir nível padrão a novas coleções
    - Trigger AFTER INSERT em collections
    - Se exists nível com is_default = true AND is_active = true, atribuir à nova coleção
    - Se não exists nível padrão, usar preços de system_settings
    - _Requisitos: 9.3, 9.6_

  - [ ]* 3.6 Escrever teste de propriedade para trigger de atribuição automática
    - **Propriedade 24: Novas Coleções Recebem Nível Padrão**
    - **Propriedade 25: Sem Nível Padrão Usa Configurações do Sistema**
    - **Valida: Requisitos 9.3, 9.6**

  - [x] 3.7 Criar trigger para prevenir desativação de nível padrão
    - Trigger BEFORE UPDATE em pricing_tiers
    - Se is_default = true AND is_active está mudando para false, RAISE EXCEPTION
    - _Requisitos: 9.7_

  - [ ]* 3.8 Escrever teste de propriedade para trigger de proteção de nível padrão
    - **Propriedade 26: Prevenir Desativação do Nível Padrão**
    - **Valida: Requisitos 9.7**

  - [x] 3.9 Criar trigger para remover tier_id quando is_price_custom = true
    - Trigger BEFORE UPDATE em collections
    - Se is_price_custom está mudando para true, SET pricing_tier_id = NULL
    - _Requisitos: 6.2_

  - [ ]* 3.10 Escrever teste de propriedade para trigger de preço customizado
    - **Propriedade 15: Preço Customizado Remove Atribuição de Nível**
    - **Valida: Requisitos 6.2**

- [x] 4. Configurar Row Level Security (RLS) policies
  - [x] 4.1 Criar RLS policies para pricing_tiers
    - SELECT: permitir para usuários autenticados
    - INSERT/UPDATE/DELETE: permitir apenas para admins (verificar role em auth.users)
    - _Requisitos: 12.7_

  - [x] 4.2 Criar RLS policies para collection_tier_assignments
    - SELECT: permitir para usuários autenticados
    - INSERT/UPDATE/DELETE: permitir apenas para admins
    - _Requisitos: 12.7_

  - [x] 4.3 Criar RLS policies para pricing_history
    - SELECT: permitir para admins
    - INSERT: permitir via triggers/functions (SECURITY DEFINER)
    - UPDATE/DELETE: negar (tabela append-only)
    - _Requisitos: 8.6_

  - [x] 4.4 Criar RLS policies para migration_audit
    - SELECT: permitir para admins
    - INSERT/UPDATE: permitir via Edge Functions (SECURITY DEFINER)
    - DELETE: negar
    - _Requisitos: 5.7_

- [x] 5. Checkpoint - Validar estrutura do banco de dados
  - Executar todas as migrations
  - Verificar que todas as tabelas, índices, views, triggers e policies foram criados
  - Testar funções manualmente com dados de exemplo
  - Garantir que todos os testes de propriedade do banco de dados passam
  - Perguntar ao usuário se há dúvidas ou ajustes necessários


- [x] 6. Implementar Edge Functions do Supabase
  - [x] 6.1 Criar Edge Function propagate-tier-pricing
    - Validar autenticação e permissões de admin
    - Receber tierId no body
    - Chamar função propagate_tier_prices do banco
    - Processar resultados e contar sucessos/falhas
    - Retornar JSON com updated_count, failed_count, error_messages
    - Tratar erros e retornar status HTTP apropriado
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7, 12.8_

  - [ ]* 6.2 Escrever testes de integração para propagate-tier-pricing
    - Testar propagação bem-sucedida
    - Testar falhas parciais
    - Testar sem autenticação (deve retornar 401)
    - Testar com usuário não-admin (deve retornar 403)
    - _Requisitos: 12.7, 12.8_

  - [x] 6.3 Criar Edge Function bulk-assign-tier
    - Validar autenticação e permissões de admin
    - Receber collection_ids[] e tier_id no body
    - Validar que tier existe e está ativo
    - Para cada collection_id: chamar assign_collection_to_tier
    - Acumular sucessos e falhas
    - Retornar JSON com success[], failed[{id, error}]
    - _Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 6.4 Escrever testes de integração para bulk-assign-tier
    - Testar atribuição em massa bem-sucedida
    - Testar falhas parciais
    - Testar validação de tier inativo
    - _Requisitos: 10.4, 10.5, 10.6_

  - [x] 6.5 Criar Edge Function migrate-to-tiers
    - Validar autenticação e permissões de admin
    - Receber dryRun (boolean) e autoCreateTiers (boolean) no body
    - Se dryRun = true: chamar analyze_pricing_for_migration e retornar plano
    - Se dryRun = false: executar migração
      - Para cada grupo de preços: criar nível, atribuir coleções
      - Preservar dados customizados em migration_audit
      - Registrar operação em migration_audit
    - Retornar JSON com tiersCreated, collectionsAssigned, errors[]
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 6.6 Escrever testes de integração para migrate-to-tiers
    - Testar dry run (não deve modificar dados)
    - Testar migração real
    - Testar preservação de dados customizados
    - **Propriedade 13: Migração Cria Atribuições**
    - **Propriedade 14: Preservação de Dados Customizados**
    - **Valida: Requisitos 5.5, 5.6**

  - [x] 6.7 Criar Edge Function get-pricing-reports
    - Validar autenticação e permissões de admin
    - Receber reportType e dateRange no body
    - Implementar relatórios: collections_by_tier, revenue_by_tier, conversion_by_tier
    - Retornar JSON com dados do relatório
    - _Requisitos: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 6.8 Escrever testes de integração para get-pricing-reports
    - **Propriedade 27: Relatório de Contagem de Coleções por Nível**
    - **Propriedade 28: Relatório de Distribuição de Receita**
    - **Propriedade 29: Relatório de Taxa de Conversão**
    - **Valida: Requisitos 11.2, 11.3, 11.4**

- [x] 7. Criar tipos TypeScript e schemas de validação
  - [x] 7.1 Criar interfaces TypeScript em src/types/pricing-tiers.ts
    - Definir interfaces: PricingTier, CollectionTierAssignment, PricingHistory, MigrationAudit, CollectionWithPricing
    - Definir tipos de input: CreatePricingTierInput, UpdatePricingTierInput, AssignTierInput, BulkAssignTierInput
    - Definir tipos auxiliares: MigrationSuggestion, PropagationResult, BulkAssignResult
    - _Requisitos: todos (tipos base)_

  - [x] 7.2 Criar schemas Zod em src/lib/validations/pricing-tiers.ts
    - Implementar pricingTierSchema com validações:
      - name: string, min 1, max 100, regex alfanumérico
      - price_full: number, positive, max 999999.99
      - deposit_amount: number, positive, max 999999.99
      - pix_discount_percentage: number, min 0, max 100, default 5
      - Refine: deposit_amount < price_full
    - Implementar updatePricingTierSchema (partial + is_active)
    - Implementar assignTierSchema (collection_id UUID, tier_id UUID)
    - Implementar bulkAssignTierSchema (collection_ids UUID[], tier_id UUID)
    - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 7.3 Escrever testes de propriedade para schemas Zod
    - **Propriedade 2: Unicidade de Nome de Nível** (validação client-side)
    - **Propriedade 3: Campos Obrigatórios na Criação de Nível**
    - **Propriedade 17-21: Validações de Preço**
    - **Valida: Requisitos 1.2, 1.3, 7.1, 7.2, 7.3, 7.4, 7.5**


- [x] 8. Implementar hooks React Query para gerenciamento de estado
  - [x] 8.1 Criar hook usePricingTiers em src/hooks/usePricingTiers.ts
    - Implementar useQuery para buscar todos os níveis (com stats)
    - Implementar useQuery para buscar níveis ativos
    - Implementar useMutation para criar nível
    - Implementar useMutation para atualizar nível
    - Implementar useMutation para desativar nível
    - Configurar invalidação de cache apropriada
    - _Requisitos: 1.1, 1.5, 1.6, 1.7, 12.1_

  - [x] 8.2 Criar hook useCollectionTierAssignment em src/hooks/useCollectionTierAssignment.ts
    - Implementar useQuery para buscar atribuição de coleção
    - Implementar useMutation para atribuir nível
    - Implementar useMutation para remover nível
    - Implementar useMutation para atribuição em massa
    - Configurar invalidação de cache apropriada
    - _Requisitos: 2.1, 2.4, 2.5, 2.7, 10.1_

  - [x] 8.3 Criar hook usePricingHistory em src/hooks/usePricingHistory.ts
    - Implementar useQuery para buscar histórico de nível
    - Implementar useQuery para buscar histórico de coleção
    - Implementar filtros: dateRange, changeType, userId
    - _Requisitos: 8.3, 8.5_

  - [x] 8.4 Criar hook useMigration em src/hooks/useMigration.ts
    - Implementar useMutation para análise de migração (dry run)
    - Implementar useMutation para executar migração
    - Gerenciar estado de progresso da migração
    - _Requisitos: 5.1, 5.2, 5.4_

  - [x] 8.5 Criar hook usePricingReports em src/hooks/usePricingReports.ts
    - Implementar useQuery para relatório de contagem por nível
    - Implementar useQuery para relatório de receita por nível
    - Implementar useQuery para relatório de conversão por nível
    - Implementar filtros de data
    - _Requisitos: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 9. Implementar componentes de UI para gerenciamento de níveis
  - [x] 9.1 Criar componente PricingTiersManager
    - Implementar layout principal com Card
    - Integrar PricingTiersList
    - Integrar CreateTierDialog e EditTierDialog
    - Gerenciar estado de dialogs (aberto/fechado, tier em edição)
    - Implementar handlers para criar, editar, propagar preços
    - _Requisitos: 1.1, 1.5, 1.6_

  - [x] 9.2 Criar componente PricingTiersList
    - Exibir lista de níveis em formato de tabela ou cards
    - Mostrar: name, price_full, price_pix, deposit_amount, collections_count, is_active, is_default
    - Implementar ações: editar, desativar, propagar preços
    - Implementar indicador visual para nível padrão
    - Implementar ordenação por display_order
    - _Requisitos: 1.5, 1.9, 9.5_

  - [x] 9.3 Criar componente CreateTierDialog
    - Implementar formulário com campos: name, description, price_full, deposit_amount, pix_discount_percentage, is_default
    - Calcular e exibir price_pix em tempo real
    - Integrar validação Zod
    - Exibir erros de validação
    - Implementar submit com useMutation
    - _Requisitos: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 9.4 Escrever testes unitários para CreateTierDialog
    - Testar validação de campos vazios
    - Testar cálculo automático de price_pix
    - Testar submit bem-sucedido
    - Testar exibição de erros
    - _Requisitos: 1.1, 1.2, 1.3, 1.4_

  - [x] 9.5 Criar componente EditTierDialog
    - Implementar formulário similar ao CreateTierDialog
    - Pré-preencher com dados do nível existente
    - Adicionar campo is_active
    - Implementar submit com useMutation
    - Exibir aviso se mudança de preço irá propagar
    - _Requisitos: 1.6, 1.7_

  - [ ]* 9.6 Escrever testes unitários para EditTierDialog
    - Testar pré-preenchimento de dados
    - Testar atualização de campos
    - Testar aviso de propagação
    - _Requisitos: 1.6_

  - [x] 9.7 Criar componente CollectionTierAssignment
    - Implementar Select com lista de níveis ativos
    - Exibir nível atual da coleção
    - Implementar botões Salvar/Cancelar (aparecem quando há mudanças)
    - Exibir badge se is_price_custom = true
    - Exibir card com detalhes do nível atual (price_full, price_pix, deposit_amount)
    - Implementar handlers para atribuir/remover nível
    - _Requisitos: 2.1, 2.4, 2.5, 2.7, 6.4_

  - [ ]* 9.8 Escrever testes unitários para CollectionTierAssignment
    - Testar seleção de nível
    - Testar exibição de nível atual
    - Testar desabilitação quando is_price_custom = true
    - _Requisitos: 2.1, 2.4, 6.4_


- [-] 10. Implementar componente de migração
  - [x] 10.1 Criar componente MigrationWizard
    - Implementar Dialog com 3 steps: preview, confirm, result
    - Step 1 (preview): botão "Analisar Coleções", exibir loading
    - Step 2 (confirm): exibir plano de migração com cards por nível sugerido
      - Mostrar: suggested_tier_name, price_full, price_pix, deposit_amount, collections_count
      - Listar primeiras 5 coleções + badge "+X mais"
    - Step 3 (result): exibir resumo (tiersCreated, collectionsAssigned, errors)
    - Implementar navegação entre steps
    - _Requisitos: 5.1, 5.2, 5.4, 5.7_

  - [ ]* 10.2 Escrever testes unitários para MigrationWizard
    - Testar navegação entre steps
    - Testar exibição de plano de migração
    - Testar exibição de resumo
    - _Requisitos: 5.1, 5.4, 5.7_

  - [x] 10.3 Integrar MigrationWizard no PricingTiersManager
    - Adicionar botão "Migrar para Níveis" no header
    - Gerenciar estado de dialog aberto/fechado
    - _Requisitos: 5.1_

- [ ] 11. Implementar componentes de relatórios
  - [ ] 11.1 Criar componente PricingReportsCard
    - Implementar Card com título "Relatórios de Níveis"
    - Adicionar Select para escolher tipo de relatório
    - Adicionar DateRangePicker para filtrar por data
    - Exibir gráfico ou tabela baseado no tipo de relatório
    - Implementar botão de exportação (CSV/PDF)
    - _Requisitos: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ] 11.2 Criar componente CollectionsByTierChart
    - Implementar gráfico de barras mostrando contagem de coleções por nível
    - Usar biblioteca de gráficos (ex: recharts)
    - _Requisitos: 11.2_

  - [ ] 11.3 Criar componente RevenueByTierChart
    - Implementar gráfico de pizza mostrando distribuição de receita por nível
    - _Requisitos: 11.3_

  - [ ] 11.4 Criar componente ConversionByTierTable
    - Implementar tabela mostrando taxa de conversão por nível
    - Colunas: tier_name, views, purchases, conversion_rate
    - _Requisitos: 11.4_

- [-] 12. Implementar funcionalidades de atribuição em massa
  - [x] 12.1 Criar componente BulkAssignDialog
    - Implementar Dialog com lista de coleções (checkboxes)
    - Adicionar filtros: por nível atual, por faixa de preço, por nome
    - Implementar Select para escolher nível de destino
    - Exibir prévia: "X coleções serão atribuídas ao nível Y"
    - Implementar botão "Executar Atribuição"
    - Exibir progresso durante atribuição
    - Exibir resumo: sucessos e falhas
    - _Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 12.2 Escrever testes unitários para BulkAssignDialog
    - Testar seleção de coleções
    - Testar filtros
    - Testar prévia
    - _Requisitos: 10.1, 10.2, 10.3_

  - [x] 12.3 Integrar BulkAssignDialog no PricingTiersManager
    - Adicionar botão "Atribuição em Massa"
    - Gerenciar estado de dialog
    - _Requisitos: 10.1_

- [ ] 13. Implementar visualização de histórico de preços
  - [ ] 13.1 Criar componente PricingHistoryTimeline
    - Implementar timeline vertical mostrando mudanças de preço
    - Para cada entrada: timestamp, field_name, old_value → new_value, changed_by
    - Implementar filtros: dateRange, changeType
    - Implementar paginação
    - _Requisitos: 8.3, 8.5_

  - [ ] 13.2 Integrar PricingHistoryTimeline no EditTierDialog
    - Adicionar tab "Histórico" no dialog
    - Exibir histórico do nível sendo editado
    - _Requisitos: 8.3_

  - [ ] 13.3 Criar componente para exportar histórico
    - Implementar botão "Exportar CSV"
    - Gerar CSV com todas as colunas de pricing_history
    - Aplicar filtros ativos antes de exportar
    - _Requisitos: 8.7_


- [ ] 14. Implementar funcionalidades de preço customizado
  - [ ] 14.1 Criar componente CustomPricingToggle
    - Implementar Switch para habilitar/desabilitar preço customizado
    - Exibir aviso: "Ao habilitar preço customizado, a atribuição de nível será removida"
    - Quando habilitado: exibir campos para price_full, price_pix, deposit_amount
    - Quando desabilitado: solicitar seleção de nível
    - Implementar validações Zod
    - _Requisitos: 6.1, 6.2, 6.3, 6.5_

  - [ ]* 14.2 Escrever testes unitários para CustomPricingToggle
    - Testar habilitação de preço customizado
    - Testar desabilitação e solicitação de nível
    - Testar validações
    - **Propriedade 16: Preço Customizado Previne Propagação**
    - **Valida: Requisitos 6.2, 6.6_

  - [ ] 14.2 Integrar CustomPricingToggle na página de edição de coleção
    - Adicionar seção "Precificação" na página
    - Exibir CustomPricingToggle
    - Exibir CollectionTierAssignment (se não customizado)
    - Exibir badge indicando tipo de precificação (customizado/nível/padrão)
    - _Requisitos: 6.1, 6.4_

- [ ] 15. Implementar APIs REST para integração externa
  - [ ] 15.1 Criar endpoint GET /api/pricing-tiers
    - Retornar lista de todos os níveis ativos
    - Incluir campos: id, name, price_full, price_pix, deposit_amount
    - Retornar JSON válido
    - Responder em < 200ms
    - _Requisitos: 12.1, 12.4, 12.6_

  - [ ]* 15.2 Escrever testes de integração para GET /api/pricing-tiers
    - **Propriedade 30: API Retorna JSON Válido**
    - **Valida: Requisitos 12.4**

  - [ ] 15.3 Criar endpoint GET /api/collections/:id/pricing
    - Retornar precificação efetiva da coleção
    - Incluir campos: price_full, price_pix, deposit_amount, tier_name (ou null)
    - Retornar JSON válido
    - Responder em < 200ms
    - _Requisitos: 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ]* 15.4 Escrever testes de integração para GET /api/collections/:id/pricing
    - **Propriedade 31: API Inclui Campos Obrigatórios de Precificação**
    - **Valida: Requisitos 12.5**

  - [ ] 15.5 Implementar autenticação em endpoints de escrita
    - Adicionar middleware de autenticação
    - Verificar token JWT válido
    - Verificar role de admin
    - Retornar 401 se não autenticado, 403 se não autorizado
    - _Requisitos: 12.7_

  - [ ]* 15.6 Escrever testes de integração para autenticação
    - **Propriedade 32: API Requer Autenticação para Operações de Escrita**
    - **Propriedade 33: API Retorna Códigos de Status HTTP Apropriados**
    - **Valida: Requisitos 12.7, 12.8**

- [ ] 16. Checkpoint - Validar integração frontend-backend
  - Testar criação de nível via UI
  - Testar atribuição de coleção via UI
  - Testar propagação de preços via UI
  - Testar migração via UI (em ambiente de staging)
  - Verificar que todos os testes unitários e de integração passam
  - Verificar que não há erros no console do navegador
  - Perguntar ao usuário se há dúvidas ou ajustes necessários

- [ ] 17. Implementar testes end-to-end com property-based testing
  - [ ] 17.1 Criar geradores fast-check para dados de teste
    - Implementar gerador para PricingTier válido
    - Implementar gerador para Collection válida
    - Implementar gerador para operações de atribuição
    - _Arquivo: src/test/generators/pricing-tiers.generators.ts_

  - [ ] 17.2 Escrever testes de propriedade para fluxo completo
    - **Propriedade 6: Coleção Tem Apenas Um Nível**
    - **Propriedade 11: Cálculo de Saldo Restante**
    - Testar fluxo: criar nível → atribuir coleções → atualizar preço → verificar propagação
    - Testar fluxo: criar coleção → atribuir nível → remover nível → verificar preços padrão
    - Testar fluxo: criar múltiplos níveis → garantir apenas um padrão
    - _Valida: Requisitos 2.3, 4.4, 9.2_

  - [ ]* 17.3 Escrever testes de propriedade para cenários de erro
    - Testar tentativa de atribuir a nível inativo
    - Testar tentativa de desativar nível padrão
    - Testar tentativa de criar nível com dados inválidos
    - Testar propagação com falhas parciais


- [ ] 18. Implementar melhorias de UX e acessibilidade
  - [ ] 18.1 Adicionar loading states em todos os componentes
    - Exibir Skeleton durante carregamento de listas
    - Exibir Spinner em botões durante mutations
    - Desabilitar inputs durante operações
    - _Requisitos: 10.5_

  - [ ] 18.2 Adicionar feedback visual para operações
    - Implementar toasts de sucesso/erro usando sonner
    - Implementar confirmação antes de operações destrutivas
    - Implementar indicadores de progresso para operações longas
    - _Requisitos: 3.7, 10.5, 10.6_

  - [ ] 18.3 Implementar acessibilidade (WCAG 2.1 AA)
    - Adicionar labels apropriados em todos os inputs
    - Garantir navegação por teclado em todos os componentes
    - Adicionar aria-labels em ícones e botões
    - Garantir contraste de cores adequado
    - Testar com leitor de tela

  - [ ] 18.4 Implementar responsividade
    - Adaptar layouts para mobile (< 768px)
    - Adaptar tabelas para mobile (usar cards ou scroll horizontal)
    - Testar em diferentes tamanhos de tela

  - [ ] 18.5 Adicionar animações e transições
    - Implementar transições suaves em dialogs
    - Implementar animações em listas (fade in)
    - Implementar feedback visual em hover/focus

- [ ] 19. Implementar funcionalidade de undo para operações em massa
  - [ ] 19.1 Criar sistema de undo para atribuição em massa
    - Armazenar estado anterior das coleções afetadas
    - Implementar botão "Desfazer" (disponível por 5 minutos)
    - Implementar timer visual mostrando tempo restante
    - Ao desfazer: restaurar atribuições anteriores
    - _Requisitos: 10.7_

  - [ ]* 19.2 Escrever testes unitários para sistema de undo
    - Testar armazenamento de estado anterior
    - Testar restauração de estado
    - Testar expiração do timer

- [ ] 20. Implementar documentação e ajuda contextual
  - [ ] 20.1 Adicionar tooltips explicativos
    - Adicionar tooltip em "Preço PIX" explicando o cálculo
    - Adicionar tooltip em "Nível Padrão" explicando o comportamento
    - Adicionar tooltip em "Propagar Preços" explicando a ação

  - [ ] 20.2 Criar página de ajuda sobre níveis de preço
    - Explicar conceito de níveis
    - Explicar diferença entre nível, customizado e padrão
    - Explicar propagação de preços
    - Incluir exemplos visuais

  - [ ] 20.3 Adicionar tour guiado (opcional)
    - Implementar tour para primeira vez usando biblioteca (ex: react-joyride)
    - Destacar funcionalidades principais
    - Permitir pular ou refazer tour

- [ ] 21. Otimizações de performance
  - [ ] 21.1 Implementar paginação em listas grandes
    - Adicionar paginação em PricingTiersList (se > 20 itens)
    - Adicionar paginação em PricingHistoryTimeline
    - Adicionar paginação em BulkAssignDialog

  - [ ] 21.2 Implementar virtualização para listas muito grandes
    - Usar react-virtual em listas com > 100 itens
    - Aplicar em lista de coleções no BulkAssignDialog

  - [ ] 21.3 Otimizar queries do banco de dados
    - Adicionar índices compostos se necessário
    - Analisar planos de execução de queries lentas
    - Implementar caching em views materializadas (se necessário)

  - [ ] 21.4 Implementar debounce em filtros e buscas
    - Adicionar debounce (300ms) em campos de busca
    - Adicionar debounce em filtros de data

- [ ] 22. Implementar monitoramento e logging
  - [ ] 22.1 Adicionar logging estruturado em Edge Functions
    - Logar todas as operações de escrita
    - Logar erros com stack trace
    - Incluir user_id, timestamp, operation_type em logs

  - [ ] 22.2 Implementar métricas de performance
    - Medir tempo de propagação de preços
    - Medir tempo de migração
    - Medir tempo de resposta de APIs

  - [ ] 22.3 Configurar alertas para erros críticos
    - Alertar se propagação falhar para > 10% das coleções
    - Alertar se migração falhar
    - Alertar se API response time > 1s


- [x] 23. Atualizar páginas de usuário para usar preços de níveis
  - [x] 23.1 Atualizar hook useCollectionPricing
    - Modificar para buscar preços da view collection_effective_pricing
    - Garantir compatibilidade com código existente (mesma interface de retorno)
    - Adicionar campo tier_name ao retorno (opcional)
    - _Requisitos: 4.1, 4.2, 4.3, 4.5, 12.3_

  - [x] 23.2 Atualizar página BuyCharacter.tsx
    - Verificar que usa useCollectionPricing (já implementado)
    - Testar que preços são exibidos corretamente com níveis
    - Testar que cálculo de saldo restante funciona
    - Adicionar indicador visual do nível (opcional, badge sutil)
    - _Requisitos: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 23.3 Escrever testes para BuyCharacter com preços de níveis
    - Testar exibição de preço de nível
    - Testar exibição de preço customizado
    - Testar exibição de preço padrão
    - Testar cálculo de saldo restante

  - [x] 23.4 Atualizar página SubscribeCollection.tsx
    - Verificar que usa preços corretos das coleções
    - Testar que planos de assinatura calculam valores corretamente
    - Garantir que mudanças de nível não quebram assinaturas existentes
    - _Requisitos: 4.1, 4.2_

  - [ ]* 23.5 Escrever testes para SubscribeCollection com preços de níveis
    - Testar cálculo de preço de plano com coleções de diferentes níveis
    - Testar que assinaturas existentes não são afetadas

  - [x] 23.6 Atualizar página de listagem de coleções (se existir)
    - Exibir preços corretos baseados em níveis
    - Adicionar filtro por faixa de preço (se aplicável)
    - _Requisitos: 4.1, 4.2_

  - [x] 23.7 Atualizar componente ProductionLimitBadge (se usa preços)
    - Verificar se componente usa preços de coleção
    - Garantir compatibilidade com preços de níveis
    - _Requisitos: 4.1_

  - [x] 23.8 Atualizar serviço standalone-purchase-service.ts
    - Verificar que busca preços corretos da coleção
    - Garantir que deposit_amount vem do nível correto
    - Testar criação de compra avulsa com preços de níveis
    - _Requisitos: 4.1, 4.3_

  - [ ]* 23.9 Escrever testes para standalone-purchase-service com níveis
    - Testar criação de compra com preço de nível
    - Testar criação de compra com preço customizado
    - Testar cálculo de deposit e balance

  - [x] 23.10 Atualizar Edge Function create-subscription
    - Verificar que busca preços corretos das coleções
    - Garantir que cálculo de total usa preços de níveis
    - Testar criação de assinatura com coleções de diferentes níveis
    - _Requisitos: 4.1, 4.2_

  - [ ]* 23.11 Escrever testes para create-subscription com níveis
    - Testar criação com coleções de mesmo nível
    - Testar criação com coleções de níveis diferentes
    - Testar que preços são calculados corretamente

  - [x] 23.12 Atualizar página de perfil do usuário (se exibe preços)
    - Verificar se exibe histórico de compras com preços
    - Garantir que preços históricos são preservados
    - _Requisitos: 4.1_

  - [x] 23.13 Checkpoint - Validar páginas de usuário
    - Testar fluxo completo de compra avulsa
    - Testar fluxo completo de assinatura
    - Verificar que preços são exibidos corretamente em todas as páginas
    - Verificar que não há erros no console
    - Testar com coleções de diferentes níveis
    - Testar com coleções com preço customizado
    - Perguntar ao usuário se há outras páginas que precisam ser atualizadas

- [ ] 24. Preparar para produção
  - [ ] 24.1 Executar migração em ambiente de staging
    - Fazer backup completo do banco de dados
    - Executar MigrationWizard em staging
    - Validar que todas as coleções foram migradas corretamente
    - Validar que preços estão corretos
    - Testar propagação de preços em staging
    - _Requisitos: 5.8_

  - [ ] 24.2 Criar plano de rollback
    - Documentar passos para reverter migração
    - Criar script SQL para restaurar estado anterior
    - Testar rollback em staging
    - _Requisitos: 5.8_

  - [ ] 24.3 Criar documentação técnica
    - Documentar estrutura do banco de dados
    - Documentar APIs e Edge Functions
    - Documentar componentes React
    - Documentar fluxos de dados
    - Incluir diagramas de arquitetura

  - [ ] 24.4 Criar documentação de usuário
    - Criar guia passo-a-passo para criar níveis
    - Criar guia para atribuir coleções
    - Criar guia para migração
    - Incluir screenshots e vídeos

  - [ ] 24.5 Executar testes de carga
    - Testar propagação com 100+ coleções
    - Testar atribuição em massa com 50+ coleções
    - Testar migração com dados reais
    - Validar que performance atende requisitos (< 5s para propagação)
    - _Requisitos: 3.4_

  - [ ] 24.6 Executar auditoria de segurança
    - Validar que RLS policies estão corretas
    - Validar que apenas admins podem modificar níveis
    - Validar que não há SQL injection vulnerabilities
    - Validar que dados sensíveis não são expostos em logs

  - [ ] 24.7 Executar testes de regressão
    - Validar que funcionalidades existentes não foram quebradas
    - Testar fluxo de compra com preços de nível
    - Testar fluxo de compra com preços customizados
    - Testar cálculo de saldo restante

- [ ] 25. Checkpoint final - Validação completa do sistema
  - Executar todos os testes (unitários, integração, propriedades, e2e)
  - Validar cobertura de testes (mínimo 80% para componentes, 90% para Edge Functions, 100% para funções de banco)
  - Validar que todos os requisitos foram implementados
  - Validar que todas as propriedades de correção passam
  - Fazer code review completo
  - Validar acessibilidade (WCAG 2.1 AA)
  - Validar performance (todas as operações dentro dos limites especificados)
  - Perguntar ao usuário se está pronto para deploy em produção

- [ ] 26. Deploy em produção
  - [ ] 26.1 Executar migrations do banco de dados em produção
    - Fazer backup completo antes de executar
    - Executar migrations em horário de baixo tráfego
    - Monitorar logs durante execução
    - Validar que todas as migrations foram aplicadas

  - [ ] 26.2 Deploy de Edge Functions
    - Deploy de propagate-tier-pricing
    - Deploy de bulk-assign-tier
    - Deploy de migrate-to-tiers
    - Deploy de get-pricing-reports
    - Validar que todas as functions estão respondendo

  - [ ] 26.3 Deploy do frontend
    - Build de produção
    - Deploy para CDN
    - Validar que não há erros no console
    - Validar que todas as páginas carregam corretamente

  - [ ] 26.4 Executar smoke tests em produção
    - Testar criação de nível
    - Testar atribuição de coleção
    - Testar visualização de preços no frontend público
    - Validar que APIs estão respondendo

  - [ ] 26.5 Monitorar sistema após deploy
    - Monitorar logs por 24 horas
    - Monitorar métricas de performance
    - Monitorar erros e exceções
    - Estar preparado para rollback se necessário

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia os requisitos específicos que valida para rastreabilidade
- Checkpoints garantem validação incremental e oportunidade para feedback do usuário
- Testes de propriedade validam propriedades universais de correção
- Testes unitários validam exemplos específicos e casos extremos
- A ordem de implementação segue dependências naturais: banco → API → frontend → testes → produção

## Estimativa de Esforço

- Fase 1-5 (Banco de Dados): ~3-4 dias
- Fase 6 (Edge Functions): ~2-3 dias
- Fase 7-8 (Tipos e Hooks): ~1-2 dias
- Fase 9-14 (Componentes UI): ~4-5 dias
- Fase 15 (APIs REST): ~1-2 dias
- Fase 17 (Testes E2E): ~2-3 dias
- Fase 18-22 (UX, Performance, Monitoring): ~2-3 dias
- Fase 23 (Atualização de Páginas de Usuário): ~2-3 dias
- Fase 24 (Preparação para Produção): ~2-3 dias
- Fase 25-26 (Deploy): ~1-2 dias

**Total estimado: 20-28 dias de desenvolvimento**

## Dependências Externas

- Supabase CLI para migrations
- fast-check para property-based testing
- recharts para gráficos de relatórios
- sonner para toasts
- react-joyride para tour guiado (opcional)
- react-virtual para virtualização de listas (opcional)
