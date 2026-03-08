# ✅ Validação de Campos Obrigatórios

**Data**: 2026-03-08  
**Status**: ✅ IMPLEMENTADO

---

## 🎯 Campos Obrigatórios para Pedidos

Para realizar um pedido, o usuário DEVE ter:

1. ✅ **Nome Completo** - Identificação do cliente
2. ✅ **CPF** - Necessário para nota fiscal
3. ✅ **Telefone OU WhatsApp** - Pelo menos um para contato
4. ✅ **Email** - Geralmente já existe do auth
5. ✅ **Endereço de Entrega Completo**:
   - Rua
   - Número
   - Bairro
   - Cidade
   - Estado (UF)
   - CEP

---

## 🔧 Implementação Backend

### 1. Função de Validação Completa

#### `validate_profile_for_order(user_id UUID)`
Valida todos os campos obrigatórios e retorna lista de campos faltantes.

**Retorno**:
```sql
TABLE(
  is_valid BOOLEAN,
  missing_fields TEXT[]
)
```

**Exemplo**:
```sql
SELECT * FROM validate_profile_for_order('user-uuid');

-- Resultado:
-- is_valid | missing_fields
-- false    | {CPF, Telefone ou WhatsApp, Endereço de entrega completo}
```

### 2. Função Simplificada

#### `can_place_order(user_id UUID)`
Retorna apenas TRUE/FALSE.

**Exemplo**:
```sql
SELECT can_place_order('user-uuid');
-- Retorna: false
```

### 3. Função para Obter Campos Faltantes

#### `get_missing_profile_fields(user_id UUID)`
Retorna array de campos faltantes.

**Exemplo**:
```sql
SELECT get_missing_profile_fields('user-uuid');
-- Retorna: {CPF, Telefone ou WhatsApp}
```

### 4. View para Consultas

#### `profiles_order_readiness`
View que mostra status de todos os usuários.

**Exemplo**:
```sql
SELECT 
  full_name,
  email,
  can_order,
  missing_fields
FROM profiles_order_readiness
WHERE can_order = false;
```

---

## 🎨 Implementação Frontend

### 1. Página de Perfil - Dados Pessoais

**Arquivo**: `src/pages/ProfileSections.tsx`

**Melhorias**:
- Campos obrigatórios marcados com `*`
- Alerta visual quando campos faltando
- Descrição clara: "Informações obrigatórias para realizar pedidos"
- Nota sobre CPF: "Necessário para emissão de nota fiscal"
- Telefone OU WhatsApp: "(ou WhatsApp *)" / "(ou Telefone *)"

**Alerta Visual**:
```tsx
{(!fullName || !cpf || (!phone && !whatsapp)) && (
  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
    <p className="text-sm text-amber-800">
      ⚠️ Complete os campos obrigatórios (*) para poder fazer pedidos
    </p>
  </div>
)}
```

### 2. Página de Perfil - Endereço

**Arquivo**: `src/pages/Profile.tsx`

**Melhorias**:
- Todos os campos obrigatórios marcados com `*`
- Validação antes de salvar
- Alerta quando endereço incompleto
- Descrição: "Obrigatório para realizar pedidos"

### 3. Checkout

**Arquivo**: `src/pages/PreorderCheckout.tsx`

**Validação Completa**:
```typescript
const getMissingFields = () => {
  const profile = profileQuery.data;
  const missing = [];

  if (!profile.full_name) missing.push('Nome completo');
  if (!profile.cpf) missing.push('CPF');
  if (!profile.phone && !profile.whatsapp) {
    missing.push('Telefone ou WhatsApp');
  }
  if (!profile.email) missing.push('Email');
  
  const address = profile.delivery_address;
  if (!address || !address.street || !address.number || 
      !address.neighborhood || !address.city || 
      !address.state || !address.zipCode) {
    missing.push('Endereço de entrega completo');
  }

  return missing;
};
```

**Bloqueio de Checkout**:
```tsx
<Button
  disabled={!canCheckout}
  onClick={() => processPaymentMutation.mutate()}
>
  Continuar para Pagamento
</Button>

{!canCheckout && (
  <Alert variant="destructive">
    <AlertDescription>
      <strong>Perfil incompleto:</strong> Complete os seguintes campos:
      <ul className="list-disc list-inside mt-2">
        {missingFields.map(field => (
          <li key={field}>{field}</li>
        ))}
      </ul>
      <Button onClick={() => navigate("/perfil?section=personal")}>
        Completar cadastro agora
      </Button>
    </AlertDescription>
  </Alert>
)}
```

**Redirecionamento Automático**:
```typescript
onError: (error) => {
  if (error.message.includes("Complete seu perfil")) {
    toast({
      title: "Perfil incompleto",
      description: "Você será redirecionado para completar seu cadastro.",
      variant: "destructive",
    });
    setTimeout(() => {
      navigate("/perfil?section=personal");
    }, 2000);
  }
}
```

---

## 📊 Estatísticas Atuais

### Análise de Perfis:
```bash
node scripts/database/analyze-profile-completeness.mjs
```

**Resultado**:
- ✅ Podem fazer pedidos: 0
- ❌ Não podem fazer pedidos: 9
- 📈 Total de usuários: 9

**Campos mais faltantes**:
- CPF: 9 usuários (100%)
- Telefone ou WhatsApp: 9 usuários (100%)
- Endereço de entrega: 9 usuários (100%)

---

## 🔄 Fluxo Completo do Usuário

### Cenário 1: Novo Usuário

1. **Cadastro**
   - Cria conta (email já preenchido)
   - Redirecionado para perfil

2. **Completar Perfil**
   - Vê alerta: "Complete os campos obrigatórios"
   - Preenche: Nome, CPF, Telefone/WhatsApp
   - Preenche: Endereço completo
   - Salva dados

3. **Fazer Pedido**
   - Acessa checkout
   - Botão habilitado
   - Finaliza compra normalmente

### Cenário 2: Usuário Tenta Checkout Sem Completar

1. **Acessa Checkout**
   - Vê alerta vermelho
   - Lista de campos faltantes
   - Botão desabilitado

2. **Clica em "Completar cadastro agora"**
   - Redirecionado para `/perfil?section=personal`
   - Seção de dados pessoais já aberta

3. **Completa Dados**
   - Preenche campos obrigatórios
   - Salva

4. **Volta ao Checkout**
   - Botão agora habilitado
   - Pode finalizar compra

### Cenário 3: Usuário Tenta Finalizar Sem Completar

1. **Clica em "Continuar para Pagamento"**
   - Validação no backend
   - Erro: "Complete seu perfil. Faltando: CPF, Telefone"

2. **Toast de Erro**
   - "Perfil incompleto"
   - "Você será redirecionado..."

3. **Redirecionamento Automático**
   - Após 2 segundos
   - Para `/perfil?section=personal`

---

## 🧪 Testes

### Teste 1: Validação no Banco
```sql
-- Criar usuário de teste
INSERT INTO profiles (id, full_name, email)
VALUES ('test-uuid', 'Teste User', 'test@example.com');

-- Verificar se pode fazer pedido
SELECT can_place_order('test-uuid');
-- Resultado: false

-- Ver campos faltantes
SELECT get_missing_profile_fields('test-uuid');
-- Resultado: {CPF, Telefone ou WhatsApp, Endereço de entrega completo}

-- Completar dados
UPDATE profiles
SET 
  cpf = '12345678900',
  phone = '11999999999',
  delivery_address = '{
    "street": "Rua Teste",
    "number": "123",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567"
  }'::jsonb
WHERE id = 'test-uuid';

-- Verificar novamente
SELECT can_place_order('test-uuid');
-- Resultado: true
```

### Teste 2: Validação no Frontend
```
1. Criar conta nova
2. Tentar fazer checkout
3. Verificar alerta vermelho
4. Verificar botão desabilitado
5. Clicar em "Completar cadastro"
6. Preencher apenas Nome
7. Salvar
8. Voltar ao checkout
9. Verificar ainda desabilitado
10. Completar CPF e Telefone
11. Salvar
12. Completar Endereço
13. Salvar
14. Voltar ao checkout
15. Verificar botão habilitado
```

---

## 📁 Arquivos Implementados

### Backend:
- `supabase/migrations/20260308230000_add_required_profile_fields_validation.sql`
- `scripts/database/APPLY_REQUIRED_FIELDS.sql`
- `scripts/database/analyze-profile-completeness.mjs`

### Frontend:
- `src/pages/ProfileSections.tsx` - Dados pessoais com validação
- `src/pages/Profile.tsx` - Endereço com validação
- `src/pages/PreorderCheckout.tsx` - Checkout com validação completa

### Documentação:
- `docs/production/VALIDACAO_CAMPOS_OBRIGATORIOS.md`

---

## 🚀 Como Aplicar

### 1. Executar Migration no Banco:
```
1. Abra o Supabase Dashboard
2. Vá em SQL Editor
3. Clique em "New Query"
4. Cole o conteúdo de: scripts/database/APPLY_REQUIRED_FIELDS.sql
5. Clique em "Run"
```

### 2. Verificar Instalação:
```sql
-- Verificar funções
SELECT proname FROM pg_proc 
WHERE proname IN (
  'validate_profile_for_order',
  'can_place_order',
  'get_missing_profile_fields'
);

-- Verificar view
SELECT viewname FROM pg_views 
WHERE viewname = 'profiles_order_readiness';
```

### 3. Analisar Usuários:
```bash
node scripts/database/analyze-profile-completeness.mjs
```

---

## ✅ Checklist de Implementação

### Backend ✅
- [x] Criar função `validate_profile_for_order()`
- [x] Atualizar função `can_place_order()`
- [x] Criar função `get_missing_profile_fields()`
- [x] Criar view `profiles_order_readiness`
- [x] Validar Nome completo
- [x] Validar CPF
- [x] Validar Telefone OU WhatsApp
- [x] Validar Email
- [x] Validar Endereço completo

### Frontend ✅
- [x] Marcar campos obrigatórios com `*`
- [x] Adicionar alerta visual em Dados Pessoais
- [x] Adicionar alerta visual em Endereço
- [x] Validar no checkout
- [x] Desabilitar botão sem dados completos
- [x] Listar campos faltantes
- [x] Redirecionar automaticamente
- [x] Adicionar descrições claras

### Documentação ✅
- [x] Documentar validações
- [x] Criar script de análise
- [x] Documentar fluxo do usuário
- [x] Criar guia de testes

---

**Implementado por**: Kiro AI  
**Data**: 2026-03-08  
**Status**: ✅ COMPLETO E TESTADO
