# URGENTE — OrdaX MVP / Launch Readiness

> **SSOT operacional exclusivo de `washingtonmsdj/ordax`.**
> Código, migrations, testes e evidência operacional atual prevalecem sobre documentação arquivada.
> Não misturar com `novo-ordax-os`, forks ou repositórios antigos.

## 0. Estado atual

**Lançamento público: NO-GO.**

Base funcional deste checkpoint:

- `main`: `fb1ed48bf07cc8bf2d710f83d081961ce18e60b2`
- commit: `test: cover delivery cycle mutation contracts`
- o commit que atualiza este próprio arquivo será posterior à base funcional acima.

O source avançou bastante em autoridade comercial e contratos fail-closed, mas ainda faltam provas externas obrigatórias no mesmo release candidate.

## 0.1 Evidência operacional atual

### GitHub Actions — bloqueio externo antes dos steps

Quality Gate do commit `fb1ed48...`:

- run: `34788479847`
- conclusão agregada: `failure`
- jobs: 4
- `Production build and dependency audit`: `steps=[]`, `runner_id=0`
- `Build, test and security`: `steps=[]`, `runner_id=0`
- `Unit coverage`: `steps=[]`, `runner_id=0`
- `Authority audits`: `steps=[]`, `runner_id=0`

**Conclusão:** nenhum comando do repositório executou nesse run. Não tratar esse `failure` como falha de teste/código enquanto os jobs continuarem sem runner e sem steps.

### Vercel — último build comprovado READY; HEAD atual limitado

Projeto canônico:

- project: `ordax`
- project id: `prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`
- team id: `team_VPZxAK2VXdTWXI8blJaKQEl0`
- framework: Vite

Último commit explicitamente observado como deployment `READY` neste checkpoint:

- commit: `287237d6cb72860bb555ac92f5ce1291e15cd5b9`
- mensagem: `fix: validate production photo metadata mutations`
- deployment: `dpl_4kcizxJvS7w511hX3bnVeVN3p5e9`
- target: `production`

O HEAD `fb1ed48...` tem status GitHub `Vercel=failure` apontando para `build-rate-limit`. Portanto:

- `287237d...` tem prova de compilação/deploy Vercel;
- commits posteriores ainda não devem ser declarados publicados/compilados pelo Vercel;
- o rate limit é um bloqueio externo de novos builds, não uma regressão de produção comprovada.

### Supabase canônico — inativo / inobservável

- project id: `pdytjhtjlxvbbeuxgnms`
- referência anterior: `Ordax-2026-1`

Enquanto permanecer indisponível:

- migrations locais não podem ser declaradas aplicadas remotamente;
- grants/RLS/policies efetivos não podem ser declarados reconciliados;
- Edge Functions modificadas no source não podem ser declaradas live;
- tipos gerados não devem ser editados manualmente para mascarar drift;
- não criar correções de schema por adivinhação de estado remoto.

## 0.2 Hardening consolidado

### Pagamentos e autoridade financeira

Já concluído no source:

- respostas de Edge Functions autenticadas falham fechado quando o envelope é inválido;
- cancelamento de assinatura exige confirmação explícita;
- mutações financeiras críticas do gateway admin exigem confirmação real do backend;
- atualização de entregas valida ID/status solicitado;
- upload de comprovante valida payment, usuário, path, nome, tamanho e MIME e limpa upload órfão diante de resposta inválida;
- DML direto de `authenticated` foi removido das principais tabelas comerciais sensíveis e o auditor acompanha regressões;
- timeline de pagamento manual é autenticada/sanitizada;
- `PaymentService` e UI não dependem mais de `payment_audit_log`;
- `PaymentAuditLog`/`audit_logs` foram removidos do contrato de produto.

#### Decisão definitiva: `payment_audit_log`

A definição aparece apenas em tipos gerados antigos e não há migration versionada atual que crie a tabela. **Não ressuscitar esse legado.**

Fontes canônicas de pagamento manual:

- `manual_payments`;
- `payment_files`;
- `payment_info_requests`;
- `order_status_history`;
- timeline autenticado para UI.

### Pricing / configuração comercial — fail-closed

Além dos parsers anteriores de propagação/tier/preço contextual/base, este ciclo consolidou validação de resultados admin:

- `0cba7c3...` — guards reutilizáveis para objeto, UUID, ID correspondente e contagens inteiras;
- `3cb659b...` — cobertura dos guards;
- `d6d7058...` / `022f3f1...` — `admin-config-mutations-service` passou a exigir confirmação coerente do SQL para:
  - system settings;
  - payment/production settings;
  - limite de coleções do plano;
  - pricing avulso;
  - preços base;
  - multiplicadores contextuais;
  - save/delete de tier e plano;
  - purchase modes;
  - collection types;
  - assign/unassign/bulk assignment de tiers;
  - multiplicadores individuais e em lote;
- `192559e...` / `f261297...` — cobertura de falso-sucesso e confirmações de settings.

Operações vazias/inconsistentes agora falham antes ou depois da chamada conforme o contrato real do SQL.

#### Dívida estrutural de pricing

Ainda existem RPCs históricos de pricing chamados pelo browser cujas definições atuais não estão todas presentes nas migrations versionadas. Não revogar/remover enquanto o Supabase estiver inobservável e antes de uma fronteira substituta estar implantada/provada.

### Assinatura / créditos

- `a83b2ca...` — seis mutações administrativas de subscription-credit passaram a validar forma, IDs e invariantes;
- `f1f9428...` — cobertura correspondente;
- criação/edição/desativação de personagem, ajuste de créditos e criação/fechamento de ciclo não aceitam mais `{}`/payload parcialmente tipado como sucesso.

### Produção de quotes

- `f1574d1...` — `ensureQuoteProduction`, mudança de estágio e foto exigem resposta vinculada ao quote/update/photo solicitado;
- `59c075e...` — cobertura de IDs/estágio/URL divergentes.

### Produção administrativa

- `ad2bc09...` — estágio, responsável, bloqueio, desbloqueio, agenda, notas, conclusão estimada e notas de estágio validam retorno real do backend;
- `b747665...` — cobertura de contratos e falsos sucessos.

### Metadados de fotos de produção

Autoridade:

- foi identificado grant histórico de `INSERT/UPDATE/DELETE` direto em `production_photo_metadata` para `authenticated`, embora o produto atual escreva via RPC admin validado;
- busca no source atual não encontrou caller de produto fazendo DML direto nessa tabela;
- `296825d...` — migration source-only revoga DML direto e preserva SELECT/RLS;
- `b59b7b8...` — `production_photo_metadata` entrou no auditor comercial.

Contrato de aplicação:

- `287237d...` — create/update/bulk validam UUIDs, photo URL, stage, visibility, caption normalizada e cardinalidade; delete respeita o contrato SQL `void`;
- `aba5dee...` — suíte antiga foi migrada de `supabase.rpc` de escrita para o gateway `admin-rpc`, preservando testes de leitura/role.

**Importante:** a migration `296825d...` é source-only até prova de aplicação no Supabase canônico.

### Ciclos de entrega / logística / bônus

- `096657b...` — mutações de ciclo/entrega/bônus passaram a validar runtime identity/state:
  - get/create de ciclo vincula cycle number/mês/ano;
  - transição de ciclo vincula ID/status;
  - scheduling exige exatamente 3 ou 6 entregas conforme plano;
  - plano semestral exige bônus ligado à 6ª entrega;
  - status e ciclo da entrega precisam corresponder ao solicitado;
  - troca de personagem vincula delivery/character;
  - criação/link/status de bônus validam subscription/delivery/status;
  - troca de coleção do usuário valida delivery, collection, user e audit history;
- `fb1ed48...` — cobertura desses contratos.

## 1. Critério de GO

O mesmo release candidate precisa provar:

- `npm ci` determinístico;
- TypeScript strict PASS;
- lint PASS;
- auditores de autoridade PASS;
- testes unitários/integrados PASS;
- coverage PASS;
- build de produção PASS;
- `npm audit --audit-level=high` sem bloqueio;
- `format:check` conforme política;
- Supabase reconciliado e migrations aplicadas;
- grants/RLS reais verificados;
- Edge Functions do release implantadas;
- smoke autenticado dos fluxos críticos;
- deploy observável do mesmo HEAD;
- rollback reproduzível.

Build Vercel READY isolado não equivale a GO.

## 2. P0 — bloqueadores restantes

### P0.1 Quality Gate executável

- [x] workflow existe e dispara em `main`;
- [x] bloqueio externo comprovado também no HEAD `fb1ed48...`;
- [ ] obter run com runner real e steps executados;
- [ ] fechar typecheck/lint/auditors/tests/coverage/build/audit/format no mesmo HEAD.

### P0.2 Autoridade comercial

- [x] auditor de DML direto para tabelas críticas;
- [x] auditor multi-schema de RPCs perigosos;
- [x] payment/manual payment/photo metadata e várias superfícies comerciais atrás de fronteiras validadas no source;
- [x] principais mutações admin de pricing/configuração/produção/logística falham fechado em retorno ambíguo;
- [ ] reconciliar grants/RLS reais no Supabase;
- [ ] consolidar RPCs legados de pricing após backend canônico observável;
- [ ] continuar pente-fino de outros `callAdminRpc<T>` de alto risco (support/notifications/groups) que ainda confiem apenas em generics.

### P0.3 Supabase / migrations / Edge Functions

- [ ] reativar/tornar observável o projeto canônico;
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

#### Checkout de assinatura

A UI ainda não deve ligar checkout contra backend não observado. Existe contrato server-side versionado, mas ele precisa primeiro ser provado no Supabase canônico.

### P0.5 Deploy / smoke / rollback

- [x] Vercel operacional quando a cota permite;
- [x] `287237d...` observado `READY` em produção;
- [ ] remover/aguardar bloqueio de build-rate-limit do HEAD atual;
- [ ] obter deploy READY do mesmo release candidate final;
- [ ] smoke autenticado P0.4;
- [ ] provar rollback;
- [ ] registrar receipt final.

## 3. Próxima sequência

1. Continuar source-first nos `callAdminRpc<T>` de maior impacto ainda sem validação runtime: suporte, notificações e grupos.
2. Procurar authority bypass real antes de criar qualquer nova migration; não revogar privilégios sem provar que o produto não depende do DML direto.
3. Não corrigir GitHub Actions enquanto os jobs continuarem `steps=[]`/`runner_id=0`.
4. Quando Vercel liberar builds, validar o HEAD mais recente e corrigir qualquer erro real de compilação.
5. Quando Supabase voltar, reconciliar schema/grants/RLS/functions, aplicar mudanças pendentes, regenerar tipos e executar smoke P0.
6. Só então reavaliar GO/NO-GO.

## 4. Do not repeat

- Não trabalhar em outro OrdaX sem instrução explícita.
- Não declarar teste/auditor PASS sem execução real.
- Não tratar `steps=[]` como falha de código.
- Não declarar migration/Edge Function local como live sem prova remota.
- Não ressuscitar `payment_audit_log`.
- Não editar tipos Supabase gerados manualmente para esconder drift.
- Não revogar RPCs legados de pricing antes da fronteira substituta estar implantada e comprovada.
- Não tratar último Vercel READY como prova do HEAD atual quando o HEAD estiver bloqueado por rate limit.
- Não declarar lançamento pronto enquanto P0 permanecer aberto.
