# Estágios de Produção

## Visão Geral

O sistema de produção possui 6 estágios sequenciais que representam o ciclo completo de fabricação de uma peça.

## Fluxo Completo

```
awaiting_choice → design → production → quality_check → packaging → shipped
```

## Descrição dos Estágios

### 1. Aguardando Escolha (`awaiting_choice`)
**O que é**: Cliente precisa escolher o personagem

**Quando acontece**:
- Assinaturas: Cliente precisa escolher personagem do mês
- Compras avulsas: NÃO passa por este estágio (personagem já foi escolhido na compra)

**Ações necessárias**:
- Cliente: Escolher personagem
- Admin: Aprovar escolha

**Próximo estágio**: `design`

---

### 2. Design (`design`)
**O que é**: Planejamento e preparação da peça

**Quando acontece**:
- Após personagem ser escolhido e aprovado
- Equipe de design prepara o modelo 3D
- Define detalhes de pintura e acabamento

**Ações necessárias**:
- Designer: Criar/ajustar modelo 3D
- Designer: Definir esquema de cores
- Admin: Aprovar design

**Duração típica**: 2-3 dias

**Próximo estágio**: `production`

---

### 3. Produção (`production`)
**O que é**: Fabricação física da peça

**Quando acontece**:
- Impressão 3D da peça
- Limpeza e preparação da superfície
- Pintura artesanal
- Aplicação de detalhes

**Ações necessárias**:
- Produtor: Imprimir peça
- Pintor: Pintar e detalhar
- Atualizar fotos de progresso

**Duração típica**: 5-7 dias

**Próximo estágio**: `quality_check`

---

### 4. Controle de Qualidade (`quality_check`)
**O que é**: Inspeção final da peça

**Quando acontece**:
- Verificação de defeitos
- Conferência de cores e detalhes
- Teste de acabamento
- Fotos finais para cliente

**Ações necessárias**:
- Inspetor: Verificar qualidade
- Fotógrafo: Tirar fotos finais
- Admin: Aprovar ou reprovar

**Duração típica**: 1 dia

**Próximo estágio**: `packaging` ou volta para `production` se reprovado

---

### 5. Embalagem (`packaging`)
**O que é**: Preparação para envio

**Quando acontece**:
- Embalagem em caixa premium MDF
- Inclusão de certificado de autenticidade
- Proteção para transporte
- Geração de etiqueta de envio

**Ações necessárias**:
- Embalador: Embalar peça
- Admin: Gerar etiqueta
- Logística: Preparar para coleta

**Duração típica**: 1 dia

**Próximo estágio**: `shipped`

---

### 6. Enviado (`shipped`)
**O que é**: Peça foi enviada ao cliente

**Quando acontece**:
- Transportadora coletou o pacote
- Código de rastreamento ativo
- Cliente pode acompanhar entrega

**Ações necessárias**:
- Sistema: Enviar notificação com rastreamento
- Cliente: Acompanhar entrega

**Duração típica**: 5-10 dias (depende da localização)

**Próximo estágio**: Entregue (fora do sistema de produção)

---

## Status vs Estágios

### Status de Produção (`production_status`)
Representa o estado geral do pedido:
- `awaiting_choice`: Aguardando escolha do cliente
- `ready_for_production`: Pronto para iniciar produção
- `in_production`: Em processo de fabricação
- `completed`: Produção concluída
- `on_hold`: Pausado temporariamente
- `cancelled`: Cancelado

### Estágio Atual (`current_stage`)
Representa a etapa específica dentro da produção:
- `awaiting_choice`, `design`, `production`, `quality_check`, `packaging`, `shipped`

### Relação
```
Status: awaiting_choice     → Estágio: awaiting_choice
Status: ready_for_production → Estágio: design
Status: in_production       → Estágio: production, quality_check, packaging
Status: completed           → Estágio: shipped
```

---

## Transições de Estágio

### Regras
1. Estágios devem ser seguidos em ordem
2. Não é possível pular estágios (exceto com override de admin)
3. Cada transição é registrada no histórico
4. Notificações são enviadas ao cliente em cada mudança

### Exemplo de Fluxo Completo

```
Dia 1:  awaiting_choice → Cliente escolhe Luffy
Dia 2:  design → Designer cria modelo 3D
Dia 3:  design → Designer define cores
Dia 4:  production → Impressão 3D iniciada
Dia 5:  production → Peça impressa, iniciando pintura
Dia 6:  production → Pintura base concluída
Dia 7:  production → Detalhes finais
Dia 8:  quality_check → Inspeção de qualidade
Dia 9:  packaging → Embalagem em caixa MDF
Dia 10: shipped → Enviado via transportadora
```

---

## Notificações ao Cliente

O cliente recebe notificações em:
- ✅ Mudança de estágio (se habilitado nas preferências)
- ✅ Fotos de progresso disponíveis
- ✅ Peça enviada (com código de rastreamento)
- ✅ Peça entregue

---

## Para Admins

### Como Avançar Estágio
1. Acessar "Produção" no menu admin
2. Encontrar o pedido na fila
3. Clicar em "Avançar Estágio"
4. Confirmar transição

### Como Adicionar Fotos
1. Acessar detalhes do pedido
2. Ir para o estágio atual
3. Fazer upload de fotos
4. Marcar se foto é visível para cliente

### Como Pausar Produção
1. Acessar detalhes do pedido
2. Mudar status para "on_hold"
3. Adicionar motivo nas notas

---

## Perguntas Frequentes

### Por que minha compra avulsa está em "design"?
Compras avulsas pulam o estágio "awaiting_choice" porque o personagem já foi escolhido na hora da compra. O primeiro estágio é sempre "design".

### Quanto tempo leva cada estágio?
- Design: 2-3 dias
- Produção: 5-7 dias
- Controle de Qualidade: 1 dia
- Embalagem: 1 dia
- Envio: 5-10 dias
**Total**: ~15-25 dias do início ao fim

### Posso ver fotos do processo?
Sim! Fotos são adicionadas durante os estágios de produção e controle de qualidade. Você receberá notificação quando novas fotos estiverem disponíveis.

### O que acontece se reprovar no controle de qualidade?
A peça volta para o estágio de produção para correções. Você será notificado sobre o atraso.

---

## Resumo

O estágio **design** é a segunda etapa do processo, onde:
- ✅ Personagem já foi escolhido
- ✅ Equipe prepara modelo 3D
- ✅ Define cores e detalhes
- ✅ Aprova design antes de iniciar produção física

É uma etapa crucial para garantir que a peça saia exatamente como planejado!
