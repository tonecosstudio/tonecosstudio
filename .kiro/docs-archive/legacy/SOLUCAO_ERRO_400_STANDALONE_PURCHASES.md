# Solução Completa: Erro 400 em Standalone Purchases

## 🔍 Problema Identificado

O erro 400 (Bad Request) ocorre porque a query está tentando:
1. Selecionar um campo `character_id` que não existe na tabela `standalone_purchases`
2. Fazer join com `collection_characters` que não tem relacionamento configurado
3. Usar aliases incorretos nas queries (`user:`, `collection:`, `cycle:`)

## ✅ Correções Aplicadas

### 1. Arquivo: `src/services/standalone-purchase-service.ts`

**Função `getAllStandalonePurchases`:**
```typescript
// ❌ ANTES (INCORRETO)
.select(`
  *,
  user:profiles(id, full_name, email),
  collection:collections(id, name, price_full),
  cycle:cycles(id, cycle_number, month, year)
`, { count: 'exact' });

// ✅ DEPOIS (CORRETO)
.select(`
  *,
  profiles(id, full_name, email),
  collections(id, name, slug),
  cycles(id, cycle_number, month, year)
`, { count: 'exact' });
```

**Função `searchStandalonePurchasesByCustomer`:**
```typescript
// ❌ ANTES (INCORRETO)
.select(`
  *,
  user:profiles(id, full_name, email),
  collection:collections(id, name, price_full),
  cycle:cycles(id, cycle_number, month, year)
`)

// ✅ DEPOIS (CORRETO)
.select(`
  *,
  profiles(id, full_name, email),
  collections(id, name, slug),
  cycles(id, cycle_number, month, year)
`)
```

### 2. Arquivo: `src/pages/admin/StandalonePurchases.tsx`

**Acesso aos dados:**
```typescript
// ❌ ANTES (INCORRETO)
purchase.user?.full_name
purchase.user?.email
purchase.collection?.name
purchase.collection?.price_full
purchase.cycle

// ✅ DEPOIS (CORRETO)
purchase.profiles?.full_name
purchase.profiles?.email
purchase.collections?.name
purchase.price_full  // campo direto da tabela
purchase.cycles
```

## 🚀 Passos para Resolver

### Passo 1: Parar o Servidor
```bash
# Pressione Ctrl+C no terminal do Vite
```

### Passo 2: Limpar Cache do Vite
```bash
# Linux/Mac
rm -rf node_modules/.vite

# Windows PowerShell
Remove-Item -Recurse -Force node_modules/.vite

# Windows CMD
rmdir /s /q node_modules\.vite
```

### Passo 3: Limpar Cache do Node
```bash
npm cache clean --force
```

### Passo 4: Regenerar Tipos do Supabase (Opcional mas Recomendado)
```bash
# Opção 1: Com Supabase CLI
supabase gen types typescript --project-id pabxpvqwtvbjaunjejud > src/integrations/supabase/types.ts

# Opção 2: Via Dashboard
# Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/api
# Copie os tipos TypeScript e cole em src/integrations/supabase/types.ts
```

### Passo 5: Reinstalar Dependências (se necessário)
```bash
npm install
```

### Passo 6: Reiniciar o Servidor
```bash
npm run dev
```

### Passo 7: Limpar Cache do Navegador

**Chrome/Edge:**
1. Pressione `F12` para abrir DevTools
2. Vá para a aba "Network"
3. Marque "Disable cache"
4. Pressione `Ctrl+Shift+Delete` e limpe o cache

**Ou simplesmente:**
- Abra em modo anônimo/privado
- Pressione `Ctrl+F5` para hard refresh

## 🔍 Como Verificar se Funcionou

### 1. Verifique a URL da Requisição no Console

**❌ URL INCORRETA (com erro):**
```
/rest/v1/standalone_purchases?select=id,status,user_id,collection_id,cycle_id,character_id,...,collection_characters(id,name,image_url)
```

**✅ URL CORRETA (sem erro):**
```
/rest/v1/standalone_purchases?select=*,profiles(id,full_name,email),collections(id,name,slug),cycles(id,cycle_number,month,year)
```

### 2. Verifique o Console do Navegador

Não deve mais aparecer:
- ❌ `GET .../standalone_purchases?...collection_characters... 400 (Bad Request)`

Deve aparecer:
- ✅ `GET .../standalone_purchases?...profiles...collections...cycles... 200 (OK)`

### 3. Verifique a Página Admin

A página `/admin/standalone-purchases` deve:
- ✅ Carregar sem erros
- ✅ Mostrar a lista de compras (se houver dados)
- ✅ Mostrar "Nenhuma compra encontrada" (se não houver dados)

## 🐛 Se o Erro Persistir

### 1. Verifique se o código foi salvo corretamente
```bash
# Procure por referências antigas
grep -r "collection_characters" src/
grep -r "user:profiles" src/
grep -r "collection:collections" src/
```

Não deve retornar nenhum resultado.

### 2. Verifique se há múltiplas instâncias do servidor rodando
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5173
kill -9 <PID>
```

### 3. Tente em outro navegador
- Use Firefox, Chrome, Edge ou Safari
- Teste em modo anônimo/privado

### 4. Verifique os logs do servidor Vite
Procure por mensagens de erro ou avisos no terminal onde o Vite está rodando.

## 📝 Resumo das Mudanças

| Arquivo | Mudança | Motivo |
|---------|---------|--------|
| `standalone-purchase-service.ts` | Removido aliases `user:`, `collection:`, `cycle:` | Aliases causavam erro 400 |
| `standalone-purchase-service.ts` | Removido join com `collection_characters` | Tabela/relacionamento não existe |
| `standalone-purchase-service.ts` | Alterado `price_full` para `slug` em collections | Campo correto para join |
| `StandalonePurchases.tsx` | Alterado `purchase.user` para `purchase.profiles` | Reflete estrutura real da query |
| `StandalonePurchases.tsx` | Alterado `purchase.collection` para `purchase.collections` | Reflete estrutura real da query |
| `StandalonePurchases.tsx` | Alterado `purchase.cycle` para `purchase.cycles` | Reflete estrutura real da query |

## 🎯 Resultado Esperado

Após seguir todos os passos:
- ✅ Nenhum erro 400 no console
- ✅ Página de Standalone Purchases carrega corretamente
- ✅ Dados são exibidos com informações do usuário, coleção e ciclo
- ✅ Filtros e busca funcionam normalmente
