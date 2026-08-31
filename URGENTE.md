# URGENTE — prontidão para lançamento

Status: **EM EXECUÇÃO — NO-GO para lançamento**  
Atualizado em: **2026-08-30 (America/Bahia)**  
Branch operacional: **main somente**  
HEAD funcional antes deste checkpoint: `24170497ddf2b5b021412ea2ede23956d4993d02`

Este arquivo é o **SSOT operacional** da preparação para lançamento do ORDAX. Histórico detalhado permanece no Git; aqui ficam o estado vigente, bloqueios comprovados, provas e próxima ordem de execução.

## 1. Regras vigentes

1. Trabalhar diretamente na `main`; não criar branch/PR sem nova instrução explícita.
2. Commits pequenos e reversíveis.
3. Frontend nunca é fronteira suficiente de autorização ou segurança.
4. Preço, crédito, disponibilidade, pagamento e permissão devem falhar fechados quando a fonte oficial não puder ser validada.
5. Segredos e `service_role` nunca entram em `VITE_*` ou bundle do navegador.
6. Um domínio deve ter uma autoridade canônica; remover executores, mocks e caminhos paralelos desnecessários.
7. Código/migration versionado não equivale a deploy ou prova remota.
8. Arquivos gerados não devem ser editados manualmente para esconder drift de schema; devem ser regenerados da fonte oficial.
9. Não declarar GO, segurança, CI verde ou lançamento sem prova reproduzível.

## 2. Estado atual

| Área | Estado | Observação |
| --- | --- | --- |
| Branch | **main somente** | decisão explícita do usuário |
| Proteção da main | **PENDENTE** | `protected=false`, required checks desligados |
| Quality Gate | **BLOQUEADO NA INFRA** | run #103 no HEAD `2417049...` falhou antes de qualquer step; job retorna `steps=[]` |
| Runtime | **Node 24.x** | manifesto e workflow alinhados |
| Pacote | **ordax-web@0.1.0** | identidade de template removida |
| Package manager | **NÃO CONSOLIDADO** | manter locks concorrentes até `npm ci` real |
| Raiz/SSOT | **MELHORADO** | `AGENTS.md`, `README.md`, `URGENTE.md`; histórico obsoleto sendo arquivado |
| Catálogo mock | **REMOVIDO DO RUNTIME** | sem fallback demonstrativo no serviço público |
| Comercial BRL | **FAIL-CLOSED NO CÓDIGO** | preço cheio, PIX, entrada e avulsos não recebem defaults comerciais locais |
| Comercial coins | **FAIL-CLOSED NO CÓDIGO** | referências, poder de compra e editores não inventam 200/240/300/450 ou multiplicadores |
| Compra de coins | **REMOVIDA** | CTA, rota `/coins/purchase`, redirect e componentes legados sem consumidores removidos |
| Coleções públicas | **DESATIVADAS HONESTAMENTE** | flag também bloqueia query de previews quando `PUBLIC_COLLECTIONS_ENABLED=false` |
| Payment voucher | **PRIVADO NO CÓDIGO** | object path por usuário + RLS; ainda sem prova remota |
| Payment proof | **SERVER-AUTHORITY VERSIONADA** | upload/scanner/rate limit/Storage migrados para Edge Function |
| Anexos de suporte | **SERVER-AUTHORITY VERSIONADA** | bucket privado, Edge upload, signed URLs e RLS de nota interna |
| Supabase canônico | **CONFIRMADO, MAS INATIVO** | `supabase/config.toml` aponta `pdytjhtjlxvbbeuxgnms` = `Ordax-2026-1`; status remoto `INACTIVE` |
| Tipos Supabase | **DRIFT COMPROVADO** | migrations adicionam campos de `subscription_plans` ausentes no `types.ts`; geração oficial bloqueada pelo projeto inativo |
| Vercel/smoke visual | **SEM PROVA ATUAL** | build publicado e desktop/mobile ainda pendentes |
| Lançamento | **NO-GO** | CI, banco remoto, E2E, segurança e release engineering sem prova suficiente |

## 3. Concluído nesta preparação

### 3.1 Governança e limpeza

- [x] auditoria inicial de repo, Actions, site e Supabase;
- [x] `AGENTS.md` e `URGENTE.md` como contrato/SSOT;
- [x] limpeza da raiz e arquivamento do histórico principal;
- [x] remoção de `.lnk`, launcher/ruído operacional e spec `.kiro` órfão;
- [x] identidade `ordax-web@0.1.0` e Node 24.x;
- [x] Quality Gate versionado;
- [x] documentos antigos que declaravam produção pronta/Sentry fictício removidos de `docs/` e preservados em `docs-archive/`;
- [ ] restaurar execução real do runner;
- [ ] proteger `main` quando o gate puder executar de verdade.

### 3.2 Mocks, placeholders e superfícies falsas

- [x] catálogo mock removido do runtime;
- [x] variáveis/scripts do mock removidos;
- [x] placeholders visuais de produto obsoletos removidos;
- [x] Open Graph real criado;
- [x] defaults inventados de social, telefone, CNPJ e endereço removidos;
- [x] versão visual sem correspondência removida;
- [x] compra fake de coins removida completamente, inclusive rota/redirect;
- [x] conjunto legado `src/components/catalog/*` sem consumidores removido; continha CTA sem ação e compra de coins inexistente;
- [x] consultas de previews de coleções desativadas quando a feature pública está desligada;
- [ ] continuar inventário de flags, rotas e integrações legadas.

### 3.3 Preços, coins e assinatura

- [x] compra avulsa sem preço hardcoded de fallback;
- [x] preço/PIX/entrada/saldos validados como finitos e coerentes;
- [x] planos inválidos não são oferecidos;
- [x] assinatura não inventa coins, economia, preço contextual ou `R$ 0,00` de carregamento;
- [x] pré-lançamento e pré-vendas falham fechados sem configuração comercial oficial;
- [x] templates de suporte usam preços oficiais e bloqueiam variáveis não resolvidas;
- [x] removida equivalência silenciosa `1 coin = R$ 0,10`;
- [x] `character-pricing-service` não fabrica bases `200/300/450` nem multiplicadores `1.0/1.2/1.5`;
- [x] poder de compra mostra erro/retry quando o pricing oficial está ausente, em vez de spinner/estimativa infinita;
- [x] editor de pricing em coins não inicializa nem salva defaults fictícios;
- [x] tela `AdminCoinsSystem` não mascara erro de métricas como zeros reais e não exibe exemplos/preços codificados;
- [x] editor de preços avulsos não inicializa R$ 500/600/750/900, não exibe mapeamento coins fictício e bloqueia configuração incompleta/inconsistente;
- [x] tela de prazos não promete recálculo automático inexistente de ciclos;
- [ ] testar ponta a ponta em backend/preview operacionais.

### 3.4 Uploads e Storage

#### `payment-vouchers`

- [x] autenticação obrigatória;
- [x] object path privado ligado ao `auth.uid()`;
- [x] bucket privado/MIME/5 MB/RLS versionados;
- [x] checkout valida propriedade do path;
- [x] corpo privilegiado preservado em `private_api`, wrapper `public` como `SECURITY INVOKER`;
- [x] documentação pública antiga removida.

#### `payment-proofs`

- [x] removido scanner ClamAV/browser e configuração `VITE_CLAMAV_*`;
- [x] scanner passou a usar segredos server-only `MALWARE_SCANNER_URL/TOKEN`;
- [x] validação canônica server-side: nome, 1 byte–5 MB, MIME, extensão e magic bytes;
- [x] rate limit passou de memória do browser para banco/Edge;
- [x] ownership do pagamento verificado server-side;
- [x] upload Storage via service role; browser não escreve diretamente;
- [x] bucket privado e políticas server-upload-only versionadas;
- [x] metadata continua usando RPC autenticado para preservar `auth.uid()`;
- [x] testes antigos do scanner/browser removidos e contrato do Edge testado estaticamente;
- [x] regra de segurança de upload centralizada em `_shared/secure-upload.ts`.

#### `support-attachments`

- [x] removido upload direto do navegador;
- [x] criada `upload-support-attachment` com JWT, rate limit e autorização de conversa/mensagem;
- [x] mesma validação/magic bytes/scanner canônico de `payment-proofs`;
- [x] bucket `support-attachments` privado, 5 MB e JPEG/PNG/PDF;
- [x] nenhum INSERT/UPDATE direto para `authenticated` no Storage/metadata;
- [x] `file_path` único e RPC exige objeto existente antes de registrar metadata;
- [x] `public_url` legado permanece `NULL` no banco;
- [x] leitura usa signed URL temporária, não `getPublicUrl()` real;
- [x] cache de signed URL é limpo em troca/logout de usuário;
- [x] cliente não recebe anexos de notas internas via RLS/Storage.

**Importante:** migrations/Edge Functions versionadas **não foram declaradas aplicadas no Supabase remoto**.

## 4. Bloqueios comprovados

### GitHub Actions

Última prova do código deste checkpoint:

- run `33352678701` / Quality Gate #103;
- HEAD `24170497ddf2b5b021412ea2ede23956d4993d02`;
- job `99368918187` — `Build, test and security`;
- conclusão `failure`;
- `steps=[]`;
- execução terminou aproximadamente quatro segundos após iniciar.

Conclusão: a falha continua anterior a checkout/typecheck/lint/test/build. Não tratar como falha de aplicação e não consumir tempo rerodando o mesmo workflow enquanto esse padrão persistir.

### Supabase

Fonte canônica confirmada pelo próprio repositório:

- `supabase/config.toml`: `project_id = "pdytjhtjlxvbbeuxgnms"`;
- projeto conectado: `Ordax-2026-1`;
- estado observado: `INACTIVE`;
- tentativa oficial de gerar TypeScript types: recusada com `Project must be active and healthy.`;
- migration `20260528120000_admin_subscription_plan_configuration_rpc.sql` adiciona campos em `subscription_plans` ainda ausentes no arquivo de tipos gerado versionado.

Consequências:

- não editar `src/integrations/supabase/types.ts` manualmente para mascarar drift;
- não declarar migrations aplicadas, RLS correto ou Edge Functions implantadas;
- quando o projeto estiver ativo, medir migration drift, aplicar/reconciliar schema e **regenerar tipos oficialmente**;
- não restaurar/alterar outro projeto Supabase por semelhança de nome.

### Deploy/visual

- Vercel teve bloqueio anterior por limite do plano Hobby;
- mudanças recentes não possuem build/smoke público comprovado;
- não aprovar UI apenas por inspeção de código.

## 5. Próxima ordem de execução

### P0 — Prova de engenharia

- [ ] resolver alocação/execução do GitHub Actions;
- [ ] `npm ci` em Node 24;
- [ ] format, typecheck, lint, auditoria Supabase, testes/cobertura e build;
- [ ] `npm audit` e correção controlada de high/critical;
- [ ] somente depois consolidar npm/remover locks concorrentes se comprovadamente desnecessários.

### P1 — Superfícies, integrações e legados

- [ ] continuar inventário de feature flags e rotas desativadas/sem implementação;
- [ ] remover telas que parecem operacionais mas são no-op/placeholder;
- [ ] revisar integrações opcionais expostas na UI antes de estarem configuradas;
- [ ] revisar templates `.env*` restantes e eliminar duplicidade/claims obsoletos;
- [ ] revisar `docs/` vigente e separar setup/operations/arquitetura/histórico;
- [ ] localizar aliases/serviços de compatibilidade sem consumidores e remover quando seguro.

### P2 — Supabase e segurança remota

- [x] confirmar project ref canônico do repositório;
- [ ] restaurar/ativar o projeto correto somente quando essa etapa operacional for deliberadamente executada;
- [ ] medir migration drift;
- [ ] aplicar/reconciliar migrations de forma controlada;
- [ ] regenerar `src/integrations/supabase/types.ts` da fonte remota reconciliada;
- [ ] provar RLS/grants/Storage/`SECURITY DEFINER`/schemas privados;
- [ ] auditar todas as funções `verify_jwt=false` e proteção alternativa;
- [ ] reconciliar funções Git x implantadas;
- [ ] BOLA/IDOR cliente/admin/pagamento/suporte;
- [ ] provar ausência de `service_role` no bundle;
- [ ] testar malware scanner server-side real e comportamento fail-closed.

### P3 — Funcionalidade e UI

- [ ] restaurar/corrigir catálogo publicado vazio, se ainda aplicável no ambiente alvo;
- [ ] smoke público: home, universo, personagem, modelo, detalhe, busca, contato;
- [ ] auth: cadastro, login, recuperação, logout;
- [ ] cliente: perfil, wishlist, dashboard, notificações e suporte;
- [ ] admin/RBAC;
- [ ] compra/assinatura/pagamento em ambiente de teste;
- [ ] desktop/tablet/mobile, loading/vazio/erro/retry;
- [ ] acessibilidade e Lighthouse/Core Web Vitals medidos.

### P4 — Release engineering

- [ ] SemVer/política de release;
- [ ] staging/preview separado de produção;
- [ ] artefato imutável promovido entre ambientes;
- [ ] secrets checklist;
- [ ] monitoramento/logs/alertas reais;
- [ ] backup/restore/rollback ensaiados;
- [ ] RC e release notes.

## 6. Critérios de GO

Todos devem estar verdadeiros:

- [ ] Quality Gate verde no commit exato da RC;
- [ ] instalação reproduzível;
- [ ] nenhum secret high-confidence em Git/bundle;
- [ ] nenhum risco crítico/alto aberto sem mitigação/aceitação formal;
- [ ] RLS, grants, Storage e funções privilegiadas provados no ambiente ativo;
- [ ] catálogo real e estados de falha honestos;
- [ ] pagamentos/uploads do escopo testados ponta a ponta;
- [ ] fluxos público/cliente/admin aprovados;
- [ ] cobertura mínima configurada satisfeita;
- [ ] acessibilidade/desempenho medidos;
- [ ] dados legais/LGPD validados;
- [ ] backup/restore/rollback ensaiados;
- [ ] RC versionada, monitorada e reversível.

## 7. Checkpoint 10 — 2026-08-30

HEAD de início: `e5546acff74f81a212ea857fae29c0109e166267`  
HEAD funcional antes do documento: `4fb8eb470156f319615af3b01ebc3707e3e3b3ba`

Foco: uploads privados, autoridade server-side para comprovantes/suporte e remoção do scanner browser. Detalhes completos permanecem no histórico Git deste arquivo.

## 8. Checkpoint 11 — 2026-08-30

HEAD funcional antes deste documento: `24170497ddf2b5b021412ea2ede23956d4993d02`

Concluído:

- valores comerciais BRL e coins deixaram de possuir fallbacks fictícios no runtime auditado;
- pré-lançamento, pré-vendas, templates, planos, calculadoras e editores passaram a falhar fechados;
- removida equivalência falsa entre coins e reais;
- compra de coins fictícia removida integralmente, inclusive rota e componentes legados sem consumidores;
- `PUBLIC_COLLECTIONS_ENABLED=false` passou a bloquear também queries de preview;
- telas administrativas de coins não mascaram erro como zero real nem permitem salvar defaults de exemplo;
- preços avulsos não usam R$ 500/600/750/900 nem badges 200/240/300/450 hardcoded;
- documentos antigos de “produção pronta”/Sentry e roadmap percentual foram retirados da documentação ativa e preservados no arquivo histórico;
- project ref Supabase canônico foi confirmado pelo `config.toml` e pelo conector;
- drift de `subscription_plans` x `types.ts` foi identificado sem adulterar o arquivo gerado;
- Quality Gate #103 foi novamente provado como falha anterior a qualquer step.

Provas:

- HEAD `24170497ddf2b5b021412ea2ede23956d4993d02` na `main`;
- Quality Gate run `33352678701`, job `99368918187`, `failure`, `steps=[]`;
- Supabase `pdytjhtjlxvbbeuxgnms` = `Ordax-2026-1`, atualmente `INACTIVE`;
- geração oficial de tipos recusada porque o projeto não está ativo/saudável;
- migration versionada adiciona colunas de `subscription_plans` que ainda não constam no `types.ts` gerado.

Bloqueios:

- nenhum typecheck/test/build real executado no CI;
- Supabase canônico inativo e sem prova de migrations/Edge/RLS efetivos;
- tipos gerados não podem ser reconciliados oficialmente enquanto a fonte remota estiver inativa;
- preview/smoke visual ainda pendente;
- `main` continua sem proteção.

Next action:

1. continuar auditoria estática de superfícies e integrações que possam simular funcionamento;
2. revisar Edge Functions/RPCs ativos por autoridade, preços, BOLA/IDOR e funções privilegiadas enquanto o banco remoto estiver indisponível;
3. corrigir a primeira falha **real** do Quality Gate somente quando houver steps de runner;
4. quando a etapa remota for deliberadamente iniciada, ativar o projeto correto, medir drift, aplicar/reconciliar migrations e regenerar tipos;
5. só então avançar para E2E, smoke visual e release candidate.

Do not repeat:

- não reintroduzir defaults comerciais como R$ 500/475/100, R$ 500/600/750/900, 200/240/300/450 coins ou multiplicadores contextuais fictícios;
- não reintroduzir `/coins/purchase` sem uma implementação real e testada;
- não editar tipos Supabase gerados manualmente para esconder drift;
- não restaurar/tocar outro projeto Supabase por nome parecido;
- não reintroduzir upload direto do browser para comprovantes/suporte;
- não usar `getPublicUrl()` para anexos privados;
- não colocar scanner/segredos em `VITE_*`;
- não tratar validação client-side como fronteira de segurança;
- não criar branch/PR nesta execução;
- não declarar migration aplicada, CI verde ou GO sem prova.