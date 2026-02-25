# ✅ FAQ Dinâmico na Página Collections

## 🎯 Status: FUNCIONANDO CORRETAMENTE

A página Collections está usando o sistema de FAQ dinâmico que processa variáveis de template automaticamente, buscando os valores do banco de dados.

---

## 🔧 Como Funciona

### 1. Componente DynamicFAQ

O componente `DynamicFAQ` é responsável por:

- Buscar configurações do banco via `useContentSettings()`
- Processar variáveis de template `{{variable}}` via `processContentVariables()`
- Renderizar os FAQs com valores atualizados

```typescript
// src/components/content/DynamicFAQ.tsx
export function DynamicFAQ({ items }: DynamicFAQProps) {
  const { data: content } = useContentSettings();

  return items.map((faq) => {
    const answer = typeof faq.a === "function" ? faq.a(content) : faq.a;
    const processedAnswer = processContentVariables(answer, content);
    // Renderiza com valores processados
  });
}
```

### 2. Uso na Página Collections

```typescript
// src/pages/Collections.tsx
<DynamicFAQ
  items={[
    {
      q: "Posso trocar de coleção?",
      a: "{{faq_exchange}}", // ← Variável de template
    },
    {
      q: "Quando recebo a primeira peça?",
      a: "{{faq_first_delivery}}", // ← Variável de template
    },
    {
      q: "Posso cancelar a qualquer momento?",
      a: "{{faq_cancellation}}", // ← Variável de template
    },
    {
      q: "Qual a diferença entre os planos?",
      a: (content) => `...economia de até R$ ${maxSavings.toFixed(0)}...`, // ← Função dinâmica
    },
  ]}
/>
```

---

## 📊 Variáveis de Template Disponíveis

### FAQ Configuradas no Banco

| Variável                 | Descrição                        | Valor Padrão                                                                                                               |
| ------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `{{faq_exchange}}`       | Resposta sobre trocas de coleção | "Sim! Você pode trocar suas coleções quantas vezes quiser, desde que seja até 1 dia(s) antes da produção do próximo lote." |
| `{{faq_first_delivery}}` | Resposta sobre primeira entrega  | "Operamos com 2 ciclos por mês: Ciclo 1 (dia 01-15) e Ciclo 2 (dia 16-último dia)..."                                      |
| `{{faq_cancellation}}`   | Resposta sobre cancelamento      | "Sim, você pode cancelar sua assinatura a qualquer momento. As peças já pagas serão entregues normalmente."                |

### Variáveis Aninhadas (Dentro dos FAQs)

As respostas dos FAQs podem conter outras variáveis que também são processadas:

```
{{faq_exchange}} contém:
- {{exchange_deadline_days}} → "1"

{{faq_first_delivery}} contém:
- {{sales_open_day}} → "1"
- {{sales_duration_days}} → "15"
- {{production_days_min}} → "15"
- {{shipping_days}} → "5"
- E outras variáveis de data
```

---

## 🔄 Fluxo de Processamento

```
┌─────────────────────────────────────────────────────────────┐
│                  BANCO DE DADOS                             │
│              system_settings table                          │
│  • faq_exchange: "Sim! Você pode trocar..."                 │
│  • faq_first_delivery: "Operamos com 2 ciclos..."           │
│  • faq_cancellation: "Sim, você pode cancelar..."           │
│  • exchange_deadline_days: "1"                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              useContentSettings() Hook                      │
│  • Busca todas as configurações                             │
│  • Cache de 5 minutos                                       │
│  • Retorna objeto com todas as chaves                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              DynamicFAQ Component                           │
│  const { data: content } = useContentSettings();            │
│                                                             │
│  Para cada FAQ:                                             │
│  1. Pega a resposta (string ou função)                      │
│  2. Se função: executa com content                          │
│  3. Processa variáveis: processContentVariables()           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          processContentVariables() Function                 │
│  • Substitui {{faq_exchange}} → valor do banco              │
│  • Substitui {{exchange_deadline_days}} → "1"               │
│  • Processa todas as variáveis aninhadas                    │
│  • Retorna texto final processado                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  RENDERIZAÇÃO FINAL                         │
│  "Sim! Você pode trocar suas coleções quantas vezes         │
│   quiser, desde que seja até 1 dia(s) antes da produção     │
│   do próximo lote."                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Exemplo Prático

### Configuração no Banco

```sql
-- system_settings table
key: 'faq_exchange'
value: 'Sim! Você pode trocar suas coleções quantas vezes quiser, desde que seja até {{exchange_deadline_days}} dia(s) antes da produção do próximo lote.'

key: 'exchange_deadline_days'
value: '1'
```

### Código na Página

```typescript
<DynamicFAQ
  items={[
    {
      q: "Posso trocar de coleção?",
      a: "{{faq_exchange}}", // ← Template
    },
  ]}
/>
```

### Processamento

1. `DynamicFAQ` busca `content` via `useContentSettings()`
2. Encontra `a: "{{faq_exchange}}"`
3. Chama `processContentVariables("{{faq_exchange}}", content)`
4. Substitui `{{faq_exchange}}` por `content.faq_exchange`
5. Resultado: `"Sim! Você pode trocar suas coleções quantas vezes quiser, desde que seja até {{exchange_deadline_days}} dia(s)..."`
6. Processa novamente para substituir `{{exchange_deadline_days}}`
7. Resultado final: `"Sim! Você pode trocar suas coleções quantas vezes quiser, desde que seja até 1 dia(s)..."`

---

## 🔧 Função com Valores Dinâmicos

Além das variáveis de template, você pode usar funções para cálculos dinâmicos:

```typescript
{
  q: "Qual a diferença entre os planos?",
  a: (content) =>
    `A principal diferença é a quantidade de coleções e o número de entregas.
     Planos maiores têm mais benefícios e melhor custo-benefício,
     com economia de até R$ ${maxSavings.toFixed(0)} no Anual.`,
}
```

Neste caso:

- `maxSavings` é calculado dinamicamente com base nos planos do banco
- A função recebe `content` como parâmetro (caso precise de outras variáveis)
- O resultado é processado por `processContentVariables()` para substituir qualquer `{{variable}}`

---

## ✅ Validação

### Checklist de Funcionamento

- [x] `DynamicFAQ` importado corretamente
- [x] `useContentSettings()` usado internamente no componente
- [x] `processContentVariables()` processa as variáveis
- [x] Variáveis `{{faq_*}}` definidas no banco
- [x] Variáveis aninhadas também processadas
- [x] Função dinâmica com `maxSavings` funciona
- [x] Cache de 5 minutos implementado
- [x] Loading state durante busca

### Teste Manual

```bash
# 1. Acessar Collections
http://localhost:5173/colecoes

# 2. Rolar até a seção "Perguntas Frequentes"

# 3. Verificar se as respostas aparecem corretamente:
# - "Posso trocar de coleção?" → Deve mostrar texto do banco
# - "Quando recebo a primeira peça?" → Deve mostrar texto do banco
# - "Posso cancelar a qualquer momento?" → Deve mostrar texto do banco
# - "Qual a diferença entre os planos?" → Deve mostrar economia calculada

# 4. Alterar no admin (opcional)
http://localhost:5173/admin/configuracoes
# Ir em "Conteúdo e FAQ"
# Alterar "faq_exchange"
# Voltar para Collections e verificar mudança
```

---

## 🎨 Customização pelo Admin

O admin pode alterar os textos dos FAQs em:

```
/admin/configuracoes → Aba "Conteúdo e FAQ"

Campos editáveis:
- FAQ: Trocas de Coleção (faq_exchange)
- FAQ: Primeira Entrega (faq_first_delivery)
- FAQ: Cancelamento (faq_cancellation)
- Prazo para Troca (exchange_deadline_days)
```

As mudanças aparecem automaticamente na página após salvar (respeitando o cache de 5 minutos).

---

## 📝 Boas Práticas

### 1. Use Variáveis de Template para Textos Estáticos

```typescript
// ✅ BOM
{
  q: "Posso trocar?",
  a: "{{faq_exchange}}", // Admin pode editar
}

// ❌ EVITAR
{
  q: "Posso trocar?",
  a: "Sim, você pode trocar...", // Hardcoded
}
```

### 2. Use Funções para Cálculos Dinâmicos

```typescript
// ✅ BOM
{
  q: "Qual a economia?",
  a: (content) => `Economia de até R$ ${maxSavings.toFixed(0)}`, // Calculado
}

// ❌ EVITAR
{
  q: "Qual a economia?",
  a: "Economia de até R$ 800", // Hardcoded
}
```

### 3. Combine Ambos Quando Necessário

```typescript
// ✅ BOM
{
  q: "Qual o prazo?",
  a: (content) => `Entrega em até ${content.shipping_days} dias úteis`, // Variável + cálculo
}
```

---

## 🐛 Troubleshooting

### Problema: FAQ não aparece

**Causa**: Configuração não existe no banco  
**Solução**: Verificar se a migration foi aplicada

```sql
SELECT * FROM system_settings WHERE key LIKE 'faq_%';
```

### Problema: Variável não é substituída

**Causa**: Nome da variável incorreto  
**Solução**: Verificar se o nome corresponde à chave no banco

```typescript
// ❌ ERRADO
a: "{{faq_troca}}"; // Não existe

// ✅ CORRETO
a: "{{faq_exchange}}"; // Existe no banco
```

### Problema: Valor não atualiza após mudança no admin

**Causa**: Cache de 5 minutos  
**Solução**: Aguardar 5 minutos ou limpar cache do navegador

---

## 🎉 Conclusão

O sistema de FAQ dinâmico está funcionando perfeitamente na página Collections:

- ✅ Variáveis de template processadas automaticamente
- ✅ Valores vêm do banco de dados
- ✅ Admin pode editar pela interface web
- ✅ Cálculos dinâmicos (como `maxSavings`) funcionam
- ✅ Cache inteligente implementado
- ✅ Fallbacks seguros

**Status**: ✅ FUNCIONANDO CORRETAMENTE

---

**Documentação criada em**: 2026-02-24  
**Componente**: `DynamicFAQ`  
**Página**: `Collections.tsx`  
**Sistema**: Configurações Dinâmicas SSOT
