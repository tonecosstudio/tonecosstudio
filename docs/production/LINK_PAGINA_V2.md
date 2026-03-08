# Link da Nova Página de Pedidos V2

**Data**: 2026-03-08  
**Status**: ✅ Rota Adicionada

## 🔗 Link da Página

### Desenvolvimento
```
http://localhost:5173/admin/pedidos-v2
```

### Produção
```
https://seu-dominio.com/admin/pedidos-v2
```

## 📍 Rotas Disponíveis

### Página Antiga (atual)
- **URL**: `/admin/pedidos`
- **Componente**: `OrdersPage`
- **Status**: Ativa (será substituída)

### Página Nova (V2)
- **URL**: `/admin/pedidos-v2`
- **Componente**: `OrdersPageV2`
- **Status**: ✅ Ativa para teste

## 🚀 Como Acessar

### 1. Iniciar o Servidor
```bash
npm run dev
# ou
yarn dev
# ou
bun dev
```

### 2. Fazer Login como Admin
Acesse: `http://localhost:5173/login`

### 3. Acessar a Nova Página
Navegue para: `http://localhost:5173/admin/pedidos-v2`

## 🎨 O Que Você Verá

### Topo da Página
```
┌─────────────────────────────────────────────────────────┐
│ Pedidos (V2 - Nova)                                     │
│ Gerencie todos os pedidos: assinaturas, avulsos, etc   │
└─────────────────────────────────────────────────────────┘
```

### Estatísticas (5 cards)
```
┌─────┬─────┬─────┬─────┬─────┐
│Total│Assn.│Avuls│Pag. │Orç. │
│ 299 │ 234 │ 45  │ 12  │  8  │
└─────┴─────┴─────┴─────┴─────┘
```

### Filtro de Tipo (cards grandes)
```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  📦  │ │  🛒  │ │  💳  │ │  📄  │ │  📊  │
│Todos │ │Avulso│ │ Pag. │ │Orçam.│ │Stats │
│ 299  │ │  45  │ │  12  │ │   8  │ │      │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘
         ↑ VERDE DESTACADO
```

## ✅ Checklist de Teste

- [ ] Página carrega sem erros
- [ ] Estatísticas aparecem no topo
- [ ] Filtro de tipo aparece (cards grandes)
- [ ] Clique em "Avulsos" (verde) funciona
- [ ] Tabela mostra pedidos filtrados
- [ ] Console mostra logs detalhados (F12)

## 🔍 Verificar no Console

Abra o console (F12) e procure por:

```
🔍 [OrdersV2] Fetching orders with filters: {...}
📦 [OrdersV2] Deliveries: X items
🛒 [OrdersV2] Purchases: Y items  ← PEDIDOS AVULSOS
💰 [OrdersV2] Payments: Z items
📋 [OrdersV2] Quotes: W items
✅ [OrdersV2] Total unified orders: N
⏱️ [OrdersV2] Query completed in XXms
```

## 🎯 Teste Rápido

1. **Acesse**: `http://localhost:5173/admin/pedidos-v2`
2. **Clique**: Card verde "Avulsos"
3. **Verifique**: Tabela mostra só pedidos avulsos (🛒)
4. **Console**: Deve mostrar logs detalhados

## 📊 Comparação

### Página Antiga (`/admin/pedidos`)
- ❌ Pedidos avulsos podem não aparecer
- ❌ Filtros pequenos e discretos
- ❌ Sem estatísticas
- ❌ Sem logs de debug

### Página Nova (`/admin/pedidos-v2`)
- ✅ Todos os tipos aparecem
- ✅ Filtros grandes e visuais
- ✅ Estatísticas no topo
- ✅ Logs detalhados
- ✅ Separação clara entre tipos

## 🔄 Migração Futura

Quando a página V2 estiver validada:

1. Fazer backup da página antiga
2. Trocar rota `/admin/pedidos` para usar `OrdersPageV2`
3. Manter página antiga por 1 semana
4. Remover página antiga

## 📝 Notas

- A rota foi adicionada em `src/App.tsx`
- Requer autenticação de admin
- Usa componente `RequireAdmin`
- Página antiga continua funcionando em `/admin/pedidos`

## 🐛 Se Não Funcionar

### Erro 404
- Verifique se o servidor está rodando
- Verifique se fez login como admin
- Limpe o cache do navegador

### Página em Branco
- Abra o console (F12)
- Procure por erros em vermelho
- Verifique se todos os imports estão corretos

### Sem Dados
- Execute SQL: `SELECT COUNT(*) FROM standalone_purchases;`
- Verifique se há dados no banco
- Crie dados de teste se necessário

## 📚 Documentação Relacionada

- `RESUMO_FINAL_V2.md` - Resumo completo
- `TESTE_NOVA_PAGINA.md` - Guia de teste
- `MELHORIAS_FILTROS_V2.md` - Detalhes dos filtros

---

**Link direto**: `http://localhost:5173/admin/pedidos-v2`

Acesse agora e veja os filtros visuais em ação! 🚀
