# URGENTE — OrdaX MVP / Launch Readiness

> **SSOT operacional exclusivo do repositório `washingtonmsdj/ordax`.**
> Código, migrations, testes e evidência operacional atual têm precedência sobre documentação arquivada.
> Não voltar para `novo-ordax-os` nem misturar estado de repositórios antigos.

## 0. Estado atual

**Status de lançamento público: NO-GO.**

O produto continua avançando, mas ainda faltam duas provas externas indispensáveis:

1. o **GitHub Actions Quality Gate não recebe runner** e termina antes de executar qualquer step;
2. o **Supabase canônico continua inativo/inobservável**, impedindo reconciliação remota de migrations, grants, RLS, Edge Functions e smoke autenticado real.

O Vercel está saudável e já publicou o HEAD funcional mais recente deste checkpoint, mas deploy frontend verde isolado não substitui Quality Gate executado nem prova remota do Supabase.

### Base funcional deste checkpoint

- `main`: `2786715363f36b4c7651bb3a06b7c60258e6767b`
- commit: `refactor: remove legacy payment audit compatibility`
- observação: o commit que atualiza este próprio `URGENTE.md` será posterior; a base funcional acima é a analisada neste checkpoint.

## 0.1 Evidência operacional

### GitHub Actions — BLOQUEIO EXTERNO CONFIRMADO NO HEAD

Quality Gate do commit `2786715363f36b4c7651bb3a06b7c60258e6767b`:

- run: `34779100953`
- conclusão agregada: `failure`
- jobs: 4
- `Authority audits`: `steps=null`
- `Production build and dependency audit`: `steps=null`
- `Unit coverage`: `steps=null`
- `Build, test and security`: `steps=null`

Logo, **nenhum comando do repositório executou nesse run**. Não alterar testes, lint, scripts ou código para “corrigir” esse `failure` enquanto os jobs continuarem sem runner/steps.

### Vercel — HEAD FUNCIONAL PUBLICADO E READY

Projeto canônico:

- projeto: `ordax`
- project id: `prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`
- repositório vinculado: `washingtonmsdj/ordax`
- commit: `2786715363f36b4c7651bb3a06b7c60258e6767b`
- deployment: `dpl_5UqCiCkuPshbBjtyMLY1tVmLVrxW`
- estado: `READY`
- target: `production`
- framework: Vite
- aliases observados incluem `ordax.com.br` e `www.ordax.com.br`

O commit intermediário `cb3af40...` teve deployment `ERROR` por uma regressão JSX detectada durante a própria migração da tela do cliente. Ela foi corrigida em seguida (`c2627d3...`), e os commits posteriores voltaram a `READY`, inclusive o HEAD atual. Não tratar aquele erro intermediário como bloqueio presente.

O antigo `BUILD_RATE_LIMIT` não é bloqueio atual sem nova evidência.

### Supabase canônico — BLOQUEIO EXTERNO

- project id conhecido: `pdytjhtjlxvbbeuxgnms`
- referência anterior: `Ordax-2026-1`
- estado conhecido: inativo/inobservável

Consequências:

- não é possível afirmar que migrations locais estão aplicadas remotamente;
- não é possível provar grants/RLS efetivos;
- mudanças em Edge Functions feitas nesta sessão permanecem **source-only** até deploy autorizado no Supabase;
- não criar migrations corretivas especulativas para um estado remoto não observado.

## 0.2 Hardening consolidado

### Contrato base de Edge Functions autenticadas

- `d1e9f011...` — `callAuthenticatedEdgeFunctionData` passou a falhar fechado para resposta vazia ou envelope `{ data }` malformado;
- cobertura versionada para `null`, `undefined`, objeto sem `data`, array e primitivo.

### Autoridade comercial multi-schema

- `da822cff...` — auditor de RPCs perigosos passou a acompanhar `public` e `private_api` separadamente;
- `REVOKE` em um schema não mascara mais `GRANT` perigoso no outro;
- prova sintética demonstrou FAIL com `private_api.notify_quote_payment_for_current_user` concedido e PASS após revogação;
- o diagnóstico antigo de ausência de REVOKE de `quotes` foi corrigido: há REVOKE versionado em `20260525073000_support_payment_mutation_rpcs.sql` e hardening adicional posterior.

### Respostas remotas / falso sucesso

Concluído no source:

- `bc59cf2...` — cancelamento de assinatura exige `success:true`;
- `893c3e1...` + `9d894f7...` — propagação de pricing exige `ok:true`, contagens válidas e coerência dos resultados;
- `613a5f9...` — testes do contrato de propagação;
- `dd6aa88...` + `f5a5313...` — gateway admin exige confirmação explícita para mutações standalone cujo SQL retorna `{ success:true }`;
- `f47db12...` + `c171229...` — mesma proteção para processamento de pagamento de assinatura e crédito manual de coins;
- `08b3bf2...` — exclusão do registro de comprovante de pagamento exige `{ success:true }`.

### Entregas

- `6d80413...` — cliente de atualização de entrega exige `success:true`, delivery correto e status solicitado;
- `1aab495...` — testes de resposta inválida, ID divergente e status divergente;
- `583c9c3...` — Edge Function `update-delivery-status` não converte mais RPC vazio/malformado em HTTP 200 de sucesso.

**Importante:** `583c9c3...` altera Edge Function do Supabase e ainda não pode ser declarado live enquanto o Supabase canônico estiver indisponível.

### Comprovantes de pagamento

- `192c1a8...` — `upload-payment-proof` valida o registro retornado pelo RPC contra payment, usuário, path, nome, tamanho e MIME; em retorno inválido remove o objeto recém-enviado do Storage antes de falhar;
- `5bf5f51...` — parser browser-side do envelope de upload;
- `fc8be1f...` — testes do parser para resposta malformada, pagamento divergente, usuário divergente e namespace de Storage divergente;
- `90fdd84...` — serviço de upload no browser vincula o registro retornado ao `paymentId` e usuário autenticado.

**Importante:** `192c1a8...` é mudança de Edge Function e permanece source-only até deploy no Supabase.

### Mutações administrativas com retorno de ID

- `7d6cd5d...` — status de pagamento manual, status de quote, data de entrega e tracking de quote exigem que o RPC devolva exatamente o ID solicitado;
- `18529f6...` — testes para retorno correto e retorno `null`/inesperado.

### Pagamentos manuais — autoridade e timeline canônico

Concluído neste ciclo:

- `ef04319...` — DML direto de `authenticated` em `manual_payments` foi revogado; mutações ficam atrás das fronteiras RPC/Edge previstas;
- `52354f4...` + `f80a001...` — suite de performance deixou de usar DML de browser para fixture e passou a separar setup privilegiado de operações reais medidas;
- `af17b8d...` — `manual_payments` entrou no auditor comercial para impedir regressão de DML direto;
- `2efc85f...` — escrita direta em `order_status_history` e `payment_info_requests` foi retirada do browser, preservando leitura necessária;
- `91a0190...` — essas tabelas auxiliares passaram a ser auditadas;
- `b7acbfb...` — `admin_payment_methods` perdeu DML direto de `authenticated`; leitura administrativa foi preservada como SELECT;
- `3444c04...` — `admin_payment_methods` e `payment_files` passaram a ser protegidos pelo auditor;
- `93c9fb8...` — mudança de status de `manual_payments` passou a gerar `order_status_history` transacionalmente no banco; o fluxo não depende mais de best-effort do browser;
- `c74fdb0...` — foi criada fronteira autenticada de timeline de pagamento manual, sanitizando eventos e sem expor identidade administrativa;
- `81bc4ff...` / `a3524e0...` — parser do timeline falha fechado para payload malformado e possui cobertura unitária;
- `1bd8858...` — `PaymentService` deixou de fazer join com `payment_audit_log`;
- `bcb9f3a...` — o antigo “security audit test” declarativo/hardcoded foi substituído por verificações executáveis sobre source real;
- `a7e9887...` — benchmark de detalhes mede o caminho canônico `getPaymentById()` + timeline autenticado;
- `75ef36e...` — tela admin usa somente timeline canônico e não possui aba duplicada de audit log/IDs internos;
- `a6887d7...` + `9b49112...` — testes de cliente/admin foram reduzidos e alinhados ao contrato atual;
- `2786715...` — removidos definitivamente `PaymentAuditLog` e `audit_logs` do contrato manual de pagamentos e do `PaymentService`.

#### Decisão definitiva sobre `payment_audit_log`

`payment_audit_log` aparece em tipos Supabase gerados antigos, mas **não existe migration versionada atual que crie essa tabela**. O código de produto não deve depender dela e não deve ser criada uma migration apenas para ressuscitar esse legado.

As fontes versionadas/canônicas para pagamento manual são:

- `manual_payments` — estado atual;
- `payment_files` — comprovantes;
- `payment_info_requests` — pedidos de informação ao cliente;
- `order_status_history` — transições de estado;
- endpoint autenticado de timeline — composição sanitizada para UI.

Não editar `src/integrations/supabase/types.ts` manualmente só para apagar uma definição gerada antiga; regenerar tipos apenas quando o Supabase canônico voltar a ser observável e reconciliado.

## 1. Critério de GO

O lançamento público só pode receber GO quando o **mesmo release candidate** provar:

- `npm ci` determinístico;
- TypeScript strict sem erro;
- lint sem erro bloqueante;
- auditores de acesso/autoridade PASS;
- testes unitários/integrados PASS;
- coverage configurada PASS;
- build de produção PASS;
- `npm audit --audit-level=high` sem vulnerabilidade bloqueante;
- `format:check` conforme política;
- Supabase canônico reconciliado com migrations/grants/RLS;
- Edge Functions do release efetivamente implantadas;
- smoke autenticado dos fluxos críticos;
- deploy observável;
- rollback reproduzível.

Build verde isolado não equivale a launch readiness.

## 2. P0 — bloqueadores antes do MVP público

### P0.1 — Quality Gate executável

- [x] workflow existe e dispara em `main`;
- [x] ausência de runner/steps foi comprovada também no HEAD `2786715...`;
- [ ] obter run onde os jobs realmente executem;
- [ ] fechar typecheck/lint/auditors/tests/coverage/build/audit/format no mesmo HEAD.

### P0.2 — autoridade comercial e fronteiras de confiança

- [x] auditor de DML direto para tabelas comerciais críticas existe;
- [x] auditor de RPCs perigosos existe;
- [x] `public` e `private_api` são rastreados independentemente;
- [x] `manual_payments`, `payment_files`, `payment_info_requests`, `order_status_history` e `admin_payment_methods` estão cobertos pelo hardening/auditoria de autoridade;
- [x] várias mutações financeiras críticas falham fechado no cliente/gateway;
- [x] histórico de pagamento manual não depende mais de gravação best-effort do browser;
- [x] UI de pagamentos deixou de depender da tabela fantasma `payment_audit_log`;
- [ ] reexecutar auditores completos quando o runner voltar;
- [ ] reconciliar grants/RLS efetivos no Supabase canônico;
- [ ] concluir a retirada de chamadas browser-side a RPCs legados de pricing quando houver backend canônico disponível para implantar e provar a fronteira substituta.

### P0.3 — Supabase / RLS / migrations / Edge Functions

- [ ] reativar ou tornar observável o projeto canônico por caminho autorizado;
- [ ] comparar migrations locais x aplicadas;
- [ ] verificar grants de `anon`, `authenticated`, `service_role` e `private_api`;
- [ ] verificar RLS/policies reais em commerce, payments, subscriptions, notifications, support e Storage;
- [ ] implantar/provar as mudanças source-only de `update-delivery-status`, `upload-payment-proof` e timeline de pagamento manual;
- [ ] regenerar tipos Supabase somente após reconciliação real do schema;
- [ ] registrar drift real antes de qualquer nova correção de schema.

### P0.4 — fluxos essenciais do MVP

Validar no ambiente canônico com usuários/roles controlados:

- [ ] autenticação e restauração de sessão;
- [ ] catálogo/coleções/modelos públicos;
- [ ] checkout/criação compatível com autoridade comercial;
- [ ] área do cliente e progresso de pedido;
- [ ] pagamentos, upload/revisão/exclusão de comprovantes e timeline;
- [ ] assinatura, crédito/coins e cancelamento;
- [ ] entregas e tracking;
- [ ] suporte e anexos;
- [ ] notificações;
- [ ] admin: usuários, pedidos, coleções, produção, financeiro e configurações críticas;
- [ ] refresh/navegação direta em rotas críticas;
- [ ] loading/empty/error/success sem falso sucesso ou estado fictício.

### P0.5 — deploy, smoke e rollback

- [x] Vercel operacional;
- [x] deployment `READY` do HEAD funcional `2786715...` confirmado em produção (`dpl_5UqCiCkuPshbBjtyMLY1tVmLVrxW`);
- [ ] smoke autenticado P0.4;
- [ ] validar domínio, assets e callbacks externos necessários;
- [ ] provar rollback para release saudável anterior;
- [ ] registrar receipt final do release candidate.

## 3. P1 — qualidade após remover bloqueios P0

- ampliar cobertura por risco real;
- priorizar auth, pagamentos, pedidos, produção, admin RPC gateway e Supabase;
- remover wrappers/legados apenas após provar ausência de contrato necessário;
- continuar validando respostas remotas antes de refletir sucesso na UI;
- revisar acessibilidade/responsividade das rotas MVP;
- otimizar bundle somente com evidência de impacto;
- tornar falhas de backend observáveis e explícitas.

## 4. Princípios de implementação

1. Corrigir causa raiz, não esconder sintoma.
2. Sem hardcode para contornar backend, auth, preço, role ou status.
3. Não manter legado por inércia; provar contrato antes de remover.
4. Não remover função válida por estar quebrada; corrigir se faz parte do produto.
5. UI nunca é fronteira de autorização.
6. Browser não é autoridade de preço, pagamento, role, crédito ou estado comercial sensível.
7. `service_role` exclusivamente server-side.
8. Schema muda somente por migration ordenada/reproduzível.
9. Mudança crítica deve ter prova/teste proporcional ao risco.
10. Commits pequenos, reversíveis e diretamente na `main`, conforme `AGENTS.md`.

## 5. Bloqueios externos atuais

### GitHub Actions

**Bloqueado:** run `34779100953` do HEAD funcional `2786715...` terminou com 4 jobs e nenhum step executado (`steps=null`).

### Supabase

**Bloqueado:** canônico inativo/inobservável. Impede deploy/prova remota das Edge Functions novas e reconciliação de banco/RLS/grants.

### Vercel

**Não bloqueado.** HEAD funcional `2786715...` está `READY` em production no deployment `dpl_5UqCiCkuPshbBjtyMLY1tVmLVrxW`.

## 6. Próxima sequência de execução

1. Continuar auditoria source-first de alto risco enquanto runner/Supabase estiverem bloqueados, priorizando pricing, checkout, assinatura, quotes e demais caminhos financeiros que ainda aceitem autoridade de browser ou resposta ambígua.
2. Não migrar pricing para uma nova fronteira backend que não possa ser implantada/provada; consolidar a semântica e preparar a migração segura para quando Supabase voltar.
3. Verificar se há outros testes “aspiracionais”/hardcoded que possam produzir PASS sem testar implementação real e substituí-los por prova executável.
4. Quando GitHub runner voltar, executar Quality Gate completo no HEAD e corrigir somente falhas reais dos steps.
5. Quando Supabase voltar, reconciliar migrations/grants/RLS, implantar Edge Functions pendentes, regenerar tipos e rodar smoke P0.4.
6. Só após gate + Supabase + smoke + rollback reavaliar GO/NO-GO.

## 7. Do not repeat

- Não trabalhar em `novo-ordax-os` ou outro OrdaX antigo.
- Não tratar `BUILD_RATE_LIMIT` como bloqueio atual sem nova evidência.
- Não dizer que falta REVOKE posterior de `quotes`; ele existe no source.
- Não assumir migration/Edge Function versionada = aplicada remotamente.
- Não “corrigir” GitHub Actions alterando código enquanto jobs não executarem steps.
- Não declarar testes adicionados como PASS canônico enquanto o runner não os executar.
- Não criar branch, PR ou SSOT paralelo sem instrução explícita.
- Não declarar lançamento pronto enquanto P0 estiver aberto.
- Não ressuscitar `payment_audit_log` só porque ainda aparece em tipos Supabase gerados antigos.
- Não editar tipos Supabase gerados manualmente para mascarar drift remoto não reconciliado.

## 8. Checkpoint desta sessão

Concluído no source até `2786715...`:

- hardening fail-closed de pricing, assinatura, coins e mutações standalone;
- gateway admin com confirmação explícita onde o SQL realmente retorna sucesso;
- entrega validada no cliente e na Edge Function;
- upload de comprovante protegido contra resposta incoerente e objeto órfão;
- resposta de upload vinculada a payment/usuário/namespace de Storage no browser;
- mutações administrativas UUID-returning validadas contra o recurso solicitado;
- DML direto de browser removido das principais superfícies do pagamento manual;
- histórico de status de pagamento manual tornado transacional no banco;
- timeline autenticado/sanitizado criado e integrado às telas cliente/admin;
- dependência de `payment_audit_log` removida do código manual;
- testes de detalhes de pagamento simplificados e alinhados ao contrato atual;
- security audit test declarativo substituído por verificações reais;
- benchmark de detalhes alinhado ao caminho canônico;
- deployment Vercel do HEAD `2786715...` confirmado `READY`;
- Quality Gate do mesmo HEAD confirmado bloqueado antes de qualquer step;
- Supabase continua sendo o bloqueio externo para prova remota de migrations/RLS/grants/Edge Functions.

**Next action:** continuar o pente-fino source-first por pricing/checkout/assinatura e por testes que ainda simulem segurança/autoridade via constantes ou comentários, sem tocar no Supabase remoto até ele voltar a ser observável.