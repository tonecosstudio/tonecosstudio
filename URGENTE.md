# URGENTE — SSOT de prontidão do MVP

Status: **EM EXECUÇÃO — NO-GO para lançamento público**  
Atualizado em: **2026-09-01 (America/Bahia)**  
Branch operacional: **main somente**  
Base auditada deste checkpoint: `82a8d2e17f578d4a5914e2cdfe94faa4dbad5d14`

Este arquivo é o **SSOT operacional** para levar o ORDAX ao MVP. Histórico resolvido deve permanecer no Git, não ser acumulado aqui. O objetivo é manter apenas regras vigentes, evidências atuais, bloqueadores e a próxima ordem de execução.

## 1. Regras de operação

1. Trabalhar diretamente na `main`; não criar branch/PR sem nova instrução explícita.
2. Fazer mudanças pequenas, reversíveis e comprováveis.
3. Não reduzir thresholds, desligar auditor ou mascarar erro apenas para deixar CI verde.
4. Frontend não é fronteira de autorização. Identidade, preço, crédito, pagamento, capacidade, prazo e ownership devem ser derivados/validados server-side.
5. Segredos e `service_role` nunca entram em `VITE_*` ou bundle do navegador.
6. Um domínio deve ter uma autoridade canônica. Remover mocks, aliases, executores e caminhos paralelos quando duplicarem autoridade.
7. Código/migration versionado não equivale a deploy nem prova remota.
8. Não editar migration histórica aplicada nem tipo gerado para esconder drift.
9. Migration nova deve usar o fluxo oficial Supabase; não inventar filename/timestamp.
10. Não declarar GO, CI verde, migration aplicada, RLS seguro ou deploy válido sem evidência reproduzível.
11. Funcionalidade crítica incompleta deve falhar fechada ou permanecer fora da navegação pública do MVP.

## 2. Estado real deste checkpoint

| Área | Estado | Evidência / observação |
| --- | --- | --- |
| `main` | **SSOT** | base auditada `82a8d2e` |
| GitHub Actions | **VERMELHO** | run `33469624445` concluiu `failure` |
| Runner / `npm ci` | **OK** | runner provisiona e dependências instalam |
| TypeScript | **OK** | step de typecheck passou no run atual |
| ESLint | **OK** | step de lint passou no run atual |
| Coverage | **FALHA** | `npm run test:coverage` é bloqueador atual |
| Build | **SEM PROVA NO RUN** | foi pulado pelo encadeamento anterior após coverage falhar |
| Audit de dependências | **SEM PROVA NO RUN** | foi pulado pelo encadeamento anterior |
| Formatting | **SEM PROVA NO RUN** | foi pulado pelo encadeamento anterior |
| Auditor Supabase | **PASSOU** | auditor de fronteiras passou |
| Auditor profiles | **PASSOU** | passou no run atual |
| Auditor notification | **FALHA** | dívida de autoridade a corrigir |
| Auditor public settings | **FALHA** | dívida de autoridade a corrigir |
| Auditor upload scanner | **PASSOU** | fail-closed scanner passou |
| Auditor commercial | **FALHA** | dívida de autoridade a corrigir |
| Supabase canônico | **INACTIVE** | `pdytjhtjlxvbbeuxgnms` / `Ordax-2026-1`; impede prova/mutação remota segura |
| Vercel | **SEM RELEASE VERDE COMPROVADO** | falha anterior por `BUILD_RATE_LIMIT`; revalidar após CI/source verdes |
| Lançamento público | **NO-GO** | CI, DB/RLS, E2E e deploy ainda sem prova completa |

## 3. Hardening já consolidado no source

- [x] autoridade privilegiada foi progressivamente retirada do navegador nos fluxos auditados;
- [x] fluxos financeiros inseguros/incompletos foram removidos da UI ou tornados browse-only/fail-closed;
- [x] criação genérica/órfã de pagamento e caminhos comerciais duplicados foram reduzidos;
- [x] suporte foi endurecido contra BOLA/IDOR e DML direto indevido;
- [x] notificações administrativas ficaram read-only enquanto grants/RPCs não forem reconciliados;
- [x] produção/capacidade/calendário usam autoridade persistida em vez de disponibilidade fictícia;
- [x] scanner de upload fail-closed e auditores de autoridade fazem parte da prova de engenharia;
- [x] Node 24 + npm/package-lock são a base operacional do CI;
- [x] headers HTTP de produção incluem HSTS, CSP, `nosniff`, proteção de framing, referrer e permissions policy;
- [x] o source diferencia segredo server-side de variáveis públicas `VITE_*`.

## 4. P0 — ordem obrigatória para recuperar a prova de release

### P0.1 — CI determinístico e informativo

- [x] runner voltou a provisionar;
- [x] `npm ci`, typecheck e lint possuem prova real;
- [x] dividir Quality Gate em jobs independentes para não esconder build/audit/format quando coverage falha;
- [x] incluir `scan:mocks`, `format:check` e `deps:cycles` como gates explícitos;
- [ ] corrigir `test:coverage` sem reduzir thresholds para mascarar regressão;
- [ ] obter build de produção verde;
- [ ] obter `npm audit --omit=dev --audit-level=high` verde ou triagem explícita de vulnerabilidade;
- [ ] obter formatting e dependency-cycle gates verdes;
- [ ] deixar todos os auditores de autoridade verdes.

### P0.2 — autoridades que ainda falham

- [ ] `notification`: reconciliar menor privilégio/grants/RPCs sem reabrir DML amplo do browser;
- [ ] `public system settings`: garantir revokes/grants efetivos e evitar mutação pública privilegiada;
- [ ] `commercial`: eliminar/remediar superfícies SQL/client restantes que permitam preço, estado ou ownership controlados pelo cliente;
- [ ] não criar migration ad hoc enquanto o projeto Supabase canônico estiver inativo; primeiro recuperar o ambiente e medir o estado remoto.

### P0.3 — Supabase/RLS

Quando houver decisão operacional para restaurar o projeto canônico:

1. consultar documentação/changelog oficial atual;
2. reativar/confirmar projeto canônico;
3. neutralizar Edge Functions remotas retiradas/tombstonadas antes de tráfego público;
4. medir migration/schema drift contra o remoto;
5. gerar migrations oficiais pelo fluxo da CLI;
6. aplicar e verificar migrations;
7. executar advisors e regenerar tipos a partir do estado remoto válido;
8. executar testes negativos de isolamento multiusuário: usuário A não pode SELECT/INSERT/UPDATE/DELETE dados do usuário B;
9. provar Storage/RLS/functions e ownership de uploads/artefatos.

### P0.4 — fluxos essenciais do MVP

- [ ] cadastro/login/logout/refresh e recuperação de sessão;
- [ ] workspace principal;
- [ ] IA/chat real, persistência e histórico;
- [ ] sessões e artefatos essenciais com ownership;
- [ ] upload real com MIME/tamanho/path/ownership e falha fechada;
- [ ] créditos/ledger sem bypass;
- [ ] Stripe: provar ponta a ponta e idempotência **ou manter billing desabilitado no MVP**;
- [ ] OAuth/integrações: provar callbacks/secrets por ambiente **ou manter fora do MVP**;
- [ ] E2E real no ambiente canônico após Supabase estar seguro.

### P0.5 — deploy e operação

- [ ] Vercel/deploy do HEAD aprovado deve ficar verde;
- [ ] smoke de produção: auth → workspace → IA → sessão → upload/artefato;
- [ ] logs/erros devem carregar release SHA/correlation id suficiente para diagnóstico;
- [ ] documentar e provar rollback do frontend sem depender de migration destrutiva;
- [ ] proteção da `main` somente depois que checks obrigatórios estiverem estáveis e reproduzíveis.

## 5. Escopo de MVP

### Deve estar sólido para o MVP

1. autenticação;
2. workspace principal;
3. IA/chat funcional;
4. persistência/histórico de sessões;
5. artefatos essenciais;
6. upload com ownership;
7. créditos/ledger se fizerem parte da experiência pública;
8. billing apenas se necessário para monetização imediata e totalmente provado.

### Deve ficar atrás de feature flag ou fora da navegação se não estiver 100%

- 3D experimental;
- Drive/Notion e outras integrações não essenciais;
- Codespaces/fork/write e superfícies de código não fundamentais ao valor inicial;
- WebContainers experimentais;
- notificações/mutações administrativas sem contrato server-side comprovado;
- qualquer checkout, pagamento ou OAuth parcial.

O MVP deve ser menor e confiável, não uma coleção grande de telas parcialmente reais.

## 6. Gate de GO

O ORDAX só muda para **MVP GO** quando houver evidência do mesmo release candidato para:

- [ ] `npm ci` em Node 24;
- [ ] typecheck;
- [ ] lint;
- [ ] scanner de mocks/placeholders;
- [ ] formatting;
- [ ] dependency cycles;
- [ ] unit/coverage;
- [ ] build;
- [ ] audit de dependências;
- [ ] todos os auditores de autoridade;
- [ ] Supabase/migrations/RLS/storage reconciliados e testados;
- [ ] E2E dos fluxos essenciais;
- [ ] deploy verde;
- [ ] smoke de produção;
- [ ] observabilidade mínima;
- [ ] rollback documentado/provado;
- [ ] nenhuma tela pública crítica simulando funcionalidade indisponível.

## 7. Bloqueios externos atuais

1. **Supabase `Ordax-2026-1` está INACTIVE.** Não fazer alteração remota nem declarar banco reconciliado enquanto isso persistir.
2. **Vercel apresentou `BUILD_RATE_LIMIT` anteriormente.** Tratar como bloqueio operacional a revalidar, não como defeito de source sem evidência.

## 8. Próxima ação

Sequência imediata:

1. deixar o novo Quality Gate produzir as quatro provas independentes (`quality`, `unit`, `build`, `authority`);
2. corrigir a falha concreta de `test:coverage`;
3. corrigir tudo que for source-only nos auditores vermelhos;
4. separar o que exige migration oficial e manter esse conjunto bloqueado até o Supabase canônico estar ativo;
5. repetir o gate e avançar diretamente para os P0 restantes, sem voltar a itens já comprovados.

**Critério operacional:** cada checkpoint novo deve registrar somente HEAD, evidência, concluído, bloqueio restante e próxima ação. Não reabrir histórico resolvido sem regressão comprovada.
