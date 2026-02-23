# 🧪 Como Testar Templates Inteligentes

## 🎯 OBJETIVO

Validar que o sistema de templates está funcionando corretamente com mensagens inteligentes que se adaptam quando não há dados.

## 📋 PRÉ-REQUISITOS

1. ✅ Migrations aplicadas (já feito)
2. ✅ Servidor rodando
3. ✅ Acesso ao admin
4. ✅ Pelo menos 2 clientes:
   - Um cliente NOVO (sem pedidos/orçamentos)
   - Um cliente COM DADOS (com pedidos)

## 🧪 TESTES A REALIZAR

### Teste 1: Cliente SEM Pedidos

#### Passo 1: Acessar Chat Admin
```
1. Abrir http://localhost:5173/admin/suporte
2. Clicar em "Clientes" (vista agrupada)
3. Selecionar um cliente que NÃO tem pedidos
```

#### Passo 2: Usar Template de Rastreio
```
1. Clicar no botão "Respostas Rápidas"
2. Selecionar template "Rastreio de Pedido"
3. Verificar preview da mensagem
```

#### Resultado Esperado:
```
✅ "Olá [Nome]! 👋"
✅ "Você ainda não tem pedidos registrados."
✅ (Sem linhas de rastreio)
✅ (Sem "N/A" ou valores estranhos)
```

#### Resultado NÃO Esperado:
```
❌ "Seu pedido Nenhum pedido já foi enviado"
❌ "Código de rastreamento: N/A"
❌ "Status: N/A"
```

### Teste 2: Cliente COM Pedidos

#### Passo 1: Selecionar Cliente com Dados
```
1. Voltar para lista de clientes
2. Selecionar um cliente que TEM pedidos
3. Abrir conversa
```

#### Passo 2: Usar Mesmo Template
```
1. Clicar em "Respostas Rápidas"
2. Selecionar template "Rastreio de Pedido"
3. Verificar preview da mensagem
```

#### Resultado Esperado:
```
✅ "Olá [Nome]! 👋"
✅ "Seu pedido #abc123 já foi enviado! 📦"
✅ "🔍 Código de rastreamento: BR123456789BR"
✅ (Dados reais do pedido)
```

### Teste 3: Template de Orçamento

#### Cliente SEM Orçamentos:
```
Template: "Status do Orçamento"

Resultado Esperado:
✅ "Você ainda não tem orçamentos"
✅ (Sem linhas de valor)
```

#### Cliente COM Orçamentos:
```
Template: "Status do Orçamento"

Resultado Esperado:
✅ "Seu orçamento #ORC-abc123 está pronto!"
✅ "Valor: R$ 150,00"
```

### Teste 4: Template de Pagamento

#### Cliente SEM Pagamentos:
```
Template: "Confirmação de Pagamento"

Resultado Esperado:
✅ "Você ainda não tem pagamentos registrados"
✅ (Sem linhas de status)
```

#### Cliente COM Pagamentos:
```
Template: "Confirmação de Pagamento"

Resultado Esperado:
✅ "Seu pagamento de R$ 75,00 foi confirmado!"
✅ "Status: Aprovado"
```

### Teste 5: Template de Assinatura

#### Cliente SEM Assinatura:
```
Template: "Status da Assinatura"

Resultado Esperado:
✅ "Você ainda não tem assinatura ativa"
✅ (Sem linhas de plano/status)
```

#### Cliente COM Assinatura:
```
Template: "Status da Assinatura"

Resultado Esperado:
✅ "Sua assinatura Premium está ativa!"
✅ "Status: Ativa"
```

### Teste 6: Templates com SSOT (Preços)

#### Qualquer Cliente:
```
Template: "Informações de Preço"

Resultado Esperado:
✅ "Preço padrão: R$ 500,00"
✅ "Preço PIX: R$ 475,00"
✅ "Desconto PIX: 5%"
✅ (Valores vêm do banco de dados)
```

### Teste 7: Templates com SSOT (Vagas)

#### Qualquer Cliente:
```
Template: "Vagas Disponíveis"

Resultado Esperado:
✅ "Temos 8 vagas disponíveis este mês"
✅ "Limite mensal: 20 peças"
✅ "Já vendemos: 12 peças"
✅ (Valores calculados dinamicamente)
```

## 🔍 CHECKLIST DE VALIDAÇÃO

### Mensagens Inteligentes
- [ ] Cliente sem pedidos: mensagem ajustada
- [ ] Cliente com pedidos: dados reais aparecem
- [ ] Cliente sem orçamentos: mensagem ajustada
- [ ] Cliente com orçamentos: dados reais aparecem
- [ ] Cliente sem pagamentos: mensagem ajustada
- [ ] Cliente com pagamentos: dados reais aparecem
- [ ] Cliente sem assinatura: mensagem ajustada
- [ ] Cliente com assinatura: dados reais aparecem

### SSOT (Preços)
- [ ] Preços vêm do banco de dados
- [ ] Desconto PIX correto (5%)
- [ ] Valores formatados corretamente (R$)

### SSOT (Vagas)
- [ ] Limite mensal correto (20)
- [ ] Vagas disponíveis calculadas
- [ ] Percentual vendido calculado

### Qualidade
- [ ] Sem "N/A" em mensagens
- [ ] Sem "Nenhum pedido" em frases estranhas
- [ ] Sem linhas vazias múltiplas
- [ ] Formatação correta
- [ ] Português correto

## 🐛 PROBLEMAS COMUNS

### Problema 1: "N/A" ainda aparece
**Causa**: Template não está usando a lógica nova
**Solução**: Verificar se template está no banco de dados

### Problema 2: Variáveis não substituídas
**Causa**: Nome da variável incorreto
**Solução**: Verificar lista de variáveis disponíveis

### Problema 3: Dados não aparecem
**Causa**: Cliente não tem dados no banco
**Solução**: Criar dados de teste para o cliente

### Problema 4: Erro no console
**Causa**: Tabela não existe
**Solução**: Aplicar migrations

## 📊 TEMPLATES DISPONÍVEIS NO BANCO

### 1. Rastreio de Pedido
```
Olá {{NOME_CLIENTE}}! 👋

Seu pedido {{ULTIMO_PEDIDO_ID}} já foi enviado! 📦

🔍 Código de rastreamento: {{ULTIMO_PEDIDO_RASTREIO}}

Você pode acompanhar a entrega através dos Correios ou transportadora.

Qualquer dúvida, estou à disposição!
```

### 2. Status do Orçamento
```
Olá {{NOME_CLIENTE}}! 

Seu orçamento {{ULTIMO_ORCAMENTO_ID}} está pronto! 💰

Valor: {{ULTIMO_ORCAMENTO_VALOR}}

Podemos prosseguir com o pedido?
```

### 3. Confirmação de Pagamento
```
Olá {{NOME_CLIENTE}}! 

Seu pagamento de {{ULTIMO_PAGAMENTO_VALOR}} foi confirmado! ✅

Status: {{ULTIMO_PAGAMENTO_STATUS}}

Obrigado pela confiança!
```

### 4. Status da Assinatura
```
Olá {{NOME_CLIENTE}}! 

Sua assinatura {{ASSINATURA_PLANO}} está ativa! 🎉

Status: {{ASSINATURA_STATUS}}

Aproveite seus benefícios!
```

### 5. Informações de Preço
```
Olá {{NOME_CLIENTE}}! 

Nossos preços atuais:

💰 Preço padrão: {{PRECO_PADRAO}}
💳 Preço PIX: {{PRECO_PIX}}
🎁 Desconto PIX: {{DESCONTO_PIX}}

Pagamento facilitado disponível!
```

### 6. Vagas Disponíveis
```
Olá {{NOME_CLIENTE}}! 

Informações do lote atual:

📊 Limite mensal: {{LIMITE_MENSAL}}
✅ Vendas realizadas: {{VENDAS_MES_ATUAL}}
🎯 Vagas disponíveis: {{VAGAS_DISPONIVEIS}}
📈 Percentual vendido: {{PERCENTUAL_VENDIDO}}

Garanta sua vaga!
```

### 7. Cronograma do Lote
```
Olá {{NOME_CLIENTE}}! 

Cronograma do lote atual:

📅 Vendas abertas no dia {{DIA_ABERTURA_VENDAS}}
⏱️ Prazo de produção: 15-20 dias
🚚 Envio: até 5 dias úteis

Não perca o prazo!
```

## 🎯 CRITÉRIOS DE SUCESSO

### ✅ Teste PASSOU se:
1. Mensagens fazem sentido com e sem dados
2. Não aparece "N/A" em frases
3. Não aparece "Nenhum pedido" em frases estranhas
4. Dados reais são substituídos corretamente
5. Preços vêm do banco de dados
6. Vagas são calculadas dinamicamente
7. Formatação está correta
8. Sem erros no console

### ❌ Teste FALHOU se:
1. Mensagens quebradas ("Seu pedido Nenhum pedido")
2. "N/A" aparece em frases
3. Variáveis não substituídas ({{NOME_CLIENTE}})
4. Preços hardcoded
5. Erros no console
6. Linhas vazias múltiplas

## 📝 RELATÓRIO DE TESTE

Após realizar os testes, preencher:

```
Data: ___/___/______
Testador: _______________

RESULTADOS:

[ ] Teste 1: Cliente sem pedidos - PASSOU / FALHOU
[ ] Teste 2: Cliente com pedidos - PASSOU / FALHOU
[ ] Teste 3: Template de orçamento - PASSOU / FALHOU
[ ] Teste 4: Template de pagamento - PASSOU / FALHOU
[ ] Teste 5: Template de assinatura - PASSOU / FALHOU
[ ] Teste 6: Templates com SSOT (preços) - PASSOU / FALHOU
[ ] Teste 7: Templates com SSOT (vagas) - PASSOU / FALHOU

PROBLEMAS ENCONTRADOS:
_________________________________________________
_________________________________________________
_________________________________________________

OBSERVAÇÕES:
_________________________________________________
_________________________________________________
_________________________________________________

CONCLUSÃO:
[ ] Sistema funcionando perfeitamente
[ ] Pequenos ajustes necessários
[ ] Problemas críticos encontrados
```

## 🚀 PRÓXIMOS PASSOS

Após testes bem-sucedidos:

1. ✅ Validar com usuários reais
2. ✅ Coletar feedback
3. ✅ Ajustar templates se necessário
4. ✅ Documentar para o time
5. ✅ Treinar equipe de suporte

---

**Data**: 22/02/2026
**Status**: 📋 PRONTO PARA TESTE
**Tempo Estimado**: 15-20 minutos
**Dificuldade**: 🟢 FÁCIL
