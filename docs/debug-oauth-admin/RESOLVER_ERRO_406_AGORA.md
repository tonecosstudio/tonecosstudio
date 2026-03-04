# ⚡ RESOLVER ERRO 406 - AÇÃO IMEDIATA

## ✅ Correções Já Aplicadas no Código

Os seguintes arquivos foram corrigidos:
- ✅ `src/pages/MySubscriptions.tsx` - Query corrigida
- ✅ `src/pages/admin/AdminUserDetails.tsx` - Query corrigida  
- ✅ `src/pages/MyPaymentsPage.tsx` - Realtime adicionado

## 🔥 O Que Fazer AGORA

### 1. Parar o Servidor
No terminal, pressione:
```
Ctrl + C
```

### 2. Limpar Cache do Vite
```bash
# Windows PowerShell
Remove-Item -Recurse -Force node_modules\.vite

# Git Bash / Linux / Mac
rm -rf node_modules/.vite
```

### 3. Reiniciar o Servidor
```bash
npm run dev
```

### 4. Limpar Cache do Navegador
**Opção A - Hard Refresh (Mais Rápido)**
- Windows: **Ctrl + Shift + R**
- Mac: **Cmd + Shift + R**

**Opção B - DevTools**
1. Abra DevTools (F12)
2. Clique com botão direito no ícone de recarregar
3. Selecione "Esvaziar cache e recarregar forçadamente"

### 5. Verificar
Abra o Console (F12) e verifique se o erro 406 desapareceu.

## 🎯 Por Que Isso É Necessário?

O código foi corrigido, mas:
1. **Vite** pode ter cache do código antigo
2. **Navegador** está usando JavaScript em cache
3. **Hard refresh** força ambos a recarregarem

## ✅ Como Saber se Funcionou?

### Antes (Erro 406)
```
GET /subscriptions?select=...collections(id,name,slug)...
❌ 406 Not Acceptable
```

### Depois (Correto)
```
GET /subscriptions?select=...subscription_collections(collections(...))...
✅ 200 OK
```

## 🆘 Se Ainda Não Funcionar

### Teste em Modo Anônimo
1. Abra janela anônima (Ctrl + Shift + N)
2. Acesse o site
3. Se funcionar = problema de cache
4. Se não funcionar = outro problema

### Verificar Arquivo
```bash
# Ver última modificação
Get-Item src/pages/MySubscriptions.tsx | Select-Object LastWriteTime
```

Deve mostrar data/hora recente (hoje).

### Limpar Tudo
```bash
# Parar servidor
Ctrl + C

# Limpar cache do Vite
rm -rf node_modules/.vite

# Limpar cache do npm
npm cache clean --force

# Reiniciar
npm run dev
```

## 📞 Próximos Passos

Após resolver o erro 406:
1. ✅ Subscriptions devem carregar corretamente
2. ✅ Pagamentos aprovados aparecem em tempo real
3. ✅ Sem erros no console

## 📚 Documentação

- `LIMPAR_CACHE_NAVEGADOR.md` - Guia detalhado de cache
- `REINICIAR_SERVIDOR.md` - Guia de reinicialização
- `CORRECOES_COMPLETAS_APLICADAS.md` - Todas as correções
- `DIAGNOSTICO_PAGAMENTO_NAO_APARECE.md` - Análise do problema

---

**TL;DR**: Pare o servidor → Limpe cache do Vite → Reinicie → Hard refresh no navegador (Ctrl+Shift+R)
