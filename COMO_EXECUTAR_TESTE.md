# 🚀 COMO EXECUTAR O TESTE - 3 PASSOS SIMPLES

## PASSO 1: Abrir Supabase Studio

Clique aqui: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor

## PASSO 2: Abrir SQL Editor

No menu lateral esquerdo, clique em "SQL Editor"

## PASSO 3: Executar o Teste

1. Abra o arquivo `TESTE_RAPIDO.sql` (está na raiz do projeto)
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em "Run" (ou pressione Ctrl+Enter)

## ✅ RESULTADO ESPERADO

Você deve ver 2 resultados:

### Resultado 1: VERIFICACAO_INICIAL
```
fase: VERIFICACAO_INICIAL
usuarios: 9 (ou mais)
metodos_pagamento: 1 (ou mais)
subscriptions_com_collection: 1 (ou mais)
itens_na_fila_antes: 1 (ou mais)
```

### Resultado 2: RESULTADO_FINAL
```
fase: RESULTADO_FINAL
itens_na_fila_depois: 2 (aumentou em 1!)
ultimo_order_type: manual_payment
ultimo_collection_name: <nome da coleção>
ultimo_status: awaiting_choice ou ready_for_production
ultimo_created_at: <timestamp recente>
```

### Notices (na aba "Messages")
```
NOTICE: 💰 Pagamento criado: <uuid>
NOTICE: ✅ Pagamento aprovado!
NOTICE: 🎉 SUCESSO! Trigger funcionou! Itens: 1 → 2
```

## ❌ SE DER ERRO

### Erro: "Nenhuma subscription com collection ativa"

Execute este SQL ANTES do teste:

```sql
UPDATE subscriptions
SET active_collection_id = (SELECT id FROM collections LIMIT 1)
WHERE id = (SELECT id FROM subscriptions LIMIT 1);
```

Depois execute o teste novamente.

## 📞 DEPOIS DO TESTE

Me informe o resultado:
- ✅ "Teste passou! Item criado na fila."
- ❌ "Teste falhou: [copie o erro aqui]"

---

**Tempo total**: 2 minutos
