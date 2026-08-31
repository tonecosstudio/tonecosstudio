# URGENTE — prontidão para lançamento

Status: **EM EXECUÇÃO — NO-GO para lançamento**  
Atualizado em: **2026-08-31 (America/Bahia)**  
Branch operacional: **main somente**  
HEAD funcional antes deste documento: `6fb1d70cf87e26296ccb52d0778c20f7dc149739`

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
9. Migration nova deve ser criada pelo fluxo oficial da CLI Supabase; não inventar filename/timestamp.
10. Não declarar GO, CI verde, migration aplicada ou segurança remota sem prova reproduzível.
11. Comprovante enviado não equivale a pagamento aprovado.
12. Metadata de provedor externo não é autoridade para alterar pedido/assinatura do domínio.
13. Tabelas comerciais não devem aceitar mutação direta do navegador quando já existe RPC/contrato canônico que deriva preço, estado e ownership.
14. Grants devem ser avaliados pelo **estado efetivo após todas as migrations**, não por uma policy ou migration histórica isolada.
15. `timestamptz` representa instante real; Bahia é regra/calendário/apresentação, não deslocamento artificial antes de `toISOString()`.
16. Nome de operação comercial deve corresponder ao efeito real: não chamar de reembolso/extorno um fluxo que não movimenta dinheiro.

## 2. Estado atual

| Área | Estado | Observação |
| --- | --- | --- |
| Branch | **main somente** | decisão explícita vigente |
| HEAD funcional | `6fb1d70cf87e26296ccb52d0778c20f7dc149739` | antes deste update do SSOT |
| Proteção da main | **PENDENTE** | branch não protegida; checks obrigatórios desligados |
| GitHub Actions | **FALHA ANTES DOS STEPS** | run `33397209149`, HEAD `aabc26e...`, job `99504490862`, `steps=[]`, `runner_id=0` |
| Vercel | **SEM PROVA DE DEPLOY VÁLIDO** | não usar status isolado como prova de erro de source |
| Runtime | **Node 24.x** | manifesto/workflow alinhados |
| Coleções públicas | **DESATIVADAS** | reduz exposição dos fluxos comerciais em hardening |
| Supabase canônico | **INACTIVE** | `pdytjhtjlxvbbeuxgnms` / `Ordax-2026-1` |
| Drift de Edge Functions | **COMPROVADO** | remoto ainda mantém funções retiradas do Git; projeto inativo impede neutralização atual |
| Compra avulsa | **P1 / FAIL-CLOSED NO SOURCE** | INSERT cliente efetivo + RPC atômico nasce em `deposit_paid`; frontend público bloqueado |
| Assinatura principal | **P1 NO DATA API** | checkout canônico deriva preço, mas INSERT direto de `subscriptions` continua mais permissivo |
| Assinatura por créditos | **P1 — ATIVAÇÃO SEM PAGAMENTO** | `activate_subscription_credit_for_current_user` cria assinatura `active` e aloca créditos sem prova financeira |
| Refund legado de créditos | **RETIRADO DO FRONTEND / DÍVIDA DB** | RPC retorna `refund_amount=0`; UI que prometia estorno proporcional/7 dias foi removida |
| Quotes | **DML DIRETO FECHADO** | migration posterior revoga INSERT/UPDATE de `authenticated` |
| Profiles | **SELF-SERVICE RESTRITO** | DML amplo revogado; UPDATE posterior limitado a colunas editáveis; role protegida por trigger |
| Suporte | **DML DIRETO FECHADO** | mensagens/anexos/conversas passam por RPCs após revogações |
| Produção/escolhas | **DML DIRETO FECHADO/AUTORITATIVO** | produção admin-only; escolhas do cliente passam por RPC |
| Coins | **SEM BYPASS DE CRÉDITO IDENTIFICADO** | saldo/ledger escritos por autoridade administrativa/RPC atômico |
| Notificações | **P2 AUTORIDADE/FUNCIONALIDADE** | `user_notifications` amplo demais; RPCs invoker de `admin_notifications` podem não ter UPDATE/DELETE suficiente |
| Criação manual de pagamento | **REMOVIDA DO FRONTEND** | RPC legado continua executável e aceita `p_amount` |
| Confirmação de pagamento por orçamento | **REMOVIDA DO FRONTEND** | RPC legado de `p_amount` permanece versionado |
| E2E | **BLOQUEADO EXPLICITAMENTE** | `npm run test:e2e` retorna `E2E_BLOCKED` até ambiente canônico ser reconciliado |
| Lançamento | **NO-GO** | banco, CI, E2E, deploy e release engineering ainda sem prova suficiente |

## 3. Hardening concluído no source

### Segurança e autoridade

- [x] `create-payment-intent` genérico e frontend Stripe órfão removidos;
- [x] `stripe-webhook` não altera estado do domínio a partir de metadata do provedor;
- [x] `create-subscription` e `create-subscription-v2` removidos por ativarem assinatura sem prova financeira;
- [x] criação avulsa bloqueada com `PAYMENT_FLOW_UNAVAILABLE` enquanto o contrato de depósito permanecer inseguro;
- [x] saldo avulso auditado: ownership/status/deadline validados e comprovante não significa aprovação;
- [x] upload de comprovante manual auditado: owner-only e primeira evidência muda apenas para `under_review`;
- [x] suporte auditado contra BOLA/IDOR em conversa, mensagem e anexo;
- [x] cancelamento de assinatura principal valida ownership no Edge e novamente no RPC atômico;
- [x] `createPayment`, confirmação morta de orçamento e telas Stripe órfãs removidas;
- [x] ativação de assinatura por créditos retirada do frontend; RPC inseguro permanece bloqueio de banco;
- [x] diálogo/API/hook de “cancelamento com reembolso” de créditos removidos porque backend não processa reembolso financeiro;
- [x] pedido individual por créditos auditado: valida assinatura, personagem, saldo, plano e capacidade e debita atomicamente;
- [x] pedido automático por créditos auditado: débito ocorre no fechamento admin do ciclo; sem saldo, pedido é cancelado;
- [x] DML direto das tabelas `subscription_credit_*` é revogado de `authenticated` no contrato versionado;
- [x] suites antigas/placeholders que codificavam fluxos inseguros foram removidos;
- [x] `test:e2e` falha fechado enquanto a infraestrutura canônica não puder ser validada;
- [x] auditor comercial interpreta grants/revokes pelo estado efetivo e bloqueia ativação gratuita de créditos;
- [x] auditor de profiles distingue grant de coluna de grant de tabela;
- [x] auditor de notificações criado e ligado ao Quality Gate;
- [x] contrato TS de `mark_all_notifications_read` alinhado ao retorno `void` versionado.

### Produção, capacidade e calendário

- [x] `monthly_production_limit` é autoridade de capacidade mensal;
- [x] falta de configuração não vira capacidade/venda disponível;
- [x] ciclos inexistentes não viram disponibilidade fictícia;
- [x] scheduling deriva plano/quantidade persistidos e exige `shipping_date` real;
- [x] cron mensal evita colisão de `delivery_number` após pausa;
- [x] deadlines e calendário usam instantes reais com Bahia explícita;
- [x] escolha real de personagem usa `character_choices`; pré-escolha usa `production_queue`;
- [x] seleção de personagem valida vínculo com coleção/entrega;
- [x] DML direto de `subscription_deliveries` e `character_choices` foi revogado para o navegador.

## 4. P1 comprovado — autoridade comercial residual

### 4.1 `standalone_purchases`

- não foi encontrada revogação posterior do INSERT de `authenticated`;
- `standalone_purchases_insert_own` continua potencialmente alcançável;
- o RPC atômico canônico deriva preço/capacidade, porém cria a compra como `deposit_paid` e `deposit_paid_at=now()` mesmo sem prova/aprovação financeira suficiente.

**Ação:** manter compra pública bloqueada; após restaurar/reconciliar Supabase, gerar migration oficial que revogue INSERT direto e faça a compra nascer em estado não pago.

### 4.2 `subscriptions`

- não foi encontrada revogação posterior do INSERT de `authenticated`;
- `subscriptions_insert_own_pending_checkout` permite campos comerciais que o RPC canônico deveria derivar do plano;
- aprovação administrativa promove a linha existente sem recalcular todos esses campos.

**Ação:** revogar INSERT direto e manter criação somente pelo RPC server-authoritative.

### 4.3 assinatura por créditos

`activate_subscription_credit_for_current_user`:

- aceita usuário autenticado;
- escolhe plano ativo;
- cria `subscription_credit_subscriptions.status='active'`;
- aloca `base_credits + bonus_credits` como saldo disponível;
- registra transaction `allocation`;
- recebe `payment_method_id`, mas não comprova/cobra pagamento.

A implementação foi posteriormente movida a `private_api`, porém o wrapper público continua executável por `authenticated`. Remover o caller frontend **não elimina a superfície PostgREST**.

**Ação:** retirar/reformular esse RPC no banco antes de qualquer reativação pública. Ativação e alocação só podem ocorrer após prova financeira canônica/idempotente.

### 4.4 RPCs de valor informado pelo cliente

- `create_manual_payment_for_current_user` permanece executável por `authenticated` e aceita `p_amount`;
- `notify_quote_payment_for_current_user` permanece executável por `authenticated` e aceita `p_amount`.

Os callers frontend foram removidos, mas a superfície SQL continua dívida de banco.

### Falsos positivos descartados

- `quotes`: INSERT/UPDATE revogados posteriormente;
- `profiles`: DML amplo revogado; self-service reaberto apenas por colunas aprovadas;
- suporte: DML de mensagem/anexo/conversa revogado e mutações passam por RPC;
- `character_choices` e `subscription_deliveries`: DML direto revogado;
- `subscription_credit_*`: DML direto das tabelas revogado; o P1 é o RPC de ativação, não INSERT direto;
- `user_coins`/`coin_transactions`: sem caminho de cliente para creditar saldo arbitrariamente identificado.

**Conclusão:** reativar o Supabase antes de reconciliar esses P1 é **NO-GO**.

## 5. P2 comprovado — contratos funcionais/autorização

### Notificações

1. `user_notifications` mantém UPDATE de linha inteira para o proprietário, embora o produto precise somente de `is_read/read_at`.
2. `admin_notifications` teve DML revogado, mas `mark_notification_read`, `mark_all_notifications_read` e `admin_delete_notification` foram convertidos para `SECURITY INVOKER`; sem grants mínimos posteriores, podem falhar por privilégio insuficiente.

O guardrail `scripts/security/audit-notification-authority.mjs` exige menor privilégio: UPDATE por coluna ou RPC autorizado; não reabrir DML amplo.

### Cancelamento “com reembolso” do subsistema de créditos

O RPC histórico cancela a assinatura e expira créditos, mas retorna `refund_amount = 0` e não movimenta dinheiro. A superfície frontend que estimava valores hardcoded e prometia reembolso em 7 dias foi removida.

**Ação:** no banco reconciliado, renomear/reformular para cancelamento sem promessa financeira ou integrar um fluxo real de reembolso idempotente antes de voltar a expor essa opção.

## 6. Infraestrutura bloqueada

### GitHub Actions

Prova mais recente:

- run `33397209149`, Quality Gate, HEAD `aabc26e3cb031ababf5c55dbd5cdf782dd7be708`;
- job `99504490862` = `completed/failure`;
- duração aproximada: 3 segundos;
- `steps=[]`;
- `runner_id=0` e `runner_name=''`.

Portanto não existe prova de execução de `npm ci`, format, typecheck, lint, auditorias, testes ou build. Não atribuir essa falha ao source até existir step/log.

### Supabase

Projeto canônico `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`) está **INACTIVE**.

Enquanto permanecer inativo:

- não aplicar migration;
- não declarar schema remoto reconciliado;
- não regenerar tipos como prova oficial;
- não reativar automaticamente;
- não assumir que remover source removeu função remota já publicada.

Quando houver decisão explícita para restaurar, a ordem é: **neutralizar drift remoto → medir migration/schema drift → gerar migrations oficiais → aplicar/verificar → advisors/tipos → E2E**.

## 7. Próxima ordem de execução

### P0 — recuperar prova de engenharia

- [ ] diagnosticar por que Actions não provisiona runner;
- [ ] obter `npm ci` real em Node 24;
- [ ] format/typecheck/lint;
- [ ] executar auditor Supabase + comercial + profiles + notificações;
- [ ] testes/coverage;
- [ ] build;
- [ ] `npm audit --omit=dev --audit-level=high`;
- [ ] somente depois configurar proteção obrigatória da `main`.

### P1 — Supabase/comercial

- [ ] decidir quando restaurar `Ordax-2026-1`;
- [ ] neutralizar Edge Functions remotas retiradas do Git antes de tráfego;
- [ ] medir drift de schema/migrations;
- [ ] revogar INSERT direto de `subscriptions` e `standalone_purchases` por migration oficial;
- [ ] corrigir estado inicial do depósito avulso;
- [ ] retirar/reformular RPCs de `p_amount` do cliente;
- [ ] retirar/reformular `activate_subscription_credit_for_current_user` para exigir prova de pagamento;
- [ ] reconciliar cancelamento/refund de créditos com semântica financeira real;
- [ ] provar checkout/ativação com preço, entregas e créditos derivados do plano persistido;
- [ ] advisors, RLS/grants/Storage/functions, tipos e E2E.

### P2 — segurança e domínio

- [ ] corrigir menor privilégio de notificações por migration oficial;
- [ ] concluir inventário de `SECURITY DEFINER` e `verify_jwt=false`;
- [ ] continuar inventário do grant DML histórico pelo estado efetivo final;
- [ ] provar ausência de `service_role` no bundle;
- [ ] testar scanner server-side real/fail-closed;
- [ ] reconciliar helpers SQL históricos de timezone.

### P3 — produto e release

- [ ] smoke público e catálogo real;
- [ ] auth, perfil, wishlist, dashboard, notificações e suporte;
- [ ] admin/RBAC;
- [ ] loading/vazio/erro/retry em desktop/tablet/mobile;
- [ ] acessibilidade/Lighthouse/Core Web Vitals medidos;
- [ ] staging/preview separado de produção;
- [ ] artefato imutável, secrets checklist, monitoramento e alertas;
- [ ] backup/restore/rollback ensaiados;
- [ ] RC + release notes.

## 8. Critérios mínimos de GO

Nenhum GO enquanto faltar qualquer item abaixo:

- Quality Gate executado até o fim e verde no HEAD da release;
- build/deploy reproduzível e smoke comprovado;
- Supabase ativo, reconciliado e sem drift crítico;
- auditores de autoridade verdes;
- nenhuma função remota retirada ainda exposta;
- pagamentos/assinaturas/compra avulsa E2E provados com idempotência;
- RLS/grants/Storage/advisors revisados no banco real;
- segredos e RBAC provados;
- rollback e recuperação ensaiados.

## 9. Checkpoint atual

Concluído nesta continuação:

- suporte, produção, choices, profiles, quotes e coins reavaliados pelo privilégio efetivo final;
- falsos P1 derivados de policies históricas sem grant efetivo removidos;
- auditor comercial/profile/notification corrigidos e ligados ao Quality Gate;
- ativação gratuita de assinatura por créditos confirmada como P1 e adicionada ao auditor comercial;
- callers frontend de ativação por créditos removidos;
- pedido individual e pedido automático por créditos auditados; débito/capacidade são server-side;
- falsa superfície “cancelar com reembolso” removida do frontend (componente, export, hook, API e cliente RPC);
- Quality Gate mais recente confirmado sem runner/steps, portanto ainda sem prova de source.

Commits recentes relevantes:

- `aabc26e3cb031ababf5c55dbd5cdf782dd7be708` — bloqueia ativação gratuita de créditos no auditor comercial;
- `1e69cd8927d126e07ea6bf19bae6fb695339be49` — remove diálogo de reembolso enganoso;
- `d36adff8cb8f011db9847d3a3ad95c73a7055fd2` — remove export do diálogo;
- `6fc607aa59385e502d6567e7957d1f4e132f6718` — remove hook de refund;
- `409acec11fd137b04a14ecebc7de7453d1f19e5e` — remove cliente RPC de refund;
- `6fb1d70cf87e26296ccb52d0778c20f7dc149739` — remove método de refund da API de créditos.

Next action:

1. auditar renovação e mudança de plano do subsistema de créditos, procurando alocação adicional sem pagamento;
2. continuar inventário de `SECURITY DEFINER`/`authenticated` com efeitos comerciais;
3. manter fluxos públicos fail-closed;
4. restaurar/migrar Supabase somente por decisão operacional explícita e fluxo oficial.

Do not repeat:

- não classificar policy histórica como vulnerabilidade sem verificar o grant efetivo final;
- não editar migration histórica;
- não inventar nome/timestamp de migration;
- não reativar Supabase automaticamente;
- não abrir pagamento/assinatura/compra pública enquanto P1 permanecer;
- não reabrir DML amplo apenas para fazer RPC invoker funcionar;
- não criar branch/PR;
- não declarar CI verde, migration aplicada, deploy válido ou GO sem prova.
