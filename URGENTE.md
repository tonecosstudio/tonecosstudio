# URGENTE — Tonecos Studio / Estado operacional

> Repositório: `washingtonmsdj/tonecosstudio` (privado, confirmado em 01/11/2026).
> **Estado: NO-GO.** A `main` permanece `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41` e NÃO foi atualizada nesta execução.
> Frente única de consolidação: `integration/tonecosstudio-canonical-20261101`.
> Regras e destino técnico: [docs/TONECOS-STUDIO-CONSOLIDACAO.md](docs/TONECOS-STUDIO-CONSOLIDACAO.md).
> Não declarar GO sem `release:verify` completo no mesmo SHA e smokes críticos do runtime.

## Correção do gate Arcade Lab — 03/11/2026

- **CI do SHA `87038a1bd5de5873c9a895dc613a5fdf6c770490`:** `release:verify` chegou a 3.252 testes aprovados, 32 ignorados e 1 falho; falha única em `ArcadeLab.test.tsx`, asserção `getByRole("img", {name:"10H"})` encontrou dois elementos, como deve ocorrer no layout que mostra miniatura + modelo selecionado.
- **Conserto:** o teste agora exige exatamente duas imagens com o mesmo `src` canônico de `/catalogo-api/media/...`. Preserva prova de que os dois lugares não usam assets legados. Nenhuma alteração de implementação, preços, dados, controles ou rotas.
- **Validação:** o gate completo deste commit é obrigatório antes de afirmar PASS. Sem builds simultâneos, sem varreduras D1.
- **Produção:** Vercel `main` `fdd2992a...` tem deploy ERROR causado pelo antigo teste `BusinessDayService` que comparava `Date.now()`; essa falha já foi corrigida apenas na branch canônica. A última produção READY anterior mantém alias `ordax-three.vercel.app`; sem troca de tráfego, promoção ou alteração DNS.
- **Proteção do preview verificada:** `VITE_PREVIEW_READ_ONLY=true` e `VITE_UPLOAD_SECURITY_FAIL_CLOSED=true` na branch, embora controles de navegador não substituam fronteiras de servidor.
- **next_action:** confirmar `release:verify` neste SHA, inspecionar UX desktop/mobile autenticada em preview e isolar domínios antes de promover.
- **do_not_repeat:** não enfraquecer asserts, não duplicar imagens, não consultar todas as páginas do Worker, não editar main/produção.

---

## Checkpoint 03/11/2026 — prova HTTP Vercel e Arcade Lab canônico

- **Baseline:** `5781d1f43662d2ff9d189745fec976418dfcebe4` na branch exclusiva, preview Vercel `dpl_G7Yakm7ucvRvb9SR3enFePkaFg7J` READY, `release:verify` finalizado e auditoria de dependências de produção `found 0 vulnerabilities`. Sem mudanças de main/prod.
- **Prova mínima e real do acervo:** GET `/modelos` no preview anterior recebeu HTTP 200 com HTML da aplicação; GET `/catalogo-api/api/catalog?limit=1` recebeu HTTP 200 e exatamente uma referência publicada (`10H` / `NieR` / `Games`), mais `nextCursor`. GET da capa correspondente por `/catalogo-api/media/...` recebeu HTTP 206 Partial Content, `image/webp`, `content-length: 71276`. Uma única consulta limitada a um modelo; sem varredura D1. Isso **não prova** renderização do React no browser desktop/mobile.
- **Auditoria de múltiplas frentes:** a Home já usa a primeira página do gateway canônico com limite 6; porém, o modo `Catálogo real` do Arcade Lab usava `useLandingCatalogModels` (Supabase legado), construía link para `/universo/personagem/:slug` e ainda exibia branding OrdaX. Isso misturava autoridades de inventário e links comerciais.
- **Correção neste commit:** Arcade Lab preserva demo visual independente; quando o visitante escolhe `Catálogo real`, consulta somente `listPage({limit:12})` do gateway de leitura canônico e liga cada imagem/ficha a `/modelos/:slug`. Falha fechada se gateway ausente; sem preço/pedido, scan ou import de modelo Supabase. Branding residual da interface Arcade Lab corrigido para Tonecos sem redesign.
- **Testes offline:** demonstração não consulta Worker, resultados reais usam gateway e links canônicos, erros permitem retentar, seleção via teclado permanece intacta. `release:verify` deste novo SHA permanece **pendente** até evidência do CI.
- **next_action:** acompanhar gate do novo SHA; homologar cards da Home, modelos no Arcade Lab e imagens no browser desktop/mobile; isolar domínios OrdaX e manter NO-GO.
- **do_not_repeat:** sem duplicação de catálogo Supabase, sem consulta D1 em massa, sem alterar App/SSOT além da frente de integração e sem tocar `main`/produção.

---

## Correção TypeScript do media fallback — 03/11/2026

- **Falha observada:** preview `dpl_5jqYaPh5Rs8bxTk3AmHGe7oPUqV2` do commit `c1cdedd679c80627a25d57b30a1d4ed22e8ad87d` bloqueado no `tsc -b` por `CanonicalModelDetails.tsx:211`, onde `imageUrl()` devolvia `string | null | undefined` para a prop `src` que exige `string | null`.
- **Correção:** tipagem explícita `imageUrl(...): string | null` e `?? null` na fronteira do gateway; a Home também normaliza explicitamente o possível `undefined`. Sem mudança de backend, sem I/O adicional, sem exclusão de testes.
- **Próximo gate:** executar `release:verify` no novo SHA e continuar somente após PASS. Main, Cloudflare e produção intocados.
- **do_not_repeat:** manter contratos de ausência de mídia em `null`; não permitir `undefined` na prop compartilhada.

---

## Gate das imagens concluído — 03/11/2026

- **Commit `98632545751aa257c2a647ff46f09155ce8686fc`:** preview `dpl_95ZXutQkLGJFGXDKJeTZaHBQ8JHR` READY, `release:verify` completo até `npm audit --omit=dev --audit-level=high` com `found 0 vulnerabilities`. Typecheck, lint, auditorias de autoridade, Vitest/cobertura e Vite atravessados no mesmo SHA. Não confundir gate automatizado com homologação visual real.
- **Produção:** não promovida, `main` não atualizada, domínios OrdaX ainda vinculados ao projeto e lançamento segue NO-GO.

---

## Gate de navegação concluído — 03/11/2026

- **SHA anterior `7c97e733dcc5c35fe0adf57fa9005dd30f9289ae`:** preview Vercel `dpl_69QkCo7SJRy9mMcX7sa5bzBBsHBB` READY; `release:verify` passou até `npm audit --omit=dev --audit-level=high` com `found 0 vulnerabilities`. Testes da pasta (1/1) e da ficha (6/6) aprovados, incluindo o retorno validado. Preview privado; produção, `main` e D1 intocadas.
- **NO-GO** continua até homologação visual real e desvinculação segura dos domínios do OrdaX.

---

## Correção do gate de filtros — 03/11/2026

- **Falha observada na suíte de `cccb8c9c`:** `CatalogModelsArcade.integration.test.tsx` (16 testes, 1 falhou). O cenário `folder=../admin` exibia simultaneamente a mensagem de escopo inválido e o badge de pasta selecionada; `getByRole("status")` encontrava dois elementos. A busca com 81 caracteres e os demais casos executados passaram.
- **Correção causal:** a indicação de pasta selecionada só aparece quando `!invalidFolderScope && !invalidCatalogScope`. Não anunciar pasta malformada como seleção válida. Mantidos bloqueios de rede e o teste original, sem relaxar asserções.
- **Gate:** publicar este ajuste somente quando o build falho estiver encerrado e repetir `release:verify` integral no novo SHA.
- **next_action:** verificar que cenário de escopo inválido gera uma mensagem coerente e nenhuma consulta ao Worker, e manter NO-GO de produção.

---

## Filtros públicos fail-closed e evidências de QA — 03/11/2026

- **Baseline aprovado:** `7637d53295be8d57d6fe47129e037c4652f2d337` na única branch canônica; preview Vercel `dpl_BF3jrMgxpEsqrF1JQ3FVv7ebX4ca` READY. `release:verify` finalizado com `found 0 vulnerabilities` na auditoria final. `main` ainda `fdd2992a...`; produção e domínios OrdaX inalterados.
- **Chrome real autorizado em Windows:** preview protegido acessado via permissão temporária Vercel, sem desabilitar proteção e sem salvar token no repo. Em um carregamento da vitrine, emulação CDP verificou 320/360/390/430/768/1024/1440 px, todos com `scrollWidth == innerWidth`; 24 cards reais. Home apresentou 6 links de modelos e 6 mídias carregadas; Universo 6 links de categoria e 6 mídias carregadas; ficha real do modelo 10H mostrou 2 mídias carregadas sem overflow. Este teste usou apenas buscas normais limitadas da interface, sem auditoria integral D1.
- **Defeito restante:** links diretos para `/modelos` com busca de 81+ caracteres ou slug/pasta inválida são bloqueados no gateway, mas a UI apresenta erro genérico; filtros auxiliares podem chamar endpoints que não contribuem para corrigir parâmetros inválidos.
- **Correção deste commit:** `validCatalogSlug` e `validCatalogFolder` passam a ser exportados da única autoridade, `public-catalog-gateway.ts`. A vitrine reutiliza essas funções para impedir consultas inválidas a modelos, categorias e franquias; mostra mensagens específicas para pesquisa curta, pesquisa longa ou escopo incorreto. Sem duplicar validação.
- **Testes offline:** `q` com 81 caracteres, categoria com barra, franquia que simula URL externa e pasta `../admin`, todos com zero leituras ao Worker. Testes já existentes continuam cobrindo buscas válidas e paginação.
- **Gate pendente:** confirmar o `release:verify` integral deste novo SHA antes de uso ou divulgação. Não alterar `main`, produção, pagamentos, Supabase ou D1.
- **next_action:** homologar comportamento de URLs manuais no preview protegido; isolar com segurança os domínios vinculados a OrdaX antes de qualquer promoção.
- **do_not_repeat:** sem builds paralelos, sem branches/PRs adicionais e sem varredura integral do catálogo.

---

## Gate das capas: correção do teste e SEO — 03/11/2026

- **Resultado no SHA `480667f85a02ad073448e44d87fb8ed50ff34120`:** Vercel `dpl_8BczvuXGanVTE7Dn3qdtcsEWi1Wx` ERROR após `test:coverage`. 3.262 testes aprovados, 32 ignorados, 1 falho (`CatalogArcade.integration.test.tsx:125`). O teste procurava link por regex `/Franquia 1/` e encontrava também Franquias 10–19. Componentes da mídia canônica passaram em 4/4 testes; falha não foi de produção nem do gateway.
- **Correção causal neste commit:** asserção passa a identificar o título exato do card `Franquia 1`, preservando a prova da rota e do fallback de mídia, sem mexer na API ou no componente visual.
- **Outro defeito comprovado por Chrome real:** título duplicado `10H — Tonecos Studio | Tonecos Studio`. O formatter central do `SEOHead` agora reconhece títulos já terminados com a marca ou iguais à marca, evitando duplicação no HTML, OG e Twitter. Testes do React Helmet cobrem Home, ficha e catálogo.
- **Gate pendente:** exigir `release:verify` completo no SHA atualizado; não declarar PASS antes de CI Vercel READY e status GitHub sucesso. Preview segue protegido e read-only.
- **next_action:** verificar novo gate; acompanhar isolamento seguro de domínios OrdaX e homologação de operações comerciais em staging isolado. `main`, D1, pedidos e produção não alterados.
- **do_not_repeat:** evitar regex de correspondência parcial em nomes numerados; não fazer builds paralelos, não varrer D1, não criar novo SSOT SEO.

---

## Verificação visual real e capas do Universo — 03/11/2026

- **Gate `53ff8fed810598c8118c9c6607cf7efe6c3e0708` (último READY):** preview `dpl_DSg9HW7HmvdA6yWdGZkdhuqKMLez` READY, `release:verify` passou com auditoria final `found 0 vulnerabilities`. `main` e produção intocadas.
- **Navegador físico/real:** Chrome headless no Windows `DESKTOP-4UFL03B`, preview protegido acessado por link temporário da Vercel, sem desativar Deployment Protection. DOM desktop apresentou cards com imagens publicadas. Emulação CDP de mobile `390×844`: `innerWidth=390`, `scrollWidth=390` (sem overflow), 24 cards reais, 24 fontes `/catalogo-api/media/`, 6 imagens já carregadas (lazy) e 0 falhas entre essas imagens. Screenshot local temporário fora do Git; sem expor link de acesso. O Chrome CLI headless sem CDP impôs largura mínima de 500px e produziu um falso recorte, descartado após validação.
- **Falha remanescente encontrada:** /universo usava `<img>` cru nas capas de categorias/franquias. URLs existentes que retornassem erro exibiam o ícone quebrado do navegador, enquanto cards de modelos já usavam `CanonicalCatalogImage`.
- **Correção neste commit:** /universo passa a reutilizar `CanonicalCatalogImage` com suporte a `fallbackIcon` personalizável, preservando os ícones Gold `FolderOpen` e `ImageOff` anteriores e sem redesenho. Falha de mídia não gera consulta adicional ao gateway; capa ausente continua com o ícone visual original.
- **Regressões:** falha de imagem em categorias/franquias mantém links navegáveis, testes unitários para ícone de fallback, e exatamente uma consulta limitada por rota nos testes. `release:verify` deste novo SHA deve passar antes de qualquer GO.
- **Próximos bloqueios:** teste completo de fluxo comercial em staging isolado, limpeza segura das associações de domínios OrdaX no projeto Vercel e homologação editorial; sem `main`/produção.
- **do_not_repeat:** não alterar componentes Arcade globais só por falso recorte de viewport, não retirar proteção do preview, não varrer D1, não criar segundo catálogo Supabase.

---

## Paginação da vitrine protegida contra ciclos multi-página — 03/11/2026

- **Problema funcional:** o gateway já rejeitava a devolução do mesmo `nextCursor` de uma requisição, mas um ciclo `A → B → A` atravessando páginas diferentes ainda podia repetir os resultados indefinidamente na UI.
- **Correção implementada:** a vitrine verifica `nextCursor` contra a parte já percorrida do histórico da página atual, desativa `Próxima` e explica o motivo. Retornar à página anterior e avançar novamente para a página já conhecida continua permitido, reaproveitando o cache do React Query.
- **Teste novo:** três páginas HTTP simuladas com ciclo entre cursores; confirma parada segura, retorno à página 2, avanço novamente à página 3 e exatamente três leituras, sem ampliar o escopo de consultas ao catálogo real. O QueryClient do harness preserva o cache normal da aplicação em vez de expirar a página imediatamente com `gcTime: 0`.
- **Gate:** a navegação anterior foi aprovada antes deste commit; exigir `release:verify` completo no SHA da paginação sem reduzir testes.
- **next_action:** homologar navegação com dados publicados no preview e concluir isolamento de domínios antes do GO.
- **do_not_repeat:** sem varredura D1, sem inventar ordenação do Worker, sem ampliar limites de página e sem alterar `main`.

---

## Compatibilidade de compilação do retorno ao Universo — 03/11/2026

- **Falha no gate do SHA `bc00c665f8fdcdc456cd4cd3a9015a168c7551ca`:** `tsc -b` bloqueou `String.replaceAll` no alvo atual (`TS2550`), com diagnóstico secundário de `part` implícito `any` na cadeia interrompida.
- **Correção mínima:** substituído `folder.replaceAll("\\\\", "/")` por `folder.split("\\\\").join("/")`, que mantém a mesma normalização de separadores e validação de travessia sem elevar o alvo TypeScript, reduzir proteção ou alterar URLs.
- **Validação:** exigir `release:verify` completo neste SHA; a melhoria de paginação multi-página segue apenas preparada, sem novo build paralelo.
- **next_action:** confirmar gate, então concluir a proteção de cursores na mesma branch.
- **do_not_repeat:** sem mudanças de toolchain por causa de um único método de string, sem `main` e sem consultas diretas à D1.

---

## Navegação sem perda da pasta de origem — 03/11/2026

- **Situação encontrada:** ao abrir a ficha de um modelo a partir de `/universo/:categoria/:franquia?folder=...`, o botão `Voltar ao catálogo` voltava à lista geral de /modelos e perdia a origem da navegação.
- **Correção preparada:** o link do card transmite apenas o contexto estruturado de categoria/franquia/pasta; a ficha reconstrói exclusivamente uma rota interna do Universo após validar slugs e segmentos sem travessia. Com contexto válido, o botão mostra `Voltar à pasta`; contextos malformados voltam para `/modelos`. Preservado o comportamento atual de filtros `catalogReturnSearch` da lista geral.
- **Regressões:** testes de retorno exato, rejeição de escopo externo/travessia e prova de que abrir a ficha a partir da pasta não dispara consultas adicionais ao Worker. Nenhuma mudança de D1/Supabase, preços, pedidos ou rotas globais.
- **Gate de mudanças:** aplicar e testar somente depois de concluir o build anterior de imagens para evitar builds concorrentes; não declarar PASS antes de `release:verify` neste SHA.
- **next_action:** homologar navegação e responsividade no preview autenticado, isolar domínios do OrdaX antes da promoção.
- **do_not_repeat:** sem URLs externas de retorno, sem estado de seleção duplicado, sem consultas de busca em massa.

---

## Imagens resilientes do catálogo — 03/11/2026

- **Baseline comprovada:** `444722fc73fb38b672d50565c5d7d4c853425b4d`, branch `integration/tonecosstudio-canonical-20261101`, Vercel preview `dpl_FYGCpEkqRmNQ4DGgsQh2JX92k8ah` READY e status SUCCESS, `release:verify` concluído. Continua NO-GO de lançamento e main inalterada.
- **Falha de UX encontrada:** Home, /modelos, Universe e ficha/galeria tratavam a ausência de `cover_storage_key`, mas quando um URL existente falhava ao carregar a imagem, aparecia o ícone nativo de imagem quebrada. Isso é particularmente relevante na vitrine pública de um acervo com milhares de referências.
- **Correção canônica:** componente compartilhado `CanonicalCatalogImage`, que preserva os estilos existentes e troca qualquer imagem com `onError` por `Imagem indisponível` (ou `Sem prévia` no thumbnail); ao trocar o URL de um modelo ou imagem selecionada, apresenta o novo URL sem estado antigo contaminado. Aplicado à Home, /modelos, Universe, capa principal e thumbnails da ficha. Nenhuma consulta nova de Worker, D1 ou Supabase. Nenhum segundo media client ou fallback para acervo legado.
- **Testes novos:** falha de carregamento, troca de URL após falha e ausência total de mídia. `release:verify` do novo SHA deve comprovar lint, typecheck, cobertura, auditorias e build. Não tratar somente unit tests como aprovação do projeto.
- **Teste visual externo:** Chrome headless em Windows foi redirecionado à autenticação Vercel. Acessar conteúdo via `web_fetch_vercel_url` confirmou resposta HTML e API, mas não autentica o navegador real para QA visual. Não desativar Deployment Protection. Mobile/desktop real continua pendente.
- **next_action:** obter o gate completo same-SHA e, com acesso apropriado ao preview protegido, homologar visualmente desktop/mobile; isolar os domínios OrdaX antes de qualquer promoção.
- **do_not_repeat:** sem varredura D1, sem reintrodução de Supabase models no frontend, sem redesenho, sem novos PRs e sem mudança na main/prod.

---

## Continuidade de 03/11/2026 — paginação fail-closed

- **Baseline anterior:** `a5daae89b9488dd5351777aaf55d14f9b790d7ff` na branch de integração. `main` preservada.
- **Causa corrigida:** o gateway verificava o formato dos cursores, mas aceitava cursores repetidos e páginas vazias com `nextCursor`, que podem causar paginação sem progresso na vitrine/galeria.
- **Implementado:** `listPage` e `listGallery` rejeitam os dois estados inconsistentes e mantêm a fronteira somente leitura do Worker. Dois testes de regressão com HTTP simulado cobrem esses casos; sem mudança em Supabase, D1, R2, preços, pedidos ou contratos do Worker.
- **Gates pendentes:** executar `release:verify` no SHA da mudança e QA no navegador desktop/mobile; não confundir preview READY com lançamento autorizado.
- **Vercel:** destino de preview confirmado como `jogo-brasils-projects/tonecosstudio`, não `ordax`. Continuam anexados ao projeto Tonecos os domínios `ordax.com.br`, `www.ordax.com.br` (não verificados) e `ordax-three.vercel.app`; manter **NO-GO** até remoção segura desses vínculos, sem mexer em DNS.
- **next_action:** conferir o Quality Gate no preview desse SHA, homologar paginação/ficha e QA visual, isolar os domínios herdados do projeto Tonecos antes de promoção.
- **do_not_repeat:** sem catálogo duplicado Supabase, varredura D1, novas PRs/branches ou alterações na `main` enquanto NO-GO.

---

## Correção do gate 03/11/2026 — cache do teste do Universo

- **Falha reproduzida no gate da integração `a29c36998e583e0809e20457ecc6499b3a33c8c4`:** `release:verify` concluiu 3.252 testes aprovados, 32 ignorados e apenas 1 falho em 3.285; `CatalogArcade.integration.test.tsx` exigia reutilização do cache ao limpar a busca, mas sua configuração de teste `gcTime: 0` eliminava esse cache imediatamente. O erro foi assertion `expected 2, received 3`, sem evidência de acesso indevido ao catálogo.
- **Correção causal:** removido apenas `gcTime: 0` do QueryClient de teste; o React Query passa a usar o cache padrão do app, mantendo o teste que exige zero consultas durante a digitação e retorno à listagem previamente buscada. Sem ajuste da lógica de produção, da segurança ou dos limiares.
- **Validação:** aguardar o gate completo no SHA deste commit; bloquear `main` e lançamento até PASS same-SHA e isolamento dos domínios. Os warnings do restante da suíte foram produzidos por cenários simulados e não equivalem a novos testes falhos.
- **next_action:** verificar Vercel preview deste SHA e homologar interface real em desktop/mobile.
- **do_not_repeat:** não trocar assertions por timers, não eliminar cache do test harness que pretende validá-lo, não disparar varreduras D1, não alterar `main` ou domínios OrdaX.

---

## Checkpoint de 03/11/2026 — busca pontual no Universo

- **Baseline:** `0937fcd0fe3c201d4fb2174c30a00b64f384ac12` no branch canônico; Vercel `dpl_2XJKq4scczzLsHMaJ1MR4kcef3ka` READY, status Vercel SUCCESS e `release:verify` passou com auditoria final `found 0 vulnerabilities`. Sem deploy de produção.
- **Auditoria funcional:** a página `/universo` já usava `createPublicCatalogGateway`, e não uma cópia Supabase. Por isso NÃO foi duplicada ou migrada novamente.
- **Melhoria:** na categoria do Universo, a lista inicial continua limitada a 24 franquias. Agora há busca por nome com submissão explícita e parâmetros no URL; utiliza apenas `GET api/franchises?category=...&q=...&limit=24`, sem varrer todas as páginas nem listar todos os modelos. Busca curta ou excessiva de link direto falha fechada sem I/O. Link para limpar volta à lista padrão e reaproveita cache.
- **Prova adicional (pendente do gate deste commit):** teste de categorias, busca que encontra franquia fora das primeiras 24, validação de zero consultas durante digitação e de ausência de request com `q` curto.
- **Pendências:** verificar `release:verify` no novo SHA; revisar UX real em desktop/mobile e isolar os domínios OrdaX vinculados antes de promoção.
- **next_action:** observar preview no SHA exato, corrigir qualquer falha causal e continuar a homologação visual/funcional; PR antiga #3 contém somente fix de teste cache já incorporado e pode ser encerrada sem merge após prova.
- **do_not_repeat:** sem scan D1, sem segundo catálogo Supabase, sem PR/branch paralela e sem alteração em main/prod.

---

## Consolidação de 03/11/2026 — gateway verde e cache sem perda de dados

- **Baseline verificada:** `f490c5786e7ad9e15701d7126b90234f11e7734e` na única branch de integração; Vercel `dpl_4chA6gWzu8EvKDW6i7ur5wNF913k` terminou READY no próprio SHA, como **preview** sem alvo de produção. `release:verify` concluiu typecheck, lint, auditorias, testes/cobertura, build e `npm audit --omit=dev --audit-level=high`.
- **Resultados do gate:** cobertura global **70,34% funções**, **77,96% linhas** e auditoria final `found 0 vulnerabilities`. O limiar de 70% foi atendido sem afrouxamento. Isso NÃO substitui homologação visual, operações autenticadas ou isolamento de domínios.
- **Falha funcional corrigida neste checkpoint:** `getHolidays` armazenava um `Set` de datas e devolvia feriados com `id` e `name` vazios no cache. Agora mantém cópias completas dos registros do ano e retorna cópias, preservando metadados e impedindo que alterações do consumidor contaminem o cache.
- **Testes de regressão adicionados/reforçados:** metadados após cache-hit, mutabilidade externa, leitura única na repetição de cálculos/consultas e invalidação depois de adicionar feriado. Asserções temporais flutuantes substituídas por verificação determinística de I/O; consolida a intenção da PR antiga #3 na branch canônica, sem merge na `main`.
- **Validação deste novo SHA:** aguardar `release:verify` e smoke visual completos antes de afirmar PASS. Sem consultas diretas D1, R2 ou mutações Supabase; sem deploy de produção.
- **Bloqueio de lançamento:** os domínios herdados `ordax.com.br` e `www.ordax.com.br` (não verificados) e `ordax-three.vercel.app` continuam vinculados ao projeto Tonecos na Vercel. Não alterar DNS nem promover sem remover com segurança esses vínculos.
- **next_action:** acompanhar o preview exato da correção de cache e validar fluxo real do catálogo, identidade de navegação e responsividade; fechar PR #3 somente depois de verificar que o conserto equivalente está integrado no branch canônico e o gate passa.
- **do_not_repeat:** sem branch/PR paralela, sem duplicação de catálogos ou clientes Supabase, sem varrer a D1, sem promover `main` prematuramente.

---

## Gate real e continuidade da vitrine — 02/11/2026

- **Branch única / código atual auditado:** `f75c5ef74b2cd3dcc41528cfab6d43a0ae1144b2`, sem merge na `main` e sem deploy de produção.
- **Vercel confirmado:** projeto `jogo-brasils-projects/tonecosstudio`, preview `dpl_J83NCKuuV8TVoGxLNPBxEzBwAA1u` terminou em `ERROR` após alcançar a medição de cobertura. `release:verify` bloqueou em **cobertura global de funções 65,8% < 70%**. Não reduzir o threshold, excluir arquivos ou usar mocks de sucesso para aumentar artificialmente a métrica.
- **Gates observados no mesmo SHA:** TypeScript, lint, auditorias que antecedem testes e 9/9 testes React do catálogo/ficha **PASS na Vercel**. Vitest de gateway **12/12 PASS local**. A mesma suíte React foi validada **9/9 no desktop Windows autorizado** com HTTP simulado. A correção de espera assíncrona em `f75c5ef` resolveu a única falha do preview anterior (`30d2ca7`: 2.794 PASS, 1 FAIL, 32 ignorados). `npm run build` e a auditoria de dependências subsequentes ao gate de cobertura **não foram alcançados**.
- **Catálogo e UI:** API Cloudflare Worker permanece SSOT de modelos/mídias; franquias têm descoberta indexada sob demanda (`GET /api/franchises`, UI limita a 24), categorias, busca e cursors preservados, sem carga integral do acervo. Visual escuro/dourado original do Arcade **restaurado no código**, aguardando comparação por screenshots desktop/mobile. Tags ainda não têm contrato canônico na API; não simular filtros/consultas D1.
- **Separação de produtos ainda pendente:** o projeto Tonecos Vercel continua registrando `ordax.com.br` e `www.ordax.com.br` como domínios **não verificados**, além de `ordax-three.vercel.app`. Remover os domínios do OS pelo painel do projeto Tonecos antes de promover; não remover DNS ou alterar implantação OrdaX OS.
- **Auditoria de duplicações sem mudança de código:** `src/components/arcade/ArcadeLayout.tsx` contém cópias de `ArcadeNav`, `CoinCounter` e efeitos também existentes em componentes específicos. `MainLayout` usa a navegação separada `src/components/arcade/ArcadeNav.tsx` (marca Tonecos). Algumas funções são idênticas, outras diferem; não fazer remoção em massa sem mapear importadores e comparar comportamentos visuais.
- **Próxima ação comprovável:** aumentar cobertura de funções com testes reais em serviços relevantes e descobertos como pouco exercitados; repetir o gate de 70% no mesmo SHA e avançar para build, auditoria de dependências e QA de navegador. Não publicar ou mesclar enquanto NO-GO.

---
## Catálogo grande: filtro canônico por franquia e correção React Query — 02/11/2026

- **Causa raiz resolvida na branch:** `usePricingSettings` passa uma função sem argumentos ao `queryFn` do TanStack Query. `fetchPricingSettings({ forceRefresh: true })` continua disponível para as coleções e mantém o SSOT do serviço comercial. A incompatibilidade anterior produzia `TS2769` no hook e `TS2339` em consumidores.
- **Franquias, sem catálogo duplicado:** o gateway Cloudflare existente passou a expor `listFranchises` pelo endpoint oficial `GET /api/franchises`, com categoria opcional, busca explícita `q` (3–80 caracteres), máximo 48 itens por contrato e validação estrita de `truncated`, IDs, categorias e contagens. A vitrine solicita somente 24 resultados quando o usuário abre o filtro ou pesquisa uma franquia, exibindo aviso de recorte incompleto. Nada de baixar toda a taxonomia ou consultar D1 diretamente.
- **Fluxo preservado:** categoria, franquia e busca agora participam da URL e do escopo do cursor; trocar de categoria limpa franquia incompatível. Seleção continua até 50 modelos, sem orçamento automático. Interface mantém `ArcadeHero`, `ArcadeCard`, tema escuro/dourado e a ficha por slug/galeria versionada.
- **Validações concluídas:** Vitest gateway **12/12 PASS** isolado, TypeScript strict do gateway **PASS**, esbuild dos TSX e do hook **PASS**, Prettier aplicado; a suíte React do catálogo/ficha **9/9 PASS na Vercel** após correção da condição de corrida em `f75c5ef`, também **9/9 PASS** no desktop autorizado. A cobertura global de funções continua abaixo do mínimo de 70%.
- **Limitação explícita:** tags ainda não fazem parte do contrato público do Worker, não criar tags fictícias/filtros client-side. A `main` segue preservada, sem mudanças no D1, R2, Supabase ou domínios.
- **Próximos gates:** `release:verify` do SHA final, cobertura 70% funções, audit e build; QA visual desktop/mobile e domínio próprio Tonecos. Sem fallback, sem aprovação antecipada.

---

## Recuperação visual do catálogo — 02/11/2026

- **Código restaurado na branch:** `src/pages/CatalogModelsArcade.tsx` reutiliza `ArcadeHero`, `ArcadeSectionTitle` e `ArcadeCard`. `src/pages/catalog/CanonicalModelDetails.tsx` reutiliza `ArcadeCard` e `ArcadeSectionTitle`, com fundo escuro e detalhes dourados.
- Removidos do `src/index.css` os sete tokens temporários `--tonecos-*` da paleta marfim/oliva. Nenhum segundo design system foi criado.
- **Contratos preservados:** gateway Cloudflare de leitura, 24 modelos por página, busca, categorias sob demanda, paginação por cursor, seleção de até 50 IDs, URL compartilhável e galeria versionada incremental. Sem regresso à base de modelos do Supabase.
- **QA local:** Prettier 3.6.2 aprovou quatro arquivos; esbuild 0.25.12 transpila listagem, ficha e teste de integração. **O CI completo, Vitest/coverage do novo SHA e comparação visual desktop/mobile ainda são obrigatórios** antes do merge.
- **Tags:** o gateway atual expõe categoria/franquia/coleção, mas não contrato canônico de tags. Não duplicar campos nem inventar filtro até o Worker disponibilizar contrato explícito.
- Nenhuma migração, consulta D1, deploy de produção ou alteração da `main` foi realizada. O preview de integração ainda requer gates verdes.

---

## Decisão visual canônica — 02/11/2026 (prioridade sobre planos anteriores)

- **Decisão explícita do proprietário:** manter a aparência do antigo OrdaX; ajustar somente a marca **Tonecos Studio** e a capacidade de apresentar mais de **2 mil modelos** com tags, categorias, franquias, filtros, busca, galeria e paginação. Preservar a Home, HUD, navegação, fontes, dark/gold, cards, área do cliente e administração onde funcionam.
- **Restauração em código concluída, homologação pendente:** a vitrine e a ficha voltaram a reutilizar componentes Arcade e a paleta escura/dourada no commit `52224ee`, sem tokens marfim/oliva. Preservados Worker, cursor, slug, seleção e galeria; ainda faltam screenshot/E2E desktop/mobile, CI integral e conferência de contraste. Não executar redesign editorial.
- **Proibição:** não executar redesign editorial completo; não eliminar o visual arcade; não duplicar o componente legado com acesso Supabase para renderizar dados Cloudflare. Integrar a funcionalidade nas superfícies visuais já existentes.
- **Gate novo:** confronto visual desktop/mobile do `main` pré-migração (`fdd2992a7`) contra a branch atual, preservando fluxos de navegação; checar alto volume/estados de tags, busca, filtros, 24 por página e URLs estáveis. Não alegar preservação total enquanto a divergência persistir.
- **Próxima ação de UI:** corrigir a apresentação da listagem e da ficha, mantendo funcionalidade e contratos canônicos; validar regressões e CI. Não consultar D1 ou duplicar catálogo Supabase para testes visuais.

---

## Checkpoint SSOT de preços comerciais — 02/11/2026

- **Fonte única de leitura e validação:** `src/services/pricing/pricing-settings-service.ts` permanece a autoridade canônica para preços, Pix, sinal e parâmetros operacionais. `src/services/pricing/collection-pricing-service.ts` foi refatorado para **delegar** a `fetchPricingSettings({ forceRefresh: true })`, sem uma segunda consulta direta a `system_settings` nem duplicar parse/validadores.
- **Atualização sem preços obsoletos:** a apresentação geral mantém seu cache existente; a leitura para cálculo de uma coleção exige valores frescos e passa pelas mesmas validações de preços. Preço customizado sem contrato servidor é rejeitado, nunca inferido. Supabase segue autoridade do negócio e não há integração comercial automática com os IDs Cloudflare.
- **Prova local:** Vitest 3.2.4 **32/32 PASS** em Desktop Windows autorizado, com mocks explícitos da API de dados e os serviços de produção originais. Casos: campos faltantes, valores inválidos, depósitos acima do Pix, cache e refresh, coleções sem permissão, preços customizados, divergência entre desconto e total, impostos e saldo. Prettier 3.6.2 **PASS** nos quatro arquivos.
- **Release:** o preview do SHA anterior `2c3781cac9474a7d03efa65cf700529cc24c8d29` ainda não foi considerado verde; o último bloqueio conhecido no Vercel era cobertura global de funções `65,62%` contra `70%`. **Não reduzir os thresholds, não mascarar falhas ou afirmar liberação com apenas testes isolados.**
- **Infraestrutura:** `ordax.com.br` e `www.ordax.com.br` continuam vinculados (não verificados) ao projeto Vercel `tonecosstudio`; a separação completa de domínios é gate obrigatório para produção. Main, D1, R2, pedidos e pagamentos não foram alterados.
- **Próxima ação:** examinar o preview do SHA atual e suas métricas reais, corrigir as causas que ainda bloquearem `release:verify` (inclusive cobertura e auditorias) e homologar UX/E2E. Não criar branches nem PRs paralelos.

---

## Checkpoint de cobertura e QA da vitrine — 02/11/2026

- **Baseline antes deste checkpoint:** `9b6d682d6e943262efa47cd9859618c29806a215`, branch `integration/tonecosstudio-canonical-20261101`, main `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`, sem merge.
- **Vercel:** o preview da baseline iniciou após cancelar 15 previews antigos e terminou em **ERROR**, mas avançou por typecheck, lint e auditorias de autoridade. O Vitest fechou com **2.730 testes aprovados**, **0 falhas** e **32 ignorados**. Cobertura total: linhas/declarações 74,04%, branches 78,02%, **funções 65,26%**. O requisito de funções permanece 70%; não foi reduzido. Build de produção e audit de dependências após cobertura **não foram executados** nesse preview.
- **Nova implementação neste checkpoint:** `src/pages/CatalogModelsArcade.integration.test.tsx` cobre, com HTTP simulado e componentes de UI isolados, 7 cenários de busca mínima, categoria sob demanda, paginação cursor, seleção temporária entre páginas, URL compartilhável, galeria versionada, falha fechada e retries de catálogo/ficha/galeria. **Vitest isolado 7/7 PASS no Desktop Windows autorizado**; ainda exige execução dentro da suíte integral do mesmo SHA.
- **Formatação:** auditoria dos 24 arquivos TS/TSX alterados desde a main; 17 exigiam normalização. Prettier **3.8.1** confirmou o conjunto formatado localmente. Essa mudança é mecânica e não altera contratos comerciais.
- **Infraestrutura:** Vercel de produção `tonecosstudio` (projeto existente `prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`) segue com `ordax.com.br` e `www.ordax.com.br` registrados, porém **não verificados**. Removê-los no projeto Tonecos, preservando o OrdaX OS, antes de qualquer merge, promoção ou GO. Apenas previews sem alvo de produção foram afetados pela limpeza.
- **Próxima ação:** observar o preview do SHA gerado por este commit; corrigir a cobertura funcional até o patamar de 70% **com testes reais**, sem excluir arquivos nem alterar o threshold; continuar pelo build, auditoria `npm audit --omit=dev --audit-level=high`, Quality Gate, E2E móvel/desktop e homologação do proxy antes de promover. Não iniciar varreduras D1/R2/Supabase nem criar novo catálogo ou PR paralelo.

---

## Checkpoint técnico — 02/11/2026: correção da ficha e liberação do escopo Vercel

- **Destino Vercel confirmado:** projeto existente `tonecosstudio` (ID `prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`) no escopo `jogo-brasils-projects`, ligado a `washingtonmsdj/tonecosstudio` e Vite/Node 24. A renomeação preservou o ID do projeto.
- **Domínios antigos ainda vinculados:** `ordax.com.br` e `www.ordax.com.br` seguem **não verificados** no projeto Tonecos. **Remover ambos antes de promover à main/produção** e homologar um domínio exclusivo Tonecos. Não declarar isolamento completo até a limpeza.
- **Causa raiz do preview falho:** o Vercel build no commit `bf162ef` falhou em TypeScript (`CanonicalModelDetails.tsx`, linha 89, `TS1127` e erro derivado na linha 239) por sequências literais `\\n` dentro do JSX.
- **Correção nesta entrega:** substituir as cinco sequências `\\n` por quebras de linha reais, formatar a ficha compartilhável, o gateway de galeria e seus testes sem alterar as autoridades.
- **Provas locais isoladas:** Vitest 3.2.4, `public-catalog-gateway.test.ts` **9/9 PASS** incluindo 2 cenários de galeria; TypeScript estrito com `--skipLibCheck` aprovado no gateway; esbuild aprovou a sintaxe TSX da ficha corrigida; Prettier 3.6.2 aprovou os arquivos modificados. Ainda não são substituto do `release:verify` integral, auditorias de dependências, build ou E2E.
- **Segurança:** sem acesso a D1/R2/Supabase de produção, sem preços, pagamentos ou pedidos modificados; `main` preservada. A Vercel registra 49 advisories totais no `npm ci` do preview `bf162ef`; investigar especialmente `npm audit --omit=dev --audit-level=high` com a árvore instalada, sem `npm audit fix --force` automático.
- **Próximo passo:** ler o resultado do preview isolado desta correção, corrigir a próxima falha causal no mesmo branch, executar gates completos no mesmo SHA; depois retirar os dois domínios antigos e homologar mídia/proxy first-party, UX móvel e orçamento idempotente.

---

## Checkpoint operacional — 02/11/2026

- **HEAD da integração:** `bf162ef20bcd56f0d9b6c45b32d729c794904e06` — `feat(catalog): add canonical model detail pages and galleries`. A `main` segue preservada em `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`.
- **Implementado na única branch:** cartões de `/modelos` abrem links diretos compartilháveis; slugs usam a ficha canônica. A ficha carrega os metadados pelo Worker e uma página de até 24 imagens pelo endpoint versionado `/api/models/:slug/images`, valida cursor/versão/payload no gateway e permite carregar mais. Rotas antigas com UUID continuam no componente legado.
- **Testes adicionados, ainda não executados:** dois casos cobrem leitura limitada/versionada da galeria, versão obsoleta e resposta acima do limite em `public-catalog-gateway.test.ts`. Não foi possível executar `npm ci`, TypeScript, lint, Vitest, coverage ou build neste ambiente; o checkout local falhou porque não havia credencial GitHub para o repositório privado. Não declarar PASS com base apenas no código versionado.
- **CI:** `.github/workflows/quality.yml` dispara push somente em `main` ou execução manual. Para o SHA atual, o único check run é Vercel Preview Comments (sucesso de comentários), sem Quality Gate. O status Vercel do SHA está pendente.
- **Bloqueio Vercel P0:** o preview automático atual aponta para `jogo-brasils-projects/ordax`. A Vercel API recusou leitura do deployment por falta de autorização no escopo `jogo-brasils-projects` (403). Ainda não há prova de isolamento Tonecos; o preview não foi promovido nem associado ao domínio do OS. Não enviar commits adicionais até corrigir/verificar esse vínculo, nem mesclar ou promover.
- **Sem alterações de produção:** nenhuma migration Supabase, ingestão, consulta de D1, gravação de orçamento/pedido, publicação de Worker ou promoção foi executada.
- **Next action:** resolver a integração Vercel automática em equipe autorizada; então executar `npm ci`, o quality gate completo e a revisão desktop/mobile/E2E no mesmo SHA, sem promover antes da prova de isolamento. Próxima fatia de produto após esses gates: migrar `/universo` ao Worker e definir o contrato idempotente do orçamento comercial.
- **Do not repeat:** não varrer D1/R2, não recriar catálogo no Supabase, não usar `ordax.com.br`, não repetir builds de catálogo para preencher UI, não fazer push de código enquanto o destino Vercel for o projeto `ordax`.

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
