# 🗑️ Guia: Remover Lovable (Opcional)

## ⚠️ ATENÇÃO
Este guia é **OPCIONAL**. O Lovable não interfere no funcionamento do sistema.
Só execute se você realmente quiser limpar o código.

---

## 📋 Checklist de Remoção

### 1. Remover Lovable Tagger do Vite Config

**Arquivo**: `vite.config.ts`

```typescript
// REMOVER esta linha
import { componentTagger } from "lovable-tagger";

// ALTERAR de:
plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

// PARA:
plugins: [react()],
```

### 2. Desinstalar Dependência

```bash
npm uninstall lovable-tagger
```

### 3. Atualizar Edge Function (Opcional)

**Arquivo**: `supabase/functions/analyze-preferences/index.ts`

Se você quiser substituir o gateway Lovable por OpenAI direto:

```typescript
// REMOVER
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// ADICIONAR
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// ALTERAR no fetch
headers: {
  Authorization: `Bearer ${OPENAI_API_KEY}`,
  "Content-Type": "application/json",
}
```

### 4. Remover Variável de Ambiente do Supabase

1. Acesse: https://supabase.com/dashboard/project/lprsvnwshfxhpnwrxfpy/settings/functions
2. Remova a variável `LOVABLE_API_KEY`
3. (Opcional) Adicione `OPENAI_API_KEY` se for usar OpenAI direto

---

## 🧪 Testar Após Remoção

```bash
# 1. Limpar cache
rm -rf node_modules/.vite
rm -rf dist

# 2. Reinstalar dependências
npm install

# 3. Testar build
npm run build

# 4. Testar dev
npm run dev
```

---

## 🔄 Reverter Mudanças (Se Necessário)

Se algo quebrar, você pode reverter:

```bash
# 1. Reinstalar lovable-tagger
npm install -D lovable-tagger@1.1.13

# 2. Restaurar vite.config.ts
git checkout vite.config.ts

# 3. Restaurar edge function
git checkout supabase/functions/analyze-preferences/index.ts
```

---

## ✅ Verificação Final

Após remover o Lovable, verifique:

- [ ] Build de produção funciona: `npm run build`
- [ ] Dev server funciona: `npm run dev`
- [ ] Testes passam: `npm test`
- [ ] Aplicação carrega sem erros no console
- [ ] Edge functions funcionam (se você atualizou)

---

## 💡 Recomendação

**NÃO REMOVA** a menos que você tenha um motivo específico.

O Lovable Tagger:
- Não afeta produção
- Não gera custos
- É útil para desenvolvimento
- Não interfere com o Supabase

**Mantenha a configuração atual e foque em aplicar as migrations do Supabase.**
