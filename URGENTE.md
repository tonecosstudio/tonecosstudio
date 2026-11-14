## Checkpoint 14/11/2026 — prévia dos modelos na curadoria de assinaturas

- **Base → commit funcional:** `main@606faa8f` → `957bba82` (`fix(subscriptions): retain curated model previews`).
- **Implementado:** modelos escolhidos na curadoria administrativa mantêm nome, variante, franquia e imagem enquanto o rascunho é editado e a busca é limpa; o estado persistido continua guardando somente slugs do catálogo D1.
- **Validação Windows:** `SubscriptionCollectionCuration.test.tsx` passou (1); fluxo orçamento/admin, 62; seções da conta e serviço de perfil, 57. `npm run typecheck`, ESLint nos arquivos alterados e `git diff --check` passaram.
- **GitHub Actions:** os runs [43635677610](https://github.com/tonecosstudio/tonecosstudio/actions/runs/43635677610) e [43637509109](https://github.com/tonecosstudio/tonecosstudio/actions/runs/43637509109) falharam nos quatro jobs sem executar steps (`steps: []`); a API dos logs retorna `BlobNotFound`. O bloqueio permanece no provisionamento externo de runners.
- **Bloqueio real:** checkout de assinatura ainda depende de homologação isolada com as tabelas legadas de assinatura existentes; a flag continua desativada e nenhum banco remoto ou produção foi alterado.
- **NEXT_ACTION:** seguir nas integrações locais independentes; habilitar assinatura e validar checkout/admin com sessões controladas somente após homologação Supabase isolada estar disponível.
- **DO_NOT_REPEAT:** não criar catálogo, tabelas ou ledger duplicados; não tratar mocks como prova de gravação Supabase; não aplicar a migração em produção.

## Checkpoint 14/11/2026 — navegação da conta e ciclo de orçamentos

- **Base → commit funcional:** `main@955da98b` → `5d2b9dcf` (`fix(account): deduplicate subscription navigation`). A assinatura usa o agrupamento temático existente: administração escolhe até 20 modelos do catálogo canônico por coleção e o plano libera a seleção exata de 6 ou 12 pelo cliente.
- **Implementado:** quando assinaturas estão disponíveis, Minha Conta mostra somente o destino plural canônico; a rota singular legada e o fallback continuam funcionando para compatibilidade.
- **Validação Windows:** `TonecosCommercialFlow.integration.test.tsx` e `TonecosAdminQuotesPage.test.tsx` passaram: 2 arquivos, 62 testes. O teste verifica UI/serviços mockados; não comprova persistência Supabase real. O teste focado da navegação, TypeScript e ESLint também passaram no ciclo do commit funcional.
- **GitHub Actions:** os runs [43633976040](https://github.com/tonecosstudio/tonecosstudio/actions/runs/43633976040) e [43635677610](https://github.com/tonecosstudio/tonecosstudio/actions/runs/43635677610) falharam nos quatro jobs de qualidade sem executar steps (`steps: []`); a API de logs retorna `BlobNotFound`. Evidência aponta para falha de provisionamento do runner, antes dos comandos do workflow; nenhum pipeline paralelo foi criado.
- **Bloqueio real:** sem ambiente de homologação isolado com `collections`, `subscription_plans` e `subscriptions`, checkout de assinaturas ainda não foi comprovado contra Supabase real. Nenhuma escrita remota, alteração de produção ou publicação foi feita.
- **NEXT_ACTION:** continuar nas integrações locais independentes da conta; aplicar a migração de assinaturas somente em homologação isolada apta, depois habilitar a flag ali e validar cliente/admin com sessões controladas.
- **DO_NOT_REPEAT:** não criar catálogo/tabelas/serviços paralelos; não tratar mocks como integração real; não habilitar a assinatura nem executar migrações em produção.

## Checkpoint 14/11/2026 — assinatura com modelos curados do catálogo canônico

- **Base → commit funcional:** `main@a6b00e22` → `2b6a6a61` (`feat(subscriptions): add curated catalog model selection`).
- **Implementado:** administração seleciona até 20 slugs do catálogo público D1 para cada coleção existente; plano define seleção exata de 6 ou 12 modelos; o cliente escolhe no checkout; a RPC valida os slugs contra a curadoria e persiste a seleção na assinatura existente; conta e fila administrativa exibem as identidades escolhidas. Nenhum catálogo, coleção, tabela de assinaturas ou ledger paralelo foi criado. O checkout mantém o caminho do comprovante no Storage privado e a chamada antiga falha fechada sem seleção.
- **Cobrança:** o período bimestral agora resolve as próprias configurações PIX; chaves e links editáveis são semeados vazios apenas quando ausentes. A tela administrativa carrega os valores assíncronos e permite removê-los.
- **Flags:** `VITE_TONECOS_SUBSCRIPTIONS_ENABLED` foi separado do gate das rotas legadas de coleção e documentado nos templates. Permanece `false` por padrão até haver schema compatível no ambiente conectado.
- **Validação Windows:** `npm run typecheck` passou; ESLint dos arquivos TypeScript/TSX/Edge Function alterados passou; 4 arquivos de teste focados passaram (50 testes); Prettier passou nos arquivos novos; `git diff --check` passou. Os testes locais não comprovam gravação real no Supabase.
- **Bloqueio real:** a leitura anterior do Supabase conectado não encontrou `collections`, `subscription_plans` ou `subscriptions`; a migração `20261114160000_tonecos_curated_subscription_models.sql` não foi aplicada. Portanto o checkout cliente/admin ainda não foi homologado contra Supabase real. Produção, Cloudflare, D1/R2 e Vercel não foram alterados.
- **GitHub Actions:** permanece o diagnóstico do run [43623029155](https://github.com/tonecosstudio/tonecosstudio/actions/runs/43623029155): falha antes dos steps com `runner_id=0`; nenhum workflow paralelo foi criado.
- **NEXT_ACTION:** sincronizar o commit; reconciliar o schema do ambiente não produtivo com as tabelas de assinatura já previstas no histórico do repositório; só então aplicar a migração compatível, habilitar a flag nesse ambiente e validar checkout com sessão controlada de cliente e revisão administrativa.
- **DO_NOT_REPEAT:** não duplicar tabelas, catálogo, conta ou ledger; não ativar a flag contra tabelas ausentes; não tratar testes simulados como integração Supabase real; não aplicar migração nem publicar em produção.

## Checkpoint 14/11/2026 — rotas de assinatura protegidas pela disponibilidade real

- **Base → commit funcional:** `main@e9367a73` → `8c0c2fca` (`fix(commercial): gate subscriptions on data availability`).
- **Implementado:** `/planos`, checkout de coleção, seção de assinatura da conta e fila admin `/admin/assinaturas` respeitam `PUBLIC_COLLECTIONS_ENABLED`. Quando o backend não está habilitado, a interface informa o estado e oferece orçamento, catálogo ou a administração de orçamentos; a fila legada não consulta `subscription_plans`/`subscriptions`. Os serviços de assinatura existentes foram preservados para quando a fonte estiver disponível.
- **Validação Windows:** `TonecosCustomerSections.test.tsx` passou (31); `npm run typecheck`, ESLint dos quatro TSX alterados, Prettier dos quatro TSX e `git diff --check` passaram.
- **Coins:** contrato existente preservado: 1 Coin = R$1 em orçamento respondido elegível, até saldo e valor devido; não se aplica à entrada de R$50 da pré-venda.
- **Supabase (somente leitura):** só há o projeto conectado `tonecosstudio-site`; sem branches de desenvolvimento e sem `collections`, `subscription_plans` ou `subscriptions`. A criação de homologação foi recusada porque branching exige plano Pro ou superior. Nenhuma migração ou escrita remota foi feita.
- **GitHub Actions:** run [43623029155](https://github.com/tonecosstudio/tonecosstudio/actions/runs/43623029155), no HEAD `e9367a73`, falhou em quatro jobs com `runner_id=0` e zero steps; o job offline foi ignorado. A API não disponibiliza os logs (`BlobNotFound`), então não há evidência de falha na execução dos comandos do workflow.
- **NEXT_ACTION:** aguardar a definição de unidade das assinaturas (franquia publicada do D1 ou agrupamento curado existente) e um ambiente de homologação apto a branches; seguir nas integrações locais independentes e validar o fluxo com sessão real assim que houver ambiente.
- **DO_NOT_REPEAT:** não ativar as telas antigas contra tabelas ausentes, não recriar catálogo/coleções, não tratar mocks como integração Supabase real e não alterar banco ou serviços de produção.

## Checkpoint 14/11/2026 — pagamentos da conta ligados ao histórico canônico

- **Base → commit funcional:** `main@3b5d4b30` → `2499a54d` (`fix(account): show canonical quote payments`).
- **Implementado:** `/perfil/pagamentos` agora lê os 10 orçamentos recentes pelo serviço canônico e mostra estado, valor, uso de Coins e link ao detalhe. PIX, comprovantes e aprovação continuam no registro original; a página comercial não consulta as tabelas antigas `payment_methods`/`manual_payments`.
- **Validação Windows:** `TonecosCustomerSections.test.tsx` passou (28); `npm run typecheck`, ESLint dos arquivos alterados e `git diff --check` passaram.
- **Coins:** regra existente preservada: 1 Coin = R$1 em orçamento comum respondido, até o saldo/valor em aberto; sem aplicação à entrada de R$50 da pré-venda.
- **Supabase (somente leitura):** projeto conectado `tonecosstudio-site` está ativo; migrações vão até `20261114150141`, mas não há `subscription_plans`, `subscriptions` ou `collections`, nem branch isolada. Nenhuma escrita remota ou alteração de produção foi feita.
- **NEXT_ACTION:** integrar a assinatura comercial sem duplicar o catálogo. A tela existente espera coleções em Supabase, enquanto o catálogo canônico atual publica modelos por franquia; aguardo a decisão sobre esse mapeamento antes de alterar o contrato.
- **DO_NOT_REPEAT:** não reconstruir um catálogo de coleções em Supabase, não reutilizar `subscription_credit_subscriptions` como segunda autoridade e não tratar mocks como prova de integração real.

## Checkpoint 14/11/2026 — endereço do perfil e lacuna de assinaturas

- **Base → commit funcional:** `main@e5a20984` → `501c2a11` (`fix(account): correct delivery address autofill`).
- **Implementado:** o autofill do endereço deixou de tratar Número como Complemento; Complemento recebe `address-line2`, e o CEP mostra o formato esperado. O endereço segue salvo no perfil canônico existente.
- **Validação Windows:** teste direcionado do formulário passou (1); `npm run typecheck`, ESLint dos dois arquivos e `git diff --check` passaram.
- **Coins:** regra canônica preservada, sem mudança de saldo, ledger ou resgate: 1 Coin = R$1 em orçamento respondido; não incide sobre a entrada da pré-venda.
- **Bloqueio de integração real:** o serviço existente de assinaturas consulta `public.subscriptions`, mas o schema lido do projeto Supabase conectado não contém essa tabela; também não há branch isolada confirmada. Não foi criado esquema paralelo nem feita escrita remota. E2E com sessão cliente/admin continua pendente.
- **NEXT_ACTION:** reconciliar qual subsistema de assinatura já existente é o canônico e preparar sua integração no ambiente isolado; manter uma única fonte de dados e validar com contas controladas.
- **DO_NOT_REPEAT:** não duplicar `subscriptions`/`subscription_credit_subscriptions`, tabelas ou serviços; não inferir ausência de dados por mock; não escrever em produção.

## Checkpoint 14/11/2026 — revisão do contrato Coins e resumo financeiro admin

- **Base → commit funcional:** `main@8c97d8f8` → `c4a8095a` (`test(commercial): align finance summary assertion`).
- **Coins:** confirmação no código/migração existente: 1 Coin abate R$1 em orçamento comum já respondido, limitado ao saldo e ao valor em aberto; a entrada de R$50 da pré-venda fica fora do resgate. Não foi criada nem alterada regra financeira, ledger ou serviço.
- **Correção:** expectativa do teste do resumo financeiro agora acompanha o texto atual, que identifica os dados como valores de orçamentos e não como faturamento; o teste do menu aguarda a carga assíncrona da tela.
- **Validação Windows:** suíte focada anterior de 6 arquivos passou (151 testes); o teste do menu passou isolado após o ajuste assíncrono, ESLint do arquivo e `git diff --check` passaram.
- **Integração remota:** nenhuma escrita Supabase, publicação ou deploy. E2E autenticado de cliente/admin depende de sessões controladas e homologação inequivocamente isolada; o Actions segue bloqueado antes dos steps pelo runner indisponível/limite da conta.
- **NEXT_ACTION:** seguir os pontos pendentes de perfil/endereço/preferências e do ciclo orçamento → administração → histórico usando os serviços existentes; retomar E2E real quando houver sessão de homologação controlada.
- **DO_NOT_REPEAT:** não inventar compra/conversão ou resgate na pré-venda; não duplicar carteira, ledger, cadastro ou serviços; testes com mocks não comprovam gravação real no Supabase.

## Checkpoint 14/11/2026 — contrato de Coins alinhado nas telas comerciais

- **Base e commit:** main@9ce109abd83e18c7b783adf8e29c80755c2aabd7 → 0fb6e5add25a75a34d8cc0675a3f5995479cb980, sincronizado com origin/main.
- **Regra canônica confirmada:** migração supabase/migrations/20261114150141_tonecos_quote_full_payment_and_coin_redemption.sql e RPC do staging confirmam 1 Coin = R$1 de abatimento em orçamento comum já respondido, limitado ao saldo e ao valor em aberto. A entrada de R$50 da pré-venda não aceita Coins. Coins não são dinheiro, não podem ser sacados/transferidos e não foram criados pacotes ou regras paralelas.
- **Implementado:** a ficha do produto e a Home explicam onde Coins entram; carteira, histórico e instrução de comprovante usam a mesma regra. O texto de pagamento informa comprovante apenas se restar saldo após Coins. Termos comerciais agora descrevem a resposta do orçamento, pagamento manual com revisão do comprovante, entrada abatida e regra de Coins. Nenhum ledger, RPC, tabela ou política financeira foi alterado.
- **Verificação local:** host comercial em 127.0.0.1:8082 carregou Home, catálogo e ficha do produto; texto de Coins foi conferido na ficha e na Home. npm run typecheck, ESLint dos 10 arquivos alterados, ESLint final dos arquivos de histórico/fluxo e git diff --check passaram. Testes focados finais: regra na ficha (1 passou) e aplicação de Coins no histórico (1 passou). O lote anterior de 5 arquivos teve 91 testes aprovados e 2 expectativas textuais desatualizadas; ambas foram corrigidas e os casos afetados passaram isoladamente depois.
- **Limites reais:** Actions run 43614132563 (head 0fb6e5ad) falhou em quatro jobs com runner_id=0 e zero steps; job offline foi ignorado. O diagnóstico de faturamento/limite de gastos continua sendo externo ao repositório. Não houve escrita remota no Supabase; inspeção de staging foi somente leitura. Não foi feito E2E com sessões reais controladas de cliente e administração.
- **NEXT_ACTION:** homologar E2E com sessões controladas de cliente/admin quando disponíveis e retomar Actions quando a conta permitir alocação de runner. Produção permanece sem publicação.
- **DO_NOT_REPEAT:** não recuperar tabelas/taxas antigas conflitantes de Coins, não criar pacote/ledger/RPC paralelo, não tratar mocks como prova de gravação real no Supabase e não alterar serviços ou domínio de produção.

## Checkpoint 14/11/2026 — integrações comerciais em homologação

- **Supabase:** o projeto conectado `tonecosstudio-site` (`icmtmaakjucmuzxnofkd`) está documentado como homologação comercial. A lista remota avançou de `20261114043245` até as migrações `20261114140829` (CPF/nascimento), `20261114140837` (pré-venda e comprovantes), `20261114140845` (diretório administrativo) e `20261114140850` (Black Friday); todas foram aplicadas a partir dos SQL versionados no repositório.
- **Verificação real:** `information_schema` confirmou as colunas fiscais e de endereço/preferências em `profiles`, os valores de entrada/pagamento/desconto em `quotes` e as tabelas de histórico `quote_payments` e `payment_links`. `pg_proc` confirmou os RPCs de orçamento, pré-venda, pagamento e diretório de clientes. Não foi feita consulta de dados pessoais nem escrita em produção.
- **Limites de homologação:** não há branches de desenvolvimento no projeto e não há usuários reais conforme o checkpoint do projeto. A sessão de cliente/admin e o envio real de comprovante ainda precisam de usuários de teste controlados. Assinaturas permanecem fora do escopo ativado.
- **Segurança observada:** o advisor marca `payment_links` (sem grant/política direta; acessado pelas RPCs administrativas) e `private_api.admin_users` (privado) como RLS sem política, ambos intencionais no desenho atual. Os RPCs `SECURITY DEFINER` verificados fazem checagem administrativa. Proteção contra senhas vazadas continua desabilitada por configuração preexistente; não foi alterada.
- **GitHub Actions:** run `43602806478` do commit `3554bd2b` falhou em quatro jobs antes de produzir steps ou logs; o job do Worker foi ignorado. Nenhum workflow paralelo foi criado.
- **NEXT_ACTION:** homologar com contas controladas em branch isolada quando seu custo estiver autorizado; seguir a regra de Coins sem inventar compra/conversão, porque preço e resgate ainda não existem no contrato canônico.

## Checkpoint 14/11/2026 — histórico de Coins e diagnóstico do Actions

- **Base → commit:** `main@a6c5f12f` → `31365ca5` (`fix(coins): paginate customer ledger and sanitize errors`).
- **Implementado:** a carteira percorre todos os lançamentos em páginas de 25, com ordenação estável por data/ID e contagem derivada do mesmo ledger imutável. Expiração de sessão oferece entrada novamente; mensagens do Supabase não são exibidas ao cliente. A administração mantém busca de cliente individual e crédito auditável idempotente. Não foi criada tabela nem regra paralela.
- **Validação Windows:** 4 arquivos focados, 21 testes passaram; `npm run typecheck`, ESLint dos arquivos alterados e `git diff --check` passaram.
- **Coins:** o contrato canônico continua com créditos administrativos e histórico não monetário. Não há preço de Coins no catálogo público D1 nem RPC de compra/resgate; nenhuma conversão ou política de resgate foi inventada. `purchase_spend` no ledger aceita histórico, mas não existe escritor transacional correspondente.
- **GitHub Actions:** run `43602806478` (head `3554bd2b`) falhou em quatro jobs sem steps ou logs; o Worker offline foi ignorado. O problema ocorre antes da execução de qualquer etapa, sem causa operacional adicional ou correção de código identificável. Nenhum workflow paralelo foi criado.
- **NEXT_ACTION:** para gasto/resgate de Coins, obter regra comercial e preço canônico; concluir a homologação autenticada em staging isolado.
- **DO_NOT_REPEAT:** não reutilizar as tabelas antigas de Coins no MVP TONART, nem criar saldo/compra/câmbio duplicados; não tratar mocks como integração real; não escrever no Supabase de produção.

## Checkpoint 14/11/2026 — oferta Black Friday no orçamento canônico

- **Base → commit:** `main@433546b6` → `cf1d8c5d` (`feat(commercial): record Black Friday quote discounts`).
- **Implementado:** o administrador registra preço-base e desconto inteiro de 0–50%; uma RPC protegida grava preço-base, percentual, redução e total no mesmo `quotes` canônico. O saldo da pré-venda de R$50 é calculado sobre o total já descontado. Valores históricos mantêm o preço anterior. Cliente vê base, economia e total no histórico; o e-mail/WhatsApp preparado pelo administrador inclui os mesmos valores. A página do modelo explica a campanha e o quadro da pré-venda não repete o total.
- **Validação Windows:** 4 arquivos focados, 85 testes passaram; `npm run typecheck`, ESLint dos TSX/serviços alterados e `git diff --check` passaram. Testes usam serviços simulados e não provam gravação real no Supabase.
- **Supabase:** migração `20261114140850_tonart_black_friday_quote_discounts.sql` adiciona os campos à tabela `quotes` e atualiza a RPC/diretório existentes. Aplicada no projeto de homologação; não aplicada em produção.
- **NEXT_ACTION:** continuar a integração das Coins e demais recursos já programados usando o ledger/serviços existentes; depois retomar a homologação autenticada e o diagnóstico do runner do GitHub Actions. Aplicar migrações só em staging autorizado.
- **DO_NOT_REPEAT:** não criar autoridade paralela de preço, carrinho, conta ou ledger; não tratar mocks como prova Supabase; não publicar nem escrever em serviços de produção.

## Checkpoint 14/11/2026 — correção de catálogo no host local

- **Base/HEAD:** `main@5a6a2785` → correção `3ef2b0ac`.
- **Implementado:** o gateway de catálogo agora aceita o proxy HTTP somente quando ele usa a origem local exata (`localhost`/`127.0.0.1`) em desenvolvimento, independentemente da porta dinâmica do Vite. HTTP externo continua rejeitado. A prévia local usa `.env.local` ignorado pelo Git, com catálogo público somente leitura e o proxy existente; não usa credenciais Supabase.
- **Validação:** `npx vitest run src/services/catalog/public-catalog-gateway.test.ts` passou (51 testes); `npm run typecheck` passou; `git diff --check` limpo. A API de desenvolvimento respondeu com 24 referências e a home no navegador interno exibiu seis modelos.
- **Produção:** nenhuma escrita em Supabase, Cloudflare, D1/R2 ou deploy. O host local permanece somente leitura.
- **NEXT_ACTION:** continuar integrando as páginas comerciais ao schema TONART atual. Não aplicar migrações no Supabase de produção; validar checkout/assinaturas somente em ambiente isolado quando o custo de branch de desenvolvimento estiver aprovado.
- **DO_NOT_REPEAT:** não iniciar o app legado sem flags locais; não relaxar HTTP fora da origem de desenvolvimento; não usar esse preview somente leitura como prova de checkout ou de gravação no Supabase.
# TONART Studio — checkpoint operacional

## Checkpoint 14/11/2026 — integração de conta, administração e pré-venda

- **Base:** implementado sobre `main@9063dd33`; commits `463e0d42` e `54d06665` sincronizados com `origin/main`.
- **Implementado:** autorização de administrador nas Edge Functions usa `is_tonecos_admin()` do projeto TONART, sem consultar `profiles.role`. Os RPCs de pré-venda que verificam `auth.uid()` agora recebem o JWT do administrador; upload de suporte consulta a mesma autoridade. Gestão e detalhes de clientes usam o diretório de perfis, `private_api.admin_users`, o perfil canônico e o ledger Coins. Histórico financeiro da pré-venda lê `quote_payments` sob RLS de dono/admin.
- **Banco local:** a migração de pré-venda declara os campos/tabelas ausentes no schema TONART, bucket privado, RPC de instruções de pagamento e políticas de acesso. Migração administrativa estende o diretório existente e adiciona funções para gestão de acesso, perfil individual e saldo Coins sem cadastro paralelo. Os passos legados de reenvio/sincronização de assinaturas ficam condicionados à presença das tabelas antigas, para não bloquear o fluxo TONART.
- **Validação Windows:** 48 testes direcionados passaram; `npm run typecheck`, ESLint dos arquivos de aplicação e `git diff --check` passaram. TypeScript não inclui as Edge Functions Deno. `deno`, `psql` e Supabase CLI não estão instalados; SQL e Edge Functions precisam de verificação em staging.
- **Supabase:** nenhuma migração ou escrita remota foi feita. A única base conectada é a de produção; a criação de branch isolada custa US$ 0,01344/hora e a aprovação do usuário continua pendente.
- **Limites reais:** o schema comercial existente não tem `subscriptions`/`manual_payments`; as duas integrações legadas de assinatura não foram provisionadas nesta etapa. GitHub Actions permanece falhando antes dos jobs, com `runner_id=0` e sem steps/logs úteis.
- **NEXT_ACTION:** após a aprovação da branch isolada, aplicar e validar as migrações nela com sessões autenticadas cliente/admin. Não alterar Supabase de produção nem publicar no domínio oficial.

## Checkpoint 14/11/2026 — compatibilidade do perfil e do histórico comercial

- **Base:** `main@462e9729`; mudanças locais ainda não commitadas neste checkpoint.
- **Correção:** Minha Conta agora continua carregando e salvando os dados suportados quando o schema ainda não tem `cpf`/`birth_date`; se o cliente preencher esses campos sem a migração, a interface explica que eles não foram salvos. O histórico de orçamentos faz fallback restrito às colunas canônicas conhecidas quando o schema de pré-venda não está presente; falhas de rede e outros erros continuam visíveis.
- **Validação Windows:** 39 testes direcionados passaram; `npm run typecheck`, ESLint nos arquivos alterados e `git diff --check` passaram.
- **Integração Supabase:** o projeto conectado tem `profiles`, `quotes`, `quote_events` e `tonecos_coin_entries`, com RPCs de perfil, orçamento e Coins. A migração mais recente registrada é `20261114043245`. O schema não contém CPF/nascimento, `quote_payments`, `subscriptions` ou `manual_payments`; por isso três das quatro migrações locais posteriores precisam de dependências reconciliadas antes de qualquer aplicação. Nenhuma escrita remota foi feita.
- **Homologação:** não há branch de desenvolvimento. O custo informado para criar uma é US$ 0,01344/hora; pedi aprovação e ela ainda está pendente.
- **GitHub Actions:** run `43591444126` tem quatro jobs encerrados antes de qualquer step com `runner_id=0`; o bloqueio continua externo ao workflow e não foi criado pipeline paralelo.
- **NEXT_ACTION:** após a aprovação da branch, reconciliar as dependências comerciais no ambiente isolado, aplicar as migrações pendentes e verificar os RPCs. Não publicar nem alterar os serviços de produção neste ciclo.

## Checkpoint 14/11/2026 — pré-venda ligada ao fluxo comercial

- **Base:** `main@b4a9c8d7`, commits concorrentes da Home e seus testes foram preservados e integrados neste ciclo.
- **Home comercial:** Black Friday, entrada de R$50 e carteira Coins ficam disponíveis quando o ambiente comercial está habilitado; a home pública somente leitura continua sem ofertas ou cobrança.
- **Implementado:** pré-venda usa a solicitação canônica de orçamento e o mesmo registro `quotes`. Entrada fixa de R$50, saldo calculado após a resposta administrativa, instruções PIX/link, upload privado de comprovante pelo cliente, aprovação/recusa administrativa com motivo e reenvio no mesmo pedido. Os estados de pagamento e os valores são conferidos no banco; nenhuma aprovação é simulada no cliente.
- **Administração:** a central existente abriu as rotas de pagamentos no shell comercial e agora inclui a página existente de chaves e a aba de pré-vendas. Navegação direta, filas de revisão, estados de carregamento/erro, métricas e apresentação mobile foram ajustados.
- **Comunicação de cobrança:** a tela salva PIX/link e disponibiliza as instruções em Meus orçamentos; o texto agora esclarece que não há envio automático de e-mail/WhatsApp e orienta o comprovante corretamente.
- **Banco e segurança:** migração `20261114140837_tonart_preorder_quote_payment_flow.sql` acrescenta campos e RPCs à estrutura `quotes`/`quote_payments` existente e amplia as políticas do bucket privado `payment-vouchers`. Aplicada no projeto de homologação; nenhum recurso Supabase/Cloudflare de produção foi alterado.
- **Validação Windows:** 6 arquivos focados, 85 testes passaram; `npm run typecheck`, ESLint dos arquivos alterados e `git diff --check` passaram. Fixtures e testes com mocks não comprovam E2E real nem a aplicação da migração.
- **GitHub Actions:** segue o bloqueio externo previamente observado: jobs falham antes dos steps com `runner_id=0`; sem workflow paralelo.
- **NEXT_ACTION:** sincronizar este commit em `origin/main`; depois aplicar a migração somente em staging autorizado e homologar o percurso com sessões reais de cliente e administração. Produção permanece sem publicação.
- **DO_NOT_REPEAT:** não criar cadastro, tabela, serviço, RPC ou workflow duplicados; não tratar mocks como Supabase real; não aplicar migração nem publicar em produção sem o gate específico.

## Checkpoint 14/11/2026 — integrações comerciais na main

- **Base e integração:** `main@f71a78ac` incorporada via rebase; implementação em `348b9081 feat(commercial): complete account and subscription flows`. O teste adicional da Home e este checkpoint ainda serão commitados e sincronizados.
- **Conta e orçamento:** Minha Conta usa o perfil canônico existente para dados pessoais, CPF/nascimento, endereço e preferências. As rotas autenticadas de orçamento, administração e histórico permanecem no fluxo único.
- **Coins e campanha:** carteira Coins e orçamentos ficam acessíveis no MVP comercial. Black Friday (até 50%) e pré-venda de R$50 abatidos do total aparecem apenas no ambiente comercial; o catálogo público somente leitura segue sem ofertas nem chamadas de pré-venda.
- **Assinaturas:** checkout PIX manual coleta comprovante no bucket privado existente, registra solicitação pela RPC existente e oferece fila administrativa de conferência; comprovante rejeitado pode ser reenviado na mesma cobrança. A tela distingue falha de consulta de ausência de plano.
- **Banco:** migrações locais sincronizam o resultado da conferência com o histórico de pagamentos e permitem reenvio. A migração de perfil reutiliza `cpf` e `birth_date` em texto que já existem no mesmo `profiles`; não cria colunas/tabela de identidade duplicadas. **Nenhuma migração foi aplicada remotamente e nenhum recurso de produção foi alterado.**
- **Validação Windows:** `npm test --` nos 8 arquivos focados passou (107 testes); `npm run typecheck`, ESLint dos arquivos alterados e `git diff --check` passaram. Fixtures/mocks não provam E2E real com Supabase.
- **GitHub Actions:** permanece o bloqueio operacional conhecido, jobs encerrando antes de steps com `runner_id=0`; não foi criado nem repetido workflow paralelo.
- **NEXT_ACTION:** concluir revisão final do diff, enviar os commits para `origin/main` e, em staging autorizado, aplicar as migrações e provar checkout/revisão com sessões cliente/admin reais. Não publicar produção.
- **DO_NOT_REPEAT:** não recriar perfil, auth, wallet, orçamento, tabelas, endpoints ou workflow; não usar mocks como prova do Supabase; não aplicar migração ou publicar no domínio oficial sem o gate específico.

## Checkpoint 14/11/2026 — home TONART, campanha e Coins

- **Base:** main@5ce02e10e7cae1926028e17231ad64f5de3b3cba, sincronizada com origin/main antes desta alteração.
- **Implementado:** home recomposta; faixa Black Friday até 50% após o título; produtos em três colunas; pré-venda com entrada de R$50 abatida do total e simulador; Coins em linguagem atual, conectados à carteira canônica quando habilitada; contato contextual para Coins/pré-venda. Ficha do modelo refinada e CTA de orçamento respeita suas flags.
- **Validação:** 4 testes focados, typecheck, ESLint dos arquivos alterados e npm run build passaram. Build reportou avisos de comentários internos em zod, sem falhas. Sem publicação ou escrita produtiva.
- **GitHub Actions:** run 43578448703 (commit 4c1e8ace) repete a falha do run 43572892489: quatro jobs failed, runner_id=0, zero steps e logs indisponíveis (404). Workflow usa ubuntu-latest; causa exata externa não retornada pelo GitHub. Sem pipeline paralelo.
- **Limites:** simulador é informativo; não ativamos cobrança nova nem Coins por alteração de flags. Inspeção visual automatizada indisponível nesta sessão.
- **NEXT_ACTION:** homologação visual e comercial no ambiente autorizado.
- **DO_NOT_REPEAT:** não inventar saldos, descontos individuais ou datas de campanha; não escrever em produção.

## Checkpoint 14/11/2026 — catálogo local sem modelos

- **Base → alteração:** `main@75c09f1b3f70ca67d12463cda40b8427fbe060f8` → proxy local de desenvolvimento e base same-origin automática em `http://localhost:8080/catalogo-api/`. Com endpoint vazio, a tela de modelos desativava a consulta; chamadas diretas ao Worker falhavam por CORS.
- **Correção:** o Vite local encaminha `/catalogo-api/*` pelo `onRequest` Pages já existente, mantendo lista GET permitida, limites de consulta e quarentena de mídia. A página permite HTTP apenas nesse proxy loopback exato durante `DEV`; produção segue usando o proxy Pages/Service Binding canônico. O template `.env.local` agora inicia em catálogo público read-only, sem Supabase, contas, orçamentos ou Coins.
- **Provas:** 96 testes direcionados passaram; typecheck, ESLint e `npm run build` passaram. O build público exclui Supabase/comercial. Uma leitura local limitada confirmou 36 modelos; POST foi rejeitado com 405 e rota não autorizada com 404. Nenhuma escrita em Cloudflare, D1, R2 ou Supabase foi feita.
- **NEXT_ACTION:** manter o host local em `http://127.0.0.1:8080/modelos`; para homologar telas comerciais, usar ambiente de staging autorizado. Actions continua com falha de runner sem steps conforme checkpoint abaixo; visualização automática do navegador permanece indisponível.
- **DO_NOT_REPEAT:** não acessar D1/R2 diretamente nem fazer sondagens repetidas; não relaxar o CORS do Worker; não habilitar Coins, pagamentos ou assinatura; não alterar serviços ou infraestrutura de produção.

## Checkpoint 14/11/2026 — validação Windows e bloqueio de runner no Actions

- **Base → commit:** `main@9ff599555e19a6e3187b34f318276c2e91a8e5a5` → `75c09f1b3f70ca67d12463cda40b8427fbe060f8` (`fix(windows): normalize line endings in repository guards`). Ajustes restritos a `scripts/architecture/catalog-monorepo.test.mjs` e `src/test/delivery-choice-integrity.test.ts`: normalizam CRLF para LF ao comparar conteúdo versionado, para não confundir `core.autocrlf` do Windows com drift real. Nenhuma regra comercial, serviço, tabela ou fluxo de dados foi alterado neste ciclo.
- **Validação local:** `npm run release:verify` passou no Windows: typecheck, ESLint (0 erros; avisos `no-explicit-any` preexistentes), auditorias de autoridade, cobertura completa (`304` arquivos passaram, `3` ignorados; `3.671` testes passaram, `32` ignorados), build Vite e `npm audit --omit=dev --audit-level=high` (0 vulnerabilidades). Os testes continuam usando mocks; não comprovam acesso real ao Supabase.
- **Actions:** run [43557650643](https://github.com/tonecosstudio/tonecosstudio/actions/runs/43557650643) falhou em quatro jobs antes dos steps; a API registra `runner_id: 0`, nome de runner vazio e nenhum step. GitHub não forneceu logs, portanto a causa operacional exata do runner permanece externa/indeterminada; não foi criado workflow paralelo.
- **Fluxo comercial existente:** páginas e serviços canônicos de conta, perfil, endereços, preferências, solicitação de orçamento, administração e histórico foram cobertos pelos testes direcionados já executados (125 passaram). Ainda falta homologação ponta a ponta com sessões reais de cliente e administrador no ambiente autorizado.
- **NEXT_ACTION:** concluir homologação autenticada com contas de cliente e administrador autorizadas e registrar evidências. Nenhuma produção foi publicada nem dados/infraestrutura Supabase foram alterados.
- **DO_NOT_REPEAT:** não duplicar perfil, endereços, tabelas, autenticação, serviços ou workflows; não tratar mocks como prova de Supabase; não ativar Coins, pagamentos ou assinaturas; não alterar produção/Cloudflare/D1/R2/Supabase sem autorização específica.

## Checkpoint 14/11/2026 — cadastro complementar no Supabase canônico

- **Implementado:** somente `public.profiles` do projeto TONART `icmtmaakjucmuzxnofkd` recebeu `whatsapp`, `delivery_address`, `preferred_contact_channel`, `quote_updates`, `production_updates` e `marketing_emails`, via migração aplicada `20261114043245_tonart_profile_complementary_fields`. A migração canônica foi alinhada à versão real no repositório. **Não foram criadas tabelas de cadastro paralelas.**
- **Autoridade e controles verificados no banco:** RLS própria de `profiles` preservada (`id=auth.uid()` para SELECT/UPDATE, com WITH CHECK), GRANT UPDATE somente às colunas previstas, CPF e nascimento não armazenados, restrições de WhatsApp/CEP/endereço/UF e opt-ins false por padrão. Advisors de segurança identificaram `auth_leaked_password_protection` desabilitado (preexistente, não alterado); RLS sem políticas na tabela interna `private_api.admin_users` é intencional, sem exposição pública.
- **Frontend integrado:** `TonecosCustomerSections.tsx` agora permite editar WhatsApp, endereço e preferências no mesmo perfil. `tonecos-account-service.ts` consulta/atualiza somente esse perfil com validações e verificação Auth; `TonecosQuoteRequestPage.tsx` reutiliza WhatsApp e CEP salvos, sem novos campos de coleta. Os valores antigos em `quotes` continuam histórico da solicitação, não são importados automaticamente para `profiles`.
- **Build preview confirmado:** `main@11b69bbfae71e6bcdf36ebfe3a9d29c8d610126b`, Vercel `dpl_ARcwdN7YiTNunEZD9PT5RyZV3NZN` READY, `https://tonart-studio-public-on5ytw7so-jogo-brasils-projects.vercel.app` (preview sem promoção); `/perfil/endereco` HTTP 200, noindex, build Vite aprovado.
- **Testes:** testes focados de formulário, persistência, validação e reuso no orçamento escritos/atualizados, mas GitHub Actions [#43557650643](https://github.com/tonecosstudio/tonecosstudio/actions/runs/43557650643) falhou **antes de executar qualquer step**. Nenhuma homologação E2E autenticada com cliente real concluída.
- **NEXT_ACTION:** executar testes unitários e de tipo em runner funcional, homologar sessão cliente no preview (salvar/recarregar/remover endereço e preferências, conferir orçamento com contato/CEP corretos), avaliar eventual proteção contra senhas vazadas. Não ativar e-mail/WhatsApp automático apenas por haver opt-in de preferência.
- **DO_NOT_REPEAT:** não recriar perfis, não migrar CPF/nascimento sem finalidade, não alterar política admin/Coins/pagamentos, não publicar no domínio oficial sem homologação.

## Checkpoint 14/11/2026 — formulário complementar recuperado no frontend

- **Base e HEAD de código:** `main@c59a35af043438987554b0fd458f020215eb63b0`; somente `src/pages/commercial/TonecosCustomerSections.tsx` e testes da mesma página foram alterados. O formulário complementar reutiliza `PendingCustomerData` e a mesma navegação/identidade existentes; restabelece WhatsApp adicional, CPF para finalidade fiscal, data de nascimento, endereço BR/UF e preferências (contato, avisos de orçamento/produção, campanhas), sem gravar dados nem simular consentimento.
- **Preview Vercel:** deployment `dpl_BibyG3SW3AtFFMtcEkVRgCqcaKb4`, `READY`, URL `https://tonart-studio-public-f207kpbi0-jogo-brasils-projects.vercel.app`, build SHA `27087956f94f17448619079aae715db0a1aac54f` (código funcional idêntico ao HEAD `c59a35a`; commit posterior somente testes). O site permanece sem indexação e sem promoção ao domínio oficial.
- **Testes:** regressão adicionada para seletores de UF, caixas desabilitadas e ausência de submissão. CI [#43555509768](https://github.com/tonecosstudio/tonecosstudio/actions/runs/43555509768) falhou antes da execução de etapas, como nos commits anteriores. Logo, **build Vercel aprovado**, mas suíte/teste de tipos e QA visual autenticado **não homologados**.
- **Fronteiras:** nenhuma alteração Supabase, RLS, Worker, D1, R2, moedas, pagamento ou produção oficial. `profiles` comercial só possui `full_name` e `phone` além de identidade/metadados; não usar os campos presentes no sistema histórico como autorização para gravar no projeto TONART antes da migração de schema.
- **NEXT_ACTION:** validar os formulários no preview com usuário autorizado, depois conectar campos complementares à autoridade única do perfil em fase backend, com critérios de consentimento/necessidade e testes reais.
- **DO_NOT_REPEAT:** não criar segundo cadastro, outra tabela, serviço ou workflow, não inventar dados de clientes nem armazenar CPF/dados de contato em browser/storage sem garantia de persistência adequada, não gerar build apenas para este checkpoint.


## Checkpoint 14/11/2026 — links diretos para orçamentos do cliente

- **Base de código validada no preview:** `tonecosstudio/tonecosstudio/main@cd895c9b2d8b3b88016ee52b1422d7c73c4241dd`. Alterações: `src/services/customer/catalog-quote-service.ts` (filtro RLS por `user_id` e UUID exato), `TonecosMyQuotesPage.tsx` (detalhe pela rota existente `?quote=UUID`), `TonecosCustomerActivity.tsx`, `TonecosCustomerNotifications.tsx` e `TonecosCustomerSections.tsx` (atalhos), `src/config/routes.ts` (retorno de login restrito). Testes adicionados nos arquivos canônicos existentes.
- **Vercel preview isolado:** deployment `dpl_7jcSJ8AvSh3F3amGnERyy9UsN2i6`, URL `https://tonart-studio-public-f6u5gatfy-jogo-brasils-projects.vercel.app`, SHA `cd895c9`, `target=null`, READY; Vite build concluiu, validação catalog:monorepo e noindex/disallow mantidos. **Não foi promovido** para domínio de produção. A disponibilidade HTML não substitui QA visual autenticado.
- **GitHub Actions:** Quality Gate [#43552449800](https://github.com/tonecosstudio/tonecosstudio/actions/runs/43552449800) concluiu failure **sem steps executados** em quatro jobs; testes de regressão novos **não tiveram runner**. Build Vercel valida bundle, não homologação de testes/unit/typecheck/E2E.
- **NEXT_ACTION:** executar testes direcionados e tipo assim que houver runner, conferir preview com sessão cliente autorizada em pedidos/notificações/detalhes e validar bloqueio de links de terceiros por RLS. Só depois implementar os campos de cadastro permanente na única autoridade `profiles`/Supabase, mediante mudança de escopo.
- **DO_NOT_REPEAT:** não criar nova página, backend, tabela, endpoint, workflow ou worker para links do cliente; não prometer entrega de e-mail/WhatsApp a partir de eventos internos. Não promover produção nem habilitar Coins/pagamentos.

## Checkpoint 14/11/2026 — Minha Conta: histórico sem duplicação

- **Base/HEAD funcional:** `main` avançou de `1ae1464` para `0f9deb8a18d6e12609262daecae5159be2a90f89`; alterações em `src/pages/commercial/TonecosCustomerSections.tsx` e testes correspondentes. As seções recuperadas exibem dados históricos de orçamento (WhatsApp, CEP, escala e acabamento) consultados pela única `loadMyCatalogQuotePage` com sessão/RLS existente, sem promover campos de uma solicitação a perfil permanente. Falha não é confundida com vazio; há retry, limite explícito de cinco solicitações e a consulta não ocorre se orçamento estiver desabilitado.
- **Backend/produção:** nenhuma alteração em Supabase, Worker, D1/R2, moedas, domínio ou deploy de produção. Preview anterior Vercel `dpl_4Ty8PUgjbRwV4QL6u7nfKd71rwYt` permanece no SHA `1ae1464`; **não** é prova visual do HEAD novo.
- **Validação:** testes de regressão adicionados, mas **não executados**: Quality Gate [#43550866782](https://github.com/tonecosstudio/tonecosstudio/actions/runs/43550866782) falhou antes de qualquer step (job sem steps), logo não valida nem reprova o código. Prova local e preview do HEAD ainda pendentes.
- **NEXT_ACTION:** validar testes direcionados e build com runner disponível, gerar preview isolado do HEAD e revisar visualmente /perfil/dados-pessoais, /perfil/endereco e /perfil/preferencias com usuário autorizado; somente depois avaliar colunas adicionais no perfil e integração Supabase.
- **DO_NOT_REPEAT:** não duplicar formulário, backend, tabela `profiles`, histórico `quotes` ou UI de cadastro. Não inventar persistência para endereço, WhatsApp separado e preferências, e não promover preview à produção sem gates/GO aplicáveis.

## Checkpoint 12/11/2026 — MVP público, conta e fluxo comercial

**STATUS ATUAL** (evidência código GitHub + Vercel env + metadados Supabase + Cloudflare deployment; não substituir testes reais):
- **Site oficial:** https://tonartstudio.com.br, projeto Vercel `tonart-studio-public`, código em `tonecosstudio/tonecosstudio/main`; PRs de site até **#24** integradas (merge `bb661ab8088cdfbdc071fa8d798f42fb0d772163`). Site visual permanece **pré-lançamento/noindex**, sem GO de indexação.
- **Catálogo:** Worker original `tonecos-catalogo-api` com D1/R2 canônicos; publicador ativo `washingtonmsdj/catalogo`. PRs de origem **#266–#269 integradas**; proteção de query direta, correção de media Range e teste de cache com rollback comprovados. Após o release de #269, versão Cloudflare **`0b6d0d02-58f6-4f99-9a9a-92a605a498ed`**, 100% tráfego. Migração do writer para `services/catalogo/` **não autorizada**; manifesto `releaseAuthorized=false`.
- **Cache/custo D1:** primeira página admin 12 modelos; próximas páginas/galerias sob demanda. CDN Vercel 5 minutos para JSON público autorizado, Worker mantém cache e bloqueia cache-busters na origem. Sem cache paralelo/KV e sem scans D1/R2.
- **Produção comercial confirmada:** Vercel `VITE_TONECOS_COMMERCIAL_MVP=true`, `VITE_CATALOG_QUOTES_ENABLED=true`, `VITE_PUBLIC_CATALOG_MVP=false`, `VITE_PREVIEW_READ_ONLY=false`. Supabase TONART `icmtmaakjucmuzxnofkd` ativo; `profiles` e `quotes` existentes com RLS; RPC `submit_catalog_quote_request` instalada. Isto **não prova envio/recebimento E2E com usuário real**.
- **Minha Conta:** cadastro/login, confirmação conforme Auth, recuperação de senha, edição de nome/telefone, logout e link para Meus Orçamentos sob flag. **Não está 100% completa:** seções antigas de pagamentos/notificações/suporte/assinaturas aparecem como `Indisponível`; Coins e pagamentos sem GO. Separar MVP mínimo de orçamento de portal comercial completo.
- **Orçamentos:** UI cliente, tabela única `quotes`, RLS, RPC autenticada, área admin para valor/status e histórico cliente. **Próxima ação funcional prioritária:** E2E real de cadastro/confirmar/login/recuperar → selecionar modelo → enviar orçamento com dados válidos → administração autorizada responder → cliente verificar status/valor; incluir testes negativos de RBAC. Não criar tabela, endpoint, login ou portal paralelos.
- **GO público pendente:** QA visual desktop/mobile e formulários em produção, revisão jurídica/LGPD, licenças/créditos e identificação do operador, proteção das **264 mídias SpecialSTL** sem desbloqueio presumido, autorização expressa para indexação. Não afirmar checkout/assinaturas/pagamentos operacionais.

**NEXT_ACTION:** validar jornada autenticada cliente/admin sem usar dados pessoais ou cadastros reais como fixtures; corrigir falhas no owner existente e cumprir gates proporcionais. **DO_NOT_REPEAT:** não criar outro SSOT, Writer, banco, Worker, cache, doc de status, workflow ou build desnecessário; não consultar/varrer D1/R2 para medir custo. Os checkpoints antigos abaixo são evidências datadas e **não prevalecem** sobre este estado e código atual.


## Checkpoint 09/11 — catálogo visual em pré-lançamento no domínio oficial

- **Marco registrado:** publicação manual no projeto Vercel existente `tonart-studio-public`, deployment `dpl_HF9PbdGxtke3cdg981yhFEauZP2B` com estado `READY`, código `0d7cc5dd957215672c328187215035fb162c7322`, no domínio `tonartstudio.com.br`. Trata-se de **pré-lançamento somente leitura e noindex**, não de autorização comercial, indexação ou merge da PR #4 Draft. Este checkpoint reconcilia o README com a publicação já registrada na PR; não constitui nova inspeção visual independente.
- **Mídias:** capas e galerias comuns devem continuar visíveis; somente os 264 modelos SpecialSTL identificados permanecem em quarentena, com zero substituições aprovadas. Não transformar `approved: []` em bloqueio geral.
- **Pendências reais:** QA visual independente da versão publicada em desktop/mobile, navegação e imagens; revisão editorial/licenças, termos e identidade; autorização expressa antes de lançamento/indexação. CI verde e deployment READY não substituem esses gates.
- **NEXT_ACTION:** inspecionar a versão oficial publicada, corrigir apenas defeitos funcionais comprovados na mesma branch/PR, validar proporcionalmente e manter noindex. **DO_NOT_REPEAT:** não republicar por documentação, não abrir outra PR, não reexecutar scans D1/R2, não alterar Worker, Washington, Cloudflare Access ou produção sem necessidade.

---

## Checkpoint 09/11 — capas restauradas na prévia; somente SpecialSTL oculto

- **Diretriz atual:** mostrar renders comuns do catálogo digital; ocultar apenas mídia/modelos SpecialSTL identificados. `approved: []` significa zero exceções à quarentena, e não embargo geral. `AGENTS.md` foi atualizado no commit `78baff6c`.
- **Causa reproduzida:** Worker remoto entregava imagens completas como HTTP 206, e o proxy as rejeitava com `Invalid upstream media range`. Objeto exato `media/mdl_3c8929959474a04da98a/img_0fa186c2cbfafdcf353f/card.webp` existe no R2 (WebP válido, 21668 bytes), verificado por leitura pontual sem consultas D1.
- **Correção:** `functions/catalogo-api/[[path]].js` normaliza exclusivamente resposta 206 sem solicitação Range cujo `Content-Range` comprove o arquivo inteiro para 200, removendo o cabeçalho parcial; demais respostas malformadas seguem bloqueadas. Testes em `scripts/cloudflare/catalog-pages-proxy.test.mjs`, código commit `fc1c2f5c`. Quality Gate #1200 completed/success (job offline; demais jobs skipped).
- **Prévia e prova visual:** Vercel `dpl_AQ6UcQQs3d1of6NCEAEg2XnH2xXA`, https://tonart-studio-public-clymfo79v-jogo-brasils-projects.vercel.app/modelos, READY. A mesma imagem antes quebrada abriu; a grade mostra capas em desktop e mobile. Um URL de modelo SpecialSTL identificado segue retornando `Imagem em revisão`.
- **Estado e próximo passo:** a produção `tonartstudio.com.br` foi posteriormente atualizada manualmente para o deployment `dpl_HF9PbdGxtke3cdg981yhFEauZP2B` (READY), conforme checkpoint mais recente acima; sem merge ou mutação D1/R2. Completar `release:verify`, revisão de licenças e gates de QA/autorizações antes de publicar o SHA validado no projeto Vercel existente. **DO_NOT_REPEAT:** não reimportar, não varrer D1/R2, não criar outra PR/proxy, não ocultar renders normais.

---
## MVP visual — primeira seleção de renders e autorização (08/11/2026)

- **Regra SSOT:** o MVP exige renders digitais com imagem utilizável e direitos registrados. SpecialSTL permanece oculto. O registro de liberação está em `src/services/catalog/public-render-approvals.json` (ainda `approved: []`), validado por `scripts/security/catalog-public-media-approval-policy.mjs` e aplicado no proxy Vercel; chaves não registradas não atravessam `/media`. Não basta desativar uma flag no frontend.
- **Candidatos localizados no Google Drive, ainda NÃO aprovados:**
  - `OK - 10H [1]/10h-nier.png` (Drive `1SUG7jPnSBzSF1uzoIDLyUaLnUn8m4yDj`);
  - `OK - 2B [3]/2b-4-nier.jpg`, `2b-2-nier.jpg`, `2b-5-nier.webp` (Drive `1rVHI-hDBeeihxxY1EMx5HzAqyNpKkjqC`, `134sQSQDKNxd_Y1iiEzysfaMGR1UisbDL`, `1Tyw83dj_NRnRJ5N3-czOwn3konoLbOvR`);
  - `OK - A Máscara [1]/a-mascara.jpg` (Drive `1YpQR0ST316ioSZ0IGBoJbnd1vtp-47U7`).
- A pasta chamada `OK` **não comprova licença**. Nenhum candidato foi associado com segurança ao ID/chave exatos no Worker, nem possui prova de direitos de publicação validada; **não inserir em `approved` sem esse confronto**. Isso evita liberar renders de variantes diferentes ou origem desconhecida.
- **Inspeção visual real, sem republicação (08/11):** cinco imagens do Drive foram abertas e vinculadas a SHA-256 para evitar trocas acidentais. Créditos/marcas visíveis, que NÃO equivalem a licença para a TONART:
  - `10h-nier.png`: **Neko Figurines / Patreon**; SHA-256 `3de55f306e33c23171e71d391e6855806c17eeba05c933dda96b4514af4bef7d`;
  - `2b-4-nier.jpg` (Drive MIME WebP): **Chuya Factory**; SHA-256 `04367cb9b8927d3985b3d538ec98ef26654f905ce7164a65928468c360e0569f`;
  - `2b-2-nier.jpg` (Drive MIME WebP): **Bulkamancer / Patreon; crédito visível Guest Artist Alex Gray**; SHA-256 `5a7790257483f67adf20b588d584d02a4df01396dd70f17aa242db34c1fc4d83`;
  - `2b-5-nier.webp`: **Tanuki Figures / Patreon**; SHA-256 `17fb5b4ff02228f7080e71795600f49a663020d04ef8ae261c6baf72f0681e05`;
  - `a-mascara.jpg`: **Malix3Design**, marca repetida no próprio render; SHA-256 `1ee0c71addf5abf8e259ebe1fd89b5b0fb8f2d0f00b50ff214c152d7468c8319`.
- **Resultado:** nenhuma das cinco apresenta a marca SpecialSTL de forma visível, mas todas têm créditos/marcas de outras origens. Não apagar marcas, não declarar autoria/redistribuição permitida sem prova e não liberar essas mídias por serem arquivos na conta Drive.

- **NEXT_ACTION:** comparar esses cinco arquivos com os registros já capturados em snapshots offline (sem nova varredura D1/R2), identificar escultor/origem, obter evidência de permissão e confirmar ID, slug e chave exata; só então preencher o manifesto, testar frontend e rotas diretas de mídia e liberar a primeira vitrine. Preservar PR #4 Draft, Git auto deploy OFF e `noindex` até autorização de lançamento.

---



## MVP — Home recente após quarentena (08/11/2026)

- **MVP frontend, PR #4 Draft:** `src/pages/LandingPage.tsx` agora usa **uma** leitura indexada `GET api/recent?limit=24` e apresenta apenas os **seis primeiros modelos elegíveis** depois da quarentena. Evita a Home com menos destaques/“sem novidades” falsos quando a API retorna modelos recentes bloqueados. Não varre D1, não anda cursores e não altera backend. Commit `eab4e1a`.
- **Teste direcionado:** `src/services/catalog/public-catalog-gateway.test.ts` simula oito capas em quarentena seguidas de oito modelos elegíveis; comprova seis destaques válidos e **uma só requisição**. Commit `af9c12b`. [GitHub Actions #42446072181](https://github.com/tonecosstudio/tonecosstudio/actions/runs/42446072181): **COMPLETED/SUCCESS** no SHA `af9c12b7bd869238d910e88e279626353edbe385`.
- **Uma prévia manual protegida:** [Home](https://562bd713.tonecosstudio.pages.dev/) e [Modelos](https://562bd713.tonecosstudio.pages.dev/modelos), Cloudflare deployment `562bd713-b95f-443b-b192-3b3a2dcc357a` no SHA `af9c12b`; **BUILD SUCCESS + DEPLOY SUCCESS**, ambiente `preview`. Cloudflare Access cobre `*.tonecosstudio.pages.dev`; produção automática OFF e preview automático `none`.
- **QA visual ainda PENDENTE:** não existe sessão autenticada confirmada para homologar o SPA desktop/mobile. Sucesso de build/CI e tela de login Access não atestam renderização, navegação ou imagens.
- **NEXT_ACTION:** autenticar legitimamente no Cloudflare Access e revisar **essa nova URL**: Home (até seis referências elegíveis), Universo, grade/paginação, busca/filtros, ficha/galeria, bloqueios de imagem e mobile. Corrigir somente defeito real no frontend da mesma PR. A curadoria e a revisão jurídica/licenças continuam pendentes para o GO público. Não repetir lotes SpecialSTL, Worker Washington, D1/R2, scans, Vercel ou builds por documentação. **NO-GO público**.

---

## MVP — ficha de modelo em revisão (08/11/2026)

- **Problema real do frontend corrigido:** quando um dos 264 IDs em quarentena era acessado por link direto, a ficha apresentava falha genérica e botão de retry inútil. `src/pages/catalog/CanonicalModelDetails.tsx` agora distingue `catalog_model_media_restricted`, exibe “Modelo em revisão de imagem” e não oferece retry/galeria para a restrição; outras falhas ainda permitem retry. Código `4d0ce1c`; regressão direcionada `567ece7`.
- **CI:** [Quality Gate #42443686889](https://github.com/tonecosstudio/tonecosstudio/actions/runs/42443686889) **COMPLETED/SUCCESS** no SHA `567ece7f4a65a30931229cf46e35ff52b39386c2`; testes do MVP/Worker offline sem deploy ou acesso D1/R2.
- **Pages manual, preview protegido:** [https://bce9161e.tonecosstudio.pages.dev/modelos](https://bce9161e.tonecosstudio.pages.dev/modelos), deployment `bce9161e-4f17-4743-af4d-c7be82813627`, SHA `567ece7`, **BUILD SUCCESS + DEPLOY SUCCESS**. `production_deployments_enabled=false`, `preview_deployment_setting=none` e Cloudflare Access intactos. Único deployment manual para este SHA.
- **Quarentena conferida no HEAD anterior de dados `2b8d7cf`:** 264 IDs, 264 slugs e 264 chaves distintos; 33 registros com evidências de revisão Drive, zero autorizações verificadas, zero fotos substitutas aprovadas. Não repetir varredura nem abrir M5/Worker Washington.
- **QA visual pendente:** o Chrome autorizado ainda mostrava “Sign in — Cloudflare Access”; portanto não há prova de renderização SPA da nova prévia. Testar após login legítimo [ficha em revisão](https://bce9161e.tonecosstudio.pages.dev/modelos/street-fighter-zangief-02) (aviso, sem galeria/retry), [ficha liberada de referência](https://bce9161e.tonecosstudio.pages.dev/modelos/nier-10h-nier) e navegação desktop/mobile, busca/paginação/galeria.
- **NEXT_ACTION:** concluir QA autenticado da preview atual. Prosseguir somente com correções reais no frontend da mesma PR Draft; depois revisão legal/identidade, Vercel legado isolado e GO expresso antes de qualquer publicação pública. **NO-GO**.
- **DO_NOT_REPEAT:** não criar PR/branch nova, não rebuild por este checkpoint documental, não desabilitar Access, não tocar Worker, Washington, D1, R2, Vercel, DNS ou produção.

---



## MVP público — preview protegida validada em 07/11/2026

- **Branch única / PR #4 Draft:** último commit funcional homologado `e3c501a7f1b6e7863d9a50f44e4e2bea8935078c`. A correção anterior do guard de proveniência continua preservada.
- **CI no SHA:** [GitHub Actions #42432183093](https://github.com/tonecosstudio/tonecosstudio/actions/runs/42432183093) **COMPLETED/SUCCESS** (gate aplicável). Nenhuma promoção de Worker, D1 ou R2.
- **Cloudflare Pages PREVIEW MANUAL**, única execução criada nesta rodada: `116a1c6a-2e7b-4062-982c-04fef983df4b`, URL [Modelos — preview protegido](https://116a1c6a.tonecosstudio.pages.dev/modelos), SHA `e3c501a`, **BUILD SUCCESS + DEPLOY SUCCESS**. A publicação pública de produção segue desativada; `preview_deployment_setting=none`. O app Cloudflare Access `a38e89fd-3bce-4dc6-acdc-94a74a1bc49c` segue protegendo `*.tonecosstudio.pages.dev`.
- **Consistência offline do SSOT:** `specialstl-quarantine.json` tem 264 IDs, 264 slugs e 264 chaves de capa únicas; 0 duplicados, 0 substituições aprovadas, todos `pending_authorized_clean_photo`. A revisão prévia registra o fim da paginação pública em 2.575 modelos, sem necessidade de novo scan.
- **QA visual ainda PENDENTE:** ao abrir a prévia anterior no Chrome do Desktop autorizado, foi exibido “Sign in — Cloudflare Access”, não o SPA. Um build/deploy SUCCESS não substitui sessão autenticada e verificação visual no desktop/mobile.
- **NEXT_ACTION:** autenticar legitimamente no Access para revisar a **nova prévia** de SHA `e3c501a` em Home, Universo, /modelos, busca/filtros/paginação, ficha, galeria, imagens, deep links, responsividade, estados vazios/erro e Contato. Corrigir somente problema real do frontend na mesma PR. Após QA, manter revisão jurídica, rollback, Vercel legado e autorização explícita para qualquer lançamento. **NO-GO** público.
- **DO_NOT_REPEAT:** não percorrer novamente os 72 lotes de imagens/snapshots; não disparar builds por esta documentação, não alterar Worker/associação Washington, D1/R2, DNS, Vercel ou Cloudflare Access.

---
## SpecialSTL — 1.548 capas / 154 casos confirmados (07/11/2026)

- **Lotes 38–43, somente leitura:** 216 novos modelos (#1.333–1.548) obtidos em seis GETs públicos de 36 com cursor salvo, 216 capas novas cacheadas e 18 folhas de contato. Checados os 216 IDs únicos nos novos snapshots, mais 1.332 únicos já verificados; nenhuma consulta direta D1/R2, nenhuma alteração no Worker/Pages/produção.
- **33 marcas confirmadas na própria imagem ampliada:** Ken (2), Kimberly, King, Kintaro, Kitana, Kitty Pryde, Krang, Kratos (10), Kula Diamond, Kung Lao, Lara Croft (2), Gogeta, Goku (2), Vegeta, Legolas, Leon (2), Lily, Liu Kang (2), Logan. Em todas há repetição `STL by Specialstl.com` e logotipo roxo; IDs e chaves exatas da capa confrontados com os snapshots. O SSOT `src/services/catalog/specialstl-quarantine.json` passou de 121 para **154 casos**.
- **Substituição sem intervenção na obra:** preservar arquivo original e modelo, manter `replacement.status=pending_authorized_clean_photo` e `approvedImageStorageKey=null`; somente foto real com direitos de publicação e da MESMA escultura pode liberar a apresentação. Logotipos de escultores/Patreon/estúdios distintos não foram classificados como SpecialSTL; a ausência da marca nas outras 1.394 capas não atesta licença. Galerias além das capas não foram revistas.
- **NEXT_ACTION:** rodar testes dinâmicos existentes, atualizar prancha offline consolidada para 1.548/43 lotes e continuar pelo cursor de `catalog-snapshot-lote43.json`, após Lucy (`mdl_3adc179ddcf21c94b22f`), próximo modelo **1.549**. Manter a PR #4 Draft, nenhuma nova PR ou workflow, lançamento público **NO-GO**.

---


## SpecialSTL — 1.332 capas, 121 casos confirmados (07/11/2026)

- **Lotes 32–37 concluídos em rodada única:** 216 novos modelos (1.117 a 1.332) recuperados em seis GETs públicos paginados com cursor persistido; 216 capas novas cacheadas e 18 folhas de contato. Script validou **1.332 IDs únicos** incluindo lotes anteriores. Nenhum acesso direto D1/R2 ou atualização do Worker, Pages ou produção.
- **31 novas marcas SpecialSTL comprovadas em fotografias ampliadas:** Hobbiton bonsai, Homem-Aranha contra Doutor Octopus, Indiana Jones, Iori Yagami, Jackalman, Jade, Jax, Jean Grey (4), Jessie, Jill Valentine, Jinx, Jiraiya, Jiren, Johnny Cage, JP, Juggernaut (3, inclusive com Colossus), Juri (8) e Kabal (2). Todas as 31 capas exibem repetidamente `STL by Specialstl.com` e logotipo roxo, verificadas por ID, slug, `card.webp` e image_count=1 nos snapshots públicos. `src/services/catalog/specialstl-quarantine.json` agora tem **121 registros**.
- **Quarentena temporária e reposição legal:** preservar cada modelo e arquivo original, ocultar somente na apresentação da PR Draft; `replacement.status=pending_authorized_clean_photo` sem imagem aprovada. Reativar apenas com foto real, autorizada e sem marca de redistribuição da **mesma escultura/variante**, mantendo crédito autoral original. Logos de estúdios, Patreon e outros criadores **não** foram confundidos com SpecialSTL. As outras 1.211 capas não foram certificadas como licenciadas ou limpas; galerias completas não foram inspecionadas.
- **NEXT_ACTION:** validar a suíte dinâmica existente, atualizar prancha única offline para 1.332/37 lotes, retomar via `catalog-snapshot-lote37.json` após Kamen Rider Black `mdl_e3fad3ac20db0c5bb933`, próximo modelo **1.333**. Nada de PR, workflow ou deploy adicional. **NO-GO** público.

---


## SpecialSTL — 1.116 capas revisadas, 90 confirmadas (07/11/2026)

- **Lotes 29–31:** 108 capas reais dos modelos 1.009–1.116 recuperadas por três GETs públicos paginados, 108 fotos armazenadas uma única vez em cache no Desktop; verificados **1.116 IDs únicos**, 31 snapshots de 36. Nove folhas de contato novas, inspeção de capa sem acesso direto D1/R2, Worker ou produção.
- **8 provas visuais novas, em imagem original ampliada:** Gollum, Goro (02, 03 e 06), Gouken, Havik, Hermione Granger (01 e 02), todos com texto repetido `STL by Specialstl.com` e logotipo roxo SpecialSTL; IDs, slugs, caminhos `card.webp`, `image_count=1` conferidos contra snapshots de listagem. Total: **90 entradas** em `specialstl-quarantine.json`, com `pending_authorized_clean_photo`, sem reposição autorizada aprovada e sem excluir nenhum registro original.
- **Distinção de autoria:** Guts #1.075 `mdl_97c75af1848b42f8e98f` apresenta marca do escultor `Cairos Sculpture Co. Digital Sculpting`, **não** a assinatura Specialstl.com; foi excluído dos novos bloqueios. Outros 1.026 modelos não estão certificados como imagens licenciadas/limpas só por não conterem essa marca na capa. Galerias além das capas não foram inspecionadas.
- **Próximo passo:** testar a PR Draft, atualizar prancha offline única do Desktop para 1.116/31 lotes, continuar pelo `catalog-snapshot-lote31.json` após `Hinata` (modelo #1.116). Fotos para reposição devem representar a MESMA escultura, reais e com direitos de exibição, sem apagar marcas de terceiros. Site público **NO-GO**.

---


## SpecialSTL — 1.008 capas revisadas / 82 casos confirmados (07/11/2026)

- **Lotes 26–28 concluídos:** modelos 901–1.008, três consultas GET paginadas de 36 itens à API pública e 108 imagens originais salvas em cache. Verificados **1.008 IDs distintos** nos 28 snapshots, sem repetir os anteriores. Nove folhas de contato novas, inspeção somente das capas; sem acesso direto D1/R2, mutação do Worker ou produção.
- **Apenas uma nova imagem com prova visual direta:** `Gohan e Piccolo` (`mdl_8537ae259a51875e9cd0`, modelo #929) exibiu repetidamente `STL by Specialstl.com` e logotipo roxo SpecialSTL na foto original ampliada. Chave exata e image_count=1 conferidos no snapshot. Outras 107 capas não foram adicionadas à quarentena; logos legítimos dos artistas e Patreon continuam preservados. Isso **não** atesta a licença das outras fotos.
- **SSOT:** `src/services/catalog/specialstl-quarantine.json` agora tem **82 IDs confirmados**, todos `pending_authorized_clean_photo`; nenhuma foto limpa aprovada, nenhuma exclusão de modelo ou edição da fotografia original. Reposição somente por foto REAL da MESMA escultura/variante com direitos de exibição, preservando créditos do criador.
- **NEXT_ACTION:** atualizar a prancha offline única no Desktop para 1.008/28 lotes, confirmar testes e CI existentes, e retomar pelo `catalog-snapshot-lote28.json`, após `Goku e Vegeta` (`mdl_2144b1cdb900cc99db1a`), posição **1.009**. Prancha para curadoria interna, sem deploy no site. Produção pública **NO-GO**.

---


## SpecialSTL — 900 capas, 81 casos visualmente confirmados (07/11/2026)

- **Lotes 23–25 concluídos:** 108 novas capas reais (modelos 793–900) obtidas da API pública em 3 consultas GET de 36, baixadas uma única vez para cache local e examinadas em nove folhas de contato. **900 IDs únicos**, sem repetição. Zero acesso direto/mutação D1/R2, Worker, produção.
- **7 novas provas visuais** por inspeção ampliada da própria capa: Freeza (Namek busto, Mecha busto, esfera de energia), Galadriel, Gambit (cartas/energia rosa), Gandalf 02 e Gimli. Marca repetida `STL by Specialstl.com` e logotipo roxo SpecialSTL, exatamente ligados aos IDs, slugs, `card.webp` e image_count=1 do snapshot. `specialstl-quarantine.json` atualizado de 74 para **81 modelos**.
- **Regra de reposição, não exclusão:** cada um dos 81 segue `pending_authorized_clean_photo`, sem imagem substituta aprovada. Preservar dados/foto original, recuperar só após foto real e autorizada da MESMA escultura e QA. Créditos de escultores, Patreon e logos de outros estúdios não foram usados para bloqueio. Os outros 819 registros não foram declarados licenciados/limpos por mera ausência dessa marca; somente capas, não galerias, foram inspecionadas.
- **NEXT_ACTION:** validar CI dinâmico já existente, consolidar prancha offline única de 900/25 lotes e continuar pelo `nextCursor` em `catalog-snapshot-lote25.json` após Gogeta `mdl_72305314238b9a2c5d1a`, posição 901. Sem novos PRs/workflows, Cloudflare Access e produção inalterados. **NO-GO** público.

---


## SpecialSTL — 792 capas, 74 casos confirmados (07/11/2026)

- **Lotes 20–22 reais e paginados:** 108 fotos de modelos 685–792 recuperadas em apenas três consultas GET limitadas da API pública, armazenadas em cache local. A ferramenta confirmou **792 IDs únicos**, sem reprocessar os 684 anteriores; 9 folhas de contato adicionais, três por lote, conferidas visualmente.
- **11 novos bloqueios com prova direta:** Doutor Octopus, Electro, Ellen Ripley (03, 01 e 02), Emma Frost (traje branco e Força Fênix), Escorpião e Exodia (sobre rochas, em pé, com espada). As fotos originais foram examinadas em ampliação: texto repetido `STL by Specialstl.com` e logotipo roxo SpecialSTL; IDs, slugs e chaves de capa conferidos no snapshot. Cada registro público informou `image_count=1`. A quarentena canônica passa de 63 a **74 modelos**, todos pendentes de nova fotografia real, autorizada, sem marca SpecialSTL, **da mesma escultura**.
- **Créditos legítimos preservados:** logotipos de criadores e Patreon NÃO foram tratados como marca de redistribuição. Outros 718 modelos não estão atestados como licenciados/limpos só por ausência dessa marca; revisão compreendeu somente as capas.
- **NEXT_ACTION:** validar CI da mesma PR #4, atualizar prancha offline única para 792 modelos/22 lotes, continuar do cursor salvo em `catalog-snapshot-lote22.json` (após Exodia `mdl_884e34dd9f55dbeb094d`; próxima posição 793). Não consultar D1/R2 em massa, não modificar Worker/prod/Cloudflare Access. **Publicação NO-GO**.

---


## SpecialSTL — 684 capas e 63 casos confirmados (07/11/2026)

- **Lotes 17–19 concluídos:** 108 fotos reais de modelos 577–684 em três páginas GET de 36 da API pública, com cache reutilizável e folhas de contato por grupos de 12. Validados **684 IDs únicos**, sem repetição dos lotes anteriores; sem varredura ou mutação D1/R2.
- **10 casos visuais adicionais, prova nas próprias fotografias ampliadas:** Crimson Viper, Cyrax, D'Vorah, Deadpool, Dentes de Sabre, Destruidor (01 e Super), Dexter Morgan, Dhalsim (normal e chibi). Cada imagem traz o texto repetido `STL by Specialstl.com` e o logotipo roxo SpecialSTL. IDs, slugs, chaves exatas `card.webp` e `image_count=1` confrontados com snapshot público paginado. A quarentena canônica em `src/services/catalog/specialstl-quarantine.json` passa a **63 modelos**, todos com `replacement.status=pending_authorized_clean_photo`, nenhuma foto substituta aprovada.
- **Diretriz de substituição, não exclusão:** preservar registros e imagens originais; ocultar frontend Draft até foto real autorizada da MESMA escultura/variante sem marca SpecialSTL e mantendo créditos legítimos do escultor. Não cortar/apagar watermark. As outras 621 capas não estão certificadas como livres de problemas ou licenciadas; galerias além das capas não foram revisadas.
- **NEXT_ACTION:** validar o CI existente, atualizar arquivo offline único do Desktop para 684/19 lotes, continuar pelo cursor `catalog-snapshot-lote19.json` após DigiDestined Diorama `mdl_9813b8c1eb0a33cdf7f4` (modelo 685); não publicar site nem alterar Worker. **NO-GO** público.

---


## SpecialSTL — 576 capas examinadas, 53 confirmações visuais (07/11/2026)

- **Lotes 14, 15 e 16:** 108 capas de modelos 469–576 recuperadas em três consultas GET paginadas limitadas à API pública e armazenadas no cache local uma única vez. A verificação de IDs sobre os 16 snapshots comprovou **576 IDs únicos**. Foram geradas nove folhas de contato reais (12 capas cada), sem D1/R2 direto ou alterações de produção.
- **11 novas imagens confirmadas visualmente, não apenas por texto de metadados:** Chun-Li/Chun Li 6 variantes (base, 04, 17, 03, 02, 15), Ciclope com disparo óptico, Claire Redfield (01), Cloud (01 e 02) e Colossus Força Fênix. Todas foram reexaminadas ampliadas, com `STL by Specialstl.com` repetido e logotipo SpecialSTL visível; ID, slug, `card.webp` e `image_count=1` verificados contra snapshots paginados. SSOT `src/services/catalog/specialstl-quarantine.json` agora totaliza **53 confirmações**, todas com `replacement.status=pending_authorized_clean_photo` e nenhuma substituição aprovada.
- **Política de recuperação:** os modelos seguem preservados, só ficam ocultos no frontend desta PR Draft. Exigir fotografia real da MESMA escultura/variante sem marca SpecialSTL e com autorização de exibição, respeitando créditos de modeladores. Não apagar, recortar ou alterar marcas na imagem original. Ausência da marca nas demais capas não comprova licença nem valida galerias adicionais.
- **NEXT_ACTION:** verificar resultado da suíte dinâmica do gateway (todos IDs), atualizar a prancha única offline para 576/16 lotes, prosseguir do cursor salvo em `catalog-snapshot-lote16.json` após Coringa `mdl_c6a96b072f4007bfd229`, sem nova infraestrutura nem novos PRs. **Produção NO-GO.**

---


## SpecialSTL — 468 capas, 42 marcas confirmadas (07/11/2026)

- **Lotes 11–13:** revisão visual de 108 capas (modelos 361 a 468) recuperadas uma vez pela API pública usando o cursor salvo do lote 10; **468 IDs únicos** acumulados. Contato real com 12 imagens por folha; fotos candidatas foram abertas em 576 px de altura, com logo roxo e texto repetido `STL by Specialstl.com` inspecionados diretamente. Créditos autorais legítimos não são prova de redistribuição.
- **13 novas confirmações:** Cammy (10 variantes exatas: 14, 11, 09, 12, 10, 06, 13, 03, 05, 08), Casey Jones 02 e Cheetara (02 e 01). Cada registro tem ID, slug e coverStorageKey provenientes do snapshot paginado e `image_count=1` na listagem. Somadas às 29 anteriores, **42 quarentenas** em `src/services/catalog/specialstl-quarantine.json`, todas pendentes de foto limpa autorizada da **mesma escultura**, sem excluir modelo ou apagar foto original.
- **CI e controle:** usar a suíte dinâmica já existente do gateway para validar todos os registros, sem novas workflows/PRs. A ocultação permanece exclusivamente na PR #4 Draft, produção pública e D1/R2 não alterados. Os outros 426 modelos não são considerados licenciados ou definitivamente limpos por não exibirem essa marca na capa.
- **Próximo cursor** registrado em `catalog-snapshot-lote13.json`, após Cheetara `mdl_f1ca4cbefa1cac173be2`. Atualizar a prancha offline do Desktop para 468/13 lotes, preservando histórico e sem rede ao abrir. Lançamento público **NO-GO**.

---


## SpecialSTL — 360 capas revisadas; 29 confirmadas (07/11/2026)

- **Lotes 08–10 concluídos com cursor persistido:** 108 novas capas de modelos 253–360 via três GETs limitados da API pública de leitura; 360 IDs distintos nos dez lotes, fotografias reais mantidas em cache no Desktop, folhas de contato com 12 miniaturas para análise visual. Nenhuma varredura D1/R2 e nenhuma mutação do Worker ou de produção.
- **9 novos casos visualmente comprovados:** Besta Alada, Bison, Blanka (2), Blue Mary (2), Bolg, Cable e Cable com Deadpool. Todas as nove capas foram reabertas no tamanho original; mostram assinatura repetida `STL by Specialstl.com` e logotipo roxo SpecialSTL. ID, slug e cover_storage_key exatos foram conferidos no inventário da API. Somando com os 20 anteriores, `src/services/catalog/specialstl-quarantine.json` contém agora **29 IDs confirmados**.
- **Reposição, não apagamento:** cada entrada tem `replacement.status=pending_authorized_clean_photo` e `approvedImageStorageKey=null`; um novo arquivo somente será aceito quando for foto REAL, autorizada e sem marca de redistribuição da MESMA escultura/variante, preservando o crédito ao escultor. O gate frontend continua ocultando o modelo inteiro até a reposição e QA; não remover marca por recorte/edição da foto antiga.
- **Regressão existente:** `public-catalog-gateway.test.ts` percorre dinamicamente todos os IDs em `confirmed`; verificar CI de integração da branch antes de qualquer merge. Ausência da marca nas 331 demais capas não atesta proveniência/uso licenciado, e as galerias além da capa não foram examinadas.
- **NEXT_ACTION:** atualizar a prancha offline principal para 360 capas/10 lotes, inspecionar o cursor preservado para modelo 361 e continuar revisão incremental, com ênfase na substituição legal das fotos. Produção e Cloudflare Access permanecem intactos. Publicação pública **NO-GO**.

---


## SpecialSTL — 252 capas examinadas; 20 bloqueios comprovados (07/11/2026)

- **Execução:** pranchas reais 05–07 (108 capas novas) revisadas visualmente via cache local no desktop; 7 lotes de 36, **252 IDs únicos**, usando somente 3 consultas paginadas públicas novas ao catálogo e 108 downloads de capas, sem varredura direta D1/R2.
- **9 fotos novas com prova direta:** Ashley Graham; Athena Asamiya (2 variantes); Bahamut; Balrog 01; Baraka (3 variantes); Barbárvore 01. Cada capa foi reaberta em resolução original e mostra a marca repetida `STL by Specialstl.com` **mais** logotipo roxo SpecialSTL. ID, slug e storage key foram confrontados com snapshots paginados. Somadas às 11 anteriores, **20 quarentenas confirmadas** no JSON SSOT. Todas as 9 novas entradas têm `replacement.status=pending_authorized_clean_photo` e `approvedImageStorageKey=null`; nenhum modelo foi apagado.
- **Distinção rigorosa:** Batman `mdl_8e948f8b4e6e619bfa05` possui texto de base `SPECIAL STLS` em marca azul/cinza, mas **não** a marca repetida `Specialstl.com` usada como prova; **não entrou** na quarentena. Exige confirmação de identidade/proveniência específica antes de qualquer bloqueio. Logos originais dos modeladores permanecem visíveis.
- **Regressão:** a suíte percorre todos os registros atualmente em `confirmed` para validar listas, recentes, detalhe, URLs de mídia e status de reposição. Removeu-se a exigência artificial de mínimo 11 IDs, que impediria retirar modelos legitimamente recuperados depois que suas fotos limpas fossem homologadas.
- **Permanência:** bloqueio no frontend da PR Draft, não no Worker/produção. As outras 232 capas revisadas não são atestadas limpas/licenciadas por mera ausência da marca; galerias completas não foram examinadas. Próximo cursor armazenado para retomar no modelo 253; manter revisão em lotes e obter substituição autorizada da MESMA escultura antes de reativar cada modelo. **NO-GO** público.

---


## SpecialSTL — 144 capas examinadas; 11 casos comprovados (07/11/2026)

- **Revisão real de quatro lotes paginados, sem repetição:** 144 capas públicas baixadas uma vez e analisadas em folhas de contato reais, com cache reutilizável no Desktop. Corrigida a numeração: Lote 01 (10H–Aiolos), 02 (Aira–Alleria), 03 (Aloy–Anjo) e 04 (Anjo–Aranhaverso).
- **11 imagens visualmente confirmadas SpecialSTL:** Ace Duck (1), Ada Wong/Adawong (2), Akuma (1), Androide 8 (1), Anjo (2), April O'Neil (1), Apu (1), Aragorn (2). Repetem "STL by Specialstl.com" e logo SpecialSTL. Todas as oito adições desta rodada têm `image_count=1` na listagem pública; não há segunda capa cadastrada nesses modelos. Demais capas não foram declaradas limpas ou licenciadas por ausência dessa marca.
- **SSOT:** `src/services/catalog/specialstl-quarantine.json` contém todos os 11 IDs confirmados, chave exata e `replacement.status=pending_authorized_clean_photo`. Ocultação é provisória, preservando o registro, até haver foto REAL da MESMA escultura com direito de exibição; créditos de autores legítimos não são motivo de bloqueio. Uma regressão na suíte do gateway verifica listagem/recentes/detalhe/mídias para **cada ID** sem rede.
- **Preservação de quota:** somente consultas paginadas limitadas da API pública; nenhuma varredura D1/R2, mutação de Worker, produção ou publicação. Pranchas usadas são de revisão, não de fotos geradas ou editadas.
- **NEXT_ACTION:** revisar os itens marcados para encontrar fotos substitutas exatas e autorizadas; confirmar que cada troca da origem remova o SpecialSTL, fazer QA do SPA sob Access e só então liberar cada modelo. Site público **NO-GO**.

---



## SpecialSTL — substituição futura obrigatória, sem apagar o modelo (07/11/2026)

- **Identificação do caso confirmado:** Ace Duck, `mdl_ae8d28d2fa93b1367b0a`, segue oculto no frontend. Consulta GET pontual à ficha e galeria da API pública existente constatou `image_count=1`, `gallery_total=1`, `nextCursor=null`. A única imagem é a capa marcada; **não existe uma segunda imagem do mesmo modelo na galeria para trocar imediatamente**.
- **Estado SSOT de reposição:** `src/services/catalog/specialstl-quarantine.json` registra `replacement.status=pending_authorized_clean_photo`, sem imagem aprovada (`approvedImageStorageKey=null`), preservando ID, slug e storage key originais. Novos casos SpecialSTL confirmados em lotes recebem o mesmo estado pendente pelo script `propose-specialstl-quarantine.mjs`; nenhuma foto é aprovada ou publicada automaticamente.
- **Critério para substituir e recuperar o modelo:** verificar visualmente que a foto representa **a mesma escultura/variante real**, sem marca SpecialSTL, e comprovar permissão de exibição no site; preservar o crédito do modelador original. Depois de autorizado o novo arquivo, atualizar a referência canônica da capa/galeria pela via proprietária e retirar o ID da quarentena **somente após QA da nova foto**. Não recortar/apagar a marca da foto antiga, não trocar por outro modelo do mesmo personagem e não usar imagem de terceiros sem licença.
- **Pesquisa pontual externa:** foram encontrados Ace Duck de esculturas diferentes em marketplaces; não são substitutos compatíveis. Não executar compras, uploads, Worker, R2, D1 ou novo deployment nesta etapa.
- **NEXT_ACTION:** revisar as pranchas existentes para identificar novos casos SpecialSTL, confirmar IDs e acumular a fila de fotos substitutas; procurar/solicitar fotografia original autorizada da mesma escultura antes de retirar bloqueios. Publicação pública **NO-GO**.

---


## MVP — reconciliação de proveniência 07/11/2026

- **PR #4 draft, uma branch/repo:** correção funcional da falha recorrente do gate `catalog:monorepo:check` nos commits `7857af4` e `6654195`. Foram mantidos os 46 Git blobs originais de `staging.fileBlobs`; duas alterações locais posteriores (capa indexada da pasta em `worker/index.ts` e teste SQLite em `tools/test_worker_folder_counts.mjs`) receberam pins separados em `staging.localOverlays`. Nenhum hash de origem foi substituído, nenhuma verificação desabilitada.
- **CI comprovado:** GitHub Actions [#42378151846](https://github.com/tonecosstudio/tonecosstudio/actions/runs/42378151846) **COMPLETED/SUCCESS** no SHA `66541956ebca000411d5a63ad7826dc95a80e19b`: MVP/curadoria SpecialSTL, guard de blobs, TypeScript Worker, testes runtime, SQLite, Pages proxy e cutover bloqueado por desenho.
- **Cloudflare Pages:** os objetos automáticos dos commits `7857af4` e `6654195` estavam `queued/idle` em 07/11 (não são build nem deploy). **Não** criar preview por essa correção sem mudanças no frontend. Produção automática e preview automático continuam desativados; Access permanece protegido.
- **NEXT_ACTION:** priorizar QA legítimo do SPA no navegador autenticado (Home, Universo, /modelos, busca/filtros, ficha/galerias, capas, deep links e mobile), corrigindo somente bug real do frontend da PR #4. Uma sessão legítima do Cloudflare Access e uma preview de código frontend efetivamente concluída são pré-requisitos para aprovar QA visual. Se não disponíveis, não afirmar aprovação. Liberação pública **NO-GO**, sem alterar Worker, Washington, D1/R2, Vercel ou DNS.
- **DO_NOT_REPEAT:** não reabrir hashes já reconciliados, não rodar D1/R2, não gerar preview para commit documental nem tocar em M5/cutover.


## SpecialSTL — consolidação segura das decisões offline (07/11/2026)

- `scripts/catalog/propose-specialstl-quarantine.mjs` transforma o export do revisor em **um candidato de quarentena**, em lote, comparando cada ID, slug e chave de mídia com um snapshot local. `creator` e `uncertain` jamais entram como bloqueios; fotos com chaves divergentes e IDs desconhecidos falham fechado.
- A proposta preserva IDs já confirmados (Ace Duck), impede conflito com créditos legítimos e **não altera** o SSOT, o Worker ou o site. O arquivo candidato exige revisão explícita antes de ser copiado para `src/services/catalog/specialstl-quarantine.json`. Testes offline no mesmo diretório.
- **Economia:** zero requests externos, nenhum refresh integral de D1/R2, sem novo cache ou duplicação. Um único arquivo candidato por conjunto de decisões revisadas evita commits/builds por imagem. Prosseguir quando houver snapshot e imagens locais disponibilizados.
- **NEXT_ACTION:** executar o revisor sobre um cache local real, registrar e exportar classificações, gerar candidato e confirmar a prova de cada novo ID antes de um único update da PR #4. Preview Access e lançamento público continuam **NO-GO**.

---


## SpecialSTL — curadoria local por lotes (06/11/2026)

- **Evolução rápida para milhares de fotos:** a lista SSOT de IDs com marca SpecialSTL comprovada sai do código do gateway para `src/services/catalog/specialstl-quarantine.json`. Continua contendo **somente Ace Duck**, confirmado pela fotografia enviada. O filtro de metadados continua intacto; logotipos de escultores não são motivo de bloqueio.
- **Revisão proporcional offline:** `scripts/catalog/build-specialstl-review-sheet.mjs` lê um snapshot **já local** e as imagens **já presentes no disco**, sem chamar Worker, D1 ou R2. Exibe somente 48 imagens por página (lazy load), aceita milhares de registros e exporta decisões por ID (SpecialSTL / crédito legítimo do modelador / inconclusivo); as decisões NÃO são aplicadas automaticamente ao site. Pode retomar revisões anteriores por `--decisions` sem reler fotos anteriores.
- **Regra de economia:** revisar primeiro por lotes offline, confirmar imagem e ID, acumular entradas no JSON e publicar uma única atualização após revisão + testes. Não gerar novos deployments por item, nem percorrer todo o R2/D1.
- **Limite real:** o snapshot local com mapeamento IDs → caminhos e as fotos já baixadas precisam existir para revisar milhares de imagens; não alegar classificação automática ou acervo inteiro limpo. O exemplo ace duck permanece a única confirmação visual registrada.
- **NEXT_ACTION:** alimentar o revisor com o cache local canônico e uma lista de modelos obtida por exportação autorizada e já existente; revisar lotes, incorporar apenas casos comprovados à lista JSON, executar teste proporcional e QA autenticado quando o Pages preview do SHA certo concluir. Produção pública **NO-GO**.

---



## Especial SpecialSTL — Ace Duck confirmado e ocultado no frontend (06/11/2026)

- **Foto real encontrada:** a capa de `Ace Duck` do universo `As Tartarugas Ninja` é a própria fotografia enviada pelo proprietário, com `STL by Specialstl.com` repetido e logotipo `SpecialSTL` na base. Identificação exata via GET público pontual, sem varredura: slug `as-tartarugas-ninja-ace-duck`, ID `mdl_ae8d28d2fa93b1367b0a`, chave `media/mdl_ae8d28d2fa93b1367b0a/img_1ccf2edb6736ca445dea/card.webp`.
- **Correção de produto:** `db611885` introduz quarentena pelo ID confirmado (listagem, recentes, ficha direta e todas as variantes `media/<id>/...`), sem excluir o modelo no Worker/D1/R2. `4ec44f1a` acrescenta teste do caso real; o crédito legítimo `Neko Figurines` de 10H continua visível. Não esconder outros criadores, não apagar créditos nem gerar imagem substituta.
- **Prova proporcional:** código exato do gateway no Node.js 24 físico, `SPECIALSTL_EXACT_MODEL_QA_SUCCESS`, 7/7 verificações PASS, exit 0; requisições simuladas em memória. GitHub Quality Gate `42329595017` falhou antes dos testes frontend em `Verify monorepo ownership and Git blobs` (desvio prévio do backend importado); não mexer no Worker/M5 para contornar.
- **Próxima ação:** identificar outros IDs com marca SpecialSTL somente com foto e modelo vinculados, sem varredura integral nem inferir que logotipo de modelador é marca de redistribuição. Verificar prévia Cloudflare Pages realmente concluída e QA autenticado. Sem lançamento público: **NO-GO**.

---


## Frontend — Política corrigida: crédito do modelador ≠ marca de redistribuição (06/11/2026)

- **Decisão expressa do proprietário:** logotipo do escultor/estúdio, assinatura do artista e crédito Patreon NÃO são automaticamente marcas de pirataria. Preservar essas imagens como referência do produto; ainda se exige revisão de direitos/licença quando aplicável. Marca de redistribuição não autorizada ou site terceiro de origem duvidosa deve ser avaliada separadamente, por evidência, sem afirmar ilícito por mera presença de nome.
- **Correção funcional:** `9f505854` removeu a quarentena genérica dos sete IDs de capa bloqueados em `ba1a0c39` por terem somente créditos/logotipos visíveis, e restaurou listagem, detalhes e imagens; `91fabce7` substituiu o teste que exigia o bloqueio por teste de preservação desses sete criadores. No exemplo "Abutre", a origem do padrão repetido não foi demonstrada como redistribuidor ilícito, portanto não é motivo suficiente para bloqueio.
- **Evidência corrigida:** 8 capas foram inspecionadas via uma única página pública e 8 URLs de imagem; 7 continham algum texto/logo de terceiros, mas isso NÃO significa 7 imagens de pirataria. A correção anterior confundia crédito autoral com redistribuição e foi revertida; o modelo A2 segue sem marca observada na capa, sem afirmar inspeção completa de sua galeria.
- **Regra de marca identificada:** o bloqueio por metadados/caminhos que contenham `SpecialSTL` permanece, por decisão de curadoria do exemplo enviado pelo proprietário. A imagem SpecialSTL enviada foi posteriormente identificada como Ace Duck; consultar o checkpoint mais recente acima. Não aplicar ocultação por suposições, e não retirar ou apagar créditos autorais das fotografias.
- **Validação física isolada:** Node.js 24 no desktop, fonte exata do gateway atualizado, `CREATOR_CREDIT_QA_SUCCESS`, 5/5 verificações PASS, código 0: sete autores preservados na listagem e recentes, mídia e fichas acessíveis, `SpecialSTL` bloqueado e cursor mantido. Dez GET simulados sem tráfego Worker/D1/R2 nesse teste. CI da PR e novo preview ainda precisam de validação independente.
- **NEXT_ACTION:** separar três classes na curadoria: crédito legítimo de autor (manter), marca de redistribuição especificamente identificada (bloquear o item exato após confirmação) e origem inconclusiva (revisar, sem rotular automaticamente). Não gerar imagens substitutas. Produção Pages/main, Worker, D1/R2, Access, DNS e Vercel inalterados. Publicação pública **NO-GO**.


---


## Frontend — quarentena de imagens identificáveis como SpecialSTL (06/11/2026)

- **Correção funcional na mesma PR #4:** `bf1a64a3` bloqueia URLs de mídia cujos caminhos mencionem SpecialSTL, retira modelos assim identificados das listagens públicas e de recentes e nega ficha por link direto. `58a9f387` distingue página esvaziada pela revisão de imagens da inexistência de resultados, preservando o cursor de navegação. Testes direcionados adicionados em `6c5e0595`.
- **Limite importante:** o frontend recebe texto/chaves, **não os pixels**. Uma marca d'água incorporada à fotografia com chave de armazenamento sem indicação da origem **não é detectada** por essa correção. A fotografia enviada pelo proprietário comprova a ocorrência, mas não identifica o slug/ID da ficha. Ainda NÃO foi homologada a ocultação de todos os modelos afetados; não declarar imagens limpas sem revisão real.
- **CI:** run `42318922449` falhou **antes** do teste frontend no gate de identidade dos blobs do backend importado (`tools/test_worker_folder_counts.mjs`, esperado `dc3e68e`, encontrado `45303c8`). Desvio não causado pelos arquivos frontend desta entrega; não modificar Worker/M5 para mascarar a falha. Execução atual posterior ainda deve ser verificada.
- **Sem publicação:** nenhuma modificação em Worker, D1, R2, conta/projeto Pages, Vercel, DNS ou `main`. A prévia do novo SHA ainda não foi comprovada; Cloudflare Access permanece obrigatório.
- **NEXT_ACTION:** identificar por evidência visual e mapeamento exato dos IDs/chaves as imagens cuja marca está somente nos pixels; registrar bloqueios específicos ou encontrar fotografias reais autorizadas do mesmo produto, sem inventar substitutos. Testar o frontend na PR após o gate aplicável e solicitar QA autenticado, mantendo publicação pública **NO-GO**.

---


## Backend — proteção de identidade e SHA da origem (05/11/2026)

- **Concluído na PR #4:** commit [`f3ce693`](https://github.com/tonecosstudio/tonecosstudio/commit/f3ce693ad094d2478bd45c52ff1671dfd2930b50) aprimorou o preflight M5 existente, que agora confirma via GitHub GET o ID/nome da origem e `refs/heads/main` contra os três pins do manifesto, bloqueando alterações não reconciliadas; foram adicionados testes offline de drift e ausência de comprovação.
- **Prova:** [Quality Gate #42102350407](https://github.com/tonecosstudio/tonecosstudio/actions/runs/42102350407) **completed/success** no mesmo SHA. `washingtonmsdj/catalogo/main` observado em `a4bf22bb8044a88f0c5d0b54b3e9d3fdead0b34c`; PR #266 ainda draft. Nenhuma consulta SQL, deploy, D1, R2, migração, mudança em Worker vivo ou Cloudflare.
- **Estado:** M5 continua **BLOCKED**, sem autorização, publicador antigo desativado ou rollback de produção comprovado. Manifesto de autorização e ambiente remoto permanecem intactos.
- **NEXT_ACTION:** na janela de cutover explicitamente autorizada, revalidar o workflow publicador da origem e bindings/versão Worker por metadados somente leitura; comprovar rollback e publicação única antes de mudar flags.
- **DO_NOT_REPEAT:** não rodar varreduras D1/R2, replicar backend, mudar Pages/Surface/frontend, criar branch/PR ou refazer suites offline aprovadas.


**Auditado em 05/11/2026 (Bahia). Estado: NO-GO para publicação pública.**

## Frontend — Universo responsivo em mobile estreito (05/11/2026)

- Em `src/pages/CatalogArcade.tsx`, a grade de categorias passa para uma coluna abaixo de 320 px e volta a duas colunas em 320 px; cresce para três em `sm` e quatro em `lg`. “Animes e Desenhos” continua em uma linha, com 14 px abaixo de 320 px e tamanho fluido de 10–14 px a partir de 320 px.
- O filtro mantém “Todos” fora da grade; “Ver todos os modelos” permanece como a única CTA de catálogo na navegação.
- QA visual autenticado em `/universo`, em 280, 320, 390 e 768 px (e visualização padrão de 810 px): sem overflow horizontal; grade de 1/2/2/3 colunas; título cabe no card em uma linha; zero cards “Todos” e uma CTA “Ver todos os modelos”.
- **Preview privado:** [abrir Universo](https://integration-tonecosstudio-ca.tonecosstudio.pages.dev/universo) — deployment `3dfb44e2-608d-4b1c-a48a-1f828b1d50fa`, source `ee4626adbd820ea4f9945cdc5798fb105888cb35`, ambiente `preview`, build e deploy SUCCESS.
- Build do Pages: `typecheck`, `catalog:mvp:test` (**18 suítes, 161 testes**) e `build` concluídos. A expectativa existente em `CatalogArcade.integration.test.tsx` foi atualizada para as classes responsivas.
- Cloudflare: `preview_deployment_setting=none` e produção desativada; preview criado manualmente. Worker, D1, R2 e DNS inalterados.
- PR #4 segue aberta e draft na branch `integration/tonecosstudio-canonical-20261101`.
- **NEXT_ACTION:** revisar `/universo/animes-desenhos/dragon-ball` em mobile e larguras maiores, incluindo pastas e miniaturas.
- **DO_NOT_REPEAT:** preservar o card “Todos” ausente, a CTA única e o título em uma linha; não publicar em produção, criar branch/PR adicional, alterar Worker/D1/R2/DNS ou reconstruir por mudança somente documental.

---

## Frontend — busca de franquias e responsividade pública (05/11/2026)

- **Correção:** `src/pages/CatalogArcade.tsx` usa o placeholder compacto “Buscar franquia (3+ letras)”. A regra mínima de três caracteres, o rótulo acessível e a busca não mudaram.
- **QA autenticado do preview:** `/universo/animes-desenhos` validada em 280, 320, 375, 414, 768 e 1024 px. Sem overflow horizontal; grade com 2, 3 e 4 colunas conforme a largura; os 24 cards permanecem dentro da página; campo e botão de busca medem 48 px e cabem na tela. Captura em 280 px confirmou o placeholder inteiro visível.
- **QA adicional:** `/sobre` conferida em 280, 320, 375, 414, 768, 1024, 1280 e 1920 px. Sem overflow, alvos interativos com pelo menos 44 px e grades refluindo de uma coluna no mobile para layouts maiores. FAQ expandida em 280 px sem ampliar a largura do documento.
- **Build do preview:** Cloudflare executou `npm run typecheck`, `npm run catalog:mvp:test` (18 suites, 161 testes) e `npm run build`; todos concluíram com sucesso no SHA `676ed90cdebadd2fa9eac8c363987ee879324abe`. A publicação continua em homologação; os gates de release seguem pendentes no estado NO-GO.
- **Preview privado:** https://integration-tonecosstudio-ca.tonecosstudio.pages.dev/universo/animes-desenhos — deployment `03b1f0ff-89cb-453a-bec3-d5d8fc5a8541`, ambiente `preview`, source SHA `676ed90cdebadd2fa9eac8c363987ee879324abe`, SUCCESS.
- **Cloudflare:** produção permanece desativada; `preview_deployment_setting=none` preservado. A prévia foi criada manualmente para a branch e segue protegida por Access. Worker, D1 e R2 não foram alterados.
- **PR/base/HEAD:** PR #4 permanece aberta e draft; base `main` em `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`; HEAD de código validado `676ed90cdebadd2fa9eac8c363987ee879324abe` na branch `integration/tonecosstudio-canonical-20261101`.
- **QA do catálogo:** `/modelos` conferido em 280, 320, 375, 414, 768, 1024, 1280 e 1920 px. Sem overflow; 36 cards; grade de duas colunas no mobile e progressão até seis no desktop; controles de busca/filtro e paginação permanecem dentro da viewport.
- **QA da ficha:** `/modelos/nier-10h-nier` validada nas mesmas larguras. A imagem carregou em `object-fit: contain`, permaneceu dentro do quadro e a página não teve overflow; controles mediram ao menos 44 px.
- **NEXT_ACTION:** revisar `/universo/animes-desenhos/dragon-ball` em mobile e larguras maiores, incluindo pastas e miniaturas.
- **DO_NOT_REPEAT:** manter o placeholder compacto e a validação de 3 caracteres; preservar alvos de toque de 44 px ou mais; não alterar `main`, produção, DNS, Worker, D1, R2 ou migrations; não reativar deploy automático nem reconstruir por mudança somente documental.

---

## Frontend — Contato público responsivo (05/11/2026)

- **Ajuste:** em `src/pages/PublicCatalogContact.tsx`, a seção agora se chama “Contato direto”, evitando repetir o título do hero; os links de e-mail/modelos têm hover e foco visível para navegação por teclado. Mantidos alvos de toque de 44 px.
- **QA no preview:** `/contato` validada em 280, 320, 390, 768, 1280 e 1920 px. Sem overflow horizontal; “Contato direto” permanece em uma linha; CTA de e-mail mede 143 × 44 px e cabe na tela; rodapé dentro da largura do documento.
- **Preview privado:** https://d693906d.tonecosstudio.pages.dev/contato — deployment `d693906d-bbac-4418-b533-72cf3a590bd8`, source SHA `e28c8dae7359ae9f82374814d201eb5ede878f61`, build e deploy Cloudflare Pages SUCCESS.
- **Quality Gate:** [#42063498322](https://github.com/tonecosstudio/tonecosstudio/actions/runs/42063498322) SUCCESS no mesmo commit.
- **Cloudflare:** `preview_deployment_setting=none`, include `*`, produção desativada e Access das prévias mantido. Worker/D1/R2 não foram alterados.
- **PR:** #4 permanece aberta e draft na branch `integration/tonecosstudio-canonical-20261101`.
- **NEXT_ACTION:** conferir `/sobre` no preview atual e continuar a revisão das rotas públicas.
- **DO_NOT_REPEAT:** preservar o shell público somente leitura; manter navegação por teclado visível, sem publicar em produção, criar outra PR ou alterar Worker/D1/R2.

---


## Frontend — página Universo responsiva (05/11/2026)

- **Correção confirmada:** a grade não renderiza a categoria “Todos”; há uma única CTA “Ver todos os modelos”. “Animes e Desenhos” permanece em uma linha e cabe dentro do card, inclusive em 280 px.
- **QA do preview atual:** rota `/universo` conferida em 280, 320, 390, 768, 1280 e 1920 px. Em todas: sem overflow horizontal, CTA visível, card “Todos” ausente e título em uma linha.
- **Prévia:** https://c50d9c50.tonecosstudio.pages.dev/universo — deployment `c50d9c50-aad2-4d06-bf02-40954937bbd1`, ambiente `preview`, source SHA `c3f8bda24808df7842ae43ce097c1658988821f4`. Build e deploy Cloudflare Pages SUCCESS.
- **Quality Gate:** [#42060730907](https://github.com/tonecosstudio/tonecosstudio/actions/runs/42060730907) SUCCESS no source SHA `c3f8bda24808df7842ae43ce097c1658988821f4`.
- **Base/HEAD:** PR #4 draft, branch `integration/tonecosstudio-canonical-20261101`; o commit atual inclui o ajuste responsivo do rodapé `fac80d6b5990931207f8f22af3c4abab32cccd98`.
- **NEXT_ACTION:** avançar para `/sobre` e conferir conteúdo, links e breakpoints no preview atual.
- **DO_NOT_REPEAT:** manter “Animes e Desenhos” em uma linha, não restaurar o card “Todos”, não criar nova branch/PR, não publicar em produção e não alterar Worker/D1/R2.

---

## Frontend — navegação do rodapé da Home em telas estreitas (05/11/2026)

- **Correção no código:** `src/pages/LandingPage.tsx` limita a navegação do rodapé à largura interna em mobile e permite que os quatro links quebrem em linhas; em `sm`, restaura a navegação em uma linha. Cada botão mantém alvo mínimo de 44 px.
- **Evidência antes do ajuste:** em 280 px, a navegação media 316 px, começava em x=-21 e terminava em x=295, recortando links; o documento escondia a rolagem e mascarava o problema.
- **QA no preview atual:** Home validada em 280, 320, 390, 768, 1280 e 1920 px. Em 280 e 320 os links ocupam duas linhas dentro do rodapé; a partir de 390 cabem em uma linha. Todos permanecem dentro da navegação, sem overflow horizontal.
- **Quality Gate:** [#42058621321](https://github.com/tonecosstudio/tonecosstudio/actions/runs/42058621321) SUCCESS para o commit de código `fac80d6b5990931207f8f22af3c4abab32cccd98`; o source mais recente `c3f8bda24808df7842ae43ce097c1658988821f4` também passou no Quality Gate [#42060730907](https://github.com/tonecosstudio/tonecosstudio/actions/runs/42060730907).
- **Prévia atual:** https://c50d9c50.tonecosstudio.pages.dev/ — deployment `c50d9c50-aad2-4d06-bf02-40954937bbd1`, source SHA `c3f8bda24808df7842ae43ce097c1658988821f4`; Cloudflare Pages build e deploy SUCCESS.
- **Cloudflare:** `preview_deployment_setting=none` e branch include `*` restaurados; produção continua desativada. O Access das prévias segue ativo. Worker/D1/R2 não foram alterados.
- **Base/HEAD:** base `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`; PR #4 draft, branch `integration/tonecosstudio-canonical-20261101`.
- **NEXT_ACTION:** conferir `/sobre`, depois seguir para as demais rotas conforme o checkpoint mais recente.
- **DO_NOT_REPEAT:** não deixar preview automático habilitado, não liberar produção, não tocar em Worker/D1/R2, não ocultar conteúdo móvel com overflow e não criar branch/PR nova.
---


## Frontend — título fluido e conferência mobile da home (05/11/2026)

- **Ajuste em `src/pages/LandingPage.tsx`:** título usa `clamp(3.5rem,14vw,9rem)` e tracking fluido; em 639/640 px a regra calcula 89,46/89,6 px, removendo o salto de tamanho no breakpoint. O typewriter expande além do mínimo de 32 px e as CTAs usam largura/padding tipográficos móveis até 20rem; desktop retoma a escala via `sm`/`lg`.
- **Prévia:** https://090dce0b.tonecosstudio.pages.dev/ — deployment `090dce0b-1feb-4081-8330-2d6c54240435`, ambiente `preview`, source SHA `e75f42da18482b1ceeadcd8d04afc7e29f6bd4f4`; Cloudflare Pages build e deploy SUCCESS. Build executou `npm ci`, `typecheck`, `catalog:mvp:test` e `build`. Produção e Worker/D1/R2 não foram alterados.
- **QA visual:** home e dados carregados no preview padrão (~804 px). Em viewport 320 e 390 px, typewriter quebra sem cortar o texto e CTAs cabem na largura; a grade de destaques mantém duas colunas. O screenshot da emulação 280 px ficou inconsistente após reset de zoom, por isso essa largura segue pendente. A continuidade 639/640 foi conferida pela fórmula CSS; não há salto no cálculo.
- **Base/HEAD:** base `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`; código `e75f42da18482b1ceeadcd8d04afc7e29f6bd4f4`; branch `integration/tonecosstudio-canonical-20261101`; PR #4 segue draft.
- **NEXT_ACTION:** repetir a captura 280 px com viewport confiável; conferir a home em 1280/1920 px e depois avançar para `/contato` e demais rotas públicas.
- **DO_NOT_REPEAT:** não voltar a alturas fixas para o typewriter, padding lateral fixo de 40 px em CTA mobile ou tamanhos de título que saltam em breakpoint; não publicar em produção, abrir nova branch/PR ou alterar Worker/D1/R2; não gerar build por mudança apenas documental.

---

## Frontend — hero móvel da página inicial (05/11/2026)

- **Ajuste em `src/pages/LandingPage.tsx`:** o bloco do typewriter agora cresce além do mínimo de 32 px quando o texto quebra em várias linhas. As duas CTAs usam largura móvel fluida até 20rem, espaçamento e tipografia menores em telas estreitas; a partir de `sm` recuperam a largura e escala anteriores.
- **Preview privado:** https://0ae5a15b.tonecosstudio.pages.dev/ — deployment `0ae5a15b-baed-4951-ab64-dc29bb5f871e`, ambiente `preview`, source SHA `604c49d59c7efa3958eff3433e31cbf5149fc02f`; Cloudflare Pages build e deploy SUCCESS. O build executou `npm ci`, `typecheck`, `catalog:mvp:test` e `build`. Produção e Worker/D1/R2 não foram alterados.
- **Evidência visual:** home carregada no preview, animação completa, contadores e seis modelos destacados visíveis; largura do navegador nesta sessão ~803 px, com CTAs preservadas em linha. **Mobile 280/320/390 px ainda não foi emulado nesta rodada**, então não está marcado como validado.
- **Base/HEAD:** base da PR `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`; commit de código `604c49d59c7efa3958eff3433e31cbf5149fc02f`; branch `integration/tonecosstudio-canonical-20261101`; PR #4 permanece draft.
- **NEXT_ACTION:** emular 280, 320 e 390 px na home para confirmar a quebra do typewriter e o encaixe das CTAs; ajustar se houver divergência; depois avançar para a próxima rota pública ainda sem checkpoint visual recente.
- **DO_NOT_REPEAT:** não prender o texto animado a uma altura fixa; não usar padding lateral fixo de 40 px nas CTAs móveis; não publicar em produção, criar outra branch/PR ou alterar Worker/D1/R2; não gerar build por atualização apenas documental.

---

## Frontend — nomes completos nos cards do Universo (05/11/2026)

- **Correção:** `src/pages/CatalogArcade.tsx` mantém “Animes e Desenhos” em uma linha e usa tamanho fluido com quebra entre palavras nos demais nomes, sem reticências. Em 280 px, “Tokusatsu & Cultura Japonesa” aparece completo em 3 linhas; em 320 e 390 px também está completo. Em 1280 px o rótulo fica completo em 2 linhas. Sem overflow horizontal.
- **Prévia privada:** https://544d3c9c.tonecosstudio.pages.dev/universo — deployment `544d3c9c-3456-48f8-ac9c-c11c5a3f6005`, ambiente preview, source commit `910e96ba329cfdb7db515eecdfa2eaa7618cfd84`; Cloudflare Pages build e deploy SUCCESS. Nenhuma alteração em produção, Worker, D1 ou R2.
- **QA relacionado:** categoria Marvel/DC e rota aninhada de equipes/grupos verificadas em 280, 320, 390, 768, 1024, 1280 e 1920 px, sem overflow; rota profunda preserva a pasta selecionada após reload. `/modelos` também foi validada em larguras de 280 a 1920 px na rodada anterior.
- **Base/HEAD:** base da PR `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`; commit de código `910e96ba329cfdb7db515eecdfa2eaa7618cfd84`; branch `integration/tonecosstudio-canonical-20261101`, PR #4 permanece draft.
- **NEXT_ACTION:** continuar QA responsivo nas próximas rotas e estados públicos, usando o preview deste commit; corrigir somente problemas confirmados.
- **DO_NOT_REPEAT:** não truncar rótulos de categoria, manter “Animes e Desenhos” em uma linha, não criar branch/PR, não fazer deploy público nem tocar no Worker/D1/R2; não gerar build por atualização apenas documental.

---


## Frontend — hero responsivo e QA por página (05/11/2026)

- **Ajuste no código:** `src/components/arcade/ArcadeLayout.tsx` agora usa tracking fluido em `ArcadeHero` (`clamp(0.08em, 2vw, 0.15em)`). A medição em `/privacidade` achou o H1 2 px maior que a caixa em 320 px; agora o texto mede 266/266 px. Em 360 px o tracking volta a 7.2 px; em 1280 px, 10.8 px e tamanho desktop preservado.
- **QA autenticado no preview:** `/universo` em 320 px: nenhum card “Todos”, uma CTA “Ver todos os modelos”, “Animes e Desenhos” em uma linha (109 × 15 px) e sem overflow. `/privacidade` em 320, 360 e 1280 px: título sem overflow; `/contato` e `/termos` sem overflow em 320 px. `/`, `/sobre`, árvore Dragon Ball e ficha de modelo também foram conferidos nas larguras da rodada anterior.
- **Código:** commit `b9f0af1f1ae22d9a104848b2f5b71d8dbac6ce67`, mesma branch e PR #4 draft.
- **Preview privado:** [https://8563636a.tonecosstudio.pages.dev/universo](https://8563636a.tonecosstudio.pages.dev/universo), deployment `8563636a-ddc2-4c6a-b23f-c4aca8296c30`, ambiente preview, source SHA `b9f0af1`; Cloudflare Pages build e deploy SUCCESS. A configuração de build executou typecheck, `catalog:mvp:test` e build. Produção e Worker/D1/R2 não foram alterados.
- **NEXT_ACTION:** revisar `/modelos` no preview atual em 320, 390, 768 e 1280 px, incluindo busca, filtros, grade e paginação; depois prosseguir pelas demais rotas e estados públicos.
- **DO_NOT_REPEAT:** não gerar build por atualização só documental, não criar branch/PR extra, não publicar em produção e não tocar em Worker, D1 ou R2.

## Backend — SSOT, remoção de legado e preflight de cutover (05/11/2026)

- **Owner isolado do layout local:** somente `config/catalog-code-consolidation.json`, `services/catalogo/README.md`, testes/guarda offline, preflight de cutover e documentação existente; não alterar componentes React, Pages Function, Worker ativo nem dados.
- **SSOT corrigida:** `origin.apiDeployWorkflowId` passa a residir no manifesto; preflight lê IDs de repositórios/conta/Worker de `config/catalog-code-consolidation.json` e D1/R2 de `services/catalogo/wrangler.jsonc`. O guard independente verifica a identidade aprovada e impede drift; flags M5 não foram liberadas.
- **Obsoletos removidos do repositório ativo:** `scripts/catalog/legacy/baixar-imagens-telegram.cmd` (launcher de caminho inválido) e `scripts/catalog/legacy/leia-pc-auxiliar.txt` (fluxo auxiliar abandonado). Conteúdo permanece no histórico Git. Ferramentas editoriais restantes preservadas.
- **Prova anterior:** [Quality Gate #41969104125](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41969104125) aprovado para o preflight anterior; o novo conjunto de mudanças requer CI do HEAD vigente. Nenhum D1, R2, Worker deploy ou migração foi realizado.
- **NEXT_ACTION:** verificar Quality Gate da última revisão, corrigir falha real se houver; manter M5 BLOCKED até GO, fonte Washington desativada, rollout/rollback provados e credenciais verificadas.
- **DO_NOT_REPEAT:** não criar outra branch/PR, não rodar scans D1/R2, não apagar scripts editoriais sem prova de desuso, não tocar layout nem gerar build de frontend por documentação.
 O enorme checkpoint cumulativo anterior foi preservado integralmente em [docs-archive/historico-2026-11-04/URGENTE.md](docs-archive/historico-2026-11-04/URGENTE.md). Use [docs/README.md](docs/README.md) como índice dos documentos atuais.

## Frontend — rodada 1 de responsividade (04/11/2026)

- **Escopo:** navegação compartilhada, rodapé e catálogo público. No preview protegido atual, as oito rotas principais foram conferidas a 320 px sem rolagem horizontal. A listagem foi verificada em 320, 390, 768, 1024, 1440 e 1920 px, com 2, 2, 4, 4, 5 e 6 colunas. Categorias e franquias também foram abertas em celular; o painel de seleção ocupa a largura de 320 px e mantém o modelo e as ações visíveis.
- **Ajustes no código:** alvos de toque de 44 × 44 px no botão do menu e 44 px de altura nos links do menu e do rodapé; busca da listagem com placeholder curto e largura de texto ajustada quando o controle para limpar não está presente.
- **Commits de código:** 35c492e (menu), 7ce12ea (rodapé), e7351da (busca), 2bf5357 (expectativa de teste atualizada).
- **Preview privado pronto:** [https://0694c96e.tonecosstudio.pages.dev/modelos](https://0694c96e.tonecosstudio.pages.dev/modelos), deployment 0694c96e-2482-44b8-ab52-e2b8b3886c00, commit 54b6ead2fb22ba3ebacb676a314a9142a8090157. Cloudflare Pages build SUCCESS / deploy SUCCESS; typecheck, catalog:mvp:test (4 arquivos, 78 testes) e npm run build concluíram.
- **Tentativa anterior:** deployment b73d4bce falhou porque um teste ainda procurava o placeholder antigo; foi corrigido em 2bf5357. Não publicou assets. Produção e o Worker permanecem inalterados.

## Contas e fontes de verdade

- **Repositório do site:** tonecosstudio/tonecosstudio, GitHub ID 1163825583. O nome antigo washingtonmsdj/tonecosstudio redireciona ao mesmo ID. PR [#4](https://github.com/tonecosstudio/tonecosstudio/pull/4), branch integration/tonecosstudio-canonical-20261101, **draft**, sem merge na main. Commits 74b7b60, 5acf41c e 171c84a são de reorganização documental.
- **Hospedagem oficial:** Cloudflare Pages da conta **tonecosstudio@gmail.com**, account ID 8827c547d6def5ee5b9ca550fdd5680a, projeto **tonecosstudio**, hostname reservado **https://tonecosstudio.pages.dev**. Produção automática **OFF** (production_deployments_enabled=false), previews automáticos **OFF** (preview_deployment_setting=none), produção ligada à branch **main**.
- **API e mídia:** Cloudflare Worker **tonecos-catalogo-api** na conta Tonecos, via binding Pages **CATALOG_WORKER** em preview e produção. D1/R2 pertencem ao Worker; sem binding direto na Pages Function. **Código do backend segue temporariamente no repo washingtonmsdj/catalogo**, com migração para services/catalogo neste repo autorizada como plano; deploy e release continuam sem autorização.
- **MVP:** catálogo readonly (Home, Universo, Modelos, ficha e galeria, Sobre, Contato mailto, Termos e Privacidade). Supabase/Stripe, login, conta, pedidos, pagamentos, moedas e admin não estão no bundle público homologado; módulos comerciais existentes são fase futura.
- **Cloudflare Access** protege os previews. Requisição externa com HTTP 200 de tela Sign in, inclusive para robots, **não é QA do conteúdo**.
- **Worker redundante** com nome tonecosstudio foi observado na conta, mas seu Workers Builds paralelo já foi desconectado anteriormente. Não confundir com o Pages ou com a API; não excluir sem auditoria específica.

## Builds existentes — NÃO repetir por documentação

- **ad578030-e02f-47ef-ae23-b4aa6e4ad713**, SHA **39e7a04a**, Cloudflare Pages preview: build e deploy **SUCCESS** em **04/11/2026 04:50:36 UTC**. Logs atestam bundle com 20 chunks sem runtime Supabase/comercial, robots e meta bloqueando indexação, sem sitemap, npm audit sem vulnerabilidades reportadas.
- **13187506-f2ab-4931-b586-4aa811ae9e6c**, SHA **16fa5760**: build/deploy **SUCCESS** às **04:39:09 UTC**, validando gate SEO antes do lançamento.
- **2bc99d80565ca97199bfcb146540a4b00319cd1f**: alteração preventiva **vercel.json git.deploymentEnabled=false**; evento Pages deste SHA ficou **queued/idle**. Isso **não prova build** desse SHA; as mudanças documentais seguintes tampouco exigem novo build. Não criar outro preview só para zerar check histórico.
- Seis capas WebP da primeira página e detalhe do modelo **nier-10h-nier** têm evidências HTTP econômicas anteriores, mas **não foram homologados visualmente** em desktop/mobile. Não inferir acervo total de apenas seis modelos.

## Vercel Washington — legado, NÃO é o hosting oficial

- Equipe **jogo-brasils-projects**, conta Washington, plano **Hobby**, projeto **tonecosstudio**, ID **prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu**. Git link histórico aponta a washingtonmsdj/tonecosstudio, que redireciona ao mesmo repo ID.
- Domínios **ordax.com.br** e **www.ordax.com.br** permanecem associados ao projeto Vercel antigo, porém **não verificados**; **ordax-three.vercel.app** está verificado. A associação antiga não significa que Tonecos esteja servindo DNS OrdaX. **Não alterar DNS ou projeto OrdaX.**
- Vercel aceitou uma solicitação para desativar previews; efeito fim a fim **ainda não comprovado**. A política premium para bloqueio de Git teve **403 pro_plan_required**: não contratar Pro.
- O novo vercel.json usa diretiva oficial gratuita git.deploymentEnabled=false, mas **não prova desconexão do Git legado**. O vínculo e os domínios antigos devem ser tratados **no projeto correto**, sem afetar OrdaX, antes de liberar a main. Veja [runbook](docs/OPERACAO_CLOUDFLARE_PAGES.md).

## Pendente para GO

1. **QA visual completo — pendente:** [preview privado atual](https://0694c96e.tonecosstudio.pages.dev/modelos). A rodada responsiva foi validada; seguem pendentes a revisão individual das capas e galeria, caminhos de refresh/deep link, acessibilidade e estados de falha.
2. **Revisão jurídica humana** de Termos e Privacidade, dados reais do operador (não presumir LTDA), LGPD, cookies/logs e direitos de mídia/personagens.
3. **Desconexão/prova de isolamento da Vercel antiga**, limpeza dos vínculos de domínio no projeto legado sem afetar OrdaX, hostname/canonical/HTTPS/SEO corretos e rollback Pages verificado.
4. **Gates do SHA candidato, merge e publicação Cloudflare Pages** apenas com autorização explícita. SEO TONECOS_PUBLIC_INDEXING_RELEASE não está habilitado; sem autorização mantém robots Disallow, noindex e nenhum sitemap.

**next_action:** QA autenticado com evidência e retirada segura da dependência operacional Vercel; depois revisão legal, rollback e decisão sobre merge Pages.

**do_not_repeat:** não varrer/consultar D1 para status, importar Drive/Telegram, executar builds já aprovados, criar novos workers/apps/PRs, migrar Supabase, comprar Pro, ativar conta/pagamentos/SEO, mexer no OrdaX ou publicar o site antes dos gates.

Documentos ativos: [README](README.md), [AGENTS](AGENTS.md), [arquitetura](docs/TONECOS-STUDIO-CONSOLIDACAO.md), [proxy](docs/TONECOS_CATALOG_FIRST_PARTY_PROXY.md), [preview](docs/TONECOS_SAFE_PREVIEW.md) e [runbook Pages](docs/OPERACAO_CLOUDFLARE_PAGES.md).

## 04/11/2026 — Hardening de hospedagem legada (repositório)

- A proteção oficial `vercel.json → git.deploymentEnabled=false` foi preservada. Removidas as **8 rewrites Vercel** que apontavam diretamente ao Worker público, a regra legada de cache, headers, comandos de build e o script `scripts/vercel/should-ignore-build.mjs`. O arquivo passou a ser somente **bloqueio preventivo de deployments automáticos**; o caminho canônico da aplicação permanece Cloudflare Pages Function + CATALOG_WORKER.
- Essa alteração é **no repositório**, não uma desconexão feita no painel Vercel. A Vercel Washington continua com Git link a verificar/desconectar; não afirmar isolamento fim a fim nem liberar main.
- Sem mudanças nas Functions Pages, Worker, D1/R2, backend ou ambiente remoto. **Nenhum novo build Cloudflare é necessário para provar remoção da configuração Vercel**; QA autenticado do bundle já homologado continua pendente.

## 04/11/2026 — Auditoria de documentos locais comerciais

- **48 Markdown de módulos inspecionados**, seis com referências à marca/arquivos antigos corrigidas ou sinalizadas. `src/components/customer/README.md` não usa mais links absolutos de Windows. Exemplos de links de e-mail OrdaX foram substituídos por domínio reservado inválido, jamais origem de produção. Um README vazio foi excluído.
- No código comercial futuro, `src/pages/admin/credits/AdminCoinsSystem.tsx` ainda exibe a frase **ORDAX** e `supabase/functions/_shared/email.ts` ainda tem nome de remetente padrão `Ordax`. **Não faz parte do bundle readonly**; corrigir e homologar na etapa comercial antes de habilitar Supabase, cadastro ou e-mail. O código `getPublicBaseUrl` exige origem configurada, sem fallback OrdaX.
- **Nenhum Supabase, Worker, deployment ou build foi acionado** por esta auditoria documental.

## 04/11/2026 — Nova missão: consolidar backend e frontend no mesmo repo

- **DECISÃO DO PROPRIETÁRIO:** um repositório canônico **tonecosstudio/tonecosstudio**, sem **tonecosstudio/catalogo**; [plano operacional](docs/MIGRACAO_CATALOGO_MONOREPO.md), fases M0–M6; [inventário imutável de origem](config/catalog-code-consolidation.json), guard offline **npm run catalog:monorepo:check**.
- **Origem GitHub temporária:** washingtonmsdj/catalogo público ID 1398242143, main observada **a4bf22bb8044a88f0c5d0b54b3e9d3fdead0b34c**, **652 arquivos**: 12 Worker, 22 migrations, 211 tools, 26 config, 68 src antigo, 280 docs. PRs #266 (mídia R2), #264 e #263 abertas. Importar somente Worker/contratos/sql D1/ferramentas necessárias após reconciliar #266; NÃO duplicar UI nem criar serviços.
- **Integração runtime já existente:** Cloudflare Pages Tonecos → binding CATALOG_WORKER → Worker tonecos-catalogo-api → D1/R2 únicos. **Active Worker publisher continua Washington**; manifest está inicialmente em **inventoried**, deploy pelo Studio e migrations novos bloqueados.
- **Próxima execução:** revalidar HEAD/PR #4 + main/PR #266 origem, rodar guard offline, mapear dependências para M1. Só então importar code staged-offline em services/catalogo na mesma PR; testes e CI por impacto, nunca dois writers.
- **Não repetir:** auditoria D1/R2, builds por documentação, import de frontend antigo, criação tonecosstudio/catalogo, novos branches/PRs, mudanças DNS/Achegue-se, alterações de produção ou arquivamento antes do cutover.
- **NO-GO:** sem merge, Cloudflare Pages produção desligada, QA visual/legal e Vercel legacy pendentes. Histórico da proposta de transferir o repo GitHub foi superado por esta decisão de monorepo.

## 04/11/2026 — Execução M0 e início M1

- No SHA d2cffee1fb94b0540b7e362d163200404a929bbe, **guard Node 24.22.2: 5/5 PASS, saída 0**, no desktop Windows autorizado (cópia isolada em pasta temporária). Sem D1/R2, rede ou deploy. Teste adicional do grafo estático precisa ser reexecutado no novo SHA.
- **Import graph real:** Worker entry.ts alcança 9/12 módulos; os três quoteAdmin/quoteWorkflow estão desconectados do entrypoint no snapshot e não devem ser migrados como parte da API pública sem revisão. schemaContract.ts usa config/catalog-schema-contract.json. Grafo agora no mesmo manifesto SSOT. PR #266 ainda aberta/draft, com correção HEAD/GET sem Range; **bloqueia assumir equivalência da main antiga**.
- **Próxima ação:** mapear toolchain worker e migrations D1, fechar escopo, homologar PR #266 sem promover Worker, somente então importar serviços/catalogo staged-offline nesta PR #4. Jamais ativar dois publicadores.

## 04/11/2026 — M1, dependências do deploy API (sem deploy)

- Leitura do workflow Cloudflare API **na main origem a4bf22b**: 18 referências tools, mais 1 ferramenta transitiva (check_worker_gallery_contract), todos com Git blobs no manifesto único. Wrangler, schema JSON e tsconfig Worker também ancorados em SHA. A pipeline existente pode publicar versões e aplicar migrações quando muda schema: **não copiar/ativar gatilhos sem neutralizar este comportamento**.
- O guard estático 6/6 PASS no SHA d4b5041 (Node 24 Windows, exit 0). Teste do toolchain executado na versão 424cdd9: **7/7 PASS, 0 FAIL, exit 0** em Node 24 no Windows isolado. **Registro histórico do M1:** essa pendência referia-se ao release; em M2 o código de runtime foi importado **inativo** com fechamento das suas dependências. Ferramentas de deploy seguem aguardando M4; a PR #266 continua draft e deve ser reconciliada antes de qualquer release.

## 04/11/2026 — M2/M3 aprovadas localmente; M4 CI remoto VERDE (sem deploy)

- **Repositório único:** `tonecosstudio/tonecosstudio` PR draft #4, branch `integration/tonecosstudio-canonical-20261101`. Código do Worker importado sob `services/catalogo/` como **staged-offline**. Atualmente **46 blobs rastreados**: 9 Worker públicos, 22 SQL D1, 3 configs, 12 arquivos de utilitários/testes. Três módulos quote/admin e o frontend antigo não foram importados.
- **Mídia:** `worker/media.ts` e regressões vêm da PR Washington #266 ainda draft; worker original continua com um só publicador no repo Washington. `releaseAuthorized=false`, `targetWorkerReleaseEnabled=false`, `targetD1MigrationEnabled=false`.
- **Provas locais reais, Windows Node 24.22.2:** guard/hash **8/8 PASS sobre 46 SHA Git**; Worker **58/58 PASS**; Pages proxy **12/12 PASS**; busca/SQLite **4/4 PASS** aplicando 22 migrations em banco in-memory com **20.320 modelos fictícios**. Total **82/82 PASS**, todos exit 0. TypeScript **5.8.3** do lockfile passou `catalog:worker:typecheck` exit 0. Zero SQL D1 remoto, zero R2 remoto e zero deployments.
- **M4 CI por impacto:** alterado **apenas** o workflow existente `.github/workflows/quality.yml`. Em PRs com mudança em catálogo, job `catalog-offline` faz `npm ci`, guard, TS, Worker, busca SQLite e proxy; outras suítes pesadas continuam no fluxo original de main/dispatch. **GitHub Actions run #41789856366 SUCCESS** no SHA do código `90503aa58803fcaa467db1a8d6c2e8ad4aecde04`, todos os passos do job catalog-offline sucesso, jobs gerais skipped. Sem secrets, deploy Wrangler ou migrations D1.
- **NEXT_ACTION:** M4 gates offline verdes; **NÃO executar M5 sem autorização explícita e validação de único writer**. Revalidar PR #266, rollback, credenciais e roteamento antes de uma promoção; manter release bloqueado. M5 cutover do escritor e M6 desativação de Washington/Achegue-se exigem gate e autorização específicos. **DO_NOT_REPEAT:** reimportações, scans de D1/R2, builds de site por documentação, contas/repos paralelos ou mudanças em OrdaX/Vercel.

## 04/11/2026 — M5 preflight read-only e prova de Worker compilado

- Cloudflare Worker **versão 28** id `a32b09a0-377d-4ff7-b313-4e5a7bf994b6` a **100%**; deployment `a9f13dd7-537d-4106-bfcf-30510cca388b` em 01/11. Versão 27 id `3fdef475-a483-4439-a778-bd87f9f76bb1` registrada, **não testada como rollback**. Fonte deployed commit `77ff9b0`, 21 commits atrás da main Washington `a4bf22b`, **zero diferenças no runtime/migrations/config** entre esses SHAs. PR #266 ainda draft adiciona o ajuste de mídia no candidato.
- Workspace de teste Windows: compilação real do `worker/entry.ts` para **ESM/browser/es2022**, mocks R2 e D1 bloqueado; **3/3 testes PASS, exit 0**, validando GET e HEAD HTTP 200, Range HTTP 206 e POST 405 sem DB. Novo teste incorporado ao `catalog:worker:test`; total local passa a **85/85** (82 prévios + 3 novos), à espera do job CI no novo HEAD.
- Workflow de origem Washington ainda tem triggers **push main** e **workflow_dispatch**, que pode forçar migrations D1. **Não ativar segundo publicador, nem copiar workflow, nem lançar SQL via dispatch.** Estado do manifesto: staged-offline, releaseAuthorized=false, sourceWriterDisabled=false, targetWorkerReleaseEnabled=false, targetD1MigrationEnabled=false. Snapshot read-only em `productionObservation`, com IDs e bloqueios; revalidar no cutover.
- **NEXT_ACTION:** conferir CI do novo teste; M5 necessita autorização específica, desabilitar origem, validar único publisher/versão atual/rollback e promover somente então. M6 requer aprovação de site, legal e redirects. **DO_NOT_REPEAT:** consultas D1/R2, builds de UI por docs, múltiplas branches/PRs, migração de bucket, imports e CI redundantes.

**Complemento M5 — pacote Wrangler dry-run:** Wrangler **4.155.0** compilou `services/catalogo/wrangler.jsonc` via `deploy --dry-run --outdir <TEMP>` com `exit 0`, `entry.js` 51.750 bytes (gzip reportado 11,86 KiB), DB e MEDIA reconhecidos. Nenhuma credencial, deploy, consulta SQL D1 ou objeto R2 utilizado. **Não repetir compilação sem alteração de Worker/config**. `TURNSTILE_SECRET_KEY` e o controle de writer Washington continuam pendentes de comprovação na janela M5; release permanece não autorizado. A prova e a sequência canônica de cutover/rollback estão em `docs/MIGRACAO_CATALOGO_MONOREPO.md`.

## 04/11/2026 — Bloqueio M5 verificável no código (última execução)

- **PR #4:** commits `cfde077` (nova checagem `npm run catalog:cutover:check` somente leitura, cinco testes com mocks) e `8266937` (corrige contrato de transição `cutover-approved`, antes impossível). Continua `draft`; nenhum segundo publicador/Worker/banco/workflow criado.
- **Prova GitHub real:** workflow Washington `cloudflare.yml` id `371358484` = **active**, jobs in_progress **0**, queued **0**. `catalog:cutover:check` no Windows retornou `BLOCKED / exit 2` (sem Cloudflare credentials), falha fechada corretamente; 5/5 novos testes + 9/9 guard PASS. GitHub Actions run [#41797866215](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41797866215) **success**, com teste de bloqueio em CI. Total offline do job: **91 testes** (9 guard + 5 gate + 61 Worker + 4 SQLite + 12 Pages), mais TypeScript; sem SQL remoto/D1/R2.
- **NEXT_ACTION:** não refazer CI/check de status sem código novo. M5 segue bloqueada por source writer ativo, GO explícito e falta de prova das credenciais/rollback. Após GO, desabilitar fluxo Washington, verificar único publicador pelo GitHub, consultar Worker versão ativa e bindings via leitura, preparar rollback, seguir procedimento canônico sem migrations de runtime-only. M6 permanece condicionada a QA frontend/jurídico/redirects. **Sem tocar na produção nesta fase.**

## 04/11/2026 — Ajuste de frontend em /modelos

- **Base:** `6789278c99441ae6b8fbc12211305edc1072c864`. **HEAD do frontend:** `e4d46d2a99269f5f951e1fed0d10d3115fdf764a` na PR draft #4.
- A barra de busca e filtros foi reorganizada para telas menores e agora exibe os filtros ativos e a opção de limpá-los. “Minha seleção” abre em painel lateral com miniaturas, links para fichas e rolagem da lista.
- **Prova:** esbuild aceitou o TSX localmente. A homologação visual autenticada em desktop e celular, o build de preview deste SHA e os gates de release estão pendentes.
- **NEXT_ACTION:** validar o painel e os filtros em preview protegido antes de promover qualquer versão. **DO_NOT_REPEAT:** não reconstruir por este checkpoint documental nem consultar D1/R2 para validar layout.


## 04/11/2026 — Responsividade de /universo

- PR #4, branch `integration/tonecosstudio-canonical-20261101`. O commit de código `1aa61962ad1f4f021c9e095f4590b76e9a0cba24` reaproveita em `/universo` a prop `compact` já existente em `ArcadeHero`, reduzindo a altura do hero. Comparação medida: 321 → 241 px em 320×780 e 420 → 276 px em 1440×900.
- Preview Cloudflare privado [`bf4f697f`](https://bf4f697f.tonecosstudio.pages.dev/universo), deployment `bf4f697f-2df9-4539-8c19-6a7538c09793`, build/deploy **SUCCESS**, ambiente `preview`, fonte `084a6ed33be039a2f74c7e0a49953ee3f5721208`. Pipeline: typecheck, `catalog:mvp:test` (**78/78**) e `npm run build` concluídos.
- QA do Universo no preview em 320, 390, 768, 1024, 1440 e 1920 px: **nenhum overflow horizontal**; grade responsiva de categorias em 2/2/3/4/4/4 colunas. Seis links/categorias e total de 2.575 modelos renderizados. Uma primeira consulta no preview anterior falhou de forma transitória e se recuperou pelo botão “Tentar novamente”; a página nova carregou sem estado de erro.
- Produção/Worker/D1/R2 e configuração de deploy **inalterados**. Prévia iniciada manualmente porque previews automáticos seguem desativados.
- **NEXT_ACTION:** seguir na mesma PR draft #4 para a próxima página do frontend, usando o preview privado e verificando breakpoints antes de avançar.


## 04/11/2026 — Alvos do breadcrumb em /universo/:categoria

- PR #4, branch `integration/tonecosstudio-canonical-20261101`. O commit de código `d87640d30dd94937ec3f5ca3fc6137beede7ebb7` leva os dois links do breadcrumb e “Ver todos os modelos” a **44 px** de altura mínima e adiciona contorno de foco visível. Busca e botão permanecem em 48 px.
- Preview Cloudflare privado [`6000c1e9`](https://6000c1e9.tonecosstudio.pages.dev/universo/animes-desenhos), deployment `6000c1e9-ec15-4106-8b6d-035d23ef2f01`, build/deploy **SUCCESS**, ambiente `preview`, fonte `5d7ef72cbe8529c4a200756df6ef027754ee37d4`.
- Typecheck, `catalog:mvp:test` (**78/78**) e `npm run build` passaram. O build também passou pelas verificações de monorepo (9/9) e proxy/segurança/SEO (28/28).
- QA do preview em 320, 360, 390, 430, 640, 768, 1024, 1280, 1440 e 1920 px: **sem overflow horizontal**; grade em 2/3/4 colunas e os três alvos do breadcrumb medindo 44 px em todas as larguras. Foco de teclado confirmado nos três links com contorno dourado de 2 px. Primeira listagem mostra 24 franquias.
- Deploy manual somente em `preview`; produção, Worker, D1 e R2 permanecem inalterados. Previews automáticos continuam desativados.
- **NEXT_ACTION:** continuar na mesma PR draft #4 pela próxima tela pública; manter o preview privado como fonte de validação.

## Rodada 4 — navegação e responsividade da ficha do modelo (04/11/2026)

- Ao abrir uma ficha a partir de uma franquia, a rota mantinha a rolagem da listagem e podia esconder o início do conteúdo. O roteador público agora leva navegações novas ao topo, preserva links com hash e deixa o navegador restaurar a posição em navegações de volta.
- Preview privado: [abrir ficha do Androide 17](https://307479be.tonecosstudio.pages.dev/modelos/dragon-ball-androide-17-busto-display) — Cloudflare Pages deployment `307479be-f003-45b1-ae6b-5710e9647cc5`, código `e294b8a9515e2e53338eede9992f57ec2649453d`, build/deploy SUCCESS.
- QA real: clique da franquia para a ficha iniciou em `scrollY=0`; “Voltar” do navegador recuperou a listagem em `scrollY=610`. Dez larguras (320–1920 px), sem overflow horizontal; link de retorno 44 px, botão de seleção 46 px e miniatura entre 62–106 px.
- Validações Cloudflare: typecheck, `catalog:mvp:test` (78/78), `catalog:monorepo:check` (9/9), gates de segurança/proxy/SEO (28/28) e Vite build passaram. Preview preserva robots/noindex e exclui o runtime comercial/Supabase.
- A primeira execução do build falhou porque o componente ainda não estava montado; a ligação foi corrigida no commit acima e o build final passou. Só preview manual; produção, Worker, D1 e R2 inalterados. PR #4 continua draft.
- **NEXT_ACTION concluída:** ficha do modelo validada; a próxima rota, Sobre, está registrada na Rodada 5.

## Rodada 5 — responsividade da página Sobre (04/11/2026)

- A página Sobre reaproveita o modo compacto de `ArcadeHero`: altura medida do hero caiu de 321 para 241 px em 320 px e de 420 para 276 px em 1440 px, trazendo a seção Missão mais perto do topo.
- Preview privado: [abrir Sobre](https://02462383.tonecosstudio.pages.dev/sobre) — deployment `02462383-a2f9-48b1-8226-43bc605f92b6`, código `35e7d3fe614f0558c82192def5e904ff3997268a`, build/deploy SUCCESS.
- QA em 320, 360, 390, 430, 640, 768, 1024, 1280, 1440 e 1920 px: sem overflow; grades adaptam entre 1/2/4 colunas conforme a largura; alvos de FAQ com 56 px.
- Typecheck, `catalog:mvp:test` (78/78), verificação monorepo (9/9), gates de segurança/proxy/SEO (28/28) e Vite build passaram. Navegação ficha/listagem também revalidada no mesmo preview. Robots/noindex preservados, sem runtime comercial/Supabase; produção, Worker, D1 e R2 inalterados.
- **NEXT_ACTION concluída:** a página Contato foi validada na Rodada 6.

## Rodada 6 — QA responsivo de Contato (04/11/2026)

- Preview privado [Contato](https://02462383.tonecosstudio.pages.dev/contato), deployment `02462383-a2f9-48b1-8226-43bc605f92b6`, build/deploy SUCCESS no código `35e7d3fe614f0558c82192def5e904ff3997268a`.
- QA em 320, 360, 390, 430, 640, 768, 1024, 1280, 1440 e 1920 px: sem overflow horizontal; os links de e-mail têm altura de 44 px. A página explica que o catálogo é informativo e não recebe cadastro, pedidos ou pagamentos.
- Sem mudança de código: o layout e os links existentes funcionaram no preview atualizado. Typecheck e gates de build já passaram no mesmo deployment, registrados na Rodada 5. Produção inalterada.
- **NEXT_ACTION concluída:** Termos e Privacidade validados na Rodada 7.

## Rodada 7 — hero compacto em Contato e páginas legais (04/11/2026)

- Contato, Termos e Privacidade usam o hero compacto do `ArcadeHero`. Alturas (320 → 1440 px): Contato 291/404 → 211/260 px; Termos 354/404 → 274/260 px; Privacidade 319/420 → 239/276 px.
- Preview privado [abrir a Home atualizada](https://6b759de1.tonecosstudio.pages.dev/) — deployment `6b759de1-763c-4145-aa45-29fd6c3a6422`, código `3963059a1ab5b38723cf210f58526af723791f0d`, build/deploy SUCCESS. As rotas `/contato`, `/termos` e `/privacidade` estão no mesmo preview.
- QA nas dez larguras (320–1920 px): sem overflow. Links de e-mail permanecem com 44 px. Typecheck, `catalog:mvp:test` (78/78), check monorepo (9/9), gates de segurança/proxy/SEO (28/28) e Vite build passaram; robots/noindex preservados, sem runtime comercial/Supabase.
- Apenas preview manual; produção e Worker inalterados.

## Rodada 8 — QA responsivo da Home (04/11/2026)

- QA visual em 320, 360, 390, 430, 640, 768, 1024, 1280, 1440 e 1920 px: sem overflow; o hero acompanha 88svh, as grades se ajustam à largura e os modelos em destaque carregam.
- Ações principais medem 56 px; ações de navegação secundária, 44 px. Nenhuma alteração de código na Home.
- **NEXT_ACTION:** continuar QA das interações de busca, paginação e seleção do catálogo no mesmo preview privado.

## Rodada 9 — franquia Street Fighter e alvos móveis (04/11/2026)

- Na página `/universo/games/street-fighter`, o breadcrumb “Raiz da franquia” tinha 16 px de altura; “Ver mais modelos” tinha 20 px. O componente agora aplica alvo mínimo de 44 px, foco visível e o mesmo tratamento aos breadcrumbs das pastas e ao CTA “Explorar todos os modelos”.
- Preview privado [abrir Street Fighter](https://9201bcb6.tonecosstudio.pages.dev/universo/games/street-fighter), deployment `9201bcb6-f3fb-4945-9aac-6cb1a38da974`, ambiente preview, source commit `a0312bb91b533d6830a85e0f5b7524d7ed4c33c2`, build/deploy SUCCESS.
- QA em 320, 360, 390, 414, 768, 1024, 1280, 1440, 1600 e 1920 px: sem overflow; root, breadcrumb, exploração e “Ver mais” medem 44 px. A pasta Akuma lista 6 referências, abre e retorna à raiz; o CTA mantém `category=games&franchise=street-fighter` ao abrir Modelos.
- Gates do Pages: typecheck, `catalog:mvp:test` (78/78), monorepo (9/9), segurança/proxy/SEO (28/28), Vite build e compilação da Pages Function passaram. Preview readonly/noindex; produção, Worker, D1 e R2 inalterados.

## Rodada 10 — interações de Modelos no preview atual (04/11/2026)

- Na mesma versão de preview: página 2 mostra 36 modelos e volta à página 1; busca “androide” retorna 35, limpar restaura 36; adicionar e remover referência alterna `0/50 → 1/50 → 0/50`. Sem overflow. Nenhum pedido ou dado comercial é criado.
- **HEAD funcional validado:** `a0312bb91b533d6830a85e0f5b7524d7ed4c33c2`. PR #4 segue draft; preview manual; produção automática e previews automáticos permanecem desativados.
- **NEXT_ACTION:** seguir por `/universo/filmes-series`, auditar a categoria em larguras móveis e desktop e corrigir somente achados concretos. Não repetir as páginas já aprovadas nem gerar build só por alterações documentais.
- **DO_NOT_REPEAT:** não publicar produção, alterar Worker/D1/R2/DNS, varrer catálogo integral ou criar branch/PR adicional.


## Rodada 11 — categorias restantes e pastas aninhadas (04/11/2026)

- QA das seis categorias do Universo no preview `9201bcb6`: Games, Filmes & Séries, Marvel & DC, Tokusatsu & Cultura Japonesa, Pessoas e Animes & Desenhos. Em cada página, dez larguras (320–1920 px) sem overflow; breadcrumb 44 px, campo e botão de busca 48 px.
- Busca testada na UI: `star` → Star Wars (37 modelos), `batman` → Batman (77), `jaspion` → Jaspion (2), `elvis` → Elvis Presley (1) e `dragon` → Dragon Ball (517). Limpar recupera as contagens completas da listagem.
- Franquias representativas abertas: Star Wars (18 pastas/8 referências), Batman (21/8), Jaspion (2 referências, sem pastas), Elvis Presley (1 referência) e Dragon Ball (14/8). A pasta Batman mostra 8 de 23 modelos e mantém `category=marvel-dc&franchise=batman&folder=batman` ao explorar o catálogo.
- Em Dragon Ball, raiz → Androides → Androide 17 mostrou 2 referências; os três breadcrumbs medem 44 px, os retornos para pai e raiz funcionam e não há overflow nas dez larguras. Imagens carregaram após a consulta completar.
- Sem nova alteração de código: permanece a prévia manual aprovada da Rodada 9, commit funcional `a0312bb91b533d6830a85e0f5b7524d7ed4c33c2`. Produção, Worker, D1 e R2 inalterados.
- **NEXT_ACTION:** revisar uma ficha e galeria com sessão do preview atual, incluindo retorno ao caminho de franquia/pasta e dimensões de miniaturas. Não rebuildar para este registro documental.


## Rodada 12 — fichas e galeria a partir de pasta aninhada (04/11/2026)

- A ficha do Androide 17 abriu a partir de `Dragon Ball → Androides → Androide 17`, carregou a imagem publicada e o link “Voltar à pasta” retornou ao caminho exato da subpasta.
- A ficha do Androide 18 tem duas imagens: selecionar a segunda muda a imagem principal e `aria-pressed`; imagem e miniaturas carregam corretamente.
- Ambas as fichas passaram em 320, 360, 390, 414, 768, 1024, 1280, 1440, 1600 e 1920 px sem overflow. Link de retorno 44 px, seleção 46 px e miniaturas entre 62 e 106 px. A navegação por Tab alcançou “Raiz da franquia” e mostrou contorno dourado sólido de 2 px no alvo de 44 px; a seleção permaneceu vazia.
- Preview protegido `9201bcb6`, source funcional `a0312bb91b533d6830a85e0f5b7524d7ed4c33c2`; sem novo build ou alteração de código nesta rodada. Produção e recursos do Worker continuam intactos.
- **NEXT_ACTION:** seguir por `/universo/marvel-dc/equipes-e-grupos`, revisar busca/franquias de maior volume e foco de teclado. Não repetir testes já aprovados de ficha/galeria nem gerar build somente para documentação.


## Rodada 13 — miniaturas imersivas e pastas responsivas (04/11/2026)

- Referência visual analisada: [STLForge](https://stlforge.cl/stl-models/), com quadro vertical 2:3, imagem em `object-fit: cover` e zoom suave. O padrão foi aplicado às capas da listagem `/modelos` e às referências nas páginas de franquia/pasta; ficha e galeria continuam exibindo a imagem inteira com `contain`.
- Na página `/universo/marvel-dc/equipes-e-grupos`, o grid de pastas usa uma coluna em 320 px para evitar truncar nomes longos; passa a duas a partir de 360 px, três em `sm` e quatro em `lg`.
- **QA do código:** GitHub Actions Quality Gate #41920100209 **completed/success** no SHA `8044a7f2b533a941d59b8cc1bd103a69bae22d49`.
- **Preview privado atualizado:** [abrir Modelos](https://5eff704d.tonecosstudio.pages.dev/modelos), deployment `5eff704d-77be-40fa-b53f-ed2e355d47b3`, commit exato acima; ambiente `preview`, Cloudflare Pages build **SUCCESS** e deploy **SUCCESS**. Configuração remota confirmada: produção na `main`, produção automática desativada e previews automáticos desativados; publicação manual restrita ao preview. Produção, Worker, D1, R2 e DNS inalterados.
- **Responsividade medida:** `/modelos` em 320, 360, 390, 768, 1440 e 1920 px: sem overflow horizontal; grade em 2/2/2/4/5/6 colunas; capas `cover` na proporção 2:3. Página da franquia em 320, 360, 390, 768 e 1440 px: sem overflow, grid de pastas em 1/2/2/3/4 colunas e miniaturas preenchendo os quadros. X-Men aninhado também conferido a 320 px, com rótulos inteiros.
- **NEXT_ACTION:** continuar a revisão página por página pela Home, priorizando hero, imagens, navegação e layout em 320/390/768/1440 px. Manter a PR #4 em draft; não publicar produção nem refazer builds só por documentação.


## Rodada 14 — Home com capas imersivas e grade de tablet (04/11/2026)

- As seis capas de destaque da Home agora usam proporção 2:3, `object-fit: cover` e zoom suave no hover, sem a margem escura interna. Fichas e galerias continuam preservando a imagem inteira.
- Grid da Home: 2 colunas no celular, 3 a partir de `sm`, 4 em `lg` e 6 em `xl`. O tablet de 768 px passa a mostrar três destaques por linha, evitando miniaturas estreitas.
- **Quality Gate:** GitHub Actions #41923699109 **completed/success** no SHA `5da7c74ea9c33f37964139dddfa86533d50b7897`.
- **Preview final:** [abrir Home](https://a00e389a.tonecosstudio.pages.dev/), deployment `a00e389a-939b-4ddc-bba4-91cb1265de7e`, SHA exato acima; Cloudflare Pages build **SUCCESS** e deploy **SUCCESS**, ambiente `preview`. Configuração remota manteve `main` como produção com deployments automáticos desligados e previews automáticos desativados. Produção, Worker, D1, R2 e DNS inalterados.
- **QA responsivo da Home:** 320/390/768/1024/1280/1440 px sem overflow horizontal; grade em 2/2/3/4/6/6 colunas; seis imagens conferidas em `cover`, proporção 2:3.
- **NEXT_ACTION:** continuar a revisão detalhada pela página Sobre em 320/390/768/1440 px; manter PR #4 em draft e não refazer build por documentação.

## Rodada 15 — página Sobre e FAQ acessível (04/11/2026)

- O FAQ agora expõe o estado aberto/fechado com `aria-expanded`, liga cada botão ao painel correspondente e mantém foco visível dourado no teclado. A área de pergunta pode quebrar linha em celular; os alvos mantêm pelo menos 44 px de altura.
- **Quality Gate:** [#41926515835](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41926515835) **SUCCESS** no SHA `6287a342078f5b4bf6a47f29850e949d56e22cc1` (job aplicável concluído com sucesso; demais jobs condicionais ignorados).
- **Preview atualizado:** [abrir Sobre](https://5efaa52b.tonecosstudio.pages.dev/sobre), deployment `5efaa52b-44f1-44d3-b9b6-1c721b052974`; build e deploy **SUCCESS** no mesmo SHA, ambiente `preview`. As configurações de produção automática desligada e preview automático desativado foram preservadas.
- QA visual em 320/390/768/1440 px: sem overflow horizontal; valores e produção usam 1/1/2/4 e 1/1/2/3 colunas; FAQ manteve controles utilizáveis. Teste manual por Space abriu/fechou o painel, sincronizou `aria-expanded` e `hidden`, e exibiu o contorno de foco de 2 px. Nenhum erro no console.
- Sem alteração de produção, Worker, D1, R2 ou DNS. PR #4 segue draft. **NEXT_ACTION:** continuar pela página Contato, revisar o formulário por e-mail e responsividade em 320/390/768/1440 px.


## Rodada 16 — Contato responsivo no preview atual (04/11/2026)

- QA do componente público `PublicCatalogContact` no preview protegido mais recente, sem acionar o link `mailto:`.
- Em 320, 390, 768 e 1440 px, não houve overflow horizontal. Hero com 211/211/248/260 px; botão de e-mail 143×44 px; ações “Ver Modelos” 188×48 px e “Início” 116×44 px. As ações empilham no celular e ficam em linha a partir de 768 px.
- O texto explicativo quebra sem ultrapassar o card. Navegação por teclado mostrou contorno dourado de foco com 2 px no link de e-mail.
- Preview privado: [Contato](https://3bc09d16.tonecosstudio.pages.dev/contato), deployment `3bc09d16-0dff-41bf-91ae-e65712e95eb2`, build e deploy SUCCESS no SHA de código `446ab60396c96e64f31892d9bbf14253d0b96c57`. Nenhuma mensagem foi enviada; produção e Worker inalterados.
- **NEXT_ACTION:** revisar a rota 404 responsiva no preview atual. Manter a PR #4 draft e não gerar build por atualização documental.


## Rodada 17 — rota 404 pública responsiva (04/11/2026)

- A rota pública usa uma seção nomeada dentro do `main` de `ArcadeFrame`, sem `main` aninhado nem papel de status aplicado à página inteira. O conteúdo preserva a identidade arcade.
- Layout com 16 px de margem em telas estreitas, tipografia responsiva e link SPA com alvo mínimo de 44 px e foco visível.
- Preview privado: [abrir a rota 404](https://7f927529.tonecosstudio.pages.dev/__qa-not-found), deployment `7f927529-577e-43f8-95d4-f2a6cb24df03`, ambiente `preview`, commit de código `a05ed4cfa180092cf74964f563c64115edba8b34`; Pages build/deploy SUCCESS. Pipeline de preview executou typecheck, catálogo MVP (78 testes), verificações de segurança/proxy/SEO e Vite build.
- QA no navegador em 320/390/768/1440 px: sem overflow; larguras do documento 314/384/762/1434 px; exatamente um `main`; CTA “Ver modelos” com 130×44 px em todas as larguras. Foco de teclado confirmado com contorno dourado sólido de 2 px e offset de 2 px; console sem erros.
- Produção, Worker, D1, R2 e DNS inalterados. **Rodada concluída.**

## Rodada 18 — espaçamento responsivo em Termos (04/11/2026)

- Em `TermsArcadeView`, abaixo do breakpoint `sm`, a seção usa 16 px de margem interna, os cards 16 px de padding e a linha entre numeração e texto 12 px de gap. Em telas maiores permanecem os espaçamentos anteriores; texto legal preservado.
- Preview privado: [abrir Termos](https://cde8393a.tonecosstudio.pages.dev/termos), deployment `cde8393a-0488-4f07-98e0-f3097ee2db17`, ambiente `preview`, commit de código `f690bb237bdba91ab07bf143ca89fa82ed1b7acc`; Pages build/deploy SUCCESS.
- QA em 320/390/768/1440 px: sem overflow; largura do parágrafo 196/266/608/742 px e primeira regra em 7/5/2/2 linhas. CTA mede 198×48 px; console sem erros. A página mantém os sete tópicos e o contato legal.
- A captura automática de tela não ficou disponível nesta sessão; medições do layout e conteúdo foram conferidos no navegador. Produção e serviços do catálogo inalterados.

## Rodada 19 — espaçamento responsivo em Privacidade (04/11/2026)

- `PrivacyArcadeView` agora usa os mesmos espaçamentos responsivos de Termos: seção com `px-4 sm:px-6`, cards e contato com `p-4 sm:p-6`, linha com `gap-3 sm:gap-4`. Nenhum texto da política foi alterado.
- Preview privado: [abrir Privacidade](https://3c28acd5.tonecosstudio.pages.dev/privacidade), deployment `3c28acd5-66b2-47e0-acc4-3faebea77313`, ambiente `preview`, commit de código `4a51b38cfaac14c5bdff6d987e25f6e6d306a9aa`; build/deploy SUCCESS.
- QA em 320/390/768/1440 px: sem overflow; documento com 314/384/762/1434 px; parágrafos dos cards com 196/266/608/742 px e no máximo 9/6/3/2 linhas, respectivamente. Ações medem 198×48 px (“Ver Universo”) e 116×44 px (“Início”); console sem erros.
- Captura automática de tela indisponível por timeout no navegador desta sessão; árvore acessível, conteúdo e medidas de layout foram conferidos. Produção, Worker, D1, R2 e DNS inalterados. PR #4 segue draft.
- **NEXT_ACTION concluída:** `/modelos` e o painel Minha seleção foram revisados nas Rodadas 20–21; seguir pela próxima área com pendência concreta no catálogo, sem build só por documentação.


## Rodada 20 — grade, filtros e capas em /modelos (04/11/2026)

- QA na página do catálogo: 36 cards na primeira página, paginação mantida e seleção vazia por padrão. Em 320/390/768/1440 px: sem overflow e grade de 2/2/4/5 colunas.
- As imagens das capas carregam em `cover` no quadro 2:3. Busca e selects medem 48 px; o campo de busca por franquia mede 44 px.
- Os filtros são carregados sob demanda quando abertos. O select apresentou as seis categorias publicadas; “Marvel & DC” atualizou o parâmetro da URL e os resultados, e limpar restaurou `/modelos`.
- Preview privado de QA: [Modelos](https://3c28acd5.tonecosstudio.pages.dev/modelos), deployment `3c28acd5-66b2-47e0-acc4-3faebea77313`, build/deploy SUCCESS. Console sem erros; nenhuma seleção foi deixada salva.

## Rodada 21 — alvo de toque do painel Minha seleção (04/11/2026)

- O botão de fechar do componente compartilhado `SheetContent` media 16×16 px. `src/components/ui/sheet.tsx` agora oferece alvo de 44×44 px, preserva o foco visível e expõe o rótulo acessível “Fechar”.
- Preview privado: [abrir Modelos](https://6fa8ce1b.tonecosstudio.pages.dev/modelos), deployment `6fa8ce1b-6995-41b3-a2a8-b10c2bb88a70`, ambiente `preview`, commit de código `77856cba0e971948d2b2ee2d142139ccdf3b60a5`; build/deploy SUCCESS.
- Pipeline do Pages: typecheck, catálogo MVP `78/78`, verificação monorepo `9/9`, segurança/proxy/SEO `28/28`, Vite build e compilação da Pages Function concluídos.
- QA com o painel aberto em 320/390/768/1440 px: botão “Fechar” 44×44 px, com offset de 16 px do topo e da direita; painel sem overflow e com 320/390 px em mobile e 448 px em desktop. Fechar encerra o painel; seleção permaneceu vazia; console sem erros.
- Produção, Worker, D1, R2 e DNS inalterados. PR #4 segue draft.
- **NEXT_ACTION:** continuar a inspeção da próxima área pública do catálogo na mesma PR e só gerar nova prévia para alterações de código.

## Rodada 22 — alvos de toque em mobile e tablet (04/11/2026)

- **Branch/base:** PR #4 permanece open/draft em `integration/tonecosstudio-canonical-20261101`; base observada `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`. Código validado no SHA `6994e2d095eeed53cb6a09b6f6751a20c6ae6a16`.
- **Achado e correção:** no mobile, o link de marca do cabeçalho tinha 28 px de altura e os quatro links de navegação do rodapé próprio da Home tinham 12 px. Em 1024 px, a navegação desktop tinha links de 15 px. O logo, os links do menu desktop e os quatro links da Home agora têm área mínima de 44 px; rótulos e aparência visual foram preservados.
- **QA responsivo no preview:** Home, Modelos, Universo, Marvel & DC, Equipes e Grupos, ficha de Anjo, Sobre, Contato, Termos e Privacidade verificados em 320, 360, 390, 640, 768, 1024, 1440 e 1920 px. Nenhuma das 80 combinações apresentou rolagem horizontal. Em 320 px, marca/menu/links da navegação móvel têm 44 px; o botão de seleção da ficha tem 46 px e a miniatura da galeria 62 px. Em 1024 px, links da navegação desktop têm 44 px. O menu móvel abre com links de 44 px e fecha corretamente.
- **Fluxo de conteúdo:** a ficha de Anjo carregou e exibiu uma imagem publicada; console sem erros. A Home exibiu seis cards e nenhuma imagem quebrada entre as imagens carregadas.
- **Preview privado atual:** [abrir Home](https://693d03d5.tonecosstudio.pages.dev/), deployment `693d03d5-cf70-410f-b7fc-db95267e4c10`, ambiente `preview`, fonte SHA `6994e2d095eeed53cb6a09b6f6751a20c6ae6a16`; Cloudflare Pages build/deploy SUCCESS. O build configurado executa typecheck, `catalog:mvp:test` e `npm run build`.
- Produção, main, Worker, D1, R2 e DNS inalterados. A PR continua draft; sem merge/publicação.
- **next_action:** continuar QA visual página por página, incluindo filtros e galeria em diferentes larguras, e gerar nova prévia apenas após outra alteração de código.
- **do_not_repeat:** não gerar outra build por atualização documental; não ativar previews automáticos, alterar a main, Worker/D1/R2/DNS, SEO público ou produção; não misturar QA visual pendente de capas com a checagem responsiva de layout já concluída nesta rodada.

## Rodada 23 — continuidade responsiva: ficha, contato e Universo (05/11/2026)

- **Objetivo contínuo:** manter a revisão do frontend página por página na mesma PR #4 e no preview privado manual. O objetivo persistente já cobre essa continuidade; este checkpoint registra o próximo passo sem abrir meta duplicada.
- **Preview usado:** [Tonecos Studio](https://693d03d5.tonecosstudio.pages.dev/), ambiente privado, source code SHA `6994e2d095eeed53cb6a09b6f6751a20c6ae6a16`. Nenhuma mudança de código nesta rodada.
- **Ficha e galeria:** Aang, Appa & Momo abriu com a imagem publicada (1600 px de largura natural). Em 320/390/768/1024/1440 px, o documento não excedeu a viewport (larguras medidas: 314/384/762/1018/1434 px); imagem e ficha se ajustam, com duas colunas em 1024 px e acima. Botão de seleção, retorno e miniatura mantiveram alvos de pelo menos 44 px.
- **Universo:** em 320/390/768/1024/1440 px, sem overflow horizontal. A grade de categorias passou de 2 colunas no celular para 3 em 768 px e 4 a partir de 1024 px. As seis imagens das categorias carregaram; botões/links medidos mantêm 44 px ou mais.
- **Contato:** conferência adicional a 320 px sem overflow e sem alvos de toque abaixo de 44 px; nenhum link de e-mail foi acionado.
- Não houve correção de código necessária, novo build ou novo deployment. Produção, Worker, D1, R2 e DNS inalterados; PR #4 segue open/draft.
- **NEXT_ACTION:** auditar a página 2 de /modelos em 320/390/768/1024/1440 px, incluindo paginação, preservação de busca/filtros e tamanho dos alvos; alterar código e gerar preview novo apenas diante de um problema reproduzível.

## Backend — preflight M5 mais seguro (05/11/2026)

- **Escopo isolado do layout:** apenas `scripts/catalog/cutover-readiness.mjs`, respectivo teste e filtro por path do workflow Quality existente; nenhuma alteração na UI, no Worker staged, em Pages Function, D1/R2 ou segredos.
- **Correção:** o preflight agora exige ausência comprovada de runs `requested`, `waiting`, `pending`, `queued` e `in_progress` do publicador Washington; verifica repositório de destino, conta/Worker Cloudflare e evidência explícita de rollback. Estado desconhecido permanece bloqueado. A verificação só lê metadados GitHub/Cloudflare; nenhum deploy ou SQL.
- **Commits:** `3ba44a0` (preflight), `aab4f4d` (testes), `230623e` (acionamento do CI existente). PR #4 segue open/draft, base `fdd2992`. O gate na revisão `230623e` foi iniciado em [GitHub Actions #41969042567](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41969042567); **resultado ainda pendente no momento deste registro**.
- **NEXT_ACTION:** verificar os testes offline desse SHA. M5 segue BLOCKED até GO específico, controle exclusivo do writer Washington, evidência real de rollback e credenciais autorizadas; nenhuma promoção antecipada.
- **DO_NOT_REPEAT:** não abrir PR/branch extra, não refazer build frontend só por docs, não consultar D1/R2, não implantar Worker nem alterar main ou produção.

## Rodada 24 — paginação e alvos de busca em /modelos (05/11/2026)

- **Achado e correção:** o botão “Limpar busca” media 36×36 px. Em `src/pages/CatalogModelsArcade.tsx`, agora mede 44×44 px e tem contorno dourado de foco por teclado, com 2 px.
- **Commit de código:** `411088b71232221acac59014491667e9ed95cfbd` (`fix: enlarge mobile clear-search target`).
- **Preview privado:** [Modelos filtrado](https://ea55cd12.tonecosstudio.pages.dev/modelos?q=batman&category=marvel-dc), deployment `ea55cd12-7a7a-4ae6-93b2-469b91b8cad9`, ambiente `preview`; build e deploy SUCCESS no SHA do código. O build configurado executou typecheck, `catalog:mvp:test` e `npm run build`.
- **QA da página 1 e da página 2:** em 320/390/768/1024/1440 px, documento sem overflow (314/384/762/1018/1434 px), grade 2/2/4/4/5 colunas e 36 modelos por página. Limpar busca mede 44 px; paginação inferior mede 48 px. Não foram encontrados alvos abaixo de 44 px.
- **Fluxo conferido:** busca “batman” + categoria Marvel & DC chegaram à página 2 sem perder os parâmetros; limpar a busca por Enter removeu `q` e preservou `category=marvel-dc`, voltando à página 1. O foco do teclado no botão mostrou contorno dourado sólido de 2 px.
- Produção, Worker, D1, R2 e DNS inalterados. PR #4 segue open/draft; preview manual permanece privado.
- **NEXT_ACTION:** revisar os estados vazio e inválido da busca em 320–768 px; corrigir somente problemas reproduzíveis e manter o próximo passo na mesma PR.

## Rodada 25 — estados de busca e revisão mobile do acervo (05/11/2026)

- **Busca em `/modelos`:** `?q=ab` exibe a orientação para usar ao menos três caracteres; uma busca sem correspondências informa que nenhum modelo publicado atende aos filtros; `?q=` volta ao acervo completo com 36 modelos e 36 imagens. O botão de limpar aparece somente com texto na busca e mede 44×44 px.
- **QA responsivo da busca:** 320/390/768 px, largura do documento 314/384/762 px, sem overflow horizontal. Campos, filtros e botão Buscar medem de 44 a 48 px de altura; nenhum dos 36 cards estoura seu próprio container.
- **Fichas de modelo:** `/modelos/nier-10h-nier` e o título longo `/modelos/adao-negro-adao-negro-estatua-cinza-sobre-destrocos` conferidos em 320/390/768 px. Sem overflow; o título quebra em linhas; Voltar ao catálogo mede 44 px, Adicionar à seleção 46 px e seletor de imagem de 62 a 106 px.
- **Universos:** `/universo` e `/universo/marvel-dc/equipes-e-grupos` conferidos em 320/390/768 px. Sem overflow horizontal ou textos/cards transbordando; a página de grupos mostra 4 pastas e 8 modelos, com imagens `object-fit: cover` preenchendo os cards.
- **Preview privado verificado:** [Equipes e grupos](https://ea55cd12.tonecosstudio.pages.dev/universo/marvel-dc/equipes-e-grupos), deployment `ea55cd12-7a7a-4ae6-93b2-469b91b8cad9`, build/deploy SUCCESS no commit `411088b71232221acac59014491667e9ed95cfbd`. O arquivo da listagem de modelos no HEAD consultado tem o mesmo blob SHA do incluído nesse deployment. Os 17 commits entre ele e o HEAD `aa5055a32491e6571c64c8a370b4a0c24f22d0dc` alteram apenas documentação, configuração de consolidação, scripts/testes e workflow, sem mudança de frontend; não refiz o build por commits sem alteração visual.
- Não houve defeito reproduzível nesta rodada; nenhum arquivo de UI foi alterado. Produção, Worker, D1, R2 e DNS continuam inalterados. PR #4 permanece open/draft.
- **NEXT_ACTION:** localizar uma ficha com várias imagens publicadas e validar a galeria e seus alvos de toque em 320/390/768 px; depois continuar pelas páginas de categoria e detalhes do acervo, corrigindo somente problemas reproduzíveis.


## Rodada 26 — galeria, busca e preview atualizado (05/11/2026)

- **Atualização necessária:** a branch recebeu mudanças funcionais no proxy do Pages e no gateway público do catálogo depois do deployment `ea55cd12`. Criei uma nova prévia privada no commit `dfee04ad4459d84599a79bf8d5c5e2b1f09cfd5b`: [Tonecos Studio preview](https://188e1855.tonecosstudio.pages.dev), deployment `188e1855-62bc-4ecb-8188-b5d24e36fe6a`. Ambiente `preview`, com `VITE_PREVIEW_READ_ONLY=true` e `VITE_PUBLIC_CATALOG_MVP=true`; todos os estágios concluíram SUCCESS. Os logs confirmam `npm ci`, `npm run typecheck`, `npm run catalog:mvp:test` e `npm run build`. Não alterei Worker, D1, R2, DNS ou produção.
- **Ficha de quatro imagens:** `/modelos/dragon-ball-androide-18-traje-casual-frente` validada na prévia nova em 320/390/768 px. Documento 314/384/762 px, sem overflow; miniaturas de 62/79/106 px cabem na faixa. Selecionar a quarta miniatura atualiza o estado acessível e a imagem principal (asset carregado com 1600 px de largura).
- **Busca na prévia nova:** `?q=ab` mostra a orientação de mínimo de três caracteres; uma consulta sem correspondências mostra o estado vazio; `?q=` retorna 36 cards e 36 imagens. Em 320 e 768 px não há overflow horizontal.
- **Categoria na prévia nova:** `/universo/animes-desenhos` exibe 24 franquias e 24 imagens sem overflow em 320/390/768 px. A busca “dragon” retorna Dragon Ball (517 modelos); com dois caracteres, Buscar franquias permanece desabilitado. Console sem erros.
- PR #4 segue open/draft. O HEAD funcional do site corresponde ao commit implantado; este checkpoint altera apenas `URGENTE.md`. Produção e serviços auxiliares permanecem intactos.
- **NEXT_ACTION:** revisar `/universo/animes-desenhos/dragon-ball` em 320/390/768 px, incluindo listagem de modelos e retorno; continuar pelas demais categorias e corrigir apenas problemas reproduzíveis.

## Rodadas 27–28 — franquias Dragon Ball e Naruto, preview atualizado (05/11/2026)

**Meta contínua atualizada:** seguir pelas franquias públicas, conferindo navegação, pastas, modelos filtrados e paginação em 320/390/768 px; corrigir somente defeitos reproduzíveis na PR #4; publicar preview privado após mudanças funcionais e registrar a próxima rota aqui. Produção e recursos do Worker permanecem fora de escopo.

- **Preview privado exato:** [abrir Modelos — página 2](https://d6f94b5d.tonecosstudio.pages.dev/modelos?category=animes-desenhos&franchise=dragon-ball), deployment `d6f94b5d-2c43-431d-a05b-944e3cc17a23`, ambiente preview, commit `758f0fc465bb78ce04b64bb4d66f1cbfc528ae0f`. Build e deploy SUCCESS. Pipeline registrado nos logs: `npm ci`, `npm run typecheck`, catálogo MVP **79/79**, monorepo **9/9**, verificações de segurança/proxy/SEO **32/32**, Vite build e compilação da Pages Function. O novo teste confirma que erros upstream não recebem cache público; o proxy também aplica `Content-Security-Policy: sandbox`.
- **Dragon Ball:** raiz em 320/390/768 px sem overflow; 14 pastas e 8 referências com imagens carregadas. Grade de pastas 1/2/3 colunas; modelos 2/2/3. A subpasta Dragon Ball Super carregou Jiren e duas referências; breadcrumbs “Raiz da franquia” e “Dragon Ball Super” medem 44 px e o retorno à raiz funciona.
- **Modelos Dragon Ball:** páginas 1 e 2 mostram 36 modelos cada. Em 320/390/768 px, sem overflow (largura do documento 314/384/762 px) e grade 2/2/4. A página 2 começa em Bulma, mantém `category=animes-desenhos&franchise=dragon-ball` e carrega imagens pela rota first-party; retorno à página 1 preserva os filtros.
- **Naruto:** raiz com 18 pastas e 8 referências; Akatsuki com 11 subpastas e 8 referências visíveis. Nas duas rotas, 320/390/768 px sem overflow; grades de pastas 1/2/3 e de modelos 2/2/3. Breadcrumbs medem 44 px. “Explorar todos os modelos” preserva `category=animes-desenhos&franchise=naruto&folder=akatsuki`; a listagem apresenta 13 modelos e, em 320/390/768 px, grade 2/2/4 sem overflow. Console sem erros.
- Nenhum defeito de layout reproduzível encontrado nessas rotas; não houve mudança de UI nesta rodada. Preview é readonly. Produção, Worker, D1, R2 e DNS não foram alterados. PR #4 permanece open/draft.
- **NEXT_ACTION:** revisar `/universo/animes-desenhos/one-piece` e a listagem filtrada de One Piece em 320/390/768 px; continuar pelas próximas rotas com dados e navegação aninhada, corrigindo apenas problemas confirmados.

## Rodada 29 — franquia One Piece e modelos filtrados (05/11/2026)

- QA no preview privado atualizado [One Piece](https://d6f94b5d.tonecosstudio.pages.dev/universo/animes-desenhos/one-piece), deployment `d6f94b5d-2c43-431d-a05b-944e3cc17a23`, ambiente `preview`, código funcional `758f0fc465bb78ce04b64bb4d66f1cbfc528ae0f`. A PR #4 segue open/draft; o HEAD atual `2e6e074` acrescenta apenas este checkpoint documental. Não foi necessário novo build.
- Raiz de One Piece: **22 pastas e 8 referências**. Em 320/390/768 px, documentos de 314/384/762 px, sem overflow. Grade de pastas 1/2/3 colunas e referências 2/2/3. O rótulo longo “Akainu x Kizaru x Aokiji” cabe sem corte ou overflow; alvo da pasta é maior que 44 px.
- Pasta Luffy: 4 referências; dois breadcrumbs com 44 px; grade 2/2/3 sem overflow nas mesmas larguras. “Explorar todos os modelos” preserva `category=animes-desenhos&franchise=one-piece&folder=luffy`; a lista mostra 4 modelos e grade 2/2/4.
- Da raiz, “Explorar todos os modelos” preserva `category=animes-desenhos&franchise=one-piece` e exibe 27 modelos na página 1. Em 320/390/768 px, sem overflow, grade 2/2/4; as imagens visíveis carregaram. Console sem erros.
- Não encontrei problema de UI reproduzível; não houve alteração de código nesta rodada. Preview permanece readonly. Produção, Worker, D1, R2 e DNS inalterados.
- **NEXT_ACTION:** revisar a franquia de Animes & Desenhos com mais de 36 modelos (Tartarugas Ninja) a partir da busca/lista da categoria, conferindo pasta, busca e paginação responsiva em 320/390/768 px.

## Rodada 30 — Tartarugas Ninja, busca e página 2 (05/11/2026)

- QA no [preview privado do catálogo](https://d6f94b5d.tonecosstudio.pages.dev/universo/animes-desenhos/as-tartarugas-ninja), deployment `d6f94b5d-2c43-431d-a05b-944e3cc17a23`, código funcional `758f0fc465bb78ce04b64bb4d66f1cbfc528ae0f`. PR #4 continua open/draft; o HEAD `9fdf82c` contém apenas checkpoints documentais além desse código. Preview readonly; sem novo build.
- **Categoria e busca:** `/universo/animes-desenhos` lista 24 franquias. Em 320/390/768 px, documentos 314/384/762 px, grade 2/2/3, busca com 48 px e sem overflow; 24 imagens carregaram. A busca “Tartarugas Ninja” retorna a franquia correta com 44 modelos, e a abertura do resultado leva à rota canônica.
- **Franquia e pasta:** raiz de As Tartarugas Ninja com 14 pastas e 8 referências; sem overflow em 320/390/768 px, grades 1/2/3 e 2/2/3. Breadcrumb mede 44 px. A pasta Michelangelo abre 6 referências e preserva o contexto ao explorar Modelos; os breadcrumbs medem 44 px e a grade fica em 2/2/3 na pasta e 2/2/4 na listagem filtrada.
- **Paginação:** filtro `category=animes-desenhos&franchise=as-tartarugas-ninja` mostra 36 modelos na página 1 e 8 na página 2. A página 2 começa em Slash, mantém os filtros e carrega as 8 imagens. Em 320/390/768 px, as duas páginas não têm overflow (documento 314/384/762 px), com grade 2/2/4. O retorno à página 1 restaura os 36 itens. Console sem erros.
- Nenhum defeito de UI reproduzível; sem alteração de código nesta rodada. Produção, Worker, D1, R2 e DNS inalterados.
- **NEXT_ACTION:** revisar Star Wars na categoria `/universo/filmes-series` e no catálogo filtrado, incluindo a página 2 de 37 modelos, folders, busca e retorno em 320/390/768 px.
## Rodada 31 — Star Wars, busca, pastas e página 2 responsivas (05/11/2026)

**Meta contínua atualizada:** percorrer as franquias públicas priorizando volume e lacunas de navegação; revisar busca, pastas, listagens, paginação e retorno em 320/390/768 px; corrigir somente defeitos reproduzíveis; publicar preview privado para mudanças funcionais e registrar o próximo passo. Produção, Worker, D1, R2 e DNS seguem fora de escopo. Nenhuma migration Supabase foi executada.

- **Preview final:** [Star Wars — página 2](https://c292ea1c.tonecosstudio.pages.dev/modelos?category=filmes-series&franchise=star-wars), deployment `c292ea1c-4b77-4deb-8b0f-e49c7e9c88ee`, ambiente `preview`, código `dfe747943fa553e41e3bdf4c977beeb9140d2acc`. Build e deploy SUCCESS. O build executou `typecheck`, catálogo MVP **6/6 arquivos e 92/92 testes**, verificações existentes do Worker/proxy e `vite build`. O preview mantém `VITE_PREVIEW_READ_ONLY=true`.
- **Ajuste reproduzível:** a contagem da página passou a respeitar singular e plural (`1 modelo`, `36 modelos`) em `CatalogModelsArcade.tsx`. A primeira build da alteração revelou duas expectativas de teste com o texto antigo; ambas foram atualizadas em seguida e a build final passou.
- **Categoria e busca:** no preview anterior `ff6ba077` (commit `e3e8b47`), `/universo/filmes-series` exibiu 24 franquias; buscar “Star Wars” reduziu a grade a um resultado com 37 modelos. Em 320/390/768 px, documentos mediram 314/384/762 px, sem overflow; grade 2/2/3, 24 imagens carregadas e busca com 48 px.
- **Franquia/pasta:** Star Wars tem 18 pastas e 8 referências na raiz. A pasta Darth Vader exibe 8 referências; os dois breadcrumbs medem 44 px. Em 320/390/768 px, sem overflow; grades de pastas 1/2/3 e referências 2/2/3. “Explorar todos os modelos” preserva `category=filmes-series&franchise=star-wars&folder=darth-vader`; a listagem contém 8 modelos e usa grade 2/2/4.
- **Paginação no preview final `c292ea1c`:** página 1 com 36 modelos; página 2 com Yoda e o texto corrigido “1 modelo nesta página”. Em 320/390/768 px, sem overflow (documento 314/384/762 px), grade 2/2/4, imagem carregada e filtros de categoria/franquia preservados. Voltar retorna aos 36 modelos e mantém os filtros. Console sem erros.
- PR #4 permanece open/draft. O preview `c292ea1c` representa o frontend público validado no commit `dfe7479`; os commits posteriores observados nesta rodada tocaram documentação, serviço administrativo de orçamento e migrations Supabase, sem alterar as telas públicas. Nenhuma migration foi executada; produção, Worker, D1, R2 e DNS inalterados.

- **NEXT_ACTION:** revisar O Senhor dos Anéis (`/universo/filmes-series/o-senhor-dos-aneis`, 44 modelos), incluindo busca da categoria, pastas, listagem filtrada, página 2 e retorno em 320/390/768 px.

## Rodada 32 — O Senhor dos Anéis, pastas e paginação responsiva (05/11/2026)

- **Rotas conferidas:** raiz de O Senhor dos Anéis com 44 modelos, 24 pastas e 8 referências; Aragorn com 4 referências. Breadcrumbs medem 44 px. “Explorar todos os modelos” preserva categoria, franquia e pasta.
- **QA no preview anterior:** em 320/390/768 px, documentos de 314/384/762 px, sem overflow; grade de pastas 1/2/3 colunas e referências 2/2/3. A listagem filtrada mostra 36 modelos na página 1 e 8 na página 2. A página 2 preserva os filtros, carrega as 8 miniaturas e mantém a grade 2/2/4; voltar restaura a página 1.
- **Revalidação no preview final:** O Senhor dos Anéis foi conferido novamente em `7071d9e9`: as 24 pastas exibem as contagens no singular/plural corretos, inclusive “1 modelo”; raiz responsiva em 320/390/768 px, sem overflow. Na listagem, as páginas 1 e 2 preservam `category=filmes-series&franchise=o-senhor-dos-aneis`; página 2 tem 8 modelos e 8 imagens carregadas, sem overflow nas três larguras.

## Rodada 33 — contagem de pastas e prévia atualizada (05/11/2026)

**Meta contínua atualizada:** avançar pelos recortes do acervo com maior volume, conferindo navegação, subpastas, imagens, filtros, paginação e retorno em 320/390/768/1024/1440 px; corrigir apenas defeitos reproduzíveis na mesma PR; criar uma prévia privada para mudanças funcionais e registrar aqui o próximo foco. Produção, Worker, D1, R2 e DNS seguem fora de escopo; migrations Supabase continuam sem execução.

- **Defeito reproduzível corrigido:** pastas com uma peça mostravam “1 modelos”. `CanonicalUniverseFolders.tsx` agora pluraliza conforme a contagem. O teste de integração cobre “1 modelo” e “3 modelos”.
- **Build recuperado:** duas prévias iniciais revelaram falhas de TypeScript existentes na branch (entrada comercial ainda ausente, tipo de nota do RPC e uso de `replaceAll` incompatível com o alvo configurado). Ajustes mantiveram o caminho comercial desativado até existir uma entrada compilável e alinharam os tipos/formatação; nenhuma migration ou ação em produção.
- **Prévia final:** [Tonecos Studio — Equipes e Grupos](https://7071d9e9.tonecosstudio.pages.dev/universo/marvel-dc/equipes-e-grupos?folder=x-men/viloes), deployment `7071d9e9-64f7-4cb3-88ec-45fd42a60e69`, ambiente preview, commit de código `7fa188512e33d64254889525ff0ef0edaa97cda1`. Build e deploy SUCCESS; pipeline passou por typecheck, catálogo MVP **8/8 arquivos e 108/108 testes**, verificações existentes da Pages Function e build Vite. Preview permanece readonly.
- **Marvel & DC / Equipes e Grupos:** raiz com 4 pastas e 354 modelos. Guardiões da Galáxia tem 6 subpastas e 15 modelos; “Explorar todos os modelos” preserva `category=marvel-dc&franchise=equipes-e-grupos&folder=guardioes-da-galaxia`. Corrigi e confirmei “1 modelo”, “6 modelos” e demais plurais. Raiz, pasta e listagem filtrada sem overflow entre 320 e 1440 px; a listagem de Guardiões exibe 15 modelos.
- PR #4 continua open/draft. A branch recebeu depois do commit do preview `9c61145`, que só centraliza rotas comerciais e atualiza testes comerciais; não altera o frontend público conferido neste preview. Produção, Worker, D1, R2 e DNS inalterados.

## Rodada 34 — X-Men e subpasta Vilões (05/11/2026)

- **X-Men:** raiz de 208 modelos com 26 subpastas e 8 referências de prévia. A contagem singular funciona nas pastas com um item. Sem overflow em 320/390/768/1024/1440 px; breadcrumbs com 44 px. A listagem mantém categoria/franquia/pasta e mostra 36 modelos em cada uma das páginas 1 e 2; todas as 36 miniaturas da página 2 carregaram, sem falhas. Página 1 foi conferida em 320/390/768 px e página 2 nas cinco larguras.
- **Vilões:** 46 modelos, 10 subpastas e 8 referências. Os três breadcrumbs medem 44 px. Em 320/390/768 px, sem overflow; grades de pastas 1/2/3 e referências 2/2/3. A listagem mantém `folder=x-men/viloes`, com 36 modelos na página 1 e 10 na página 2; as 10 imagens da página 2 carregaram sem falhas e a grade ficou em 2/2/4 nas três larguras.
- Sem alteração adicional de layout necessária. O preview validado é readonly; nenhum dado comercial, banco ou serviço de produção foi alterado.


## Rodada 35 — Magneto e gate funcional orientado pela SSOT (05/11/2026)

**Meta contínua atualizada:** reduzir a validação manual rota a rota usando a fonte canônica e os componentes compartilhados. Automatizar a navegação e os contratos dos padrões de página; manter inspeção visual para uma amostra responsiva e para layouts/fluxos que realmente sejam diferentes. Depois avançar aos recortes restantes de Marvel & DC. Produção, Worker, D1, R2, DNS e migrations permanecem fora do escopo.

- **SSOT:** dados públicos continuam vindo do Worker pelo `public-catalog-gateway`; pastas e cards usam os mesmos componentes compartilhados. Não é necessário alterar cada rota separadamente.
- **Cobertura funcional ampliada:** `catalog:mvp:test` agora inclui os testes de descoberta canônica, pastas, rota de personagem e rota de detalhes: `CatalogArcade.integration.test.tsx`, `CanonicalUniverseFolders.integration.test.tsx`, `CatalogCharacterArcade.test.tsx` e `ModelDetailsRoute.test.tsx`. A execução do gate na [GitHub Actions #41985822399](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41985822399) passou: **12/12 arquivos, 121/121 testes**. A expansão detectou que a fixture de pastas não respeitava o contrato do Worker; IDs-filhos aninhados e `hasChildren: false` alinharam o teste à SSOT.
- **Limite da automação atual:** esses testes cobrem funcionamento e rotas, não renderização real em cada largura. A checagem visual continua em larguras representativas; a próxima melhoria de processo é automatizar um smoke de viewport por padrão de página, usando caminhos do catálogo canônico.
- **Prévia privada:** [Magneto no preview](https://ed77b38d.tonecosstudio.pages.dev/universo/marvel-dc/equipes-e-grupos?folder=x-men%2Fviloes%2Fmagneto), deployment `ed77b38d-4b97-43a9-9889-708df34112a5`, código público `c49f85380e37ca245dc05b4b319771050fde72de`; build e deploy SUCCESS. O preview continua readonly.
- **QA de Magneto:** a prévia atual mostra o caminho completo de breadcrumbs e 8 cards de referência. “Explorar todos os modelos” preserva categoria, franquia e pasta; a listagem filtrada contém **11 modelos**. Os componentes públicos usados nesta prévia são os mesmos da checagem responsiva anterior: em 320/390/768 px, larguras de documento 314/384/762 px, sem overflow; breadcrumbs de 44 px.
- PR #4 segue open/draft. HEAD observado `7076feb13968ae25795b634b5afc65901b614c02`; os commits posteriores ao código desta prévia tratam do fluxo administrativo/comercial e de uma migration Supabase ainda não aplicada. Nenhuma alteração em produção, Worker, D1, R2 ou DNS.

**NEXT_ACTION:** criar uma checagem de viewport automatizada por padrão compartilhado (início, universo/franquia/pasta, listagem filtrada e detalhes) com larguras 320/390/768/1024/1440 px e rotas selecionadas da SSOT; então revisar Batman (77 modelos) e seguir pelos próximos recortes.

## Rodada 36 — Universo, capas e contagens (05/11/2026)

**Meta contínua:** manter o frontend público responsivo por padrão compartilhado, usar o catálogo canônico/SSOT e corrigir somente problemas reproduzíveis. Próximo foco: categoria Games e uma navegação de franquia/pasta; não revisar manualmente cada URL quando o mesmo componente atende várias rotas.

- **Melhoria visual em `src/pages/CatalogArcade.tsx`:** capas de categorias e franquias agora ocupam toda a largura do card em quadro 4:3, com `object-cover` e zoom sutil no hover; título e contagem ficam em faixa própria. O layout preserva o estilo Arcade e melhora a leitura das miniaturas em mobile.
- **Defeito corrigido:** `formatModelCountLabel` é compartilhado entre categoria, franquia e pasta, removendo “1 modelos”. Na categoria Marvel & DC, Caçador de Marte e Constantine aparecem como “1 modelo”; os demais mantêm o plural. A busca por Caçador de Marte retorna o recorte canônico com a contagem correta.
- **Responsividade no preview final:** /universo e /universo/marvel-dc conferidos em 320, 390, 768, 1024 e 1440 px. Sem overflow horizontal; grades 2/2/3/4/4. Documento mediu 314/384/762/1018/1434 px. Alvos visíveis de interação com pelo menos 44 px.
- **Imagens:** 6/6 capas da raiz e 24/24 capas de Marvel & DC carregadas após percorrer a lista; zero imagens quebradas. Inspeção visual mobile confirma que o recorte preenche o card e mantém a figura principal legível.
- **CI no commit de código `566dd0733f6a3a37cb8b8811acd8d7f8ac47410c`:** GitHub Actions [Quality Gate #41991679782](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41991679782) concluído com sucesso; teste público MVP: 12 arquivos e 125 testes aprovados. A verificação monorepo, Worker offline, SQLite e Pages proxy também passaram.
- **Preview privado atualizado:** [abrir Universo](https://ef8ab5fb.tonecosstudio.pages.dev/universo), deployment `ef8ab5fb-b6af-4e07-b42b-b08fc5833439`, ambiente `preview`, código exato `566dd0733f6a3a37cb8b8811acd8d7f8ac47410c`, build e deploy SUCCESS. A prévia segue readonly.
- PR #4 continua open/draft. Nenhum deploy de produção, alteração no Worker, D1, R2, DNS ou migration Supabase nesta rodada. A autoridade do catálogo continua no Worker via `public-catalog-gateway`; não foi criada fonte paralela.

**NEXT_ACTION:** revisar `/universo/games`, testar busca por franquia e abrir uma pasta representativa em 320/390/768/1024/1440 px; reutilizar os mesmos padrões e corrigir somente diferenças observadas. Produção, Worker, D1, R2, DNS e migrations seguem fora do escopo.


## Rodada 37 — categorias do Universo e responsividade mobile (05/11/2026)

- **Alteração em `src/pages/CatalogArcade.tsx`:** a sentinela canônica `id=all` deixa de aparecer como card na raiz de `/universo`; o CTA **Ver todos os modelos** continua apontando para `/modelos`. A SSOT mantém categorias, contagens, IDs e capas. Para `animes-desenhos`, o rótulo de apresentação passa a “Animes e Desenhos” e usa `white-space: nowrap` com fonte fluida em telas estreitas.
- **Regressão coberta:** `CatalogArcade.integration.test.tsx` verifica remoção do card, permanência do CTA, texto de uma linha e navegação para a categoria. A primeira execução revelou apenas uma asserção sem espera pelo carregamento; o teste passou a esperar o título. Nenhum comportamento de catálogo/Worker foi alterado.
- **CI do HEAD visualizado `c413238f727e5ea59be1a41321f9df5b7c9f38f2`:** GitHub Actions [Quality Gate #41995982915](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41995982915) success; MVP frontend **16/16 arquivos e 148/148 testes**, além de typecheck e verificações offline do Worker/Pages.
- **Preview privado:** [abrir Universo](https://750f757a.tonecosstudio.pages.dev/universo), deployment `750f757a-ec1a-4aa0-af92-989b5d76138a`, ambiente preview, fonte exata `c413238f727e5ea59be1a41321f9df5b7c9f38f2`. Build e deploy Cloudflare Pages success; `VITE_PREVIEW_READ_ONLY=true`.
- **QA da raiz:** em 320/390/768/1024/1440 px, documento 314/384/762/1018/1434 px, sem overflow; grade 2/2/3/4/4. O título ficou em uma linha (9/10,92/12/12/12 px) e os seis cards de categoria não incluem “Todos”. O CTA segue disponível.
- **Continuidade no mesmo preview:** Games mostra 24 franquias com aviso de lista parcial e busca; grade 2/2/3/4/4, botão e campo de 48 px, sem overflow nas cinco larguras. Street Fighter mantém 24 pastas e oito referências de prévia; Akuma abre seis referências, breadcrumb mínimo de 44 px e filtros preservados em `/modelos?category=games&franchise=street-fighter&folder=akuma`. A pasta não teve overflow em 320/390/768/1024/1440 px.
- PR #4 permanece open/draft. Produção, Worker, D1, R2, DNS e migrations Supabase inalterados.

**NEXT_ACTION:** continuar a revisão do frontend pela Home (`/`) e fluxo responsivo de navegação para modelos; usar SSOT e os componentes compartilhados, corrigindo diferenças reproduzíveis e registrar a próxima prévia privada somente após mudança funcional.

## Rodada 38 — “Todos” removido e título responsivo em /universo (05/11/2026)

- Em `src/pages/CatalogArcade.tsx`, a grade da raiz omite apenas a categoria sentinela `id=all`; categorias, IDs, contagens e capas continuam vindos da SSOT pelo Worker. O CTA **Ver todos os modelos** permanece apontando para `/modelos`.
- O rótulo exibido **Animes e Desenhos** fica em uma linha com `white-space: nowrap`, fonte fluida de 10–14 px e espaçamento compacto no mobile. A regressão cobre a ausência do card, a presença do CTA e a rota correta.
- O teste de integração agora espera o carregamento assíncrono da categoria. Um ajuste separado, somente no setup de teste comercial, define `VITE_CATALOG_QUOTES_ENABLED` antes da importação do módulo; nenhum fluxo/runtime comercial mudou.
- QA no preview final em 320/390/768/1024/1440 px: sem overflow horizontal; largura do documento 314/384/762/1018/1434 px; grade 2/2/3/4/4; seis cards e título em uma linha. Também conferi 360/430/639/640 px sem overflow. A captura final no navegador confirma o CTA e a remoção do card “Todos”.
- GitHub Actions [Quality Gate #41998212637](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41998212637): **17/17 arquivos e 156/156 testes** aprovados, com os demais gates do workflow concluídos.
- Preview privado final: [abrir Universo](https://7e955bb9.tonecosstudio.pages.dev/universo), Cloudflare Pages deployment `7e955bb9-95d2-4f62-9b16-99e83be40a4e`, fonte exata `8f7935495819841e2e77702270165f1108d21798`, build/deploy SUCCESS e `VITE_PREVIEW_READ_ONLY=true`. Home também passou por QA nas larguras 320/390/768/1024/1440 sem overflow; a ficha 10H abriu pelo catálogo e exibiu conteúdo e imagem.
- Produção, Worker, D1, R2, DNS e migrations Supabase inalterados; a PR #4 continua draft.

**NEXT_ACTION:** finalizar QA responsivo de uma ficha de modelo no preview final em 320/390/768/1024/1440 px e então seguir pela listagem do catálogo. Reutilizar componentes e SSOT; criar nova prévia apenas após mudança funcional.

## Rodada 39 — ficha, listagem e pasta responsivas no preview (05/11/2026)

- Preview privado vigente: [abrir Universo](https://7e955bb9.tonecosstudio.pages.dev/universo), deployment `7e955bb9-95d2-4f62-9b16-99e83be40a4e`, fonte de código `8f7935495819841e2e77702270165f1108d21798`; `VITE_PREVIEW_READ_ONLY=true`. O Quality Gate [#41998212637](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41998212637) está concluído com sucesso para esse SHA (17 arquivos/156 testes). PR #4 continua draft; o HEAD atual `e4f86c221c4a3d16cace89518328640accd8bb71` contém o checkpoint documental, sem código novo.
- Ficha `/modelos/nier-10h-nier`: em 320/390/768/1024/1440 px, larguras do documento 314/384/762/1018/1434 px e nenhum overflow horizontal. A grade passa de uma coluna até 768 px para duas em 1024/1440 px. A imagem carregou (largura natural 1600 px); retorno 44 px e botão de seleção 46 px. Seleção permaneceu em 0/50.
- Listagem `/modelos`: 36 itens na primeira página; grade em 2/2/4/4/5 colunas nas cinco larguras, sem overflow. As seis primeiras imagens carregaram e não havia imagens quebradas; busca e botão 48 px, busca de franquias 44 px, paginação e acesso à seleção 44 px.
- Categoria `/universo/animes-desenhos`: 24 franquias na primeira leva, com aviso de lista parcial; grade 2/2/3/4/4 colunas, sem overflow. Campo e botão de busca têm 48 px, seis primeiras capas carregaram e o CTA mantém `/modelos?category=animes-desenhos`.
- Dragon Ball e `?folder=androides`: raiz com 14 pastas e 8 referências; Androides com 6 subpastas e 8 referências. Sem overflow nas cinco larguras. A grade de subpastas fica em 1/2/3/4/4 colunas e a de referências em 2/2/3/4/4. Breadcrumbs, “Explorar todos os modelos” e “Ver mais modelos” têm alvo de 44 px; o CTA preserva categoria, franquia e pasta em `/modelos`. As oito imagens de referência carregaram.
- Nenhuma falha reproduzível nesta inspeção; sem alteração de código ou novo build/deploy. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/marvel-dc/equipes-e-grupos` no mesmo preview em 320/390/768/1024/1440 px, observando títulos longos, imagens e navegação de retorno; reutilizar o componente e a SSOT.

## Rodada 40 — Equipes e Grupos / X-Men responsivos (05/11/2026)

- QA no preview privado vigente [em Equipes e Grupos](https://7e955bb9.tonecosstudio.pages.dev/universo/marvel-dc/equipes-e-grupos), source de código `8f7935495819841e2e77702270165f1108d21798`. A CI [#41998212637](https://github.com/tonecosstudio/tonecosstudio/actions/runs/41998212637) segue verde para esse código; PR #4 draft, HEAD documental `f3dcf1a940181db20156d5087c9f919fd24b5409`. Sem novo build.
- A raiz da franquia tem 4 pastas e 8 referências; em 320/390/768/1024/1440 px não houve overflow. As grades mudam progressivamente para 1/2/3/4/4 colunas nas pastas e 2/2/3/4/4 nas referências. O breadcrumb e as ações medem 44 px; “Explorar todos os modelos” preserva categoria e franquia.
- A pasta X-Men lista 26 subpastas e 8 referências; os nomes maiores incluem Charles Xavier, Homem de Gelo e Confrontos. Sem overflow nas cinco larguras; as grades ficam em 1/2/3/4/4 e 2/2/3/4/4 colunas. Breadcrumbs de raiz/franquia e CTA têm 44 px; filtros incluem `folder=x-men`.
- Na pasta X-Men/Vilões, 10 subpastas e 8 referências se mantêm sem overflow nas mesmas larguras. Grade de pastas 1/2/3/4/4, grade de referências 2/2/3/4/4, três breadcrumbs com 44 px e CTA com categoria/franquia/pasta preservadas. As 8 imagens de referência carregaram, sem falhas.
- Nenhum defeito reproduzível nesta família compartilhada; sem alterações de código. Produção, Worker, D1, R2, DNS e migrations permanecem inalterados.

**NEXT_ACTION:** revisar a raiz `/universo/marvel-dc` no preview em 320/390/768/1024/1440 px, conferindo a primeira leva de franquias, imagens e busca parcial; aplicar os mesmos componentes/SSOT.

## Frontend — Universo e franquias responsivas (05/11/2026)

- **Código validado:** commit `3623980eb4fc8084d3d82cdf8541feb756ee4f98` na branch `integration/tonecosstudio-canonical-20261101`, PR #4 draft; base main `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`.
- **Ajustes:** a raiz `/universo` não mostra a categoria agregada “Todos”, mantém “Ver todos os modelos” e exibe “Animes e Desenhos” em uma linha com tipografia fluida. Os títulos de franquia usam escala responsiva e limite de duas linhas; “Exterminador” e “Constantine” cabem inteiros em celular.
- **Preview privado atual:** https://f2ef62e9.tonecosstudio.pages.dev/universo — Cloudflare Pages deployment `f2ef62e9-7185-4665-ae33-0ea406d5bfd4`, commit de código `3623980`, ambiente `preview`; build e deploy **SUCCESS** pela configuração de preview (`typecheck`, `catalog:mvp:test`, `build`).
- **QA a 320 px:** documento com 314 px, sem overflow. Na raiz, o título Anime ocupa 109/109 px com `white-space: nowrap`; card “Todos” ausente e uma ação “Ver todos os modelos”. Marvel & DC e Animes e Desenhos têm 24 franquias em duas colunas, sem títulos excedendo a caixa.
- **QA a 1280 px:** Marvel & DC tem 24 franquias em quatro colunas; documento com 1274 px; sem overflow nos títulos.
- Captura da raiz mobile: `outputs/universo-preview-mobile-320.png`. Produção, Worker, D1, R2 e DNS inalterados; previews automáticos continuam desativados.

**NEXT_ACTION:** continuar em `/universo/animes-desenhos/dragon-ball`, revisar pastas e modelos no mobile/desktop e seguir pelas próximas franquias.
**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview atual; não gerar build para documentação isolada; não tocar na `main`, produção ou Worker.

## Rodada 41 — título de categoria em telas estreitas (05/11/2026)

- **Correção de frontend:** em `src/pages/CatalogArcade.tsx`, a fonte de “Animes e Desenhos” agora escala de 8 px a 14 px conforme a largura, mantendo `white-space: nowrap`. O card agregado “Todos” segue filtrado; a ação “Ver todos os modelos” permanece única. O teste de integração existente acompanha a classe responsiva.
- **Código publicado em preview:** commit `4009d3aee8a22d4dc7bdfc0b9202cf03b1259c1d`, branch `integration/tonecosstudio-canonical-20261101`, PR #4 draft, base `main` `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`.
- **Preview privado novo:** [abrir Universo](https://28272bc2.tonecosstudio.pages.dev/universo), Cloudflare Pages deployment `28272bc2-4a5f-48ea-b2e4-1c045ef90251`, ambiente `preview`, build e deploy **SUCCESS**. O build usa `typecheck`, `catalog:mvp:test` e `build`.
- **QA visual:** 280/320/360/390/768/1280 px, sem overflow horizontal. O título cabe integralmente no espaço interno do cartão em 280 px (`scrollWidth=clientWidth=89)); em 320–1280 px também permanece numa linha. Card “Todos” ausente e uma CTA “Ver todos os modelos”.
- A URL antiga `ef8ab5fb` servia conteúdo anterior; usar a nova URL de preview para esta revisão. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** continuar a revisão responsiva em `/universo/animes-desenhos/dragon-ball`, conferir pastas/modelos e navegação nos breakpoints móveis e desktop; seguir página por página na mesma PR.

**DO_NOT_REPEAT:** não apresentar `ef8ab5fb` como preview atual; não criar novo preview para documentação isolada; não alterar `main`, produção ou Worker.

## Rodada 42 — breadcrumbs canônicos e navegação Dragon Ball (05/11/2026)

- **Frontend:** `src/pages/CatalogArcade.tsx` obtém o nome da categoria pela lista canônica e resolve o nome da franquia por uma busca limitada à categoria/slug. Os breadcrumbs exibem os nomes publicados sem uma tabela local de franquias. O rótulo “Animes e Desenhos” continua consistente com o card da categoria.
- **Testes existentes:** atualizadas as expectativas de chamadas para refletir a leitura das categorias e preservar a busca de franquias; nenhum teste novo foi adicionado.
- **Preview privado:** [Dragon Ball](https://35dace08.tonecosstudio.pages.dev/universo/animes-desenhos/dragon-ball), deployment `35dace08-d3f3-4d43-b8b5-46d0a56990e9`, commit de código `037325392483cf1eeb2d92cff601b6666e415a37`, ambiente `preview`; build/deploy **SUCCESS** com o comando configurado (`typecheck`, `catalog:mvp:test`, `build`).
- **QA em /universo/animes-desenhos/dragon-ball:** 280/320/360/390/640/768/1024/1280/1440 px, sem overflow. 14 pastas e 8 referências; grades responsivas de pastas 1/2/3/4 colunas e referências 2/2/3/4 colunas. As 8 miniaturas carregaram. Em 320 px, documento 314 px.
- **Navegação:** pasta Androides tem 6 subpastas e 8 referências; Androide 18 tem 8 referências e trilha “Raiz da franquia / Androides / Androide 18”. “Voltar à pasta” da ficha preserva `folder=androides/androide-18`. Ficha do modelo sem overflow em 280/320/360/390/768/1024/1440 px.
- **Categoria:** `/universo/animes-desenhos` apresenta 24 franquias e busca; `dragon ball` encontra Dragon Ball e limpar restaura a listagem. O breadcrumb exibe “Animes e Desenhos”. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/one-piece` em mobile, tablet e desktop; verificar pastas, imagens e retorno às fichas. Depois avançar para outra categoria do Universo na mesma PR.

**DO_NOT_REPEAT:** usar `35dace08` como preview funcional mais recente; não gerar novo preview só por documentação; não alterar `main`, produção ou Worker.

## Rodada 43 — franquia One Piece responsiva (05/11/2026)

- QA em [One Piece no Universo](https://35dace08.tonecosstudio.pages.dev/universo/animes-desenhos/one-piece), preview privado build/deploy **SUCCESS** no código `037325392483cf1eeb2d92cff601b6666e415a37`. Breadcrumb usa “Animes e Desenhos / One Piece”.
- A raiz exibe 22 pastas e 8 modelos de referência. As 8 miniaturas carregaram; CTA de modelos tem 44 px.
- Em 280/320/359/360/390/639/640/768/1023/1024/1280/1440 px não houve overflow. Pastas refluem em 1/2/3/4 colunas e referências em 2/3/4 colunas. O título longo “Akainu x Kizaru x Aokiji” fica dentro de duas linhas.
- Sem alteração de código nesta rodada. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/naruto` em mobile, tablet e desktop; conferir pastas, miniaturas e retorno à ficha. Depois avançar pela categoria sem carregar páginas completas além do limite publicado.

**DO_NOT_REPEAT:** preview funcional é `35dace08`; não gerar build para documentação isolada; não alterar `main`, produção ou Worker.

## Rodada 44 — Universo: categorias e título mobile (05/11/2026)

- **Correção:** em `src/pages/CatalogArcade.tsx`, o filtro da raiz do Universo exclui a categoria agregada por ID e rótulo (“Todos” / “Todos os modelos”); a ação “Ver todos os modelos” continua como acesso à listagem. “Animes e Desenhos” mantém uma linha com tipografia fluida.
- **Preview privado final:** [abrir Universo](https://494e0ae6.tonecosstudio.pages.dev/universo), Cloudflare Pages deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, ambiente `preview`, source `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`; build/deploy **SUCCESS** pelo comando configurado (`typecheck`, `catalog:mvp:test`, `build`). O commit de código final é `fe13cf80`.
- **QA visual:** 280/320/360/390/640/768/1024/1440 px, sem overflow horizontal. Seis categorias, card “Todos” ausente, uma ação “Ver todos os modelos”. Título “Animes e Desenhos” com `white-space: nowrap`; em 280 px a caixa mede 89/89 px, em 320 px 109/109 px, e segue em uma linha nos demais tamanhos.
- A primeira tentativa de build no commit `7736a146` revelou uma expectativa antiga de classe CSS; mantive o estilo responsivo já validado e publiquei a versão final no commit acima.
- O preview antigo `ef8ab5fb` serve conteúdo anterior; usar a URL `494e0ae6` para esta revisão. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/naruto` no preview em telas móveis e desktop, incluindo miniaturas, pastas e retorno às fichas; seguir na mesma PR.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview atual; não gerar build para documentação isolada; não alterar `main`, produção ou Worker.

## Rodada 45 — franquias de Animes e Desenhos no mobile e desktop (05/11/2026)

- Preview usado: [Universo](https://494e0ae6.tonecosstudio.pages.dev/universo), deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, código `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`; build/deploy já aprovados. Sem novo build nesta rodada.
- `/universo/animes-desenhos` confirmou 24 franquias na primeira leva, duas colunas em 320 px, documento e scroll com 314 px; CTA “Ver todos os modelos” presente.
- `Cavaleiros do Zodíaco`: 23 pastas e 8 referências; em 280/320/390/768/1024/1440 px não houve overflow. Pastas em 1/1/2/3/4/4 colunas e referências em 2/2/2/3/4/4. O maior nome de pasta, “Shura de Capricórnio”, fica dentro do limite de duas linhas. As 8 imagens de referência carregaram.
- A pasta `folder=afrodite` lista 2 modelos. Raiz, pasta e CTA medem 44 px; o CTA preserva categoria, franquia e pasta. A ficha de Afrodite retorna ao caminho exato; imagem carregada (1600 px) e seleção permaneceu vazia. Pasta e ficha sem overflow nas seis larguras.
- `Demon Slayer`: 17 pastas e 8 referências; em 280/320/390/768/1024/1440 px sem overflow. Pastas em 1/1/2/3/4/4 colunas e referências em 2/2/2/3/4/4. O maior nome de pasta, “Sanemi Shinazugawa”, permanece dentro de duas linhas.
- `folder=sanemi-shinazugawa` lista 1 referência; breadcrumbs e CTA medem 44 px e preservam o caminho. A ficha retorna à pasta exata, sem overflow nas seis larguras; imagem carregada (794 px) e seleção permaneceu vazia.
- Sem defeito reproduzível nesta família; não foi necessária mudança de código. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/as-tartarugas-ninja` no mesmo preview em 280/320/390/768/1024/1440 px; conferir nomes, pastas, miniaturas e retorno às fichas.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview; não gerar build para documentação isolada; não alterar `main`, produção ou Worker.
## Rodada 46 — franquias de Animes e Desenhos: Tartarugas, Caverna e ThunderCats (05/11/2026)

- Preview reutilizado: [Universo](https://494e0ae6.tonecosstudio.pages.dev/universo), deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, código `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`. Nenhum build/deploy novo.
- `As Tartarugas Ninja`: 14 pastas e 8 referências; em 280/320/390/768/1024/1440 px sem overflow. Pastas em 1/1/2/3/4/4 colunas e referências em 2/2/2/3/4/4; 8/8 imagens carregadas.
- `folder=viloes`: 5 subpastas e 8 referências, sem overflow nas seis larguras; grade de pastas 1/1/2/3/4/4 e referências 2/2/2/3/4/4. `folder=viloes/destruidor`: 4 referências e 3 breadcrumbs; breadcrumbs e CTA com 44 px, filtro preservado. A ficha de Destruidor retornou à subpasta exata; imagem carregada (1079 px), sem overflow nas seis larguras e seleção vazia.
- `Caverna do Dragão`: 8 pastas e 8 referências; sem overflow nas seis larguras, pastas 1/1/2/3/4/4 colunas e referências 2/2/2/3/4/4. As 8 imagens carregaram. A pasta `mestre-dos-magos` tem uma referência; breadcrumbs/CTA têm 44 px e a ficha retorna ao caminho exato; imagem carregada (738 px), sem overflow nas seis larguras.
- `ThunderCats`: 12 pastas e 8 referências; em 280/320/390/768/1024/1440 px sem overflow. Pastas em 1/1/2/3/4/4 colunas, referências em 2/2/2/3/4/4; as 8 imagens carregaram. “Wilykit e Wilykat” permanece dentro do limite de duas linhas.
- Nenhum defeito reproduzível nesta rodada; sem mudanças de frontend. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/jujutsu-kaisen` no preview em 280/320/390/768/1024/1440 px; conferir pastas, miniaturas e retorno à ficha. Continuar sem carregar páginas além do limite canônico publicado.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview; não gerar build para documentação isolada; não alterar `main`, produção ou Worker.
## Rodada 47 — Jujutsu Kaisen e Fullmetal Alchemist responsivos (05/11/2026)

- Preview reutilizado: [Universo](https://494e0ae6.tonecosstudio.pages.dev/universo), deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, código `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`. Sem novo build/deploy.
- `Jujutsu Kaisen`: 13 pastas e 8 referências; em 280/320/390/768/1024/1440 px sem overflow. Pastas em 1/1/2/3/4/4 colunas e referências em 2/2/2/3/4/4; 8/8 imagens carregadas. “Sukuna e Feiticeiros” cabe no limite de duas linhas.
- `folder=yuta-okkotsu` lista 2 referências. Breadcrumbs e CTA medem 44 px e mantêm categoria, franquia e pasta. A ficha retorna ao caminho exato, sem overflow nas seis larguras; imagem carregada (800 px) e seleção permaneceu vazia.
- `Fullmetal Alchemist`: 4 pastas e 7 referências; em 280/320/390/768/1024/1440 px sem overflow. Pastas em 1/1/2/3/4/4 colunas e referências em 2/2/2/3/4/4; 7/7 imagens carregadas.
- `folder=lust` lista 2 referências. Breadcrumbs e CTA têm alvos de 44 px; a ficha de Lust retorna ao caminho exato. Ficha sem overflow nas seis larguras, imagem carregada (1600 px) e seleção permaneceu vazia.
- Sem defeito reproduzível nas duas franquias; sem mudança de frontend. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/pokemon` no mesmo preview em 280/320/390/768/1024/1440 px; conferir pastas, miniaturas e retorno à ficha.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview; não gerar build para documentação isolada; não alterar `main`, produção ou Worker.
## Rodada 48 — Pokémon responsivo (05/11/2026)

- Preview reutilizado: [Universo](https://494e0ae6.tonecosstudio.pages.dev/universo), deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, código `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`. Sem novo build/deploy.
- `/universo/animes-desenhos/pokemon`: 13 pastas e 8 referências; em 280/320/390/768/1024/1440 px sem overflow. Pastas em 1/1/2/3/4/4 colunas, referências em 2/2/2/3/4/4; 8/8 imagens carregadas. “Red Pikachu Charizard” fica dentro do limite de duas linhas.
- `folder=ash-e-pikachu` lista 1 referência. Breadcrumbs e CTA têm 44 px; o CTA preserva categoria, franquia e pasta. A ficha retorna ao filtro exato, sem overflow nas seis larguras; imagem carregada (1280 px) e seleção permaneceu vazia.
- Sem defeito reproduzível; sem mudança no frontend. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/bleach` no mesmo preview em 280/320/390/768/1024/1440 px; conferir pastas, miniaturas e retorno à ficha.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview; não gerar build para documentação isolada; não alterar `main`, produção ou Worker.
## Rodada 49 — Bleach responsivo (05/11/2026)

- Preview reutilizado: [Universo](https://494e0ae6.tonecosstudio.pages.dev/universo), deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, código `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`. Sem novo build/deploy.
- `/universo/animes-desenhos/bleach`: 9 pastas e 8 referências; em 280/320/390/768/1024/1440 px sem overflow. Pastas em 1/1/2/3/4/4 colunas e referências em 2/2/2/3/4/4; 8/8 imagens carregadas. “Ichigo e Zangetsu - The Blade Is Me” fica em até duas linhas.
- A pasta longa lista uma referência. Breadcrumb e CTA têm alvos de pelo menos 44 px (o breadcrumb mede 48 px em 280 px); o CTA preserva categoria, franquia e pasta. A ficha retorna ao caminho exato; imagem carregada (1600 px), sem overflow nas seis larguras e seleção vazia.
- Sem defeito reproduzível; sem mudança no frontend. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/dandadan` no mesmo preview em 280/320/390/768/1024/1440 px; conferir nomes longos, pastas, imagens e retorno à ficha.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview; não gerar build para documentação isolada; não alterar `main`, produção ou Worker.
## Rodada 50 — Dandadan responsivo (05/11/2026)

- Preview reutilizado: [Universo](https://494e0ae6.tonecosstudio.pages.dev/universo), deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, código `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`. Sem novo build/deploy.
- `/universo/animes-desenhos/dandadan`: 5 pastas e 8 referências; em 280/320/390/768/1024/1440 px sem overflow. Pastas em 1/1/2/3/4/4 colunas e referências em 2/2/2/3/4/4; 8/8 imagens carregadas. “Jin Enjoji Evil Eye” permanece em até duas linhas.
- `folder=momo-ayase` lista 4 referências. Breadcrumbs e CTA têm 44 px; o CTA preserva categoria, franquia e pasta. A ficha retorna ao caminho exato, sem overflow nas seis larguras; imagem carregada (1600 px) e seleção permaneceu vazia.
- Sem defeito reproduzível; sem mudança de frontend. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/solo-leveling` no mesmo preview em 280/320/390/768/1024/1440 px; conferir pastas, miniaturas e retorno à ficha.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview; não gerar build para documentação isolada; não alterar `main`, produção ou Worker.

## Rodada 51 — Solo Leveling responsivo (05/11/2026)

- Preview reutilizado: [Universo](https://494e0ae6.tonecosstudio.pages.dev/universo), deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, código `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`. Sem novo build/deploy manual.
- `/universo/animes-desenhos/solo-leveling`: 7 pastas e 8 referências expostas pelo recorte canônico. Em 280/320/390/768/1024/1440 px, sem overflow; pastas em 1/1/2/3/4/4 colunas e referências em 2/2/2/3/4/4. As 8/8 miniaturas carregaram.
- `folder=beru`: 3 referências, grade 2/2/2/3/4/4 nas mesmas larguras, sem overflow e 3/3 miniaturas carregadas. Breadcrumbs e CTA medem pelo menos 44 px.
- A ficha Beru carrega a imagem de 794 px, não apresenta overflow nas seis larguras e mantém a seleção vazia. O link “Voltar à pasta” abre novamente a URL exata `?folder=beru`. Console sem erros.
- Sem defeito reproduzível; sem mudança de frontend. Produção, Worker, D1, R2, DNS e migrations inalterados.

## Rodada 52 — Universo: card agregado e título responsivo (05/11/2026)

- Na página `/universo` da mesma prévia, o recorte exibe 6 categorias, sem card “Todos”, e mantém o CTA “Ver todos os modelos”.
- “Animes e Desenhos” aparece em uma linha nas seis larguras 280/320/390/768/1024/1440 px (`white-space: nowrap`, uma linha medida em cada largura); sem overflow horizontal. O CTA mede 44 px.
- O código já presente em `src/pages/CatalogArcade.tsx` corresponde ao preview; não foi criado commit funcional redundante nem novo deployment manual.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/boku-no-hero` no mesmo preview em 280/320/390/768/1024/1440 px; conferir pastas, miniaturas, texto longo e retorno à ficha.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview; não gerar build para documentação isolada; não alterar `main`, produção ou Worker.

## Rodada 53 — Boku no Hero responsivo (05/11/2026)

- Preview reutilizado: [Universo](https://494e0ae6.tonecosstudio.pages.dev/universo), deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, código `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`. Nenhum build manual.
- `/universo/animes-desenhos/boku-no-hero`: 12 pastas e 8 referências no recorte exibido. Em 280/320/390/768/1024/1440 px, sem overflow; pastas em 1/1/2/3/4/4 colunas, referências em 2/2/2/3/4/4, 8/8 imagens carregadas. “Camie Utsushimi” ocupa no máximo duas linhas (em 390 px) sem clipping.
- `folder=all-might`: 5 referências, grade 2/2/2/3/4/4 e 5/5 miniaturas carregadas nas seis larguras; sem overflow. Breadcrumbs e CTA têm alvo de 44 px.
- Ficha All Might: imagem carregada (924 px), sem overflow nas seis larguras, seleção vazia. “Voltar à pasta” restaurou o filtro exato `?folder=all-might`; console sem erros.
- Sem defeito reproduzível; sem mudança de frontend. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/fantasy` no mesmo preview em 280/320/390/768/1024/1440 px; conferir nomes longos, pastas, miniaturas e retorno à ficha.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview; não solicitar deploy manual para documentação isolada; não alterar `main`, produção ou Worker.

## Rodada 54 — Universo e ficha Fantasy responsivos (05/11/2026)

- `/universo` revalidado na prévia [494e0ae6](https://494e0ae6.tonecosstudio.pages.dev/universo), deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, código `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`: seis categorias, sem card “Todos”, CTA “Ver todos os modelos” com 44 px e “Animes e Desenhos” em uma linha em 280/320/390/768/1024/1440 px; sem overflow horizontal.
- `/universo/animes-desenhos/fantasy`: 24 pastas e 8 referências; em 280/320/390/768/1024/1440 px sem overflow. Pastas em 1/1/2/3/4/4 colunas, referências em 2/2/2/3/4/4; 8/8 imagens carregadas. Nomes longos permanecem dentro de duas linhas.
- `folder=wish-mystic-spirit`: 1 referência, CTA e breadcrumb com alvo de 44 px; caminho preservado. A ficha carrega imagem de 1024 px, mantém seleção vazia e não apresenta overflow nas seis larguras.
- A ficha longa recebeu ajuste tipográfico móvel em `src/pages/catalog/CanonicalModelDetails.tsx` (commit `279a3f62faf91f89c6b7fae7d3ea0b9ae2267638`): 24 px no celular, 30 px no breakpoint `sm` e 36 px a partir de `md`. A prévia ad hoc `23424c97` falhou antes de publicar: o job de testes registrou 5 falhas em 156, nas áreas comerciais de moedas/admin, com erro `tonecos_commercial_mvp_disabled` (151 passaram). Essa alteração ainda não tem validação visual em preview; a versão utilizável segue sendo `494e0ae6`. Sem alterações em produção, Worker, D1, R2 ou DNS.

## Rodada 55 — Frieren e Overlord responsivos (05/11/2026)

- Preview reutilizado: [Universo](https://494e0ae6.tonecosstudio.pages.dev/universo), deployment `494e0ae6-5dea-4b19-9487-37a80f9daa6d`, código `fe13cf80fd41248dcaf7dbdef391e91d49f2bbc0`.
- `Frieren`: 4 pastas e 6 referências; sem overflow nas seis larguras. Pastas em 1/1/2/3/4/4 colunas, referências em 2/2/2/3/4/4, com 6/6 imagens carregadas.
- `folder=fern`: 3 referências, grade 2/2/2/3/4/4 e 3/3 imagens carregadas. Raiz, pasta atual e CTA têm 44 px e preservam `?folder=fern`. Ficha Fern: imagem carregada (1280 px), seleção vazia, sem overflow e retorno à pasta exata.
- `Overlord`: 3 pastas e 6 referências; sem overflow nas seis larguras. Pastas em 1/1/2/3/4/4 colunas, referências em 2/2/2/3/4/4, com 6/6 imagens carregadas.
- `folder=albedo`: 4 referências, grade 2/2/2/3/4/4 e 4/4 imagens carregadas. Breadcrumbs e CTA têm alvos de 44 px e preservam `?folder=albedo`. Ficha Albedo: imagem carregada (1280 px), seleção vazia, sem overflow e retorno à pasta exata.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/ataque-de-tita` no preview `494e0ae6`, em 280/320/390/768/1024/1440 px; conferir pastas, miniaturas e retorno à ficha.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview; não solicitar build manual para atualizações somente de documentação; não alterar `main`, produção, Worker, D1, R2, DNS ou migrations.

## Rodada 56 — Universo mobile: títulos e grade responsiva (05/11/2026)

- Em `src/pages/CatalogArcade.tsx`, a grade de categorias fica em uma coluna até 359 px e passa a duas a partir de 360 px. “Animes e Desenhos” fica em uma linha: 14 px até 359 px e tipografia fluida a partir de 360 px.
- Preview publicado: [abrir Universo](https://e368e665.tonecosstudio.pages.dev/universo), deployment `e368e665-1e72-415b-9fa7-08837d2aa780`, branch `integration/tonecosstudio-canonical-20261101`, HEAD do deployment `f01c628c1cd77da827c0e5a43ba286101b3d363b`; build e deploy SUCCESS.
- QA visual em 280/320/359/360/390/640/768/1024/1440 px: sem overflow horizontal; grade de categorias 1/1/1/2/2/3/3/4/4 colunas; seis categorias, sem card “Todos”, CTA “Ver todos os modelos” com 44 px. Em 320 px o rótulo mede 14 px; em 360 px, 11,52 px e permanece em uma linha.
- A primeira tentativa de build encontrou uma expectativa antiga de breakpoint no teste de integração da página. Atualizei a expectativa para 360 px e repeti o fluxo; a segunda execução passou no typecheck, em 18 suites/161 testes, nos scripts de build (9/9 e 33/33), no Vite build e na publicação.
- Produção, Worker, D1, R2, DNS e migrations inalterados. A PR #4 continua draft.

**NEXT_ACTION:** revisar `/universo/animes-desenhos/ataque-de-tita` na prévia `e368e665`, incluindo miniaturas, pastas, retorno às fichas e larguras móveis/desktop.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview; para a página Universo, usar `e368e665`; não alterar `main`, produção, Worker, D1, R2, DNS ou migrations.

## Rodada 57 — Ataque de Titã e quadro de imagem mobile (05/11/2026)

- No preview [Ataque de Titã](https://c9c7835f.tonecosstudio.pages.dev/universo/animes-desenhos/ataque-de-tita), a rota carrega seis pastas e seis referências. QA visual em 280/320/360/390/640/768/1024/1440 px: grade de pastas em 1/1/2/2/3/3/4/4 colunas, breadcrumbs se ajustam às larguras menores e não há corte horizontal visível.
- folder=eren mostra a miniatura e mantém o filtro na navegação à ficha; “Voltar à pasta” retorna a /universo/animes-desenhos/ataque-de-tita?folder=eren.
- Commit [6cd0f2f](https://github.com/tonecosstudio/tonecosstudio/commit/6cd0f2fd155bbe6a8749ff885b95605a1a2c26eb) ajusta src/pages/catalog/CanonicalModelDetails.tsx: quadro da imagem com mínimo de 280 px em mobile, 360 px a partir de 640 px e 560 px a partir de 768 px. Na ficha Eren, a captura a 280 px reduziu o espaço vazio sem cortar a imagem; em desktop o quadro amplo foi preservado.
- Preview c9c7835f-7b37-4669-97a3-3e4cb6131c5e, build e deploy SUCCESS no commit 6cd0f2fd155bbe6a8749ff885b95605a1a2c26eb; typecheck, 18 suítes/161 testes e verificações 9/9 e 33/33 passaram.
- Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** revisar /universo/animes-desenhos em 280/320/360/390/640/768/1024/1440 px; conferir busca de franquias, nomes longos, capas e navegação para uma franquia.

**DO_NOT_REPEAT:** usar c9c7835f como preview atual; não gerar build para documentação isolada; não alterar main, produção, Worker, D1, R2, DNS ou migrations.

## Rodada 58 — Busca mobile em Games (05/11/2026)

- Base da PR #4: `main` @ `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`; HEAD: `c08a29f13560dbe24c701d94efb6a5d69f00bb4a` na branch `integration/tonecosstudio-canonical-20261101`.
- Em `src/pages/CatalogArcade.tsx`, o campo de busca e o botão passam a ocupar a largura da tela abaixo de 640 px; o formulário volta à linha a partir de `sm` e remove o mínimo fixo de 224 px do campo. O estado de carregamento agora diz “franquias” em rotas de categoria e “categorias” na raiz.
- Preview [Games](https://b5ce69e4.tonecosstudio.pages.dev/universo/games), deployment `b5ce69e4-c8bf-4c1f-acba-cb9336a65c03`, build e deploy SUCCESS no SHA `c08a29f13560dbe24c701d94efb6a5d69f00bb4a`. A busca por “Street Fighter” devolve a franquia correta e mantém “Limpar busca”.
- Conferência visual no preview em 1274 px; ainda falta captura em viewport móvel para esta busca. A classe mobile empilha campo e botão. PR #4 permanece draft. Produção, Worker, D1, R2, DNS e migrations inalterados.

**NEXT_ACTION:** validar a busca de franquias e a rota `/universo/games/street-fighter?folder=chun-li` em 280/320/360/390/640/768/1024/1440 px; conferir overflow, quantidade de colunas, miniaturas e retorno ao caminho anterior.

**DO_NOT_REPEAT:** usar `b5ce69e4` como preview atual; não usar `ef8ab5fb`; não gerar build para documentação isolada; não alterar `main`, produção, Worker, D1, R2, DNS ou migrations.


## Rodada 59 — Games, Filmes e Séries, Home e Sobre (05/11/2026)

- Base verificada: PR #4, branch `integration/tonecosstudio-canonical-20261101`, HEAD atual `1adc0a107e91778d3d98919221e7dc13cb0ac5d2`. A prévia ainda ativa é `440db22e`, deployment `440db22e-9ac3-4574-be7a-eea1341eeae4`, source SHA `6291ced2710b1dcb9a7dd655c8175e1a86c36a7d`.
- **Games / rodada 58 concluída:** em `/universo/games`, busca por “Street Fighter” retorna a franquia correta e o botão Limpar busca. Em 280/320/360/390/640/768/1024/1440 px, sem overflow; 24 cards, grade 2/2/2/2/3/3/4/4 colunas. Campo e botão ocupam a largura disponível no mobile.
- `/universo/games/street-fighter?folder=chun-li`: 8 referências e 8/8 miniaturas carregadas. Sem overflow em 280/320/360/390/640/768/1024/1440 px; grade 2/2/2/2/3/3/4/4. A ficha Chun Li carregou imagens de 1500 e 360 px; “Voltar à pasta” restaura a URL com `?folder=chun-li`.
- **Filmes e Séries:** `/universo/filmes-series` mostra 24 franquias em grade 2/2/2/2/3/3/4/4 nos mesmos breakpoints, sem overflow ou títulos cortados. No preview, 16 imagens lazy estavam carregadas no mobile e as 24 em 1440 px.
- `/universo/filmes-series/o-senhor-dos-aneis` apresenta 24 pastas; o caminho longo `folder=diorama-legolas-e-troll` cabe em 280/320/360/390/640/768/1024/1440 px sem overflow. A imagem do folder (600 px) e a ficha Legolas e Troll (1200 px) carregam; o retorno preserva a URL exata da pasta.
- **Home:** em 280/320/360/390/640/768/1024/1440 px, sem overflow; destaques e métricas mantêm grades responsivas e 6/6 imagens de destaque carregaram.
- **Sobre:** no preview atual, o cartão “Missão” usa 32 px de padding até no mobile; em 280 px a caixa tem 240 px, o parágrafo fica com 176 px e 319 px de altura (14 linhas). Commit [1adc0a1](https://github.com/tonecosstudio/tonecosstudio/commit/1adc0a107e91778d3d98919221e7dc13cb0ac5d2) ajusta o padding para `p-4 sm:p-6 md:p-12`; a fonte de página foi conferida no branch. Esta melhoria **ainda não aparece na prévia**.
- GitHub Actions [Quality Gate #42127675138](https://github.com/tonecosstudio/tonecosstudio/actions/runs/42127675138) terminou SUCCESS; apenas `Catalog Worker offline / no deploy` executou, e os jobs de build/teste do frontend foram pulados pelas condições do workflow. Nenhum teste foi executado manualmente.
- **Preview pendente:** o conector Cloudflare retornou `Unknown tool` para search/execute/whoami. O painel Cloudflare redirecionou para login Google SSO e a aba não tem sessão. Não inserir senha nem alterar produção; aguardar autenticação do proprietário ou restabelecimento do conector. Código permanece na PR #4 draft.

**NEXT_ACTION:** após restaurar o acesso Cloudflare, criar/repetir uma implantação **preview** para SHA `1adc0a107e91778d3d98919221e7dc13cb0ac5d2`; verificar o cartão Missão em 280/320/360/390/640/768/1024/1440 px, registrar largura/altura/linhas antes e depois, e então seguir pela página Contato.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` como preview; não chamar produção, Worker, D1, R2, DNS ou migrations; não gerar build para atualização documental isolada.


## Rodada 60 — Contato e páginas legais revalidadas (05/11/2026)

- Base atual: PR #4 aberta/draft, branch `integration/tonecosstudio-canonical-20261101`, HEAD `7004549d0b4058f2edf76604c2260379fe27d31a`, base `main` @ `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`.
- Prévia reutilizada: [440db22e](https://440db22e.tonecosstudio.pages.dev), source SHA `6291ced2710b1dcb9a7dd655c8175e1a86c36a7d`. Os blobs de `PublicCatalogContact.tsx`, `TermsArcadeView.tsx` e `PrivacyArcadeView.tsx` são iguais no source da prévia e no HEAD da PR.
- `/contato`: QA em 280/320/360/390/640/768/1024/1440 px, sem overflow horizontal. Link de e-mail 143×44 px; ações “Ver modelos” 188×48 px e “Início” 116×44 px. O link de e-mail não foi acionado.
- `/termos`: QA em 280/320/390/768/1024/1440 px, sete tópicos e sem overflow horizontal. Ações “Ver Universo” 198×48 px e “Início” 116×44 px.
- `/privacidade`: QA em 280/320/390/768/1440 px, sete tópicos e sem overflow horizontal. Ações “Ver Universo” 198×48 px e “Início” 116×44 px.
- Sem defeito reproduzível nessas três páginas; não foi necessário alterar frontend nem rodar testes.
- A diferença funcional do HEAD para a prévia continua na página Sobre: o patch de padding mobile de `AboutArcade.tsx` ainda não foi publicado. O conector Cloudflare permanece indisponível (“Unknown tool”); sem sessão autenticada para criar preview nesta rodada. Produção e Worker permanecem inalterados.

**NEXT_ACTION:** quando o acesso Cloudflare do proprietário ou o conector estiver disponível, criar preview do HEAD `7004549d0b4058f2edf76604c2260379fe27d31a` e verificar o cartão Missão em 280/320/360/390/640/768/1024/1440 px; depois continuar a inspeção da rota pública seguinte.

**DO_NOT_REPEAT:** não usar `ef8ab5fb` (preview antigo); reutilizar `440db22e` apenas para páginas cujos blobs foram confirmados iguais ao HEAD; não criar build somente por documentação; não alterar `main`, produção, Worker, D1, R2, DNS ou migrations.


## Rodada 61 — Sobre e Home: revisão mobile (05/11/2026)

- Base da PR #4: `main` @ `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`. HEAD do código validado: `a3898a387d0618ab64ff1cf0bb32dd129171c76e` na branch `integration/tonecosstudio-canonical-20261101`.
- Prévia atual: [`a05fa1d7`](https://a05fa1d7.tonecosstudio.pages.dev), deployment `a05fa1d7-41c8-4e9c-a604-0a1b107c49ac`, source SHA exato `a3898a3`, build e deploy SUCCESS. Cloudflare Pages executou `typecheck`, `catalog:mvp:test` (18 suítes/161 testes), `build`; GitHub Quality Gate [#42135488076](https://github.com/tonecosstudio/tonecosstudio/actions/runs/42135488076) SUCCESS. Produção, Worker e configuração de auto deploy inalterados.
- **Sobre:** o ajuste já existente em `AboutArcade.tsx` reduz o cartão Missão para `p-4 sm:p-6 md:p-12`. Na prévia final, em 280 px o parágrafo mede 208×250 px (11 linhas), contra 176×319 px (14 linhas) na prévia antiga; em 320 px mede 248×182 px. QA em 280/320/359/360/390/414/640/768/1024/1440 px, sem overflow horizontal. Botões do FAQ têm alvos de 56–64 px.
- **Home:** `LandingPage.tsx` agora escala os valores dos indicadores de 18–24 px no mobile e usa rótulos de 8/9 px; a partir de 640 px os rótulos usam 10 px. Em 280–414 px, “Sob Encomenda” ocupa uma linha. A primeira medição revelou overflow interno de 4 px em 640 px; o breakpoint foi ajustado no commit `a3898a3`. QA final em 280/320/359/360/390/414/640/768/1024/1440/1920 px, sem overflow horizontal.
- **NEXT_ACTION:** revisar `/modelos` e uma ficha do catálogo nas mesmas larguras móveis e de desktop; observar campo de busca, cards, paginação, galeria e retorno ao contexto anterior.
- **DO_NOT_REPEAT:** não usar `ef8ab5fb` ou `440db22e` como preview atual; não gerar build para documentação isolada; preservar preview automático `none` e produção automática desativada; não alterar produção, Worker, D1, R2, DNS ou migrations.

## Rodada 62 — Semântica do landmark Universo e categoria Marvel & DC (05/11/2026)

- Base da PR #4: `main` @ `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`; HEAD funcional `7c23435086a76602bc5ee0b707cbcf4fa9653d3b` na branch `integration/tonecosstudio-canonical-20261101`. PR segue aberta e draft.
- Em `src/components/layouts/ArcadeFrame.tsx`, a aplicação já fornece o único marco `main`. A rota Universo criava outro `main` por dentro; no preview anterior, a árvore acessível confirmou dois marcos aninhados. O commit `7c23435` troca o contêiner interno em `src/pages/CatalogArcade.tsx` por `div`, preservando estilos e estrutura. O código do HEAD não possui mais elemento `main` nessa página.
- QA visual da prévia anterior `0dfc5f86` (source `6634f267`, anterior à correção semântica): `/universo/marvel-dc/equipes-e-grupos` mostra 4 pastas e 8 referências; a pasta `x-men/viloes` mostra 10 subpastas e 8 referências, com 8/8 imagens carregadas. Raiz e pasta passaram em 280/320/359/360/390/414/640/768/1024/1440/1920 px sem overflow; grades de pastas 1/1/1/2/2/2/3/3/4/4/4 colunas, miniaturas 2/2/2/2/2/2/3/3/4/4/4; breadcrumbs e CTAs medem 44 px.
- `/universo/marvel-dc`: 24 franquias em grade 2/2/2/2/2/2/3/3/4/4/4 nos mesmos breakpoints, sem overflow; busca e botão medem 48 px e ocupam a largura disponível no mobile. Em 320 px, “batman” retorna Batman e Limpar busca restaura as 24 franquias.
- GitHub Actions Quality Gate [#42141423538](https://github.com/tonecosstudio/tonecosstudio/actions/runs/42141423538) concluiu SUCCESS; o job offline concluiu suas etapas, incluindo “Test public MVP frontend and catalog navigation”. Os jobs de build frontend foram pulados. Não rodei testes manualmente.
- A integração Cloudflare retornou `Unknown tool` ao buscar endpoints; ainda não há preview para o SHA `7c23435`. O preview `0dfc5f86` continua servindo o SHA anterior `6634f26`; produção, Worker, D1, R2, DNS e migrations não foram alterados.

**NEXT_ACTION:** após o conector Cloudflare voltar, publicar uma prévia do HEAD funcional `7c23435` e confirmar um único marco main na rota Universo; depois continuar pela próxima rota pública do catálogo.

**DO_NOT_REPEAT:** não usar `ef8ab5fb`; não tratar `0dfc5f86` como prévia do HEAD atual; não gerar build apenas por mudanças documentais; não alterar `main`, produção, Worker, D1, R2, DNS ou migrations.

## Rodada 63 — Títulos completos nos cartões de referência (05/11/2026)

- Base PR #4: `main` @ `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`; HEAD funcional `834e86124afda276a4fda24e9b572b05443eea38` na branch `integration/tonecosstudio-canonical-20261101`. PR aberta/draft.
- Na rota `/universo/animes-desenhos/cavaleiros-do-zodiaco`, a prévia visual anterior `0dfc5f86` (source `6634f26`) mostrou 23 pastas e 8 referências. QA em 280/320/359/360/390/414/640/768/1024/1440/1920 px: sem overflow; grades 1/1/1/2/2/2/3/3/4/4/4 para pastas e 2/2/2/2/2/2/3/3/4/4/4 para referências; breadcrumb e CTA de exploração com 44 px.
- Achado reproduzível em 280 px: “Aspros de Gêmeos” tinha 72 px de altura de conteúdo, mas o cartão limitava o título a 48 px em duas linhas, escondendo a terceira linha. O commit `834e861` altera o componente compartilhado `src/pages/catalog/CanonicalUniverseFolders.tsx` para `line-clamp-3 sm:line-clamp-2` nos nomes dos modelos. Isso preserva o nome inteiro em cartões estreitos e volta a duas linhas com largura maior, sem edição manual por página.
- GitHub Actions Quality Gate [#42143296058](https://github.com/tonecosstudio/tonecosstudio/actions/runs/42143296058) concluiu SUCCESS. O job offline concluiu suas etapas, incluindo “Test public MVP frontend and catalog navigation”; os jobs dedicados ao build frontend foram pulados. Nenhum teste foi executado manualmente.
- A integração Cloudflare retornou `Unknown tool`; ainda não há preview do SHA `834e861`. O preview `0dfc5f86` continua servindo o código anterior `6634f26`; produção, Worker, D1, R2, DNS e migrations permanecem inalterados.

**NEXT_ACTION:** quando o conector Cloudflare voltar, criar uma prévia privada do HEAD `834e861` e confirmar em 280/320/360/390 px que “Aspros de Gêmeos” está inteiro; então seguir para a próxima franquia ou página de catálogo.

**DO_NOT_REPEAT:** não usar `ef8ab5fb`; não tratar `0dfc5f86` como prévia do HEAD atual; não gerar build só por documentação; não alterar `main`, produção, Worker, D1, R2, DNS ou migrations.
