# TONART Studio

**Estado verificado em 13/11/2026.** O frontend oficial está no projeto Vercel `tonart-studio-public`, domínio **https://tonartstudio.com.br**, com o código-fonte do site em `tonecosstudio/tonecosstudio/main`. O catálogo público continua usando **um único Worker** `tonecos-catalogo-api` da conta Cloudflare Tonecos (D1 + R2); o publicador ativo do Worker permanece no repositório `washingtonmsdj/catalogo`. A cópia em `services/catalogo/` está **staged-offline**, não é um segundo publicador. O Cloudflare Pages é somente uma prévia protegida.

**Não confundir os dois marcos:** a vitrine visual está publicada em pré-lançamento, mas a **indexação e o lançamento público definitivo ainda não têm GO**. A implantação comercial Vercel atual habilita conta e orçamentos; isso **não** significa checkout, pagamentos ou conta completa.

## Autoridades únicas (SSOT)

| Camada                             | Autoridade vigente                                                                                     | Limite                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Site e experiência TONART          | `tonecosstudio/tonecosstudio/main`; Vercel `tonart-studio-public`                                      | Deploy controlado de SHA aprovado; não criar frontend paralelo               |
| Catálogo e imagens                 | Worker `tonecos-catalogo-api` / D1 `tonecos-catalogo` / R2 `tonecos-catalogo-media`                    | Writer atual: `washingtonmsdj/catalogo`; não consultar ou migrar D1 em massa |
| Identidade e orçamentos comerciais | Projeto Supabase TONART `icmtmaakjucmuzxnofkd`: Auth, `profiles`, `quotes`, `quote_events`, RLS e RPCs | Não armazenar modelos no Supabase; não criar fluxo paralelo de solicitação   |
| Prévia alternativa                 | Cloudflare Pages protegido por Access                                                                  | Não é o site oficial público                                                 |
| Futura consolidação Worker         | `services/catalogo/` e [manifesto de migração](config/catalog-code-consolidation.json)                 | `releaseAuthorized=false`; sem cutover nem segundo pipeline                  |

A API é consumida por `/catalogo-api/` e pelo proxy GET restrito existente na Vercel; o navegador **não recebe** credenciais de escrita D1/R2. Cache compartilhado e CDN já ativos. Em 12/11, PRs Worker [#268](https://github.com/washingtonmsdj/catalogo/pull/268) e [#269](https://github.com/washingtonmsdj/catalogo/pull/269) foram integradas; a segunda corrigiu o smoke de cache. Versão Worker validada a 100%: `0b6d0d02-58f6-4f99-9a9a-92a605a498ed`. Na Vercel, a proteção de parâmetros de cache chegou à main pela PR [#24](https://github.com/tonecosstudio/tonecosstudio/pull/24), commit `bb661ab`. Estes são **checkpoints históricos**, não versões que devem ser fixadas automaticamente em novos deploys.

## Recursos implementados e limites do MVP

| Recurso                                                             | Estado observado no código/configuração                                                                                                                                                                                                                                                                                                                                                    | O que falta validar ou concluir                                                                                                                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo visual (Home, Universo, busca/filtros, ficha, galeria)     | Publicado em pré-lançamento; 12 modelos carregados automaticamente na administração; cache CDN e Worker protegidos                                                                                                                                                                                                                                                                         | QA visual autenticado desktop/mobile, licenças/créditos, conteúdos e aprovação editorial                                                                                                    |
| Capas                                                               | Imagens comuns visíveis; **264 identidades SpecialSTL** em quarentena                                                                                                                                                                                                                                                                                                                      | Substituir **somente** mídias SpecialSTL com prova de direitos e identidade exata, se aplicável; nunca esconder todo o catálogo                                                             |
| **Minha Conta** (`/perfil` / `/login`)                              | Cadastro por e-mail, login, confirmação de e-mail conforme Auth, reenvio seguro de confirmação, recuperação de senha, edição de nome/telefone, troca de senha com revalidação da senha atual e logout, mensagens de erro localizadas e claras, sair                                                                                                                                        | E2E real de cadastro/confirmar e-mail/login/recuperação/perfil ainda requer uma caixa de teste controlada; proteção de senhas vazadas segue como gate do Supabase Auth                      |
| Orçamento do cliente                                                | `/solicitar-orcamento` e `/meus-orcamentos`; seleção de modelos, quantidades, observações, WhatsApp opcional, CEP, escala/acabamento; escrita em `quotes` por RPC autenticada; resposta administrativa com valor + mensagem; histórico imutável em `quote_events`; histórico do cliente paginado por RLS                                                                                   | Backend cliente → admin → resposta textual/valor → histórico foi provado de forma reversível em produção; falta homologar a jornada completa no frontend oficial após o deploy do SHA atual |
| Administração                                                       | Login único com autorização por função Supabase; atendimento de orçamentos com status, valor, mensagem ao cliente e histórico persistido; fila completa de orçamentos com paginação/filtro/deep link exato; lista completa de usuários com busca/paginação server-side; Central de Comunicação mostra pendentes/em análise/respondidos usando a fila canônica; revisão do catálogo com CSV | Homologar as telas no deploy oficial; edição direta do catálogo ainda não salva, requer processo editorial source-first                                                                     |
| Pagamentos, assinaturas, pedidos físicos, Coins e suporte completos | **Não habilitados para lançamento**. A área da conta mostra seções anteriores como `Indisponível`. Orçamento não é venda                                                                                                                                                                                                                                                                   | Fora do MVP de orçamento até decisão e implementação próprias; não simular saldo, recebimentos ou pedidos reais                                                                             |

O ambiente Vercel produção foi revalidado em 13/11: `VITE_TONECOS_COMMERCIAL_MVP=true`, `VITE_CATALOG_QUOTES_ENABLED=true`, `VITE_PUBLIC_CATALOG_MVP=false` e `VITE_PREVIEW_READ_ONLY=false`. As tabelas `profiles` e `quotes` e a RPC `submit_catalog_quote_request` foram constatadas no Supabase ativo; ambas as tabelas têm RLS ativa. **Presença de código, flags e esquema não substitui um teste autenticado de usuário real.**

## Gates web já preparados

- As páginas comerciais privadas usam `SEOHead` com title/description/canonical da rota e `noindex`; conta, orçamento e administração não entram em indexação mesmo após o lançamento público.
- `robots.txt` continua bloqueando crawl global durante a homologação e o HTML mantém `noindex,nofollow`; o sitemap público foi preparado sem autorizar indexação.
- A fila administrativa completa é consultada por RPC protegida `tonart_admin_quotes_directory`, com paginação/filtro e busca exata por UUID; o navegador não carrega toda a base.
- `Meus orçamentos` pagina a própria base via RLS e `count=exact`, sem ampliar acesso do cliente.

## Proxy first-party do catálogo — corrigido e homologado em preview

Em 13/11/2026, as verificações feitas pelo mecanismo de acesso da Vercel retornavam `400 Invalid catalog query` em chamadas válidas do proxy. Um preview diagnóstico mostrou a causa exata: a Vercel injeta o parâmetro de plataforma `_vercel_share` em requisições protegidas/compartilhadas, e o validador fail-closed o interpretava como query pública do catálogo.

O proxy foi corrigido em duas etapas: `f36b84e` passou a reconstruir a query a partir de `request.query`, conforme o contrato de Vercel Functions; `bdab4e2` passou a ignorar **somente** os parâmetros de transporte `path` e `_vercel_share`. Todos os demais parâmetros continuam preservados para validação, inclusive duplicatas, e queries desconhecidas/cache-busting continuam bloqueadas.

Validações concluídas sem promover produção:

- sandbox efêmero sem rede: teste do proxy real aprovado (`1/1`, zero falhas) e sandbox removido;
- preview oficial sem alias/target, deployment `dpl_4TtDSivazjhKp1qMZHahkg2hzECQ`: `/api/categories`, `/api/recent?limit=1` e `/api/catalog?limit=1` retornaram HTTP 200 através do Worker real;
- `/api/categories?offset=0` permaneceu HTTP 400, comprovando o fail-closed;
- amostra mínima adicional: franquia, ficha `nier-10h-nier`, galeria de 1 item e o respectivo `card.webp` retornaram HTTP 200; a imagem respondeu `image/webp`, 71.276 bytes e suporte a Range.

**Estado:** código e proxy homologados em preview; o domínio de produção continua no deployment anterior. A observação inicial de 400 não deve ser interpretada como prova de que todo visitante público recebia 400, pois o checker Vercel acrescentava `_vercel_share`. Não tocar no Worker/D1/R2 nem ampliar a amostra para contornar esse defeito já corrigido no adaptador.

## Homologação completa da main em preview

Em 13/11/2026, a `main` canônica foi clonada e construída pelo projeto oficial Vercel `tonart-studio-public` em preview, sem promoção para produção.

- Deployment completo validado: `dpl_6S3VKity1SPSpwLWkhDDmQwChsbR`.
- O build oficial concluiu com Vite em cerca de 10 segundos e executou os gates de build já existentes: **44 testes aprovados, 0 falhas**.
- Smoke no preview completo retornou HTTP 200 para Home, Modelos, Login, Recuperação de senha, Solicitar orçamento, Meus orçamentos, Admin, Privacidade e Termos.
- O mesmo preview confirmou HTTP 200 no proxy real para categorias, catálogo e ficha de modelo; query pública não permitida permaneceu HTTP 400.
- O projeto Vercel oficial foi alinhado ao `engines.node = 24.x` do repositório. Produção não foi promovida.
- O workflow canônico `.github/workflows/quality.yml` voltou a disparar normalmente em `push main`. O run **#1403** (`43476785298`) concluiu **SUCCESS** no SHA `13c15711`, com build/audit de produção, Authority Audits, typecheck, lint, Prettier e coverage aprovados. Não criar workflow alternativo.
- O agregado `npm run release:verify` não foi invocado separadamente nesta homologação; os gates que o Quality Gate executa diretamente foram comprovados pelo run #1403 e o build do preview oficial.
- Preview runtime atual validado: `dpl_5kiAVPNbJ92KpMvj1AC9RaDY9AFr`, SHA `13c15711`, **READY**, sem promoção. Home e `/modelos/nier-10h-nier` responderam HTTP 200 e `X-Robots-Tag: noindex, nofollow, noarchive` permaneceu ativo.
- A ficha do modelo agora impede o CTA de orçamento quando a seleção já contém 50 referências e o modelo atual ainda não está selecionado; o limite continua protegido também pelo serviço de seleção e pelo serviço de orçamento.

O proxy first-party também foi executado separadamente em sandbox efêmero, com rede bloqueada e o manifesto real de quarentena SpecialSTL: **14/14 testes aprovados, 0 falhas**. O sandbox foi removido após a validação.

## Isolamento do MVP comercial

O entrypoint é escolhido em build-time por `src/main.tsx`. Com `VITE_TONECOS_COMMERCIAL_MVP=true`, o bundle monta `TonecosCommercialApp` e **não monta o App legado**. Assim, rotas antigas de perfil, pagamentos, suporte e backoffice que pertencem ao App histórico não ficam expostas no MVP comercial.

`TonecosCommercialApp` reutiliza `CatalogMvpShell` para Home, Universo, Modelos, ficha, Sobre, Contato e páginas legais, e adiciona apenas Conta, Recuperação, Solicitar orçamento, Meus orçamentos e Admin guardado. `/contato` usa `PublicCatalogContact`, sem Supabase ou chat legado; no build comercial com orçamentos habilitados, a página oferece o CTA canônico para `/solicitar-orcamento` além do e-mail, enquanto o preview read-only permanece somente em consulta/contato.

A base Supabase ativa foi verificada e não contém tabelas/RPCs de conversations/messages/support/notification preferences. O commit `d4ddf98` também impede o formulário de suporte legado de ser apresentado caso `ContactArcade` seja carregado sob flags comerciais fora do entrypoint canônico.

## Critérios pendentes para GO público

1. Validar integralmente **conta e orçamento** com cliente de teste e administrador real no domínio oficial, incluindo e-mails de confirmação/recuperação, troca de senha e as telas do histórico já persistido por RLS.
2. Produzir o GO técnico final antes de promover o preview validado para produção: concluir os gates externos ainda pendentes (Auth contra senhas vazadas, E2E de e-mail controlado e dados legais reais). O Quality Gate #1403, o build completo e o proxy já estão homologados; não repetir builds ou criar CI paralelo apenas para obter a mesma evidência.
3. A proteção de senhas vazadas do Supabase Auth exige plano Pro ou superior; a organização TONART está atualmente no Free. Só remover esse gate após upgrade e configuração real do Auth. Completar também os dados legais do operador sem inventar razão social/endereço/DPO e revisar licença/crédito dos renders mantendo a quarentena SpecialSTL.
4. Obter autorização expressa para lançar e indexar (robots/sitemap/canonical); sem GO, manter `noindex`.
5. Não associar este MVP de catálogo + orçamento a pagamentos ou assinaturas não implementados.

## Execução e documentação

Node 24+, `npm ci`, `npm run release:verify` quando aplicável. Verificar CI, configuração de produção e gates proporcionais ao risco; não tratar compilação como E2E. Nunca executar scan integral no D1, migrações ou importações apenas para conferir estado e **não criar cache, Writer, API, banco ou frontends paralelos**.

- [AGENTS.md](AGENTS.md): regras e owners.
- [URGENTE.md](URGENTE.md): checkpoint operacional de maior prioridade, atualizado por evidências.
- [docs/README.md](docs/README.md): índice da documentação operacional.
- [docs/TONART-COLECOES-ASSINATURAS-COINS.md](docs/TONART-COLECOES-ASSINATURAS-COINS.md): decisões comerciais; a seção 4.1 documenta a curadoria editorial privada da PR #28, independente de preços, checkout e Coins. **Implementação em draft, sem publicação produtiva.**
- [docs/MIGRACAO_CATALOGO_MONOREPO.md](docs/MIGRACAO_CATALOGO_MONOREPO.md): plano de migração _ainda não autorizada_; seções com SHA ou PR antiga são históricas.
- [docs/TONECOS_CATALOG_FIRST_PARTY_PROXY.md](docs/TONECOS_CATALOG_FIRST_PARTY_PROXY.md): proxy first-party e cache.
