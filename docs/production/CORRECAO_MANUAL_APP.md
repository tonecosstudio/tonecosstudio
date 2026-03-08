# Correção Manual do App.tsx

**Data**: 2026-03-08  
**Status**: ⚠️ Requer Ação Manual  
**Prioridade**: Alta

## ⚠️ Problema

O arquivo `src/App.tsx` ficou com alguns erros durante a migração automática. Você precisa corrigir manualmente.

## 🔧 Correção Manual (5 minutos)

### 1. Abra o arquivo
Abra `src/App.tsx` no seu editor

### 2. Procure pela linha ~393 (rota de pedidos)

Deve estar assim (COM ERRO):
```typescript
          <Route
            path="/admin/pedidos"
            element={
              <RequireAdmin>
                <OrdersPage />
              </RequireAdmin>
            }
          />
          
          {/* Página Antiga de Pedidos - Backup */}
          <Route
            path="/admin/pedidos-old"
            element={
              <RequireAdmin>
                // FALTA FECHAR AQUI
```

### 3. Complete a rota de backup

Adicione o fechamento correto:
```typescript
          <Route
            path="/admin/pedidos"
            element={
              <RequireAdmin>
                <OrdersPage />
              </RequireAdmin>
            }
          />
          
          {/* Página Antiga de Pedidos - Backup */}
          <Route
            path="/admin/pedidos-old"
            element={
              <RequireAdmin>
                <OrdersPageOld />
              </RequireAdmin>
            }
          />
```

### 4. Verifique os imports (linha ~51)

Devem estar assim:
```typescript
import OrdersPageOld from "./pages/admin/OrdersPageOld";
import OrdersPage from "./pages/admin/OrdersPage";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
```

Se houver duplicatas de `AdminSubscriptions`, remova uma.

### 5. Salve o arquivo

Pressione Ctrl+S para salvar.

### 6. Reinicie o servidor

```bash
# Pare o servidor (Ctrl+C)
# Inicie novamente
npm run dev
```

## ✅ Verificação

Após corrigir, acesse:
```
http://localhost:5173/admin/pedidos
```

Você deve ver:
- ✅ Página carrega sem erros
- ✅ Estatísticas no topo
- ✅ Filtros visuais (cards grandes)
- ✅ Tabela de pedidos

## 🐛 Se Ainda Houver Erros

### Erro: "OrdersPageV2 is not defined"

Procure por `<OrdersPageV2 />` no arquivo e troque por `<OrdersPage />`.

### Erro: "OrdersPageOld is not defined"

Verifique se o import está correto:
```typescript
import OrdersPageOld from "./pages/admin/OrdersPageOld";
```

### Erro de Sintaxe JSX

Verifique se todas as tags `<Route>` estão fechadas corretamente com `/>`.

## 📝 Estrutura Correta Final

```typescript
// IMPORTS (linha ~51)
import OrdersPageOld from "./pages/admin/OrdersPageOld";
import OrdersPage from "./pages/admin/OrdersPage";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";

// ROTAS (linha ~393)
<Route
  path="/admin/pedidos"
  element={
    <RequireAdmin>
      <OrdersPage />
    </RequireAdmin>
  }
/>

{/* Página Antiga de Pedidos - Backup */}
<Route
  path="/admin/pedidos-old"
  element={
    <RequireAdmin>
      <OrdersPageOld />
    </RequireAdmin>
  }
/>
```

## 🎯 Resultado Esperado

Após a correção:
- `/admin/pedidos` → Nova página (com filtros visuais)
- `/admin/pedidos-old` → Página antiga (backup)

## 📞 Suporte

Se precisar de ajuda, compartilhe:
1. Screenshot do erro no console
2. Linhas 50-55 do App.tsx (imports)
3. Linhas 390-410 do App.tsx (rotas)

---

**Tempo estimado**: 5 minutos  
**Dificuldade**: Fácil  
**Ação**: Abra `src/App.tsx` e complete as tags JSX
