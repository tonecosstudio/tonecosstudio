# ORDAX - Explicação Técnica para IA

## 🎯 O QUE É O PROJETO

**Nome da Marca:** ORDAX
**Estúdio de Produção:** Tonecos Studios
**Tipo:** Plataforma SaaS B2C de E-commerce + Gestão de Assinaturas de Colecionáveis
**Modelo de Negócio:** Clube de assinatura de colecionáveis físicos artesanais personalizados
**Status:** 85% completo, pronto para lançamento após configuração de credenciais

---

## 💼 ENTENDENDO A MARCA

### ORDAX (A Plataforma)
- **O que é:** Plataforma digital de colecionáveis premium
- **Função:** Sistema de pedidos, catálogo, assinaturas e acompanhamento
- **Público:** Colecionadores e fãs de cultura pop/geek
- **Diferencial:** Transparência total com fotos de cada etapa de produção

### Tonecos Studios (O Produtor)
- **O que é:** Estúdio criativo especializado em colecionáveis artesanais
- **Função:** Produção física das peças (impressão 3D, pintura, acabamento)
- **Expertise:** Estatuetas, figuras de ação, bustos, dioramas
- **Qualidade:** Produção artesanal com inspeção rigorosa

### Relação entre ORDAX e Tonecos Studios
```
ORDAX (Plataforma)          Tonecos Studios (Produção)
      ↓                              ↓
Cliente faz pedido    →    Estúdio produz a peça
Cliente acompanha     ←    Fotos de cada etapa
Cliente recebe        ←    Envio com embalagem premium
```

---

## 🏗️ ARQUITETURA TÉCNICA

### Stack Tecnológica
```
Frontend:
- React 18 + TypeScript (strict mode)
- Vite (build tool)
- Tailwind CSS + shadcn/ui + Radix UI
- React Router v6
- TanStack Query (React Query)
- Framer Motion (animações)
- Zod (validação)

Backend:
- Supabase (BaaS)
  - PostgreSQL (banco de dados)
  - Edge Functions (serverless)
  - Auth (autenticação)
  - Storage (arquivos)
  - Row Level Security (RLS)

Integrações:
- Stripe (pagamentos e assinaturas)
- Google OAuth (autenticação social)

Infraestrutura:
- Vercel (deploy frontend)
- Supabase Cloud (backend)
- Winston Logger (logs estruturados)

Qualidade:
- ESLint + Prettier
- Vitest + Testing Library
- Husky (git hooks)
- TypeScript strict mode
```

---

## 🎨 IDENTIDADE VISUAL E CONCEITO

### Tema: Arcade/Gaming Retro-Futurista
- **Estética:** Anos 80/90 arcade + elementos cyberpunk
- **Tipografia:** 
  - Títulos: "Bebas Neue" (impacto, maiúsculas)
  - Detalhes: "Press Start 2P" (pixel art, retro)
  - Corpo: Monospace (tech, código)
- **Cores:**
  - Primária: Gold Accent (dourado/amarelo) - `hsl(var(--gold-accent))`
  - Background: Tons escuros de cinza/preto
  - Acentos: Roxo/magenta para elementos secundários
- **Elementos:**
  - Bordas angulares (sem arredondamento)
  - Efeitos de glitch
  - Partículas flutuantes
  - Animações de scan/loading
  - Terminologia militar/gaming ("Mission", "Squad", "Arsenal")

### Linguagem da Marca
- **Tom:** Confiante, direto, gaming-friendly
- **Vocabulário:** 
  - "Mission" (missão/objetivo)
  - "Squad" (time/grupo)
  - "Arsenal" (catálogo/coleção)
  - "Insert Coin" (começar/pagar)
  - "Ready Player?" (pronto para começar?)
  - "Mission Complete" (pedido entregue)
- **Estilo:** Comandos de terminal, códigos, briefings militares

---

## 💼 MODELO DE NEGÓCIO DETALHADO

### Conceito Principal
**"Netflix de Colecionáveis Físicos"**

Cliente assina uma coleção (ex: Mortal Kombat, Street Fighter) e:
1. Recebe créditos mensais
2. Escolhe qual personagem quer naquele mês
3. Acompanha a produção com fotos em tempo real
4. Recebe a peça em casa
5. Constrói sua coleção ao longo do tempo

### Diferencial Competitivo
- ✅ **Transparência Total:** 12 estágios de produção com fotos
- ✅ **Escolha do Cliente:** Não é surpresa, você escolhe o personagem
- ✅ **Produção Sob Demanda:** Não há estoque parado
- ✅ **Qualidade Artesanal:** Pintura à mão, acabamento profissional
- ✅ **Plataforma Organizada:** Sistema completo de gestão

### Fluxos de Receita

#### 1. Assinaturas Recorrentes (Principal - 70% da receita)
```
Plano Mensal: R$ 150-300/mês
- 1 personagem por mês
- Créditos para escolher
- Acompanhamento completo
- Embalagem premium
```

#### 2. Compras Avulsas (Secundário - 20% da receita)
```
Compra Individual: R$ 200-500/peça
- Sem compromisso mensal
- Escolha qualquer personagem disponível
- Mesmo processo de produção
```

#### 3. Sistema de Créditos/Coins (Complementar - 10% da receita)
```
Pacotes de Coins: R$ 50-500
- Moeda virtual interna
- Compra de personagens premium
- Upgrades de pintura/tamanho
- Acessórios extras
```

---

## 🎯 PROPOSTA DE VALOR

### Para o Cliente
**Problema que resolve:**
- ❌ Colecionáveis importados são caros e demorados
- ❌ Qualidade inconsistente de produtos nacionais
- ❌ Falta de transparência no processo de produção
- ❌ Dificuldade de encontrar personagens específicos

**Solução ORDAX:**
- ✅ Produção nacional com qualidade premium
- ✅ Preço acessível via assinatura
- ✅ Transparência total com fotos de cada etapa
- ✅ Você escolhe exatamente o que quer

### Benefícios Principais
1. **Controle Total:** Você escolhe o personagem, não é surpresa
2. **Transparência:** Veja sua peça sendo feita em tempo real
3. **Qualidade Garantida:** Inspeção rigorosa antes do envio
4. **Comunidade:** Grupos de colecionadores, troca de experiências
5. **Flexibilidade:** Pause, cancele ou mude de coleção quando quiser

---

## 🔄 JORNADA DO CLIENTE

### 1. Descoberta
```
Landing Page → Catálogo → Coleções
```
- Cliente conhece ORDAX
- Explora coleções disponíveis
- Vê exemplos de peças produzidas

### 2. Decisão
```
Escolhe Coleção → Seleciona Plano → Cadastro
```
- Escolhe coleção de interesse (ex: Mortal Kombat)
- Seleciona plano (mensal/anual)
- Cria conta (email ou Google)

### 3. Pagamento
```
Checkout → Stripe → Confirmação
```
- Pagamento via cartão (Stripe)
- Recebe confirmação por email
- Créditos são creditados

### 4. Escolha
```
Dashboard → Escolher Personagem → Confirmar
```
- Acessa painel de assinante
- Vê personagens disponíveis da coleção
- Escolhe qual quer receber neste ciclo

### 5. Produção
```
Fila → 12 Estágios → Fotos em Tempo Real
```
- Pedido entra na fila de produção
- Cliente recebe notificações de cada etapa
- Pode ver fotos da sua peça sendo feita

### 6. Entrega
```
Envio → Rastreamento → Recebimento
```
- Peça é embalada com proteção premium
- Cliente recebe código de rastreamento
- Acompanha até a entrega

### 7. Renovação
```
Próximo Ciclo → Nova Escolha → Continua Colecionando
```
- Assinatura renova automaticamente
- Cliente escolhe próximo personagem
- Ciclo se repete

---

## 🎮 COLEÇÕES E PERSONAGENS

### Estrutura de Coleção
```
Coleção: Mortal Kombat
├── 30 personagens disponíveis
├── Preço: R$ 250/mês
├── Escala: 1/10 (aprox. 20cm)
├── Material: Resina premium
└── Pintura: Artística profissional
```

### Tipos de Coleção
1. **Jogos de Luta:** Mortal Kombat, Street Fighter, Tekken
2. **Anime/Mangá:** Dragon Ball, Naruto, One Piece
3. **Filmes/Séries:** Marvel, DC, Star Wars
4. **Games:** The Last of Us, God of War, Resident Evil

### Personalização
- Escolha de pose (quando disponível)
- Tamanho/escala (padrão ou custom)
- Tipo de base (simples ou diorama)
- Nível de pintura (standard ou premium)

---

## 👥 TIPOS DE USUÁRIO

### Cliente (Customer)
**Funcionalidades:**
- ✅ Navegar catálogo e coleções
- ✅ Assinar coleções
- ✅ Comprar peças avulsas
- ✅ Escolher personagens a cada ciclo
- ✅ Acompanhar produção em tempo real
- ✅ Gerenciar perfil e pagamentos
- ✅ Participar de grupos de colecionadores
- ✅ Criar wishlist
- ✅ Comprar coins/créditos
- ✅ Ver histórico de pedidos

### Administrador (Admin)
**Funcionalidades:**
- ✅ Gerenciar coleções e personagens
- ✅ Controlar fila de produção
- ✅ Atualizar status de pedidos
- ✅ Fazer upload de fotos de progresso
- ✅ Monitorar assinaturas e pagamentos
- ✅ Analisar métricas e analytics
- ✅ Gerenciar usuários e suporte
- ✅ Configurar sistema
- ✅ Enviar notificações
- ✅ Visualizar auditoria completa

---

## 📊 12 ESTÁGIOS DE PRODUÇÃO

### Transparência Total
Cada pedido passa por 12 estágios com fotos:

1. **Pedido Recebido** - Confirmação inicial
2. **Na Fila** - Aguardando início da produção
3. **Modelagem 3D** - Design digital sendo preparado
4. **Impressão 3D** - Peça sendo impressa em resina
5. **Pós-Impressão** - Remoção de suportes
6. **Lixamento** - Acabamento inicial
7. **Primer** - Preparação para pintura
8. **Pintura Base** - Primeira camada de cor
9. **Detalhamento** - Pintura artística detalhada
10. **Verniz** - Proteção final
11. **Inspeção** - Controle de qualidade
12. **Embalagem** - Preparação para envio

**Diferencial:** Cliente vê fotos da SUA peça em cada etapa, não fotos genéricas.

---

## 🎨 FEATURES PRINCIPAIS

### Para Clientes
- 🎮 **Catálogo Interativo** - Navegação estilo arcade
- 🎯 **Sistema de Escolha** - Escolha seu personagem a cada ciclo
- 💳 **Pagamentos Stripe** - Seguro e confiável
- 📦 **Tracking em Tempo Real** - 12 estágios com fotos
- 👤 **Perfil Personalizável** - Mostre sua coleção
- 🔔 **Notificações** - Atualizações de status
- 👥 **Grupos** - Comunidade de colecionadores
- ⭐ **Wishlist** - Salve personagens favoritos
- 🪙 **Sistema de Coins** - Moeda virtual interna
- 📊 **Dashboard** - Visão geral das assinaturas

### Para Admins
- 📊 **Dashboard Executivo** - Métricas em tempo real
- 👥 **Gestão de Usuários** - Controle completo
- 🎨 **Gestão de Catálogo** - Coleções e personagens
- 🏭 **Fila de Produção** - Visual e organizada
- 📸 **Upload de Fotos** - Progresso de cada pedido
- 💰 **Hub Financeiro** - Pagamentos e receita
- 📈 **Analytics** - Insights de negócio
- 🔧 **Configurações** - Sistema completo
- 💬 **Comunicação** - Central de suporte
- 📋 **Auditoria** - Histórico completo de ações

---

## 💡 CONTEXTO HISTÓRICO

### O Problema Original
Tonecos Studios tinha:
- ❌ Pedidos antigos não concluídos
- ❌ Falta de organização
- ❌ Comunicação fragmentada
- ❌ Sem sistema de acompanhamento
- ❌ Processos manuais

### A Solução: ORDAX
Plataforma criada para:
- ✅ Organizar todos os pedidos
- ✅ Dar transparência total
- ✅ Automatizar processos
- ✅ Melhorar comunicação
- ✅ Profissionalizar operação
- ✅ Permitir crescimento escalável

### Migração de Pedidos Antigos
Sistema inclui funcionalidade para:
- Migrar pedidos antigos para a plataforma
- Dar visibilidade aos clientes antigos
- Regularizar situação pendente
- Manter histórico completo

---

## 🚀 ESTADO ATUAL DO PROJETO

### Completo (85%)
- ✅ Todas as funcionalidades principais
- ✅ UI/UX completa com tema arcade
- ✅ Integrações funcionando
- ✅ Segurança básica implementada
- ✅ Performance otimizada
- ✅ Documentação completa
- ✅ Build sem erros
- ✅ Logger profissional
- ✅ SSOT estabelecido
- ✅ Zero TODOs críticos

### Pendente (15%)
- ⏳ Configuração de credenciais pelo cliente:
  - Google OAuth (login social)
  - Stripe (pagamentos)
- ⏳ Testes finais de integração
- ⏳ Deploy em produção

### Tempo para 100%
- Cliente: 50 minutos (configurar credenciais)
- Dev: 1-2 horas (testes finais)
- **Total: 2-3 horas**

---

## 📝 VARIÁVEIS DE AMBIENTE

### Configuradas
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

### Pendentes (Cliente)
```env
# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## 🎯 PRÓXIMOS PASSOS

### Imediato (Cliente - ~50 minutos)
1. Seguir `GUIA_CONFIGURACAO_CREDENCIAIS.md`
2. Criar projeto Google Cloud
3. Configurar OAuth 2.0
4. Criar conta Stripe
5. Obter chaves API
6. Configurar webhooks
7. Adicionar credenciais ao `.env.local`
8. Testar login e pagamento

### Após Configuração (Dev - 1-2 horas)
1. Validar integrações
2. Testes em staging
3. Ajustes finais
4. Deploy em produção
5. Monitoramento inicial

### Futuro (Melhorias)
1. App mobile (React Native)
2. Marketplace entre colecionadores
3. Sistema de troca/venda
4. Programa de fidelidade
5. AR para visualizar peças
6. Integração com redes sociais

---

**Versão:** 0.0.0
**Última Atualização:** 19 de Maio de 2026
**Status:** ✅ 85% Completo - Pronto para Lançamento
# ORDAX - Explicação Técnica para IA

## 🎯 O QUE É O PROJETO

**Nome da Marca:** ORDAX
**Estúdio de Produção:** Tonecos Studios
**Tipo:** Plataforma SaaS B2C de E-commerce + Gestão de Assinaturas de Colecionáveis
**Modelo de Negócio:** Clube de assinatura de colecionáveis físicos artesanais personalizados
**Status:** 85% completo, pronto para lançamento após configuração de credenciais

---

## 💼 ENTENDENDO A MARCA

### ORDAX (A Plataforma)
- **O que é:** Plataforma digital de colecionáveis premium
- **Função:** Sistema de pedidos, catálogo, assinaturas e acompanhamento
- **Público:** Colecionadores e fãs de cultura pop/geek
- **Diferencial:** Transparência total com fotos de cada etapa de produção

### Tonecos Studios (O Produtor)
- **O que é:** Estúdio criativo especializado em colecionáveis artesanais
- **Função:** Produção física das peças (impressão 3D, pintura, acabamento)
- **Expertise:** Estatuetas, figuras de ação, bustos, dioramas
- **Qualidade:** Produção artesanal com inspeção rigorosa

### Relação entre ORDAX e Tonecos Studios
```
ORDAX (Plataforma)          Tonecos Studios (Produção)
      ↓                              ↓
Cliente faz pedido    →    Estúdio produz a peça
Cliente acompanha     ←    Fotos de cada etapa
Cliente recebe        ←    Envio com embalagem premium
```

---

## 🎨 IDENTIDADE VISUAL E CONCEITO

### Tema: Arcade/Gaming Retro-Futurista
- **Estética:** Anos 80/90 arcade + elementos cyberpunk
- **Tipografia:** 
  - Títulos: "Bebas Neue" (impacto, maiúsculas)
  - Detalhes: "Press Start 2P" (pixel art, retro)
  - Corpo: Monospace (tech, código)
- **Cores:**
  - Primária: Gold Accent (dourado/amarelo)
  - Background: Tons escuros de cinza/preto
  - Acentos: Roxo/magenta para elementos secundários
- **Elementos:**
  - Bordas angulares (sem arredondamento)
  - Efeitos de glitch
  - Partículas flutuantes
  - Animações de scan/loading
  - Terminologia militar/gaming

### Linguagem da Marca
- **Tom:** Confiante, direto, gaming-friendly
- **Vocabulário:** "Mission", "Squad", "Arsenal", "Insert Coin", "Ready Player?"

---

## 💼 MODELO DE NEGÓCIO

### Conceito: "Netflix de Colecionáveis Físicos"
Cliente assina uma coleção e escolhe qual personagem quer a cada mês.

### Diferencial Competitivo
- ✅ Transparência Total: 12 estágios com fotos
- ✅ Escolha do Cliente: Você escolhe o personagem
- ✅ Produção Sob Demanda
- ✅ Qualidade Artesanal
- ✅ Plataforma Organizada

### Fluxos de Receita
1. **Assinaturas Recorrentes** (70%) - R$ 150-300/mês
2. **Compras Avulsas** (20%) - R$ 200-500/peça
3. **Sistema de Créditos/Coins** (10%) - R$ 50-500

---

**Versão:** 0.0.0
**Status:** ✅ 85% Completo
