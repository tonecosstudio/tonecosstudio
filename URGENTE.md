# URGENTE — OrdaX MVP / Launch Readiness

> **SSOT operacional exclusivo do repositório `washingtonmsdj/ordax`.**
> Código, migrations, testes e evidência operacional atual têm precedência sobre documentação arquivada.
> Não voltar para `novo-ordax-os` nem misturar estado de repositórios antigos.

## 0. Estado atual

**Status de lançamento público: NO-GO.**

O produto continua avançando, mas ainda faltam duas provas externas indispensáveis:

1. o **GitHub Actions Quality Gate não recebe runner** e termina antes de executar qualquer step;
2. o **Supabase canônico continua inativo/inobservável**, impedindo reconciliação remota de migrations, grants, RLS, Edge Functions e smoke autenticado real.

Enquanto esses dois bloqueios existirem, não declarar o MVP pronto para lançamento público e não fabricar PASS a partir de inspeção estática.

### Base funcional deste checkpoint

- `main`: `18529f67d4c82955a293dd4ee2325fe153d26428`
- commit: `test: cover admin order mutation id validation`
- observação: o commit que atualiza este próprio `URGENTE.md` será posterior; a base funcional acima é a analisada neste checkpoint.

## 0.1 Evidência operacional

### GitHub Actions — BLOQUEIO EXTERNO CONFIRMADO NO HEAD

Quality Gate do commit `18529f67d4c82955a293dd4ee2325fe153d26428`:

- run: `34764740809`
- conclusão agregada: `failure`
- jobs: 4
- `Build, test and security`: `steps=[]`, `runner_id=0`
- `Authority audits`: `steps=[]`, `runner_id=0`
- `Unit coverage`: `steps=[]`, `runner_id=0`
- `Production build and dependency audit`: `steps=[]`, `runner_id=0`

Logo, **nenhum comando do repositório executou nesse run**. Não alterar testes, lint, scripts ou código para “corrigir” esse `failure` enquanto os jobs continuarem sem runner/steps.

### Vercel — SAUDÁVEL, MAS O DEPLOY OBSERVADO AINDA ESTÁ ATRÁS DO HEAD

Projeto canônico:

- projeto: `ordax`
- project id: `prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`
- repositório vinculado: `washingtonmsdj/ordax`
- último deployment observado na consulta desta sessão: commit `893c3e1a1a68ef7ea5c7201387fb837c4b3ff822`
- deployment: `dpl_5BXDoxCYHqHmBD6LH5UY7nx5he1N`
- estado: `READY`
- target: `production`

Esse deploy prova que o Vercel continua operacional e aceitou o hardening de propagação de pricing. **Não afirmar ainda que `18529f67...` está publicado/READY** até ele aparecer como deployment observado.

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

- `d1e9f011...` — `callAuthenticatedEdgeFunctionData` passou a falhar fechado para resposta vazia ou envelope `{ data }` malformado.
- Cobertura versionada para `null`, `undefined`, objeto sem `data`, array e primitivo.

### Autoridade comercial multi-schema

- `da822cff...` — auditor de RPCs perigosos passou a acompanhar `public` e `private_api` separadamente.
- `REVOKE` em um schema não mascara mais `GRANT` perigoso no outro.
- A prova sintética do auditor demonstrou FAIL com `private_api.notify_quote_payment_for_current_user` concedido e PASS após revogação.
- O diagnóstico antigo de ausência de REVOKE de `quotes` foi corrigido: há REVOKE versionado em `20260525073000_support_payment_mutation_rpcs.sql` e hardening adicional posterior.

### Respostas remotas / falso sucesso

Concluído no source:

- `bc59cf2...` — cancelamento de assinatura exige `success:true`;
- `893c3e1...` + `9d894f7...` — propagação de pricing exige `ok:true`, contagens válidas e coerência dos resultados;
- `613a5f9...` — testes do contrato de propagação;
- `dd6aa88...` + `f5a5313...` — gateway admin passou a exigir confirmação explícita para mutações standalone cujo SQL retorna `{ success:true }`;
- `f47db12...` + `c171229...` — mesma proteção para processamento de pagamento de assinatura e crédito manual de coins;
- `08b3bf2...` — exclusão do registro de comprovante de pagamento também exige `{ success:true }`.

### Entregas

- `6d80413...` — cliente de atualização de entrega exige `success:true`, delivery correto e status solicitado;
- `1aab495...` — testes de resposta inválida, ID divergente e status divergente;
- `583c9c3...` — Edge Function `update-delivery-status` não converte mais RPC vazio/malformado em HTTP 200 de sucesso.

**Importante:** `583c9c3...` altera Edge Function do Supabase e ainda não pode ser declarado live enquanto o Supabase canônico estiver indisponível.

### Comprovantes de pagamento

- `192c1a8...` — `upload-payment-proof` valida o registro retornado pelo RPC contra payment, usuário, path, nome, tamanho e MIME; em retorno inválido remove o objeto recém-enviado do Storage antes de falhar, evitando arquivo órfão;
- `5bf5f51...` — parser browser-side do envelope de upload;
- `fc8be1f...` — testes do parser para resposta malformada, pagamento divergente, usuário divergente e namespace de Storage divergente;
- `90fdd84...` — serviço de upload no browser vincula o registro retornado ao `paymentId` e usuário autenticado.

**Importante:** `192c1a8...` é mudança de Edge Function e permanece source-only até deploy no Supabase.

### Mutações administrativas com retorno de ID

- `7d6cd5d...` — status de pagamento manual, status de quote, data de entrega e tracking de quote agora exigem que o RPC devolva exatamente o ID solicitado;
- `18529f6...` — testes para retorno correto e retorno `null`/inesperado.

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
- [x] ausência de runner/steps foi comprovada também no HEAD `18529f67...`;
- [ ] obter run onde os jobs realmente executem;
- [ ] fechar typecheck/lint/auditors/tests/coverage/build/audit/format no mesmo HEAD.

### P0.2 — autoridade comercial e fronteiras de confiança

- [x] auditor de INSERT direto para tabelas comerciais críticas existe;
- [x] auditor de RPCs perigosos existe;
- [x] `public` e `private_api` são rastreados independentemente;
- [x] REVOKEs comerciais relevantes existem no source;
- [x] várias mutações financeiras críticas agora falham fechado no cliente/gateway;
- [ ] reexecutar auditores completos quando o runner voltar;
- [ ] reconciliar grants/RLS efetivos no Supabase canônico;
- [ ] concluir a retirada de chamadas browser-side a RPCs legados de pricing quando houver backend canônico disponível para implantar e provar a fronteira substituta.

### P0.3 — Supabase / RLS / migrations / Edge Functions

- [ ] reativar ou tornar observável o projeto canônico por caminho autorizado;
- [ ] comparar migrations locais x aplicadas;
- [ ] verificar grants de `anon`, `authenticated`, `service_role` e `private_api`;
- [ ] verificar RLS/policies reais em commerce, payments, subscriptions, notifications, support e Storage;
- [ ] implantar/provar as mudanças source-only de `update-delivery-status` e `upload-payment-proof`;
- [ ] registrar drift real antes de qualquer nova correção de schema.

### P0.4 — fluxos essenciais do MVP

Validar no ambiente canônico com usuários/roles controlados:

- [ ] autenticação e restauração de sessão;
- [ ] catálogo/coleções/modelos públicos;
- [ ] checkout/criação compatível com autoridade comercial;
- [ ] área do cliente e progresso de pedido;
- [ ] pagamentos, upload/revisão/exclusão de comprovantes;
- [ ] assinatura, crédito/coins e cancelamento;
- [ ] entregas e tracking;
- [ ] suporte e anexos;
- [ ] notificações;
- [ ] admin: usuários, pedidos, coleções, produção, financeiro e configurações críticas;
- [ ] refresh/navegação direta em rotas críticas;
- [ ] loading/empty/error/success sem falso sucesso ou estado fictício.

### P0.5 — deploy, smoke e rollback

- [x] Vercel está operacional e há deployment recente `READY` (`893c3e1...`);
- [ ] confirmar deployment `READY` do HEAD funcional mais recente após a fila/integração GitHub → Vercel alcançar esse commit;
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

**Bloqueado:** run `34764740809` do HEAD funcional `18529f67...` terminou com 4 jobs, todos `steps=[]` e `runner_id=0`.

### Supabase

**Bloqueado:** canônico inativo/inobservável. Impede deploy/prova remota das Edge Functions novas e reconciliação de banco/RLS/grants.

### Vercel

**Não bloqueado como plataforma.** Último deployment observado: `893c3e1...`, `READY`, production. Os commits posteriores ainda não apareceram na listagem consultada deste checkpoint.

## 6. Próxima sequência de execução

1. Continuar auditoria source-first de alto risco enquanto runner/Supabase estiverem bloqueados, especialmente financeiro, pagamentos, quotes e contratos de resposta remota.
2. Não migrar pricing para uma nova fronteira backend que não possa ser implantada/provada; mapear a dívida e preparar migração segura para quando Supabase voltar.
3. Reconsultar Vercel e confirmar o primeiro deployment `READY` que contenha os commits recentes client-side.
4. Quando GitHub runner voltar, executar Quality Gate completo no HEAD e corrigir somente falhas reais dos steps.
5. Quando Supabase voltar, reconciliar migrations/grants/RLS, implantar Edge Functions pendentes e rodar smoke P0.4.
6. Só após gate + Supabase + smoke + rollback reavaliar GO/NO-GO.

## 7. Do not repeat

- Não trabalhar em `novo-ordax-os` ou outro OrdaX antigo.
- Não tratar `BUILD_RATE_LIMIT` como bloqueio atual sem nova evidência.
- Não dizer que falta REVOKE posterior de `quotes`; ele existe no source.
- Não assumir migration/Edge Function versionada = aplicada remotamente.
- Não “corrigir” GitHub Actions alterando código enquanto jobs tiverem `runner_id=0`/`steps=[]`.
- Não declarar testes adicionados como PASS canônico enquanto o runner não os executar.
- Não criar branch, PR ou SSOT paralelo sem instrução explícita.
- Não declarar lançamento pronto enquanto P0 estiver aberto.

## 8. Checkpoint desta sessão

Concluído no source até `18529f67...`:

- hardening fail-closed de pricing, assinatura, coins e mutações standalone;
- gateway admin com confirmação explícita onde o SQL realmente retorna `{ success:true }`;
- entrega validada no cliente e na Edge Function;
- upload de comprovante protegido contra resposta incoerente e objeto órfão;
- resposta de upload vinculada a payment/usuário/namespace de Storage no browser;
- mutações administrativas UUID-returning validadas contra o recurso solicitado;
- testes novos versionados para os contratos críticos acima;
- Quality Gate do HEAD confirmado como bloqueado antes de qualquer step;
- Vercel confirmado operacional, com `893c3e1...` `READY` como último deployment observado;
- Supabase segue bloqueando deploy/prova remota das Edge Functions novas.

**Next action:** continuar o pente-fino financeiro/comercial pelo próximo caminho que ainda transforma resposta remota ambígua em sucesso, depois revalidar Vercel e atualizar este SSOT somente com evidência nova.
