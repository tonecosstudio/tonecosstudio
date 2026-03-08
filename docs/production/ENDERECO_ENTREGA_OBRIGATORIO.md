# 📍 Endereço de Entrega Obrigatório

**Data**: 2026-03-08  
**Status**: 🔄 EM IMPLEMENTAÇÃO

---

## 🎯 Problema Identificado

Usuários podem fazer pedidos sem cadastrar endereço de entrega, resultando em:
- ❌ "Nenhuma informação de entrega disponível" no painel admin
- ❌ Impossibilidade de gerar etiquetas de envio
- ❌ Atrasos na produção e entrega
- ❌ Experiência ruim para cliente e admin

### Dados Atuais:
- 9 usuários cadastrados
- 0 usuários com endereço válido
- 2 compras avulsa sem endereço de entrega

---

## ✅ Solução Implementada

### 1. Estrutura de Dados (Banco de Dados)

#### Campo Adicionado:
```sql
ALTER TABLE public.profiles
ADD COLUMN delivery_address JSONB DEFAULT NULL;
```

#### Formato do Endereço:
```json
{
  "street": "Rua Example",
  "number": "123",
  "complement": "Apt 45",
  "neighborhood": "Bairro",
  "city": "Cidade",
  "state": "SP",
  "zipCode": "12345-678",
  "country": "Brasil"
}
```

#### Campos Obrigatórios:
- ✅ `street` - Rua/Avenida
- ✅ `number` - Número
- ✅ `neighborhood` - Bairro
- ✅ `city` - Cidade
- ✅ `state` - UF (2 letras maiúsculas)
- ✅ `zipCode` - CEP (formato: 12345-678 ou 12345678)
- ⚪ `complement` - Complemento (opcional)
- ⚪ `country` - País (padrão: "Brasil")

---

### 2. Funções de Validação

#### `validate_delivery_address(address JSONB)`
Valida se um endereço tem todos os campos obrigatórios e formato correto.

**Validações**:
- Todos os campos obrigatórios presentes
- Campos não vazios
- CEP no formato correto (12345-678 ou 12345678)
- UF com 2 letras maiúsculas (SP, RJ, MG, etc.)

**Retorno**: `BOOLEAN`

**Exemplo**:
```sql
SELECT validate_delivery_address('{
  "street": "Rua Teste",
  "number": "123",
  "neighborhood": "Centro",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01234-567"
}'::jsonb);
-- Retorna: true
```

#### `can_place_order(user_id UUID)`
Verifica se um usuário pode fazer pedidos (tem endereço válido).

**Retorno**: `BOOLEAN`

**Exemplo**:
```sql
SELECT can_place_order('user-uuid-here');
-- Retorna: true se usuário tem endereço válido
```

---

### 3. View para Consultas

#### `profiles_with_delivery_info`
View que facilita consultas de endereços.

**Campos**:
- `id`, `full_name`, `email`, `phone`
- `delivery_address` (JSONB completo)
- `has_valid_delivery_address` (BOOLEAN)
- `street`, `number`, `complement`, `neighborhood`
- `city`, `state`, `zip_code`, `country`

**Exemplo**:
```sql
SELECT * FROM profiles_with_delivery_info
WHERE has_valid_delivery_address = false;
```

---

## 📋 Implementação Frontend (Pendente)

### 1. Formulário de Endereço

#### Componente: `DeliveryAddressForm.tsx`
```typescript
interface DeliveryAddressFormProps {
  userId: string;
  onSave: (address: DeliveryAddress) => void;
  onCancel?: () => void;
}

interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}
```

#### Validações:
- CEP: Formato 12345-678
- UF: Lista de estados brasileiros
- Campos obrigatórios marcados com *
- Busca automática de endereço por CEP (ViaCEP API)

---

### 2. Modal de Solicitação de Endereço

#### Quando Exibir:
- ✅ Ao tentar finalizar compra sem endereço
- ✅ Ao acessar página de perfil (se não tiver endereço)
- ✅ Ao fazer primeira compra

#### Comportamento:
- Modal não pode ser fechado sem preencher
- Botão "Pular" desabilitado
- Mensagem clara: "Precisamos do seu endereço para enviar seus pedidos"

---

### 3. Validação no Checkout

#### Fluxo:
```typescript
async function handleCheckout() {
  // 1. Verificar se usuário tem endereço
  const { data: profile } = await supabase
    .from('profiles')
    .select('delivery_address')
    .eq('id', userId)
    .single();

  if (!profile.delivery_address) {
    // Exibir modal de endereço
    showDeliveryAddressModal();
    return;
  }

  // 2. Validar endereço
  const { data: isValid } = await supabase
    .rpc('validate_delivery_address', {
      address: profile.delivery_address
    });

  if (!isValid) {
    // Exibir modal para atualizar endereço
    showDeliveryAddressModal();
    return;
  }

  // 3. Prosseguir com checkout
  proceedToCheckout();
}
```

---

### 4. Página de Perfil

#### Seção de Endereço:
```tsx
<ProfileSection title="Endereço de Entrega">
  {hasAddress ? (
    <AddressDisplay address={deliveryAddress} />
  ) : (
    <EmptyState
      icon={<MapPin />}
      title="Nenhum endereço cadastrado"
      description="Cadastre seu endereço para receber seus pedidos"
      action={
        <Button onClick={openAddressForm}>
          Cadastrar Endereço
        </Button>
      }
    />
  )}
</ProfileSection>
```

---

## 🔧 Integração com Sistema de Pedidos

### 1. Atualizar `orders-service-v3.ts`

#### Adicionar validação:
```typescript
async function createStandalonePurchase(data: CreatePurchaseData) {
  // Verificar se usuário pode fazer pedido
  const { data: canOrder } = await supabase
    .rpc('can_place_order', { user_id: data.userId });

  if (!canOrder) {
    throw new Error('Cadastre seu endereço de entrega antes de fazer um pedido');
  }

  // Prosseguir com criação do pedido
  // ...
}
```

---

### 2. Atualizar `label-service.ts`

#### Buscar endereço do perfil:
```typescript
async function generateLabel(orderId: string) {
  // Buscar pedido e endereço
  const { data: order } = await supabase
    .from('production_queue')
    .select(`
      *,
      profiles!inner(
        full_name,
        email,
        phone,
        delivery_address
      )
    `)
    .eq('order_id', orderId)
    .single();

  if (!order.profiles.delivery_address) {
    throw new Error('Endereço de entrega não cadastrado');
  }

  // Validar endereço
  const { data: isValid } = await supabase
    .rpc('validate_delivery_address', {
      address: order.profiles.delivery_address
    });

  if (!isValid) {
    throw new Error('Endereço de entrega inválido');
  }

  // Gerar etiqueta
  const address = order.profiles.delivery_address;
  return await shippingService.generateLabel(orderId, {
    name: order.profiles.full_name,
    street: address.street,
    number: address.number,
    complement: address.complement,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    country: address.country || 'Brasil',
    phone: order.profiles.phone
  });
}
```

---

## 📊 Migração de Dados Existentes

### Usuários Sem Endereço:
- Total: 9 usuários
- Ação: Exibir modal na próxima vez que acessarem o sistema
- Bloqueio: Não podem fazer novos pedidos até cadastrar

### Pedidos Existentes Sem Endereço:
- Total: 2 compras avulsa
- Ação: Entrar em contato com clientes para solicitar endereço
- Alternativa: Admin pode cadastrar endereço manualmente

---

## 🎯 Checklist de Implementação

### Backend (Banco de Dados) ✅
- [x] Adicionar coluna `delivery_address`
- [x] Criar função `validate_delivery_address()`
- [x] Criar função `can_place_order()`
- [x] Criar view `profiles_with_delivery_info`
- [x] Criar índice para busca por CEP

### Frontend (Pendente) 🔄
- [ ] Criar componente `DeliveryAddressForm`
- [ ] Criar modal de solicitação de endereço
- [ ] Adicionar validação no checkout
- [ ] Atualizar página de perfil
- [ ] Integrar com ViaCEP API

### Services (Pendente) 🔄
- [ ] Atualizar `orders-service-v3.ts`
- [ ] Atualizar `label-service.ts`
- [ ] Adicionar validação em `createStandalonePurchase()`
- [ ] Adicionar validação em `createSubscription()`

### Admin (Pendente) 🔄
- [ ] Exibir endereço completo em detalhes do pedido
- [ ] Permitir admin editar endereço se necessário
- [ ] Adicionar filtro por "sem endereço"
- [ ] Adicionar alerta para pedidos sem endereço

---

## 🚀 Como Aplicar

### 1. Executar Migration no Banco de Dados

**Opção A: Supabase Dashboard (Recomendado)**
```
1. Abra o Supabase Dashboard
2. Vá em SQL Editor
3. Clique em "New Query"
4. Cole o conteúdo de: scripts/database/APPLY_DELIVERY_ADDRESS.sql
5. Clique em "Run"
```

**Opção B: Via Script**
```bash
node scripts/database/apply-delivery-address-simple.mjs
```

### 2. Verificar Instalação

```sql
-- Verificar coluna
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'delivery_address';

-- Verificar funções
SELECT proname
FROM pg_proc
WHERE proname IN ('validate_delivery_address', 'can_place_order');

-- Verificar view
SELECT viewname
FROM pg_views
WHERE viewname = 'profiles_with_delivery_info';
```

### 3. Testar Validação

```sql
-- Teste 1: Endereço válido
SELECT validate_delivery_address('{
  "street": "Rua Teste",
  "number": "123",
  "neighborhood": "Centro",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01234-567"
}'::jsonb);
-- Deve retornar: true

-- Teste 2: Endereço inválido (sem número)
SELECT validate_delivery_address('{
  "street": "Rua Teste",
  "neighborhood": "Centro",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01234-567"
}'::jsonb);
-- Deve retornar: false
```

---

## 📞 Suporte

### Verificar Usuários Sem Endereço:
```bash
node scripts/database/analyze-delivery-addresses.mjs
```

### Arquivos Relacionados:
- `supabase/migrations/20260308220000_add_structured_delivery_address.sql`
- `scripts/database/APPLY_DELIVERY_ADDRESS.sql`
- `scripts/database/analyze-delivery-addresses.mjs`
- `docs/production/ENDERECO_ENTREGA_OBRIGATORIO.md`

---

**Implementado por**: Kiro AI  
**Data**: 2026-03-08  
**Status**: 🔄 Backend Completo, Frontend Pendente
