# MIGRAÇÃO DO CATÁLOGO — REPOSITÓRIO ÚNICO TONECOS

> **Documento canônico de execução e checkpoint.** Decisão do proprietário: o código do frontend e da API ficará exclusivamente no repositório tonecosstudio/tonecosstudio. NÃO criar tonecosstudio/catalogo, fork nem monorepo paralelo. Atualizado em 04/11/2026. **Plano aprovado; migração/cutover de produção ainda NÃO foram executados.**

## 1. Objetivo e fonte da verdade

- GitHub destino: **tonecosstudio/tonecosstudio**, ID **1163825583**; manter a única branch de integração **integration/tonecosstudio-canonical-20261101** e **PR draft #4**, sem branch ou PR nova.
- Origem temporária do Worker: **washingtonmsdj/catalogo**, ID **1398242143**, main observada **a4bf22bb8044a88f0c5d0b54b3e9d3fdead0b34c** em 04/11/2026. O SHA é **evidência histórica, nunca um pin vivo de deploy**. Na inspeção havia 3 PRs abertas (#266 correção de mídia R2; #264 e #263 dependências). Não importar código ignorando essas alterações.
- O frontend antigo no catálogo Washington serve hoje **acheguese.com.br/tonecosstudios/** e **washingtonmsdj.github.io/catalogo/**; ambos tiveram HEAD 200, mas isso não prova conteúdo funcional. O HTML público novo da Tonecos será **um único frontend** no Cloudflare Pages. Não copiar React, CSS, design system, assets gerados ou telas da origem.
- Infraestrutura EXISTENTE e definitiva: Cloudflare **conta Tonecos** (ID **8827c547d6def5ee5b9ca550fdd5680a**), Pages **tonecosstudio**, Worker **tonecos-catalogo-api**, D1 **tonecos-catalogo**, R2 **tonecos-catalogo-media**; Pages Function **functions/catalogo-api/[[path]].js** consome **CATALOG_WORKER**. NÃO criar banco, bucket, Worker, endpoint, canal ou segundo writer.
- **SSOT de execução:** este plano + **config/catalog-code-consolidation.json** (inventário de blob SHA, estado e ownership) + **scripts/architecture/catalog-monorepo.test.mjs** (guard local sem rede). O código e o estado remoto verificados têm precedência sobre SHAs e contadores datados. O **URGENTE.md** é somente o checkpoint breve; não replicar planos concorrentes.

## 2. Estrutura final — uma repo, pipelines separados

    tonecosstudio/tonecosstudio/
    ├── src/                    # Site e componentes públicos existentes
    ├── functions/catalogo-api/ # Proxy GET allowlisted da Pages; não acessa D1/R2 diretamente
    ├── services/catalogo/      # FUTURO dono do código Worker, SQL D1, testes e tooling estritamente necessário
    │   ├── worker/             # API e gateway /media do backend (após gate de importação)
    │   ├── migrations/         # EXCLUSIVAMENTE migrações do banco D1 já existente
    │   ├── config/             # Contratos de schema e Wrangler do Worker existente
    │   ├── tools/              # Apenas utilitários backend comprovadamente necessários
    │   └── README.md          # Operação, ownership, rollback e contrato de deploy
    ├── supabase/               # Módulos comerciais FUTUROS, NÃO confundir com D1
    ├── scripts/catalog/        # Ferramentas legadas: classificar antes de promover à autoridade
    ├── config/catalog-code-consolidation.json
    ├── docs/MIGRACAO_CATALOGO_MONOREPO.md
    └── URGENTE.md

**Pipelines devem ser independentes por impacto.** Mudanças em site/estilos jamais promovem Worker ou rodam SQL. Mudanças no Worker não exigem reconstruir Pages se o contrato não mudou. Migrações SQL apenas com mudança de esquema, orçamento D1 medido SEM consulta SQL prévia, e rollback/migration-first apropriados. A integração de código não autoriza deployment.

## 3. Etapas de execução — marcar SOMENTE com evidência

### M0 — Decisão, proteção, inventário e continuidade (EM EXECUÇÃO)

- [x] Decisão do proprietário: **um repositório**, sem repo tonecosstudio/catalogo e sem duplicar interfaces.
- [x] Duas contas e IDs GitHub confirmados; repositório destino privado, origem público; Cloudflare com Worker, D1, R2 e binding já existentes.
- [x] Árvore de origem lida **uma vez**: 652 blobs, incluindo **12 arquivos worker, 22 migrations, 211 tools, 26 config, 68 src e 280 docs**. Esses conjuntos não têm a mesma autoridade: não migrar 652 arquivos cegamente.
- [x] PRs de origem #266, #264 e #263 identificadas; prioridade para **#266**, que corrige imagem R2. A homologação final dessa mudança é pendência real.
- [x] Checkpoint e inventário de blobs SHA gravados na **branch/PR #4**, sem acionamento de Cloudflare.
- [x] **Guard executado no Windows físico isolado**: Node.js **v24.22.2**, comando `node --test scripts/architecture/catalog-monorepo.test.mjs`, **5 testes / 5 PASS / 0 FAIL**, exit **0**, arquivos provenientes do SHA `d2cffee1fb94b0540b7e362d163200404a929bbe`. Ambiente temporário, sem deploy, D1, R2, rede ou build. O guard passa a ter **6** testes após a inclusão do grafo de imports em M1; executar de novo antes de encerrar o novo commit.

**Saída M0:** plano/manifesto/teste versionados; Pages público e Writer do Worker inalterados; próxima ação M1.

### M1 — Reconciliação e mapa causal do código do Worker (PENDENTE)

- [ ] Reconsultar a **main viva** da origem, PRs abertas e o que a #266 efetivamente corrigiu; preservar mudanças exclusivas. Não copiar revisão obsoleta.
- [x] **Mapa inicial de imports do entrypoint feito na origem main auditada:** **9/12** arquivos TS são alcançáveis via import estático de **worker/entry.ts**; **worker/quoteAdminAccess.ts**, **worker/quoteAdminApi.ts** e **worker/quoteWorkflow.ts** não fazem parte desse grafo, não importá-los automaticamente como runtime público. **worker/schemaContract.ts** importa **config/catalog-schema-contract.json**. Paths verificáveis em **config/catalog-code-consolidation.json → origin.staticImportGraph**. Importação dinâmica e funções comerciais ainda requerem revisão.
- [ ] Completar dependências de **22 migrations, wrangler e das 211 ferramentas** de deploy, validação, cache e media. Classificar **essencial**, **somente frontend antigo**, **manutenção editorial** ou **histórico**, sem assumir que todo arquivo do antigo repo integra o Worker.
- [ ] Comparar os 60 scripts/catalog presentes no site: não permitir pipelines concorrentes de publicação; manter ingestion/Drive sob o respectivo proprietário até provar ownership e quota.
- [ ] Definir pacote Node/TS isolado sem conflito com **src/** e **supabase/migrations/**, com testes offline reais e prova de cobertura. Construir um mapa de destino/sha de cada arquivo escolhido; nenhuma consulta remota D1/R2.
- [ ] Verificar triggers ativos em **washingtonmsdj/catalogo**, proteção de branch, environments, secrets/variables por presença (**nunca exibir segredos**), histórico de release e rollback. Coordenar com responsável do catálogo antes de travar seus pushes.

**Saída M1:** lista fechada de arquivos e dependências, base fonte reconciliada, nenhum código copiado por especulação. **Não saltar para M5.**

### M2 — Importação inativa do backend na MESMA PR #4 (PENDENTE)

- [ ] Copiar **uma vez** o Worker reconciliado, config, migrations D1 e utilitários indispensáveis sob **services/catalogo/**; manter proveniência path/sha e testes equivalentes. Não incluir UI React antiga, docs acumulativos, objetos R2 ou dados D1.
- [ ] Ajustar import paths e tooling para o novo root, sem trocar nome/id de Worker, D1, R2 nem alterar contratos públicos. Sem bundle duplicado de Pages.
- [ ] Na migração, mudar fase do manifesto para **staged-offline**, mantendo **activeWorkerPublisher=washingtonmsdj/catalogo** e **targetWorkerReleaseEnabled=false**. Um código candidato inativo pode coexistir para **verificação**; não podem existir **dois writers ativos**.
- [ ] Verificar que o código existente do Studio não possui consumidores de API antiga fora do allowlist da Pages. Não colar segredos, artefatos compilados ou modelos.

**Saída M2:** candidato completo versionado, não publicado, na mesma branch/PR, com hashes verificáveis.

### M3 — Equivalência e testes offline / custo-zero (PENDENTE)

- [ ] Node/TypeScript tests do Worker, gallery/media (incluindo range, HEAD/GET, status 200, ETag, traversal, ausência de Range e correção #266), busca/cursor, schema e Turnstile.
- [ ] Gates de integração Pages Function → CATALOG_WORKER usando mocks; respostas 405/404 para métodos/caminhos não públicos; nunca encaminhar cookies/tokens; erro de binding falha fechado.
- [ ] Validar **migrations D1 por contrato e diff de código**, sem aplicar nem executar SQL remoto. Conferir que DB e MEDIA continuam nomes/IDs canônicos.
- [ ] Revisar se há testes de Worker que dependem de endpoints antigos do Achegue-se e separá-los de testes de frontend. CI não deve usar o D1 como fixture.

**Saída M3:** relatório verificável de testes e SHA da origem/candidato, nenhuma alegação de equivalência sem logs.

### M4 — CI por impacto, SEM publicação (PENDENTE)

- [ ] Integrar ao fluxo CI **existente** do Studio jobs com filtros exclusivos de paths para Worker e Pages; não duplicar workflows/branches. Reutilizar caches Node/CI.
- [ ] Release do Worker **desligado por padrão**; ambiente production e credenciais Tonecos somente após autorização. Mudança de frontend nunca aplica migration. Usar M3 + controle de custo como preflight.
- [ ] Conferir diffs, checks verdes e readiness do rollback; preparar plano para impedir que o GitHub Washington continue publicando Worker depois do cutover.
- [ ] Preservar deploy Cloudflare Pages produção/preview automáticos **OFF** e manter Cloudflare Access/noindex até autorização de lançamento.

**Saída M4:** código buildável e gates independentes, ainda sem deploy novo.

### M5 — Cutover do ÚNICO publicador da API (BLOQUEADO ATÉ GO EXPLÍCITO)

- [ ] Revalidar main/PRs e pipeline da origem imediatamente antes da janela; coordenar pausa de gatilho da **.github/workflows/cloudflare.yml** no Washington sem apagar provas/branches.
- [ ] Com autorização explícita, desabilitar primeiro **writer antigo**, comprovar que somente o Studio pode promover o MESMO Worker; liberar exatamente um pipeline novo depois de testes M3/M4. **Nunca habilitar dois publishers simultaneamente.**
- [ ] Validar estado remoto do Worker, bindings, compatibilidade de schema, orçamento D1 e versão a restaurar. Se o código não alterou schema, não fazer migrations; se alterou, aplicar somente as necessárias com gates reais.
- [ ] Promover versão de forma controlada, smoke mínimo e rollback testado; D1/R2 permanecem onde estão. Só após prova refletir **cutover-complete** no manifesto; não marcar concluído baseado em CI isolado.

**Saída M5:** API e dados existentes servidos, com apenas um repositório dono do deploy.

### M6 — Única interface pública e encerramento do legado (BLOQUEADO ATÉ GO EXPLÍCITO)

- [ ] Revisão legal de conteúdo, marca, direitos e LGPD; QA autenticado desktop/mobile do site Tonecos, filtros, links profundos, 6 capas e galeria; SEO sob flag explicitamente aprovada.
- [ ] Homologar Cloudflare Pages, HTTPS, domínio/canonical e rollback. Preservar URLs antigas do Achegue-se / GitHub Pages até cutover e redirecionamento testado; **HEAD 200 não basta**.
- [ ] Encerrar Git da Vercel Tonecos antiga na conta Washington, preservando integralmente os domínios OrdaX; não contratar plano pago.
- [ ] Só depois arquivar **washingtonmsdj/catalogo** como histórico read-only quando o mesmo código/contratos/PRs necessários estiverem reconciliados, não houver dependência de workflow/Pages antigo e houver aceite do proprietário. **Não transferir esse repo para tonecosstudio/catalogo e não o apagar.**
- [ ] Atualizar README, AGENTS, docs/README, URGENTE e o manifesto na MESMA PR ou no fluxo canônico já integrado, sem criar documentação paralela.

**Saída M6:** um site, uma API, um repositório dono dos códigos e deploys, um D1 e um R2; origem Washington sem writers; evidências e histórico preservados.

## 4. Travas absolutas

1. **NO-GO por padrão:** nunca habilitar deploy/merge/produção automaticamente por ter criado este plano ou passado um teste.
2. **Um writer por serviço:** Washington é o publicador do Worker até o cutover M5 comprovado; Studio não ativa Worker antes de desabilitar fonte anterior.
3. **Dados não migram:** não criar D1, R2, bancos, buckets, workers, secret scopes ou cópias de mídia. Não realizar auditorias integrais, download em massa, consultas ou imports D1 em testes.
4. **Frontend não se duplica:** nunca importar src/ e assets do antigo catálogo como novo app; aproveitar frontend Tonecos já existente.
5. **Proveniência e drift:** SHA da origem no JSON é observação datada; antes de importar revalidar PR #266 e main. Diff imprevisto bloqueia e exige reconciliação — nunca substituir à força.
6. **Gates reais:** CI e testes locais não substituem QA visual Cloudflare Access, aprovação jurídica, rollback e autorização explícita.
7. **Um fluxo Git:** somente branch integration/tonecosstudio-canonical-20261101 e PR draft #4 durante esta implementação. Outro agente/automação deve verificar HEAD antes de escrever.

## 5. Checkpoint para qualquer conversa/agente

**ESTADO AGORA: M0 verificado (5/5 no SHA d2cffee) / M1 em execução (grafo 9/12, importação pendente).**
**HEAD de observação do frontend:** 7e70ec68a4ac0338be5ddc4a8df9ad47957191c8 (antes deste plano; nunca presumir que continua atual).
**MAIN origem observada:** a4bf22bb8044a88f0c5d0b54b3e9d3fdead0b34c.
**PRs origem abertas na auditoria:** #266 (prioritária), #264, #263.
**DO_NOT_REPEAT:** não rodar D1/R2 para investigar Git, não criar tonecosstudio/catalogo, não replicar UI, não construir novo Worker, não criar PR/branch, não reiniciar builds só por docs.
**NEXT_ACTION:** revalidar PR #4 HEAD + main/PR #266 da origem → validar o guard de 6 testes no novo SHA → mapear ferramentas e 22 migrations em M1 → importar somente código necessário depois de fechar o mapa e reconciliar a correção de mídia da #266.
**BLOQUEIOS:** API publisher ainda em Washington; QA legal/visual, Vercel desconectada e release aprovados ainda pendentes.
