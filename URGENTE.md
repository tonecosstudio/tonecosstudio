# URGENTE — prontidão para lançamento

Status: **EM EXECUÇÃO — NO-GO para lançamento**  
Atualizado em: **2026-08-31 (America/Bahia)**  
Branch operacional: **main somente**  
HEAD funcional antes deste documento: `e70dc98d4e8c45beea887817513dc9263c280764`

Este arquivo é o **SSOT operacional** da preparação para lançamento do ORDAX. O histórico detalhado dos checkpoints anteriores permanece no Git; aqui ficam o estado vigente, as provas, os bloqueios e a próxima ordem de execução.

## 1. Regras vigentes

1. Trabalhar diretamente na `main`; não criar branch/PR sem nova instrução explícita.
2. Commits pequenos e reversíveis.
3. Frontend nunca é fronteira suficiente de autorização ou segurança.
4. Preço, crédito, disponibilidade, capacidade, pagamento, prazo e permissão devem falhar fechados quando a fonte oficial não puder ser validada.
5. Segredos e `service_role` nunca entram em `VITE_*` ou bundle do navegador.
6. Um domínio deve ter uma autoridade canônica; remover mocks, executores e caminhos paralelos desnecessários.
7. Código/migration versionado não equivale a deploy ou prova remota.
8. Não editar arquivos gerados para esconder drift de schema; regenerar a partir da fonte oficial.
9. Não declarar GO, CI verde, migration aplicada ou segurança remota sem prova reproduzível.
10. `timestamptz` representa um instante real; Bahia deve ser usada para regra/calendário/apresentação sem deslocar artificialmente o instante antes de `toISOString()`.

## 2. Estado atual

| Área | Estado | Observação |
| --- | --- | --- |
| Branch | **main somente** | decisão explícita do usuário |
| Proteção da main | **PENDENTE** | `protected=false`, required checks desligados |
| Quality Gate | **SEM PROVA NO HEAD ATUAL** | HEAD `e70dc98...` não possui GitHub Actions associado; status externo Vercel falha por `build-rate-limit` |
| Runtime | **Node 24.x** | manifesto/workflow alinhados |
| Pacote | **ordax-web@0.1.0** | identidade de template removida |
| Package manager | **NÃO CONSOLIDADO** | manter locks concorrentes até `npm ci` real |
| Comercial BRL/coins | **FAIL-CLOSED NO CÓDIGO AUDITADO** | sem usar preço/entrada fictícios nos caminhos corrigidos |
| Compra de coins | **REMOVIDA** | rota/CTA/componentes legados removidos |
| Créditos de assinatura | **FAIL-CLOSED VERSIONADO** | sem `CASE plan_type` fabricando créditos |
| Produção/capacidade | **FAIL-CLOSED VERSIONADO** | sem abertura/capacidade otimista quando fonte oficial falha |
| Prazos operacionais | **SSOT VERSIONADO** | sete prazos canônicos em `system_settings`; runtime não usa fallback local para decidir operação |
| Escolha de personagem | **SSOT VERSIONADO** | solicitação pré-escolha vive na `production_queue`; `character_choices` nasce na escolha real |
| Crons críticos | **ENDURECIDOS NO SOURCE** | instantes UTC reais + calendário Bahia explícito nos fluxos corrigidos |
| Agendamento de entregas | **SSOT VERSIONADO** | quantidade/tipo vêm de assinatura/plano persistidos; `shipping_business_days` é configurável |
| Scheduler legado | **REMOVIDO DO SOURCE** | `supabase/functions/schedule-deliveries` não tinha consumidor e duplicava autoridade |
| Métricas de produção | **MEDIDAS/FAIL-CLOSED** | placeholders 0 removidos do caminho ativo |
| Uploads sensíveis | **SERVER-AUTHORITY VERSIONADA** | comprovantes/suporte privados; scanner server-only |
| Supabase canônico | **CONFIRMADO, MAS INATIVO** | `pdytjhtjlxvbbeuxgnms` = `Ordax-2026-1`; último estado observado `INACTIVE` |
| Tipos Supabase | **DRIFT COMPROVADO** | geração oficial bloqueada pelo projeto inativo; não editar `types.ts` manualmente |
| Deploy/visual | **SEM PROVA ATUAL** | Vercel bloqueado por limite de build; smoke recente ausente |
| Lançamento | **NO-GO** | CI, banco remoto, E2E, segurança e release engineering sem prova suficiente |

## 3. Hardening concluído

### Governança, limpeza e superfícies falsas

- [x] `AGENTS.md`, `README.md` e `URGENTE.md` consolidados como contrato/SSOT;
- [x] ruído/legados de raiz e documentação enganosa arquivados/removidos do caminho ativo;
- [x] catálogo mock e placeholders demonstrativos removidos do runtime;
- [x] compra fake de coins removida integralmente;
- [x] feature pública de coleções não executa queries de preview quando desativada;
- [x] `schedule-deliveries` removido após prova de ausência de consumidor no código;
- [ ] continuar inventário de flags, rotas, no-ops e integrações opcionais.

### Comercial, assinatura e pagamentos

- [x] preços avulsos, PIX, entrada e planos não usam fallbacks comerciais locais nos caminhos corrigidos;
- [x] editores administrativos não inicializam/salvam valores exemplo como configuração real;
- [x] equivalência fictícia coins↔reais removida;
- [x] pagamento administrativo de assinatura exige créditos persistidos;
- [x] idempotência por referência externa preservada no corpo privilegiado vigente;
- [x] `coins_included` e `total_credits` sincronizados em novas escritas; divergência rejeitada;
- [x] comprovantes e anexos sensíveis migrados para autoridade server-side/buckets privados;
- [x] cron de saldo não afirma depósito fixo de R$ 100; usa `deposit_amount`/`balance_amount` persistidos;
- [x] `StandalonePurchaseButton` não exibe entrada fictícia quando não possui o valor oficial;
- [ ] testar pagamento/assinatura ponta a ponta em ambiente operacional.

### Produção, capacidade e ciclos

- [x] `monthly_production_limit` é a autoridade de capacidade mensal;
- [x] ausência de configuração não vira capacidade 100 nem vendas abertas;
- [x] RPC/hook/UI validam estado de produção antes de exibir ações/métricas;
- [x] ciclo futuro inexistente não equivale a capacidade disponível;
- [x] `cycle-service` não inventa datas operacionais a partir de `created_at`/relógio do cliente;
- [x] `admin_get_or_create_delivery_cycle` exige capacidade explícita ou setting oficial no caminho endurecido;
- [x] `cron-transition-cycles` usa instante UTC real, datas Bahia explícitas, capacidade oficial e `shipping_business_days` oficial;
- [x] helper Edge de dias úteis usa datas UTC date-only de forma determinística;
- [ ] reconciliar as funções SQL históricas de calendário com o timezone canônico Bahia quando o banco puder ser validado remotamente.

### Agendamento de assinatura

- [x] `admin_schedule_subscription_deliveries` deriva `plan_type`/`deliveries_total` de assinatura/plano persistidos;
- [x] `plan_type` do caller só pode coincidir com o plano persistido;
- [x] drift entre assinatura/plano bloqueia;
- [x] `shipping_date` precisa existir; não é fabricada por fallback;
- [x] resposta de agendamento malformada não vira array vazio silencioso;
- [x] cron mensal usa `shipping_business_days` oficial em vez de 5 fixo;
- [x] criação mensal usa o menor `delivery_number` ausente, evitando colisão após pausa que remove uma entrega;
- [ ] revisar regra de bônus Semestral como política de produto separada antes da RC.

### Escolhas de coleção/personagem

- [x] BOLA do `change_delivery_collection_choice_for_current_user` revisada: `auth.uid()` e ownership validados server-side;
- [x] `NULL` em `is_active/status` não é tratado como coleção ativa;
- [x] mudança real de coleção limpa referências antigas de personagem;
- [x] troca de personagem exige relação `characters ↔ collection_characters ↔ coleção da entrega`;
- [x] corrigida tradução `collection_characters.id` → `characters.id` no fluxo de `character_choices`;
- [x] `customer_submit_character_choice`/`customer_change_character_choice` exigem deadline persistido;
- [x] `production_queue` é a autoridade da solicitação antes de existir uma escolha;
- [x] entrar em `awaiting_choice` exige `system_settings.character_choice_days` válido e persiste `choice_deadline`;
- [x] lembretes/expiração usam a solicitação pendente na fila, não uma `character_choices` fictícia;
- [x] trigger/invariante de banco impede `submitted` sem solicitação aberta única e compatível;
- [x] erro de leitura de produção/escolha não é mais mascarado como ausência de registro;
- [x] respostas RPC vazias de escolha do cliente são erro explícito.

### Prazos e configurações

- [x] `deadline-service.ts` não cai para constantes locais quando `system_settings` falha;
- [x] sete prazos operacionais são exigidos e validados;
- [x] as duas telas administrativas de prazo foram alinhadas ao mesmo conjunto canônico;
- [x] `admin_update_production_setting` rejeita `monthly_capacity` legado;
- [x] `admin_upsert_system_settings` valida no servidor configurações críticas comerciais/operacionais;
- [x] `system-settings-service` não injeta prazos/parcelas operacionais para mascarar ausência de configuração;
- [ ] remover `VITE_CHARACTER_CHOICE_DAYS=7` dos dois templates `.env` quando a proteção do conector permitir editar esses arquivos sem expor/alterar placeholders de credenciais; o runtime já não lê essa variável.

### Edge Functions, tempo e notificações

- [x] `cron-check-balance-deadlines` compara deadlines com instante UTC real e chama diretamente o RPC atômico de cancelamento;
- [x] `cron-reveal-characters` compara `timestamptz` com instante real e evita dupla revelação concorrente;
- [x] `cron-update-tracking` valida erro de persistência e usa timestamp real do carrier/execução;
- [x] `pause-subscription` não possui segunda regra de cutoff; `pause_subscription_atomic` é a autoridade;
- [x] confirmação de pausa exibe o cronograma realmente retornado pela transação;
- [x] `send-email` aceita service-to-service apenas com `service_role` e mantém admin para chamadas humanas;
- [x] presença de chat usa `Date.now() - 5min`, sem conversão artificial Bahia→UTC;
- [x] conteúdo textual do e-mail de chat é escapado no gerador e assunto é sanitizado.

### Métricas de produção

- [x] caminho ativo movido para `production-metrics-service.ts`;
- [x] durações derivadas de dados persistidos;
- [x] ausência de timestamps completos => indisponível, não `0h`;
- [x] score médio só aparece quando os itens possuem score medido;
- [x] status/data operacional inválido bloqueia métricas parciais;
- [x] taxa de conclusão usa escala 0–100 de forma única;
- [ ] remover implementação antiga não consumida após prova de typecheck real.

## 4. Bloqueios comprovados

### GitHub Actions / Vercel

No HEAD funcional deste checkpoint (`e70dc98d4e8c45beea887817513dc9263c280764`), ainda não existe GitHub Actions associado que prove checkout/typecheck/lint/test/build.

No HEAD anterior imediatamente verificado (`ae0227fd85d2ed9f49be8e758fef397b3a1b8e9e`):

- `fetch_commit_workflow_runs` retornou lista vazia;
- o combined status continha somente `Vercel = failure`;
- o destino do status indica `upgradeToPro=build-rate-limit`, portanto a prova observada é bloqueio de infraestrutura/plano, não erro de compilação demonstrado.

A última execução GitHub Actions conhecida antes desta rodada continuava sendo o Quality Gate #133 / run `33355470028`, que falhou antes dos steps (`steps=[]`).

Conclusão: **não há prova real de build/test no código atual**. Não marcar CI verde e não rerodar em loop sem corrigir a causa de infraestrutura.

### Supabase

- `supabase/config.toml` aponta `project_id = "pdytjhtjlxvbbeuxgnms"`;
- projeto conectado: `Ordax-2026-1`;
- último estado observado: `INACTIVE`;
- geração oficial de tipos permanece dependente do projeto ativo/saudável;
- migrations de hardening deste plano estão **versionadas, não provadas como aplicadas**.

Consequências:

- não editar `src/integrations/supabase/types.ts` manualmente;
- não declarar RLS/grants/functions/Storage efetivos até prova no projeto ativo;
- quando a etapa remota for deliberadamente iniciada: ativar o projeto correto, medir drift, reconciliar migrations, aplicar mudanças de forma controlada e regenerar tipos oficialmente;
- executar advisors (`security` e `performance`) depois de DDL aplicado e corrigir findings relevantes antes do GO.

### Deploy/visual

- mudanças recentes não possuem build/smoke público comprovado;
- Vercel está bloqueado por limite de build no status observado;
- não aprovar UI somente por inspeção estática.

## 5. Próxima ordem de execução

### P0 — Prova de engenharia

- [ ] restaurar execução real do GitHub Actions/Vercel;
- [ ] `npm ci` em Node 24;
- [ ] format/typecheck/lint/test/coverage/build;
- [ ] `npm audit` e correção controlada de high/critical;
- [ ] proteger `main` somente quando o Quality Gate executar de verdade.

### P1 — Superfícies e legados

- [ ] continuar inventário de telas/no-ops/flags/rotas/integradores opcionais;
- [ ] revisar `.env*` e claims operacionais/documentação ativa;
- [ ] remover serviços de compatibilidade sem consumidores quando seguro;
- [ ] remover implementação antiga de métricas após prova de typecheck.

### P2 — Supabase e segurança

- [x] project ref canônico confirmado;
- [x] BOLA de mudança de coleção revisada e integridade de escolha endurecida;
- [x] origem/definição de `choice_deadline` consolidada no fluxo versionado;
- [ ] continuar auditoria de RPCs cliente de pagamento, suporte e pedidos por BOLA/IDOR;
- [ ] terminar inventário de `SECURITY DEFINER`/`verify_jwt=false` e proteção alternativa;
- [ ] reconciliar helpers SQL históricos de timezone (`America/Sao_Paulo` → contrato canônico Bahia) com prova de banco;
- [ ] quando o projeto estiver ativo, medir migration drift e reconciliar schema;
- [ ] regenerar tipos oficialmente;
- [ ] provar RLS/grants/Storage/Edge Functions no ambiente ativo;
- [ ] provar ausência de `service_role` no bundle;
- [ ] testar scanner server-side real e comportamento fail-closed.

### P3 — Funcionalidade/UI

- [ ] smoke público e catálogo real;
- [ ] auth completo;
- [ ] cliente: perfil/wishlist/dashboard/notificações/suporte;
- [ ] admin/RBAC;
- [ ] compra/assinatura/pagamento em ambiente de teste;
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
- [ ] catálogo real e estados de falha honestos;
- [ ] pagamentos/uploads testados ponta a ponta;
- [ ] fluxos público/cliente/admin aprovados;
- [ ] cobertura mínima satisfeita;
- [ ] acessibilidade/desempenho medidos;
- [ ] dados legais/LGPD validados;
- [ ] backup/restore/rollback ensaiados;
- [ ] RC versionada, monitorada e reversível.

## 7. Checkpoint 12 — 2026-08-31

HEAD funcional: `c6436fb570d0a721ef77b6db59a14872a235cd19`

Foco: produção/capacidade fail-closed, remoção de capacidade 100, validação de ciclos e testes determinísticos. Quality Gate #121 continuou morrendo antes de qualquer step. Detalhes completos permanecem no histórico Git deste arquivo.

## 8. Checkpoint 13 — 2026-08-31

HEAD funcional antes deste documento: `8d538fd6ecf06d24ef12f2c8ea8e4ebeebd58164`

Foco: SSOT de agendamento, integridade de escolha cliente e métricas medidas. Provas centrais: migrations `20260831044500_harden_subscription_delivery_schedule_ssot.sql`, `20260831051000_harden_delivery_choice_integrity.sql`, `20260831053500_fix_customer_character_choice_ids_and_deadlines.sql` e Quality Gate #133 ainda sem steps. Detalhes permanecem no histórico Git.

## 9. Checkpoint 14 — 2026-08-31

HEAD funcional antes deste documento: `e70dc98d4e8c45beea887817513dc9263c280764`

Concluído:

- erro de consulta de produção/escolha deixou de ser mascarado como ausência de registro;
- `production_queue` passou a ser autoridade pré-escolha para `choice_status`/`choice_deadline`;
- transição para `awaiting_choice` exige `character_choice_days` oficial e persiste o prazo;
- lembrete e expiração foram alinhados à fila e deixaram de depender de uma escolha pendente fictícia;
- sete prazos operacionais foram alinhados entre runtime, painel e validações do backend;
- fallbacks locais de prazo/configuração foram removidos dos consumidores auditados;
- hardcode de “7 dias” e hardcode comercial de depósito de R$ 100 foram removidos dos caminhos encontrados nesta rodada;
- cron de saldo usa valores persistidos e o RPC atômico de cancelamento;
- crons de ciclos, revelação, entregas e tracking deixaram de transformar Bahia em um falso instante UTC;
- `shipping_business_days` substituiu o 5º dia útil fixo nos crons corrigidos;
- numeração de entrega mensal evita colisão após pausa;
- `pause-subscription` delega cutoff/estado/capacidade ao RPC atômico e apresenta o cronograma efetivamente persistido;
- `send-email` ganhou caminho interno explícito service-role, mantendo autorização admin nas chamadas humanas;
- `schedule-deliveries` foi removido do source por ausência de consumidor e por duplicar mutações administrativas;
- `StandalonePurchaseButton` deixou de fabricar o valor de entrada.

Commits desta continuação, entre outros:

- `9e77a70bd10fe72a6b9f5b152f6ebf596412a776` — saldo/deadline;
- `e1256b2ef5a1985cceb6d03c2a568835874c7d26` — dias úteis Edge;
- `4c9fc29511d284c4caaea79e8ef46d0ec616cb4f` — transição de ciclos;
- `197e119bcf7400bdba20d8468a200d052c16bf6a` — pausa de assinatura;
- `cedebaed16c82f5d36f3db1b61599798c12151c9` — revelação;
- `f79271a340114dfa12b1a8f07e4d584740121cd6` — criação mensal de entregas;
- `2ca99dd791e6b443ba8c6f12d627fec49550c7ea` — tracking;
- `3c432384dfb1064966245dd84c3e525bf5ce95ab` — envio de e-mail;
- `0124392ec4b12fbbc4791498931c0110cbc78a74` / `ae0227fd85d2ed9f49be8e758fef397b3a1b8e9e` — remoção do scheduler legado;
- `e70dc98d4e8c45beea887817513dc9263c280764` — remoção de depósito hardcoded no botão de compra.

Provas/limitações:

- main confirmada no HEAD funcional `e70dc98...` antes deste checkpoint;
- branch continua `protected=false`;
- no HEAD `ae0227...`, GitHub Actions associado = nenhum;
- combined status no mesmo HEAD = Vercel `failure` por `build-rate-limit`;
- Supabase canônico permanece sem prova operacional remota e o último estado observado é `INACTIVE`;
- portanto não existe prova de typecheck/lint/test/build/deploy dessas alterações.

Next action:

1. continuar auditoria de superfícies ativas por valor comercial hardcoded, fail-open e autoridade duplicada;
2. revisar suporte/pagamentos/pedidos por BOLA/IDOR e RPCs privilegiados;
3. reconciliar timezone SQL e schema somente com o Supabase canônico operacional e prova de migration;
4. restaurar Quality Gate/build real e corrigir qualquer erro de source encontrado;
5. somente depois executar E2E/smoke e avançar para RC.

Do not repeat:

- não usar defaults comerciais, prazo, créditos, capacidade ou disponibilidade como substituto de dado oficial;
- não tratar um `Date` deslocado para Bahia como instante UTC para banco;
- não manter Edge Function sem consumidor que replique autoridade já existente;
- não transformar RPC/query vazia ou erro em sucesso/array vazio/zero real;
- não editar migrations históricas ou tipos gerados para mascarar drift;
- não criar branch/PR;
- não declarar migrations aplicadas, CI verde ou GO sem prova.
