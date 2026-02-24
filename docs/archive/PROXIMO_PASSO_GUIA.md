# 📋 Próximo Passo - Guia Completo

## 🎯 O que fazer agora:

### Opção 1: Executar no Dashboard do Supabase (RECOMENDADO)

1. **Acesse o SQL Editor do Supabase:**
   ```
   https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
   ```

2. **Abra o arquivo:**
   ```
   EXECUTAR_NO_SUPABASE_DASHBOARD.sql
   ```

3. **Copie TODO o conteúdo do arquivo**

4. **Cole no SQL Editor do Supabase**

5. **Clique em "Run" (ou pressione Ctrl+Enter)**

6. **Aguarde a confirmação de sucesso**

7. **Execute as queries de verificação** (estão no final do arquivo)

### Opção 2: Usar Supabase CLI (se preferir)

```bash
# Conectar ao projeto remoto
supabase link --project-ref pabxpvqwtvbjaunjejud

# Aplicar as migrations
supabase db push --include-all
```

## ✅ O que será feito:

1. ✅ Desconto PIX padronizado para 5% (era 10% na assinatura)
2. ✅ Preços dos planos recalculados com 5%
3. ✅ Coleções sem personagens desativadas
4. ✅ Descrições teste ("aaa", "test") removidas
5. ✅ Coleções duplicadas desativadas

## 🔍 Como verificar se funcionou:

Após executar, você deve ver:

### 1. Desconto PIX = 5%
```sql
SELECT value FROM system_settings WHERE key = 'pix_discount_percentage';
-- Deve retornar: 5
```

### 2. Planos com preços corretos
```sql
SELECT name, price_full, price_pix FROM subscription_plans WHERE is_active = true;
-- Trimestral: R$ 1.350 → R$ 1.282,50 (5% off)
-- Semestral: R$ 2.700 → R$ 2.565 (5% off)
```

### 3. Apenas coleções válidas ativas
```sql
SELECT name, COUNT(cc.id) as personagens
FROM collections c
LEFT JOIN collection_characters cc ON c.id = cc.collection_id
WHERE c.is_active = true
GROUP BY c.id, c.name;
-- Todas devem ter personagens > 0
```

## 🎨 Mudanças Visuais na Página

Depois de aplicar o SQL, a página de assinatura terá:

### Antes:
- ❌ "PIX (10% desconto)"
- ❌ "+1 Grátis"
- ❌ "Desconto de R$ X"
- ❌ "R$ 1350.00"
- ❌ Coleções com "0 personagens"
- ❌ Linha "Desconto: - R$ X" no resumo

### Depois:
- ✅ "Pagamento à vista - R$ 1.282"
- ✅ "Inclui peça exclusiva"
- ✅ Sem mencionar desconto
- ✅ "R$ 1.350" (formatação correta)
- ✅ Apenas coleções com personagens
- ✅ Resumo limpo (sem linha de desconto)

## ⚠️ Importante:

- As migrations são **seguras** - não deletam dados, apenas desativam
- Coleções desativadas podem ser reativadas depois se necessário
- O frontend já está atualizado, só falta aplicar o SQL

## 🚀 Depois de aplicar:

1. Recarregue a página de assinatura
2. Verifique se os preços estão corretos
3. Verifique se não aparecem coleções com 0 personagens
4. Verifique se a linguagem está premium (sem "desconto")

## 📞 Se tiver problemas:

1. Verifique se está logado no Supabase Dashboard
2. Verifique se está no projeto correto (pabxpvqwtvbjaunjejud)
3. Execute as queries de verificação para ver o que deu errado
4. Me avise qual erro apareceu

---

**Resumo:** Copie o conteúdo de `EXECUTAR_NO_SUPABASE_DASHBOARD.sql` e execute no SQL Editor do Supabase!
