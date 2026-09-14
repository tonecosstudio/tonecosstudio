# URGENTE — OrdaX MVP / Launch Readiness

> **SSOT operacional exclusivo de `washingtonmsdj/ordax`.**
> Código, migrations, testes e evidência operacional atual prevalecem sobre documentação arquivada.
> Não misturar com `novo-ordax-os`, forks ou repositórios antigos.

## 0. Estado atual

**Lançamento público: NO-GO.**

HEAD atual da `main`:

- `69ecf33feb9f10d00fcb4ca4444392fdc8288218`
- `fix: validate collection mutation RPC results`

O source avançou bastante em autoridade comercial e contratos fail-closed, mas ainda faltam provas externas obrigatórias no mesmo release candidate.

## 0.1 Evidência operacional

### GitHub Actions

O Quality Gate continua bloqueado externamente antes dos steps:

- os runs recentes apresentam 4 jobs;
- jobs permanecem sem steps executados e sem runner (`runner_id=0`/`steps=[]` ou equivalente);
- portanto não há prova canônica de `typecheck`, lint, testes, coverage, build, audit ou format.

**Não tratar esse bloqueio como falha de código enquanto o runner não executar os comandos.** O trabalho deste ciclo não depende de GitHub Actions: a verificação é feita por revisão dos contratos source/SQL e por validações locais/estruturais disponíveis, sem transformar ausência de runner em PASS.

### Vercel

Projeto canônico:

- `ordax`
- project id `prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`
- team id `team_VPZxAK2VXdTWXI8blJaKQEl0`
- framework Vite

O último deployment observado como **READY em produção** corresponde ao commit `efec11fb68863d81b5e07a474f3f5890d9c65e6d`.

Isso não prova os commits posteriores. Não considerar o Vercel como prova do HEAD atual sem novo deployment observado.

### Supabase

Projeto canônico:

- project id `pdytjhtjlxvbbeuxgnms`
- referência anterior `Ordax-2026-1`

Continua inativo/inobservável. Enquanto isso:

- migrations locais são source-only;
- grants/RLS/policies efetivos não estão reconciliados;
- Edge Functions alteradas localmente não são declaradas live;
- tipos gerados não devem ser editados manualmente para esconder drift.

## 0.2 Hardening concluído no source

### Pagamentos / autoridade financeira

- Edge Functions autenticadas falham fechado em envelopes inválidos;
- cancelamento de assinatura exige confirmação real do backend;
- mutações financeiras administrativas críticas exigem confirmação explícita;
- delivery status valida ID/status retornados;
- upload de comprovante valida payment/user/path/nome/tamanho/MIME e limpa storage órfão quando a resposta é inválida;
- DML direto de `authenticated` foi removido das principais tabelas comerciais e o auditor acompanha regressões;
- `manual_payments`, `payment_files`, `quotes`, `standalone_purchases`, `subscriptions`, `payment_links` e `quote_payments` têm fronteiras de escrita server-authoritative no source;
- `order_status_history`, `payment_info_requests` e `admin_payment_methods` tiveram escrita direta removida/limitada conforme o contrato atual;
- timeline de pagamento manual é autenticado e sanitizado;
- `PaymentService`/UI não dependem de `payment_audit_log`;
- `PaymentAuditLog`/`audit_logs` foram removidos do contrato do produto.

### Decisão definitiva: `payment_audit_log`

Não existe migration versionada atual criando essa tabela; a referência veio de tipos/legado. **Não ressuscitar.**

Fontes reais de pagamento manual:

- `manual_payments`;
- `payment_files`;
- `payment_info_requests`;
- `order_status_history`;
- timeline autenticado.

Mudanças de status de `manual_payments` passaram a gerar histórico transacional no source SQL.

### Pricing / configuração comercial

Os serviços admin de pricing/configuração foram endurecidos contra falso sucesso. Entre os contratos cobertos:

- propagação de preços;
- criação/edição de tier e planos;
- limites de coleções;
- pricing avulso;
- preços base;
- multiplicadores contextuais;
- purchase modes;
- collection types;
- assign/unassign/bulk assignment de tiers;
- multiplicadores individuais/em lote;
- atualização de preço base/contextual;
- configurações de assinatura.

Respostas são tratadas como `unknown` e precisam comprovar ID, contagem, objeto ou invariantes esperados antes de chegar ao sucesso da UI.

**Dívida:** existem RPCs históricos de pricing chamados pelo browser cuja definição atual não está totalmente representada nas migrations versionadas. Não revogar/remover enquanto o Supabase estiver inobservável e antes de uma fronteira substituta estar implantada/provada.

### Assinatura / créditos

Seis mutações administrativas de subscription-credit validam forma, IDs e invariantes, incluindo criação/edição/desativação de personagem, ajuste de créditos e criação/fechamento de ciclo.

### Produção / quotes / fotos

- mutações de produção de quote validam quote/update/photo retornados;
- produção administrativa valida IDs e estados retornados;
- metadados de fotos validam UUIDs, URL, stage, visibility, caption e cardinalidade;
- `production_photo_metadata` teve DML direto de `authenticated` revogado no source;
- fotos/estágios não aceitam payload vazio ou entidade divergente como sucesso.

### Ciclos / entregas / bônus

Contratos de ciclo, delivery, tracking, personagem e bônus validam identidade e estado retornados, cardinalidade esperada e relações entre subscription/delivery/cycle.

### Grupos / suporte / catálogo

- quick replies usam validação runtime de UUID/ID/contagem;
- mensagens de grupo agora validam retorno de agendamento, incluindo `group_id`, mensagem, status `pending` e timestamp;
- templates de grupo validam objeto retornado e ID/dados persistidos;
- exclusões exigem o ID exato retornado;
- RPCs de grupo são admin-authoritative e tabelas possuem SELECT/RLS sem DML direto de browser;
- mutações administrativas de catálogo/coleções agora validam IDs retornados para criação/edição/exclusão de coleção e personagem;
- inserção em lote de personagens exige retorno `inserted` inteiro exatamente igual à quantidade solicitada;
- criação individual de personagem exige UUID válido;
- criação de coleção exige UUID válido em vez de aceitar qualquer objeto parcialmente formado.

## 1. Critério de GO

O mesmo release candidate precisa provar:

- `npm ci` determinístico;
- TypeScript strict PASS;
- lint PASS;
- security/auditors PASS;
- testes unitários/integrados PASS;
- coverage PASS;
- build de produção PASS;
- `npm audit --audit-level=high` sem bloqueio;
- `format:check` PASS;
- Supabase reconciliado e migrations aplicadas;
- grants/RLS/functions reais verificados;
- Edge Functions do release implantadas;
- smoke autenticado dos fluxos críticos;
- deployment observável do mesmo HEAD;
- rollback reproduzível.

Vercel READY isolado não equivale a GO.

## 2. P0 — bloqueadores

### P0.1 Quality Gate executável

- [ ] obter run com runner real e steps executados;
- [ ] fechar typecheck/lint/auditors/tests/coverage/build/audit/format no mesmo HEAD.

### P0.2 Autoridade comercial

- [x] auditor de DML direto para tabelas críticas;
- [x] auditor multi-schema de RPCs perigosos;
- [x] pagamentos, comprovantes, métodos de pagamento, pricing, produção, logística, grupos e catálogo com contratos fail-closed no source;
- [ ] reconciliar grants/RLS reais no Supabase;
- [ ] consolidar RPCs legados de pricing após backend canônico observável;
- [ ] continuar pente-fino de `callAdminRpc<T>` de alto risco restantes.

### P0.3 Supabase / migrations / Edge Functions

- [ ] tornar observável o projeto canônico;
- [ ] comparar migrations locais x aplicadas;
- [ ] verificar grants `anon`/`authenticated`/`service_role`/`private_api`;
- [ ] verificar RLS/policies de commerce, payments, subscriptions, support, notifications, produção e Storage;
- [ ] implantar/provar migrations e Edge Functions source-only deste ciclo;
- [ ] regenerar tipos somente após reconciliação real do schema.

### P0.4 Fluxos MVP

Validar no ambiente canônico, com usuários/roles controlados:

- [ ] auth/restauração de sessão;
- [ ] catálogo/coleções/modelos;
- [ ] checkout/criação com autoridade comercial;
- [ ] área do cliente/progresso;
- [ ] pagamentos/comprovantes/timeline;
- [ ] assinatura/coins/crédito/cancelamento;
- [ ] produção/fotos;
- [ ] entregas/ciclos/tracking/bônus;
- [ ] suporte/anexos;
- [ ] notificações;
- [ ] admin completo;
- [ ] refresh/navegação direta;
- [ ] loading/empty/error/success sem falso sucesso.

Checkout de assinatura não deve ser ligado contra backend não observado.

### P0.5 Deploy / smoke / rollback

- [x] Vercel operacional no último checkpoint observado;
- [x] deployment READY de `efec11fb...` comprovado;
- [ ] smoke autenticado;
- [ ] provar rollback;
- [ ] registrar receipt final.

## 3. Próxima sequência

1. Continuar source-first nos `callAdminRpc<T>` restantes de alto impacto, priorizando grupos, suporte, notificações e operações comerciais.
2. Para cada mutação, confrontar retorno do cliente com a migration SQL correspondente antes de alterar o contrato.
3. Executar validações locais/estruturais e testes focados disponíveis sem depender de minutos do GitHub Actions.
4. Procurar authority bypass real antes de criar migration; não revogar privilégios sem provar que o produto não depende do DML direto.
5. Não corrigir GitHub Actions enquanto jobs não executarem steps reais.
6. Quando Supabase voltar, reconciliar schema/grants/RLS/functions, aplicar mudanças pendentes, regenerar tipos e executar smoke P0.
7. Só então reavaliar GO/NO-GO.

## 4. Do not repeat

- Não trabalhar em outro OrdaX sem instrução explícita.
- Não declarar teste/auditor PASS sem execução real.
- Não tratar `steps=[]`/`runner_id=0` como falha de código.
- Não declarar migration/Edge Function local como live sem prova remota.
- Não ressuscitar `payment_audit_log`.
- Não editar tipos Supabase gerados manualmente para esconder drift.
- Não revogar RPCs legados de pricing antes da fronteira substituta estar implantada/provada.
- Não tratar Vercel READY como prova de todos os gates.
- Não declarar lançamento pronto enquanto P0 permanecer aberto.
