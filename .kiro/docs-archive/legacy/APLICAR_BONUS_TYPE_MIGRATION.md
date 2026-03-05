# 🚀 Aplicar Migration: Campo bonus_type

## 📋 O Que Foi Feito

### 1. Migration Criada
**Arquivo:** `supabase/migrations/20260510000002_add_bonus_type_field.sql`

**O que faz:**
- Adiciona campo `bonus_type` à tabela `subscription_credit_plans`
- Valores possíveis: `'pieces'` (peças extras) ou `'coins'` (coins extras)
- Valor padrão: `'pieces'`
- Atualiza planos existentes para usar o padrão

### 2. Scripts de Aplicação
- **PowerShell:** `aplicar-bonus-type.ps1`
- **Node.js:** `aplicar-bonus-type.mjs`

### 3. Código Atualizado
**Arquivo:** `src/pages/admin/AdminPlansConfiguration.tsx`

**Mudanças:**
- ✅ Estado `bonusType` agora carrega do banco de dados
- ✅ Campo `bonus_type` é salvo ao criar/editar plano
- ✅ Lógica de cálculo ajustada para ambos os tipos
- ✅ Interface já estava pronta (implementada anteriormente)

---

## 🔧 Como Aplicar a Migration

### Opção 1: Via Node.js (Recomendado)

```bash
node aplicar-bonus-type.mjs
```

### Opção 2: Via PowerShell

```powershell
.\aplicar-bonus-type.ps1
```

### Opção 3: Manual via Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Clique em **New Query**
5. Cole o conteúdo de `supabase/migrations/20260510000002_add_bonus_type_field.sql`
6. Clique em **Run**

---

## ✅ Verificar se Funcionou

### 1. Verificar no Banco

Execute no SQL Editor do Supabase:

```sql
-- Ver estrutura da tabela
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'subscription_credit_plans' 
AND column_name = 'bonus_type';

-- Ver planos existentes
SELECT id, name, plan_type, bonus_type, base_credits, bonus_credits 
FROM subscription_credit_plans;
```

**Resultado esperado:**
- Campo `bonus_type` existe
- Tipo: `text`
- Padrão: `'pieces'`
- Planos existentes têm `bonus_type = 'pieces'`

### 2. Testar na Interface

1. Acesse: http://localhost:8080/admin/planos
2. Aba "Planos de Assinatura"
3. Clique em um plano (ex: Semestral)
4. Vá para a tab "Peças"
5. Veja o card "Tipo de Bônus" no topo
6. Clique em "Coins Extras"
7. Configure coins bônus diretos
8. Salve
9. Recarregue a página
10. Verifique se o tipo de bônus foi mantido

---

## 🎯 Como Funciona Agora

### Fluxo Completo

#### 1. Carregar Plano
```typescript
// Estado carrega do banco
const [bonusType, setBonusType] = useState<'pieces' | 'coins'>(
  existingPlan?.bonus_type || 'pieces'
);
```

#### 2. Escolher Tipo de Bônus
- Usuário clica em "Peças Extras" OU "Coins Extras"
- Estado `bonusType` é atualizado
- Interface muda conforme o tipo

#### 3. Configurar Bônus

**Se Peças Extras:**
```
Peças Bônus: [1]
Coins por Peça Bônus: [100]

Cálculo:
bonus_credits = 1 × 100 = 100 coins
```

**Se Coins Extras:**
```
Coins Bônus Diretos: [50]

Cálculo:
bonus_credits = 50 coins (direto)
```

#### 4. Salvar
```typescript
const saveData = {
  // ... outros campos
  bonus_type: bonusType, // 'pieces' ou 'coins'
  bonus_credits: formData.bonus_credits,
  pieces_per_subscription: formData.total_pieces,
};
```

#### 5. Cálculos Automáticos

**Peças Extras:**
```typescript
total_pieces = base_pieces + bonus_pieces
bonus_credits = bonus_pieces × coins_per_bonus_piece
```

**Coins Extras:**
```typescript
total_pieces = base_pieces (sem bônus)
bonus_credits = valor definido diretamente
```

---

## 📊 Exemplos de Uso

### Exemplo 1: Plano Anual com Peças Extras

**Configuração:**
```
Tipo de Bônus: Peças Extras
Peças Base: 12
Peças Bônus: 1
Coins/Peça Base: 100
Coins/Peça Bônus: 100
```

**Resultado no Banco:**
```sql
bonus_type = 'pieces'
pieces_per_subscription = 13
base_credits = 1200
bonus_credits = 100
```

**Interpretação:**
- Cliente recebe 13 entregas (12 + 1)
- Total: 1.300 coins

### Exemplo 2: Plano Semestral com Coins Extras

**Configuração:**
```
Tipo de Bônus: Coins Extras
Peças Base: 6
Coins Bônus Diretos: 50
Coins/Peça Base: 100
```

**Resultado no Banco:**
```sql
bonus_type = 'coins'
pieces_per_subscription = 6
base_credits = 600
bonus_credits = 50
```

**Interpretação:**
- Cliente recebe 6 entregas
- Total: 650 coins (600 + 50 extras)

---

## 🐛 Troubleshooting

### Erro: "column bonus_type does not exist"

**Causa:** Migration não foi aplicada

**Solução:**
1. Aplique a migration usando um dos métodos acima
2. Reinicie o servidor: `npm run dev`
3. Recarregue a página

### Erro: "invalid input value for enum"

**Causa:** Valor inválido sendo salvo

**Solução:**
1. Verifique se o valor é `'pieces'` ou `'coins'`
2. Verifique a constraint no banco:
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'subscription_credit_plans'::regclass 
AND conname LIKE '%bonus_type%';
```

### Tipo de Bônus Não Persiste

**Causa:** Campo não está sendo salvo

**Solução:**
1. Verifique se o código tem `bonus_type: bonusType` no `saveData`
2. Verifique se a migration foi aplicada
3. Veja os logs do console para erros

---

## 🎉 Resultado Final

Após aplicar a migration e testar:

✅ Campo `bonus_type` existe no banco  
✅ Planos salvam o tipo de bônus escolhido  
✅ Ao recarregar, o tipo correto é restaurado  
✅ Cálculos funcionam para ambos os tipos  
✅ Interface mostra campos corretos por tipo  

**Sistema de bônus flexível totalmente funcional!** 🚀

---

## 📝 Próximos Passos

1. ✅ Aplicar migration
2. ✅ Testar na interface
3. ✅ Configurar planos com diferentes tipos
4. ✅ Verificar cálculos
5. ✅ Documentar para o time

---

## 🔗 Arquivos Relacionados

- Migration: `supabase/migrations/20260510000002_add_bonus_type_field.sql`
- Script Node: `aplicar-bonus-type.mjs`
- Script PowerShell: `aplicar-bonus-type.ps1`
- Código: `src/pages/admin/AdminPlansConfiguration.tsx`
- Documentação: `SISTEMA_BONUS_FLEXIVEL.md`
