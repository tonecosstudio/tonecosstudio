# 🔧 Corrigir Google OAuth - Passo a Passo

## ❌ Erro Atual
```
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
```

Isso significa que o Google provider **NÃO está ativado corretamente** no Supabase.

---

## ✅ Solução - Passo a Passo Detalhado

### Passo 1: Acessar Auth Providers
1. Abra: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/auth/providers
2. Faça login se necessário

### Passo 2: Localizar Google
1. Role a página até encontrar **"Google"**
2. Você verá um card com o logo do Google

### Passo 3: Verificar o Toggle
O toggle (botão liga/desliga) pode estar em 3 estados:

**Estado 1: Desativado (cinza/vermelho)**
- ❌ Provider está OFF
- Solução: Clique no toggle para ativar

**Estado 2: Ativado mas sem configuração (amarelo/laranja)**
- ⚠️ Provider está ON mas falta configuração
- Solução: Preencha Client ID e Secret

**Estado 3: Ativado e configurado (verde)**
- ✅ Provider está ON e configurado
- Se ainda dá erro, veja Passo 4

### Passo 4: Preencher Configuração

Clique no card do Google para expandir. Você verá campos:

#### 4.1 Client ID
```
624639919567-g0jn7ksbhat9hggu0dpednaglfvonlad.apps.googleusercontent.com
```
Cole exatamente isso ☝️

#### 4.2 Client Secret
Você precisa pegar do Google Cloud Console:

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Procure por: `624639919567-g0jn7ksbhat9hggu0dpednaglfvonlad.apps.googleusercontent.com`
3. Clique nele
4. Copie o **Client Secret** (campo com asteriscos)
5. Cole no Supabase

#### 4.3 Authorized Client IDs (opcional)
Deixe em branco por enquanto.

#### 4.4 Skip nonce check (opcional)
Deixe desmarcado.

### Passo 5: SALVAR (IMPORTANTE!)
1. Role até o final do card do Google
2. Clique no botão **"Save"** ou **"Update"**
3. Aguarde a mensagem de confirmação
4. **NÃO feche a página até ver a confirmação!**

### Passo 6: Verificar se Salvou
1. Recarregue a página: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/auth/providers
2. Verifique se o Google ainda está ativado (verde)
3. Clique no card do Google
4. Verifique se o Client ID ainda está lá
5. Verifique se o Client Secret mostra asteriscos (não vazio)

---

## 🔍 Diagnóstico Alternativo

Se você fez tudo acima e ainda dá erro, pode ser um dos seguintes problemas:

### Problema 1: Você não é Owner do Projeto
**Sintoma**: Não consegue salvar as configurações

**Solução**:
1. Verifique seu role em: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/general
2. Você precisa ser **Owner** ou **Admin**
3. Se não for, peça ao owner para te promover ou fazer a configuração

### Problema 2: Projeto Pausado
**Sintoma**: Configurações não salvam ou não funcionam

**Solução**:
1. Verifique em: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud
2. Se o projeto estiver pausado, clique em "Resume"

### Problema 3: Client Secret Incorreto
**Sintoma**: Salva mas não funciona

**Solução**:
1. Gere um novo Client Secret no Google Cloud Console
2. Atualize no Supabase
3. Salve novamente

---

## 🧪 Teste Rápido via cURL

Depois de configurar, teste se o provider está ativo:

```bash
curl -X POST "https://pabxpvqwtvbjaunjejud.supabase.co/auth/v1/signup" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4" \
  -H "Content-Type: application/json" \
  -d '{"provider": "google"}'
```

**Resposta esperada se estiver configurado:**
- Deve retornar uma URL de autorização do Google

**Resposta se NÃO estiver configurado:**
- `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`

---

## 📸 Checklist Visual

Tire screenshots e compare:

### ✅ Como deve estar:
```
┌─────────────────────────────────────┐
│ Google                         [ON] │ ← Toggle VERDE
├─────────────────────────────────────┤
│ Client ID:                          │
│ 624639919567-g0jn7ksbhat9hggu...   │ ← Preenchido
│                                     │
│ Client Secret:                      │
│ ••••••••••••••••••••••••••••••••   │ ← Asteriscos (não vazio)
│                                     │
│ [Save] [Cancel]                     │
└─────────────────────────────────────┘
```

### ❌ Como NÃO deve estar:
```
┌─────────────────────────────────────┐
│ Google                        [OFF] │ ← Toggle CINZA/VERMELHO
└─────────────────────────────────────┘
```

ou

```
┌─────────────────────────────────────┐
│ Google                         [ON] │ ← Toggle VERDE mas...
├─────────────────────────────────────┤
│ Client ID:                          │
│ [vazio]                             │ ← VAZIO
│                                     │
│ Client Secret:                      │
│ [vazio]                             │ ← VAZIO
└─────────────────────────────────────┘
```

---

## 🆘 Se Nada Funcionar

Se você fez TUDO acima e ainda não funciona:

1. **Tire um screenshot** da página de Auth Providers mostrando o Google
2. **Tire um screenshot** do card do Google expandido
3. **Me envie** para eu ver o que pode estar errado

Ou tente:

### Opção A: Desativar e Reativar
1. Desative o Google (toggle OFF)
2. Salve
3. Aguarde 30 segundos
4. Ative novamente (toggle ON)
5. Preencha tudo de novo
6. Salve
7. Teste

### Opção B: Usar Outro Provider Temporariamente
Enquanto resolve o Google, você pode usar email/senha que já funciona.

---

## 📞 Suporte Supabase

Se realmente não funcionar, pode ser um bug do Supabase. Contate o suporte:
- Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase/issues

---

## ✅ Depois que Funcionar

Quando o Google OAuth estiver funcionando:

1. Teste o login: http://localhost:8080/login
2. Clique em "Continuar com Google"
3. Deve redirecionar para o Google
4. Faça login
5. Deve voltar para o app logado

Se funcionar, parabéns! 🎉
