# URGENTE — Tonecos Studio / Estado operacional

> Repositório: `washingtonmsdj/tonecosstudio` (privado, confirmado em 01/11/2026).
> **Estado: NO-GO.** A `main` permanece `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41` e NÃO foi atualizada nesta execução.
> Frente única de consolidação: `integration/tonecosstudio-canonical-20261101`.
> Regras e destino técnico: [docs/TONECOS-STUDIO-CONSOLIDACAO.md](docs/TONECOS-STUDIO-CONSOLIDACAO.md).
> Não declarar GO sem `release:verify` completo no mesmo SHA e smokes críticos do runtime.

## Checkpoint operacional — 01/11/2026

- **Concluído na branch, não promovido:** marca canônica `Tonecos Studio`, cabeçalho/rodapé/home/SEO, metadata sem domínio OS, contatos sem valores falsos, CSP sem `ordax.com.br`, `robots: Disallow /`, sitemap legado retirado; gateway read-only com categorias/detalhe/mídia e rota `/modelos` migrada para busca e paginação canônicas, sem escrita ou fallback Supabase.
- **Testes locais reais:** 8/8 testes Node 24 passando com HTTP simulado; esbuild 0.25.12 transpila a rota TSX. Testes Vitest versionados em `src/config/brand.test.ts` e `src/services/catalog/public-catalog-gateway.test.ts`. **Não afirmar TypeScript/CI/coverage, E2E ou deploy aprovados** sem logs do SHA exato.
- **Bloqueio P0 de deployment:** registro GitHub Vercel aponta `jogo-brasils-projects/ordax`; a Vercel conectada nesta sessão mostra somente a equipe `ordaxsystems`. Não é prova de desvinculação do domínio OrdaX. **Não fazer push na main ou promover deploy** antes de validar isolamento do projeto Tonecos.
- **Bloqueio CI:** `Quality Gate` da `main` falhou na execução #36719911543, com todos os jobs em falha; logs históricos não puderam ser recuperados. PR #3 permanece aberta, com correção isolada de cache; não mesclar no escuro.
- **Sem operação remota:** nenhum deploy, Supabase migration, Cloudflare D1/R2 scan, ingestão ou pedido/valor comercial alterado.
- **Next action:** validar isolamento do projeto Vercel e o hostname first-party; executar TypeScript/lint/Vitest/coverage, build e segurança no mesmo HEAD da branch; validar rota `/modelos` em desktop/mobile com proxy simulado e estender a fonte canônica a `/universo`, `/modelos/:id` e orçamento comercial idempotente.
- **Do not repeat:** não reiniciar coleção/ingestão no Drive, não tentar executar queries D1 só para preencher a UI, não recriar o catálogo no Supabase, não usar `ordax.com.br` como domínio ou origem de mídia Tonecos.

---

## Histórico anterior (somente evidência datada — não substituir o checkpoint atual)

### Checkpoint legado de 2026-09-17

> Histórico do antigo `washingtonmsdj/ordax`. Este texto NÃO representa o estado vivo do Tonecos Studio.

## Estado

**Lançamento público: NO-GO.**

HEAD de código antes deste checkpoint documental:

- `1cdb04c7614a03900d3b15b0f6f972e1a6cc8898` — `test: await payment realtime connection state`.

O drift principal entre aplicação e schema vivo foi reconciliado. TypeScript, lint e todas as auditorias de autoridade/segurança estão passando em execução real da Vercel. O `test:coverage` foi reduzido de dezenas de falhas para **um único teste conhecido** no último SHA executado; esse teste já possui correção no HEAD, mas o HEAD ainda não recebeu execução completa por rate limit da Vercel.

Regra P0: **não recriar contrato aposentado, não esconder drift com cast, não reduzir cobertura/audits e não declarar PASS sem execução real no mesmo SHA.**

## Melhor prova executada

### Vercel — SHA `4a6f64fcf39ba04b935d2da31a57b9c777f8df0a`

Deployment:

- `dpl_4gQJxy4R3enhDQCjVH8mb4ZAcJ2w`;
- alvo `production`;
- `release:verify` executou de fato;
- TypeScript PASS;
- lint: **0 errors / 182 warnings**;
- Supabase access/types PASS;
- pricing read authority PASS;
- profile authority PASS;
- notification authority PASS;
- public system settings authority PASS;
- secure upload scanner source audit PASS;
- commercial authority PASS;
- `ProductionKanbanBoard.test.tsx`: **8/8 PASS**;
- `enhancements-phase-checkpoint.test.ts`: **21/21 PASS**;
- `file-upload-service.test.ts`: **11/11 PASS**;
- `business-days.test.ts`: PASS;
- `deliveryService.test.ts`: PASS;
- resumo final do Vitest: **1 failed | 223 passed | 3 skipped test files**;
- testes: **1 failed | 2621 passed | 32 skipped**;
- única falha: `src/hooks/use-payment-realtime.test.tsx` — primeiro teste verificava `isConnected` antes do callback assíncrono `SUBSCRIBED` do mock concluir;
- `release:verify` parou em coverage por essa única falha, portanto build e `npm audit --omit=dev --audit-level=high` não foram alcançados neste SHA.

A falha acima foi corrigida depois desse gate em:

- `1cdb04c7614a03900d3b15b0f6f972e1a6cc8898` — `test: await payment realtime connection state`; a asserção de conexão agora aguarda dentro de `waitFor`, sem alterar runtime.

O status Vercel desse HEAD foi rate-limited. Isso **não é falha de código**, mas também **não é prova de PASS**.

## Evolução recente comprovada

### SHA `abc93266106e4900365b9897b2540fe2175fe8b6`

Deployment `dpl_5t5HiyQiXgNtF8F4XFCTvDrTgSzp`:

- TypeScript/lint/audits PASS;
- `enhancements-phase-checkpoint`: **21/21 PASS**;
- `file-upload-service`: **11/11 PASS**;
- final: **222 test files PASS / 2613 tests PASS**;
- restavam somente a suíte Kanban antiga e a corrida do primeiro teste realtime.

### SHA `93418edef38852c94e03e7fa7a2ecca77eb5d6c6`

Deployment `dpl_2JtoQtqGTw48uW13ojaVvHpXw8P8`:

- TypeScript/lint/audits PASS;
- cobertura já havia reduzido os bloqueios para 6 ocorrências conhecidas: 4 testes de peça bônus, 1 fixture de `File.size` e a suíte Kanban com mock hoisted inválido.

Esses blocos foram corrigidos sem relaxar thresholds nem restaurar contratos antigos.

## Correções recentes no `main`

- `2164a10547639b3ba240a047145074917bef4e2a` — testes de peça bônus agora mockam a fronteira canônica de mutações e `.maybeSingle()`;
- `abc93266106e4900365b9897b2540fe2175fe8b6` — teste de comprovante cria arquivo realmente maior que 5 MB, sem redefinir `File.size`;
- `4a6f64fcf39ba04b935d2da31a57b9c777f8df0a` — Kanban deixa de referenciar imports hoisted inválidos e passou 8/8 no gate real;
- `1cdb04c7614a03900d3b15b0f6f972e1a6cc8898` — teste realtime aguarda o estado `SUBSCRIBED` de forma determinística.

Também nesta continuação:

- `quote_items` foi removido dos fluxos vivos de quote/preorder; a tabela continua aposentada/ausente;
- `choice-service` e `reminder-service` deixaram de re-tipar artificialmente o cliente Supabase;
- delivery passou a usar `Database["public"]["Tables"]["subscription_deliveries"]["Row"]` em vez de campos/casts fantasmas;
- `CustomerPaymentDetails`, `groupBroadcast`, produção e mocks históricos foram alinhados aos contratos reais;
- timezone/business days permanecem verdes no executor UTC.

## Backend/Supabase já ativado

Projeto Supabase: `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`).

### `get-my-subscriptions`

- v6 `ACTIVE`;
- `verify_jwt=true`;
- schema atual de `subscription_deliveries` respeitado;
- rollback da v5 versionado.

Pendente: smoke autenticado real.

### `upload-payment-proof`

- v1 `ACTIVE`;
- `verify_jwt=true`;
- bucket privado, rate limit, ownership, gravação de upload e notificação administrativa previamente validados;
- rollback de função anteriormente ausente documentado;
- source audit do scanner passa de forma fail-closed.

Pendente:

- smoke autenticado real;
- confirmar operacionalmente a existência/configuração de `MALWARE_SCANNER_URL` no ambiente. O conector Supabase disponível nesta sessão não expõe secrets/env vars, portanto essa existência **não está provada**.

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

Pendente: remover a falsa UX de descrição de categoria ainda existente em `CreditCharactersContent.tsx`. **Não remover a descrição de personagem**, que é um campo real.

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
- pricing público não depende de RPC fantasma no frontend;
- principais Edge Functions alinhadas ao schema vivo.

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

É a prova que está executando `release:verify` de fato. A integração sofre serialização/rate limit e nem todo push gera deployment.

Melhor deployment concluído:

- `dpl_4gQJxy4R3enhDQCjVH8mb4ZAcJ2w`;
- SHA `4a6f64fc...`;
- somente 1 teste falho em 2654 testes coletados;
- essa falha já está corrigida no HEAD `1cdb04c7...`, ainda sem run completo no mesmo SHA.

### GitHub Actions

Continua não confiável como gate:

- jobs historicamente são criados;
- `steps: []`;
- `runner_id: 0`;
- falha antes de checkout/comandos.

Não interpretar isso como falha da aplicação.

## P0 atual

### P0.1 — fechar `test:coverage` no HEAD

- [x] timezone/business days estabilizados;
- [x] ciclo sem dupla conversão de Bahia;
- [x] principais testes de produção migrados para hooks/services canônicos;
- [x] bonus piece suite verde 21/21;
- [x] oversized upload fixture verde 11/11;
- [x] Kanban verde 8/8 em gate real;
- [x] única corrida realtime do SHA `4a6f64fc...` corrigida no HEAD;
- [ ] obter execução Vercel útil de `1cdb04c7...` ou descendente contendo essa correção;
- [ ] atingir `test:coverage` PASS sem reduzir thresholds.

### P0.2 — gate completo no mesmo SHA

Depois de coverage PASS, exigir no mesmo SHA:

1. `typecheck`;
2. lint;
3. todas as auditorias de autoridade;
4. `test:coverage`;
5. build;
6. `npm audit --omit=dev --audit-level=high`;
7. checks de formato aplicáveis;
8. `release:verify` completo.

### P0.3 — smokes autenticados

- [ ] `get-my-subscriptions` v6;
- [ ] upload de comprovante v1;
- [ ] compra avulsa usando pricing público restaurado;
- [ ] criação/edição administrativa de price category via admin-rpc.

### P0.4 — segurança/operacional

- [ ] habilitar Leaked Password Protection no Supabase Auth;
- [ ] confirmar scanner de malware configurado no ambiente;
- [ ] provar rollback do release candidate;
- [ ] definir required checks/proteção de `main` quando o CI voltar a ser confiável.

### P0.5 — remover UX de schema inexistente

- [ ] remover `price_categories.description` da UI/form de categorias em `CreditCharactersContent.tsx`;
- [ ] preservar `collection_characters.description` no formulário de personagem;
- [ ] alinhar o DTO `PriceCategoryInput` para não anunciar campo sem armazenamento canônico.

## Checkpoint desta continuação

**HEAD de código antes deste commit documental:** `1cdb04c7614a03900d3b15b0f6f972e1a6cc8898`.

**Melhor gate concluído:** SHA `4a6f64fcf39ba04b935d2da31a57b9c777f8df0a` — TypeScript/lint/audits PASS, Kanban 8/8 PASS e apenas 1 teste realtime falho no coverage; resumo `223 passed files / 2621 passed tests / 1 failed test`.

**Correção do único teste:** já presente no HEAD `1cdb04c7...`, aguardando apenas prova de executor no mesmo SHA ou descendente.

**next_action:** primeiro obter uma execução útil contendo `1cdb04c7...`. Se coverage passar, deixar o mesmo SHA atravessar build e `npm audit`. Em paralelo apenas em commits pequenos e reversíveis, remover a falsa UX de `price_categories.description`. Depois executar smokes autenticados e fechar segurança operacional. Continuar em NO-GO até tudo isso estar provado.

**do_not_repeat:** não tratar stderr esperado como teste falho; não corrigir warnings cosméticos antes do gate; não restaurar schema aposentado; não reintroduzir clientes Supabase re-tipados; não reduzir coverage/audits; não confundir rate limit da Vercel com falha de código; não declarar GO sem gate completo same-SHA e smokes críticos.


## Checkpoint documental — 2026-09-30 — plataforma de apps próprios

**HEAD confirmado antes da mudança:** `ab359e0d5c4dba21be7edd41f094f49a068b7624`.

**Concluído:**

- criado `ORDAX_APP_PLATFORM.md` na raiz da `main`;
- commit da arquitetura: `47337e1f8d4a1e282cff5f6e6f623dc64d493899`;
- definida direção first-party: apps OrdaX próprios, sem usar produtos de terceiros como base do produto;
- definido contrato futuro de App Runtime, App SDK, Registry, permissões, Store, versionamento, atualização, rollback e compatibilidade;
- definido que a Loja começa ativando apps oficiais empacotados com a release, sem executar JavaScript remoto arbitrário;
- proposta ordem incremental: plataforma mínima -> Store/Notes/Tasks -> atualização -> demais apps -> somente depois pacotes baixáveis.

**Testes/provas:** mudança exclusivamente documental; nenhum runtime, schema, migration, dependência ou configuração foi alterado neste checkpoint. Não foi executado novo `release:verify` como prova de release e o estado de lançamento permanece **NO-GO**.

**Bloqueios:** a arquitetura descrita ainda não está implementada. Download real de apps exige, antes, assinatura, checksum, sandbox, revogação, rollback e modelo de permissões comprovados.

**next_action:** manter os P0 de lançamento acima como prioridade operacional. Quando o usuário autorizar a implementação da plataforma de apps, iniciar em commits pequenos por tipos/schema do manifesto, App Registry estático, App SDK mínimo, Capability/Event/Permission registries e Store 0.1, sem migration remota no primeiro passo.

**do_not_repeat:** não transformar referências externas em forks renomeados; não criar segunda autenticação/SSOT; não permitir código remoto da Loja antes da fronteira de segurança; não construir todos os apps simultaneamente; não declarar a plataforma implementada apenas porque o documento existe.
