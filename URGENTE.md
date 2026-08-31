# URGENTE — prontidão para lançamento

Status: **EM EXECUÇÃO — NO-GO para lançamento**

Atualizado em: 2026-08-30  
Branch de execução: **main (única branch operacional)**  
Base auditada: **main@792e6f882e298fe38bfc57b4025ad09ca631acf9**  
HEAD consolidado na main: **d65aa40f77c75b608b9ca65b8e6247e1bfa0c66a**

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

1. Trabalhar diretamente na main, conforme decisão explícita do usuário, em commits pequenos e reversíveis.
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
- [x] criar branch inicial de recuperação e consolidá-la por fast-forward na main;
- [x] criar este SSOT;
- [x] criar contrato AGENTS.md;
- [x] substituir declarações promocionais antigas dos READMEs por estado factual;
- [x] adicionar Quality Gate versionado;
- [x] obter a primeira execução verde ou registrar falhas reais do gate;
- [ ] abrir PR e tornar os checks obrigatórios antes do merge;
- [ ] proteger main contra push direto e exigir revisão/checks.

Saída: repositório com autoridade clara e mudança bloqueada por prova.

### P1 — Estrutura e documentação

Estado: **PENDENTE**

- [x] classificar os 41 Markdown da raiz em canônico, operacional atual ou histórico;
- [x] manter na raiz apenas README.md, AGENTS.md, URGENTE.md, licença e arquivos técnicos necessários;
- [x] mover relatórios de fase, sessão, progresso e “final” para docs-archive/root-legacy/2026-pre-urgent;
- [ ] mover guias vigentes para docs/operations ou docs/setup;
- [x] criar mapa documental curto em docs/README.md;
- [x] remover o atalho binário .lnk do Git;
- [x] mover o launcher .cmd e leia.txt para scripts/catalog/legacy;
- [ ] eliminar links quebrados, documentos duplicados e afirmações contraditórias;
- [ ] documentar arquitetura, domínio, ADRs e runbooks mínimos.

Saída: raiz limpa e documentação navegável com um único status vigente.

### P2 — Build, dependências e qualidade

Estado: **PENDENTE**

- [ ] escolher npm como package manager canônico e remover lockfiles concorrentes após CI;
- [x] corrigir identidade do pacote para ordax-web@0.1.0;
- [ ] executar npm ci com Node 24;
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
- [x] substituir “catálogo ativo” por estado real e não exibir zero durante falha;
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
- [x] remover placeholder.svg do Open Graph e fornecer imagem social real;
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


### Checkpoint 1 — 2026-08-30

HEAD: fac687daef7ca0b83f6143141d4114f5c7767c0c

Concluído:

- raiz reduzida de 74 para 33 entradas;
- raiz Markdown reduzida de 41 documentos concorrentes para AGENTS.md, README.md e URGENTE.md;
- 40 documentos antigos preservados sem reescrita em docs-archive/root-legacy/2026-pre-urgent;
- criado índice explicando a autoridade histórica do arquivo;
- launcher e instrução auxiliar de Telegram movidos para scripts/catalog/legacy;
- atalho binário telegram-2370335738-images.lnk removido do estado atual;
- Quality Gate acionado em commits reais.

Testes/provas:

- árvore da branch contém 41 arquivos no novo arquivo histórico, incluindo o índice;
- nenhum .lnk permanece versionado na branch;
- duas execuções do Quality Gate falharam antes de iniciar steps;
- jobs 99341593024 e 99341801589 têm steps=null e logs_url=null.

Bloqueios:

- GitHub Actions não alocou/executou o runner. A causa provável está fora do YAML/código (configuração de Actions, cobrança, limite ou política da conta), mas precisa ser confirmada no GitHub; sem steps/logs não existe erro de aplicação a corrigir.

Next action:

- abrir PR draft;
- verificar a configuração/limite do GitHub Actions;
- continuar a classificação de docs/ e docs-archive sem alterar sistema ou produção;
- após o runner funcionar, corrigir a primeira falha real do Quality Gate.

Do not repeat:

- não rerodar o mesmo workflow enquanto jobs continuarem sem steps/logs;
- não devolver documentos antigos à raiz;
- não remover package-lock ou lockfiles Bun antes de uma instalação reproduzível comprovada;
- não confundir falha de alocação do runner com falha de build.


### Checkpoint 2 — 2026-08-30

HEAD funcional: a53dc69cf1732a1ffdf98b46eb7611e7c44fee16

Concluído:

- PR draft #2 aberto contra main;
- vercel.json passou a ignorar somente commits de documentação;
- classificador de diff conservador criado em scripts/vercel/should-ignore-build.mjs;
- falha de classificação mantém a build ativa;
- a home agora distingue carregamento, indisponibilidade, catálogo parcial, vazio real e catálogo ativo;
- contadores não apresentam zero falso durante falha da consulta;
- versão visual v2.0 sem correspondência em package.json removida.

Testes/provas:

- cinco casos do classificador executados com Node: documentação, código, configuração, vazio e diff misto;
- mudanças em src/, vercel.json e diff misto continuam a build;
- leitura da branch confirmou vercel.json e o script no commit 0f583d52d16ff147a937ccb45f0cec5a54098f6e;
- o commit funcional da home é a53dc69cf1732a1ffdf98b46eb7611e7c44fee16.

Bloqueios:

- Vercel ainda reporta build-rate-limit no plano Hobby para commits funcionais;
- GitHub Actions continua sem iniciar steps;
- a correção visual ainda exige preview e smoke test quando a cota/runner estiverem disponíveis.

Next action:

- validar se este commit somente documental é corretamente ignorado pela Vercel;
- restaurar a execução real do Quality Gate;
- resolver drift Node 22 no CI x Node 24 na Vercel;
- continuar P2 sem remover lockfiles antes de prova reproduzível.

Do not repeat:

- não usar texto promocional para encobrir falha de dados;
- não mostrar zero quando a consulta falhou;
- não consumir preview para documentação;
- não considerar a correção visual aprovada sem build e smoke test.


### Checkpoint 3 — 2026-08-30

HEAD consolidado na main: d65aa40f77c75b608b9ca65b8e6247e1bfa0c66a

Decisão operacional:

- main passa a ser a única branch de trabalho;
- novos commits serão feitos diretamente na main;
- novas branches ou PRs somente com nova instrução explícita do usuário.

Concluído:

- os 10 commits de work/urgente/release-readiness foram aplicados na main por fast-forward sem force;
- comparação main...work/urgente/release-readiness: identical, ahead=0, behind=0;
- feature/contextual-pricing-system foi classificada como obsoleta: ahead=0 e behind=1128;
- Node 24 LTS adotado como runtime canônico no CI e no desenvolvimento;
- Quality Gate passa a executar somente em push para main ou manualmente.

Testes/provas:

- main avançou de 792e6f882e298fe38bfc57b4025ad09ca631acf9 para d65aa40f77c75b608b9ca65b8e6247e1bfa0c66a sem force;
- Vercel já está configurada em Node 24.x;
- Node 24 é LTS e o runtime 24.x é suportado pela Vercel;
- nenhuma branch remanescente contém commit exclusivo em relação à main.

Bloqueios:

- o conector não oferece exclusão de branch, portanto as referências antigas permanecem apenas como inativas;
- GitHub Actions ainda precisa voltar a alocar runner;
- Vercel continua bloqueando builds por limite do plano Hobby.

Next action:

- corrigir a identidade do package.json e consolidar o package manager após execução real do Quality Gate;
- continuar inventário de mocks, placeholders e legados diretamente na main;
- revalidar home e catálogo quando a Vercel liberar build.

Do not repeat:

- não criar nova branch para esta execução;
- não tentar mesclar feature/contextual-pricing-system: ela possui zero commits exclusivos;
- não alterar Node para 22 enquanto Vercel e o runtime canônico estiverem em Node 24;
- não confundir referências antigas com branches ativas de desenvolvimento.


### Checkpoint 4 — 2026-08-30

HEAD anterior da main: dfd7c5f739b09da130686fe562e8eed0239efc00

Concluído:

- package.json deixou de usar a identidade do template vite_react_shadcn_ts@0.0.0;
- identidade canônica definida como ordax-web@0.1.0;
- package-lock.json atualizado no mesmo commit;
- engines.node fixado em 24.x no manifesto e no lockfile.

Testes/provas:

- package.json e package-lock.json foram parseados como JSON antes da escrita;
- nome, versão e engine foram atualizados tanto no manifesto quanto na entrada raiz do lockfile;
- nenhuma dependência ou resolução do lockfile foi alterada.

Bloqueios:

- npm ci e o restante do Quality Gate ainda dependem da alocação do runner do GitHub Actions.

Next action:

- observar a execução do Quality Gate no novo HEAD;
- se o runner continuar sem steps, avançar com auditorias estáticas que não dependam de instalação;
- consolidar npm como package manager único somente depois de npm ci real.

Do not repeat:

- não restaurar o nome vite_react_shadcn_ts;
- não publicar versão 1.0.0 antes dos critérios de GO;
- não remover package-lock.json;
- não remover lockfiles concorrentes antes da prova de npm ci.


### Checkpoint 5 — 2026-08-30

HEAD anterior da main: a2be72d9d104427b2d7b813187a6ed46064b1e46

Concluído:

- removidas as referências públicas de Open Graph e Twitter para placeholder.svg;
- criado public/og-image.png com identidade preta/dourada do produto;
- adicionados metadados de largura, altura e texto alternativo;
- o asset não depende de catálogo, contadores ou claims de disponibilidade.

Testes/provas:

- imagem validada em 1200x630, formato PNG, 16-bit sRGB;
- inspeção visual confirmou legibilidade, contraste e margens;
- texto do asset: ORDAX, Tonecos Studios e Colecionáveis Artesanais Premium;
- index.html passa a usar URL absoluta https://ordax.com.br/og-image.png.

Bloqueios:

- a URL pública só poderá ser verificada após a Vercel aceitar uma nova build.

Next action:

- validar HTTP 200, content-type image/png e preview social após deploy;
- continuar o inventário de placeholders e mocks que afetam a experiência pública.

Do not repeat:

- não voltar a usar placeholder.svg em metadados públicos;
- não colocar números de catálogo ou versão no asset social;
- não declarar o asset publicado antes de verificar o deploy.
