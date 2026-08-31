# URGENTE — prontidão para lançamento

Status: **EM EXECUÇÃO — NO-GO para lançamento**  
Atualizado em: **2026-08-30 (America/Bahia)**  
Branch operacional: **main somente**  
Base histórica da auditoria: `792e6f882e298fe38bfc57b4025ad09ca631acf9`  
HEAD funcional auditado antes deste checkpoint: `25b384b2f31f4b4712b55e1f2d619f9fe2c9f945`

Este arquivo é o **SSOT operacional** da preparação para lançamento do ORDAX. Ele descreve o estado atual, os bloqueios reais, as provas existentes e a próxima ordem de execução.

Percentuais antigos, documentos de fase, comentários, screenshots ou afirmações como “pronto”, “85%” ou “100% seguro” não contam como prova de lançamento.

Os checkpoints 0–8 da versão anterior deste documento permanecem preservados no histórico Git em `main@25b384b2f31f4b4712b55e1f2d619f9fe2c9f945` e nos commits anteriores. Eles não são repetidos aqui para evitar transformar o SSOT atual em arquivo histórico.

## 1. Objetivo

Entregar o ORDAX como produto publicável, profissional e verificável:

- repositório limpo e com autoridade documental única;
- build determinístico e dependências controladas;
- CI executável e prova por commit;
- Supabase, autenticação, Storage, pagamentos e funções com segurança comprovada;
- catálogo e fluxos essenciais funcionais no ambiente publicado;
- interface coerente, responsiva, acessível e sem dados demonstrativos mascarando falhas;
- configuração comercial fail-closed;
- release versionada, observável e reversível.

## 2. Decisões operacionais vigentes

1. Trabalhar diretamente na `main`, conforme instrução explícita do usuário.
2. Não criar branch ou PR novo sem nova instrução explícita.
3. Fazer commits pequenos e reversíveis.
4. `URGENTE.md` é a autoridade de status; `AGENTS.md` é o contrato de continuidade.
5. Não apagar evidência histórica necessária; remover do estado atual apenas material comprovadamente obsoleto ou concorrente, deixando o Git preservar a versão anterior.
6. Não declarar lançamento, segurança ou qualidade aprovados sem prova reproduzível.
7. Frontend nunca é fronteira suficiente de autorização.
8. Preço, crédito, disponibilidade, pagamento e permissão devem falhar fechados quando a fonte oficial não puder ser validada.
9. Segredos, `service_role`, chaves privadas e credenciais nunca podem entrar em `VITE_*` nem no bundle do navegador.
10. Migração remota, reativação paga ou deploy de produção exigem contexto operacional próprio; código versionado não equivale a mudança aplicada remotamente.

## 3. Estado atual resumido

| Área | Estado | Evidência / consequência |
| --- | --- | --- |
| Branch de trabalho | **main somente** | referências antigas podem existir, mas não são usadas para esta execução |
| Proteção da main | **PENDENTE** | branch continua `protected=false` e sem checks obrigatórios |
| Quality Gate | **BLOQUEADO NA INFRA** | workflow existe, mas o job mais recente terminou com `runner_id=0` e `steps=[]` |
| Runtime | **Node 24.x canônico** | manifesto, `.nvmrc`, CI e Vercel foram alinhados |
| Pacote | **ordax-web@0.1.0** | identidade genérica do template removida |
| Package manager | **AINDA NÃO CONSOLIDADO** | `package-lock.json`, `bun.lock` e `bun.lockb` permanecem até `npm ci` real provar a cadeia npm |
| Raiz/documentação | **MELHORADA** | raiz histórica foi reduzida, `AGENTS.md`/`README.md`/`URGENTE.md` são canônicos e o spec `.kiro` concorrente foi removido |
| Catálogo mock | **REMOVIDO DO RUNTIME** | serviço de produção não possui fallback para catálogo demonstrativo |
| Preço avulso | **FAIL-CLOSED NO CÓDIGO** | compra não oferece preço inventado quando RPC/configuração falha |
| Planos/assinatura | **FAIL-CLOSED NO CÓDIGO** | preços, entregas e credits inválidos são rejeitados antes da oferta; UI possui erro/retry |
| Comprovante de assinatura | **HARDENING VERSIONADO, NÃO PROVADO REMOTAMENTE** | upload exige autenticação, retorna object path privado e migration adiciona bucket privado/RLS por usuário |
| Supabase remoto | **BLOQUEADOR** | projeto observado anteriormente estava inativo; migrations/policies atuais ainda precisam ser comparadas e aplicadas no ambiente correto |
| Vercel/smoke visual | **SEM PROVA ATUAL** | mudanças ainda precisam de build publicado e verificação real desktop/mobile |
| Lançamento | **NO-GO** | CI, banco remoto, E2E, segurança remota e release engineering ainda não têm prova suficiente |

## 4. Trabalho concluído na preparação atual

### 4.1 Governança e estrutura

- [x] inventário inicial de repositório, branches, documentação, Actions, site e Supabase;
- [x] criação de `AGENTS.md` e `URGENTE.md` como contrato/SSOT;
- [x] limpeza da raiz e arquivamento do material histórico principal;
- [x] remoção do `.lnk` operacional antigo;
- [x] movimentação de launcher/instruções antigas de Telegram para área legacy;
- [x] remoção do spec `.kiro/specs/final-production-readiness` sem referências ativas;
- [x] remoção de identidade de template do `package.json`;
- [x] adoção de Node 24.x como runtime canônico;
- [x] criação de Quality Gate versionado;
- [ ] restaurar execução real do Quality Gate;
- [ ] proteger `main` e exigir checks depois que o gate executar de verdade.

### 4.2 Dados falsos, placeholders e mocks

- [x] removido mock de catálogo do serviço usado em produção;
- [x] removidas variáveis `VITE_CATALOG_WEBP_MOCK*`;
- [x] removido gerador de site mock de catálogo;
- [x] removidos SVGs de placeholder de produto sem uso e criado fallback neutro;
- [x] substituído `placeholder.svg` de Open Graph por asset social real;
- [x] removidos defaults inventados de perfis sociais, telefone, CNPJ e endereço;
- [x] removida versão visual `v2.0` sem correspondência com o pacote;
- [x] busca atual por `TODO/FIXME/HACK/XXX` não encontrou ocorrências indexadas;
- [ ] continuar inventário de feature flags, rotas legadas, duplicidades e conteúdo histórico em `docs/`.

### 4.3 Preços e assinatura

- [x] compra avulsa bloqueia oferta quando preço oficial não pode ser validado;
- [x] `pricing-settings-service` não converte falha comercial em preço fixo;
- [x] preços obrigatórios são validados como finitos e coerentes;
- [x] plano ativo é rejeitado se preço, entregas ou credits forem inválidos;
- [x] `PlansArcade` exibe estado de indisponibilidade/retry em vez de preço fallback;
- [x] `SubscribeCollection` não inventa mais coins, preço contextual ou economia fixa;
- [x] tela de assinatura não apresenta `R$ 0,00` como estado transitório de carregamento;
- [x] checkout final continua usando RPC server-side e IDs validados;
- [ ] executar testes automatizados e E2E quando o runner/ambiente estiverem disponíveis.

### 4.4 Comprovantes de pagamento

- [x] upload de assinatura exige usuário autenticado mesmo quando `userId` não é passado pelo componente;
- [x] caminho versionado: `subscriptions/<auth.uid()>/<timestamp>-<token>.<ext>`;
- [x] componente retorna **object path privado**, não `getPublicUrl()`;
- [x] README antigo que ensinava bucket público e leitura pública foi substituído;
- [x] migration `20260831011000_secure_payment_voucher_storage.sql` configura `payment-vouchers` como privado, 5 MB e MIME JPEG/PNG/PDF;
- [x] migration adiciona RLS de leitura do proprietário/admin, insert do proprietário e delete do proprietário/admin;
- [x] RPC valida formato do object path e exige que o usuário embutido seja `auth.uid()`;
- [x] o corpo privilegiado permanece em `private_api` e o wrapper `public` permanece `SECURITY INVOKER`;
- [x] novos checkouts persistem `payment_voucher_path` e não uma URL pública;
- [x] registros legados continuam revisáveis durante a transição;
- [x] testes do componente foram reescritos para o contrato privado;
- [ ] provar migration, RLS e acesso admin no Supabase remoto correto;
- [ ] definir/consolidar a arquitetura entre `payment-vouchers` e o fluxo mais completo `payment-proofs`;
- [ ] garantir malware scan/quarentena em fronteira server-side para uploads que exigirem essa proteção.

## 5. Plano restante por prioridade

### P0 — CI e prova básica

Estado: **BLOQUEADO POR GITHUB ACTIONS / RUNNER**

- [ ] resolver por que `ubuntu-latest` não recebe runner;
- [ ] executar `npm ci` com Node 24;
- [ ] executar `format:check`;
- [ ] executar `typecheck`;
- [ ] executar `lint`;
- [ ] executar auditoria Supabase estática;
- [ ] executar cobertura/testes;
- [ ] executar build;
- [ ] executar `npm audit` e corrigir high/critical de forma controlada;
- [ ] somente após `npm ci` real, consolidar npm e remover lockfiles Bun concorrentes se não forem necessários.

Critério de saída: Quality Gate verde em um commit exato da `main`.

### P1 — Estrutura, legados e documentação

Estado: **EM EXECUÇÃO**

- [ ] revisar `docs/` e mover guias vigentes para `docs/operations` ou `docs/setup`;
- [ ] eliminar links quebrados e duplicidades documentais restantes;
- [ ] revisar os múltiplos templates `.env*` e deixar clara a finalidade de cada um;
- [ ] remover ou arquivar configurações de ferramentas órfãs;
- [ ] documentar arquitetura atual, fronteiras de segurança, runbook de deploy e rollback;
- [ ] documentar qual pipeline de upload/pagamento é canônico e eliminar segunda autoridade.

Critério de saída: nova pessoa/agente consegue identificar rapidamente fonte de verdade, setup, segurança, deploy e rollback sem documentação contraditória.

### P2 — Supabase e segurança

Estado: **BLOQUEADO PARA PROVA REMOTA**

- [ ] confirmar o projeto de produção correto antes de qualquer operação remota;
- [ ] restaurar/ativar somente com autorização operacional e entendimento de custo;
- [ ] comparar migrations Git x migrations remotas e medir drift;
- [ ] aplicar migrations pendentes de forma controlada;
- [ ] executar advisors de segurança/performance com banco ativo;
- [ ] revisar todas as tabelas/views expostas, RLS, grants e `security_invoker`;
- [ ] revisar cada `SECURITY DEFINER`, `EXECUTE`, `search_path` e schema privilegiado;
- [ ] testar BOLA/IDOR por cliente, admin, pagamento e produção;
- [ ] revisar Storage de todos os buckets, não apenas comprovantes;
- [ ] provar que funções `verify_jwt=false` possuem autenticação alternativa adequada;
- [ ] reconciliar Edge Functions do Git com as implantadas;
- [ ] provar que `service_role` não entra no bundle;
- [ ] implantar/testar webhook Stripe com assinatura, idempotência e replay quando esse fluxo for parte do lançamento.

Critério de saída: achados críticos/altos resolvidos ou risco explicitamente aceito e documentado.

### P3 — Fluxos funcionais

Estado: **PENDENTE**

- [ ] restaurar/corrigir a origem que deixou o catálogo publicado vazio;
- [ ] smoke test de home, universo, personagem, modelo, detalhe, busca e contato;
- [ ] smoke test de cadastro, login, recuperação e logout;
- [ ] smoke test de perfil, wishlist, dashboard e notificações;
- [ ] smoke test administrativo com RBAC;
- [ ] smoke test compra/assinatura/pagamento em ambiente de teste;
- [ ] testar falha, duplicidade, retry, expiração e rejeição de comprovante;
- [ ] testar URLs profundas, refresh e 404;
- [ ] testar indisponibilidade do Supabase sem mostrar informação comercial falsa.

Critério de saída: matriz E2E aprovada para público, cliente e admin.

### P4 — Produto, UI, acessibilidade e conteúdo

Estado: **PENDENTE**

- [ ] terminar inventário de flags, rotas e componentes legados;
- [ ] alinhar nomenclatura, capitalização e tom do produto;
- [ ] revisar loading, vazio, erro, sucesso e retry das rotas críticas;
- [ ] revisar contraste, foco, teclado, headings, labels e tecnologia assistiva;
- [ ] revisar desktop, tablet e mobile;
- [ ] medir Lighthouse/Core Web Vitals em ambiente publicado;
- [ ] validar dados legais/LGPD sem placeholders;
- [ ] validar catálogo com dados reais, imagens, preços e disponibilidade.

Critério de saída: experiência consistente e sem conteúdo falso ou estado impossível.

### P5 — Release engineering

Estado: **PENDENTE**

- [ ] definir SemVer e política de release;
- [ ] separar preview/staging de produção;
- [ ] promover o mesmo artefato imutável entre ambientes;
- [ ] criar checklist de secrets por ambiente sem valores sensíveis;
- [ ] configurar rastreamento real de erros, logs, uptime e alertas;
- [ ] definir backup, restore e rollback;
- [ ] ensaiar migration do zero e restauração;
- [ ] criar RC versionada e notas de versão.

Critério de saída: release candidate promovível e reversível.

### P6 — Lançamento controlado

Estado: **PENDENTE**

- [ ] congelar escopo;
- [ ] executar go/no-go final;
- [ ] lançar em canário;
- [ ] observar erros, auth, pagamentos e latência;
- [ ] ampliar tráfego somente dentro das metas definidas;
- [ ] registrar release final e retrospectiva.

## 6. Bloqueios atuais

### 6.1 GitHub Actions

Último run inspecionado:

- workflow: `Quality Gate`;
- run: `33346618454`;
- HEAD: `25b384b2f31f4b4712b55e1f2d619f9fe2c9f945`;
- job: `Build, test and security`;
- label solicitada: `ubuntu-latest`;
- `runner_id=0`;
- `runner_name=""`;
- `steps=[]`;
- duração aproximada: quatro segundos.

Interpretação: ainda **não existe erro de aplicação reproduzido pelo CI**. O job falha antes de executar checkout, Node, npm, lint, testes ou build. Não repetir o mesmo workflow em loop até a infraestrutura de Actions ser corrigida.

### 6.2 Supabase remoto

O hardening de código e migration não prova o estado do ambiente. O projeto observado anteriormente estava inativo, portanto ainda faltam:

- drift de migrations;
- aplicação da migration de Storage privado;
- verificação de policies/grants reais;
- advisors com banco acessível;
- testes de owner/admin em `storage.objects`;
- E2E de checkout.

### 6.3 Main sem proteção

A `main` continua sem proteção e sem status checks obrigatórios. Isso é compatível apenas temporariamente com a instrução atual de execução direta. Antes do lançamento, o processo precisa impedir regressão acidental.

## 7. Critérios mínimos de GO

O lançamento só pode ser aprovado quando **todos** forem verdadeiros:

- [ ] Quality Gate verde no commit exato da RC;
- [ ] instalação reproduzível com package manager canônico;
- [ ] nenhum secret high-confidence no Git ou bundle;
- [ ] nenhum advisory crítico/alto sem mitigação ou aceitação formal;
- [ ] RLS, grants, Storage e funções privilegiadas revisados no ambiente ativo;
- [ ] catálogo publicado com dados reais e estados de falha honestos;
- [ ] pagamentos do escopo de lançamento testados ponta a ponta;
- [ ] fluxos público, cliente e admin aprovados;
- [ ] cobertura mínima configurada satisfeita;
- [ ] acessibilidade e desempenho medidos, não estimados;
- [ ] dados legais/LGPD validados;
- [ ] backup, restore e rollback ensaiados;
- [ ] RC versionada e release notes coerentes;
- [ ] monitoramento e responsável pela janela de lançamento definidos.

## 8. Checkpoint atual

### Checkpoint 9 — 2026-08-30

HEAD de início deste bloco: `ed464a0ed777facee88af698bf8f9f3a4ca7d7fb`  
HEAD funcional auditado antes da atualização deste SSOT: `25b384b2f31f4b4712b55e1f2d619f9fe2c9f945`

Concluído:

- fail-closed comercial estendido de compra avulsa para configuração global, planos e assinatura;
- planos públicos/checkout agora rejeitam preço, entrega e credits inválidos;
- assinatura deixou de inventar coins, preço contextual, economia e valor zero de carregamento;
- upload de comprovante de assinatura passou a exigir autenticação;
- comprovante novo passou de URL pública para object path privado ligado ao usuário;
- migration de bucket privado, limites, MIME e RLS adicionada;
- checkout privado valida propriedade do caminho antes de persistir;
- arquitetura `private_api` + wrapper público `SECURITY INVOKER` foi preservada;
- documentação que ensinava bucket público foi corrigida;
- testes do upload foram alinhados ao contrato privado;
- spec `.kiro` concorrente e órfão foi removido da `main`;
- busca por `VITE_SERVICE_ROLE` não encontrou ocorrência indexada;
- busca por `TODO/FIXME/HACK/XXX` não encontrou ocorrência indexada.

Testes/provas:

- Quality Gate run `33346618454` foi disparado no HEAD `25b384...`;
- job retornou `runner_id=0`, `runner_name=""` e `steps=[]`;
- portanto typecheck, lint, testes, build e audit **ainda não foram executados** por esse gate;
- inspeção das migrations confirmou que o checkout privilegiado já havia sido movido para `private_api`; a migration nova foi corrigida para não regredir essa fronteira;
- novo serviço de comprovante não chama `getPublicUrl()` e retorna apenas o object path;
- o caminho inclui o usuário autenticado e a RLS versionada exige o mesmo `auth.uid()`.

Bloqueios:

- GitHub Actions não aloca runner;
- Supabase remoto precisa estar ativo e confirmado para aplicar/provar o hardening;
- mudanças de UI ainda não têm build/smoke visual atual;
- `main` permanece sem proteção;
- existem dois conceitos de upload de prova de pagamento (`payment-vouchers` e `payment-proofs`) e a autoridade canônica precisa ser consolidada;
- malware scanning não deve depender do navegador como única fronteira de segurança.

Next action:

1. continuar P1 auditando templates `.env`, documentação vigente, feature flags e rotas legadas;
2. mapear `payment-vouchers` x `payment-proofs` e definir uma única arquitetura sem quebrar checkout existente;
3. corrigir defaults silenciosos restantes que afetem comportamento público/comercial;
4. assim que Actions voltar a alocar runner, executar e corrigir a primeira falha real do Quality Gate;
5. somente depois de `npm ci` comprovado, decidir remoção de `bun.lock`/`bun.lockb`;
6. quando o Supabase correto estiver operacional, medir drift e provar RLS/Storage/RPC antes de qualquer declaração de segurança.

Do not repeat:

- não reintroduzir preço/coins hardcoded como fallback comercial;
- não voltar a usar bucket público, `getPublicUrl()` ou URL HTTPS arbitrária como prova de pagamento nova;
- não mover o corpo privilegiado do checkout de volta para o schema `public`;
- não criar branch/PR nesta execução;
- não remover lockfiles concorrentes antes de instalação npm reproduzível;
- não rerodar Actions repetidamente enquanto continuar `runner_id=0` e `steps=[]`;
- não declarar migration aplicada, CI verde ou produto pronto sem prova.
