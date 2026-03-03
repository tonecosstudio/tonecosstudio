# 🔄 Reiniciar Servidor de Desenvolvimento

## O Problema

O código foi atualizado, mas o erro 406 persiste porque:
1. O navegador está com cache do JavaScript antigo
2. O Vite (servidor de desenvolvimento) pode ter cache

## Solução Completa

### Passo 1: Parar o Servidor
No terminal onde o servidor está rodando, pressione:
```
Ctrl + C
```

### Passo 2: Limpar Cache do Vite
```bash
# Windows PowerShell
Remove-Item -Recurse -Force node_modules\.vite

# Ou no Git Bash / Linux / Mac
rm -rf node_modules/.vite
```

### Passo 3: Reiniciar o Servidor
```bash
npm run dev
```

### Passo 4: Limpar Cache do Navegador
1. Abra o site
2. Pressione **Ctrl + Shift + R** (Windows) ou **Cmd + Shift + R** (Mac)
3. Ou abra DevTools (F12) → Clique com botão direito no ícone de recarregar → "Esvaziar cache e recarregar forçadamente"

## Verificação

Após reiniciar, abra o Console do navegador (F12) e verifique:

### ❌ Query Antiga (Erro 406)
```
GET /subscriptions?select=...collections(id,name,slug)...
```

### ✅ Query Nova (Correta)
```
GET /subscriptions?select=...subscription_collections(collections(...))...
```

## Se Ainda Não Funcionar

### Opção 1: Verificar se o arquivo foi salvo
```bash
# Verificar a última modificação do arquivo
ls -la src/pages/MySubscriptions.tsx

# Ou no PowerShell
Get-Item src/pages/MySubscriptions.tsx | Select-Object LastWriteTime
```

### Opção 2: Modo Anônimo
1. Abra uma janela anônima/privada
2. Acesse o site
3. Teste se funciona

### Opção 3: Verificar se há outro arquivo fazendo a query
Pode haver outro componente ou hook fazendo a mesma query. Verifique:
- `src/components/subscription/*`
- `src/hooks/*`
- `src/services/*`

## Comandos Úteis

### Limpar tudo e reinstalar
```bash
# Parar servidor (Ctrl + C)

# Limpar cache do Vite
rm -rf node_modules/.vite

# Limpar cache do npm (opcional)
npm cache clean --force

# Reinstalar dependências (se necessário)
rm -rf node_modules
npm install

# Reiniciar
npm run dev
```

### Verificar se o Vite está usando cache
Ao iniciar o servidor, você deve ver:
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

Se aparecer "Pre-bundling dependencies", significa que está reconstruindo o cache.

## Dica

Para evitar problemas de cache durante desenvolvimento:
1. Abra DevTools (F12)
2. Vá em Network (Rede)
3. Marque "Disable cache"
4. Mantenha DevTools aberto

Isso garante que o navegador sempre busque a versão mais recente.
