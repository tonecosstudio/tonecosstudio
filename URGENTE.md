# URGENTE — prontidão para lançamento

Status: **EM EXECUÇÃO — NO-GO para lançamento**  
Atualizado em: **2026-08-31 (America/Bahia)**  
Branch operacional: **main somente**  
HEAD funcional antes deste documento: `c863055493b8ff191183a8d6c70ddf40b43d8cb2`

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
14. Grants devem ser avaliados pelo **estado efetivo após todas as migrations**, não por uma policy ou migration histórica isolada.
15. `timestamptz` representa instante real; Bahia é regra/calendário/apresentação, não deslocamento artificial antes de `toISOString()`.

## 2. Estado atual

| Área | Estado | Observação |
| --- | --- | --- |
| Branch | **main somente** | decisão explícita vigente |
| HEAD funcional | `c863055493b8ff191183a8d6c70ddf40b43d8cb2` | antes deste update do SSOT |
| Proteção da main | **PENDENTE** | branch não protegida; checks obrigatórios desligados |
| GitHub Actions | **EXECUTA, MAS FALHA ANTES DOS STEPS** | último run inspecionado `33367802679`, HEAD `c6600dc...`, terminou `failure` em ~5 s |
| Vercel | **SEM PROVA DE DEPLOY VÁLIDO** | falhas recentes; não usar status isolado como prova de erro de source |
| Runtime | **Node 24.x** | manifesto/workflow alinhados |
| Package manager | **NÃO CONSOLIDADO** | só consolidar depois de `npm ci` real e prova do lock escolhido |
| Coleções públicas | **DESATIVADAS** | reduz exposição dos fluxos comerciais em hardening |
| Supabase canônico | **INACTIVE** | `pdytjhtjlxvbbeuxgnms` / `Ordax-2026-1` |
| Drift de Edge Functions | **COMPROVADO** | remoto ainda mantém funções retiradas do Git; não foi possível neutralizar com projeto inativo |
| Compra avulsa | **P1 / FAIL-CLOSED NO SOURCE** | `standalone_purchases` ainda tem INSERT cliente efetivo no histórico; RPC atômico também inicia em `deposit_paid`; frontend público foi bloqueado |
| Assinatura | **P1 NO DATA API** | RPC canônico deriva preço, porém `subscriptions` ainda mantém INSERT direto mais permissivo que o contrato canônico |
| Quotes | **DML DIRETO FECHADO** | `20260525073000` revoga INSERT/UPDATE de `authenticated`; policy histórica não é alcançável sem privilégio SQL |
| Profiles | **SELF-SERVICE RESTRITO** | DML amplo revogado em `20260525086000`; migration posterior concede UPDATE somente em colunas editáveis; role tem trigger adicional |
| Suporte | **DML DIRETO FECHADO** | mensagens, anexos e conversas passam por RPCs após revogações de INSERT/UPDATE/DELETE |
| Produção/escolhas | **DML DIRETO FECHADO/AUTORITATIVO** | produção é admin-only; escolhas do cliente passam por RPC após revogação de DML direto |
| Coins | **SEM BYPASS DE CRÉDITO IDENTIFICADO** | saldo/ledger escritos por autoridade administrativa/RPC atômico; compra deriva preço no servidor |
| Notificações | **P2 AUTORIDADE/FUNCIONALIDADE** | `user_notifications` permite UPDATE de linha inteira; RPCs invoker de `admin_notifications` podem não ter UPDATE/DELETE necessário |
| Criação manual de pagamento | **REMOVIDA DO FRONTEND** | RPC legado continua executável e aceita `p_amount` |
| Confirmação de pagamento por orçamento | **REMOVIDA DO FRONTEND** | UI/hook/service mortos removidos; RPC legado de `p_amount` permanece no banco versionado |
| E2E | **BLOQUEADO EXPLICITAMENTE** | `npm run test:e2e` retorna `E2E_BLOCKED` até ambiente canônico ser reconciliado |
| Lançamento | **NO-GO** | banco, CI, E2E, deploy e release engineering ainda sem prova suficiente |

## 3. Hardening concluído no source

### Segurança e autoridade

- [x] `create-payment-intent` genérico e frontend Stripe órfão removidos;
- [x] `stripe-webhook` não altera estado do domínio a partir de metadata do provedor;
- [x] `create-subscription` e `create-subscription-v2` removidos por ativarem assinatura sem prova financeira e não terem consumidor ativo;
- [x] criação avulsa bloqueada com `PAYMENT_FLOW_UNAVAILABLE` enquanto o contrato de depósito permanecer inseguro;
- [x] saldo avulso auditado: ownership/status/deadline validados e comprovante não significa aprovação;
- [x] upload de comprovante manual auditado: owner-only e primeira evidência muda apenas para `under_review`;
- [x] suporte auditado contra BOLA/IDOR em conversa, mensagem e anexo;
- [x] cancelamento de assinatura valida ownership no Edge e novamente no RPC atômico;
- [x] `createPayment` removido da camada canônica do frontend;
- [x] `PaymentLinkCard`, `usePaymentConfirmation` e `payment-confirmation-service` removidos por ausência de consumidor e autoridade de valor no cliente;
- [x] suites antigas que inseriam `active`, `deposit_paid` ou valores comerciais diretamente foram removidas;
- [x] placeholder E2E que apenas validava arrays/mocks foi removido;
- [x] `test:e2e` agora falha fechado enquanto a infraestrutura canônica não puder ser validada;
- [x] auditor comercial corrigido para interpretar grants/revokes pelo estado efetivo;
- [x] auditor de profiles corrigido para distinguir grant de coluna de grant de tabela;
- [x] auditor de autoridade de notificações criado e ligado ao Quality Gate;
- [x] contrato TS de `mark_all_notifications_read` alinhado ao retorno `void` da migration atual.

### Produção, capacidade e calendário

- [x] `monthly_production_limit` é autoridade de capacidade mensal;
- [x] falta de configuração não vira capacidade/venda disponível;
- [x] ciclos inexistentes não viram disponibilidade fictícia;
- [x] scheduling deriva plano/quantidade persistidos e exige `shipping_date` real;
- [x] cron mensal evita colisão de `delivery_number` após pausa;
- [x] deadlines e calendário usam instantes reais com Bahia explícita;
- [x] escolha real de personagem usa `character_choices`; pré-escolha usa `production_queue`;
- [x] seleção de personagem valida vínculo com coleção/entrega;
- [x] DML direto de `subscription_deliveries` e `character_choices` foi revogado para o navegador nos contratos canônicos.

### Governança e limpeza

- [x] `AGENTS.md`, `README.md` e este arquivo representam o contrato operacional atual;
- [x] funções sem consumidor que duplicavam autoridade foram removidas do source;
- [x] wrappers/reexports desnecessários removidos nos fluxos auditados;
- [x] documentação de comandos de março removida por conter práticas e comandos defasados;
- [x] mocks/placeholders comerciais removidos dos caminhos auditados.

## 4. P1 comprovado — autoridade comercial residual

A migration histórica `20260429000001_harden_public_grants.sql` concedeu DML amplo a `authenticated`. Várias áreas foram corretamente fechadas por migrations posteriores; o bloqueio deve considerar **somente o privilégio final efetivo**.

### Ainda aberto

- `standalone_purchases`: não foi encontrada revogação posterior do INSERT de `authenticated`; a policy `standalone_purchases_insert_own` continua potencialmente alcançável. Isso permite contornar a autoridade do RPC atômico;
- `subscriptions`: não foi encontrada revogação posterior do INSERT de `authenticated`; `subscriptions_insert_own_pending_checkout` ainda aceita campos comerciais no INSERT que o checkout canônico deveria derivar do plano;
- `admin_verify_subscription_payment_voucher` promove a linha existente para `active/paid` sem recalcular todos esses campos comerciais antes da ativação;
- `create_manual_payment_for_current_user` continua executável por `authenticated` e aceita `p_amount`;
- `notify_quote_payment_for_current_user` continua executável por `authenticated`, aceita `p_amount` e não possui consumidor frontend atual;
- `create_standalone_purchase_atomic` é service-role only e deriva preço/capacidade, porém hoje cria a compra como `deposit_paid` e registra `deposit_paid_at=now()` apenas com o fluxo de comprovante; por isso o frontend público permanece bloqueado.

### Falsos positivos já descartados

- `quotes`: `20260525073000_support_payment_mutation_rpcs.sql` revoga INSERT/UPDATE de `anon, authenticated`; a policy histórica de INSERT próprio não cria bypass efetivo;
- `profiles`: `20260525086000_customer_profile_capacity_order_rpcs.sql` revoga INSERT/UPDATE/DELETE de `authenticated`; `20260621182630` reabre somente UPDATE das colunas self-service aprovadas;
- `support_messages`, `support_attachments` e `support_conversations`: DML direto do navegador foi revogado e as mutações passam por RPCs validados;
- `character_choices` e `subscription_deliveries`: DML direto foi revogado; mutações do cliente passam por RPCs de ownership/estado/deadline;
- `user_coins` e `coin_transactions`: não foi identificado caminho de cliente para creditar saldo arbitrariamente.

**Conclusão:** reativar o Supabase antes de reconciliar os P1 restantes é **NO-GO**.

## 5. P2 comprovado — autoridade de notificações

Há dois problemas opostos no histórico versionado:

1. `user_notifications` mantém UPDATE direto de linha inteira para o proprietário, embora a intenção de produto seja somente marcar leitura. Com o grant amplo histórico, um usuário pode potencialmente alterar conteúdo/metadata da própria notificação em vez de apenas `is_read/read_at`.
2. `admin_notifications` teve INSERT/UPDATE/DELETE de `authenticated` revogado em `20260525073000`, mas `20260615134127` converteu `mark_notification_read`, `mark_all_notifications_read` e `admin_delete_notification` para `SECURITY INVOKER`. Sem grants posteriores de UPDATE/DELETE, esses RPCs podem falhar por privilégio insuficiente. O frontend admin ainda chama esses contratos.

O guardrail `scripts/security/audit-notification-authority.mjs` exige menor privilégio: UPDATE de leitura deve ser por coluna ou por RPC `SECURITY DEFINER` explicitamente autorizado; exclusão administrativa deve permanecer atrás de RPC admin, sem reabrir DELETE amplo no Data API.

## 6. Infraestrutura bloqueada

### GitHub Actions

Prova atual:

- último run inspecionado: `33367802679` (`Quality Gate`, HEAD `c6600dc...`) = `completed/failure` em cerca de 5 s;
- runs anteriores equivalentes retornaram job sem steps e log indisponível;
- portanto não existe prova de que `npm ci`, format, typecheck, lint, auditorias, testes ou build chegaram a executar.

Não atribuir essa falha ao source até existir step/log que prove isso.

### Supabase

Projeto canônico `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`) está **INACTIVE**.

Enquanto permanecer inativo:

- não aplicar migration;
- não declarar schema remoto reconciliado;
- não regenerar tipos como se fossem prova oficial;
- não reativar automaticamente;
- não assumir que remover source removeu função remota já publicada.

Quando houver decisão explícita para restaurar, a ordem é: **neutralizar drift remoto → medir migration/schema drift → gerar migrations oficiais → aplicar/verificar → advisors/tipos → E2E**.

## 7. Próxima ordem de execução

### P0 — recuperar prova de engenharia

- [ ] identificar por que GitHub Actions encerra antes dos steps;
- [ ] obter execução real de `npm ci` em Node 24;
- [ ] format/typecheck/lint;
- [ ] executar `security:supabase-access`, auditor comercial, auditor de profiles e auditor de notificações;
- [ ] testes/coverage;
- [ ] build;
- [ ] `npm audit --omit=dev --audit-level=high`;
- [ ] só então configurar proteção obrigatória da `main`.

### P1 — Supabase/comercial

- [ ] decidir quando restaurar `Ordax-2026-1`;
- [ ] neutralizar Edge Functions remotas retiradas do Git antes de tráfego;
- [ ] medir drift de schema/migrations;
- [ ] gerar migration oficial para revogar INSERT direto de `subscriptions` e `standalone_purchases`;
- [ ] corrigir contrato de depósito avulso para estado inicial não pago;
- [ ] retirar/reformular RPCs legados que aceitam `amount` do cliente;
- [ ] provar checkout/ativação de assinatura com preço, entregas e créditos derivados do plano persistido;
- [ ] provar RLS/grants/Storage/functions/advisors;
- [ ] regenerar tipos;
- [ ] substituir o gate E2E por suíte real contra ambiente seguro.

### P2 — segurança e domínio

- [ ] corrigir menor privilégio de `user_notifications` e os RPCs invoker de `admin_notifications` em migration oficial;
- [ ] concluir inventário de `SECURITY DEFINER` e `verify_jwt=false`;
- [ ] continuar auditando demais tabelas originalmente listadas em `authenticated_dml_tables`, sempre pelo estado efetivo final;
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

## 8. Critérios mínimos de GO

Nenhum GO enquanto qualquer item abaixo estiver ausente:

- Quality Gate executado até o fim e verde no HEAD da release;
- build/deploy reproduzível e smoke comprovado;
- Supabase ativo, reconciliado e sem drift crítico;
- auditores de autoridade verdes;
- nenhuma função remota retirada ainda exposta;
- pagamentos/assinatura/compra avulsa E2E provados com idempotência;
- RLS/grants/Storage/advisors revisados no banco real;
- segredos e RBAC provados;
- rollback e recuperação ensaiados.

## 9. Checkpoint atual

Concluído nesta continuação:

- RLS de leitura de `manual_payments` confirmado owner-only;
- frontend de criação manual e confirmação morta de orçamento removidos;
- suites E2E/placeholders que codificavam fluxos inseguros removidas;
- `test:e2e` transformado em gate fail-closed enquanto o ambiente canônico estiver indisponível;
- auditor comercial criado e corrigido para refletir grants/revokes efetivos;
- auditor de profiles criado e corrigido; `profiles` deixou de ser tratado como falso P1;
- suporte, produção, escolhas, coins e quotes reavaliados pelo privilégio efetivo e removidos da lista de P1 quando as revogações posteriores foram encontradas;
- auditor de notificações criado e ligado ao Quality Gate;
- contrato frontend de `mark_all_notifications_read` alinhado ao `RETURNS void` versionado;
- GitHub Actions gera runs, porém eles ainda falham antes de steps executáveis.

Commits desta sequência:

- `4f9b61070cbdd3c97f9f4885522f151cd57b8596` — corrige auditor de autoridade de profiles;
- `5282d7bf4529aa7f15a66f2f057d3f969d975966` — corrige auditor comercial por estado efetivo;
- `224cdc0832580595f5bce15cad8fa41a464a3ba1` — cria auditor de notificações;
- `c6600dc01e81f4cc1edb64af6f98c3012a72db26` — adiciona auditor de notificações ao Quality Gate;
- `d425fd40feae43dba47046b1033dc4bb1a107f75` — alinha retorno do RPC de marcar todas as notificações;
- `c863055493b8ff191183a8d6c70ddf40b43d8cb2` — cobre autoridade de DELETE administrativo no auditor de notificações.

Next action:

1. continuar o inventário das tabelas do grant DML histórico, priorizando qualquer campo de estado/autoridade financeira ou administrativa;
2. diagnosticar a falha pré-step do GitHub Actions por metadados disponíveis;
3. manter Supabase e fluxos comerciais públicos fail-closed;
4. quando o projeto Supabase for restaurado por decisão operacional, reconciliar primeiro o banco e gerar as migrations oficiais dos P1/P2 acima.

Do not repeat:

- não classificar policy histórica como vulnerabilidade sem verificar o grant efetivo final;
- não editar migration histórica;
- não inventar nome/timestamp de migration;
- não reativar Supabase automaticamente;
- não abrir pagamento/assinatura/compra pública enquanto os P1 permanecerem;
- não reabrir DML amplo apenas para fazer RPC invoker funcionar;
- não criar branch/PR;
- não declarar CI verde, migration aplicada, deploy válido ou GO sem prova.
