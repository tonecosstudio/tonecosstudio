# ⚡ Guia Rápido de Aplicação - 20 Minutos

**Tempo Total:** ~20 minutos  
**Dificuldade:** Fácil  
**Pré-requisitos:** Acesso admin ao Supabase

---

## 🚀 Passo 1: Aplicar Migration (2 min)

### Opção A: Usando o Script (Recomendado)
```powershell
# Execute no terminal
./aplicar-chaves-pagamento.ps1

# O SQL será copiado automaticamente para o clipboard
```

### Opção B: Manual
```powershell
# Copie o conteúdo de:
supabase/migrations/20260226000000_add_payment_keys_settings.sql
```

### Aplicar no Supabase:
1. Abra: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql
2. Cole o SQL
3. Clique em **RUN**
4. Aguarde: `Success. No rows returned`

✅ **Pronto!** 10 configurações e 3 funções criadas.

---

## 🔑 Passo 2: Configurar Chaves (5 min)

### Acessar Admin:
```
1. Login como admin no sistema
2. Acesse: /admin/chaves-pagamento
```

### Configurar Chaves PIX:

**Tab: Chaves PIX**

| Campo | Exemplo | Descrição |
|-------|---------|-----------|
| Compra Avulsa | `123.456.789-00` | Para quotes (pagamento total) |
| Voucher | `987.654.321-00` | Para entrada de R$ 100 |
| Assinatura Trimestral | `111.222.333-44` | Plano de 3 meses |
| Assinatura Semestral | `555.666.777-88` | Plano de 6 meses |
| Assinatura Anual | `999.888.777-66` | Plano de 12 meses |

### Configurar Links de Cartão:

**Tab: Links de Cartão**

| Campo | Exemplo | Descrição |
|-------|---------|-----------|
| Compra Avulsa | `https://pay.com/onetime` | Para quotes (pagamento total) |
| Voucher | `https://pay.com/voucher` | Para entrada de R$ 100 |
| Assinatura Trimestral | `https://pay.com/quarterly` | Plano de 3 meses |
| Assinatura Semestral | `https://pay.com/semiannual` | Plano de 6 meses |
| Assinatura Anual | `https://pay.com/annual` | Plano de 12 meses |

### Salvar:
```
Clique em: "Salvar Todas as Chaves"
```

✅ **Pronto!** Chaves configuradas.

---

## 🧪 Passo 3: Testar (10 min)

### Teste 1: Compra Avulsa (2 min)
```
1. Criar uma quote
2. Ir para: /orcamento/checkout?quote=xxx
3. Selecionar: "Pagamento Total"
4. Verificar: Chave PIX de "Compra Avulsa" aparece
5. Testar: Botão copiar
6. Testar: Link de cartão
```

### Teste 2: Voucher (2 min)
```
1. Usar a mesma quote
2. Selecionar: "Pré-venda (Entrada)"
3. Verificar: Chave PIX de "Voucher" aparece
4. Testar: Botão copiar
5. Testar: Link de cartão
```

### Teste 3: Assinatura Trimestral (2 min)
```
1. Ir para: /colecoes/[slug]/assinar
2. Selecionar: Plano "Trimestral"
3. Verificar: Chave PIX de "Assinatura Trimestral" aparece
4. Testar: Botão copiar
5. Testar: Link de cartão
```

### Teste 4: Assinatura Semestral (2 min)
```
1. Selecionar: Plano "Semestral"
2. Verificar: Chave PIX de "Assinatura Semestral" aparece
3. Testar: Botão copiar
4. Testar: Link de cartão
```

### Teste 5: Assinatura Anual (2 min)
```
1. Selecionar: Plano "Anual"
2. Verificar: Chave PIX de "Assinatura Anual" aparece
3. Testar: Botão copiar
4. Testar: Link de cartão
```

✅ **Pronto!** Todos os checkouts testados.

---

## 📦 Passo 4: Commit (2 min)

```bash
# Adicionar arquivos
git add .

# Commit
git commit -m "feat: sistema de chaves de pagamento por tipo + correções PaymentDashboard"

# Push
git push
```

✅ **Pronto!** Deploy realizado.

---

## ✅ Checklist Rápido

- [ ] Migration aplicada no Supabase
- [ ] Chaves PIX configuradas (5)
- [ ] Links de cartão configurados (5)
- [ ] Compra avulsa testada
- [ ] Voucher testado
- [ ] Assinatura trimestral testada
- [ ] Assinatura semestral testada
- [ ] Assinatura anual testada
- [ ] Botão copiar funcionando
- [ ] Link cartão funcionando
- [ ] Commit realizado
- [ ] Push realizado

---

## 🎯 Resultado Final

Após completar todos os passos:

✅ Sistema de chaves 100% funcional  
✅ Chaves diferentes para cada tipo de pagamento  
✅ Botão copiar PIX funcionando  
✅ Links de cartão funcionando  
✅ Todos os checkouts integrados  
✅ Sistema pronto para produção  

---

## 🆘 Problemas Comuns

### Erro: "relation system_settings does not exist"
**Solução:** A tabela não existe. Verifique se você está no projeto correto.

### Erro: "duplicate key value"
**Solução:** As configurações já existem. Isso é OK! A migration usa `ON CONFLICT DO NOTHING`.

### Chave PIX não aparece no checkout
**Solução:** 
1. Verifique se a migration foi aplicada
2. Verifique se a chave foi configurada no admin
3. Verifique o console do navegador (F12)

### Link de cartão não abre
**Solução:**
1. Verifique se o link foi configurado no admin
2. Verifique se o link está completo (com https://)
3. Verifique o console do navegador (F12)

---

## 📞 Links Úteis

- **Supabase SQL Editor:** https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql
- **Admin Chaves:** /admin/chaves-pagamento
- **Documentação Completa:** INTEGRACAO_COMPLETA_CHAVES.md
- **Status Atual:** STATUS_ATUAL_SISTEMA_2026.md

---

## 🎉 Parabéns!

Se você completou todos os passos, o sistema está **100% funcional** e pronto para produção!

**Tempo Total:** ~20 minutos  
**Resultado:** Sistema completo de chaves de pagamento por tipo

---

**Criado por:** Kiro AI  
**Data:** 26/02/2026  
**Versão:** 1.0

