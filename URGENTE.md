# URGENTE — prontidão para lançamento

Status: **EM EXECUÇÃO — NO-GO para lançamento**  
Atualizado em: **2026-08-31 (America/Bahia)**  
Branch operacional: **main somente**  
HEAD funcional antes deste documento: `ba24735ac3e2a1c00bf80a6b109a4e9ac03ece43`

Este arquivo é o **SSOT operacional** da preparação para lançamento do ORDAX. O histórico detalhado permanece no Git; aqui ficam somente regras vigentes, estado atual, bloqueios comprovados, provas e próxima ordem de execução.

## 1. Regras vigentes

1. Trabalhar diretamente na `main`; não criar branch/PR sem nova instrução explícita.
2. Commits pequenos e reversíveis.
3. Frontend nunca é fronteira suficiente de autorização ou segurança.
4. Preço, crédito, disponibilidade, capacidade, pagamento, prazo e permissão devem vir de fonte server-side canônica e falhar fechados quando não puderem ser validados.
5. Segredos e `service_role` nunca entram em `VITE_*` ou bundle do navegador.
6. Um domínio deve ter uma autoridade canônica; remover mocks, executores e caminhos paralelos desnecessários.
7. Código/migration versionado não equivale a deploy nem a prova remota.
8. Não editar migrations históricas aplicadas nem tipos gerados para mascarar drift.
9. Migration nova deve ser criada pelo fluxo oficial da CLI Supabase; não inventar filename.
10. Não declarar GO, CI verde, migration aplicada ou segurança remota sem prova reproduzível.
11. Comprovante enviado não equivale a pagamento aprovado.
12. Metadata de provedor externo não é autoridade para alterar pedido/assinatura do domínio.
13. Tabelas comerciais não devem aceitar mutação direta do navegador quando já existe RPC/contrato canônico que deriva preço, estado e ownership.
14. `timestamptz` representa instante real; Bahia é regra/calendário/apresentação, não deslocamento artificial antes de `toISOString()`.

## 2. Estado atual

| Área | Estado | Observação |
| --- | --- | --- |
| Branch | **main somente** | decisão explícita vigente |
| HEAD funcional | `ba24735ac3e2a1c00bf80a6b109a4e9ac03ece43` | antes deste update do SSOT |
| Proteção da main | **PENDENTE** | branch não protegida; checks obrigatórios desligados |
| GitHub Actions | **EXECUTA, MAS FALHA ANTES DOS STEPS** | run `33363845874` terminou `failure` em ~3 s; job sem steps/log disponível |
| Vercel | **FAILURE** | status atual falho; causa deste HEAD ainda não provada |
| Runtime | **Node 24.x** | manifesto/workflow alinhados |
| Package manager | **NÃO CONSOLIDADO** | só consolidar depois de `npm ci` real e prova do lock escolhido |
| Coleções públicas | **DESATIVADAS** | reduz exposição dos fluxos comerciais em hardening |
| Supabase canônico | **INACTIVE** | `pdytjhtjlxvbbeuxgnms` / `Ordax-2026-1` |
| Drift de Edge Functions | **COMPROVADO** | remoto ainda mantém funções retiradas do Git; não foi possível neutralizar com projeto inativo |
| Autoridade comercial no Data API | **P1 ABERTO** | grants/policies ainda permitem INSERT direto em tabelas comerciais críticas |
| Criação manual de pagamento | **REMOVIDA DO FRONTEND** | `createPayment` aposentado; RPC legado no banco ainda aceita `p_amount` |
| Confirmação de pagamento por orçamento | **REMOVIDA DO FRONTEND** | UI/hook/service mortos removidos; RPC legado continua dívida de banco |
| Compra avulsa | **FAIL-CLOSED NO SOURCE** | criação pública bloqueada até correção do estado inicial de depósito e do bypass Data API |
| Assinatura | **RPC CANÔNICO DERIVA PREÇO** | mas INSERT direto de `subscriptions` ainda é mais permissivo que o RPC |
| Uploads sensíveis | **SERVER-AUTHORITY VERSIONADA** | comprovantes/suporte privados nos caminhos endurecidos |
| Stripe genérico | **REMOVIDO DO SOURCE** | PaymentIntent client-controlled removido |
| Stripe webhook | **ISOLADO DO DOMÍNIO** | metadata Stripe não promove `orders/subscriptions` |
| Produção/capacidade | **FAIL-CLOSED VERSIONADO** | sem capacidade/preço otimista quando fonte oficial falha |
| E2E | **BLOQUEADO EXPLICITAMENTE** | `npm run test:e2e` retorna `E2E_BLOCKED` até banco canônico ser reconciliado |
| Lançamento | **NO-GO** | banco, CI, E2E, deploy e release engineering ainda sem prova suficiente |

## 3. Hardening concluído no source

### Segurança e autoridade comercial

- [x] `create-payment-intent` genérico e frontend Stripe órfão removidos;
- [x] `stripe-webhook` não altera mais estado do domínio a partir de metadata do provedor;
- [x] `create-subscription` e `create-subscription-v2` removidos por ativarem assinatura sem prova financeira e não terem consumidor ativo;
- [x] criação avulsa bloqueada com `PAYMENT_FLOW_UNAVAILABLE` enquanto o RPC legado puder produzir estado incorreto;
- [x] saldo avulso auditado: ownership/status/deadline validados e comprovante não significa aprovação;
- [x] upload de comprovante manual auditado: owner-only e primeira evidência muda apenas para `under_review`;
- [x] suporte auditado contra BOLA/IDOR em conversa, mensagem e anexo;
- [x] cancelamento de assinatura valida ownership no Edge e novamente no RPC atômico;
- [x] `createPayment` removido da camada canônica do frontend;
- [x] `PaymentLinkCard`, `usePaymentConfirmation` e `payment-confirmation-service` removidos por ausência de consumidor e autoridade de valor no cliente;
- [x] suites antigas que inseriam `active`, `deposit_paid` ou valores comerciais diretamente foram removidas;
- [x] placeholder E2E que apenas validava arrays/mocks foi removido;
- [x] `test:e2e` agora falha fechado enquanto a infraestrutura canônica não puder ser validada;
- [x] `scripts/security/audit-commercial-authority.mjs` criado;
- [x] Quality Gate executa o auditor comercial antes dos testes de cobertura.

### Produção, capacidade e calendário

- [x] `monthly_production_limit` é autoridade de capacidade mensal;
- [x] falta de configuração não vira capacidade/venda disponível;
- [x] ciclos inexistentes não viram disponibilidade fictícia;
- [x] scheduling deriva plano/quantidade persistidos e exige `shipping_date` real;
- [x] cron mensal evita colisão de `delivery_number` após pausa;
- [x] deadlines e calendário usam instantes reais com Bahia explícita;
- [x] escolha real de personagem usa `character_choices`; pré-escolha usa `production_queue`;
- [x] seleção de personagem valida vínculo com coleção/entrega.

### Governança e limpeza

- [x] `AGENTS.md`, `README.md` e este arquivo representam o contrato operacional atual;
- [x] funções sem consumidor que duplicavam autoridade foram removidas do source;
- [x] wrappers/reexports desnecessários removidos nos fluxos auditados;
- [x] documentação de comandos de março removida por conter práticas e comandos defasados;
- [x] mocks/placeholders comerciais removidos dos caminhos auditados.

## 4. P1 comprovado — mutação comercial direta no Data API

A migration `20260429000001_harden_public_grants.sql` concede `SELECT, INSERT, UPDATE, DELETE` a `authenticated` para diversas tabelas, incluindo `subscriptions`, `standalone_purchases`, `manual_payments` e `quotes`, deixando o RLS como fronteira principal.

No estado efetivo versionado:

- `quotes_insert_own` permite a um autenticado inserir seu próprio `quote`; a linha contém valores e estados comerciais;
- `standalone_purchases_insert_own` permite INSERT próprio sem obrigar preço/capacidade/status a passarem pelo RPC atômico;
- `subscriptions_insert_own_pending_checkout` limita estado a `pending_payment`, mas ainda permite campos como `total_paid` e `deliveries_total` vindos do INSERT, enquanto o RPC canônico deriva esses valores do plano;
- `admin_verify_subscription_payment_voucher` promove a linha existente para `active/paid` e não recalcula esses campos comerciais antes da ativação;
- `create_manual_payment_for_current_user` continua executável por `authenticated` no histórico versionado e aceita `p_amount`;
- `notify_quote_payment_for_current_user` também aceita valor informado pelo cliente e não possui consumidor frontend atual.

**Conclusão:** reativar o Supabase antes de reconciliar grants/policies/RPCs comerciais é **NO-GO**.

### Remediação obrigatória quando o Supabase puder ser operado

A migration corretiva oficial deverá, após `db pull`/reconciliação real:

1. revogar INSERT direto de `authenticated` nas tabelas comerciais que já possuem RPC canônico;
2. remover as policies de INSERT direto correspondentes;
3. manter somente SELECT necessário ao cliente;
4. preservar mutações administrativas apenas por RPCs auditáveis quando houver efeitos colaterais de domínio;
5. retirar ou reescrever RPCs legados que aceitam valor do cliente;
6. corrigir compra avulsa para estado inicial não pago (`awaiting_deposit` ou equivalente) sem `deposit_paid_at` até aprovação real;
7. provar que checkout de assinatura deriva preço, entregas, créditos e estado do plano persistido;
8. regenerar tipos e rodar advisors `security` e `performance`.

O auditor `scripts/security/audit-commercial-authority.mjs` deve permanecer vermelho até essa correção existir no histórico efetivo de migrations.

## 5. Infraestrutura bloqueada

### GitHub Actions

Prova atual:

- run `33363845874` (`Quality Gate`, HEAD `ba24735...`) = `completed/failure`;
- o job retornado não possui steps;
- tentativa de ler log do job equivalente anterior resultou em blob inexistente;
- portanto a falha ocorre antes da execução demonstrável de `npm ci`, format, typecheck, lint, auditorias, testes ou build.

Não atribuir essa falha ao código até existir step/log que prove isso.

### Vercel

- combined status do HEAD atual contém `Vercel = failure`;
- a causa do status deste HEAD ainda não foi inspecionada/provada;
- não declarar build quebrado nem deploy válido apenas por esse status.

### Supabase

Projeto canônico `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`) está **INACTIVE**.

Enquanto permanecer inativo:

- não aplicar migration;
- não declarar schema remoto reconciliado;
- não regenerar tipos como se fossem prova oficial;
- não reativar automaticamente;
- não assumir que remover source removeu função remota já publicada.

Quando houver decisão explícita para restaurar, a ordem é: **neutralizar drift remoto → medir migration/schema drift → criar migrations oficiais → aplicar/verificar → advisors/tipos → E2E**.

## 6. Próxima ordem de execução

### P0 — recuperar prova de engenharia

- [ ] identificar por que GitHub Actions encerra antes dos steps;
- [ ] obter execução real de `npm ci` em Node 24;
- [ ] format/typecheck/lint;
- [ ] `security:supabase-access` + `audit-commercial-authority`;
- [ ] testes/coverage;
- [ ] build;
- [ ] `npm audit --omit=dev --audit-level=high`;
- [ ] só então configurar proteção obrigatória da `main`.

### P1 — Supabase/comercial

- [ ] decidir quando restaurar `Ordax-2026-1`;
- [ ] neutralizar Edge Functions remotas retiradas do Git antes de tráfego;
- [ ] medir drift de schema/migrations;
- [ ] gerar migration oficial para revogar DML comercial direto;
- [ ] corrigir contrato de depósito avulso;
- [ ] retirar/reformular RPCs que aceitam `amount` do cliente;
- [ ] provar RLS/grants/Storage/functions/advisors;
- [ ] regenerar tipos;
- [ ] substituir o gate E2E por suíte real contra ambiente seguro.

### P2 — segurança e domínio

- [ ] concluir inventário de `SECURITY DEFINER` e `verify_jwt=false`;
- [ ] auditar demais tabelas com DML concedido a `authenticated` e separar self-service legítimo de autoridade administrativa;
- [ ] provar ausência de `service_role` no bundle;
- [ ] testar scanner server-side real/fail-closed;
- [ ] reconciliar helpers SQL históricos de timezone.

### P3 — produto e release

- [ ] smoke público e catálogo real;
- [ ] auth, perfil, wishlist, dashboard, notificações e suporte;
- [ ] admin/RBAC;
- [ ] estados loading/vazio/erro/retry em desktop/tablet/mobile;
- [ ] acessibilidade/Lighthouse/Core Web Vitals medidos;
- [ ] staging/preview separado de produção;
- [ ] artefato imutável, secrets checklist, monitoramento e alertas;
- [ ] backup/restore/rollback ensaiados;
- [ ] RC + release notes.

## 7. Critérios mínimos de GO

Nenhum GO enquanto qualquer item abaixo estiver ausente:

- Quality Gate executado até o fim e verde no HEAD da release;
- build/deploy reproduzível e smoke comprovado;
- Supabase ativo, reconciliado e sem drift crítico;
- auditor comercial verde;
- nenhuma função remota retirada ainda exposta;
- pagamentos/assinatura/compra avulsa E2E provados com idempotência;
- RLS/grants/Storage/advisors revisados no banco real;
- segredos e RBAC provados;
- rollback e recuperação ensaiados.

## 8. Checkpoint desta continuação

Concluído:

- RLS de leitura de `manual_payments` auditado: cliente lê apenas a própria linha;
- `createPayment` retirado do frontend e suítes antigas associadas removidas;
- confirmação manual de orçamento sem consumidor removida do frontend;
- bypasses de INSERT direto em `quotes`, `standalone_purchases` e `subscriptions` identificados e classificados como P1;
- grant DML amplo para `authenticated` confirmado no histórico de migrations;
- guardrail comercial criado e ligado ao Quality Gate;
- testes antigos que ensinavam bypass de RPC removidos;
- E2E passou a falhar explicitamente enquanto infraestrutura estiver insegura/inativa;
- GitHub Actions voltou a gerar runs, mas termina antes dos steps;
- documentação de comandos obsoleta removida.

Commits principais desta continuação:

- `927d801c2c568fdcbd4efd6c3fe04d97a663b985` — remove suíte E2E manual-payment legada;
- `434dd56c224561e443a094b1bb305d82cfee7ef2` — aposenta criação manual de pagamento no frontend;
- `d85187f194f301094d8ceb324e0dc6ecae69f75f` / `8685827eb44d71171832c48fbffd062180a54862` / `5801bb583ca14f81d88add42aad1f64518041389` — remove fluxo morto de confirmação de orçamento;
- `78a0f752287b7103481bb999f4bff5217c083fab` / `5ac007f667fdfd5f69a60a945e0cc222a80ffb20` — remove testes que bypassavam autoridade e placeholder E2E;
- `96a05bcd0eff51daa25624d1e26b3d135698f563` — adiciona auditor comercial;
- `b3abe261fb5167c2eb75dd05fc2029e8d7a01f5f` — adiciona auditor ao Quality Gate;
- `9b916bbcb5e126d3de143be584f4bab37d762f9d` — remove referência de comandos obsoleta;
- `ba24735ac3e2a1c00bf80a6b109a4e9ac03ece43` — torna gate E2E explicitamente fail-closed.

Next action:

1. continuar a auditoria das demais tabelas em `authenticated_dml_tables`, priorizando campos financeiros, permissões e estado operacional;
2. remover no source qualquer mutação direta que ainda dependa das policies que serão fechadas;
3. diagnosticar o encerramento pré-step do Actions com a primeira evidência disponível;
4. manter Supabase e fluxos comerciais fail-closed até a reconciliação oficial.

Do not repeat:

- não reativar Supabase automaticamente;
- não editar migration histórica aplicada;
- não inventar migration filename;
- não reabrir INSERT comercial direto para facilitar frontend;
- não transformar comprovante em pagamento aprovado;
- não usar metadata externa como autoridade de domínio;
- não declarar CI verde, deploy válido, migration aplicada ou GO sem prova;
- não criar branch/PR.
