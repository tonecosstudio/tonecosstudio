# 🔑 Instruções: Aplicar Migration de Chaves de Pagamento

**Data:** 26 de Fevereiro de 2026  
**Status:** ⚠️ AGUARDANDO APLICAÇÃO MANUAL

---

## ✅ O Que Já Foi Feito

1. ✅ Migration SQL criada e corrigida (delimitadores `$$`)
2. ✅ Sistema 100% implementado no código
3. ✅ SQL copiado para o clipboard
4. ✅ Todas as páginas de checkout integradas

---

## 📋 Próximos Passos (VOCÊ PRECISA FAZER)

### Passo 1: Abrir Supabase Dashboard

Acesse o link direto:
```
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql
```

Ou navegue manualmente:
1. Abra https://supabase.com/dashboard
2. Selecione o projeto: `pabxpvqwtvbjaunjejud`
3. Clique em "SQL Editor" no menu lateral

---

### Passo 2: Colar e Executar o SQL

1. No SQL Editor, clique em "New Query"
2. Cole o SQL que está no clipboard (já foi copiado pelo script)
3. Clique no botão "RUN" (ou pressione Ctrl+Enter)
4. Aguarde a execução (deve levar ~2 segundos)

**Se o SQL não estiver no clipboard**, execute novamente:
```powershell
./aplicar-chaves-pagamento.ps1
```

---

### Passo 3: Verificar Sucesso

Após executar, você deve ver:
```
Success. No rows returned
```

Isso significa que:
- ✅ 10 configurações foram inseridas na tabela `system_settings`
- ✅ 3 funções SQL foram criadas
- ✅ Grants foram aplicados

---

### Passo 4: Configurar as Chaves

1. Faça login como admin no sistema
2. Acesse: `/admin/chaves-pagamento`
3. Configure as chaves PIX (5 tipos):
   - Compra Avulsa
   - Voucher (Entrada R$ 100)
   - Assinatura Trimestral
   - Assinatura Semestral
   - Assinatura Anual
4. Configure os links de cartão (5 tipos)
5. Clique em "Salvar Todas as Chaves"

---

## 🧪 Como Testar Após Aplicar

### Teste 1: Compra Avulsa
```
1. Criar uma quote
2. Ir para /orcamento/checkout?quote=xxx
3. Selecionar "Pagamento Total"
4. Verificar se a chave PIX de "onetime" aparece
5. Testar botão copiar
6. Testar link de cartão
```

### Teste 2: Voucher (Entrada)
```
1. Criar uma quote
2. Ir para /orcamento/checkout?quote=xxx
3. Selecionar "Pré-venda (Entrada)"
4. Verificar se a chave PIX de "voucher" aparece
5. Testar botão copiar
6. Testar link de cartão
```

### Teste 3: Assinatura Trimestral
```
1. Ir para /colecoes/[slug]/assinar
2. Selecionar plano "Trimestral"
3. Verificar se a chave PIX de "quarterly" aparece
4. Testar botão copiar
5. Testar link de cartão
```

### Teste 4: Assinatura Semestral
```
1. Ir para /colecoes/[slug]/assinar
2. Selecionar plano "Semestral"
3. Verificar se a chave PIX de "semiannual" aparece
4. Testar botão copiar
5. Testar link de cartão
```

### Teste 5: Assinatura Anual
```
1. Ir para /colecoes/[slug]/assinar
2. Selecionar plano "Anual"
3. Verificar se a chave PIX de "annual" aparece
4. Testar botão copiar
5. Testar link de cartão
```

---

## ❌ Possíveis Erros e Soluções

### Erro: "relation system_settings does not exist"
**Solução:** A tabela `system_settings` não existe. Você precisa criar a tabela primeiro.

### Erro: "duplicate key value violates unique constraint"
**Solução:** As configurações já existem. Isso é OK, a migration usa `ON CONFLICT DO NOTHING`.

### Erro: "syntax error at or near $"
**Solução:** Isso já foi corrigido! A migration agora usa `$$` em vez de `$`.

---

## 📊 O Que a Migration Faz

### 1. Insere 10 Configurações
```sql
-- 5 Chaves PIX
pix_key_onetime
pix_key_voucher
pix_key_subscription_quarterly
pix_key_subscription_semiannual
pix_key_subscription_annual

-- 5 Links de Cartão
payment_link_onetime
payment_link_voucher
payment_link_subscription_quarterly
payment_link_subscription_semiannual
payment_link_subscription_annual
```

### 2. Cria 3 Funções SQL
```sql
-- Buscar chave PIX por tipo
get_pix_key_for_payment(payment_type, subscription_period)

-- Buscar link de cartão por tipo
get_payment_link_for_payment(payment_type, subscription_period)

-- Buscar todas as informações
get_payment_info_for_type(payment_type, subscription_period)
```

### 3. Aplica Grants
```sql
-- Permite que usuários autenticados chamem as funções
GRANT EXECUTE ON FUNCTION ... TO authenticated;
```

---

## 🎯 Checklist Final

Após aplicar a migration e configurar as chaves:

- [ ] Migration aplicada no Supabase Dashboard
- [ ] Sem erros na execução
- [ ] Chaves PIX configuradas (5 tipos)
- [ ] Links de cartão configurados (5 tipos)
- [ ] Testado checkout de compra avulsa
- [ ] Testado checkout de voucher
- [ ] Testado checkout de assinatura trimestral
- [ ] Testado checkout de assinatura semestral
- [ ] Testado checkout de assinatura anual
- [ ] Botão copiar PIX funcionando
- [ ] Link de cartão abrindo em nova aba

---

## 📞 Suporte

Se encontrar algum problema:

1. Verifique o console do navegador (F12)
2. Verifique os logs do Supabase
3. Verifique se a migration foi aplicada corretamente
4. Verifique se as chaves foram configuradas

---

## 🚀 Após Aplicar

Quando tudo estiver funcionando:

```bash
# Commit das mudanças
git add .
git commit -m "feat: sistema de chaves de pagamento por tipo"
git push
```

---

**Implementado por:** Kiro AI  
**Data:** 26/02/2026  
**Status:** ⚠️ AGUARDANDO APLICAÇÃO MANUAL

