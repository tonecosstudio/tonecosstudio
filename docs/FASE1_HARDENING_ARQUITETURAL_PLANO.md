# FASE 1 - Hardening Arquitetural e Estabilização Estrutural

## Objetivo
Estabelecer uma fundação arquitetural sólida antes de novas expansões funcionais, refinamentos visuais e otimizações de UX.

## Escopo da fase
- Eliminar dependências cíclicas e imports cruzados indevidos.
- Reduzir acoplamento entre UI, aplicação, domínio e infraestrutura.
- Padronizar estrutura de módulos, services, hooks, components e pages.
- Diminuir concentração de responsabilidade em arquivos gigantes.
- Consolidar convenções de importação, aliases e boundaries.
- Remover código legado, paliativos e duplicações quando houver rota segura de substituição.

## Baseline validado
- `src` contém aproximadamente 940 arquivos TS/TSX processados pela análise de dependências.
- `npx madge --circular --extensions ts,tsx src` não encontrou dependências circulares.
- O antigo suspeito `services/admin/stage-service.ts` x `stage-validation.ts` já está sem ciclo estático; o serviço usa imports dinâmicos estratégicos e tipos compartilhados em `stage-types.ts`.
- `tsconfig.app.json` já cobre `src/**/*` e `src/vite-env.d.ts`.
- O maior risco atual não é ciclo global, mas dívida incremental: services/hooks com `console.*`, textos corrompidos, duplicação de tipos/contextos e componentes com lógica de domínio embutida.

## Execução concluída nesta fase
- Logger central aplicado em services e hooks críticos.
- Realtime de pagamentos alinhado ao boundary correto de `usePaymentSystemRealtime`.
- Services de notificações, uploads, métricas, prazos e preços normalizados.
- Hooks de mensagens, grupos e typing indicator endurecidos com guards e limpeza de timers/subscriptions.
- Plano e relatórios antigos revisados para remover diagnósticos obsoletos.
- Fluxo de estágios de produção isolado em `src/hooks/admin/useProductionStages.ts`, removendo imports diretos de service/validation dos componentes `StageTransitionModal`, `StageHistoryPanel` e `ProductionStageTracker`.
- Labels, cores e ordem visual dos estágios de produção consolidados em `src/components/production/production-stage-display.ts`, removendo duplicação entre modal, histórico e tracker.
- `ProductionHub` passou a consumir fila, invalidação e bulk operations por hooks (`useProductionPipelineQueue`, `useInvalidateProductionQueries`, `useProductionBulkActions`), removendo acoplamento direto com services/admin e logs de console.
- Pages de notificações admin (`AdminNotificationSettings` e `AdminNotificationHistory`) passaram a consumir `useAdminNotificationManagement`, removendo query/mutation/service direto da UI.

## Plano de execução restante

### 1. Guardrails e relatórios
- Manter `madge` sem ciclos.
- Manter `npm run build` verde após cada bloco.
- Usar `eslint` focado por arquivo/módulo antes de commits pequenos.
- Atualizar relatórios somente com estado verificável.

### 2. Boundaries entre domínios
- `components` não deve acessar infraestrutura diretamente quando existir service/hook de aplicação.
- `pages` deve orquestrar fluxos por hooks/services, sem regra de domínio pesada.
- `services` concentram regras de aplicação e acesso a dados.
- `lib` fica restrito a infraestrutura, helpers e utilitários transversais.
- Domínios admin/customer/groups/payments/production não devem importar detalhes internos uns dos outros.

### 3. Normalização por domínio
- Remover `console.*` de código de produção, mantendo logging via `@/lib/logger`.
- Corrigir mojibake em arquivos tocados.
- Migrar imports profundos para alias `@/` quando aplicável.
- Consolidar tipos duplicados em `src/types` ou no módulo canônico.

### 4. Hotspots
- Quebrar arquivos grandes somente quando houver coesão clara para extração.
- Extrair lógica repetida para helpers com dono único.
- Reduzir hooks com responsabilidade múltipla.
- Remover exemplos/legados não referenciados quando não forem documentação viva.

## Critérios de validação da fase
- `madge` com 0 dependências circulares.
- Build de produção sem erro.
- Nenhum novo `console.*` em production code tocado.
- Nenhum `any` explícito novo em arquivos tocados.
- Relatórios sem estado fictício ou diagnóstico desatualizado.
- Score de estabilidade arquitetural acima de 75.

## Relatório final da fase
O relatório final deve conter:
1. Problemas encontrados.
2. Módulos mais críticos.
3. Arquivos mais problemáticos.
4. Riscos arquiteturais.
5. Melhorias aplicadas.
6. Pendências restantes.
7. Score de estabilidade arquitetural (0-100).

## Score
- Score inicial estimado: **62/100**.
- Score após correções já aplicadas: **78/100**.
- Meta da FASE 1: **75+** com redução real de risco estrutural.
