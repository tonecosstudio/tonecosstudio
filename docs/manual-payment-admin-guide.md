# Guia do Administrador - Sistema de Pagamento Manual

## Visão Geral

O Sistema de Pagamento Manual permite que administradores configurem métodos de pagamento e verifiquem manualmente comprovantes enviados pelos clientes. Este guia cobre todas as funcionalidades administrativas do sistema.

## Índice

1. [Configuração de Métodos de Pagamento](#configuração-de-métodos-de-pagamento)
2. [Dashboard de Pagamentos](#dashboard-de-pagamentos)
3. [Verificação de Pagamentos](#verificação-de-pagamentos)
4. [Operações em Massa](#operações-em-massa)
5. [Relatórios e Auditoria](#relatórios-e-auditoria)
6. [Melhores Práticas](#melhores-práticas)

## Configuração de Métodos de Pagamento

### Acessando a Configuração

1. Faça login como administrador
2. Navegue até **Admin > Métodos de Pagamento**
3. Clique em **Novo Método de Pagamento**

### Criando um Método de Pagamento

#### Campos Obrigatórios

- **Nome**: Nome exibido ao cliente (ex: "PIX", "PagSeguro")
- **Tipo**: Selecione o tipo apropriado
  - `pix` - Pagamento via PIX
  - `pagseguro` - PagSeguro
  - `picpay` - PicPay
  - `paypal` - PayPal
  - `bank_transfer` - Transferência Bancária
  - `other` - Outros métodos
- **Instruções**: Texto detalhado explicando como o cliente deve realizar o pagamento
- **Status**: Ativo/Inativo

#### Campos Opcionais

- **Link de Pagamento**: URL para página de pagamento (se aplicável)
- **Chave PIX**: Sua chave PIX (CPF, CNPJ, email, telefone ou aleatória)
- **Detalhes da Conta**: Informações bancárias em formato JSON

#### Exemplo: Configurando PIX

```
Nome: PIX
Tipo: pix
Instruções: 
  1. Abra o aplicativo do seu banco
  2. Selecione PIX > Pagar com Chave
  3. Use a chave PIX: contato@ordax.com.br
  4. Valor: [será preenchido automaticamente]
  5. Após o pagamento, tire um print do comprovante
  6. Faça upload do comprovante nesta página

Chave PIX: contato@ordax.com.br
Status: Ativo
Padrão: Sim
```

### Gerenciando Métodos Existentes

- **Editar**: Clique no ícone de lápis para modificar um método
- **Ativar/Desativar**: Use o toggle para controlar visibilidade
- **Definir como Padrão**: Marque um método como padrão (apenas um pode ser padrão)
- **Reordenar**: Arraste e solte para alterar a ordem de exibição

**Importante**: Desativar um método não afeta pagamentos existentes, apenas oculta o método para novos pagamentos.

## Dashboard de Pagamentos

### Visão Geral do Dashboard

O dashboard exibe todos os pagamentos pendentes de verificação. Acesse via **Admin > Pagamentos**.

### Indicadores de Status

- 🟡 **Pendente** (`pending`): Aguardando upload de comprovante
- 🔵 **Em Análise** (`under_review`): Comprovante enviado, aguardando verificação
- 🟠 **Requer Informação** (`requires_info`): Solicitadas informações adicionais ao cliente
- 🟢 **Aprovado** (`approved`): Pagamento verificado e aprovado
- 🔴 **Rejeitado** (`rejected`): Pagamento rejeitado

### Filtros Disponíveis

1. **Por Status**: Filtre por um ou múltiplos status
2. **Por Método de Pagamento**: Veja pagamentos de um método específico
3. **Por Período**: Selecione intervalo de datas
4. **Busca**: Procure por número de referência ou nome do cliente

### Informações Exibidas

Cada item na lista mostra:
- Número de referência (ex: PAY-20260215-1234)
- Nome e email do cliente
- Valor e moeda
- Método de pagamento
- Status atual
- Data de criação
- Quantidade de arquivos anexados
- Mensagens não lidas

### Ordenação

Clique nos cabeçalhos das colunas para ordenar por:
- Data (padrão: mais recentes primeiro)
- Valor
- Nome do cliente
- Status

## Verificação de Pagamentos

### Acessando Detalhes do Pagamento

1. No dashboard, clique em qualquer pagamento
2. A tela de detalhes será aberta

### Informações Disponíveis

#### Dados do Pagamento
- Número de referência
- Cliente (nome, email)
- Valor e moeda
- Método de pagamento selecionado
- Tipo (compra única ou recorrente)
- Pedido ou assinatura vinculada
- Data de criação
- Status atual

#### Comprovantes Enviados

- Visualize miniaturas de imagens (JPG, PNG)
- Clique para ver em tamanho completo
- Baixe PDFs ou imagens
- Veja data e hora de cada upload

#### Histórico de Auditoria

Todas as ações são registradas:
- Criação do pagamento
- Uploads de arquivos
- Mudanças de status
- Aprovações/rejeições
- Solicitações de informação
- Administrador responsável por cada ação

#### Conversa de Suporte

- Acesse a conversa vinculada ao pagamento
- Envie mensagens ao cliente
- Veja histórico completo de comunicação

### Ações Disponíveis

#### 1. Aprovar Pagamento

**Quando usar**: Comprovante válido e pagamento confirmado

**Passos**:
1. Clique em **Aprovar**
2. Confirme a ação no modal
3. O sistema automaticamente:
   - Atualiza status para `approved`
   - Marca pedido/assinatura como pago
   - Cria entregas (se for assinatura)
   - Envia email de confirmação ao cliente
   - Registra ação no log de auditoria

**Efeitos**:
- Para pedidos: Status muda para "Pago", inicia processo de fulfillment
- Para assinaturas: Status muda para "Ativa", cria cronograma de entregas

#### 2. Rejeitar Pagamento

**Quando usar**: Comprovante inválido, fraudulento ou pagamento não confirmado

**Passos**:
1. Clique em **Rejeitar**
2. Digite o motivo da rejeição (obrigatório)
3. Confirme a ação

**Motivos comuns**:
- "Comprovante ilegível ou incompleto"
- "Valor divergente do solicitado"
- "Pagamento não identificado em nossa conta"
- "Comprovante editado ou fraudulento"
- "Dados bancários não correspondem"

**Efeitos**:
- Status muda para `rejected`
- Cliente recebe email com motivo
- Cliente pode reenviar novo comprovante

#### 3. Solicitar Mais Informações

**Quando usar**: Comprovante incompleto ou necessita esclarecimentos

**Passos**:
1. Clique em **Solicitar Informações**
2. Digite sua mensagem ao cliente
3. Confirme

**Exemplos de mensagens**:
- "Por favor, envie um comprovante mais nítido"
- "O valor no comprovante está diferente. Confirme o pagamento de R$ 150,00"
- "Precisamos do comprovante completo mostrando data e hora"
- "Envie também o extrato bancário mostrando a transação"

**Efeitos**:
- Status muda para `requires_info`
- Mensagem é postada na conversa
- Cliente recebe email com sua solicitação
- Quando cliente responder, status volta para `under_review`

### Tempo de Resposta Recomendado

- **Meta**: Responder em até 2 horas durante horário comercial (9h-18h)
- **Máximo aceitável**: 24 horas
- Pagamentos urgentes: Priorize valores altos ou clientes VIP

## Operações em Massa

### Selecionando Múltiplos Pagamentos

1. No dashboard, marque as caixas de seleção dos pagamentos desejados
2. Ou use **Selecionar Todos** para a página atual
3. Ações em massa aparecerão no topo

### Aprovação em Massa

**Quando usar**: Múltiplos pagamentos PIX verificados no extrato bancário

**Passos**:
1. Selecione os pagamentos (apenas status `under_review`)
2. Clique em **Aprovar Selecionados**
3. Revise a contagem no modal de confirmação
4. Confirme a operação

**Comportamento**:
- Apenas pagamentos em análise serão aprovados
- Pagamentos com status incompatível serão ignorados
- Relatório final mostra sucessos e falhas

### Exportação em Massa

**Formatos disponíveis**: CSV, PDF

**Dados exportados**:
- Número de referência
- Cliente (nome, email)
- Valor e moeda
- Método de pagamento
- Status
- Datas (criação, aprovação)
- Administrador responsável

**Passos**:
1. Aplique filtros desejados (opcional)
2. Selecione pagamentos ou use "Selecionar Todos"
3. Clique em **Exportar Selecionados**
4. Escolha formato (CSV ou PDF)
5. Arquivo será baixado automaticamente

### Mensagem em Massa

**Quando usar**: Comunicar problema comum a múltiplos clientes

**Passos**:
1. Selecione os pagamentos
2. Clique em **Enviar Mensagem**
3. Digite a mensagem (será enviada para todos)
4. Confirme

**Exemplo de uso**: "Identificamos instabilidade no sistema PIX hoje. Se seu pagamento foi realizado, aguarde até 24h para processamento."

## Relatórios e Auditoria

### Estatísticas do Dashboard

O topo do dashboard exibe:
- **Pagamentos Pendentes**: Total aguardando ação
- **Em Análise**: Com comprovante enviado
- **Requer Informação**: Aguardando resposta do cliente
- **Valor Total Pendente**: Soma de todos os pagamentos não aprovados
- **Tempo Médio de Processamento**: Média em horas

### Relatório de Histórico

**Acesso**: Admin > Pagamentos > Relatórios

**Filtros disponíveis**:
- Período (data inicial e final)
- Status
- Método de pagamento
- Administrador responsável

**Informações incluídas**:
- Lista completa de pagamentos
- Estatísticas resumidas:
  - Total de pagamentos
  - Valor total
  - Taxa de aprovação
  - Tempo médio de processamento
  - Distribuição por método de pagamento

### Log de Auditoria

Cada pagamento mantém registro completo de:
- Quem criou (cliente)
- Quando foi criado
- Todos os uploads de arquivos
- Todas as mudanças de status
- Administrador responsável por cada ação
- Notas e motivos de rejeição

**Acesso**: Disponível na tela de detalhes de cada pagamento

**Retenção**: Logs são mantidos indefinidamente para conformidade

## Melhores Práticas

### Verificação de Comprovantes

✅ **Faça**:
- Verifique data e hora do pagamento
- Confirme o valor exato
- Valide dados do beneficiário
- Cruze com extrato bancário quando possível
- Procure sinais de edição em imagens

❌ **Não faça**:
- Aprovar comprovantes ilegíveis
- Aceitar valores divergentes sem confirmação
- Ignorar sinais de fraude
- Aprovar sem verificar o extrato (para valores altos)

### Comunicação com Clientes

✅ **Faça**:
- Seja claro e específico nas solicitações
- Use tom profissional mas amigável
- Explique o motivo de rejeições
- Responda rapidamente
- Agradeça pela paciência

❌ **Não faça**:
- Usar jargão técnico excessivo
- Ser vago nas solicitações
- Rejeitar sem explicação
- Demorar para responder
- Ser rude ou impaciente

### Segurança

✅ **Faça**:
- Desconfie de comprovantes muito "perfeitos"
- Verifique metadados de imagens suspeitas
- Cruze informações com sistema bancário
- Reporte fraudes suspeitas
- Mantenha credenciais seguras

❌ **Não faça**:
- Compartilhar acesso administrativo
- Aprovar pagamentos duvidosos
- Ignorar alertas de segurança
- Processar pagamentos fora do sistema

### Eficiência

✅ **Faça**:
- Use filtros para priorizar pagamentos
- Processe em lotes quando possível
- Configure métodos de pagamento claramente
- Mantenha instruções atualizadas
- Use operações em massa apropriadamente

❌ **Não faça**:
- Deixar pagamentos sem resposta por dias
- Processar um por um quando pode usar lote
- Manter métodos inativos visíveis
- Usar instruções desatualizadas

### Conformidade

✅ **Faça**:
- Documente decisões importantes
- Mantenha registros de auditoria
- Siga políticas de privacidade (LGPD)
- Retenha dados pelo período legal
- Reporte atividades suspeitas

❌ **Não faça**:
- Deletar logs de auditoria
- Compartilhar dados de clientes
- Ignorar requisitos legais
- Processar sem documentação

## Solução de Problemas

### Cliente não recebeu email de confirmação

1. Verifique se email está correto no perfil
2. Peça ao cliente verificar spam/lixo eletrônico
3. Reenvie manualmente via conversa de suporte
4. Verifique logs de email no sistema

### Comprovante não carrega

1. Verifique conexão com Supabase Storage
2. Confirme que arquivo existe no bucket
3. Gere nova URL assinada
4. Verifique permissões RLS

### Aprovação não atualiza pedido/assinatura

1. Verifique logs de erro no console
2. Confirme que quote_id ou subscription_id está correto
3. Verifique se Integration Service está funcionando
4. Tente aprovar novamente

### Dashboard lento

1. Aplique filtros para reduzir resultados
2. Use paginação (25 itens por página)
3. Limpe cache do navegador
4. Verifique performance do banco de dados

## Suporte Técnico

Para problemas técnicos ou dúvidas:
- Email: suporte@ordax.com.br
- Documentação técnica: `/docs/manual-payment-api.md`
- Logs de sistema: Admin > Logs
