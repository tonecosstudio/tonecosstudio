# URGENTE — OrdaX MVP / Launch Readiness

> **SSOT operacional do repositório `washingtonmsdj/ordax`.**
> Este arquivo descreve o estado comprovado do produto, bloqueios reais e a próxima sequência de execução.
> Não usar documentação arquivada como autoridade quando divergir do código, migrations, testes ou evidência operacional atual.

## 0. Estado atual

**Status de lançamento público: NO-GO.**

O OrdaX avançou e possui build/deploy de produção funcionando no Vercel, mas ainda não existe evidência suficiente para declarar o MVP pronto para lançamento público porque:

1. o **GitHub Actions Quality Gate continua sem executar steps** por falha externa de provisionamento do runner;
2. o **Supabase canônico continua inativo**, impedindo reconciliar migrations, grants/RLS e executar o smoke autenticado completo contra o backend real;
3. a cobertura, os auditores de autoridade, o `npm audit` e o conjunto completo de testes ainda precisam ser reexecutados no gate canônico do mesmo release candidate;
4. fluxos autenticados críticos ainda precisam de smoke E2E reproduzível no ambiente canônico antes do GO.

### Base funcional auditada neste checkpoint

- `main`: `da822cff42090f38d8614ef2b87827e0ba578392`
- commit: `security: audit commercial RPC grants across schemas`
- parent funcional: `d1e9f0111f258648c0c25ecfae69d9177c73e018`
- observação: o commit que atualiza este próprio `URGENTE.md` é documental e será posterior a `da822cf`; a base funcional acima é a que foi analisada e provada neste checkpoint.

## 0.1 Evidência operacional do checkpoint

### GitHub Actions — BLOQUEIO EXTERNO

Quality Gate do commit `da822cff42090f38d8614ef2b87827e0ba578392`:

- run: `34762446095`
- conclusão: `failure`
- `Unit coverage`: `failure`, `steps=null`
- `Production build and dependency audit`: `failure`, `steps=null`
- `Build, test and security`: `failure`, `steps=null`
- `Authority audits`: `failure`, `steps=null`

O mesmo padrão já havia ocorrido no run do commit `d1e9f011...`. Portanto, a falha atual do Quality Gate acontece **antes da execução dos comandos do repositório**. Não tratar essa conclusão genérica de `failure` como regressão de código até existir um job com steps efetivamente executados.

### Vercel — PASS PARA BUILD/DEPLOY DO HEAD FUNCIONAL

Projeto Vercel canônico desta aplicação:

- projeto: `ordax`
- project id: `prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`
- repositório vinculado: `washingtonmsdj/ordax`
- deployment de `da822cff...`: `dpl_JAsM2oxpZwrug8cmzTK5gMCsNsnY`
- estado: `READY`
- target: `production`
- Vite build: `built in 13.72s`
- build Vercel: `Build Completed in /vercel/output [20s]`
- deploy: `Deployment completed`
- homepage do deployment: HTTP `200`
- erros de runtime nas últimas 24h no momento da inspeção: nenhum erro agregado encontrado.

O antigo `BUILD_RATE_LIMIT` do Vercel **não é mais um bloqueio atual**. Não reabrir esse diagnóstico sem uma nova evidência de falha.

### Supabase canônico — BLOQUEIO EXTERNO

- project id registrado: `pdytjhtjlxvbbeuxgnms`
- referência operacional anterior: `Ordax-2026-1`
- estado conhecido: inativo

Enquanto o projeto estiver inativo, não afirmar que o estado remoto de migrations, grants, RLS, funções ou dados está reconciliado com o repositório. Também não criar migrations corretivas especulativas apenas para compensar um estado remoto que ainda não foi observado.

## 0.2 Hardening consolidado neste checkpoint

### Contrato de Edge Functions autenticadas

Commit `d1e9f0111f258648c0c25ecfae69d9177c73e018`:

- `callAuthenticatedEdgeFunctionData` agora falha fechado quando a Edge Function retorna resposta vazia ou envelope malformado;
- elimina `TypeError` acidental e sucesso ambíguo em caminhos que esperam `{ data }`;
- protege consumidores como `admin-rpc-gateway` e relatórios de pricing;
- testes cobrem `null`, `undefined`, objeto sem `data`, array e payload primitivo, além do caminho válido.

### Auditoria de autoridade comercial multi-schema

Commit `da822cff42090f38d8614ef2b87827e0ba578392`:

- o auditor comercial deixou de rastrear apenas funções `public`;
- grants/revokes/drops perigosos agora são calculados **independentemente para `public` e `private_api`**;
- um `REVOKE` em `public` não pode mais mascarar um `GRANT` ainda ativo em `private_api`;
- a mensagem de falha agora identifica explicitamente o schema vulnerável;
- prova sintética local do auditor:
  - `public` revogado + `private_api` concedido => **FAIL** identificando `private_api.notify_quote_payment_for_current_user`;
  - após `REVOKE` de `private_api` => **PASS**.

A execução canônica do auditor sobre todo o repositório ainda depende da volta dos runners do GitHub Actions.

### Autoridade comercial — correção do diagnóstico anterior

O diagnóstico antigo de que `quotes` tinha grant histórico de `INSERT` sem evidência posterior de revogação estava desatualizado.

A sequência versionada contém:

- grant DML histórico para `quotes` em `20260429000001_harden_public_grants.sql`;
- **`REVOKE INSERT, UPDATE ON public.quotes FROM anon, authenticated`** em `20260525073000_support_payment_mutation_rpcs.sql`;
- hardening adicional em `20260902072000_mvp_authority_hardening.sql`, revogando criação direta de estado comercial sensível e execução autenticada de RPCs legados perigosos tanto em `public` quanto em `private_api`.

Portanto, **não criar uma nova migration apenas para repetir o REVOKE de `quotes` sem primeiro observar o Supabase canônico**. O que falta é prova executada + reconciliação remota, não repetir uma correção que já existe no histórico versionado.

## 1. Critério de GO

O lançamento público só pode receber GO quando houver evidência reproduzível, no mesmo release candidate, de:

- instalação determinística (`npm ci`);
- TypeScript strict sem erro;
- lint sem erro bloqueante;
- auditores de acesso/autoridade PASS;
- testes unitários/integrados PASS;
- cobertura mínima configurada PASS;
- build de produção PASS;
- `npm audit --audit-level=high` sem vulnerabilidade bloqueante;
- `format:check` conforme política do repositório;
- Supabase canônico reconciliado com migrations, grants e RLS esperados;
- smoke autenticado dos fluxos críticos;
- deploy de produção observável;
- rollback definido e verificável.

Build verde isolado não equivale a launch readiness.

## 2. P0 — bloqueadores antes do MVP público

### P0.1 — restaurar o Quality Gate executável

- [x] workflow existe e dispara em `main`;
- [x] a falha atual foi isolada como ausência de execução dos steps (`steps=null`), não como erro de comando do projeto;
- [x] build equivalente de produção foi provado no Vercel para `da822cff...`;
- [ ] obter ao menos um run do GitHub Actions no qual os jobs realmente iniciem e executem seus steps;
- [ ] nesse run, fechar `typecheck`, lint, auditors, tests, coverage, build, audit e format no mesmo HEAD.

**Regra:** não alterar testes, lint ou scripts apenas para fazer desaparecer um `failure` cujo job nunca iniciou.

### P0.2 — autoridade comercial e fronteiras de confiança

- [x] auditor de INSERT direto para tabelas comerciais críticas existe;
- [x] auditor de RPCs perigosos existe;
- [x] auditor agora acompanha `public` e `private_api` separadamente;
- [x] source versionado contém REVOKE posterior de `quotes` para `authenticated`;
- [x] hardening versionado revoga RPCs legados de amount authority/unpaid activation/fake refund do cliente autenticado;
- [x] binding de crédito por `subscription_id` está versionado no hardening MVP;
- [ ] reexecutar o auditor comercial completo sobre o HEAD quando o runner estiver disponível;
- [ ] reconciliar o estado efetivo do Supabase canônico antes de qualquer nova migration de autoridade;
- [ ] provar que operações comerciais do browser chegam apenas às fronteiras server-authoritative previstas.

### P0.3 — Supabase / RLS / migrations

- [ ] reativar ou tornar novamente observável o projeto canônico por um caminho autorizado;
- [ ] comparar migrations locais x migrations aplicadas remotamente;
- [ ] verificar grants efetivos para `anon`, `authenticated` e `service_role` nas tabelas críticas;
- [ ] verificar RLS/policies reais de `quotes`, compras, subscriptions, payments, notifications, support e storage;
- [ ] validar funções `SECURITY DEFINER`, wrappers `SECURITY INVOKER` e schema `private_api` contra o estado remoto;
- [ ] registrar drift real antes de corrigir qualquer drift.

**Proibido:** inventar migration para um estado remoto não observado.

### P0.4 — fluxos essenciais do MVP

Validar no ambiente canônico, com usuários/roles de teste controlados:

- [ ] autenticação e restauração de sessão;
- [ ] catálogo/coleções/modelos públicos;
- [ ] criação/checkout compatível com a autoridade comercial atual;
- [ ] área do cliente e progresso de pedido;
- [ ] pagamentos/comprovantes conforme fronteira server-side;
- [ ] suporte e anexos;
- [ ] notificações;
- [ ] admin: usuários, pedidos, coleções, produção, financeiro e configurações críticas;
- [ ] navegação direta/refresh nas rotas críticas;
- [ ] loading, empty, error e success states sem atividade fictícia.

### P0.5 — deploy, smoke e rollback

- [x] deployment de produção do source HEAD funcional `da822cff...` ficou `READY`;
- [x] build Vite/produção desse deployment concluiu com sucesso;
- [x] raiz do deployment respondeu HTTP `200`;
- [x] consulta agregada de runtime não encontrou erros nas últimas 24h no momento deste checkpoint;
- [ ] smoke autenticado completo das rotas P0.4;
- [ ] validar domínio canônico, assets críticos e callbacks externos necessários;
- [ ] provar procedimento de rollback para um release anterior saudável;
- [ ] registrar receipt final do release candidate.

## 3. P1 — qualidade necessária após remover os bloqueadores P0

- ampliar cobertura por risco, não por número artificial;
- priorizar auth, authority boundaries, pagamentos, pedidos, produção, admin RPC gateway e integrações Supabase;
- remover duplicações e wrappers obsoletos somente quando não forem parte de contratos ainda necessários;
- manter tipagem estrita e respostas remotas validadas/fail-closed em operações críticas;
- revisar acessibilidade e responsividade das rotas que fazem parte do MVP;
- reduzir bundles grandes somente com evidência de impacto real e sem sacrificar clareza arquitetural;
- revisar observabilidade de erros para que falhas de backend não apareçam ao usuário como sucesso/estado vazio.

## 4. Princípios de implementação

1. Corrigir a causa raiz, não esconder sintomas.
2. Não adicionar hardcode para contornar backend, auth, preço, role ou status.
3. Não manter código legado apenas por medo de removê-lo; primeiro provar que não há contrato/call site necessário.
4. Não remover funcionalidade válida só porque está quebrada; corrigir quando fizer parte do produto.
5. UI nunca é fronteira de autorização.
6. O browser não é autoridade para preço, pagamento, role, crédito ou estado comercial sensível.
7. `service_role` permanece exclusivamente server-side.
8. Mudanças de schema são migrations ordenadas e reproduzíveis.
9. Cada mudança relevante deve ter teste/prova proporcional ao risco.
10. Commits pequenos, reversíveis e diretamente na `main`, conforme `AGENTS.md`.

## 5. Bloqueios externos atuais

### GitHub Actions

**Bloqueado:** runner não provisiona os jobs; runs recentes terminam com `steps=null`.

Impacto: impede prova canônica consolidada de typecheck/lint/auditors/tests/coverage/build/audit/format.

### Supabase

**Bloqueado:** projeto canônico registrado está inativo.

Impacto: impede reconciliação remota e smoke autenticado real dos fluxos que dependem do backend.

### Vercel

**Não bloqueado neste checkpoint.** `da822cff...` foi construído e publicado em produção com estado `READY`.

## 6. Próxima sequência de execução

1. Enquanto GitHub Actions e Supabase estiverem indisponíveis, continuar apenas trabalho local/source-first que produza valor comprovável sem inventar estado remoto: contratos fail-closed, testes de alto risco, auditores estáticos, limpeza arquitetural segura e inspeção de runtime/deploy do OrdaX.
2. Investigar os próximos pontos com maior risco funcional, especialmente fronteiras admin/financeiro/pagamentos e serviços que transformam respostas remotas em estado de UI.
3. Quando o GitHub runner voltar, executar imediatamente o Quality Gate completo no HEAD atual e corrigir somente falhas reais dos steps.
4. Quando o Supabase canônico voltar, reconciliar migrations/grants/RLS antes de escrever qualquer correção de schema.
5. Após ambos estarem disponíveis, executar o smoke P0.4, provar rollback e só então reavaliar GO/NO-GO.

## 7. Do not repeat

- Não voltar ao repositório `novo-ordax-os`; este SSOT é exclusivamente de `washingtonmsdj/ordax`.
- Não tratar `BUILD_RATE_LIMIT` do Vercel como bloqueio atual sem nova evidência; os deployments recentes estão verdes.
- Não repetir a afirmação de que não existe REVOKE posterior para `quotes`; há REVOKE versionado em `20260525073000_support_payment_mutation_rpcs.sql`.
- Não assumir que source migration = estado remoto aplicado; Supabase precisa ser observado e reconciliado.
- Não tentar “corrigir” o GitHub Actions alterando testes/comandos enquanto os jobs continuarem com `steps=null`.
- Não declarar PASS dos auditores completos só com prova sintética; a prova sintética valida a lógica alterada, enquanto o run canônico continua pendente.
- Não criar branch, PR ou SSOT paralelo sem instrução explícita.
- Não declarar o OrdaX pronto para lançamento enquanto P0 permanecer aberto.

## 8. Checkpoint desta sessão

Concluído:

- `d1e9f011...` — fail-closed para envelopes inválidos em Edge Functions autenticadas + cobertura dos casos inválidos;
- `da822cff...` — auditor comercial passou a rastrear permissões perigosas por schema (`public` e `private_api`);
- prova sintética FAIL/PASS do novo comportamento do auditor;
- confirmação de que o Quality Gate segue bloqueado antes dos steps;
- confirmação de build/deploy Vercel `READY` para `da822cff...`;
- homepage do deployment respondeu `200`;
- nenhum erro agregado de runtime encontrado nas últimas 24h no momento da consulta;
- diagnóstico de `quotes` corrigido no SSOT: existe REVOKE posterior no source versionado.

**Next action:** continuar a auditoria dos caminhos de maior risco no código (admin/financeiro/pagamentos e contratos de dados remotos), adicionando correções e provas pequenas e reversíveis, sem depender de GitHub runner ou Supabase enquanto esses serviços estiverem bloqueados.
