# URGENTE — prontidão para lançamento

Status: **EM EXECUÇÃO — NO-GO para lançamento**

Atualizado em: 2026-08-30  
Branch de execução: **work/urgente/release-readiness**  
Base auditada: **main@792e6f882e298fe38bfc57b4025ad09ca631acf9**

Este documento é o SSOT do trabalho de prontidão para lançamento. Percentuais, datas e declarações antigas não são prova. Um item só muda para concluído quando há comando, teste, workflow, consulta, captura ou observação reproduzível registrada.

## 1. Objetivo

Entregar o ORDAX como produto publicável, profissional e verificável:

- repositório limpo, compreensível e com autoridade documental única;
- build determinístico, CI obrigatório e dependências controladas;
- Supabase, autenticação, pagamentos e funções com segurança comprovada;
- catálogo e fluxos essenciais funcionais no ambiente publicado;
- interface coerente, responsiva, acessível e sem mocks ou legados expostos;
- release versionada, observável e com rollback ensaiado.

## 2. Veredito da auditoria inicial

**NO-GO.** A base contém hardening relevante, mas o ambiente publicado e a engenharia de release ainda não sustentam lançamento.

### 2.1 Evidências do repositório

| Evidência | Estado observado | Consequência |
|---|---|---|
| Branch padrão | main sem proteção | mudanças podem entrar sem gate obrigatório |
| Automação versionada | nenhum arquivo em .github/workflows | não existe CI atual no repositório |
| Histórico de Actions | 20 execuções mais recentes falharam; todas antigas, de 2026-03 | não existe prova recente de build/teste |
| Releases | nenhuma release publicada | não há artefato ou versão promovível |
| package.json | versão 0.0.0 e nome genérico vite_react_shadcn_ts | identidade de pacote/release não consolidada |
| Lockfiles | package-lock.json, bun.lock e bun.lockb | instalação não tem autoridade única |
| Testes | 210 arquivos de teste encontrados | boa base, mas sem execução recente comprovada |
| Banco | 199 migrations SQL | alto custo de replay e risco de drift a medir |
| Edge Functions | 44 funções de produto no repositório | superfície ampla que exige inventário e testes |
| Documentação | 41 arquivos Markdown na raiz, 40 em docs e 54 em docs-archive | SSOT contraditório e raiz poluída |
| AGENTS.md | inexistente na base | continuidade entre agentes sem contrato |
| Arquivos estranhos na raiz | .cmd, .lnk e leia.txt ligados a operação antiga de Telegram | ruído operacional e risco de execução acidental |

### 2.2 Evidências do ambiente publicado

Auditoria pública de https://ordax.com.br em 2026-08-30:

- a página inicial renderiza e a direção visual é consistente;
- a própria home informa **0 personagens** e **0 modelos**;
- /universo termina em **Universo vazio**;
- o console registra falha ao buscar a view de configurações e usa defaults;
- o Supabase configurado em supabase/config.toml, projeto pdytjhtjlxvbbeuxgnms (Ordax-2026-1), está **INACTIVE**;
- 43 Edge Functions aparecem implantadas, mas a função **stripe-webhook** existente no repositório não aparece no ambiente;
- 13 funções implantadas usam verify_jwt=false; isso pode ser correto para cron/webhook, mas cada uma precisa provar autenticação alternativa, rate limit e fail-closed;
- os advisors retornaram lista vazia, mas banco/tabelas/migrations não puderam ser inspecionados enquanto o projeto está inativo; portanto isso **não** conta como prova de ausência de vulnerabilidades.

### 2.3 Contradições já confirmadas

- README.md declara “85% completo” e “pronto para lançamento”.
- docs/README.md declara trabalho crítico ainda pendente e usa métricas antigas.
- CHANGELOG registra uma raiz reduzida a três arquivos, mas hoje há 74 entradas na raiz.
- A UI mostra “CATALOGO PUBLICO ATIVO”, embora o catálogo publicado esteja vazio.
- A interface exibe v2.0, enquanto package.json permanece em 0.0.0.
- Há variável de Sentry documentada, mas a implementação atual mantém SENTRY_ENABLED=false e funciona como no-op.

## 3. Princípios de execução

1. Não alterar a main diretamente.
2. Não apagar histórico: mover documentos comprovadamente obsoletos para docs-archive com índice.
3. Não declarar “pronto”, “seguro” ou “100%” sem prova reproduzível.
4. Não fazer deploy, migration remota ou reativação paga como parte de uma simples limpeza.
5. Não expor service_role, segredos Stripe, OAuth, SMTP ou tokens em VITE_*.
6. Preferir um único executor, um único schema canônico e um único caminho de release.
7. Toda função privilegiada precisa de autenticação, autorização, rate limit, validação, idempotência quando aplicável e resposta sem detalhes internos.
8. Mudanças de UI devem ser verificadas no desktop e em largura móvel, incluindo loading, vazio, erro e sucesso.

## 4. Plano de execução

### P0 — Governança e verdade operacional

Estado: **EM EXECUÇÃO**

- [x] auditar HEAD, branches, PRs, issues, Actions e releases;
- [x] auditar árvore do repositório e localizar conflitos de documentação;
- [x] verificar o site público sem autenticação;
- [x] correlacionar o projeto Supabase declarado com o ambiente conectado;
- [x] criar branch exclusiva de recuperação;
- [x] criar este SSOT;
- [x] criar contrato AGENTS.md;
- [x] substituir declarações promocionais antigas dos READMEs por estado factual;
- [x] adicionar Quality Gate versionado;
- [ ] obter a primeira execução verde ou registrar falhas reais do gate;
- [ ] abrir PR e tornar os checks obrigatórios antes do merge;
- [ ] proteger main contra push direto e exigir revisão/checks.

Saída: repositório com autoridade clara e mudança bloqueada por prova.

### P1 — Estrutura e documentação

Estado: **PENDENTE**

- [ ] classificar os 41 Markdown da raiz em canônico, operacional atual ou histórico;
- [ ] manter na raiz apenas README.md, AGENTS.md, URGENTE.md, licença e arquivos técnicos necessários;
- [ ] mover relatórios de fase, sessão, progresso e “final” para docs-archive/status-reports;
- [ ] mover guias vigentes para docs/operations ou docs/setup;
- [ ] criar mapa documental curto em docs/README.md;
- [ ] remover o atalho binário .lnk do Git;
- [ ] mover o launcher .cmd e leia.txt para scripts/catalog/legacy ou arquivar, conforme dependências reais;
- [ ] eliminar links quebrados, documentos duplicados e afirmações contraditórias;
- [ ] documentar arquitetura, domínio, ADRs e runbooks mínimos.

Saída: raiz limpa e documentação navegável com um único status vigente.

### P2 — Build, dependências e qualidade

Estado: **PENDENTE**

- [ ] escolher npm como package manager canônico e remover lockfiles concorrentes após CI;
- [ ] corrigir nome e versão do pacote;
- [ ] executar npm ci com Node 22;
- [ ] aprovar format, typecheck, lint, auditoria Supabase, cobertura e build;
- [ ] corrigir vulnerabilidades high/critical sem upgrades cegos;
- [ ] revisar dependências de browser e servidor misturadas no mesmo pacote;
- [ ] validar bundle, code splitting, assets, fontes e cache;
- [ ] gerar inventário de licenças e dependências de produção.

Saída: build reproduzível e Quality Gate verde.

### P3 — Supabase, segurança e pagamentos

Estado: **BLOQUEADO pelo projeto inativo para prova remota**

- [ ] confirmar que pdytjhtjlxvbbeuxgnms é o projeto de produção correto;
- [ ] restaurar/ativar somente com autorização operacional e plano de custo;
- [ ] comparar migrations Git x migrations remotas e medir drift;
- [ ] executar advisors de segurança e performance com banco acessível;
- [ ] verificar RLS de toda tabela/view exposta, incluindo security_invoker nas views;
- [ ] revisar SECURITY DEFINER, EXECUTE PUBLIC, search_path e funções privilegiadas;
- [ ] revisar grants explícitos para Data API conforme mudanças de 2026;
- [ ] auditar Storage, MIME, tamanho, ownership e upsert;
- [ ] provar que as 13 funções verify_jwt=false possuem proteção alternativa;
- [ ] reconciliar 44 funções no Git com 43 implantadas;
- [ ] implantar e testar stripe-webhook com assinatura, idempotência e replay;
- [ ] verificar Google OAuth, confirmação de e-mail, redirects e política de senha;
- [ ] executar testes de BOLA/IDOR para cliente, admin, cobrança e produção;
- [ ] comprovar que service_role nunca chega ao bundle.

Saída: relatório de segurança com achados zerados ou risco formalmente aceito.

### P4 — Funcionalidade publicada

Estado: **PENDENTE**

- [ ] restaurar dados ou corrigir a origem que produz 0 personagens/0 modelos;
- [ ] substituir “catálogo ativo” por estado real e acionável;
- [ ] criar estados de erro/retry em vez de cair silenciosamente em defaults;
- [ ] smoke test de home, universo, personagem, modelo, detalhe, busca e contato;
- [ ] smoke test de cadastro, login, recuperação e logout;
- [ ] smoke test de perfil, wishlist, dashboard e notificações;
- [ ] smoke test administrativo com RBAC;
- [ ] smoke test Stripe em modo teste, webhook, pagamento, falha, reembolso e duplicidade;
- [ ] testar URLs profundas, refresh e página 404;
- [ ] testar indisponibilidade do Supabase sem travar a experiência.

Saída: matriz E2E dos fluxos críticos aprovada.

### P5 — Produto, UI e conteúdo

Estado: **PENDENTE**

- [ ] inventariar mocks, placeholders, feature flags, duplicidades e rotas legadas;
- [ ] remover placeholder.svg do Open Graph e fornecer imagem social real;
- [ ] alinhar marca, versão, nomenclatura, capitalização e tom;
- [ ] revisar contraste, foco, teclado, headings, labels e leitura por tecnologia assistiva;
- [ ] reduzir repetição visual/acessível causada por efeitos de texto;
- [ ] revisar desktop, tablet e mobile;
- [ ] medir Core Web Vitals e Lighthouse em produção;
- [ ] validar legal/LGPD, e-mails, CNPJ, endereço, política de privacidade e consentimentos;
- [ ] validar catálogo com dados reais, imagens, preços e disponibilidade.

Saída: experiência coerente, acessível e sem conteúdo falso.

### P6 — Release engineering

Estado: **PENDENTE**

- [ ] definir SemVer, changelog real e política de release;
- [ ] configurar ambiente preview/staging separado de produção;
- [ ] definir promoção imutável do mesmo artefato;
- [ ] criar checklist de secrets por ambiente sem valores sensíveis;
- [ ] configurar logs, alertas, uptime e rastreamento de erros real;
- [ ] definir backup, restore, rollback e responsáveis;
- [ ] ensaiar migration do zero e restauração;
- [ ] criar release candidate assinada e notas de versão.

Saída: RC promovível e reversível.

### P7 — Lançamento controlado

Estado: **PENDENTE**

- [ ] congelar escopo;
- [ ] executar checklist final e go/no-go;
- [ ] lançar em canário;
- [ ] observar erros, auth, pagamentos e latência;
- [ ] ampliar tráfego somente com SLOs dentro da meta;
- [ ] registrar release final e retrospectiva.

## 5. Critérios mínimos de GO

O lançamento só pode ser aprovado quando todos forem verdadeiros:

- Quality Gate verde em commit exato;
- main protegida e sem push direto;
- nenhum secret high-confidence no Git ou bundle;
- nenhum advisory crítico/alto sem mitigação;
- RLS/grants/funções privilegiadas revisadas;
- catálogo publicado com dados reais e estados de erro;
- Stripe testado ponta a ponta e webhook implantado;
- fluxos público, cliente e admin aprovados;
- cobertura mínima configurada satisfeita;
- Lighthouse e acessibilidade medidos, não estimados;
- backup/restore/rollback ensaiados;
- RC versionada e release notes coerentes;
- responsável e janela de observação definidos.

## 6. Checkpoints

Cada checkpoint deve registrar:

- HEAD;
- concluído;
- testes e provas;
- bloqueios;
- next_action;
- do_not_repeat.

### Checkpoint 0 — 2026-08-30

HEAD inicial: 792e6f882e298fe38bfc57b4025ad09ca631acf9

Concluído:

- inventário inicial do GitHub, código, documentação, site e Supabase;
- veredito NO-GO baseado em evidências;
- criação da branch de recuperação;
- definição do plano e do contrato de continuidade;
- preparação do primeiro Quality Gate.

Testes/provas:

- árvore GitHub completa: 1.737 arquivos, 1.954 entradas;
- inspeção pública de /, /universo e /login;
- consulta do projeto Supabase e inventário de Edge Functions;
- comparação do inventário Git x funções implantadas.

Next action:

- executar o Quality Gate, registrar falhas verdadeiras e iniciar P1 sem apagar histórico.

Do not repeat:

- não reutilizar percentuais antigos;
- não reauditar a raiz antes de novos commits;
- não restaurar/deployar Supabase durante limpeza documental;
- não tratar advisors vazios do projeto inativo como aprovação de segurança.
