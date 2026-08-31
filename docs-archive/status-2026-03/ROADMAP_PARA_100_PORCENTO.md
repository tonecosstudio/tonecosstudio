# Roadmap para 100% - Preparação Final para Produção

> **ARQUIVADO:** snapshot histórico de 11 de março de 2026. As porcentagens, datas, estimativas, claims de qualidade e instruções de Sentry abaixo não representam o estado atual. Consulte `URGENTE.md` para critérios e provas vigentes de lançamento.

**Data original:** 11 de Março de 2026
**Progresso declarado à época:** 88%
**Meta declarada à época:** 100%
**Prazo declarado à época:** 2-3 dias

---

Este documento registrava um plano antigo baseado em percentuais subjetivos de conclusão e previa performance, cobertura de testes, E2E, staging, produção, monitoramento, backup e release em três dias. Também mencionava `VITE_SENTRY_DSN` e uma integração de Sentry que posteriormente foi removida porque não existia implementação real no runtime.

## Itens históricos registrados

- lazy loading e otimização de assets;
- Lighthouse/Core Web Vitals;
- aumento de cobertura e testes E2E;
- load/stress testing;
- validação de variáveis de ambiente;
- staging, rollback e deploy;
- monitoramento, analytics e backup;
- validação de RLS/CORS/rate limiting;
- documentação, changelog e troubleshooting.

## Critérios históricos que NÃO constituem prova atual

O documento antigo declarava metas como:

- bundle principal < 250 kB;
- Lighthouse > 90;
- cobertura > 80%;
- zero erros de compilação;
- todos os testes passando;
- monitoramento ativo;
- backup configurado;
- deploy bem-sucedido.

Nenhuma dessas declarações deve ser interpretada como estado atual sem evidência reproduzível no commit exato da release candidate.

## Substituição operacional

O plano vigente é `URGENTE.md`, que exige, entre outros:

- Quality Gate executado no commit da RC;
- instalação/build reproduzíveis;
- segurança e secrets provados;
- Supabase remoto reconciliado com migrations/RLS/grants/Storage/functions;
- fluxos público/cliente/admin e pagamentos testados;
- observabilidade real, backup/restore e rollback ensaiados;
- staging/preview e RC versionada.

O histórico completo do conteúdo original permanece preservado no Git anterior ao arquivamento.
