# URGENTE — prontidão para lançamento

Status: **EM EXECUÇÃO — NO-GO para lançamento**  
Atualizado em: **2026-08-31 (America/Bahia)**  
Branch operacional: **main somente**  
HEAD funcional antes deste documento: `2818f19e55e7fb7e939279c31fd9ce0826b78edf`

Este arquivo é o **SSOT operacional** da preparação para lançamento do ORDAX. O histórico detalhado permanece no Git; este documento mantém apenas regras vigentes, estado atual, bloqueios, provas e próxima ordem de execução.

## 1. Regras vigentes

1. Trabalhar diretamente na `main`; não criar branch/PR sem nova instrução explícita.
2. Commits pequenos e reversíveis.
3. Frontend nunca é fronteira suficiente de autorização ou segurança.
4. Preço, crédito, disponibilidade, capacidade, pagamento, prazo e permissão devem falhar fechados quando a fonte oficial não puder ser validada.
5. Segredos e `service_role` nunca entram em `VITE_*` ou bundle do navegador.
6. Um domínio deve ter uma autoridade canônica; remover mocks, executores e caminhos paralelos desnecessários.
7. Código/migration versionado não equivale a deploy ou prova remota.
8. Não editar migrations históricas nem tipos gerados para mascarar drift.
9. Não declarar GO, CI verde, migration aplicada ou segurança remota sem prova reproduzível.
10. `timestamptz` representa um instante real; Bahia é regra/calendário/apresentação, não um deslocamento artificial antes de `toISOString()`.
11. Comprovante enviado não equivale a pagamento aprovado; somente contrato server-side canônico pode promover estado financeiro.
12. Metadata de provedor externo não é autoridade para alterar pedido/assinatura do domínio sem vínculo e valor validados pelo servidor.

## 2. Estado atual

| Área | Estado | Observação |
| --- | --- | --- |
| Branch | **main somente** | decisão explícita do usuário |
| HEAD funcional | `2818f19e55e7fb7e939279c31fd9ce0826b78edf` | checkpoint 15 antes deste documento |
| Proteção da main | **PENDENTE** | `protected=false`, required checks desligados |
| Quality Gate | **SEM PROVA NO HEAD ATUAL** | GitHub Actions associado = nenhum; Vercel falha por `build-rate-limit` |
| Runtime | **Node 24.x** | manifesto/workflow alinhados |
| Pacote | **ordax-web@0.1.0** | identidade de template removida |
| Package manager | **NÃO CONSOLIDADO** | manter locks concorrentes até `npm ci` real |
| Coleções públicas | **DESATIVADAS** | `PUBLIC_COLLECTIONS_ENABLED = false`; compra/assinatura pública ficam escondidas |
| Comercial BRL/coins | **FAIL-CLOSED NO CÓDIGO AUDITADO** | sem preço/entrada/crédito fictício nos caminhos corrigidos |
| Stripe genérico | **REMOVIDO DO SOURCE** | endpoint client-controlled de PaymentIntent e frontend órfão removidos |
| Stripe webhook | **ISOLADO DO DOMÍNIO** | somente espelha estado em tabelas Stripe; metadata não muda `orders/subscriptions` |
| Criação de assinatura legada | **REMOVIDA DO SOURCE** | `create-subscription` e `create-subscription-v2` não tinham consumidor e ativavam assinatura sem prova de pagamento |
| Compra avulsa | **FAIL-CLOSED NO SOURCE** | criação bloqueada enquanto RPC puder marcar `deposit_paid` sem pagamento comprovado |
| Saldo avulso | **CONTRATO AUDITADO** | owner-only, deadline/status validados, comprovante não aprova pagamento |
| Produção/capacidade | **FAIL-CLOSED VERSIONADO** | sem abertura/capacidade otimista quando fonte oficial falha |
| Prazos operacionais | **SSOT VERSIONADO** | sete prazos canônicos em `system_settings` |
| Escolha de personagem | **SSOT VERSIONADO** | pré-escolha em `production_queue`; escolha real em `character_choices` |
| Crons críticos | **ENDURECIDOS NO SOURCE** | instantes UTC reais + calendário Bahia explícito |
| Agendamento de entregas | **SSOT VERSIONADO** | plano/quantidade persistidos + `shipping_business_days` oficial |
| Métricas de produção | **MEDIDAS/FAIL-CLOSED** | placeholders 0 removidos do caminho ativo |
| Uploads sensíveis | **SERVER-AUTHORITY VERSIONADA** | comprovantes/suporte privados; scanner server-only |
| Supabase canônico | **INATIVO** | `pdytjhtjlxvbbeuxgnms` = `Ordax-2026-1`; `get_project` confirmou `INACTIVE` |
| Drift de Edge Functions | **COMPROVADO** | remoto ainda lista endpoints retirados do Git como ACTIVE; tombstone não pôde ser deployado porque projeto está inativo |
| Tipos Supabase | **SEM REGENERAÇÃO OFICIAL** | projeto inativo impede prova/geração confiável |
| Deploy/visual | **SEM PROVA ATUAL** | Vercel bloqueado por limite de build; smoke recente ausente |
| Lançamento | **NO-GO** | CI, banco remoto, pagamentos E2E, segurança e release engineering sem prova suficiente |

## 3. Hardening concluído

### Governança e limpeza

- [x] `AGENTS.md`, `README.md` e `URGENTE.md` consolidados como contrato/SSOT;
- [x] ruído/legados/documentação enganosa removidos ou arquivados do caminho ativo;
- [x] catálogo mock/placeholders demonstrativos removidos do runtime auditado;
- [x] compra fake de coins removida;
- [x] `schedule-deliveries` removido por ausência de consumidor e autoridade duplicada;
- [x] `cancel-standalone-for-non-payment` removido do source; cron usa RPC atômico diretamente;
- [x] `send-group-emails-batch` removido por ausência de consumidor e superfície privilegiada desnecessária;
- [x] wrapper `src/lib/standalone-purchase-service.ts` removido; página aponta ao serviço canônico;
- [ ] continuar inventário de flags, rotas, no-ops e integrações opcionais.

### Comercial, assinatura e pagamentos

- [x] preços avulsos, PIX, entrada e planos não usam fallbacks comerciais locais nos caminhos corrigidos;
- [x] editores administrativos não inicializam/salvam valores exemplo como configuração real;
- [x] equivalência fictícia coins↔reais removida;
- [x] pagamento administrativo de assinatura exige créditos persistidos;
- [x] `coins_included` e `total_credits` sincronizados em novas escritas; divergência rejeitada;
- [x] comprovantes/anexos sensíveis usam autoridade server-side/buckets privados nos caminhos endurecidos;
- [x] cron de saldo usa `deposit_amount`/`balance_amount` persistidos e RPC atômico;
- [x] UI não fabrica depósito fixo quando não possui valor oficial;
- [x] `create-payment-intent` genérico removido: cliente não pode escolher `amount`/metadata e obter PaymentIntent por esse caminho;
- [x] serviço/hook/componente/browser Stripe órfãos desse fluxo foram removidos;
- [x] `stripe-webhook` não promove mais `orders`/`subscriptions` a partir de metadata Stripe;
- [x] `create-subscription` e `create-subscription-v2` removidos do source por ativarem assinatura sem verificação de pagamento e não possuírem consumidor ativo;
- [x] `create-standalone-purchase` bloqueia criação com `PAYMENT_FLOW_UNAVAILABLE` enquanto o RPC legado ainda puder iniciar `deposit_paid` sem prova;
- [x] `submit_standalone_balance_voucher` auditado: ownership, status e deadline são validados e o comprovante não altera status para pago;
- [ ] criar/aplicar migration corretiva para compra avulsa quando o Supabase estiver operacional: estado inicial não pago + aprovação de depósito canônica;
- [ ] retirar/invalidar `create_subscription_atomic` legado no banco, após prova de ausência de consumidor e com migration gerada oficialmente;
- [ ] testar assinatura/pagamento/compra avulsa ponta a ponta em ambiente operacional.

### Produção, capacidade, ciclos e entregas

- [x] `monthly_production_limit` é autoridade de capacidade mensal;
- [x] ausência de configuração não vira capacidade 100 nem vendas abertas;
- [x] ciclo futuro inexistente não equivale a capacidade disponível;
- [x] `admin_get_or_create_delivery_cycle` exige capacidade explícita ou setting oficial;
- [x] `cron-transition-cycles` usa instante UTC real, Bahia explícita e `shipping_business_days` oficial;
- [x] `admin_schedule_subscription_deliveries` deriva plano/quantidade da assinatura/plano persistidos;
- [x] `shipping_date` precisa existir; não é fabricada;
- [x] cron mensal usa menor `delivery_number` ausente, evitando colisão após pausa;
- [x] `pause-subscription` delega cutoff/estado/capacidade ao RPC atômico;
- [ ] reconciliar funções SQL históricas de calendário/timezone quando o banco puder ser validado;
- [ ] revisar bônus Semestral como política de produto antes da RC.

### Escolha de personagem

- [x] BOLA de mudança de coleção revisada com `auth.uid()`/ownership server-side;
- [x] troca de personagem exige vínculo com a coleção da entrega;
- [x] tradução `collection_characters.id` → `characters.id` corrigida;
- [x] `production_queue` é a autoridade pré-escolha;
- [x] `character_choice_days` oficial gera deadline persistido ao entrar em `awaiting_choice`;
- [x] lembretes/expiração usam solicitação pendente real;
- [x] trigger/invariante impede escolha `submitted` sem solicitação aberta compatível;
- [x] erro de leitura não é mascarado como ausência de registro.

### Edge Functions, tempo e notificações

- [x] `cron-check-balance-deadlines` usa instante real e RPC atômico;
- [x] `cron-reveal-characters` usa instante real e evita dupla revelação concorrente;
- [x] `cron-update-tracking` valida persistência e timestamp real;
- [x] `send-alert-digest` não depende do RPC fantasma `get_production_metrics`; deriva métricas persistidas e aceita cron/admin autenticado;
- [x] `send-email` separa service-to-service de chamada humana admin;
- [x] `email-delivery-webhook` não adivinha registro pelo último e-mail do destinatário;
- [x] conteúdo de e-mail/chat auditado usa escape/sanitização nos caminhos corrigidos;
- [x] Stripe webhook valida assinatura do provedor e persiste somente estado Stripe;
- [ ] terminar inventário de `verify_jwt=false` e `SECURITY DEFINER` com prova remota quando o projeto estiver ativo.

## 4. Bloqueios comprovados

### GitHub Actions / Vercel

No HEAD `2818f19e55e7fb7e939279c31fd9ce0826b78edf`:

- `fetch_commit_workflow_runs` retornou `[]`;
- combined status contém somente `Vercel = failure`;
- URL do status contém `upgradeToPro=build-rate-limit`.

Conclusão: **não existe prova de typecheck/lint/test/build no HEAD atual**. Não interpretar a falha Vercel como erro de source nem marcar CI verde.

### Supabase

Projeto canônico: `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`). Estado confirmado: **INACTIVE**.

Consequências observadas nesta rodada:

- `execute_sql` não conseguiu fornecer prova do banco operacional;
- tentativa de deploy de tombstone para `create-payment-intent` falhou porque o serviço do projeto não está disponível enquanto `INACTIVE`;
- `list_edge_functions` ainda lista versões ACTIVE de funções retiradas do Git, incluindo `create-payment-intent`, `schedule-deliveries`, `cancel-standalone-for-non-payment`, `send-group-emails-batch`, `create-subscription` e `create-subscription-v2`;
- source removido **não significa endpoint remoto removido**;
- não restaurar projeto automaticamente sem decisão operacional explícita;
- quando restaurado, primeira ação é medir drift e neutralizar/deletar endpoints retirados antes de qualquer tráfego de produção;
- migrations corretivas devem ser geradas pelo fluxo oficial (`supabase migration new`/`db pull`) e depois verificadas; não inventar filename nem editar migration histórica aplicada;
- regenerar tipos oficialmente e executar advisors `security`/`performance` depois da reconciliação.

### Deploy/visual

- mudanças recentes não possuem build/smoke público comprovado;
- Vercel está bloqueado por limite de build;
- coleções públicas permanecem desativadas, reduzindo exposição dos fluxos comerciais ainda em correção;
- não aprovar UI por inspeção estática.

## 5. Próxima ordem de execução

### P0 — Prova de engenharia

- [ ] restaurar execução real do GitHub Actions/Vercel;
- [ ] `npm ci` em Node 24;
- [ ] format/typecheck/lint/test/coverage/build;
- [ ] `npm audit` e correção controlada de high/critical;
- [ ] proteger `main` somente quando Quality Gate executar de verdade.

### P1 — Supabase/pagamentos

- [ ] decidir operacionalmente quando restaurar `Ordax-2026-1`;
- [ ] ao restaurar, neutralizar endpoints remotos retirados antes de tráfego;
- [ ] medir migration/schema drift;
- [ ] criar migration correta para compra avulsa: `awaiting_deposit`/equivalente pendente, sem `deposit_paid_at` até aprovação real;
- [ ] retirar RPC `create_subscription_atomic` legado se a prova remota confirmar ausência de consumidor;
- [ ] provar RLS/grants/Storage/Edge Functions/advisors;
- [ ] regenerar tipos;
- [ ] testar pagamentos E2E e idempotência.

### P2 — Segurança e domínio

- [ ] continuar auditoria BOLA/IDOR em suporte, pedidos e RPCs cliente;
- [ ] concluir inventário `SECURITY DEFINER`/`verify_jwt=false`;
- [ ] provar ausência de `service_role` no bundle;
- [ ] testar scanner server-side real e fail-closed;
- [ ] reconciliar helpers SQL históricos de timezone com Bahia.

### P3 — Funcionalidade/UI

- [ ] smoke público e catálogo real;
- [ ] auth completo;
- [ ] cliente: perfil/wishlist/dashboard/notificações/suporte;
- [ ] admin/RBAC;
- [ ] desktop/tablet/mobile + loading/vazio/erro/retry;
- [ ] acessibilidade e Lighthouse/Core Web Vitals medidos.

### P4 — Release engineering

- [ ] SemVer e política de release;
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
- [ ] pagamentos/uploads testados ponta a ponta;
- [ ] catálogo real e estados de falha honestos;
- [ ] fluxos público/cliente/admin aprovados;
- [ ] acessibilidade/desempenho medidos;
- [ ] dados legais/LGPD validados;
- [ ] backup/restore/rollback ensaiados;
- [ ] RC versionada, monitorada e reversível.

## 7. Checkpoints recentes

### Checkpoint 12 — 2026-08-31

HEAD funcional: `c6436fb570d0a721ef77b6db59a14872a235cd19`  
Foco: produção/capacidade fail-closed, remoção de capacidade 100, validação de ciclos e testes determinísticos.

### Checkpoint 13 — 2026-08-31

HEAD funcional: `8d538fd6ecf06d24ef12f2c8ea8e4ebeebd58164`  
Foco: SSOT de agendamento, integridade de escolha cliente e métricas medidas.

### Checkpoint 14 — 2026-08-31

HEAD funcional: `e70dc98d4e8c45beea887817513dc9263c280764`  
Foco: deadlines/tempo, crons, pausa, envio interno de e-mail, remoção de scheduler legado e hardcodes comerciais encontrados.

### Checkpoint 15 — 2026-08-31

HEAD funcional antes deste documento: `2818f19e55e7fb7e939279c31fd9ce0826b78edf`

Concluído:

- endpoint genérico `create-payment-intent` removido porque permitia ao cliente escolher `amount`/metadata e não tinha consumidor de UI;
- serviço, hook, componente Stripe e browser client órfãos desse fluxo removidos;
- `stripe-webhook` deixou de usar `orderId`/`subscriptionId` de metadata para promover estado do domínio;
- `create-subscription` e `create-subscription-v2` removidos: sem consumidor ativo e capazes de criar assinatura `active` sem prova real de pagamento;
- `send-alert-digest` consolidado sobre dados versionados, sem RPC fantasma;
- funções privilegiadas mortas adicionais removidas (`cancel-standalone-for-non-payment`, `send-group-emails-batch`);
- `create_standalone_purchase_atomic` auditado e identificado como P1: calcula preço/coleção/capacidade corretamente, porém inicia `deposit_paid` e `deposit_paid_at = now()` mesmo sem comprovante;
- por esse motivo `create-standalone-purchase` passou a falhar fechado com `PAYMENT_FLOW_UNAVAILABLE` até migration corretiva aplicada/testada;
- teste-placeholder que documentava `deposit_paid` como comportamento correto foi removido;
- `submit_standalone_balance_voucher` auditado e mantido: owner-only, status/deadline validados e sem promoção automática para pago;
- wrapper de serviço avulso removido; import canônico passou a `src/services/payments/standalone-purchase-reservation-service.ts`;
- `PUBLIC_COLLECTIONS_ENABLED = false` confirmado, mantendo compra/assinatura públicas escondidas durante o hardening;
- Supabase remoto confirmado `INACTIVE`; endpoints antigos continuam listados como ACTIVE e não puderam ser tombstonados/deployados nesse estado.

Commits centrais desta continuação:

- `ce67704d495026304d79f25d8c829a9f4ffe8eec` — remove PaymentIntent genérico;
- `b70f1f533b4866ed6b8c53e74baac28dc531f469` / `fca648a9b9168969e1ad9c7a12b6f0afac282a72` / `b804ffb3ee96f24fa3113e41b49c7ea2a675c15c` / `125768f30e52593c97aeea0ec12527d6a331df11` — remove frontend Stripe órfão;
- `d10d879b534e0a7ed49747a33aabf4ad6955c37b` — isola webhook Stripe do estado de domínio;
- `c375f3780c8faa9b8211420b877fb9f755282f9c` / `65d8b98398e79aabd39cb3a4aa3f6a2049d8499f` — remove criações de assinatura inseguras;
- `7e237bbb1c7d2a80864e2724bb34c3b01b2df22d` / `ba134b36a5764cfda1846c7416751d71632ac8b7` — remove teste/README do v2 legado;
- `9f9c9b63277b58a2c16cfaa053166691e87cbd37` — bloqueia criação avulsa até correção do estado de depósito;
- `54100d5da19a4c3e61b10d9f8c35592b5c302a97` — remove testes-placeholder da criação avulsa;
- `c57200e2877d841512fd79c59b7ec98b4ea51da5` / `2818f19e55e7fb7e939279c31fd9ce0826b78edf` — canonicaliza serviço/UI avulso.

Provas/limitações:

- GitHub Actions no HEAD `2818f19...`: `[]`;
- Vercel no mesmo HEAD: `failure` por `build-rate-limit`;
- Supabase `Ordax-2026-1`: `INACTIVE`;
- tentativa de deploy remoto de tombstone: bloqueada pelo projeto inativo;
- portanto **não existe prova de build, deploy, migrations ou E2E destas alterações**.

Next action:

1. continuar auditoria BOLA/IDOR em suporte/pedidos e RPCs privilegiados sem depender do banco remoto;
2. manter pagamentos/coleções fail-closed enquanto o projeto estiver inativo;
3. quando houver decisão explícita de restaurar o Supabase, neutralizar primeiro as funções remotas retiradas e só então reconciliar schema/migrations;
4. recuperar execução real de Quality Gate/build;
5. executar E2E/smoke somente depois das provas de banco e build.

Do not repeat:

- não reativar projeto Supabase automaticamente;
- não usar metadata do provedor como autoridade de domínio;
- não criar estado `paid/active` a partir de payload/comprovante não verificado;
- não inventar migration filename nem editar migration histórica aplicada;
- não manter Edge Function sem consumidor que replique autoridade existente;
- não transformar erro/NULL em sucesso, preço, prazo, capacidade ou disponibilidade fictícia;
- não criar branch/PR;
- não declarar migrations aplicadas, CI verde ou GO sem prova.
