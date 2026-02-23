# Tasks - Sistema de Assinaturas de Coleções

## Fase 1: MVP - Página de Testes `/colecoes`

### 1. Configuração Inicial
- [x] 1.1 Criar estrutura de pastas para componentes de coleções
- [x] 1.2 Criar arquivo de tipos TypeScript para coleções
- [x] 1.3 Criar arquivo de dados mockados

### 2. Componentes Base
- [-] 2.1 Criar componente `CollectionCard`
  - [ ] 2.1.1 Props: collection (name, description, prices, image)
  - [ ] 2.1.2 Layout: imagem, título, descrição, preços
  - [ ] 2.1.3 Botão "Assinar" (placeholder)
  - [ ] 2.1.4 Badge "10% OFF" no plano anual
  - [ ] 2.1.5 Estilo consistente com design atual
- [-] 2.2 Criar componente `CollectionHero`
  - [ ] 2.2.1 Título "Coleções Exclusivas"
  - [ ] 2.2.2 Subtítulo explicativo
  - [ ] 2.2.3 CTA "Ver Coleções Abaixo"
  - [ ] 2.2.4 Background e estilo premium
- [-] 2.3 Criar componente `HowItWorks`
  - [ ] 2.3.1 Seção com 3 passos visuais
  - [ ] 2.3.2 Ícones e descrições
  - [ ] 2.3.3 Lista de benefícios
  - [ ] 2.3.4 Layout responsivo

### 3. Página Principal
- [-] 3.1 Criar página `Collections.tsx`
  - [ ] 3.1.1 Importar componentes criados
  - [ ] 3.1.2 Carregar dados mockados
  - [ ] 3.1.3 Renderizar CollectionHero
  - [ ] 3.1.4 Renderizar grid de 3 CollectionCards
  - [ ] 3.1.5 Renderizar HowItWorks
  - [ ] 3.1.6 Adicionar SEOHead com meta tags
  - [ ] 3.1.7 Usar AppShell para layout consistente

### 4. Navegação
- [-] 4.1 Adicionar rota `/colecoes` no App.tsx
- [x] 4.2 Adicionar botão "Coleções" no AppHeader
  - [ ] 4.2.1 Posicionar entre "Catálogo" e "Minha Conta"
  - [ ] 4.2.2 Usar componente NavLink existente
  - [ ] 4.2.3 Estilo consistente com outros links

### 5. Dados Mockados
- [ ] 5.1 Criar interface `Collection`
- [ ] 5.2 Criar array com 3 coleções:
  - [ ] 5.2.1 Thundercats (12 personagens, R$150/R$810)
  - [ ] 5.2.2 X-Men (12 personagens, R$150/R$810)
  - [ ] 5.2.3 Vilões do Homem-Aranha (12 personagens, R$150/R$810)
- [ ] 5.3 Adicionar imagens placeholder

### 6. Testes e Ajustes
- [ ] 6.1 Testar navegação entre páginas
- [ ] 6.2 Testar responsividade (mobile, tablet, desktop)
- [ ] 6.3 Verificar consistência visual com resto do site
- [ ] 6.4 Ajustar espaçamentos e cores
- [ ] 6.5 Validar acessibilidade básica

### 7. Documentação
- [ ] 7.1 Adicionar comentários nos componentes
- [ ] 7.2 Documentar estrutura de dados mockados
- [ ] 7.3 Atualizar README se necessário

---

## Estrutura de Arquivos a Criar

```
src/
├── pages/
│   └── Collections.tsx                    # Página principal /colecoes
├── components/
│   └── collections/
│       ├── CollectionCard.tsx             # Card de coleção
│       ├── CollectionHero.tsx             # Hero section
│       └── HowItWorks.tsx                 # Seção "Como funciona"
├── types/
│   └── collections.ts                     # Interfaces TypeScript
└── data/
    └── mockCollections.ts                 # Dados mockados
```

---

## Detalhes de Implementação

### Interface `Collection`
```typescript
interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  priceMonthly: number;      // Preço bimestral
  priceYearly: number;       // Preço anual (com desconto)
  totalCharacters: number;   // Total de personagens
  releaseFrequency: string;  // "A cada 2 meses"
}
```

### Dados Mockados
```typescript
export const mockCollections: Collection[] = [
  {
    id: '1',
    name: 'Thundercats',
    slug: 'thundercats',
    description: '12 personagens icônicos dos Thundercats',
    coverImage: '/placeholder.svg',
    priceMonthly: 150,
    priceYearly: 810,
    totalCharacters: 12,
    releaseFrequency: 'A cada 2 meses',
  },
  {
    id: '2',
    name: 'X-Men',
    slug: 'x-men',
    description: '12 mutantes mais poderosos da Marvel',
    coverImage: '/placeholder.svg',
    priceMonthly: 150,
    priceYearly: 810,
    totalCharacters: 12,
    releaseFrequency: 'A cada 2 meses',
  },
  {
    id: '3',
    name: 'Vilões do Homem-Aranha',
    slug: 'viloes-homem-aranha',
    description: '12 vilões clássicos do Homem-Aranha',
    coverImage: '/placeholder.svg',
    priceMonthly: 150,
    priceYearly: 810,
    totalCharacters: 12,
    releaseFrequency: 'A cada 2 meses',
  },
];
```

### Rota no App.tsx
```typescript
import Collections from "./pages/Collections";

// Adicionar na lista de rotas
<Route path="/colecoes" element={<Collections />} />
```

### Link no AppHeader
```typescript
<NavLink to="/colecoes">Coleções</NavLink>
```

---

## Critérios de Aceitação

### Funcionalidade
- [ ] Página `/colecoes` carrega sem erros
- [ ] 3 cards de coleções são exibidos
- [ ] Botão "Coleções" no header funciona
- [ ] Navegação entre páginas funciona
- [ ] Preços são exibidos corretamente (bimestral e anual)

### Design
- [ ] Layout consistente com resto do site
- [ ] Cores e tipografia seguem padrão Ordax
- [ ] Espaçamentos adequados
- [ ] Responsivo em mobile, tablet e desktop
- [ ] Imagens com aspect ratio correto

### Performance
- [ ] Página carrega em < 2s
- [ ] Sem erros no console
- [ ] Sem warnings de React

### Acessibilidade
- [ ] Botões têm labels descritivos
- [ ] Imagens têm alt text
- [ ] Navegação por teclado funciona
- [ ] Contraste de cores adequado

---

## Notas de Implementação

### Estilo Visual
- Usar classes Tailwind existentes
- Seguir padrão de cards do catálogo atual
- Hero com fundo escuro (bg-foreground)
- Cards com shadow-premium
- Botões com estilo primary

### Responsividade
- Mobile: 1 coluna
- Tablet: 2 colunas
- Desktop: 3 colunas
- Hero: texto centralizado em mobile

### Componentes Reutilizáveis
- Usar `AppShell` para layout
- Usar `SEOHead` para meta tags
- Usar `Button` do shadcn/ui
- Usar `Card` do shadcn/ui

---

## Próximas Fases (Futuro)

### Fase 2: Banco de Dados
- Criar migrations para tabelas de coleções
- CRUD de coleções no admin
- Substituir dados mockados por dados reais

### Fase 3: Sistema de Assinatura
- Integração com Stripe Subscriptions
- Página de detalhes da coleção
- Fluxo de checkout
- Página "Minhas Assinaturas"

### Fase 4: Funcionalidades Avançadas
- Sistema de revelação de personagens
- Timeline de produção
- Compra avulsa
- Notificações por email

### Fase 5: Integração na Home
- Adicionar seção de coleções na home
- Banner/CTA para coleções
- Manter `/colecoes` como página dedicada

---

## Estimativa de Tempo

- **Task 1-2:** 2 horas (setup + componentes base)
- **Task 3:** 1 hora (página principal)
- **Task 4:** 30 minutos (navegação)
- **Task 5:** 30 minutos (dados mockados)
- **Task 6:** 1 hora (testes e ajustes)
- **Task 7:** 30 minutos (documentação)

**Total:** ~5-6 horas para Fase 1 completa

---

## Checklist Final

Antes de considerar a Fase 1 completa:
- [ ] Todas as tasks marcadas como concluídas
- [ ] Código revisado e sem erros
- [ ] Testes manuais realizados
- [ ] Screenshots tirados para documentação
- [ ] Feedback do usuário coletado
- [ ] Ajustes baseados no feedback aplicados
- [ ] Pronto para Fase 2 (banco de dados)
