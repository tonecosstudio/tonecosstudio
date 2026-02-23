# 📦 Sistema de Assinaturas - Resumo Visual

## 🎯 Conceito (ATUALIZADO)

**Ordax** = Marca unificada (Catálogo + Assinaturas)  
**Tonecos Studios** = Estúdio de produção

**Estratégia:**
- ✅ Home atual permanece inalterada (`/`)
- ✅ Nova página `/colecoes` para testes
- ✅ Botão "Coleções" no header
- ✅ Após validação, integrar na home definitiva

---

## 🏠 Estrutura de Páginas (ATUALIZADA)

### Home Atual (`/`) - NÃO MODIFICAR
```
┌─────────────────────────────────────────────────────┐
│                    HEADER                           │
│  [Logo Ordax] | Catálogo | Coleções 🆕 | Login     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              HERO SECTION (ATUAL)                   │
│  [Mantém layout atual do catálogo]                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│           CATÁLOGO (MANTÉM ATUAL)                   │
│  [Grid de produtos sob encomenda]                  │
│  [Filtros, busca, etc.]                            │
└─────────────────────────────────────────────────────┘
```

### Nova Página `/colecoes` - CRIAR PARA TESTES
```
┌─────────────────────────────────────────────────────┐
│                    HEADER                           │
│  [Logo Ordax] | Catálogo | Coleções 🆕 | Login     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              HERO: ASSINATURAS ORDAX                │
│                                                     │
│     🎁 COLEÇÕES EXCLUSIVAS                         │
│     Receba colecionáveis premium                   │
│     a cada 2 meses                                 │
│                                                     │
│     [Ver Coleções Abaixo]                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              COLEÇÕES DISPONÍVEIS                   │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ 🐱       │  │ ⚡       │  │ 🕷️       │        │
│  │Thunder-  │  │ X-Men    │  │ Vilões   │        │
│  │ cats     │  │          │  │ H.Aranha │        │
│  │          │  │          │  │          │        │
│  │12 person.│  │12 person.│  │12 person.│        │
│  │R$150/2m  │  │R$150/2m  │  │R$150/2m  │        │
│  │R$810/ano │  │R$810/ano │  │R$810/ano │        │
│  │(10% off) │  │(10% off) │  │(10% off) │        │
│  │          │  │          │  │          │        │
│  │[Assinar] │  │[Assinar] │  │[Assinar] │        │
│  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│            COMO FUNCIONA A ASSINATURA               │
│                                                     │
│  1️⃣ Escolha      2️⃣ Assine      3️⃣ Receba         │
│  Sua coleção    Bimestralmente  Surpresa!         │
│                                                     │
│  • 1 personagem a cada 2 meses                     │
│  • Você não escolhe (é surpresa!)                  │
│  • Revelação 1 mês antes do envio                  │
│  • Pode assinar múltiplas coleções                 │
│  • Plano anual com 10% de desconto                 │
│  • Embalagem premium em MDF                        │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Modelo de Negócio

### Assinatura Bimestral
```
┌─────────────────────────────┐
│ ASSINATURA THUNDERCATS      │
│                             │
│ R$ 150 a cada 2 meses       │
│ = R$ 75/mês                 │
│                             │
│ ✅ Personagem surpresa      │
│ ✅ Preço mais baixo         │
│ ✅ Revelação antecipada     │
│ ✅ Prioridade na produção   │
│ ✅ Embalagem MDF premium    │
└─────────────────────────────┘
```

### Assinatura Anual (10% desconto)
```
┌─────────────────────────────┐
│ PLANO ANUAL THUNDERCATS     │
│                             │
│ R$ 810/ano (6 personagens)  │
│ ao invés de R$ 900          │
│                             │
│ ✅ Economia de R$ 90        │
│ ✅ Todos os benefícios      │
│ ✅ Pagamento único          │
└─────────────────────────────┘
```

### Compra Avulsa
```
┌─────────────────────────────┐
│ PERSONAGEM AVULSO           │
│                             │
│ R$ 200 por personagem       │
│                             │
│ ✅ Escolhe qual quer        │
│ ❌ Preço mais alto          │
│ ⏰ Disponível após lançamento│
│ ✅ Embalagem MDF premium    │
└─────────────────────────────┘
```

---

## 🗓️ Timeline de Entrega

```
Mês 1-2: Produção Personagem #1
         ↓
         Revelação (1 mês antes)
         ↓
         Envio
         ↓
Mês 3-4: Produção Personagem #2
         ↓
         Revelação
         ↓
         Envio
         ↓
Mês 5-6: Produção Personagem #3
         ...
```

**Duração total:** 24 meses (2 anos) para coleção completa

---

## 👤 Jornada do Cliente

### 1. Descoberta
```
Home → Ver Coleções → Detalhes da Coleção
```

### 2. Assinatura
```
Escolher Coleção(ões) → Cadastro/Login → Pagamento → Confirmação
```

### 3. Acompanhamento
```
Minha Conta → Minhas Assinaturas → Ver Status
                                  → Próximo Personagem
                                  → Histórico
```

### 4. Recebimento
```
Email: "Seu personagem está a caminho!"
  ↓
Rastreamento
  ↓
Entrega
  ↓
Email: "Avalie seu personagem"
```

---

## 🎨 Página de Detalhes da Coleção

```
┌─────────────────────────────────────────────────────┐
│  [← Voltar]              THUNDERCATS                │
│                                                     │
│  [Imagem de Capa Grande]                           │
│                                                     │
│  12 personagens icônicos dos Thundercats           │
│  Receba 1 a cada 2 meses                           │
│                                                     │
│  R$ 150/bimestre  [Assinar Agora]                  │
│  ou R$ 200 avulso                                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              PERSONAGENS DA COLEÇÃO                 │
│                                                     │
│  ✅ Lançados:                                       │
│  ┌────┐ ┌────┐ ┌────┐                             │
│  │ #1 │ │ #2 │ │ #3 │                             │
│  │Lion│ │Chee│ │Panth│                             │
│  └────┘ └────┘ └────┘                             │
│                                                     │
│  🔮 Próximo (Revelação em 15 dias):                │
│  ┌────┐                                            │
│  │ ?? │ Tygra                                      │
│  └────┘                                            │
│                                                     │
│  ⏳ Em breve:                                       │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                      │
│  │ ?? │ │ ?? │ │ ?? │ │ ?? │                      │
│  └────┘ └────┘ └────┘ └────┘                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Área Admin

### Dashboard de Coleções
```
┌─────────────────────────────────────────────────────┐
│  GERENCIAR COLEÇÕES                                 │
│                                                     │
│  Thundercats     [Editar] [Ver Personagens]        │
│  ├─ 3/12 lançados                                  │
│  ├─ 150 assinantes                                 │
│  └─ Próximo envio: 15/03/2026                      │
│                                                     │
│  X-Men           [Editar] [Ver Personagens]        │
│  ├─ 2/12 lançados                                  │
│  ├─ 120 assinantes                                 │
│  └─ Próximo envio: 20/03/2026                      │
│                                                     │
│  [+ Nova Coleção]                                  │
└─────────────────────────────────────────────────────┘
```

### Próximos Envios
```
┌─────────────────────────────────────────────────────┐
│  PRÓXIMOS ENVIOS - Março 2026                       │
│                                                     │
│  Thundercats - Personagem #4 (Tygra)               │
│  ├─ 150 assinantes                                 │
│  ├─ Status: Em produção                            │
│  └─ [Marcar como Enviado]                          │
│                                                     │
│  X-Men - Personagem #3 (Wolverine)                 │
│  ├─ 120 assinantes                                 │
│  ├─ Status: Aguardando produção                    │
│  └─ [Iniciar Produção]                             │
└─────────────────────────────────────────────────────┘
```

---

## 💳 Fluxo de Pagamento

### Assinatura
```
1. Cliente escolhe coleção(ões)
2. Cadastra cartão de crédito
3. Primeiro pagamento imediato
4. Pagamentos automáticos a cada 2 meses
5. Notificação antes de cada cobrança
```

### Compra Avulsa
```
1. Cliente escolhe personagem
2. Adiciona ao carrinho
3. Checkout normal (pagamento único)
4. Produção sob demanda
```

---

## 📱 Navegação do Site (ATUALIZADA)

```
ORDAX (Marca Unificada)
├── Home (/) - Catálogo Tonecos [MANTÉM ATUAL]
│   └── Grid de produtos sob encomenda
├── Coleções (/colecoes) - Assinaturas [NOVA PÁGINA]
│   ├── Hero Assinaturas
│   ├── Grid de 3 Coleções
│   │   ├── Thundercats
│   │   ├── X-Men
│   │   └── Vilões do Homem-Aranha
│   └── Como Funciona
├── Sobre (/sobre)
└── Minha Conta (/perfil)
    ├── Meus Orçamentos (Tonecos)
    ├── Minhas Assinaturas (Ordax) [FUTURO]
    └── Perfil
```

### Rotas a Criar
- ✅ `/colecoes` - Página principal de assinaturas
- ⏳ `/colecoes/:slug` - Detalhes da coleção (Fase 2)
- ⏳ `/colecoes/:slug/assinar` - Fluxo de assinatura (Fase 3)

---

## 🎯 Estratégia de Implementação

### Fase 1: Página de Testes (AGORA)
- ✅ Home atual permanece inalterada
- ✅ Criar `/colecoes` separada
- ✅ Dados mockados (sem banco)
- ✅ Design consistente
- ✅ Testar com usuários

### Fase 2-4: Funcionalidades Completas
- Banco de dados
- Stripe Subscriptions
- Admin de coleções
- Sistema completo

### Fase 5: Integração Definitiva
- Após validação dos testes
- Adicionar seção na home
- Manter `/colecoes` como página dedicada

---

## ✅ Decisões Confirmadas

1. ✅ **Logo:** Ordax (mantém atual)
2. ✅ **Home:** Permanece inalterada (catálogo)
3. ✅ **Nova página:** `/colecoes` para testes
4. ✅ **Botão:** "Coleções" no header
5. ✅ **Gateway:** Stripe
6. ✅ **Plano anual:** 10% desconto
7. ✅ **Embalagem:** MDF premium

---

## ✅ Próximos Passos

1. **Validar** esta spec atualizada ✅
2. **Criar** página `/colecoes` com dados mockados (Fase 1)
3. **Testar** com usuários reais
4. **Implementar** banco de dados (Fase 2)
5. **Configurar** Stripe Subscriptions (Fase 3)
6. **Integrar** na home definitiva (Fase 5)

---

## 🎯 Fase 1 - MVP para Testes

### Arquivos a Criar
```
src/pages/Collections.tsx          # Nova página /colecoes
src/components/collections/
  ├── CollectionCard.tsx           # Card de coleção
  ├── CollectionHero.tsx           # Hero section
  └── HowItWorks.tsx               # Seção "Como funciona"
```

### Dados Mockados (Fase 1)
```typescript
const mockCollections = [
  {
    id: '1',
    name: 'Thundercats',
    slug: 'thundercats',
    description: '12 personagens icônicos',
    coverImage: '/placeholder.svg',
    priceMonthly: 150,
    priceYearly: 810,
    totalCharacters: 12,
  },
  // ... X-Men, Vilões
];
```

### Rota a Adicionar
```typescript
// src/App.tsx
<Route path="/colecoes" element={<Collections />} />
```

### Header a Atualizar
```typescript
// Adicionar link "Coleções" no menu
<NavLink to="/colecoes">Coleções</NavLink>
```

---

**Spec atualizada! Pronto para começar a Fase 1?** 🚀
