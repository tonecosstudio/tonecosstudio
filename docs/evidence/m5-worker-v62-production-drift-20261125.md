# M5 — Reconciliação factual de produção / Worker v62 (25/11/2026)

**Autoridade:** `tonecosstudio/tonecosstudio/main` é SSOT de código, o D1 `tonecos-catalogo` é o banco canônico e o Quality Gate existente `.github/workflows/quality.yml` é o único mecanismo autorizado de migração e publicação. A migração D1 0028–0033 foi autorizada pelo proprietário, mas **não foi aplicada** nesta verificação. Não restaurar versões, promover Worker nem alterar D1 por fora do mecanismo existente.

## Verificação Cloudflare — somente leitura

- Worker único: `tonecos-catalogo-api` em `8827c547d6def5ee5b9ca550fdd5680a`.
- Implantação **atual**: `2a075a5a-d994-448b-a7c9-7cd4354878d7`, v62 `ad735b36-4da7-4ec2-9b43-95dd6402ade3`, **100%** do tráfego, 25/11/2026 04:57:56 UTC, `source=wrangler`, autor registrado `tonecosstudio@gmail.com`.
- Implantação anterior: `86dd22cf-5042-4747-aa8c-28536918f9a9`, v61 `79951f24-8acb-4e32-84b1-556c381031f7`, 100%, 04:41:32 UTC. A v60 anterior **não** está mais ativa.
- Cloudflare Audit Logs registra `script_update`, `script_deploy`, `patch_settings` e `script_on_subdomain` nesses horários. O autor **não identifica necessariamente qual processo, chat ou pipeline enviou o release**. Fonte de código da v62 ainda não foi atestada.
- Binding D1 `DB` permanece no mesmo banco `87006366-60f3-4937-af73-2ef5a5f901fb`; R2 `MEDIA=tonecos-catalogo-media` e `PRIVATE_TELEGRAM=tonecos-catalogo-staging` permanecem no mesmo acervo; `CORS_ORIGINS` e três nomes de secrets inalterados. Nenhum conteúdo de secret foi inspecionado.
- Nenhuma versão anterior foi homologada como rollback. `rollbackTestedAgainstProduction=false`, `targetProductionCredentialsVerified=false` e `runtimeCutoverPerformed=false` permanecem sem alteração. Atualizar o pin factual da versão **não equivale à aprovação de release**.

## Estado D1 e falha de catálogo

- D1 `d1_migrations`: última entrada `0027_telegram_pending_franchise_taxonomy.sql` (ledger contém 27 migrações), com 6.871 modelos, 1.075 pastas e 7 categorias na leitura de produção.
- Contrato schema v13: **4/9 tabelas**, **11/15 índices** e **32/39 triggers** presentes; faltam `catalog_characters`, `catalog_character_aliases`, `catalog_model_characters`, `catalog_attributes`, `catalog_character_attributes` e seus índices/triggers.
- `GET https://tonecos-catalogo-api.tonecosstudio.workers.dev/api/telegram-studios/studios` responde **HTTP 200**, com diretório de estúdios real.
- `GET .../api/telegram-studios?limit=1` e `GET .../api/health` retornam **HTTP 503**. O mesmo GET de modelos pelo proxy `catalogo.tonartstudio.com.br/catalogo-api/api/telegram-studios?limit=1` responde 503.
- Causa estrutural verificável: `services/catalogo/worker/telegramPublic.ts` chama `loadCanonicalPublicModelTags` na listagem; `services/catalogo/worker/publicModelTags.ts` lê `catalog_model_characters`, `catalog_characters`, `catalog_character_attributes` e `catalog_attributes`, ainda ausentes. O diretório de estúdios não depende dessas tabelas. **Não aplicar fallback silencioso nem esconder erros.**
- Antes das migrações autorizadas, 163/163 IDs dos seeds de modelos e 20/20 slugs de franquias foram verificados diretamente no D1.

## Bloqueio e próximo gate

Os cinco workflows antigos de `washingtonmsdj/catalogo` estão `disabled_manually`. O Quality Gate alvo já contém `m5-schema`, com escopo exclusivo 0028–0033, validação de origem, bookmark Time Travel e testes; a conta Cloudflare é derivada da SSOT.

O último run M5 com GO foi bloqueado **antes de qualquer DDL**, pois o secret `CLOUDFLARE_API_TOKEN` não estava disponível no GitHub Actions environment `production`. A integração GitHub conectada não oferece edição de secrets; o host OrdaX autenticado como `ordaxos-admin` recebe 403 de administração nesse repositório e não possui esse token no ambiente. Somente o proprietário com acesso administrativo pode configurar o secret de maneira segura, sem expô-lo no chat.

Depois de configurar a credencial: iniciar **novo** run `Quality Gate` em `main` via `workflow_dispatch`, operação `m5-schema`, confirmação `GO-M5-0028-0033-20261125`; validar ledger, contagens, schema e API. Inspecionar outra vez a versão ativa do Worker antes da operação `worker-release`; testar publicação e rollback e só depois promover frontend Vercel. Não executar migrações 0034+ nem criar outro publisher.

**Escopo desta atualização:** observação factual/documentação, sem D1/R2/Worker/Vercel write.

## 25/11/2026 — causa raiz v63: publicador paralelo Workers Builds

A auditoria pelo conector Cloudflare identificou diretamente **outro publicador automático** no mesmo Worker, independente dos cinco workflows antigos já aposentados e independente do Quality Gate: Workers Builds config `ee2d9075c95d41c3bd7b2690700e0b26`, vinculada ao repo `tonecosstudio/tonecosstudio` branch `main`, com `auto_build_enabled=true`, trigger `96352968-9251-4c1b-a9df-1b8ca9c89444`, filtros `services/catalogo/**` e `config/catalog-code-consolidation.json`, e comando `npx wrangler deploy --config services/catalogo/wrangler.jsonc`.

Os recibos Cloudflare Workers Builds confirmaram a relação causal entre commits de GitHub, builds bem-sucedidos e versões implantadas automaticamente:
- Build `876d22b8-92f6-419c-a2b2-0165de89e857`, commit `6b694740` (config M5), levou à v61 `79951f24-8acb-4e32-84b1-556c381031f7`, 04:41 UTC.
- Build `d2e8accb-ad2c-49f1-8408-1c5211304617`, commit `e6fd7ca4` (test M5), levou à v62 `ad735b36-4da7-4ec2-9b43-95dd6402ade3`, 04:57 UTC.
- Build `1a001830-8af8-489b-8072-c44f9389b5c4`, commit `a12bccc4` (snapshot v62), levou à **v63** `cb284457-5492-48ff-830c-184563c49397`, deployment `1f3bec06-df66-4edb-a5a1-09ccd8fd338e`, 05:13 UTC.

**Estado atual confirmado após a descoberta:** o GET do build config retorna HTTP 404 código Cloudflare `12040`, a listagem de triggers retorna **0**, e o deployment v63 permanece ativo com 100% do tráfego. A tentativa deste chat de remover o build config foi **interrompida no preflight por 404**, portanto a remoção aconteceu em outra execução (origem não identificada); não creditar a ação indevidamente. A API do Worker e D1 não foram modificados por esta inspeção.

**Política canônica:** não recriar/reabilitar Workers Builds para `tonecos-catalogo-api`, nem ativar outro deploy automático de `main` que contorne o gate de esquema e rollback. O único publicador admissível segue o job `catalog-controlled-worker-release` do Quality Gate existente. O incidente demonstra que desativar apenas cinco GitHub workflows não bastava para provar exclusividade; a verificação Workers Builds deve constar da avaliação de autoridade real. Se houver novo deploy fora do gate, verificar seu autor antes de promover qualquer release.

## 25/11/2026 — correção do comando Wrangler M5

A PR [#177](https://github.com/tonecosstudio/tonecosstudio/pull/177) passou nos testes do GitHub Actions e foi integrada à main em `b914ad2d8fc65713b98bb941ecc9a78c048954d4`. O `wrangler@4.155.0 d1 migrations apply --help` foi executado fisicamente via OrdaX MCP (processo `308c05a2-01ad-4e23-b199-fb7fbfcea463`, exit 0), comprovando suporte a `--remote` e `--config`, mas não a `--yes`. A opção final `--yes` da CLI Wrangler foi removida no Quality Gate; o `npx --yes` de instalação permanece. O modo CI não interativo não solicita confirmação. Teste de regressão adicionado à suíte existente.

**Migrações não aplicadas por essa alteração de código.** O D1 continuava com última migration `0027` na última verificação; o próximo bloqueio conhecido é a ausência de `CLOUDFLARE_API_TOKEN` no ambiente GitHub Actions `production`. Não transmitir o token no chat nem contornar o Quality Gate. Executar somente 0028–0033 após configurar o secret e comprovar os gates do publicador único.
