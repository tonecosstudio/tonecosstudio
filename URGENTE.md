# URGENTE — OrdaX MVP / Launch Readiness

> **SSOT operacional exclusivo de `washingtonmsdj/ordax`.**
> Código, migrations, testes e evidência operacional atual prevalecem sobre documentação arquivada.
> Não misturar com `novo-ordax-os`, forks ou repositórios antigos.

## 0. Estado atual

**Lançamento público: NO-GO.**

Base funcional deste checkpoint:

- `main`: `62accf38c2fd9968da09bbcac89103a30557f29f`
- último commit funcional: `test: cover base pricing mutation responses`
- o commit que atualiza este arquivo será posterior à base funcional acima.

O source avançou em autoridade financeira e contratos fail-closed, mas ainda faltam provas externas obrigatórias no mesmo release candidate.

## 0.1 Bloqueios externos atuais

### GitHub Actions — BLOQUEADO ANTES DOS STEPS

Quality Gate do HEAD funcional `62accf38...`:

- run: `34779622923`
- conclusão: `failure`
- `Unit coverage`: `steps=null`, `logs_url=null`
- `Authority audits`: `steps=null`, `logs_url=null`
- `Build, test and security`: `steps=null`, `logs_url=null`
- `Production build and dependency audit`: `steps=null`, `logs_url=null`

**Conclusão:** nenhum comando do repositório executou. Não modificar código, testes ou workflow para “corrigir” este failure enquanto os jobs continuarem sem runner/steps.

### Supabase canônico — INATIVO / INOBSERVÁVEL

- project id: `pdytjhtjlxvbbeuxgnms`
- referência anterior: `Ordax-2026-1`

Enquanto permanecer indisponível:

- migrations locais não podem ser declaradas aplicadas remotamente;
- grants/RLS/policies efetivos não podem ser declarados reconciliados;
- Edge Functions modificadas no source não podem ser declaradas live;
- drift entre migrations, tipos gerados e banco remoto não deve ser “corrigido” por adivinhação;
- não criar migration especulativa apenas para compensar estado remoto desconhecido.

### Vercel — PRODUÇÃO SAUDÁVEL, NOVOS BUILDS BLOQUEADOS POR RATE LIMIT

Projeto canônico:

- projeto: `ordax`
- project id: `prj_yfe9KqNRdWfYNnY6HSXBfT0D2Vsu`
- team id: `team_VPZxAK2VXdTWXI8blJaKQEl0`
- framework: Vite

Último deployment publicado e confirmado:

- commit: `2786715363f36b4c7651bb3a06b7c60258e6767b`
- deployment: `dpl_5UqCiCkuPshbBjtyMLY1tVmLVrxW`
- estado: `READY`
- target: `production`
- aliases incluem `ordax.com.br` e `www.ordax.com.br`

No HEAD funcional `62accf38...`, o status GitHub `Vercel` está `failure` apontando para `upgradeToPro=build-rate-limit`.

**Conclusão:** o `BUILD_RATE_LIMIT` voltou a ser bloqueio para novos deploys após a sequência de commits. Isso não representa regressão publicada: produção continua no último release READY (`2786715...`).

## 0.2 Hardening consolidado

### Respostas remotas / falso sucesso

Já concluído no source:

- cancelamento de assinatura exige confirmação explícita;
- propagação de pricing exige `ok:true`, contagens inteiras/coerentes e resultados válidos;
- gateway admin exige confirmação explícita nas mutações financeiras que retornam `{ success:true }`;
- processamento de pagamento de assinatura, crédito de coins e exclusão de comprovante falham fechado em payload inválido;
- atualização de entrega valida sucesso, delivery e status solicitados;
- mutações administrativas que retornam UUID validam o ID solicitado;
- upload de comprovante valida payment, usuário, path, nome, tamanho e MIME e limpa objeto recém-enviado diante de resposta inválida.

### Pagamento manual — autoridade e timeline canônico

Concluído:

- DML direto de `authenticated` removido de `manual_payments`;
- `manual_payments`, `payment_files`, `payment_info_requests`, `order_status_history` e `admin_payment_methods` incorporados ao hardening/auditoria de autoridade;
- mudanças de status de pagamento manual geram histórico transacionalmente no banco;
- UI cliente/admin usa timeline autenticado e sanitizado;
- `PaymentService` não consulta mais `payment_audit_log`;
- `PaymentAuditLog`/`audit_logs` foram removidos do contrato manual em `2786715...`;
- testes cliente/admin foram reduzidos e alinhados ao contrato atual;
- benchmark de detalhes mede o caminho canônico `getPaymentById()` + timeline;
- teste de segurança declarativo/hardcoded foi substituído por verificações executáveis sobre source real.

#### Decisão definitiva: `payment_audit_log`

`payment_audit_log` aparece em tipos Supabase gerados antigos, mas não existe migration versionada atual que crie essa tabela.

**Não ressuscitar essa tabela apenas para satisfazer tipos antigos.**

Fontes canônicas de pagamento manual:

- `manual_payments` — estado atual;
- `payment_files` — comprovantes;
- `payment_info_requests` — solicitações ao cliente;
- `order_status_history` — transições;
- endpoint autenticado de timeline — composição sanitizada para UI.

Não editar `src/integrations/supabase/types.ts` manualmente para mascarar drift. Regenerar somente após reconciliação real do Supabase.

### Pricing — contratos fail-closed, fronteira legada ainda pendente

Concluído neste ciclo:

- `5ffdb62...` — `create_tier_with_plans` e `update_tier_and_recalculate_plans` passaram a validar runtime shape;
- `8c47b8f...` — testes cobrem `null`, `{}`, UUID inválido e contagens negativas/fracionárias/string;
- `9d68156...` — `createPricingTier()` exige UUID válido em vez de `data as string`;
- `ad6400b...` — cobertura do ID criado e erros RPC;
- `aef39db...` — `update_purchase_mode_multiplier` exige contagens inteiras e não negativas;
- `55e8394...` — cobertura de resposta inválida do multiplicador de modalidade;
- `6f78957...` — multiplicador/desconto contextual exige exatamente uma linha válida, `success` booleano e valores coerentes;
- `fa8c73e...` — cobertura dos contratos contextuais;
- `d6b34c1...` — atualização de preço base exige exatamente uma linha válida, preços inteiros positivos e `success` booleano;
- `62accf3...` — cobertura da atualização de preço base;
- `31fc756...` — removido teste realtime simplificado que fabricava cobertura por constantes/booleans; a suíte real do hook foi preservada.

#### Dívida estrutural de pricing

Os clientes ainda chamam RPCs legados diretamente pelo browser, incluindo:

- `create_pricing_tier`;
- `update_pricing_tier`;
- `create_tier_with_plans`;
- `update_tier_and_recalculate_plans`;
- `update_purchase_mode_multiplier`;
- RPCs históricos de pricing contextual/base.

Vários deles aparecem nos tipos gerados, mas suas definições atuais não foram encontradas nas migrations versionadas. Isso é **drift de schema/autoridade**.

Não revogar `EXECUTE` agora enquanto o frontend depende deles e o Supabase está indisponível, pois isso quebraria produção sem uma fronteira substituta implantada.

Quando o Supabase voltar:

1. reconciliar funções realmente existentes, assinaturas e grants;
2. consolidar semântica de pricing num backend canônico server-authoritative;
3. migrar frontend para essa fronteira;
4. provar comportamento;
5. só então revogar/remover RPCs legados.

## 1. Critério de GO

O mesmo release candidate precisa provar:

- `npm ci` determinístico;
- TypeScript strict PASS;
- lint PASS;
- auditores de autoridade PASS;
- testes unitários/integrados PASS;
- coverage PASS;
- build produção PASS;
- `npm audit --audit-level=high` sem bloqueio;
- `format:check` conforme política;
- Supabase reconciliado e migrations aplicadas;
- grants/RLS verificados;
- Edge Functions do release implantadas;
- smoke autenticado dos fluxos P0;
- deploy observável;
- rollback reproduzível.

Build verde isolado não equivale a GO.

## 2. P0 — antes do MVP público

### P0.1 Quality Gate

- [x] workflow existe e dispara em `main`;
- [x] bloqueio de runner/steps comprovado também em `62accf38...`;
- [ ] obter run com steps reais;
- [ ] fechar typecheck/lint/auditors/tests/coverage/build/audit/format no mesmo HEAD.

### P0.2 Autoridade comercial

- [x] auditor de DML comercial existe;
- [x] auditor de RPC perigoso rastreia `public` e `private_api` separadamente;
- [x] principais superfícies de pagamento manual endurecidas;
- [x] várias mutações financeiras falham fechado em resposta ambígua;
- [x] principais mutações de pricing ativas agora validam resposta em runtime;
- [ ] reconciliar grants/RLS reais no Supabase;
- [ ] consolidar RPCs legados de pricing atrás de fronteira server-authoritative;
- [ ] revogar/remover RPCs antigos somente após migração comprovada.

### P0.3 Supabase / migrations / Edge Functions

- [ ] reativar/tornar observável o projeto canônico;
- [ ] comparar migrations locais x remotas;
- [ ] verificar grants `anon`/`authenticated`/`service_role`/`private_api`;
- [ ] verificar RLS/policies de commerce, payments, subscriptions, support, notifications e Storage;
- [ ] implantar/provar Edge Functions alteradas no source;
- [ ] regenerar tipos após reconciliação do schema;
- [ ] registrar drift real antes de alterar schema.

### P0.4 Fluxos MVP

Validar em ambiente canônico, com roles controlados:

- [ ] autenticação/restauração de sessão;
- [ ] catálogo/coleções/modelos públicos;
- [ ] checkout/criação com autoridade comercial;
- [ ] área do cliente e progresso de pedido;
- [ ] pagamentos + comprovantes + timeline;
- [ ] assinatura + coins/crédito + cancelamento;
- [ ] entregas/tracking;
- [ ] suporte/anexos;
- [ ] notificações;
- [ ] admin: usuários, pedidos, catálogo, produção, financeiro e configurações críticas;
- [ ] refresh/navegação direta;
- [ ] loading/empty/error/success sem falso sucesso.

#### Checkout de assinatura — estado atual

A UI atual carrega planos e coleções, mas ainda não executa o checkout seguro. Existe RPC server-side versionado para checkout transacional, porém ele não deve ser ligado ao frontend sem provar primeiro que está aplicado e funcional no Supabase canônico.

### P0.5 Deploy / smoke / rollback

- [x] produção Vercel conhecida saudável no release `2786715...`;
- [ ] restabelecer capacidade de novos builds Vercel ou aguardar liberação do rate limit;
- [ ] publicar/provar o HEAD candidato atual;
- [ ] smoke autenticado P0.4;
- [ ] validar domínio/assets/callbacks externos;
- [ ] provar rollback;
- [ ] registrar receipt final.

## 3. Próxima sequência

1. Continuar source-first em mutações financeiras/checkout/assinaturas que ainda aceitem resposta ambígua, sem criar dependência de backend não implantado.
2. Procurar outros testes “aspiracionais” que declarem comportamento por constantes/comentários em vez de executar implementação real.
3. Não disparar correções especulativas no Supabase enquanto ele estiver inobservável.
4. Quando Actions voltar, executar Quality Gate real e corrigir somente falhas de steps executados.
5. Quando Vercel liberar novos builds, validar o HEAD funcional mais recente antes de marcar qualquer commit posterior como produção.
6. Quando Supabase voltar, reconciliar schema/grants/RLS/functions, implantar mudanças pendentes, regenerar tipos e executar smoke P0.
7. Só depois reavaliar GO/NO-GO.

## 4. Do not repeat

- Não trabalhar em outro OrdaX sem instrução explícita.
- Não declarar teste PASS sem execução real.
- Não “corrigir” Actions enquanto jobs tiverem `steps=null`.
- Não declarar migration/Edge Function local como live sem prova remota.
- Não ressuscitar `payment_audit_log`.
- Não editar tipos Supabase gerados manualmente para esconder drift.
- Não revogar RPCs de pricing antes da fronteira substituta estar implantada e o frontend migrado.
- Não tratar o último Vercel READY como prova do HEAD atual; produção está em `2786715...`, enquanto commits posteriores estão bloqueados pelo build-rate-limit.
- Não declarar lançamento pronto enquanto P0 permanecer aberto.
