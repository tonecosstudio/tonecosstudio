# Sistema de Assinaturas de Coleções - Ordax

## 1. Visão Geral

### 1.1 Contexto
A Ordax está expandindo seu modelo de negócio para incluir **assinaturas de coleções bimestrais**, complementando o catálogo sob encomenda da Tonecos Studios.

**Estrutura de Marca:**
- **Ordax** = Marca unificada (Catálogo + Assinaturas)
- **Tonecos Studios** = Estúdio de produção

**Estratégia de Implementação:**
- Fase 1: Criar página `/colecoes` separada para testes
- Fase 2: Após validação, integrar na home definitiva
- Home atual permanece inalterada durante testes

### 1.2 Objetivo
Criar um sistema de assinaturas onde clientes recebem personagens de coleções temáticas a cada 2 meses, com opção de compra avulsa.

---

## 2. Coleções Iniciais

### 2.1 Coleções Disponíveis
1. **Thundercats** (12 personagens)
2. **X-Men** (12 personagens)
3. **Vilões do Homem-Aranha** (12 personagens)

### 2.2 Características das Coleções
- Mínimo: 6 personagens por coleção
- Planejado: 12 personagens por coleção
- Frequência: 1 personagem a cada 2 meses
- Duração total: 24 meses (2 anos) por coleção completa

---

## 3. Modelo de Negócio

### 3.1 Tipos de Compra

#### Assinatura (Modelo Principal)
- Cliente assina uma ou mais coleções
- Recebe 1 personagem a cada 2 meses
- Não escolhe qual personagem (surpresa)
- Personagem revelado apenas no mês seguinte
- Preço fixo por coleção (mais barato)

#### Compra Avulsa
- Cliente compra personagem específico
- Escolhe qual personagem quer
- Preço maior que assinatura
- Disponível após lançamento na assinatura

### 3.2 Preços
- **Por Coleção:** Cada coleção tem seu próprio preço de assinatura
- **Por Personagem:** Todos os personagens de uma coleção têm o mesmo preço avulso
- **Plano Anual:** Desconto para pagamento anual (12 meses de uma vez)
- **Exemplo:**
  - Assinatura Thundercats: R$ 150/bimestre (R$ 900/ano)
  - Plano Anual Thundercats: R$ 810/ano (10% desconto)
  - Personagem avulso Thundercats: R$ 200

### 3.3 Múltiplas Assinaturas
- Cliente pode assinar 1, 2 ou 3 coleções simultaneamente
- Recebe 1 personagem de cada coleção assinada a cada 2 meses
- Exemplo: Assinando 2 coleções = 2 personagens a cada 2 meses

---

## 4. User Stories

### 4.1 Como Visitante

**US-1.1:** Como visitante, quero acessar a página de coleções através do menu
- **Critérios de Aceitação:**
  - Header mantém logo Ordax atual
  - Novo botão "Coleções" no menu de navegação
  - Botão leva para `/colecoes`
  - Home atual (`/`) permanece inalterada (catálogo Tonecos)
  - Página de coleções é independente para testes

**US-1.2:** Como visitante, quero ver as coleções disponíveis na página `/colecoes`
- **Critérios de Aceitação:**
  - Hero destacando "Assinaturas Ordax"
  - Seção com 3 cards das coleções (Thundercats, X-Men, Vilões)
  - Cada card mostra: nome, imagem, descrição, preços (bimestral e anual)
  - Botão "Assinar" em cada card
  - Seção "Como funciona" explicando o modelo de assinatura
  - Design consistente com o resto do site

**US-1.2:** Como visitante, quero entender como funciona a assinatura antes de me cadastrar
- **Critérios de Aceitação:**
  - Seção "Como funciona" com 4 passos visuais
  - Explicação sobre frequência bimestral
  - Explicação sobre personagem surpresa
  - FAQ com dúvidas comuns
  - Comparação assinatura vs compra avulsa

**US-1.3:** Como visitante, quero ver os personagens já lançados de cada coleção
- **Critérios de Aceitação:**
  - Página de detalhes da coleção
  - Grid com personagens já lançados
  - Personagens futuros aparecem como "Em breve"
  - Indicação de qual personagem será o próximo
  - Galeria de fotos de cada personagem

### 4.2 Como Cliente Cadastrado

**US-2.1:** Como cliente, quero assinar uma ou mais coleções
- **Critérios de Aceitação:**
  - Botão "Assinar" em cada coleção
  - Seleção de múltiplas coleções
  - Resumo do pedido (coleções, preço total, próxima entrega)
  - Integração com pagamento recorrente
  - Confirmação de assinatura por email

**US-2.2:** Como cliente, quero gerenciar minhas assinaturas
- **Critérios de Aceitação:**
  - Página "Minhas Assinaturas" no perfil
  - Lista de coleções assinadas
  - Status de cada assinatura (ativa, pausada, cancelada)
  - Próximo personagem a receber (data estimada)
  - Histórico de personagens recebidos
  - Opção de pausar assinatura
  - Opção de cancelar assinatura

**US-2.3:** Como cliente, quero comprar personagens avulsos
- **Critérios de Aceitação:**
  - Catálogo de personagens disponíveis para compra avulsa
  - Filtro por coleção
  - Preço avulso visível
  - Indicação "Disponível apenas para assinantes" (se aplicável)
  - Adicionar ao carrinho
  - Checkout normal (não recorrente)

**US-2.4:** Como cliente, quero acompanhar o status da minha entrega
- **Critérios de Aceitação:**
  - Timeline de produção do personagem
  - Status: Produção → Pintura → Controle de Qualidade → Enviado
  - Código de rastreamento quando enviado
  - Notificações por email em cada etapa
  - Previsão de entrega

**US-2.5:** Como cliente assinante, quero ver qual será meu próximo personagem
- **Critérios de Aceitação:**
  - Revelação do próximo personagem 1 mês antes
  - Notificação por email da revelação
  - Imagem e descrição do personagem
  - Data estimada de envio
  - Opção de "pular" esse personagem (se permitido)

### 4.3 Como Administrador

**US-3.1:** Como admin, quero gerenciar as coleções
- **Critérios de Aceitação:**
  - CRUD de coleções (criar, editar, arquivar)
  - Definir nome, descrição, imagem de capa
  - Definir preço de assinatura
  - Definir preço avulso dos personagens
  - Definir status (ativa, em breve, encerrada)
  - Ordenar personagens da coleção

**US-3.2:** Como admin, quero gerenciar os personagens de cada coleção
- **Critérios de Aceitação:**
  - Adicionar personagens a uma coleção
  - Definir ordem de lançamento
  - Definir data de lançamento
  - Upload de imagens do personagem
  - Marcar como "revelado" ou "em breve"
  - Marcar como disponível para compra avulsa

**US-3.3:** Como admin, quero gerenciar assinaturas dos clientes
- **Critérios de Aceitação:**
  - Lista de todas as assinaturas ativas
  - Filtros: por coleção, por status, por cliente
  - Ver detalhes da assinatura
  - Pausar/reativar assinatura manualmente
  - Cancelar assinatura
  - Ver histórico de pagamentos
  - Ver histórico de envios

**US-3.4:** Como admin, quero processar envios bimestrais
- **Critérios de Aceitação:**
  - Dashboard de "Próximos Envios"
  - Lista de assinantes que receberão personagem no próximo ciclo
  - Agrupar por coleção
  - Marcar como "em produção"
  - Marcar como "enviado" (com código de rastreamento)
  - Gerar relatório de envios

**US-3.5:** Como admin, quero revelar o próximo personagem
- **Critérios de Aceitação:**
  - Selecionar personagem a ser revelado
  - Definir data de revelação
  - Sistema envia email automático para assinantes
  - Personagem aparece na página da coleção
  - Notificação no app/site

---

## 5. Requisitos Funcionais

### 5.1 Arquitetura de Informação

#### Navegação (Fase de Testes)
```
┌─────────────────────────────────────┐
│ Logo Ordax | Catálogo | Coleções 🆕 │
│            |          | Minha Conta │
└─────────────────────────────────────┘
```

- **Catálogo** (`/`) = Home atual (permanece inalterada)
- **Coleções** (`/colecoes`) = Nova página de assinaturas (para testes)
- **Minha Conta** = Perfil, orçamentos, assinaturas

#### Home Atual (`/`) - NÃO MODIFICAR
```
┌─────────────────────────────────────┐
│ HERO: Catálogo Ordax                │
│ [Mantém layout atual]               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ CATÁLOGO DE PRODUTOS                │
│ [Grid atual de modelos]             │
└─────────────────────────────────────┘
```

#### Nova Página `/colecoes` (CRIAR)
```
┌─────────────────────────────────────┐
│ HERO: Assinaturas Ordax             │
│ "Receba colecionáveis exclusivos    │
│  a cada 2 meses"                    │
│ [CTA: Ver Coleções]                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ COLEÇÕES DISPONÍVEIS                │
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │Thunder│ │X-Men │ │Vilões│         │
│ │ cats │ │      │ │ H.A. │         │
│ │R$150 │ │R$150 │ │R$150 │         │
│ │R$810 │ │R$810 │ │R$810 │         │
│ └──────┘ └──────┘ └──────┘         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ COMO FUNCIONA                       │
│ 1. Escolha → 2. Assine → 3. Receba │
└─────────────────────────────────────┘
```

### 5.2 Banco de Dados

#### Novas Tabelas

**collections**
- id (uuid)
- name (text) - "Thundercats", "X-Men", etc.
- slug (text) - "thundercats", "x-men"
- description (text)
- cover_image_url (text)
- subscription_price (numeric) - Preço bimestral
- standalone_price (numeric) - Preço avulso por personagem
- status (enum) - 'active', 'coming_soon', 'ended'
- total_characters (int) - Total planejado
- release_frequency_months (int) - 2 (bimestral)
- created_at (timestamp)
- updated_at (timestamp)

**collection_characters**
- id (uuid)
- collection_id (uuid) → collections
- name (text) - Nome do personagem
- description (text)
- image_urls (text[]) - Array de URLs
- release_order (int) - Ordem de lançamento (1, 2, 3...)
- release_date (date) - Data de lançamento
- reveal_date (date) - Data de revelação (1 mês antes)
- status (enum) - 'upcoming', 'revealed', 'released'
- available_standalone (boolean) - Disponível para compra avulsa
- created_at (timestamp)
- updated_at (timestamp)

**subscriptions**
- id (uuid)
- user_id (uuid) → profiles
- collection_id (uuid) → collections
- status (enum) - 'active', 'paused', 'cancelled'
- start_date (date)
- next_delivery_date (date)
- last_delivery_date (date)
- payment_method_id (text) - ID do método de pagamento
- created_at (timestamp)
- updated_at (timestamp)
- cancelled_at (timestamp)

**subscription_deliveries**
- id (uuid)
- subscription_id (uuid) → subscriptions
- character_id (uuid) → collection_characters
- status (enum) - 'pending', 'in_production', 'shipped', 'delivered'
- production_stage (text) - "Impressão", "Pintura", etc.
- tracking_code (text)
- estimated_delivery_date (date)
- actual_delivery_date (date)
- created_at (timestamp)
- updated_at (timestamp)

**standalone_orders**
- id (uuid)
- user_id (uuid) → profiles
- character_id (uuid) → collection_characters
- price (numeric)
- status (enum) - 'pending', 'paid', 'in_production', 'shipped', 'delivered'
- payment_id (text)
- tracking_code (text)
- created_at (timestamp)
- updated_at (timestamp)

### 5.3 Regras de Negócio

**RN-1:** Cliente pode assinar múltiplas coleções simultaneamente
**RN-2:** Personagem só é revelado 1 mês antes do envio
**RN-3:** Compra avulsa só disponível após personagem ser lançado na assinatura
**RN-4:** Preço avulso é maior que preço de assinatura
**RN-5:** Assinatura pode ser pausada por até 6 meses
**RN-6:** Cancelamento de assinatura não gera reembolso do período atual
**RN-7:** Envios são processados a cada 2 meses
**RN-8:** Cliente não escolhe qual personagem recebe (surpresa)
**RN-9:** Todos os personagens de uma coleção têm o mesmo preço avulso
**RN-10:** Coleção encerra quando todos os 12 personagens forem lançados
**RN-11:** Plano anual oferece 10% de desconto sobre o valor bimestral
**RN-12:** Embalagem dos personagens é em MDF (material premium)

---

## 6. Requisitos Não-Funcionais

### 6.1 Performance
- Página de coleções deve carregar em < 2s
- Imagens otimizadas (WebP, lazy loading)
- Cache de dados de coleções

### 6.2 Segurança
- Pagamentos via gateway seguro (Stripe/Mercado Pago)
- Dados de cartão não armazenados no banco
- Autenticação obrigatória para assinaturas

### 6.3 Escalabilidade
- Suportar até 1000 assinantes por coleção
- Processamento de envios em batch
- Notificações em fila (email/push)

### 6.4 Usabilidade
- Design responsivo (mobile-first)
- Navegação clara entre Ordax e Tonecos
- Onboarding para novos assinantes

---

## 7. Integrações

### 7.1 Pagamento Recorrente
- **Gateway:** Stripe Subscriptions
- Webhook para renovação automática
- Gestão de falhas de pagamento
- Suporte a plano bimestral e anual
- Desconto automático para plano anual (10%)

### 7.2 Notificações
- Email: Revelação de personagem, envio, entrega
- Push (futuro): Notificações no app

### 7.3 Logística
- Integração com Correios/transportadora
- Geração de etiquetas
- Rastreamento automático

---

## 8. Fases de Implementação

### Fase 1: MVP - Página de Testes (`/colecoes`)
- [ ] Adicionar botão "Coleções" no header
- [ ] Criar rota `/colecoes`
- [ ] Criar página `Collections.tsx`
- [ ] Hero section com CTA
- [ ] Grid de 3 coleções (dados mockados)
- [ ] Seção "Como funciona"
- [ ] Design consistente com site atual

### Fase 2: Banco de Dados e Admin
- [ ] Estrutura de banco de dados (migrations)
- [ ] CRUD de coleções (admin)
- [ ] CRUD de personagens (admin)
- [ ] Integração com dados reais

### Fase 3: Sistema de Assinatura
- [ ] Página de detalhes da coleção
- [ ] Integração com Stripe Subscriptions
- [ ] Fluxo de assinatura completo
- [ ] Página "Minhas Assinaturas"

### Fase 4: Compra Avulsa e Entregas
- [ ] Catálogo de personagens avulsos
- [ ] Sistema de revelação de personagens
- [ ] Timeline de produção
- [ ] Notificações por email

### Fase 5: Integração Definitiva na Home
- [ ] Validar testes da página `/colecoes`
- [ ] Adicionar seção de coleções na home
- [ ] Banner/CTA para coleções
- [ ] Manter página `/colecoes` como alternativa

---

## 9. Métricas de Sucesso

- **Taxa de conversão:** Visitantes → Assinantes (meta: 5%)
- **Retenção:** Assinantes ativos após 6 meses (meta: 70%)
- **Churn:** Taxa de cancelamento mensal (meta: < 5%)
- **LTV:** Lifetime Value por assinante (meta: R$ 1800 - 12 personagens)
- **Compras avulsa:** % de assinantes que compram avulso (meta: 20%)

---

## 10. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Falha de pagamento recorrente | Alto | Retry automático + notificação |
| Atraso na produção | Médio | Buffer de 2 semanas + comunicação |
| Baixa adesão inicial | Alto | Marketing + período promocional |
| Complexidade logística | Médio | Parceria com fulfillment |
| Cancelamentos em massa | Alto | Pesquisa de satisfação + melhorias |

---

## 11. Decisões Confirmadas

1. ✅ **Gateway de pagamento:** Stripe
2. ✅ **Plano anual:** Sim, com 10% de desconto
3. ✅ **Embalagem:** MDF (material premium)
4. ✅ **Foco da home:** Catálogo Tonecos (principal) + Banner Ordax (secundário)

## 12. Perguntas em Aberto

1. Permitir "pular" um personagem? (se cliente não gostar)
2. Permitir troca de coleção após assinatura?
3. Criar programa de indicação (indique um amigo)?
4. Permitir personalização (pintura customizada)?
5. Design da embalagem MDF (logo, cores, acabamento)?

---

## 13. Próximos Passos

1. ✅ Validar requisitos atualizados
2. Criar design/wireframes da página `/colecoes`
3. Implementar Fase 1 (página de testes com dados mockados)
4. Testar e validar com usuários
5. Configurar Stripe Subscriptions
6. Criar migrations do banco de dados
7. Implementar funcionalidades completas
8. Integrar definitivamente na home (Fase 5)
