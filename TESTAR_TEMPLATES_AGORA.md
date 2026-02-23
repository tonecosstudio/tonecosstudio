# 🧪 TESTAR TEMPLATES DINÂMICOS - AGORA

## ✅ O QUE FOI CORRIGIDO

1. ✅ Tabela `preorders` criada no banco de dados
2. ✅ Código do `templateService.ts` descomentado e adaptado
3. ✅ Tipos TypeScript regenerados
4. ✅ Servidor reiniciado (cache limpo)

## 🎯 COMO TESTAR

### Passo 1: Abrir Admin Suporte
```
http://localhost:8080/admin/suporte
```

### Passo 2: Selecionar uma Conversa
- Clique em qualquer conversa da lista
- Ou use a vista agrupada por cliente

### Passo 3: Testar Respostas Rápidas
1. Clique no botão "Respostas Rápidas" (ícone de raio ⚡)
2. Selecione um template que contenha variáveis, por exemplo:
   - "Olá {{NOME_CLIENTE}}, seu pedido {{ULTIMO_PEDIDO_ID}} está {{ULTIMO_PEDIDO_STATUS}}"
   - "Código de rastreio: {{ULTIMO_PEDIDO_RASTREIO}}"
   - "Sua assinatura {{ASSINATURA_PLANO}} está {{ASSINATURA_STATUS}}"

### Passo 4: Verificar Preview
- O preview deve mostrar os dados REAIS do cliente
- Exemplo: "Olá João Silva, seu pedido #abc123 está Em produção"

### Passo 5: Verificar Console
**IMPORTANTE**: Abra o Console do navegador (F12)

✅ **ESPERADO**: Console LIMPO, sem erros 404/400

❌ **ANTES** (erros que devem ter sumido):
```
GET .../preorders?... 404 (Not Found)
GET .../orders?... 404 (Not Found)
GET .../subscriptions?... 400 (Bad Request)
```

## 📊 VARIÁVEIS DISPONÍVEIS PARA TESTAR

### Cliente
- `{{NOME_CLIENTE}}` - Nome completo
- `{{EMAIL_CLIENTE}}` - Email

### Pedidos (NOVO - agora funciona!)
- `{{ULTIMO_PEDIDO_ID}}` - #abc123
- `{{ULTIMO_PEDIDO_STATUS}}` - Em produção, Enviado, etc
- `{{ULTIMO_PEDIDO_RASTREIO}}` - BR123456789BR
- `{{ULTIMO_PEDIDO_DATA}}` - 15/02/2026

### Orçamentos
- `{{ULTIMO_ORCAMENTO_ID}}` - #ORC-789
- `{{ULTIMO_ORCAMENTO_VALOR}}` - R$ 150,00

### Pagamentos
- `{{ULTIMO_PAGAMENTO_VALOR}}` - R$ 75,00
- `{{ULTIMO_PAGAMENTO_STATUS}}` - Aprovado

### Assinaturas (NOVO - estrutura corrigida!)
- `{{ASSINATURA_PLANO}}` - Coleção Marvel (trimestral)
- `{{ASSINATURA_STATUS}}` - Ativa

### Data/Hora
- `{{DATA_HOJE}}` - 22/02/2026
- `{{HORA_ATUAL}}` - 14:30

## 🔍 O QUE OBSERVAR

### ✅ Sucesso
1. Preview mostra dados reais do cliente
2. Console sem erros 404/400
3. Variáveis substituídas corretamente
4. Se cliente não tem pedidos: mostra "Nenhum pedido" ou "N/A"

### ❌ Se ainda houver problemas
1. Verificar se migration foi aplicada: `npx supabase db push`
2. Verificar se tipos foram regenerados: arquivo `src/integrations/supabase/types.ts` deve conter `preorders`
3. Limpar cache do navegador (Ctrl+Shift+Delete)
4. Recarregar página (Ctrl+F5)

## 🎯 TEMPLATES DE EXEMPLO CRIADOS

11 templates foram inseridos no banco via migration anterior:
1. Boas-vindas
2. Confirmação de pedido
3. Pedido em produção
4. Pedido enviado
5. Pedido entregue
6. Solicitação de informações
7. Problema resolvido
8. Aguardando resposta
9. Encerramento
10. Horário de atendimento
11. Informações de pagamento

## 📝 PRÓXIMOS PASSOS (SE TUDO OK)

1. ✅ Testar com cliente que TEM pedidos
2. ✅ Testar com cliente que NÃO tem pedidos (deve mostrar "N/A")
3. ✅ Testar com cliente que TEM assinatura
4. ✅ Criar templates personalizados com variáveis
5. ✅ Usar templates no chat real

---

**Servidor**: http://localhost:8080
**Página de teste**: http://localhost:8080/admin/suporte
**Status**: ✅ PRONTO PARA TESTAR
