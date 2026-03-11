# 🔄 Instruções: Limpar Cache do Navegador

**Data:** 9 de Março de 2026  
**Motivo:** Erro 400 persiste após migration aplicada

---

## 🐛 Problema

Mesmo após aplicar a migration que adiciona as colunas `price_full`, `price_pix` e `deposit_amount` à tabela `pricing_tiers`, o erro 400 ainda aparece:

```
POST /rest/v1/pricing_tiers?columns="name","price_full","price_pix","deposit_amount","is_active","description" 400 (Bad Request)
```

### Causa

O navegador está usando uma versão em cache da API do Supabase que ainda não conhece as novas colunas.

---

## ✅ Solução: Hard Refresh

### Windows / Linux

**Opção 1: Ctrl + F5**
1. Pressione `Ctrl + F5` juntos
2. Aguarde a página recarregar completamente

**Opção 2: Ctrl + Shift + R**
1. Pressione `Ctrl + Shift + R` juntos
2. Aguarde a página recarregar completamente

**Opção 3: Limpar Cache Manualmente**
1. Pressione `Ctrl + Shift + Delete`
2. Selecione "Imagens e arquivos em cache"
3. Selecione "Última hora" ou "Tudo"
4. Clique em "Limpar dados"
5. Feche e reabra o navegador

### Mac

**Opção 1: Cmd + Shift + R**
1. Pressione `Cmd + Shift + R` juntos
2. Aguarde a página recarregar completamente

**Opção 2: Limpar Cache Manualmente**
1. Pressione `Cmd + Shift + Delete`
2. Selecione "Imagens e arquivos em cache"
3. Selecione "Última hora" ou "Tudo"
4. Clique em "Limpar dados"
5. Feche e reabra o navegador

---

## 🧪 Como Verificar se Funcionou

### Passo 1: Abrir DevTools
1. Pressione `F12` (ou `Cmd + Option + I` no Mac)
2. Vá para aba "Network"
3. Marque "Disable cache"

### Passo 2: Testar a Página
1. Vá para Admin > Configuração de Planos
2. Tente salvar um plano
3. Verifique o console

### Resultado Esperado
- ✅ Nenhum erro 400
- ✅ Plano salvo com sucesso
- ✅ Toast de confirmação aparece

### Se Ainda Houver Erro
- ❌ Erro 400 persiste
- 🔍 Verificar mensagem de erro específica
- 📞 Solicitar assistência com screenshot

---

## 🔧 Solução Alternativa: Modo Anônimo

Se o hard refresh não funcionar, tente em modo anônimo:

### Chrome / Edge
1. Pressione `Ctrl + Shift + N` (Windows/Linux)
2. Ou `Cmd + Shift + N` (Mac)
3. Acesse o sistema
4. Faça login
5. Teste a funcionalidade

### Firefox
1. Pressione `Ctrl + Shift + P` (Windows/Linux)
2. Ou `Cmd + Shift + P` (Mac)
3. Acesse o sistema
4. Faça login
5. Teste a funcionalidade

---

## 🔍 Verificação Técnica

### Verificar se Colunas Existem no Banco

Execute no SQL Editor do Supabase:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pricing_tiers'
ORDER BY ordinal_position;
```

### Resultado Esperado

Deve mostrar todas as colunas, incluindo:
- `price_full` (numeric)
- `price_pix` (numeric)
- `deposit_amount` (numeric)

### Verificar Dados

```sql
SELECT 
  name,
  price_brl,
  price_full,
  price_pix,
  deposit_amount
FROM pricing_tiers
LIMIT 5;
```

### Resultado Esperado

Deve mostrar os dados com as novas colunas preenchidas.

---

## 📊 Checklist de Troubleshooting

- [ ] Fiz hard refresh (Ctrl+F5)
- [ ] Limpei cache do navegador
- [ ] Fechei e reabri o navegador
- [ ] Testei em modo anônimo
- [ ] Verifiquei que colunas existem no banco
- [ ] Verifiquei que dados estão corretos
- [ ] Ainda há erro?

---

## 🚨 Se Nada Funcionar

### Opção 1: Aguardar Cache Expirar
O cache do PostgREST pode levar alguns minutos para expirar. Aguarde 5-10 minutos e tente novamente.

### Opção 2: Reiniciar Servidor de Desenvolvimento
Se estiver em desenvolvimento local:

```bash
# Parar servidor
Ctrl + C

# Limpar cache do npm/node
npm cache clean --force

# Reiniciar servidor
npm run dev
```

### Opção 3: Verificar Logs do Supabase
1. Ir para Dashboard do Supabase
2. Logs > API Logs
3. Verificar se há erros relacionados a `pricing_tiers`

### Opção 4: Forçar Reload do PostgREST
Execute no SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
```

---

## 📝 Notas Importantes

### Cache do Navegador
- O navegador armazena em cache as respostas da API
- Isso melhora a performance mas pode causar problemas após mudanças no schema
- Hard refresh força o navegador a buscar dados novos

### Cache do PostgREST
- O PostgREST (API do Supabase) também tem cache
- Ele recarrega automaticamente após migrations
- Mas pode levar alguns segundos

### Cache do Supabase JS
- A biblioteca Supabase JS pode ter cache interno
- Recarregar a página limpa esse cache

---

## ✅ Confirmação

Após limpar o cache e testar, você deve conseguir:

1. ✅ Acessar Admin > Configuração de Planos
2. ✅ Criar novo plano
3. ✅ Editar plano existente
4. ✅ Salvar sem erros
5. ✅ Ver toast de confirmação

---

## 📞 Precisa de Ajuda?

Se após seguir todos os passos o erro persistir:

1. Tire screenshot do erro completo
2. Tire screenshot do resultado da query SQL
3. Verifique se está logado como admin
4. Solicite assistência com as informações acima

---

**Criado por:** Kiro AI Assistant  
**Data:** 9 de Março de 2026  
**Versão:** 1.0

---

## 🎯 TL;DR (Resumo Rápido)

1. Pressione `Ctrl + F5` (Windows/Linux) ou `Cmd + Shift + R` (Mac)
2. Aguarde página recarregar
3. Teste novamente
4. Se não funcionar, limpe cache completo do navegador
5. Se ainda não funcionar, aguarde 5 minutos e tente novamente
