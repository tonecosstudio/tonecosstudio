# Sistema de Preços Contextuais

## 📋 Visão Geral

Spec completa para implementação de um sistema de preços contextuais que permite diferentes preços para coleções baseado no relacionamento do usuário com a coleção (escolhida na assinatura ou não) e tipo de modelo (catálogo tipo 1, catálogo tipo 2).

## 🎯 Objetivo

Criar um sistema de precificação dinâmica onde:
- Coleções escolhidas na assinatura têm preço promocional (R$ 200)
- Coleções não escolhidas têm preço intermediário (R$ 300)
- Usuários sem assinatura veem preço padrão (R$ 300)
- Catálogo tem preços diferenciados por tipo de modelo

## 📁 Estrutura da Spec

```
.kiro/specs/contextual-pricing-system/
├── README.md              # Este arquivo
├── .config.kiro           # Configuração da spec
├── requirements.md        # Requisitos funcionais e não funcionais
├── design.md              # Design técnico e arquitetura
└── tasks.md               # Lista de tarefas de implementação
```

## 🚀 Como Usar Esta Spec

### 1. Leitura Recomendada

1. **Comece por**: `requirements.md`
   - Entenda as regras de negócio
   - Revise os casos de uso
   - Valide os critérios de aceitação

2. **Depois leia**: `design.md`
   - Entenda a arquitetura
   - Revise o modelo de dados
   - Estude os fluxos de dados

3. **Por fim**: `tasks.md`
   - Veja a lista de tarefas
   - Entenda as dependências
   - Planeje a implementação

### 2. Executando a Spec

```bash
# Opção 1: Executar todas as tasks automaticamente
kiro execute-spec contextual-pricing-system

# Opção 2: Executar task específica
kiro execute-task contextual-pricing-system "2.1 Criar migration para tabela collection_type_pricing"

# Opção 3: Executar manualmente seguindo tasks.md
```

## 📊 Status Atual

- **Status**: Not Started
- **Prioridade**: Alta
- **Estimativa**: 5 dias
- **Workflow**: Requirements-First

## 🔑 Conceitos Chave

### Tipos de Coleção
- `subscription`: Coleções de assinatura (preços contextuais)
- `catalog_1`: Catálogo Modelo Tipo 1 (R$ 300)
- `catalog_2`: Catálogo Modelo Tipo 2 (R$ 400)

### Contextos de Usuário
- `subscribed_chosen`: Assinante que escolheu a coleção (R$ 200)
- `subscribed_not_chosen`: Assinante que não escolheu (R$ 300)
- `no_subscription`: Sem assinatura (R$ 300)

### Cálculo de Preço
```
Preço = f(tipo_coleção, contexto_usuário)
```

## 🎨 Principais Componentes

### Backend
- `get_collection_price()`: Função SQL para calcular preço
- `validate_collection_limit()`: Valida limite de coleções
- `update_pricing_with_history()`: Atualiza preço com auditoria

### Frontend
- `ContextualPricingManager`: Gerencia configuração de preços
- `PricingContextTable`: Tabela editável de preços
- `CollectionLimitConfig`: Configura limite por plano

### Hooks
- `useContextualPricing()`: Gerencia preços contextuais
- `useCollectionPrice()`: Calcula preço de uma coleção
- `useCollectionLimit()`: Valida limite de coleções

## 📈 Fluxos Principais

### 1. Admin Configura Preços
```
Admin → /admin/planos → Aba "Preços Contextuais" 
→ Edita preço → Salva → Histórico registrado
```

### 2. Usuário Vê Preço
```
Usuário → Catálogo → Sistema calcula preço contextual 
→ Exibe preço correto baseado em assinatura
```

### 3. Usuário Escolhe Coleção
```
Usuário → Painel → Escolhe coleção → Sistema valida limite 
→ Adiciona coleção → Preços recalculados
```

## 🧪 Testes

### Cobertura Esperada
- Testes unitários: > 80%
- Testes de integração: Fluxos principais
- Testes de performance: < 100ms por cálculo

### Casos de Teste Críticos
1. Cálculo de preço para cada contexto
2. Validação de limite de coleções
3. Atualização de preço com histórico
4. RLS policies de segurança

## 📝 Checklist de Completude

- [ ] Todos os requisitos implementados
- [ ] Todos os casos de uso testados
- [ ] Código limpo e profissional
- [ ] Sem código legado
- [ ] Documentação atualizada
- [ ] Testes com cobertura > 80%
- [ ] Performance validada (< 100ms)
- [ ] Deploy em produção

## 🔗 Referências

- [ENTENDIMENTO_SISTEMA_PRECOS_REAL.md](../../../ENTENDIMENTO_SISTEMA_PRECOS_REAL.md)
- [ANALISE_PROPOSTA_COLLECTION_TIERS.md](../../../ANALISE_PROPOSTA_COLLECTION_TIERS.md)
- [CENTRALIZACAO_PRECOS_UNICA.md](../../../CENTRALIZACAO_PRECOS_UNICA.md)

## 💡 Notas Importantes

### Princípios de Implementação
1. **Código Limpo**: Sem gambiarras ou paliativos
2. **Profissionalismo**: Seguir padrões do projeto
3. **Performance**: Otimizar desde o início
4. **Segurança**: RLS policies corretas
5. **Manutenibilidade**: Código fácil de entender

### Riscos Identificados
1. Migration de dados existentes
2. Performance de cálculo contextual
3. Complexidade de múltiplos contextos

### Mitigações
1. Testar migration em cópia do banco
2. Índices e cache agressivo
3. UI intuitiva com tooltips

## 📞 Suporte

Para dúvidas ou problemas durante a implementação:
1. Revise os documentos da spec
2. Consulte as referências
3. Verifique os exemplos de código no design.md

---

**Criado em**: 2026-03-05  
**Workflow**: Requirements-First  
**Status**: Ready for Implementation
