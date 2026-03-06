# Como Limpar o Cache e Resolver o Erro 400

O erro 400 que você está vendo é causado pelo cache do navegador ou do Vite que ainda está usando a versão antiga do código.

## Solução Rápida

### 1. Parar o servidor de desenvolvimento
Pressione `Ctrl+C` no terminal onde o Vite está rodando.

### 2. Limpar o cache do Vite
```bash
rm -rf node_modules/.vite
```

Ou no PowerShell:
```powershell
Remove-Item -Recurse -Force node_modules/.vite
```

### 3. Reiniciar o servidor
```bash
npm run dev
```

### 4. Limpar o cache do navegador
No navegador, pressione:
- **Chrome/Edge**: `Ctrl + Shift + Delete` ou `F12` → aba Network → marcar "Disable cache"
- **Firefox**: `Ctrl + Shift + Delete`

Ou simplesmente abra em modo anônimo/privado para testar.

### 5. Fazer um Hard Refresh
Com a página aberta, pressione:
- **Windows**: `Ctrl + F5` ou `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

## O Que Foi Corrigido

As seguintes alterações foram feitas no código:

### `src/services/standalone-purchase-service.ts`
- Removido os aliases incorretos (`user:`, `collection:`, `cycle:`)
- Removido a tentativa de join com `collection_characters` que não existe
- Alterado `price_full` para `slug` no join de collections

### `src/pages/admin/StandalonePurchases.tsx`
- Atualizado para usar `purchase.profiles` em vez de `purchase.user`
- Atualizado para usar `purchase.collections` em vez de `purchase.collection`
- Atualizado para usar `purchase.cycles` em vez de `purchase.cycle`

## Verificação

Após limpar o cache, a URL da requisição deve estar assim:
```
/rest/v1/standalone_purchases?select=*,profiles(id,full_name,email),collections(id,name,slug),cycles(id,cycle_number,month,year)
```

E **NÃO** deve mais incluir `collection_characters`.
