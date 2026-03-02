# Plano de Implementação: Reestruturação do Sistema de Preços

## Visão Geral

Este plano implementa a reestruturação completa do sistema de preços, estabelecendo a hierarquia correta: **Níveis de Preço → Modalidades de Compra → Coleções**. A implementação corrige a arquitetura atual onde `subscription_plans` e `pricing_tiers` operam como sistemas paralelos e desconectados.

**Tecnologias:** PostgreSQL (Supabase), TypeScript, React 18, Zod, Vitest, fast-check

**Abordagem:** Implementação incremental com validação contínua através de testes de propriedade e testes unitários.

## Tarefas

- [x] 1. Preparação do Banco de Dados
  - [x] 1.1 Criar tabela purchase_modes com configurações padrão
    - Criar migration `create_purchase_modes.sql`
    - Incluir 4 modalidades padrão: standalone (1.0), trimestral (0.93), semestral (0.86), anual (0.79)
    - Adicionar índices para `is_active` e `display_order`
    - Configurar RLS para authenticated users e admins
    - _Requisitos: 3.1, 3.2_
  
  - [x] 1.2 Adicionar colunas de hierarquia em subscription_plans
    - Criar migration `add_tier_hierarchy_to_plans.sql`
    - Adicionar colunas: `tier_id`, `plan_mode`, `price_multiplier`
    - Criar UNIQUE constraint em (tier_id, plan_mode)
    - Criar índices para `tier_id` e `plan_mode`
    - Popular `plan_mode` baseado em `plan_type` existente
    - _Requisitos: 1.3, 1.4, 1.5_
  
  - [x] 1.3 Criar tabela purchase_mode_history para auditoria
    - Criar migration com campos: mode_key, field_name, old_value, new_value, changed_at, changed_by
    - Adicionar índices para consultas de histórico
    - _Requisitos: 3.7, 9.2_
  
  - [x] 1.4 Criar view pricing_tiers_with_plans
    - Criar view consolidada mostrando níveis com todos os planos
    - Incluir estatísticas: assigned_collections_count, active_subscriptions_count
    - Configurar permissões para authenticated e anon
    - _Requisitos: 11.7_
  
  - [ ]* 1.5 Escrever testes unitários para estrutura de banco de dados
    - Testar existência de colunas tier_id e plan_mode em subscription_plans
    - Testar constraints UNIQUE e CHECK
    - Testar índices criados
    - _Requisitos: 1.3, 1.4, 1.5_

- [x] 2. Funções de Negócio (Stored Procedures)
  - [x] 2.1 Implementar função create_tier_with_plans
    - Criar stored procedure que cria nível e planos automaticamente
    - Validar: price_full > 0, deposit_amount > 0, deposit < price_full
    - Criar um plano para cada modalidade ativa
    - Calcular preços: plan_price = tier_price * multiplier
    - Registrar em pricing_history
    - _Requisitos: 1.1, 1.2, 8.1, 8.5_
  
  - [ ]* 2.2 Escrever teste de propriedade para create_tier_with_plans
    - **Propriedade 1: Criação Automática de Planos**
    - **Valida: Requisitos 1.1, 8.1**
    - Gerar entradas aleatórias: name, price_full, deposit_amount
    - Verificar que plans_created = número de modalidades ativas
    - Executar 100 iterações com fast-check
  
  - [x] 2.3 Implementar função update_tier_and_recalculate_plans
    - Criar stored procedure que atualiza nível e recalcula planos
    - Recalcular preços de todos os planos do nível
    - Propagar para coleções usando função existente
    - Registrar mudanças em pricing_history
    - _Requisitos: 1.2, 4.1, 4.4, 6.5_
  
  - [ ]* 2.4 Escrever teste de propriedade para update_tier_and_recalculate_plans
    - **Propriedade 2: Recálculo Automático de Preços de Planos**
    - **Valida: Requisitos 1.2, 4.1, 6.5**
    - Gerar preços inicial e atualizado aleatórios
    - Verificar que cada plano tem preço = tier_price * multiplier (±0.01)
    - Executar 100 iterações
  
  - [x] 2.5 Implementar função update_purchase_mode_multiplier
    - Criar stored procedure que atualiza multiplicador de modalidade
    - Validar multiplicador entre 0.1 e 2.0
    - Recalcular todos os planos dessa modalidade em todos os níveis
    - Registrar em purchase_mode_history e pricing_history
    - _Requisitos: 3.3, 3.4, 3.7_
  
  - [ ]* 2.6 Escrever teste de propriedade para update_purchase_mode_multiplier
    - **Propriedade 10: Recálculo por Mudança de Multiplicador**
    - **Valida: Requisitos 3.3**
    - Gerar multiplicadores aleatórios válidos (0.1 a 2.0)
    - Verificar que todos os planos da modalidade foram recalculados
    - Verificar registro em purchase_mode_history
  
  - [x] 2.7 Criar triggers para auditoria automática
    - Trigger para registrar mudanças em purchase_modes
    - Trigger para atualizar updated_at automaticamente
    - _Requisitos: 9.2, 9.3_

- [x] 3. Checkpoint - Validar Funções de Banco de Dados
  - Executar todos os testes de propriedade e unitários
  - Verificar que todas as funções retornam resultados esperados
  - Perguntar ao usuário se há dúvidas ou ajustes necessários

- [ ] 4. Função de Migração de Dados
  - [ ] 4.1 Implementar função migrate_plans_to_tiers (dry run)
    - Criar stored procedure com parâmetro p_dry_run
    - Agrupar planos existentes por plan_mode e preços similares
    - Retornar plano de migração em formato JSONB
    - Contar: tiers_to_create, plans_to_migrate, subscriptions_to_preserve
    - _Requisitos: 2.1, 2.2, 2.7_
  
  - [ ] 4.2 Implementar lógica de migração real
    - Executar quando p_dry_run = false
    - Criar níveis baseados nos agrupamentos
    - Atualizar subscription_plans com tier_id
    - Preservar plan_ids de assinaturas ativas
    - Registrar em migration_audit
    - _Requisitos: 2.3, 2.4, 2.5_
  
  - [ ]* 4.3 Escrever teste de propriedade para preservação de assinaturas
    - **Propriedade 8: Preservação de Assinaturas Ativas**
    - **Valida: Requisitos 2.5, 7.3**
    - Criar assinaturas ativas antes da migração
    - Executar migração
    - Verificar que número de assinaturas ativas permanece igual
    - Verificar que plan_ids não foram alterados
  
  - [ ] 4.4 Implementar função de rollback
    - Criar função rollback_tier_migration
    - Remover vínculos tier_id de subscription_plans
    - Marcar migração como rolled_back em migration_audit
    - _Requisitos: 2.6_
  
  - [ ]* 4.5 Escrever testes de integração para migração completa
    - Testar dry run retorna plano correto
    - Testar migração real cria níveis e vincula planos
    - Testar rollback restaura estado anterior
    - _Requisitos: 2.1, 2.3, 2.6_

- [ ] 5. Edge Functions
  - [ ] 5.1 Criar Edge Function create-tier-with-plans
    - Implementar endpoint POST para criar nível com planos
    - Validar entrada com Zod schema
    - Chamar stored procedure create_tier_with_plans
    - Retornar tier_id e lista de plan_ids
    - Adicionar tratamento de erros
    - _Requisitos: 11.3_
  
  - [ ] 5.2 Criar Edge Function update-tier-and-recalculate
    - Implementar endpoint PUT para atualizar nível
    - Validar entrada com Zod schema
    - Chamar stored procedure update_tier_and_recalculate_plans
    - Retornar plans_updated e collections_updated
    - _Requisitos: 11.4_
  
  - [ ] 5.3 Criar Edge Function update-purchase-mode
    - Implementar endpoint PUT para atualizar modalidade
    - Validar multiplicador entre 0.1 e 2.0
    - Chamar stored procedure update_purchase_mode_multiplier
    - Retornar plans_updated e tiers_affected
    - _Requisitos: 11.6_
  
  - [ ] 5.4 Criar Edge Function migrate-to-tier-structure
    - Implementar endpoint POST para executar migração
    - Suportar parâmetro dry_run
    - Chamar stored procedure migrate_plans_to_tiers
    - Retornar plano de migração ou resultados
    - _Requisitos: 11.5_
  
  - [ ] 5.5 Adicionar autenticação e autorização
    - Verificar role de admin para operações críticas
    - Validar tokens de autenticação
    - Retornar erros 401/403 apropriados
    - _Requisitos: 11.1, 11.2_
  
  - [ ]* 5.6 Escrever testes de integração para Edge Functions
    - Testar cada endpoint com dados válidos e inválidos
    - Testar autenticação e autorização
    - Testar tratamento de erros
    - _Requisitos: 11.3, 11.4, 11.5, 11.6_

- [ ] 6. Checkpoint - Validar Backend Completo
  - Executar todos os testes de Edge Functions
  - Testar fluxo completo: criar nível → atualizar → migrar
  - Perguntar ao usuário se há dúvidas ou ajustes necessários

- [x] 7. Frontend - Tipos e Validações
  - [x] 7.1 Criar tipos TypeScript em pricing-restructure.ts
    - Definir interfaces: PurchaseMode, SubscriptionPlanWithTier, PricingTierWithPlans
    - Definir tipos de input: CreateTierWithPlansInput, UpdatePurchaseModeInput
    - Definir tipos de resultado: PriceCalculationResult, MigrationResult
    - _Requisitos: 11.7_
  
  - [x] 7.2 Criar schemas Zod de validação
    - Implementar purchaseModeSchema com validações
    - Implementar createTierWithPlansSchema com refine para deposit < price_full
    - Implementar updatePurchaseModeSchema
    - Exportar tipos inferidos
    - _Requisitos: 8.5, 8.6_
  
  - [x] 7.3 Criar hooks customizados
    - Implementar usePurchaseModes (listar e atualizar modalidades)
    - Implementar useTierWithPlans (buscar nível com planos)
    - Implementar useCreateTierWithPlans (mutation)
    - Implementar useUpdateTierAndRecalculate (mutation)
    - Usar TanStack Query para cache e invalidação
    - _Requisitos: 11.3, 11.4, 11.6_

- [ ] 8. Frontend - Componentes
  - [x] 8.1 Criar componente PurchaseModesConfig
    - Exibir lista de modalidades com multiplicadores
    - Permitir edição de multiplicadores
    - Mostrar prévia de impacto em todos os níveis
    - Validar entrada com Zod
    - _Requisitos: 3.3, 3.4, 3.5_
  
  - [x] 8.2 Atualizar componente PricingTiersManager
    - Adicionar visualização hierárquica de planos por nível
    - Mostrar preços calculados para cada modalidade
    - Adicionar botão para criar nível com planos
    - Adicionar botão para atualizar nível e recalcular
    - _Requisitos: 4.2, 4.3, 4.5_
  
  - [x] 8.3 Criar componente TierPlansView
    - Exibir nível com todos os planos em formato de tabela
    - Mostrar fórmula de cálculo: tier_price × multiplier
    - Destacar preço PIX calculado
    - Mostrar estatísticas: coleções atribuídas, assinaturas ativas
    - _Requisitos: 4.5, 6.1, 6.2_
  
  - [x] 8.4 Criar componente PriceCalculatorPreview
    - Mostrar prévia de preços antes de salvar
    - Calcular preços para todas as modalidades
    - Exibir fórmulas de cálculo
    - Validar que todos os preços são positivos
    - _Requisitos: 6.4, 6.6, 6.7_
  
  - [ ] 8.5 Criar componente MigrationWizardRestructure
    - Implementar wizard de 3 etapas: Análise → Revisão → Execução
    - Etapa 1: Executar dry run e mostrar plano
    - Etapa 2: Permitir ajustes nos agrupamentos
    - Etapa 3: Executar migração real e mostrar resultados
    - Adicionar botão de rollback
    - _Requisitos: 2.1, 2.3, 2.6, 2.7_
  
  - [ ]* 8.6 Escrever testes de componentes React
    - Testar renderização de PurchaseModesConfig
    - Testar validação de formulários
    - Testar cálculos de prévia
    - Testar fluxo de migração
    - _Requisitos: 3.4, 6.6, 8.5_

- [ ] 9. Testes de Propriedade Adicionais
  - [ ]* 9.1 Escrever teste para Propriedade 3: Unicidade de Tier + Mode
    - **Valida: Requisitos 1.5**
    - Tentar criar dois planos com mesma combinação (tier_id, plan_mode)
    - Verificar que segundo plano é rejeitado com erro de constraint
  
  - [ ]* 9.2 Escrever teste para Propriedade 4: Desativação em Cascata
    - **Valida: Requisitos 1.6, 8.4**
    - Criar nível com planos ativos
    - Desativar nível
    - Verificar que todos os planos foram desativados
  
  - [ ]* 9.3 Escrever teste para Propriedade 5: Cálculo Automático de Preços
    - **Valida: Requisitos 1.7, 6.1, 6.2, 6.3**
    - Gerar tier_price, multiplier e pix_discount aleatórios
    - Verificar fórmula: plan_price = tier_price × multiplier
    - Verificar fórmula PIX: pix_price = plan_price × (1 - discount/100)
    - Verificar arredondamento para 2 casas decimais
  
  - [ ]* 9.4 Escrever teste para Propriedade 13: Propagação para Coleções
    - **Valida: Requisitos 4.4**
    - Criar nível e atribuir coleções
    - Atualizar preço do nível
    - Verificar que preços das coleções foram atualizados
  
  - [ ]* 9.5 Escrever teste para Propriedade 16: Validação de Preços Positivos
    - **Valida: Requisitos 4.7, 6.6**
    - Gerar preços calculados aleatórios
    - Verificar que todos são > 0
    - Tentar criar plano com preço negativo e verificar rejeição
  
  - [ ]* 9.6 Escrever teste para Propriedade 20: Compatibilidade com Assinaturas Ativas
    - **Valida: Requisitos 7.1**
    - Criar assinaturas com planos sem tier_id
    - Executar operações de consulta e atualização
    - Verificar que funcionam normalmente
  
  - [ ]* 9.7 Escrever teste para Propriedade 21: Preços Originais Mantidos
    - **Valida: Requisitos 7.4**
    - Criar assinatura ativa
    - Atualizar preço do nível
    - Verificar que preço da assinatura não mudou
  
  - [ ]* 9.8 Escrever teste para Propriedade 23: Prevenção de Exclusão de Níveis
    - **Valida: Requisitos 8.2**
    - Criar nível e atribuir coleções
    - Tentar excluir nível
    - Verificar que operação é rejeitada
  
  - [ ]* 9.9 Escrever teste para Propriedade 29: Auditoria Completa
    - **Valida: Requisitos 9.4**
    - Executar mudança de preço
    - Verificar registro em pricing_history com old/new values e metadata

- [ ] 10. Checkpoint - Validar Testes Completos
  - Executar todos os testes de propriedade (mínimo 100 iterações cada)
  - Executar todos os testes unitários
  - Verificar cobertura de código: funções BD (100%), Edge Functions (90%), componentes (80%)
  - Perguntar ao usuário se há dúvidas ou ajustes necessários

- [ ] 11. Preparação para Migração em Produção
  - [ ] 11.1 Criar documentação de migração
    - Documentar passo a passo do processo
    - Listar pré-requisitos e validações
    - Documentar processo de rollback
    - Criar checklist de verificação pós-migração
    - _Requisitos: 2.7_
  
  - [ ] 11.2 Criar queries de validação pós-migração
    - Query para verificar planos sem tier_id
    - Query para verificar níveis sem planos completos
    - Query para verificar preços calculados incorretamente
    - Query para contar assinaturas ativas antes/depois
    - _Requisitos: 2.5, 7.3_
  
  - [ ] 11.3 Executar dry run em staging
    - Restaurar backup de produção em staging
    - Executar migrate_plans_to_tiers com dry_run=true
    - Analisar plano de migração gerado
    - Validar agrupamentos de planos
    - Documentar resultados
    - _Requisitos: 2.1, 2.2_
  
  - [ ] 11.4 Ajustar lógica de agrupamento se necessário
    - Revisar agrupamentos com stakeholders
    - Ajustar critérios de agrupamento se necessário
    - Re-executar dry run
    - Obter aprovação final
    - _Requisitos: 2.2_

- [ ] 12. Execução da Migração em Produção
  - [ ] 12.1 Fazer backup completo do banco de dados
    - Criar backup antes da migração
    - Verificar integridade do backup
    - Documentar localização e timestamp
    - _Requisitos: 2.6_
  
  - [ ] 12.2 Executar migração real
    - Agendar janela de manutenção
    - Executar migrate_plans_to_tiers com dry_run=false
    - Monitorar logs em tempo real
    - Verificar que não há erros
    - _Requisitos: 2.3, 2.4_
  
  - [ ] 12.3 Executar queries de validação
    - Executar todas as queries de validação preparadas
    - Verificar que número de assinaturas ativas permanece igual
    - Verificar que todos os níveis têm planos completos
    - Verificar que preços estão calculados corretamente
    - _Requisitos: 2.5, 7.3_
  
  - [ ] 12.4 Monitorar sistema por 24 horas
    - Monitorar logs de aplicação
    - Monitorar métricas de performance
    - Monitorar reclamações de usuários
    - Estar preparado para rollback se necessário
    - _Requisitos: 7.1, 7.4_

- [ ] 13. Checkpoint Final - Validar Migração Completa
  - Confirmar que todas as validações passaram
  - Confirmar que sistema está estável
  - Documentar resultados da migração
  - Perguntar ao usuário se há problemas ou dúvidas

- [ ] 14. Limpeza e Otimização
  - [ ] 14.1 Remover código legado não utilizado
    - Identificar código relacionado ao sistema antigo
    - Remover com cuidado, mantendo compatibilidade
    - Atualizar imports e referências
  
  - [ ] 14.2 Consolidar validações duplicadas
    - Identificar validações repetidas
    - Centralizar em funções utilitárias
    - Atualizar referências
  
  - [ ] 14.3 Otimizar queries e índices
    - Analisar queries mais frequentes
    - Adicionar índices se necessário
    - Otimizar views e stored procedures
  
  - [ ] 14.4 Atualizar documentação final
    - Atualizar README do projeto
    - Atualizar documentação de API
    - Atualizar guia de administrador
    - Atualizar diagramas de arquitetura
  
  - [ ] 14.5 Treinar equipe na nova estrutura
    - Preparar materiais de treinamento
    - Conduzir sessão de treinamento
    - Responder perguntas e dúvidas
    - Criar FAQ com perguntas comuns

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Testes de propriedade validam correção universal com 100+ iterações
- Testes unitários validam exemplos específicos e casos extremos
- Migração é não-destrutiva e preserva assinaturas ativas
- Processo de rollback está disponível em caso de problemas

## Dependências Externas

- Supabase CLI para executar migrations
- fast-check para property-based testing
- Acesso admin ao banco de dados de produção
- Janela de manutenção agendada para migração
