# 🎨 Sistema de Coleções - Ordax

Documentação completa do sistema de gestão de coleções e personagens.

---

## 📋 Visão Geral

Sistema completo para gerenciar coleções de colecionáveis, personagens, produção e análise financeira.

### Características Principais
- 🎨 Gestão de coleções e franquias
- 👤 Catálogo de personagens
- 📅 Cronograma de produção por lotes
- 💰 Análise financeira detalhada
- 📊 Custos e rentabilidade
- 🔄 Sistema de trocas
- 📦 Controle de estoque
- 🚀 Lançamentos programados

---

## 🗄️ Estrutura do Banco

### Tabela: franchises
```sql
- id (uuid)
- name (text) - "Marvel", "DC", "Anime"
- slug (text) - "marvel", "dc", "anime"
- description (text)
- logo_url (text)
- is_active (boolean)
- created_at (timestamp)
```

### Tabela: collections
```sql
- id (uuid)
- franchise_id (uuid) → franchises
- name (text) - "Vingadores", "Liga da Justiça"
- slug (text)
- description (text)
- image_url (text)
- total_characters (integer)
- is_active (boolean)
- release_month (text) - "2026-03"

-- Preços
- price_full (numeric) DEFAULT 500.00
- price_pix (numeric) DEFAULT 475.00
- deposit_amount (numeric) DEFAULT 100.00
- is_price_custom (boolean) DEFAULT false

-- Custos (análise financeira)
- cost_material (numeric) DEFAULT 50.00
- cost_labor (numeric) DEFAULT 80.00
- cost_packaging (numeric) DEFAULT 30.00
- cost_shipping (numeric) DEFAULT 40.00
- cost_other (numeric) DEFAULT 0.00
- cost_notes (text)

- created_at (timestamp)
```

### Tabela: characters
```sql
- id (uuid)
- name (text) - "Homem de Ferro", "Batman"
- description (text)
- image_url (text)
- franchise_id (uuid) → franchises
- rarity (enum: common, rare, epic, legendary)
- is_active (boolean)
- release_date (date)
- created_at (timestamp)
```

### Tabela: collection_characters
```sql
- id (uuid)
- collection_id (uuid) → collections
- character_id (uuid) → characters
- order_in_collection (integer)
- is_bonus (boolean) - Peça bônus
- created_at (timestamp)
```

---

## 📅 Sistema de Lotes de Produção

### Modelo de Produção

**Ciclo**: 30 dias por lote  
**Capacidade**: 15-30 peças/mês  
**Modelo**: Vendas → Produção → Envio

### Linha do Tempo

| Fase | Duração | Atividades |
|------|---------|------------|
| **Vendas** | 30 dias | Receber pedidos, processar pagamentos |
| **Produção** | 15 dias | Produção artesanal das peças |
| **Envio** | 5 dias úteis | Embalagem e postagem |

**Prazo total**: 50-60 dias da compra até recebimento

### Exemplo: Lote Fevereiro/Março

```
Vendas: 15/02 a 15/03 (30 dias)
├─ Divulgação e marketing
├─ Processamento de pedidos
└─ Limite: 15 vagas

Produção: 16/03 a 30/03 (15 dias)
├─ Compra de materiais
├─ Modelagem e escultura
├─ Pintura e acabamento
└─ Controle de qualidade

Envio: 01/04 a 5º dia útil (5 dias úteis)
├─ Embalagem
├─ Postagem nos Correios
└─ Envio de códigos de rastreamento
```

### Calendário Anual

**Padrão**: Vendas sempre do dia 15 ao dia 15 do mês seguinte

- **Lote 1**: Vendas 15/02-15/03 → Entrega Abril
- **Lote 2**: Vendas 16/03-15/04 → Entrega Maio
- **Lote 3**: Vendas 16/04-15/05 → Entrega Junho
- E assim sucessivamente...

---

## 💰 Análise Financeira

### Custos por Categoria

**Categorias de Custo**:
- **Material/Resina**: R$ 50-70
- **Mão de Obra**: R$ 80-120
- **Embalagem**: R$ 30-40
- **Frete**: R$ 40-50
- **Outros**: R$ 0-20

**Custo Total Padrão**: R$ 200,00 por peça

### Métricas Calculadas

#### 1. Lucro Bruto
```
Lucro Bruto = Preço - Custo Total
```

#### 2. Lucro Líquido (com taxas MP)
```
Lucro Líquido = Preço - Custo - Taxa MP
```

#### 3. Margem Líquida
```
Margem = (Lucro Líquido / Preço) × 100
```

#### 4. ROI (Return on Investment)
```
ROI = (Lucro Líquido / Custo) × 100
```

#### 5. Breakeven
```
Breakeven = Custos Fixos / Lucro por Unidade
```

### Exemplo Prático: Coleção Marvel

**Configuração**:
- Preço: R$ 700 (PIX R$ 665)
- Material: R$ 60
- Mão de Obra: R$ 100
- Embalagem: R$ 40
- Frete: R$ 50
- **Custo Total: R$ 250**

**Resultados**:
- Lucro Bruto PIX: R$ 415
- Taxa MP (1%): R$ 6,65
- **Lucro Líquido: R$ 408,35**
- **Margem: 61,4%**
- **ROI: 163,3%**

**Recomendação**: ✅ Excelente! Margem e ROI ótimos.

---

## 🎨 Interface Admin

### AdminCollections (/admin/colecoes)

**Funcionalidades**:
- Lista de todas as coleções
- Criar/editar coleções
- Ativar/desativar coleções
- Gerenciar personagens
- Upload de imagens
- Definir ordem dos personagens

### AdminCollectionFinancials (/admin/financeiro)

**4 Tabs de Análise**:

**1. Visão Geral**
- Resumo de todas as coleções
- Lucro médio
- Margem média
- Melhor margem

**2. Custos**
- Editar custos por categoria
- Gráfico de distribuição
- Custo total calculado
- Salvar alterações

**3. Comparação**
- PIX vs Cartão 6x vs 10x
- Lucro líquido por forma
- Margem por forma
- ROI por forma
- Gráfico comparativo

**4. Recomendações**
- Análise automática
- Sugestões de melhoria
- Ações recomendadas
- Resumo executivo

### AdminFranchises (/admin/franquias)

**Funcionalidades**:
- Gerenciar franquias
- Criar/editar franquias
- Upload de logos
- Ativar/desativar

### AdminModels (/admin/modelos)

**Funcionalidades**:
- Gerenciar personagens
- Criar/editar personagens
- Upload de imagens
- Definir raridade
- Associar a coleções

---

## 📊 Recomendações Automáticas

O sistema analisa e sugere:

### Margem < 30%
⚠️ **Margem Baixa**
- Aumentar preço
- Reduzir custos
- Negociar com fornecedores

### Margem > 60%
✅ **Margem Excelente**
- Manter preços
- Investir em marketing
- Escalar produção

### ROI < 100%
⚠️ **ROI Baixo**
- Revisar custos
- Aumentar preço
- Otimizar produção

### ROI > 200%
✅ **ROI Excelente**
- Escalar esta coleção
- Usar como referência
- Investir em divulgação

---

## 🔄 Sistema de Trocas

### Para Assinaturas

**Regras**:
- Trocar personagem antes da produção iniciar
- Trocas ilimitadas (dentro do prazo)
- Trocar por qualquer personagem da mesma coleção

**Prazo**: Até 7 dias antes da data programada de produção

**Exemplo**:
```
Entrega programada: 15/03/2026
Produção inicia: 08/03/2026
Prazo de troca: Até 01/03/2026
```

---

## 💻 Hooks e Serviços

### useCollections

```typescript
import { useCollections } from '@/hooks/useCollections';

function MyComponent() {
  const { data: collections, isLoading } = useCollections();
  
  return (
    <div>
      {collections?.map(col => (
        <div key={col.id}>
          <h3>{col.name}</h3>
          <p>{col.total_characters} personagens</p>
        </div>
      ))}
    </div>
  );
}
```

### useCollectionPricing

```typescript
import { useCollectionPricing } from '@/hooks/useCollectionPricing';

function MyComponent({ collectionId }) {
  const { data: pricing } = useCollectionPricing(collectionId);
  
  return (
    <div>
      <p>Preço: R$ {pricing?.price_full}</p>
      <p>PIX: R$ {pricing?.price_pix}</p>
      <p>Entrada: R$ {pricing?.deposit_amount}</p>
    </div>
  );
}
```

### collectionService

```typescript
import { collectionService } from '@/lib/collection-service';

// Criar coleção
const collection = await collectionService.create({
  name: 'Vingadores',
  franchise_id: franchiseId,
  description: 'Heróis mais poderosos da Terra'
});

// Adicionar personagem
await collectionService.addCharacter(
  collectionId,
  characterId,
  order: 1
);

// Atualizar custos
await collectionService.updateCosts(collectionId, {
  cost_material: 60,
  cost_labor: 100,
  cost_packaging: 40,
  cost_shipping: 50
});
```

---

## 📈 Capacidade de Produção

### Por Mês

**Equipe**: 2 pessoas  
**Dias úteis**: 15 dias de produção  
**Capacidade teórica**: 30 peças/mês

**Capacidade real (com margem de segurança)**:
- Lote 1-3: 15 peças/mês (conservador)
- Lote 4-6: 20 peças/mês (crescimento)
- Lote 7+: 25-30 peças/mês (maturidade)

### Distribuição Típica

**Exemplo Lote 1 (15 clientes)**:
- 5 Avulso → 5 peças
- 6 Trimestral → 6 peças (1ª de cada)
- 4 Semestral → 4 peças (1ª de cada)
- **Total: 15 peças**

---

## 📧 Comunicação com Clientes

### Durante as Vendas

**Email de boas-vindas**:
```
Assunto: 🎉 Bem-vindo ao Lote Fevereiro!

Olá [Nome]!

Obrigado por fazer parte do Lote Fevereiro! 🎨

📅 Cronograma do seu pedido:
• Produção: 16 a 30 de Março
• Envio: Até 5º dia útil de Abril
• Entrega estimada: 15 a 25 de Abril

Você receberá atualizações em cada etapa!
```

### Durante a Produção

**Email de atualização**:
```
Assunto: 🎨 Sua peça está sendo produzida!

Olá [Nome]!

Ótimas notícias! Sua peça entrou em produção! 🎉

📅 Status atual:
✅ Materiais adquiridos
🎨 Em produção (16-30/03)
📦 Envio previsto: Até 5º dia útil de Abril
```

### No Envio

**Email com rastreamento**:
```
Assunto: 📦 Sua peça foi enviada!

Olá [Nome]!

Sua peça está a caminho! 🚚

📦 Código de rastreamento: BR123456789BR
🔗 Rastrear: [link dos Correios]

Prazo de entrega: 7-15 dias úteis
```

---

## 🎯 Casos de Uso

### 1. Lançar Nova Coleção

```
1. Criar franquia (se não existir)
2. Criar coleção
3. Adicionar personagens
4. Configurar custos
5. Definir preços
6. Validar margem
7. Ativar coleção
8. Divulgar
```

### 2. Otimizar Coleção Existente

```
1. Acessar análise financeira
2. Identificar maior custo
3. Negociar redução
4. Atualizar custos
5. Recalcular margem
6. Validar viabilidade
```

### 3. Gerenciar Lote de Produção

```
1. Abrir vendas (dia 15)
2. Processar pedidos (30 dias)
3. Fechar vendas (dia 15 seguinte)
4. Comprar materiais
5. Produzir peças (15 dias)
6. Embalar e enviar (5 dias úteis)
7. Monitorar entregas
```

---

## 📚 Referências

### Código-Fonte

**Páginas Admin**:
- `src/pages/admin/AdminCollections.tsx`
- `src/pages/admin/AdminCollectionFinancials.tsx`
- `src/pages/admin/AdminFranchises.tsx`
- `src/pages/admin/AdminModels.tsx`

**Páginas Cliente**:
- `src/pages/Collections.tsx`
- `src/pages/CollectionDetails.tsx`
- `src/pages/Catalog.tsx`

**Serviços**:
- `src/lib/collection-service.ts`
- `src/lib/character-service.ts`

**Hooks**:
- `src/hooks/useCollections.ts`
- `src/hooks/useCollectionPricing.ts`

### Migrations

- `20260202000000_create_collections_system.sql`
- `20260203020000_add_dynamic_collections_system.sql`
- `20260215140000_add_collection_pricing.sql`
- `20260215150000_add_collection_costs_analytics.sql`
- `20260215161000_clean_collections_data.sql`

---

## 🔮 Roadmap

### Curto Prazo (1 mês)
- [ ] Sistema de pré-venda
- [ ] Notificações de lançamento
- [ ] Wishlist por coleção
- [ ] Comparador de coleções

### Médio Prazo (3 meses)
- [ ] Sistema de raridade dinâmica
- [ ] Marketplace de trocas
- [ ] Coleções colaborativas
- [ ] Votação de próximas coleções

### Longo Prazo (6+ meses)
- [ ] Coleções exclusivas
- [ ] Edições limitadas
- [ ] Personalização de personagens
- [ ] Realidade aumentada (AR)

---

**Última atualização**: 2026-02-24  
**Versão**: 1.0.0  
**Status**: ✅ Produção
