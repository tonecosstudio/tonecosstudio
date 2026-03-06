# Sistema de Coleções - Análise Completa

**Data:** 06 de Março de 2026  
**Status:** ✅ 100% Implementado

---

## 📋 Estrutura da Tabela `collection_characters`

### Campos Implementados

```sql
CREATE TABLE collection_characters (
  -- Identificação
  id UUID PRIMARY KEY,
  collection_id UUID REFERENCES collections(id),
  name TEXT NOT NULL,
  description TEXT,

  -- Ordem e Status
  release_order INTEGER NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'revealed', 'released')),

  -- Imagem
  image_url TEXT,

  -- Datas
  release_month INTEGER CHECK (release_month BETWEEN 1 AND 12),
  release_date DATE,
  reveal_date DATE,
  released_at TIMESTAMPTZ,

  -- Automação
  auto_reveal BOOLEAN DEFAULT true,
  auto_release BOOLEAN DEFAULT true,
  reveal_notification_sent BOOLEAN DEFAULT false,
  release_notification_sent BOOLEAN DEFAULT false,
  is_revealed BOOLEAN DEFAULT false,

  -- PREÇOS
  price_multiplier DECIMAL(4,2) CHECK (price_multiplier > 0 OR price_multiplier IS NULL),

  -- Controle
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🎯 Campos Solicitados vs Implementados

| Campo Solicitado | Campo Real                      | Status          | Observação                                    |
| ---------------- | ------------------------------- | --------------- | --------------------------------------------- |
| **nome**         | `name`                          | ✅ Implementado | Nome do personagem                            |
| **coleção**      | `collection_id`                 | ✅ Implementado | Referência à tabela `collections`             |
| **tipo**         | `collection.collection_type_id` | ✅ Implementado | Via JOIN com `collections`                    |
| **coins**        | Calculado dinamicamente         | ✅ Implementado | Via função `get_character_price()`            |
| **valor_avulso** | Calculado dinamicamente         | ✅ Implementado | Via função `get_character_standalone_price()` |
| **escala**       | `price_multiplier`              | ✅ Implementado | Multiplicador de preço (1.0, 1.2, 1.5, 2.0)   |
| **status**       | `status`                        | ✅ Implementado | 'upcoming', 'revealed', 'released'            |

---

## 💰 Sistema de Preços

### 1. Preço em Coins (Assinantes)

**Cálculo em 2 Etapas:**

```typescript
// Etapa 1: Preço base da coleção (contexto)
const collectionPrice = get_collection_price(collection_id, user_id);

// Etapa 2: Aplicar multiplicador do personagem
const finalPrice = collectionPrice * (price_multiplier || 1.0);
```

**Função SQL:**

```sql
SELECT get_character_price(character_id, user_id) AS coins_price;
```

**Exemplo:**

```
Personagem: Naruto Sage
Coleção: Naruto (subscription, chosen)
Base Price: 200 coins (com desconto de assinante)
Multiplier: 1.0 (padrão)
Final Price: 200 coins
```

### 2. Preço Avulso em Reais (Não-Assinantes)

**Baseado em Tipo:**

```sql
-- Determina tipo automaticamente
SELECT get_character_standalone_price(character_id, 'full') AS valor_avulso;
```

**Lógica:**

- `price_multiplier >= 1.5` → Premium (R$ 900)
- `price_multiplier < 1.5` ou `NULL` → Standard (R$ 500)

**Exemplo:**

```
Personagem: Naruto Sage
Multiplier: 1.0
Tipo: Standard
Valor Avulso: R$ 500,00
Valor PIX: R$ 475,00 (5% desconto)
```

---

## 📊 Exemplo Completo: Coleção Naruto

### Dados Inseridos (Migration 20260306210000)

```sql
-- Coleção
INSERT INTO collections (name, description, collection_type_id)
VALUES ('Naruto Shippuden', 'Personagens do anime Naruto', subscription_type_id);

-- Personagens Standard
INSERT INTO collection_characters (
  collection_id, name, description, release_order, status, price_multiplier
) VALUES
  (naruto_collection_id, 'Naruto Sage Mode', 'Naruto em Modo Sábio', 1, 'released', 1.0),
  (naruto_collection_id, 'Sasuke Uchiha', 'Sasuke com Sharingan', 2, 'released', 1.0),
  (naruto_collection_id, 'Kakashi Hatake', 'Kakashi Copy Ninja', 3, 'released', 1.2),
  (naruto_collection_id, 'Sakura Haruno', 'Sakura Medical Ninja', 4, 'released', 1.0);

-- Personagens Premium
INSERT INTO collection_characters (
  collection_id, name, description, release_order, status, price_multiplier
) VALUES
  (naruto_collection_id, 'Itachi Uchiha', 'Itachi Akatsuki', 5, 'released', 1.5),
  (naruto_collection_id, 'Jiraiya Sensei', 'Jiraiya Sannin', 6, 'released', 1.5);
```

### Preços Resultantes

| Personagem  | Multiplier | Tipo     | Coins (Assinante) | Valor Avulso |
| ----------- | ---------- | -------- | ----------------- | ------------ |
| Naruto Sage | 1.0        | Standard | 200               | R$ 500       |
| Sasuke      | 1.0        | Standard | 200               | R$ 500       |
| Kakashi     | 1.2        | Standard | 240               | R$ 500       |
| Sakura      | 1.0        | Standard | 200               | R$ 500       |
| Itachi      | 1.5        | Premium  | 300               | R$ 900       |
| Jiraiya     | 1.5        | Premium  | 300               | R$ 900       |

**Observações:**

- Coins variam por personagem (multiplier)
- Valor avulso varia por tipo (standard/premium)
- Assinantes pagam em coins
- Não-assinantes pagam em reais

---

## 🔍 Como Consultar os Dados

### 1. Listar Personagens com Preços

```sql
SELECT
  cc.id,
  cc.name,
  c.name AS collection_name,
  ct.name AS collection_type,
  cc.price_multiplier,
  cc.status,

  -- Preço em coins (para assinante que escolheu a coleção)
  get_character_price(cc.id, 'user_id_here') AS coins_price,

  -- Preço avulso em reais
  get_character_standalone_price(cc.id, 'full') AS valor_avulso_full,
  get_character_standalone_price(cc.id, 'pix') AS valor_avulso_pix,

  -- Tipo determinado automaticamente
  CASE
    WHEN cc.price_multiplier >= 1.5 THEN 'premium'
    ELSE 'standard'
  END AS character_type

FROM collection_characters cc
JOIN collections c ON c.id = cc.collection_id
JOIN collection_types ct ON ct.id = c.collection_type_id
WHERE c.name = 'Naruto Shippuden'
ORDER BY cc.release_order;
```

### 2. Verificar Coleção Naruto

```sql
SELECT
  cc.name,
  cc.release_order,
  cc.status,
  cc.price_multiplier,
  CASE
    WHEN cc.price_multiplier >= 1.5 THEN 'Premium'
    ELSE 'Standard'
  END AS tipo
FROM collection_characters cc
JOIN collections c ON c.id = cc.collection_id
WHERE c.name = 'Naruto Shippuden'
ORDER BY cc.release_order;
```

---

## 🎨 Exibição no Frontend

### Componente: CharacterCard

```typescript
interface Character {
  id: string;
  name: string;
  description: string;
  collection_name: string;
  collection_type: string;
  status: "upcoming" | "revealed" | "released";
  price_multiplier: number | null;

  // Preços calculados
  coins_price: number; // Para assinantes
  standalone_price: number; // Para não-assinantes
  character_type: "standard" | "premium";
}
```

### Exemplo de Exibição

```tsx
<CharacterCard character={character}>
  <h3>{character.name}</h3>
  <p>{character.description}</p>

  {/* Badge de tipo */}
  {character.character_type === "premium" && <Badge variant="premium">Premium</Badge>}

  {/* Preços */}
  {isSubscriber ? (
    <div>
      <span className="coins-price">{character.coins_price} coins</span>
      <span className="savings">
        Economia: R$ {character.standalone_price - character.coins_price * coinValue}
      </span>
    </div>
  ) : (
    <div>
      <span className="standalone-price">R$ {character.standalone_price}</span>
      <Button>Assinar e Economizar</Button>
    </div>
  )}
</CharacterCard>
```

---

## 📈 Fluxo de Dados Completo

### 1. Criação de Personagem (Admin)

```typescript
// Admin cria personagem
const character = {
  collection_id: "naruto-collection-uuid",
  name: "Naruto Sage Mode",
  description: "Naruto em Modo Sábio dos Sapos",
  release_order: 1,
  status: "released",
  price_multiplier: 1.0, // Padrão
  image_url: "/images/naruto-sage.jpg",
};

await supabase.from("collection_characters").insert(character);
```

### 2. Consulta no Catálogo (Frontend)

```typescript
// Buscar personagens com preços
const { data: characters } = await supabase.rpc("get_catalog_characters", {
  p_user_id: userId,
  p_collection_id: collectionId,
});

// Retorna:
// [
//   {
//     id: 'uuid',
//     name: 'Naruto Sage Mode',
//     collection_name: 'Naruto Shippuden',
//     coins_price: 200,
//     standalone_price: 500,
//     character_type: 'standard',
//     ...
//   }
// ]
```

### 3. Compra com Coins (Assinante)

```typescript
// Comprar personagem
const { data, error } = await supabase.rpc("purchase_character_with_coins", {
  p_user_id: userId,
  p_character_id: characterId,
});

// Sistema:
// 1. Calcula preço: get_character_price(characterId, userId)
// 2. Valida saldo de coins
// 3. Debita coins
// 4. Adiciona personagem ao usuário
```

### 4. Compra Avulsa (Não-Assinante)

```typescript
// Criar pedido avulso
const { data } = await supabase.rpc("create_standalone_purchase", {
  p_user_id: userId,
  p_character_id: characterId,
  p_payment_method: "pix",
});

// Sistema:
// 1. Calcula preço: get_character_standalone_price(characterId, 'pix')
// 2. Cria pedido com depósito R$ 100
// 3. Saldo = preço_total - 100
// 4. Aguarda pagamento
```

---

## ✅ Checklist de Implementação

### Banco de Dados

- [x] Tabela `collection_characters` criada
- [x] Campo `name` (nome do personagem)
- [x] Campo `collection_id` (referência à coleção)
- [x] Campo `status` (upcoming/revealed/released)
- [x] Campo `price_multiplier` (escala de preço)
- [x] Campo `release_order` (ordem de lançamento)
- [x] Campo `image_url` (imagem do personagem)
- [x] Função `get_character_price()` (preço em coins)
- [x] Função `get_character_standalone_price()` (preço em reais)
- [x] Tabela `character_standalone_pricing` (preços avulsos)

### Preços

- [x] Sistema de preços em coins (assinantes)
- [x] Sistema de preços em reais (não-assinantes)
- [x] Cálculo contextual (coleção + multiplicador)
- [x] Diferenciação standard/premium
- [x] Desconto PIX (5%)

### Frontend

- [x] Componente `CharacterCard`
- [x] Exibição de preços contextuais
- [x] Badge de tipo (standard/premium)
- [x] Cálculo de economia para assinantes
- [x] CTAs diferenciados (assinante vs não-assinante)

### Dados Mock

- [x] Coleção Naruto Shippuden criada
- [x] 6 personagens inseridos
- [x] 4 standard (Naruto, Sasuke, Kakashi, Sakura)
- [x] 2 premium (Itachi, Jiraiya)
- [x] Preços configurados corretamente

---

## 🎯 Conclusão

O sistema de coleções está **100% implementado** com todos os campos solicitados:

✅ **nome** → `collection_characters.name`  
✅ **coleção** → `collection_characters.collection_id`  
✅ **tipo** → Via `collections.collection_type_id`  
✅ **coins** → Calculado via `get_character_price()`  
✅ **valor_avulso** → Calculado via `get_character_standalone_price()`  
✅ **escala** → `collection_characters.price_multiplier`  
✅ **status** → `collection_characters.status`

**Exemplo funcional:**

```
Personagem: Naruto Sage Mode
Coleção: Naruto Shippuden
Tipo: Subscription (coleção ativa)
Coins: 200 (para assinante que escolheu a coleção)
Valor Avulso: R$ 500,00
Escala: 1.0 (padrão)
Status: released
```

O sistema está pronto para uso em produção! 🚀
