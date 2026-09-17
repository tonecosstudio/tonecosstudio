# URGENTE — OrdaX Launch Readiness

> SSOT operacional de `washingtonmsdj/ordax`.
> Atualizado em 2026-09-17.
> Não declarar GO sem `release:verify` completo no mesmo SHA candidato.

## Estado

**Lançamento público: NO-GO.**

HEAD de código antes deste checkpoint documental:

- `157ee11df5ccf9e2f8cef742db38d2ba16a5ab79` — `fix: omit undefined realtime channel options`.

O drift principal entre aplicação e schema vivo já foi reconciliado. TypeScript, lint e todas as auditorias de autoridade/segurança chegaram a PASS em execução real da Vercel. O bloqueio atual está em `test:coverage`: a maior parte das falhas remanescentes era de testes/mocks presos a contratos antigos e vem sendo removida sem relaxar o gate.

Regra P0: **não recriar contrato aposentado, não esconder drift com cast, não reduzir cobertura/audits e não declarar PASS sem execução real no mesmo SHA.**

## Melhor prova executada até agora

### Vercel — SHA `0cb93e2b554449f5f1d7fe1bac320396bba1641e`

Deployment:

- `dpl_3boxoza9hsqidZkrdjqV25aNkJko`;
- alvo `production`;
- `release:verify` executou de fato;
- TypeScript PASS;
- lint PASS;
- audits Supabase/access/types PASS;
- pricing/profile/notification/public-settings/secure-upload/commercial authority PASS;
- falha concentrada em `test:coverage`;
- resumo conhecido desse run: 28 falhas individuais no conjunto final de testes.

Não usar esse SHA como GO: ele é apenas a melhor prova concluída e já foi superado por vários fixes de teste.

### Evidência anterior de progresso

No SHA `4882d85cdbacdaf18747ba32e35bf5848d615d3d`, a cobertura havia caído para 18 arquivos / 49 testes falhos. Os commits posteriores eliminaram vários desses blocos.

## Correções posteriores ao último gate concluído

Ainda sem prova completa no mesmo SHA, foram corrigidos/alinhados:

- `ef20b105dc6c82a491b2e828fdaa60e51e19e882` — `TeamWorkloadView` passou a testar os hooks reais;
- `75cf8923aecc5126c7852eda8793973bd9084426` — `BlockProductionModal` passou a testar `useBlockProduction`;
- `409bdb66a81024e809a2977fcc5444979a607700` — mensagem realtime restaurada para `Erro de Conexão`;
- `b1632f4c60b57749979430759deefc800b6df235` — estados da página de progresso do cliente alinhados;
- `f567baefe7d187e169bfae5236ce80b09e669bce` — cópias atuais do `EstimatedDatesCard` alinhadas;
- `03fecba7bbacc243744a50ac61ad56e1e427e0bf` — `ProductionFilters` passou a mockar os hooks de opções reais;
- `e1cb950544e6c1ba593f5d0925cbc0776bbd7179` — `holiday-service` passou a testar `holiday-mutations-service` em vez de RPC direto obsoleto;
- `a37743d8efd8f30c1d68e75b9fc8e5d28083a2fe` — property tests de delivery passaram a gerar somente UUIDs compatíveis com o contrato administrativo, sem afrouxar o validador;
- `1e0b1f154f4391fdc8196aec5b46a00e06a42f3f` — `deliveryService.test` passou a mockar `cycle-service` e `delivery-cycle-mutations-service` canônicos;
- `157ee11df5ccf9e2f8cef742db38d2ba16a5ab79` — wrapper realtime não passa mais `undefined` explicitamente como segundo argumento de `supabase.channel`.

Também já estavam corrigidos antes desse bloco: timezone/calendário, business days, ciclo, tracking em Bahia, mocks de produção, notification count, AssignmentModal, ProgressNotification, realtime integration, admin timeline e Kanban.

## Backend/Supabase já ativado

Projeto Supabase: `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`).

### `get-my-subscriptions`

- v6 `ACTIVE`;
- `verify_jwt=true`;
- schema atual de `subscription_deliveries` respeitado;
- rollback da v5 versionado em `supabase/functions/get-my-subscriptions/ROLLBACK.md`.

Pendente: smoke autenticado real.

### `upload-payment-proof`

- v1 `ACTIVE`;
- `verify_jwt=true`;
- bucket privado, rate limit, ownership, upload recording e admin notification previamente verificados;
- rollback de função ausente documentado.

Pendente: smoke autenticado real e prova operacional do scanner configurado no ambiente.

### `get_collection_pricing(uuid)`

Função pública estreita restaurada e verificada:

- `SECURITY DEFINER`, `STABLE`, `search_path=public, pg_temp`;
- `anon/authenticated` recebem somente `EXECUTE` na função;
- `collection_tier_assignments` continua sem SELECT público;
- execução sob `ROLE anon` funciona;
- ThunderCats retorna defaults vivos `150.00 / 142.50 / depósito 30.00`.

### `admin_upsert_price_category`

- função corrigida e aplicada;
- não grava coluna inexistente `description`;
- `p_description` não vazio é rejeitado;
- `service_role` possui `EXECUTE`;
- `anon/authenticated` não executam diretamente;
- rollback versionado na migration correspondente.

Pendente: remover completamente a falsa UX visual de descrição de categoria, se ainda existir no default branch.

## Aplicação ↔ schema — concluído

- coin purchase RPCs aposentados removidos;
- collection limit aposentado removido;
- badges/settings aposentados reconciliados;
- contextual pricing de assinante aposentado;
- produção hidratada por `production_queue + production_stages + profiles`;
- browser email/production notifications sem colunas antigas;
- subscription tracking sem `shipping_carrier` inexistente;
- standalone admin service reduzido aos RPCs vivos;
- `orders-service` sem `search_unified_orders`/`quote_items` inexistentes;
- status filtrados por domínio/tabela;
- pricing público não depende mais de RPC fantasma no frontend;
- Edge functions principais alinhadas ao schema vivo.

## Regras permanentes

- `src/integrations/supabase/types.ts` é SSOT gerado; não editar manualmente;
- não criar clientes `Database` falsos;
- não usar `as unknown as` para esconder drift;
- UI não é fronteira de autorização;
- DML administrativo permanece server-authoritative;
- `subscription_deliveries` não possui `shipping_carrier`;
- não restaurar campos denormalizados aposentados em `production_queue`;
- não expor `collection_tier_assignments` para o browser;
- não restaurar `search_unified_orders`, `quote_items` ou pricing contextual antigo.

## Executor / CI

### Vercel

É a única prova que vem executando o `release:verify` completo. A integração sofre serialização/rate limit e nem todo push gera deployment imediatamente.

Último deployment concluído útil no momento deste checkpoint: `dpl_3boxoza9hsqidZkrdjqV25aNkJko`, SHA `0cb93e2...`.

Os commits posteriores ainda precisam ser medidos juntos em um novo SHA.

### GitHub Actions

Continua não confiável como gate:

- jobs são criados;
- `steps: []`;
- `runner_id: 0`;
- falha antes de checkout/comandos.

Não interpretar isso como falha da aplicação.

## P0 atual

### P0.1 — fechar `test:coverage`

- [x] timezone/business days estabilizados para runner UTC;
- [x] ciclo sem dupla conversão de Bahia;
- [x] principais testes de produção migrados para hooks/services canônicos;
- [x] realtime integration desacoplado de campos de produção aposentados;
- [x] `EstimatedDatesCard`, `ProductionFilters`, holiday e delivery tests alinhados aos contratos atuais;
- [ ] obter novo run Vercel contendo os commits após `0cb93e2...`;
- [ ] corrigir somente falhas reais que sobreviverem nesse novo run;
- [ ] atingir `test:coverage` PASS sem reduzir thresholds.

### P0.2 — gate completo no mesmo SHA

Depois de coverage PASS, exigir no mesmo SHA:

1. `typecheck`;
2. lint;
3. todas as auditorias de autoridade;
4. `test:coverage`;
5. build;
6. `npm audit --omit=dev --audit-level=high`;
7. `format:check`/Prettier aplicável;
8. `release:verify` completo.

### P0.3 — smokes autenticados

- [ ] `get-my-subscriptions` v6;
- [ ] upload de comprovante v1;
- [ ] compra avulsa usando pricing público restaurado;
- [ ] criação/edição administrativa de price category via admin-rpc.

### P0.4 — segurança/operacional

- [ ] habilitar Leaked Password Protection no Supabase Auth;
- [ ] provar rollback do release candidate;
- [ ] definir required checks/proteção de `main` quando o CI voltar a ser confiável.

## Checkpoint desta continuação

**HEAD de código antes deste commit documental:** `157ee11df5ccf9e2f8cef742db38d2ba16a5ab79`.

**Melhor gate concluído:** SHA `0cb93e2b554449f5f1d7fe1bac320396bba1641e`, falhando somente em `test:coverage` após TypeScript/lint/audits passarem.

**Diagnóstico:** os logs do `0cb93e2...` mostraram que grande parte do stderr era de cenários de erro intencionais e warnings, não falhas. As falhas explícitas identificadas no trecho conhecido foram corrigidas depois desse SHA, incluindo página de progresso, EstimatedDatesCard, ProductionFilters, realtime, holiday e delivery.

**next_action:** aguardar apenas a próxima execução útil da Vercel e usar esse novo run como fonte da verdade; não continuar corrigindo warnings históricos. Se ainda houver falhas, corrigir a primeira causa-raiz comprovada. Quando coverage passar, avançar para build/audit no mesmo SHA e só então executar smokes autenticados.

**do_not_repeat:** não tratar stderr esperado como teste falho; não afrouxar UUID validation para acomodar gerador de teste; não mockar wrappers legados quando o runtime usa service canônico; não restaurar schema aposentado; não reduzir coverage/audit; não declarar GO sem gate completo e smokes no candidato.
