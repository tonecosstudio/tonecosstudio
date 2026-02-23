# Guia de Teste - Correções Aplicadas

## ✅ Status dos Serviços

### Frontend
- **URL:** http://localhost:5173 (ou porta exibida no terminal)
- **Status:** ✅ Rodando
- **HMR:** ✅ Ativo (mudanças aplicadas automaticamente)

### Backend (Supabase)
- **API:** http://127.0.0.1:54321
- **Studio:** http://127.0.0.1:54323
- **Database:** postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Status:** ✅ Rodando com todas migrations aplicadas

## 🧪 Testes a Realizar

### 1. Verificar Console do Navegador
Abra o DevTools (F12) e verifique:

**Antes:**
```
❌ React Router Future Flag Warning (v7_startTransition)
❌ React Router Future Flag Warning (v7_relativeSplatPath)
❌ POST .../auth/v1/signup 429 (Too Many Requests)
❌ HEAD .../images_queue?...ai_suggested_name=is.null 400 (Bad Request)
```

**Depois:**
```
✅ Sem warnings do React Router
✅ Erro 429 com mensagem amigável (se ocorrer)
✅ Sem erro 400 na query images_queue
ℹ️ React DevTools message (apenas informativo)
```

### 2. Testar Navegação
- [ ] Página inicial carrega sem erros
- [ ] Navegação entre páginas funciona
- [ ] Sem erros no console relacionados ao Router

### 3. Testar Autenticação

#### Login com Email/Senha
1. Acesse http://localhost:5173/login
2. Tente criar uma conta
3. Se aparecer erro 429:
   - ✅ Mensagem deve ser amigável: "Muitas tentativas. Aguarde alguns minutos..."
   - ⏱️ Aguarde 1-2 minutos
   - 🔄 Tente novamente

#### Login com Google
1. Clique em "Continuar com Google"
2. Deve redirecionar para OAuth do Google
3. Menos propenso a rate limiting

### 4. Testar Área Admin (se tiver acesso)
1. Acesse http://localhost:5173/admin
2. Verifique se a página carrega sem erro 400
3. A query para `images_queue` deve funcionar

## 🔧 Comandos Úteis

### Ver logs do Frontend
```bash
# O processo já está rodando, mas se precisar ver logs:
# Verifique o terminal onde executou npm run dev
```

### Ver logs do Supabase
```bash
supabase status
```

### Reiniciar Supabase (se necessário)
```bash
supabase stop
supabase start
```

### Verificar Migrations
```bash
supabase db diff --schema public
# Deve retornar: "No schema changes found"
```

## 🐛 Se Ainda Houver Problemas

### Erro 400 persiste
```bash
# Resetar banco completamente
supabase db reset

# Verificar se migrations foram aplicadas
supabase status
```

### Erro 429 persiste
1. Aguarde 2-5 minutos entre tentativas
2. Use Google OAuth em vez de email/senha
3. Verifique se o Supabase local está rodando (não o remoto)

### Frontend não atualiza
```bash
# Parar o processo (Ctrl+C no terminal)
# Limpar cache e reiniciar
npm run dev
```

### Limpar tudo e recomeçar
```bash
# Parar Supabase
supabase stop

# Parar Frontend (Ctrl+C)

# Reiniciar Supabase
supabase start

# Reiniciar Frontend
npm run dev
```

## 📊 Checklist Final

- [ ] Console sem warnings do React Router
- [ ] Página inicial carrega sem erro 400
- [ ] Login funciona (com mensagem amigável se erro 429)
- [ ] Navegação entre páginas funciona
- [ ] Área admin acessível (se tiver permissão)
- [ ] Supabase Studio acessível em http://127.0.0.1:54323

## 🎉 Tudo Funcionando?

Se todos os itens acima estão ✅, as correções foram aplicadas com sucesso!

Próximos passos:
1. Criar usuário admin (se necessário)
2. Testar funcionalidades específicas
3. Desenvolver novas features

## 📚 Documentação Relacionada

- `CORRECOES_APLICADAS.md` - Detalhes técnicos das correções
- `RESUMO_CORRECOES_ERRO_400.md` - Foco no erro 400 e migrations
- `TORNAR_ADMIN.md` - Como criar usuário admin
