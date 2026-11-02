# Tonecos Studio — consolidação canônica do site e catálogo

Estado: **EM INTEGRAÇÃO / NO-GO**. Esta diretriz substitui o planejamento de plataforma de apps OrdaX como orientação do produto comercial Tonecos, sem apagar seu histórico.

## Continuidade após liberação da Vercel — 02/11/2026

- A identidade da Vercel foi confirmada diretamente na equipe `jogo-brasils-projects`: o projeto existente agora é `tonecosstudio`, conectado ao repositório `washingtonmsdj/tonecosstudio`. Seu ID foi preservado, evitando cópia paralela.
- **Separação de produção ainda bloqueada:** `ordax.com.br` e `www.ordax.com.br` permanecem registrados mas não verificados na configuração do projeto Tonecos. Retirá-los antes de qualquer merge/deploy de produção. Preservar sites do OrdaX OS.
- Vercel `bf162ef`: `npm run release:verify` atingiu TypeScript e parou por cinco `\\n` literais no JSX da ficha (`TS1127`). Correção validada com esbuild local, e gateway/galeria validado com Vitest 9/9, TS estrito isolado e Prettier. Estes resultados não comprovam ainda que `release:verify` completo passa.
- O checkout privado pode ser substituído para verificações pontuais por arquivos obtidos pela conexão autorizada do GitHub e testes offline, sem reconstruir os 2.008 arquivos nem consultar D1; compilação E2E completa requer ambiente com acesso ao repositório ou CI/preview autenticado.

## Autoridade de preços — atualização do SSOT em 02/11/2026

- `src/services/pricing/pricing-settings-service.ts` é o **único leitor/validador canônico** de `system_settings` para preços públicos e orçamento de coleção. O módulo `collection-pricing-service.ts` delega a `fetchPricingSettings({ forceRefresh: true })`, eliminando a leitura e o parse comerciais duplicados. Não introduzir consulta paralela a `system_settings` em outros serviços de coleção.
- Consultas informativas podem utilizar o cache existente, mas precificação para uma coleção deve buscar valores atuais. A cotação final e autorização permanecem sob autoridade de serviços comerciais do Supabase, jamais do navegador ou de um modelo do catálogo Cloudflare.
- Testes de contrato: `pricing-settings-service.test.ts` e `collection-pricing-service.test.ts`, 32/32 aprovados localmente em isolamento; Vercel e `release:verify` do SHA final ainda obrigatórios.

## Identidade visual canônica — decisão do proprietário em 02/11/2026

**Não redesenhar o Tonecos Studio.** O layout oficial é o do antigo OrdaX, com identidade/nomes substituídos por Tonecos. Preservar o visual escuro com detalhes dourados, as estruturas de navegação e HUD, os componentes Arcade, tipografia, espaçamentos, efeitos, Home, cards, área de cliente e administração. Comparar com a `main` pré-integração `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41` como referência visual (não como autoridade para recuperar consultas Supabase legadas).

**Únicas adaptações visuais autorizadas sem novo pedido:** acomodar mais de 2 mil modelos, adicionar categorias, franquias, tags, busca e filtros, listagem paginada por cursor, galerias, seleção, estados vazios/erro e layout responsivo. A API Cloudflare é autoridade dos modelos; os serviços comerciais existentes continuam no Supabase. Não adicionar consultas de acervo em massa nem replicação Supabase.

**Débito visual concreto:** `src/pages/CatalogModelsArcade.tsx` e `src/pages/catalog/CanonicalModelDetails.tsx` foram implementados com paleta marfim/oliva e tokens `--tonecos-*`. Isso diverge do layout aprovado e deve ser corrigido antes de integrar à `main`. Reutilizar `ArcadeHero`, `ArcadeSectionTitle`, `ArcadeCard` e tokens preexistentes `--gold-accent`, sem copiar `UniverseModelCard` com seus hooks legados de catálogo/preços. Manter toda a lógica funcional já implementada de cursor, URL `/modelos/:slug`, mídia, galeria e seleção. Reconciliar os tokens temporários após a migração; não estabelecer outro design system.

**Gate visual:** executar confronto desktop/mobile com referência original, confirmando que não houve redesign geral, e avaliar listagem densa, filtros/tags, controles de paginação, detalhes e acessibilidade. Bloqueia GO enquanto a divergência da nova vitrine não for resolvida.

## Missão e proprietários

- **Produto único:** `washingtonmsdj/tonecosstudio` hospeda a experiência web Tonecos (home, modelos, seleção, clientes, orçamentos, pagamentos, pedidos e produção).
- **Marca pública:** `src/config/brand.ts` fornece nome e assinatura canônica **Tonecos Studio**. Marca pública não define automaticamente razão social, canais de contato, propriedade intelectual ou domínio. `CONTACT` mantém configuração comercial; dados legais precisam ser confirmados.
- **Catálogo de modelos:** `washingtonmsdj/catalogo` continua sendo fonte técnica temporária da API canônica Cloudflare (Worker + D1 + R2 + Drive), com metadados, busca, mídia e identidade do modelo. O Studio **não** deve recriar `public_catalog_models` no Supabase para o novo acervo, executar ingestão própria ou indexar uma cópia integral do inventário.
- **Operação comercial:** o backend Supabase do Studio é autoridade sobre sessões, clientes, orçamentos comerciais finais, preços aprovados, pedidos, pagamentos e produção. O site **não** deve converter um `POST /api/quotes` do Worker em pedido Supabase automaticamente: o cruzamento exige contrato idempotente com referências e autorização.
- **Rastro de migração:** preservar IDs Cloudflare de origem em referências comerciais explícitas, sem atribuir falsos UUIDs Supabase, e vincular cada solicitação a sua situação editorial/publicada.
- **Projeto legado:** `washingtonmsdj/catalogo` somente será arquivado depois de o Studio consumir o Worker com QA móvel/desktop, links antigos reconciliados e publicação/rollback comprovados. Não apagar dados, buckets ou histórico antes.

## Prova de implementação inicial na única branch

`integration/tonecosstudio-canonical-20261101`

Implementado:
- Commit `bf162ef20bcd56f0d9b6c45b32d729c794904e06`: a ficha pública direta de slugs agora usa o catálogo canônico e a galeria por cursor/versão; links com UUID seguem no fluxo legado durante a transição.
- `src/config/brand.ts` e teste: marca visual canônica.
- Header, footer, home e SEO das principais páginas removem OrdaX como marca pública.
- HTML/OG não anunciam o domínio do OS; a URL pública Tonecos ainda está **pendente de homologação**, portanto não inventar canonical/domain.
- CSP não inclui `ordax.com.br` por padrão. `robots.txt` mantém `Disallow: /` durante a migração; sitemap antigo foi retirado. Regenerar sitemap e permitir indexação **somente** após domínio Tonecos e publicação aprovados.
- Contatos e razão social não recebem defaults falsos do OrdaX; habilitar somente valores reais verificados.
- Mídias do R2 legado não usam fallback `ordax.com.br`; falta configurar a origem de mídia do novo site antes do cutover.
- `src/services/catalog/public-catalog-gateway.ts` introduz gateway de leitura isolado, com GET de catálogo, categorias e detalhes, cursor e limite de 60, mídia derivada da origem explícita, rejeição de payloads inválidos e nenhuma consulta SQL/D1 direta.
- A rota **`/modelos`** foi migrada nesta branch para o catálogo canônico: busca somente por envio explícito, categorias sob demanda, 24 modelos por página, navegação por cursor, detalhes on-demand, estados loading/empty/error e seleção temporária de até 50 IDs com remoção/deduplicação. **Não é um deploy de produção** nem uma transação comercial; nada é enviado até a homologação do orçamento.
- `VITE_CANONICAL_CATALOG_API_BASE` precisa apontar para um proxy HTTPS Tonecos homologado. Sem configuração, a rota mostra `Catálogo em integração` sem consultar Supabase, D1 ou Worker. Não substituímos ainda as rotas `/universo` e `/modelos/:id` nem o sistema comercial existente.
- **Débito de UI:** a rota `/modelos` e a ficha nova ainda contêm paleta editorial marfim/oliva e tokens `--tonecos-*`, em conflito com a decisão posterior do usuário. Manter gateway e funções implementadas, porém restaurar o estilo Arcade original antes de merge, reutilizando tokens existentes e eliminando tokens temporários após a reconciliação.
- Nenhuma migration, backend, publicação de Worker, pedido ou orçamento real foi alterado.

## Bloqueios para merge / release (falha fechada)

1. **Vercel:** GitHub registra a integração antiga `jogo-brasils-projects/ordax` e domínio `ordax.com.br`, hoje reservado ao OrdaX OS. Conta Vercel conectada neste contexto é `ordaxsystems`, não a conta legada. Não fazer push na main nem promover deploy até comprovar que o projeto Tonecos possui deployment independente, com *produção* desvinculada do OS.
2. **CI:** a última execução `Quality Gate #36719911543` da main `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41` falhou; o PR #3 corrige um teste determinístico de feriados, mas ainda está pendente de integração e novos gates. Não reaproveitar alegação antiga de testes verdes como prova atual.
3. **Domínio e identidade:** definir URL first-party Tonecos, novos endereços reais de contato, política de indexação e vínculos SEO. Não colocar URLs ou e-mails imaginados como produção.
4. **Gateway:** homologar o endpoint Worker e proxy same-origin de Tonecos **sem varreduras D1/R2**; manter API read-only, capturas tipadas de páginas pequenas e nenhuma conversão silenciosa de orçamento.
5. **Contratos comerciais:** garantir idempotência, snapshot de nomes/modelos, preço por autoridade Supabase, pedido autenticado e recuperação de falhas (Worker aceita solicitação e Supabase falha ou vice-versa); preservar histórico de clientes, pagamentos e produção.
6. **Frontend fiel ao original:** preservar o visual Arcade/HUD escuro/dourado do OrdaX pré-migração, trocando somente branding e adaptando navegação, filtros, tags, cards e galerias ao catálogo de mais de 2 mil modelos. Não redesenhar o produto nem estabelecer nova paleta; usar imagens autorizadas.
7. **QA:** em 01/11, Node 24 no desktop autorizado executou 8/8 testes locais de gateway/identidade (sem API real); o compilador esbuild validou a **sintaxe TSX** da página `/modelos`. **Isso não prova** TypeScript de todo o app, lint, Vitest/coverage, segurança nem E2E. Esses gates completos seguem pendentes no mesmo SHA de integração e antes de release.

## Ordem de execução sem trabalho duplicado

1. Revisar e estabilizar o único branch `integration/tonecosstudio-canonical-20261101`; corrigir qualquer falha de TypeScript/formatos; manter main inalterada.
2. Obter confirmação operacional dos limites do projeto Vercel e destino exclusivo da Tonecos; configurar pipeline seguro e testável sem domínio OrdaX.
3. Homologar `/modelos` e `/modelos/:id` com proxy HTTPS first-party, UI e segurança; migrar a árvore `/universo` e validar a galeria paginada sem replicar modelos ao Supabase.
4. Transformar a seleção em solicitação comercial única com status e idempotência entre sistemas e teste end-to-end; não usar o formulário antigo como ordem de produção automática.
5. Restaurar a fidelidade visual da listagem/ficha ao layout Arcade original, ajustar responsividade/tags/filtros e revisar fluxos administrativos sem remodelar suas interfaces.
6. Executar gates completos; integrar a main **somente se** o alvo de deployment estiver comprovadamente isolado e seguro.
7. Só após cutover/rollback validado, redirecionar URLs externas e arquivar o catálogo separado sem apagar Worker, mídia ou histórico.

## Evidências sem acesso à produção

- 9/9 testes Node 24 aprovados em sessão local isolada com respostas HTTP simuladas; incluem mídia malformada, cursor, categorias, detalhe, rejeição de IDs duplicados e limite de 50 modelos na seleção temporária. Foi corrigido um defeito real de barras invertidas na validação de caminho da mídia.
- Esbuild 0.25.12 analisou e transpiliou a página TSX da branch com exit code 0. TypeScript 5.9.3 validou com `--strict --skipLibCheck` os módulos isolados de gateway, seleção e identidade (exit 0). Prettier 3.6.2 verificou os três módulos de catálogo editados (exit 0). **Não** executamos compilação completa das dependências React, CI, audit de segurança global ou E2E real.
- Nenhuma chamada ao D1/R2 de produção, workflow de deploy, alteração no Supabase ou migração de schema. CI geral do repositório ainda sem prova verde.

## Checkpoint 02/11/2026 — ficha compartilhável e galeria

- SHA de implementação: `bf162ef20bcd56f0d9b6c45b32d729c794904e06` (branch única de integração).
- Dois testes de contrato da galeria foram adicionados; não foram executados neste ambiente. O checkout privado não pôde ser clonado sem credencial GitHub, portanto typecheck, lint, Vitest/coverage, build e E2E permanecem pendentes.
- O workflow Quality Gate não dispara em branch de integração. O check de comentário da Vercel passou, mas o status de deploy segue pendente e aponta ao projeto legado `jogo-brasils-projects/ordax`; API de Vercel respondeu 403 para essa equipe. Não promover, mesclar ou fazer novos pushes até isolamento e gates no SHA final.
- Nenhuma alteração de produção, Supabase, D1/R2 ou orçamento comercial ocorreu.

## Restrições

- **Quota Cloudflare D1 grátis:** nenhum scan total, SQL de produção opcional, recorrência agressiva ou nova ingestão sem orçamento medido fora do D1. Ver `catalogo/docs/CONTINUIDADE-OPERACIONAL.md`.
- **Direitos de imagem e proveniência:** candidato externo, metadata e prévia não equivalem a licença comercial. Manter itens pendentes fora da publicação.
- **Não há liberação de produção:** nesta etapa somente branch GitHub com código e testes versionados. Não declarar lançamento pronto sem as verificações do mesmo SHA.
