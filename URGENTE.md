# URGENTE — SSOT de prontidão do MVP

Status: **EM EXECUÇÃO — NO-GO para lançamento público**  
Atualizado em: **2026-09-13 (America/Bahia)**  
Branch operacional: **main somente**  
Base auditada deste checkpoint: `b6be08202eaab360831c6dc3161e6d6eee1bc393`

Este arquivo é o **SSOT operacional** para levar o ORDAX ao MVP. Histórico resolvido permanece no Git; aqui ficam apenas regras vigentes, evidências atuais, bloqueadores e a próxima ordem de execução.

## 1. Regras de operação

1. Trabalhar diretamente na `main`; não criar branch/PR sem nova instrução explícita.
2. Antes de cada escrita, confirmar o HEAD e preservar trabalho concorrente.
3. Fazer mudanças pequenas, reversíveis e comprováveis.
4. Não reduzir thresholds, desligar auditor, excluir código de coverage ou mascarar erro apenas para deixar CI verde.
5. Frontend não é fronteira de autorização. Identidade, preço, crédito, pagamento, capacidade, prazo e ownership devem ser derivados/validados server-side.
6. Segredos e `service_role` nunca entram em `VITE_*` ou bundle do navegador.
7. Um domínio deve ter uma autoridade canônica. Remover mocks, aliases, executores e caminhos paralelos quando duplicarem autoridade.
8. Código/migration versionado não equivale a deploy nem prova remota.
9. Não editar migration histórica aplicada nem tipo gerado para esconder drift.
10. Migration nova deve usar o fluxo oficial Supabase e somente após reconciliação do projeto canônico.
11. Não declarar GO, CI verde, migration aplicada, RLS seguro ou deploy válido sem evidência reproduzível.
12. Funcionalidade crítica incompleta deve falhar fechada ou permanecer fora da navegação pública do MVP.

## 2. Estado real deste checkpoint

| Área | Estado | Evidência / observação |
| --- | --- | --- |
| `main` | **SSOT** | HEAD `b6be082` |
| GitHub Actions | **BLOQUEIO EXTERNO** | runs `34744672254` e `34744715325`: quatro jobs encerram em segundos com `conclusion=failure`, `steps=null` e sem logs; runner não chegou a executar o workflow |
| Última prova executada de runner | **HISTÓRICA** | run `33469624445` executou `npm ci`, typecheck e lint; coverage e três auditores falharam naquele source antigo |
| TypeScript | **ÚLTIMA PROVA EXECUTADA OK** | passou no run histórico; sem nova execução por indisponibilidade do runner |
| ESLint | **ÚLTIMA PROVA EXECUTADA OK** | passou no run histórico; sem nova execução por indisponibilidade do runner |
| Coverage | **CORREÇÃO EM CURSO / SEM NOVA MEDIÇÃO** | thresholds preservados; `catalog-utils.edge-cases.test.ts` adicionado em `0ff35cf` e ajustado em `b6be082`; runner atual não executa steps |
| Build | **SEM PROVA DO HEAD** | job atual não iniciou steps |
| Audit de dependências | **SEM PROVA DO HEAD** | job atual não iniciou steps; não suprimir `npm audit` |
| Formatting | **SEM PROVA DO HEAD** | job atual não iniciou steps |
| Auditor Supabase | **ÚLTIMA PROVA EXECUTADA PASSOU** | run histórico |
| Auditor profiles | **ÚLTIMA PROVA EXECUTADA PASSOU** | run histórico |
| Auditor notification | **SOURCE ENDURECIDO / REEXECUÇÃO PENDENTE** | migration `20260902072000_mvp_authority_hardening.sql` revoga UPDATE amplo e restringe read-state; precisa reexecução do auditor |
| Auditor public settings | **SOURCE ENDURECIDO / REEXECUÇÃO PENDENTE** | migration de 02/09 rejeita chaves secret-like em `public.system_settings`; precisa reexecução do auditor |
| Auditor commercial | **BLOQUEADO POR DÍVIDA SQL + REMOTO INATIVO** | grant histórico ainda inclui `quotes` em DML autenticado; hardening de 02/09 revoga INSERT de `standalone_purchases`/`subscriptions`, mas não há evidência posterior de `REVOKE INSERT ... quotes` |
| Supabase canônico | **INACTIVE** | `pdytjhtjlxvbbeuxgnms` / `Ordax-2026-1`; não criar migration ad hoc nem declarar estado remoto reconciliado |
| Vercel | **BLOQUEIO EXTERNO** | status do HEAD anterior apontou `BUILD_RATE_LIMIT`; revalidar após capacidade disponível |
| Lançamento público | **NO-GO** | CI executável, coverage, banco/RLS, E2E e deploy ainda sem prova completa |

## 3. Hardening já consolidado no source

- [x] autoridade privilegiada foi progressivamente retirada do navegador nos fluxos auditados;
- [x] fluxos financeiros inseguros/incompletos foram removidos da UI ou tornados browse-only/fail-closed;
- [x] suporte foi endurecido contra BOLA/IDOR e DML direto indevido;
- [x] scanner de upload é fail-closed;
- [x] Node 24 + npm/package-lock são a base operacional do CI;
- [x] Quality Gate foi dividido em jobs independentes (`quality`, `unit`, `build`, `authority`);
- [x] thresholds de coverage permanecem em 70% lines/functions/statements e 65% branches;
- [x] `public.system_settings` possui rejeição server-side de nomes secret/token/password/private-key/service-role/credential/API-key no source versionado;
- [x] criação genérica de admin notification está restrita a `service_role` no hardening versionado;
- [x] UPDATE amplo de notification read-state foi substituído por grant de colunas no hardening versionado;
- [x] `standalone_purchases` e `subscriptions` perderam INSERT autenticado no hardening versionado;
- [x] testes reais adicionais cobrem caminhos de tag, variante, títulos, taxonomia e sensibilidade de catálogo (`0ff35cf`, `b6be082`).

## 4. P0 — ordem obrigatória para recuperar a prova de release

### P0.1 — recuperar execução real do Quality Gate

- [x] dividir Quality Gate em quatro provas independentes;
- [x] manter thresholds e auditores fail-closed;
- [ ] recuperar/provisionar GitHub-hosted runner para que os jobs executem steps novamente;
- [ ] executar `npm ci`, typecheck, lint e formatting no HEAD atual;
- [ ] executar `npm run test:coverage` no HEAD atual e medir percentuais reais;
- [ ] continuar cobertura por comportamento somente se algum threshold permanecer abaixo da meta;
- [ ] obter build de produção verde;
- [ ] obter `npm audit --omit=dev --audit-level=high` verde ou triagem explícita de vulnerabilidade;
- [ ] reexecutar todos os auditores de autoridade no source atual.

### P0.2 — autoridades

- [x] `public system settings`: source contém rejeição server-side de chaves secret-like; falta prova executada do auditor atual e prova remota;
- [ ] `notification`: source de 02/09 contém hardening relevante; reexecutar auditor para confirmar todos os RPCs/grants/evidências, sem inferir PASS;
- [ ] `commercial`: reconciliar `quotes` no remoto e gerar migration oficial para remover INSERT autenticado/policy legada se o estado efetivo confirmar a dívida;
- [ ] não criar migration ad hoc enquanto o projeto Supabase canônico estiver inativo.

### P0.3 — Supabase/RLS

Quando houver capacidade para restaurar o projeto canônico:

1. reativar/confirmar `Ordax-2026-1`;
2. medir migration/schema drift contra o remoto antes de escrever nova migration;
3. confirmar grants/policies efetivos de `quotes`, notifications, settings e superfícies comerciais;
4. gerar qualquer migration necessária pelo fluxo oficial Supabase;
5. aplicar e verificar migrations;
6. executar advisors e regenerar tipos a partir do estado remoto válido;
7. executar testes negativos de isolamento multiusuário: usuário A não pode SELECT/INSERT/UPDATE/DELETE dados do usuário B;
8. provar Storage/RLS/functions e ownership de uploads/artefatos.

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
- [ ] proteger a `main` somente depois que checks obrigatórios estiverem estáveis e reproduzíveis.

## 5. Escopo de MVP

### Deve estar sólido

1. autenticação;
2. workspace principal;
3. IA/chat funcional;
4. persistência/histórico de sessões;
5. artefatos essenciais;
6. upload com ownership;
7. créditos/ledger se fizerem parte da experiência pública;
8. billing somente se necessário para monetização imediata e totalmente provado.

### Deve ficar atrás de feature flag ou fora da navegação se não estiver 100%

- 3D experimental;
- Drive/Notion e integrações não essenciais;
- Codespaces/fork/write e superfícies de código não fundamentais ao valor inicial;
- WebContainers experimentais;
- notificações/mutações administrativas sem contrato server-side comprovado;
- qualquer checkout, pagamento ou OAuth parcial.

O MVP deve ser menor e confiável, não uma coleção de telas parcialmente reais.

## 6. Gate de GO

O ORDAX só muda para **MVP GO** quando houver evidência do mesmo release candidato para:

- [ ] `npm ci` em Node 24;
- [ ] typecheck;
- [ ] lint;
- [ ] formatting;
- [ ] unit/coverage nos thresholds vigentes;
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

1. **GitHub Actions não está provisionando runner para os jobs atuais.** Runs `34744672254` e `34744715325` encerraram com `steps=null`; isso bloqueia a medição de coverage e as provas de build/audit/authority do HEAD.
2. **Supabase `Ordax-2026-1` está INACTIVE.** Não alterar estado remoto nem fabricar migration de correção antes de medir o banco canônico.
3. **Vercel apresentou `BUILD_RATE_LIMIT`.** Revalidar quando houver capacidade; não tratar como defeito de source sem evidência.

## 8. Próxima ação

Sequência imediata:

1. preservar o avanço de coverage já versionado e medir assim que o runner voltar;
2. enquanto o runner estiver indisponível, revisar source-only de módulos grandes/ramificados e adicionar testes apenas onde houver comportamento relevante não coberto;
3. não abrir migration para `quotes` antes de reativar/reconciliar o Supabase canônico;
4. assim que o runner executar, usar o relatório real de coverage para atacar somente os arquivos/branches restantes;
5. reexecutar os auditores e separar PASS de source, PASS remoto e bloqueios externos;
6. avançar para RLS/E2E/deploy/smoke sem reabrir itens já comprovados.

**Critério operacional:** cada checkpoint novo registra somente HEAD, evidência, concluído, bloqueio restante e próxima ação. Não declarar sucesso por inferência quando a ferramenta externa não executou.