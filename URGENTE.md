# URGENTE — prontidão para lançamento

Status: **EM EXECUÇÃO — NO-GO para lançamento**  
Atualizado em: **2026-08-31 (America/Bahia)**  
Branch operacional: **main somente**  
HEAD funcional antes deste documento: `2f8bb14ba89b301448b330712ac423b45417ed60`

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
14. Grants/policies devem ser avaliados pelo **estado efetivo após todas as migrations**, não por uma migration histórica isolada.
15. `timestamptz` representa instante real; Bahia é regra/calendário/apresentação, não deslocamento artificial antes de `toISOString()`.
16. Nome de operação comercial deve corresponder ao efeito real; não prometer pagamento, reembolso, reserva ou aprovação quando o backend não executa esse efeito.
17. Quando um fluxo financeiro está bloqueado no backend, a UI deve ser informativa/read-only; não solicitar pagamento ou comprovante para depois falhar.

## 2. Estado atual

| Área | Estado | Observação |
| --- | --- | --- |
| Branch | **main somente** | decisão explícita vigente |
| HEAD funcional | `2f8bb14ba89b301448b330712ac423b45417ed60` | antes deste update do SSOT |
| Proteção da main | **PENDENTE** | branch não protegida; checks obrigatórios desligados |
| GitHub Actions | **FALHA ANTES DOS STEPS** | run `33452684424`, job `99685862649`, `steps=[]`, `runner_id=0` |
| Vercel | **SEM PROVA DE DEPLOY VÁLIDO** | status isolado não prova erro de source nem release válida |
| Runtime | **Node 24.x** | manifesto/workflow alinhados |
| Supabase canônico | **INACTIVE** | `pdytjhtjlxvbbeuxgnms` / `Ordax-2026-1` |
| Drift de Edge Functions | **COMPROVADO** | remoto pode manter funções retiradas do Git; projeto inativo impede neutralização/prova atual |
| Assinatura pública | **BROWSE-ONLY** | planos/coleções consultáveis; pagamento, comprovante e checkout removidos da UI |
| Compra avulsa | **BROWSE-ONLY / P1 DB** | preço/personagem consultáveis; reserva/CTA financeiro removidos da UI |
| Notificações admin | **READ-ONLY / P2 DB** | leitura mantida; mark-read/delete retirados do frontend até privilégio ser reconciliado |
| Assinatura por créditos | **P1 DB** | RPC de ativação ainda precisa exigir prova financeira canônica |
| Criação manual de pagamento | **REMOVIDA DO FRONTEND** | RPC legado ainda aceita `p_amount` |
| Confirmação de pagamento por orçamento | **REMOVIDA DO FRONTEND** | RPC legado de `p_amount` permanece dívida de banco |
| Quotes | **DML DIRETO FECHADO** | revoke posterior invalida falso positivo histórico |
| Profiles | **SELF-SERVICE RESTRITO** | DML amplo revogado; UPDATE apenas por colunas aprovadas; role protegida |
| Suporte | **DML DIRETO FECHADO** | conversa/mensagem/anexo passam por RPCs validados após revogações |
| Produção/escolhas | **AUTORIDADE SERVER-SIDE** | produção admin-only; escolha cliente por RPC/estado da fila |
| Coins | **SEM BYPASS DE CRÉDITO IDENTIFICADO** | saldo/ledger escritos por autoridade administrativa/RPC atômico |
| E2E | **BLOQUEADO EXPLICITAMENTE** | não fingir E2E enquanto ambiente canônico está inativo/inseguro |
| Lançamento | **NO-GO** | banco, CI, E2E, deploy e release engineering ainda sem prova suficiente |

## 3. Hardening concluído no source

### Autoridade comercial e pagamentos

- [x] `create-payment-intent` genérico e frontend Stripe órfão removidos;
- [x] `stripe-webhook` não promove estado de pedido/assinatura a partir de metadata do provedor;
- [x] `create-subscription` e `create-subscription-v2` inseguros removidos;
- [x] checkout principal de assinatura fail-closed no service e posteriormente **retirado da UI/hook/service de mutação**;
- [x] `SubscribeCollection` virou página de consulta: não seleciona pagamento, não recebe comprovante e não confirma assinatura;
- [x] criação avulsa tombstonada no Edge com `PAYMENT_FLOW_UNAVAILABLE`;
- [x] `BuyCharacter` virou página de consulta: não reserva, não cobra e não recebe comprovante;
- [x] `createStandalonePurchaseReservation` retirado do service de página;
- [x] `StandalonePurchaseButton` e `useStandalonePurchaseAvailability` órfãos removidos;
- [x] suíte antiga de criação avulsa removida por codificar `deposit_paid` e entrada fixa de R$ 100 como comportamento correto;
- [x] saldo avulso auditado: ownership/status/deadline validados; comprovante não significa aprovação;
- [x] upload de comprovante manual auditado: primeira evidência vai para revisão, não para pago;
- [x] `createPayment`, confirmação morta de orçamento e UI manual órfã removidos;
- [x] ativação de assinatura por créditos retirada do frontend enquanto o RPC não comprova pagamento;
- [x] UI de “cancelamento com reembolso” removida onde backend não movimenta dinheiro;
- [x] Stripe/webhooks endurecidos para não adivinhar registro alvo nem ignorar persistência crítica.

### Notificações e suporte

- [x] suporte auditado contra BOLA/IDOR em conversa, mensagem e anexo;
- [x] DML direto de `support_conversations` e `support_messages` revogado no estado efetivo;
- [x] `AdminNotificationHistory` tornou-se explicitamente read-only;
- [x] `NotificationCenter` não marca mais notificações automaticamente ao clicar;
- [x] hooks/services frontend de mark-read/mark-all/delete removidos enquanto o contrato SQL está inconsistente;
- [x] erros de leitura de notificações não viram “lista vazia” silenciosa;
- [x] auditor de autoridade de notificações ligado ao Quality Gate.

### Produção, capacidade e calendário

- [x] `monthly_production_limit` é autoridade de capacidade mensal;
- [x] falta de configuração não vira capacidade/venda disponível;
- [x] ciclos inexistentes não viram disponibilidade fictícia;
- [x] scheduling deriva plano/quantidade persistidos e exige `shipping_date` real;
- [x] cron mensal evita colisão de `delivery_number` após pausa;
- [x] deadlines e calendário usam instantes reais; Bahia não altera artificialmente timestamps UTC;
- [x] escolha real de personagem usa `character_choices`; pré-escolha usa `production_queue`;
- [x] seleção de personagem valida vínculo com coleção/entrega;
- [x] DML direto de `subscription_deliveries` e `character_choices` revogado do navegador.

### Governança/limpeza

- [x] `URGENTE.md` é SSOT operacional atual; histórico detalhado permanece no Git;
- [x] funções/componentes/hooks sem consumidor que duplicavam autoridade foram removidos nos fluxos auditados;
- [x] mocks/placeholders e suítes que ensinavam comportamento financeiro incorreto foram removidos;
- [x] `test:e2e` não finge cobertura quando o ambiente canônico não está disponível;
- [x] auditor comercial considera grant/revoke efetivo e não mantém falsos positivos de `quotes/profiles/support`;
- [x] auditor de profiles diferencia grant de coluna de grant de tabela.

## 4. P1 comprovados — banco/comercial

### 4.1 `standalone_purchases`

O estado versionado ainda exige correção oficial de banco:

- INSERT direto de `authenticated`/policy histórica continua como risco efetivo até existir revoke posterior comprovado;
- `create_standalone_purchase_atomic` deriva preço/capacidade corretamente, porém cria a linha como `deposit_paid` e define `deposit_paid_at=now()` antes de prova/aprovação financeira suficiente;
- o Edge está tombstonado e a UI não possui mais criação, mas isso não substitui a migration de banco.

**Remediação:** revogar INSERT direto e fazer a compra nascer em estado explicitamente não pago (`awaiting_deposit` ou equivalente). Só autoridade financeira validada/idempotente pode promover para depósito pago.

### 4.2 `subscriptions`

- `subscriptions_insert_own_pending_checkout` permanece mais permissiva que o RPC canônico;
- campos como valor/quantidade de entregas podem divergir do plano se a Data API contornar o RPC;
- checkout UI está retirado, mas o privilégio/policy precisa ser reconciliado antes de reativação pública.

**Remediação:** revogar INSERT direto de `authenticated`; criação deve ocorrer somente por contrato que derive plano, preço, entregas e estado de registros persistidos.

### 4.3 assinatura por créditos

O RPC `activate_subscription_credit_for_current_user` historicamente cria assinatura ativa e aloca créditos sem uma prova financeira canônica/idempotente suficiente.

**Remediação:** retirar/reformular a superfície; ativação/alocação de créditos somente após evento financeiro autoritativo.

### 4.4 RPCs de valor informado pelo cliente

- `create_manual_payment_for_current_user` aceita `p_amount`;
- `notify_quote_payment_for_current_user` aceita `p_amount`.

Os callers frontend foram retirados, mas as superfícies SQL precisam ser removidas ou reescritas para derivar valor da entidade comercial oficial.

## 5. P2 comprovados — menor privilégio/contrato

### Notificações

- `user_notifications` historicamente permite UPDATE próprio mais amplo do que apenas estado de leitura;
- `admin_notifications` teve DML revogado, mas RPCs posteriores `SECURITY INVOKER` de leitura/exclusão podem não possuir grants mínimos para executar;
- frontend foi colocado em read-only até o banco ser corrigido.

**Remediação preferida:** manter DML amplo revogado e conceder apenas o mínimo necessário por coluna/RPC auditado (`is_read`, `read_at`, `updated_at` para leitura; exclusão admin por fronteira explicitamente autorizada).

### Exports legados sem consumidor

`standalone-purchase-service.ts` ainda contém exports históricos de criação/disponibilidade (`createWithDeposit`, `canCreateStandalonePurchase`) sem consumidor runtime após a limpeza desta rodada. Não existe caminho ativo da UI até eles, mas devem ser removidos quando o arquivo for refatorado sem afetar operações pós-compra legítimas.

## 6. Infraestrutura bloqueada

### GitHub Actions

Prova mais recente:

- run `33452684424` (`Quality Gate`, HEAD `2f8bb14ba89b301448b330712ac423b45417ed60`) = `completed/failure`;
- job `99685862649` = `completed/failure`;
- `steps=[]`;
- `runner_id=0`, `runner_name=''`;
- duração aproximada: 2 segundos.

**Conclusão:** o job não chega a provisionar runner/steps. Não existe prova de `npm ci`, format, typecheck, lint, auditores, testes ou build. Não atribuir essa falha ao source até existir step/log.

### Supabase

Projeto canônico `pdytjhtjlxvbbeuxgnms` (`Ordax-2026-1`) está **INACTIVE**.

Enquanto permanecer inativo:

- não aplicar migration;
- não declarar schema remoto reconciliado;
- não regenerar tipos como prova oficial;
- não reativar automaticamente;
- não assumir que remover source removeu função remota já publicada.

Quando houver decisão explícita para restaurar, a ordem é:

**neutralizar drift remoto → medir migration/schema drift → gerar migrations oficiais → aplicar/verificar → advisors/tipos → E2E**.

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
- [ ] neutralizar Edge Functions remotas retiradas/tombstonadas no Git antes de tráfego;
- [ ] medir drift de schema/migrations;
- [ ] revogar INSERT direto de `subscriptions` e `standalone_purchases` por migration oficial;
- [ ] corrigir estado inicial do depósito avulso;
- [ ] retirar/reformular RPCs de `p_amount` do cliente;
- [ ] retirar/reformular ativação gratuita de assinatura por créditos;
- [ ] provar checkout/ativação com preço, entregas e créditos derivados do plano persistido;
- [ ] advisors, RLS/grants/Storage/functions, tipos e E2E.

### P2 — segurança/domínio

- [ ] corrigir menor privilégio de notificações por migration oficial;
- [ ] concluir inventário de `SECURITY DEFINER`, wrappers `private_api` e `verify_jwt=false`;
- [ ] remover exports legados sem consumidor de `standalone-purchase-service` sem tocar nas operações pós-compra válidas;
- [ ] provar ausência de `service_role` no bundle;
- [ ] testar scanner server-side real/fail-closed;
- [ ] reconciliar helpers SQL históricos de timezone.

### P3 — produto/release

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
- nenhuma função remota retirada/tombstonada no Git ainda exposta com lógica antiga;
- pagamentos/assinatura/compra avulsa E2E provados com idempotência;
- RLS/grants/Storage/advisors revisados no banco real;
- segredos e RBAC provados;
- rollback e recuperação ensaiados.

## 9. Checkpoint desta continuação

Concluído nesta rodada:

- notificações admin tornadas read-only na página de histórico e no centro global;
- hooks/service client de mark-read/mark-all/delete retirados enquanto o contrato SQL está inconsistente;
- assinatura transformada em browse-only; pagamento, upload de comprovante e mutation removidos da UI/hook/service;
- compra avulsa transformada em browse-only; CTA de reserva, cobrança e criação removidos;
- serviço de reserva avulsa ficou somente leitura;
- `StandalonePurchaseButton` e hook de disponibilidade órfãos removidos;
- suíte de criação avulsa obsoleta removida por afirmar `deposit_paid` e R$ 100 fixos como invariantes;
- Quality Gate rechecado uma vez no HEAD funcional: continua sem runner/steps.

Commits principais desta continuação:

- `180cf2edd0e9baf6a910f5d9694eaff95f5dd6bb` — fail-close de mutações no histórico de notificações;
- `d52681e3c5ad51eb5822f578e9c6bba4c734fb46` — centro de notificações read-only;
- `6bdf90e3cca532ffb33af230471997a0baecd033` — remoção do client de mutação de notificações;
- `8d94437736253c9e907fc8dda70956910ba70785` — assinatura browse-only;
- `a9c91b8a2453ba80ebdbf4e5b249faf5e26a9aad` — remoção da mutation de checkout do service;
- `0bfe2726b0d2bd48d518c5b2d9d25f87bb343025` — compra avulsa browse-only;
- `90e80d28dac519c59065e40d3f7ee8bbe7c766a6` — serviço de reserva avulsa somente leitura;
- `ef87cbf67cb1aceeda334bea6a61ca0d1bd536d1` / `b6e208ddd678f8648671d165e3f4239949db9dc5` — remoção de botão/hook órfãos;
- `2f8bb14ba89b301448b330712ac423b45417ed60` — remoção da suíte de criação avulsa obsoleta.

Próxima ação: **seguir no P2/P1 estático sem repetir CI: remover autoridade/API legada sem consumidor, continuar inventário de mutações privilegiadas e preparar a lista exata de migrations oficiais necessárias para quando o Supabase puder ser reconciliado.**
