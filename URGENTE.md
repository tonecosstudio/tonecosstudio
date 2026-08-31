# URGENTE — prontidão para lançamento

Status: **EM EXECUÇÃO — NO-GO para lançamento**  
Atualizado em: **2026-08-31 (America/Bahia)**  
Branch operacional: **main somente**  
HEAD funcional antes deste documento: `8d538fd6ecf06d24ef12f2c8ea8e4ebeebd58164`

Este arquivo é o **SSOT operacional** da preparação para lançamento do ORDAX. O histórico detalhado dos checkpoints anteriores permanece no Git; este documento mantém o estado vigente, provas, bloqueios e a próxima ordem de execução.

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

## 2. Estado atual

| Área | Estado | Observação |
| --- | --- | --- |
| Branch | **main somente** | decisão explícita do usuário |
| Proteção da main | **PENDENTE** | `protected=false`, required checks desligados |
| Quality Gate | **BLOQUEADO NA INFRA** | run #133 no HEAD `8d538fd...`; job falhou antes de qualquer step e retorna `steps=[]` |
| Runtime | **Node 24.x** | manifesto/workflow alinhados |
| Pacote | **ordax-web@0.1.0** | identidade de template removida |
| Package manager | **NÃO CONSOLIDADO** | manter locks concorrentes até `npm ci` real |
| Comercial BRL/coins | **FAIL-CLOSED NO CÓDIGO** | sem preços, coins ou multiplicadores fictícios no runtime auditado |
| Compra de coins | **REMOVIDA** | rota/CTA/componentes legados removidos |
| Créditos de assinatura | **FAIL-CLOSED VERSIONADO** | sem `CASE plan_type` fabricando 600/1300/2800 coins |
| Produção/capacidade | **FAIL-CLOSED VERSIONADO** | sem abertura/capacidade otimista quando fonte oficial falha |
| Agendamento de entregas | **SSOT VERSIONADO** | quantidade/tipo vêm de assinatura/plano persistidos; data de envio ausente bloqueia |
| Escolhas cliente | **INTEGRIDADE ENDURECIDA** | ownership server-side, coleção ativa explícita, relação personagem/coleção validada e prazo obrigatório |
| Métricas de produção | **MEDIDAS/FAIL-CLOSED** | placeholders 0 removidos do caminho ativo; médias só aparecem com dados medidos completos |
| Uploads sensíveis | **SERVER-AUTHORITY VERSIONADA** | comprovantes/suporte privados; scanner server-only |
| Supabase canônico | **CONFIRMADO, MAS INATIVO** | `pdytjhtjlxvbbeuxgnms` = `Ordax-2026-1`; status observado `INACTIVE` |
| Tipos Supabase | **DRIFT COMPROVADO** | geração oficial bloqueada pelo projeto inativo; não editar `types.ts` manualmente |
| Vercel/smoke visual | **SEM PROVA ATUAL** | build/smoke das mudanças recentes pendentes |
| Lançamento | **NO-GO** | CI, banco remoto, E2E, segurança e release engineering sem prova suficiente |

## 3. Hardening concluído

### Governança, limpeza e superfícies falsas

- [x] `AGENTS.md`, `README.md` e `URGENTE.md` consolidados como contrato/SSOT;
- [x] ruído/legados de raiz e documentação enganosa arquivados/removidos do caminho ativo;
- [x] catálogo mock e placeholders demonstrativos removidos do runtime;
- [x] compra fake de coins removida integralmente;
- [x] feature pública de coleções não executa queries de preview quando desativada;
- [ ] continuar inventário de flags, rotas, no-ops e integrações opcionais.

### Comercial, assinatura e pagamentos

- [x] preços avulsos, PIX, entrada e planos não usam fallbacks comerciais locais;
- [x] editores administrativos não inicializam/salvam valores exemplo como configuração real;
- [x] equivalência fictícia coins↔reais removida;
- [x] pagamento administrativo de assinatura exige créditos persistidos;
- [x] idempotência por referência externa preservada no corpo privilegiado vigente;
- [x] `coins_included` e `total_credits` sincronizados em novas escritas; divergência rejeitada;
- [x] comprovantes e anexos sensíveis migrados para autoridade server-side/buckets privados;
- [ ] testar pagamento/assinatura ponta a ponta em ambiente operacional.

### Produção, capacidade e ciclos

- [x] `monthly_production_limit` é a autoridade de capacidade mensal;
- [x] ausência de configuração não vira capacidade 100 nem vendas abertas;
- [x] RPC/hook/UI validam estado de produção antes de exibir ações/métricas;
- [x] ciclo futuro inexistente não equivale a capacidade disponível;
- [x] `cycle-service` não inventa datas operacionais a partir de `created_at`/relógio do cliente;
- [x] `admin_get_or_create_delivery_cycle` exige capacidade explícita ou setting oficial;
- [x] cron usa capacidade oficial e não retorna sucesso quando a criação/transição falha;
- [x] testes de capacidade/limite cobrem contrato fail-closed;
- [ ] consolidar uma única autoridade de calendário de ciclos/feriados após reconciliação remota do schema.

### Agendamento de assinatura

- [x] `admin_schedule_subscription_deliveries` não usa mais `CASE plan_type` para fabricar quantidade de entregas;
- [x] `plan_type` do caller só pode coincidir com o plano persistido; não consegue sobrescrevê-lo;
- [x] `deliveries_total` vem da assinatura/plano e drift entre ambos bloqueia;
- [x] `shipping_date` precisa existir; não é fabricada por fallback;
- [x] resposta de agendamento malformada não vira array vazio silencioso;
- [ ] revisar regra de bônus Semestral como política de produto separada antes da RC.

### Escolhas de coleção/personagem

- [x] BOLA do `change_delivery_collection_choice_for_current_user` revisada: `auth.uid()` e ownership da assinatura são validados server-side;
- [x] `NULL` em `is_active/status` não é tratado como coleção ativa;
- [x] mudança real de coleção limpa `character_id`/`collection_character_id` antigos;
- [x] auditoria registra `changed_by_admin/admin_user_id` corretamente quando aplicável;
- [x] troca de personagem exige relação `characters ↔ collection_characters ↔ coleção da entrega`;
- [x] `character_id` e `collection_character_id` da entrega são atualizados em conjunto;
- [x] manutenção automática usa a mesma validação explícita de coleção ativa;
- [x] corrigida incompatibilidade de IDs no fluxo de `character_choices`: UI envia `collection_characters.id`, banco persiste o `characters.id` canônico;
- [x] `customer_submit_character_choice` e `customer_change_character_choice` exigem deadline persistido; removido fallback `now() + 7 days`;
- [x] respostas RPC vazias de escolha do cliente agora são erro explícito;
- [ ] revisar origem/definição do `choice_deadline` na criação da fila para garantir um único SSOT de prazo.

### Métricas de produção

- [x] caminho ativo movido para `production-metrics-service.ts`;
- [x] durações por estágio derivadas de `production_stages.actual_duration` persistido;
- [x] tempo médio total deriva de timestamps reais completos; ausência => `Indisponível`, não `0h`;
- [x] score médio só aparece quando todos os itens possuem score medido;
- [x] status/data operacional inválido bloqueia métricas parciais;
- [x] taxa de conclusão usa escala 0–100 de forma única; removida multiplicação dupla no `ProductionMetricsBar`;
- [x] testes de serviço/UI alinhados ao contrato medido;
- [ ] remover a implementação antiga não consumida de `fetchProductionMetrics` do serviço monolítico quando o typecheck real estiver disponível.

## 4. Bloqueios comprovados

### GitHub Actions

Prova mais recente no código deste checkpoint:

- Quality Gate run `33355470028` / #133;
- HEAD `8d538fd6ecf06d24ef12f2c8ea8e4ebeebd58164`;
- job `99376648161` — `Build, test and security`;
- conclusão `failure`;
- `steps=[]`;
- run iniciou `2026-08-31T03:57:15Z` e terminou `2026-08-31T03:57:20Z`.

Conclusão: a falha continua anterior a checkout/typecheck/lint/test/build. **Não rerodar em loop** enquanto o job continuar sem steps.

### Supabase

- `supabase/config.toml` aponta `project_id = "pdytjhtjlxvbbeuxgnms"`;
- projeto conectado: `Ordax-2026-1`;
- estado observado: `INACTIVE`;
- geração oficial de tipos recusada com `Project must be active and healthy.`;
- migrations adicionam campos ainda ausentes do arquivo de tipos gerado versionado;
- migrations de hardening deste plano estão **versionadas, não provadas como aplicadas**.

Consequências:

- não editar `src/integrations/supabase/types.ts` manualmente;
- não declarar RLS/grants/functions/Storage efetivos até prova no projeto ativo;
- quando a etapa remota for deliberadamente iniciada: ativar o projeto correto, medir drift, reconciliar migrations e regenerar tipos oficialmente.

### Deploy/visual

- mudanças recentes não possuem build/smoke público comprovado;
- Vercel teve bloqueio anterior por limite do plano Hobby;
- não aprovar UI somente por inspeção estática.

## 5. Próxima ordem de execução

### P0 — Prova de engenharia

- [ ] restaurar execução real do GitHub Actions;
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
- [ ] rastrear origem de `choice_deadline` e eliminar múltiplas autoridades de prazo;
- [ ] continuar auditoria de RPCs cliente de pagamento, suporte e pedidos por BOLA/IDOR;
- [ ] terminar inventário de `SECURITY DEFINER`/`verify_jwt=false` e proteção alternativa;
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

Concluído:

- agendamento de entregas deriva `plan_type`/`deliveries_total` de dados persistidos;
- data de envio ausente bloqueia agendamento;
- mudança de coleção/personagem ganhou validação de integridade e limpeza de referências incompatíveis;
- BOLA do fluxo de troca de coleção foi validada no backend;
- corrigida tradução `collection_characters.id` → `characters.id` no fluxo de escolha;
- removido prazo fictício de sete dias em escolhas;
- métricas de produção deixam de exibir zeros fixos como medição;
- corrigida taxa de conclusão multiplicada duas vezes;
- testes ativos de capacidade, limite e métricas foram alinhados aos novos contratos.

Provas:

- migration `20260831044500_harden_subscription_delivery_schedule_ssot.sql`;
- migration `20260831051000_harden_delivery_choice_integrity.sql`;
- migration `20260831053500_fix_customer_character_choice_ids_and_deadlines.sql`;
- `production-metrics-service.ts` + teste dedicado;
- Quality Gate #133 / run `33355470028`, job `99376648161`, `failure`, `steps=[]`.

Bloqueios:

- não há prova real de typecheck/test/build;
- migrations não têm prova de aplicação remota;
- `choice_deadline` ainda precisa ter sua origem consolidada;
- tipos Supabase continuam em drift;
- smoke visual e proteção da `main` pendentes.

Next action:

1. rastrear criação/alteração de `choice_deadline` e remover defaults concorrentes;
2. seguir auditoria BOLA/IDOR em pagamento/suporte/pedidos;
3. revisar RPCs restantes com `SECURITY DEFINER`/`verify_jwt=false`;
4. não rerodar Actions enquanto `steps=[]` persistir;
5. quando o Supabase canônico estiver ativo, reconciliar schema/tipos e executar E2E.

Do not repeat:

- não usar defaults comerciais, créditos por `CASE plan_type`, capacidade 100 ou vendas abertas por fallback;
- não considerar ciclo futuro inexistente como disponível;
- não inventar datas operacionais ou `choice_deadline` a partir do relógio do cliente/`now()`;
- não permitir coleção/character IDs incompatíveis na mesma entrega;
- não transformar RPC vazio/erro em sucesso/array vazio/zero real;
- não editar migrations históricas ou tipos gerados para mascarar drift;
- não criar branch/PR;
- não declarar migrations aplicadas, CI verde ou GO sem prova.