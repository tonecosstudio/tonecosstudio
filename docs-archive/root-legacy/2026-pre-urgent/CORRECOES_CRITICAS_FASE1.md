# Correções Críticas - Fase 1

**Status:** em andamento, com correções incrementais aplicadas e validadas.

## Objetivo
Remover riscos estruturais imediatos antes de otimizações visuais, UX refinada e expansão funcional.

## Correções já aplicadas
- Logging centralizado em services e hooks críticos usando `@/lib/logger`.
- Remoção de `console.*` em arquivos tocados durante a fase.
- Realtime de pagamentos alinhado ao boundary de `usePaymentSystemRealtime`.
- Services de grupos, métricas, notificações, uploads, prazos e preços normalizados.
- Hooks de mensagens/grupos/typing indicator endurecidos com guards e limpeza de recursos.
- Correção de textos corrompidos por encoding em arquivos tocados.
- `madge` validado com 0 dependências circulares em `src`.

## Validações recentes
- `npx madge --circular --extensions ts,tsx src`: 0 ciclos.
- `npm run build`: sucesso.
- `npx eslint` focado por arquivo/módulo alterado: sucesso nos escopos tocados.
- `git diff --check`: sem whitespace errors nos escopos tocados.

## Pendências prioritárias
1. Continuar removendo `console.*` em código de produção.
2. Reduzir `any` explícito nos hooks e services de maior risco.
3. Consolidar tipos duplicados restantes somente quando houver compatibilidade real.
4. Extrair lógica de domínio embutida em componentes grandes.
5. Atualizar relatórios finais com métricas reais após nova rodada do script de arquitetura.

## Observações
- Diagnósticos antigos sobre ciclo `stage-service.ts` x `stage-validation.ts` estão obsoletos.
- `tsconfig.app.json` já cobre `src/**/*`.
- Env vars de Google/Stripe não devem ser inventadas no código; isso é configuração operacional, não hardening arquitetural.
