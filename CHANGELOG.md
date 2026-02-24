# Changelog - Ordax

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.0.0] - 2026-02-24

### 🎉 Release Inicial de Produção

Primeira versão estável da plataforma Ordax, pronta para produção.

### ✨ Funcionalidades Principais

#### Sistema de Catálogo
- Catálogo de colecionáveis com busca e filtros
- Visualização detalhada de personagens
- Sistema de franquias e coleções
- Upload massivo de imagens (até 2000 por vez)
- Classificação automática por IA (OpenAI GPT-4o-mini)

#### Sistema de Autenticação
- Login com email/senha
- Login com Google OAuth
- Gestão de perfis de usuário
- Sistema de permissões (user/admin)
- Perfis públicos de colecionador

#### Sistema de Chat/Suporte
- Chat em tempo real entre cliente e admin
- Sistema de conversas e mensagens
- Upload de anexos (imagens, documentos)
- Notificações em tempo real
- Quick replies (respostas rápidas)
- Templates de status de pedido
- Notas internas para admins
- Tags e flags de risco

#### Sistema de Grupos
- Grupos de comunicação automáticos
- Segmentação de clientes
- Mensagens em lote
- Sincronização automática de membros
- Notificações por email

#### Sistema de Assinaturas
- Planos de assinatura (mensal, semestral)
- Gestão de coleções por assinatura
- Sistema de pré-pedidos
- Acompanhamento de produção
- Limites de produção configuráveis

#### Sistema de Pagamentos
- Múltiplos métodos de pagamento
- Parcelamento configurável (6x, 10x)
- Desconto PIX (5%)
- Links de pagamento manual
- Gestão de pagamentos no admin
- Calculadora de preços
- Análise financeira de coleções

#### Painel Administrativo
- Dashboard com métricas
- Gestão de usuários
- Gestão de orçamentos
- Gestão de coleções
- Gestão de assinaturas
- Gestão de pagamentos
- Gestão de modelos e franquias
- Modo esteira para aprovação rápida
- Analytics e relatórios

#### Área do Cliente
- Dashboard personalizado
- Minhas assinaturas
- Meus pagamentos
- Wishlist
- Sistema de likes
- Badges e níveis
- Suporte via chat

### 🔒 Segurança

- Proteção XSS completa com DOMPurify (42 testes)
- Row Level Security (RLS) em todas as tabelas
- Validação de inputs (frontend e backend)
- Sanitização de mensagens
- Autenticação JWT
- HTTPS obrigatório

### ⚡ Performance

- Otimização de queries (95% redução)
- Tempo de carregamento < 3s
- Code splitting e lazy loading
- Image optimization
- Virtual lists para listas grandes
- Cache inteligente com TanStack Query

### 🛡️ Estabilidade

- Error Boundaries implementados (17 testes)
- Graceful degradation
- Tratamento de erros robusto
- Fallback UI amigável
- 59 testes automatizados (100% passando)
- 0 erros TypeScript

### 📱 Responsividade

- Design responsivo completo
- Mobile-first approach
- Touch-friendly
- Acessibilidade WCAG 2.1 AA

---

## [0.9.0] - 2026-02-23

### 🐛 Correções Críticas

#### Erro 406 Eliminado
- Corrigido `.single()` → `.maybeSingle()` em 13 locais
- Implementado graceful degradation
- Mensagens de erro específicas
- Tratamento de casos vazios

#### Sistema de Grupos Otimizado
- Criada função SQL otimizada `get_user_groups_with_details`
- Redução de 30+ queries para 1-2 queries
- Melhoria de 80% no tempo de carregamento (2-3s → 0.3-0.5s)
- Eliminado problema N+1

### ✨ Melhorias

- Implementados Error Boundaries em componentes críticos
- Adicionada proteção XSS em todos os inputs
- Melhorado sistema de notificações em tempo real
- Otimizado carregamento de imagens

---

## [0.8.0] - 2026-02-22

### ✨ Novas Funcionalidades

#### Sistema de Grupos
- Grupos automáticos por tipo de cliente
- Segmentação inteligente
- Sincronização automática via cron job
- Envio de emails em lote
- Gestão de membros

#### Templates Dinâmicos
- Templates de status de pedido
- Templates de email
- Variáveis dinâmicas
- Personalização por cliente

#### Sistema de Anexos
- Upload de múltiplos arquivos
- Preview de imagens
- Suporte a documentos
- Thumbnails automáticos
- Limpeza de anexos órfãos

### 🔧 Melhorias

- Melhorado sistema de notificações por email
- Adicionado sistema de lembretes
- Implementado soft delete de mensagens
- Melhorado UI do chat cliente

---

## [0.7.0] - 2026-02-21

### ✨ Novas Funcionalidades

#### Sistema de Chat Completo
- Interface admin completa
- Interface cliente (modal flutuante)
- Mensagens em tempo real
- Typing indicators
- Read receipts
- Busca e filtros
- Métricas de atendimento

#### Sistema de Suporte
- Conversas organizadas
- Sidebar com dados do cliente
- Quick replies
- Notas internas
- Tags e prioridades
- Estágios de produção

### 🔧 Melhorias

- Implementado Realtime em todas as tabelas de chat
- Adicionado sistema de notificações
- Melhorado performance de queries
- Implementado cache inteligente

---

## [0.6.0] - 2026-02-15

### ✨ Novas Funcionalidades

#### Sistema de Pagamentos
- Múltiplos métodos de pagamento
- Parcelamento configurável
- Desconto PIX 5%
- Links de pagamento manual
- Calculadora de preços

#### Sistema de Preços Dinâmicos
- Preços configuráveis por coleção
- Análise financeira
- Custos e margens
- Limites de produção

### 🔧 Melhorias

- Removido plano anual
- Atualizada estrutura de preços
- Melhorado sistema de descontos
- Implementado sistema de cupons

---

## [0.5.0] - 2026-02-08

### ✨ Novas Funcionalidades

#### Sistema de Assinaturas
- Planos mensais e semestrais
- Gestão de coleções
- Sistema de pré-pedidos
- Acompanhamento de produção
- Parcelamento em 10x

### 🔧 Melhorias

- Implementado sistema de wishlist
- Adicionado sistema de notificações
- Melhorado sistema de cupons

---

## [0.4.0] - 2026-02-03

### ✨ Novas Funcionalidades

#### Sistema de Coleções
- Coleções dinâmicas
- Gestão de personagens
- Análise financeira
- Cronograma de produção

#### Sistema de Colecionador
- Perfis públicos
- Sistema de badges
- Níveis de colecionador
- Estatísticas

### 🔧 Melhorias

- Adicionado campo release_month
- Implementado sistema de mudanças de coleção
- Melhorado UI de coleções

---

## [0.3.0] - 2026-02-02

### ✨ Novas Funcionalidades

#### Sistema de Orçamentos
- Solicitação de orçamentos
- Carrinho de orçamento
- Gestão admin de orçamentos
- Aprovação/rejeição

#### Sistema de Perfis
- Perfis de usuário
- Dados pessoais
- Preferências
- Histórico

### 🔧 Melhorias

- Implementado sistema de likes
- Adicionado sistema de wishlist
- Melhorado autenticação

---

## [0.2.0] - 2026-02-01

### ✨ Novas Funcionalidades

#### Classificação por IA
- Integração com OpenAI GPT-4o-mini
- Classificação automática de imagens
- Análise de preferências
- Sugestões inteligentes

#### Sistema de Upload
- Upload massivo (até 2000 imagens)
- Fila de processamento
- Modo esteira
- Aprovação rápida

### 🔧 Melhorias

- Implementado pg_trgm para busca
- Melhorado performance de queries
- Adicionado sistema de cache

---

## [0.1.0] - 2026-01-30

### 🎉 Versão Inicial

#### Funcionalidades Básicas
- Catálogo de personagens
- Sistema de autenticação
- Painel administrativo básico
- Gestão de modelos e franquias
- Upload de imagens

#### Infraestrutura
- Setup do Supabase
- Migrations iniciais
- Configuração do Vite
- Setup do Tailwind CSS
- Integração shadcn/ui

---

## Tipos de Mudanças

- `✨ Novas Funcionalidades` - Novas features
- `🔧 Melhorias` - Melhorias em features existentes
- `🐛 Correções` - Bug fixes
- `🔒 Segurança` - Correções de segurança
- `⚡ Performance` - Melhorias de performance
- `📝 Documentação` - Mudanças na documentação
- `🎨 Estilo` - Mudanças de formatação/estilo
- `♻️ Refatoração` - Refatoração de código
- `🧪 Testes` - Adição/correção de testes
- `🔨 Build` - Mudanças no build/CI
- `⬆️ Dependências` - Atualização de dependências
- `🗑️ Remoção` - Remoção de features/código

---

**Formato**: [Versão] - Data  
**Convenção**: Semantic Versioning (MAJOR.MINOR.PATCH)  
**Última atualização**: 2026-02-24
