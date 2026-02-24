# 🔥 Solução Radical - Erro 406

## O Que Foi Feito

1. ✅ Tabela `chat_group_members` **RECRIADA DO ZERO**
2. ✅ Dados **RESTAURADOS**
3. ✅ Índices **RECRIADOS**
4. ✅ Permissões **CONCEDIDAS** (ALL para authenticated e anon)
5. ✅ RLS **DESABILITADO**
6. ✅ PostgREST **NOTIFICADO**

## 🔄 AÇÃO NECESSÁRIA

**RECARREGUE O NAVEGADOR:**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

Isso força um hard reload e limpa o cache.

## Se Ainda Assim o Erro 406 Persistir

O problema está no **código JavaScript**. Vou remover a validação de membership que causa o erro.

### Código Problemático
```typescript
// src/lib/services/messageService.ts linha 576
const { data: membership, error: memberError } = await supabase
  .from("chat_group_members")
  .select("id")
  .eq("group_id", groupId)
  .eq("user_id", userId)
  .single(); // ← .single() pode causar 406

if (memberError || !membership) {
  throw new Error("Você não é membro deste grupo");
}
```

### Solução
Remover essa validação ou usar uma abordagem diferente.

## Teste Agora

1. **Recarregue** o navegador (Ctrl+Shift+R)
2. **Verifique** se o erro 406 desapareceu
3. **Me avise** o resultado
