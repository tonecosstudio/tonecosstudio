# 🔄 Como Limpar o Cache do Navegador

## Problema

O erro 406 ainda aparece porque o navegador está usando código JavaScript em cache (antigo). As correções foram aplicadas no código, mas o navegador não recarregou.

## Solução: Hard Refresh (Recarregar Forçado)

### Windows/Linux
1. Pressione **Ctrl + Shift + R**
   OU
2. Pressione **Ctrl + F5**
   OU
3. Abra DevTools (F12) → Clique com botão direito no ícone de recarregar → "Esvaziar cache e recarregar forçadamente"

### Mac
1. Pressione **Cmd + Shift + R**
   OU
2. Abra DevTools (Cmd + Option + I) → Clique com botão direito no ícone de recarregar → "Empty Cache and Hard Reload"

## Alternativa: Limpar Cache Manualmente

### Chrome/Edge
1. Abra DevTools (F12)
2. Vá em **Application** (ou Aplicativo)
3. No menu lateral, clique em **Storage** → **Clear site data**
4. Marque "Cached images and files"
5. Clique em "Clear site data"
6. Recarregue a página (F5)

### Firefox
1. Abra DevTools (F12)
2. Vá em **Storage** (ou Armazenamento)
3. Clique com botão direito em **Cache Storage**
4. Selecione "Delete All"
5. Recarregue a página (F5)

## Verificar se Funcionou

Após limpar o cache:

1. Abra o Console do navegador (F12 → Console)
2. Recarregue a página
3. Verifique se o erro 406 desapareceu
4. A query deve mostrar `subscription_collections` em vez de `collections` diretamente

### Query Antiga (Erro 406)
```
GET /subscriptions?select=...collections(id,name,slug)...
```

### Query Nova (Correta)
```
GET /subscriptions?select=...subscription_collections(collections(id,name,slug))...
```

## Se Ainda Não Funcionar

### Opção 1: Modo Anônimo/Privado
1. Abra uma janela anônima (Ctrl + Shift + N no Chrome)
2. Acesse o site
3. Teste se funciona

### Opção 2: Reiniciar o Servidor de Desenvolvimento
```bash
# Pare o servidor (Ctrl + C)
# Limpe o cache do Vite
rm -rf node_modules/.vite

# Reinicie
npm run dev
```

### Opção 3: Verificar se o Build Está Atualizado
```bash
# Se estiver usando build de produção
npm run build
```

## Por Que Isso Acontece?

O Vite (bundler) e o navegador fazem cache agressivo de arquivos JavaScript para melhorar performance. Quando você faz mudanças no código:

1. **Desenvolvimento**: O Vite geralmente detecta e recarrega (HMR)
2. **Mas às vezes**: O navegador mantém cache antigo
3. **Solução**: Hard refresh força o navegador a baixar tudo novamente

## Dica para Desenvolvimento

Para evitar esse problema durante desenvolvimento:

1. Abra DevTools (F12)
2. Vá em **Network** (Rede)
3. Marque a opção **"Disable cache"** (Desabilitar cache)
4. Mantenha o DevTools aberto enquanto desenvolve

Isso garante que o navegador sempre busque a versão mais recente do código.
