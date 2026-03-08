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

O script agora cria automaticamente os dados necessários se não existirem!

Você deve ver 3 resultados:

### Resultado 1: Notices de Preparação (se necessário)
```
NOTICE: 📝 Criando método de pagamento de teste...
NOTICE: ✅ Método de pagamento criado!
NOTICE: 📝 Atualizando subscription com collection...
NOTICE: ✅ Subscription atualizada!
```

### Resultado 2: VERIFICACAO_INICIAL
```
fase: VERIFICACAO_INICIAL
usuarios: 9 (ou mais)
metodos_pagamento: 1 (ou mais)
subscriptions_com_collection: 1 (ou mais)
itens_na_fila_antes: 1 (ou mais)
```

### Resultado 3: RESULTADO_FINAL
```
fase: RESULTADO_FINAL
itens_na_fila_depois: 2 (aumentou em 1!)
ultimo_order_type: manual_payment
ultimo_collection_name: <nome da coleção>
ultimo_status: awaiting_choice ou ready_for_production
ultimo_created_at: <timestamp recente>
```

### Notices do Teste (na aba "Messages")
```
NOTICE: 💰 Pagamento criado: <uuid>
NOTICE: ✅ Pagamento aprovado!
NOTICE: 🎉 SUCESSO! Trigger funcionou! Itens: 1 → 2
```

## ❌ SE DER ERRO

### Erro: "Nenhum usuário encontrado"

Você precisa ter pelo menos um usuário cadastrado. Faça login na aplicação primeiro.

### Outro erro

Copie a mensagem de erro completa e me informe.

## 📞 DEPOIS DO TESTE

Me informe o resultado:
- ✅ "Teste passou! Item criado na fila."
- ❌ "Teste falhou: [copie o erro aqui]"

---

**Tempo total**: 2 minutos
