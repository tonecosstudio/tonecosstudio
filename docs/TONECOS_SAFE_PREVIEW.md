# Tonecos Studio — preview privado, somente leitura

O catálogo de modelos é propriedade do Cloudflare Worker (D1/R2); nenhuma réplica comercial no Supabase.

## Causa raiz
O bundle Vite publicado no preview anterior continha uma exceção no carregamento dos módulos, porque VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY existiam apenas em produção. Assim, READY não significava que o React inicializava.

## Política canônica
Para homologação visual limitada, a branch canônica de preview pode usar somente a URL e a chave pública anon já usadas no site comercial, verificadas contra o ref do JWT. Nunca copiar service_role ou chaves secretas. O preview continua protegido por Vercel Authentication.
VITE_PREVIEW_READ_ONLY=true é obrigatório junto dessas variáveis e VITE_UPLOAD_SECURITY_FAIL_CLOSED=true. Em modo preview-read-only, a única instância Supabase desativa persistência de sessão, auto-refresh e callback de login, e aceita somente GET/HEAD em tabelas PostgREST e objetos públicos na origem configurada. Todos os outros métodos, RPC, auth, Functions, storage upload e outros hosts retornam 403 sem rede.

Esse bloqueio no navegador é defesa em profundidade, não substitui RLS, políticas de banco ou autenticação do servidor. As páginas podem ler dados explicitamente públicos da produção; não executar testes de autenticação, pagamento, pedido ou upload nesse preview. É necessário Supabase staging isolado para homologar operações comerciais.

## Contratos
Sem envs Supabase, o aplicativo comercial falha fechado. Os envs do preview são exclusivos da branch de integração. A produção não recebe alterações. A variável VITE_SUPABASE_PROJECT_ID deve coincidir com o subdomínio da URL; em 02/11/2026 a produção apresentava divergência e exige revisão antes de lançamento.
Os gates continuam TypeScript, lint, auditorias, Vitest, cobertura >=70%, Vite build e npm audit.
