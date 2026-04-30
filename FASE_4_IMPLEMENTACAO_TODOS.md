# 🚀 FASE 4: Implementação de TODOs Críticos

**Data:** 29 de Abril de 2026
**Status:** 🟢 EM ANDAMENTO
**Prioridade:** 🔴 CRÍTICA

---

## 📋 RESUMO EXECUTIVO

Esta fase implementa os 2 TODOs críticos identificados na varredura inicial que bloqueiam funcionalidades essenciais do sistema.

---

## 🎯 OBJETIVOS

### TODO #1: Verificação de Estoque Real ✅
**Arquivo:** `src/services/customer/choice-service.ts:94`
**Problema:** Retorna `isAvailable: true` hardcoded
**Impacto:** Clientes podem escolher personagens indisponíveis
**Solução:** Implementar função `checkCharacterAvailability(characterId)`

### TODO #2: Criação de Coleção na UI ⏳
**Arquivo:** `src/pages/admin/collections/AdminCollections.tsx:141`
**Problema:** Apenas faz `console.log("Criar coleção:", data)`
**Impacto:** Admin não consegue criar coleções pela UI
**Solução:** Implementar chamada à API do Supabase

---

## 📊 ANÁLISE TÉCNICA

### TODO #1: Verificação de Estoque

**Código Atual:**
```typescript
// Linha 94 em choice-service.ts
const characters: Character[] = (data || []).map((char) => ({
  id: char.id,
  name: char.name,
  description: char.description,
  imageUrl: char.image_url,
  collectionId: char.collection_id,
  isAvailable: true, // TODO: Implementar verificação de estoque real
}));
```

**Análise:**
- ✅ Estrutura de dados correta
- ❌ Disponibilidade sempre `true`
- ❌ Não verifica estoque real
- ❌ Não considera personagens já escolhidos

**Solução Proposta:**
1. Criar função `checkCharacterAvailability(characterId, collectionId)`
2. Verificar estoque na tabela `collection_characters`
3. Verificar escolhas já feitas na tabela `character_choices`
4. Retornar disponibilidade real

---

### TODO #2: Criação de Coleção

**Código Atual:**
```typescript
// Linha 140-143 em AdminCollections.tsx
onSubmit={async (data: CollectionFormDataWithCharacters) => {
  // TODO: Implementar criação de coleção com personagens
  console.log("Criar coleção:", data);
  await new Promise(resolve => setTimeout(resolve, 1000));
  qc.invalidateQueries({ queryKey: ["admin-collections-v2"] });
}}
```

**Análise:**
- ✅ Estrutura de formulário existe
- ✅ Validação de dados implementada
- ❌ Não salva no banco de dados
- ❌ Apenas simula com timeout

**Solução Proposta:**
1. Implementar inserção na tabela `collections`
2. Implementar inserção de personagens em `collection_characters`
3. Fazer upload de imagens para Supabase Storage
4. Validar dados antes de inserir
5. Tratar erros adequadamente

---

## 🔧 IMPLEMENTAÇÃO

### Passo 1: TODO #1 - Verificação de Estoque ✅

**Arquivos a Modificar:**
- `src/services/customer/choice-service.ts`

**Mudanças:**
1. Criar função `checkCharacterAvailability()`
2. Atualizar `getAvailableCharacters()` para usar a nova função
3. Adicionar verificação de estoque
4. Adicionar verificação de escolhas existentes

**Tempo Estimado:** 30-45 minutos

---

### Passo 2: TODO #2 - Criação de Coleção ⏳

**Arquivos a Modificar:**
- `src/pages/admin/collections/AdminCollections.tsx`

**Mudanças:**
1. Implementar lógica de criação no `onSubmit`
2. Adicionar upload de imagens
3. Adicionar validação de dados
4. Adicionar tratamento de erros
5. Adicionar feedback visual

**Tempo Estimado:** 45-60 minutos

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### TODO #1: Verificação de Estoque
- [ ] Criar função `checkCharacterAvailability()`
- [ ] Implementar verificação de estoque
- [ ] Implementar verificação de escolhas
- [ ] Atualizar `getAvailableCharacters()`
- [ ] Testar com personagens disponíveis
- [ ] Testar com personagens indisponíveis
- [ ] Validar build

### TODO #2: Criação de Coleção
- [ ] Implementar inserção na tabela `collections`
- [ ] Implementar inserção de personagens
- [ ] Implementar upload de imagens
- [ ] Adicionar validação de dados
- [ ] Adicionar tratamento de erros
- [ ] Testar criação de coleção
- [ ] Testar criação com personagens
- [ ] Validar build

---

## 🎯 CRITÉRIOS DE SUCESSO

### TODO #1
- ✅ Função `checkCharacterAvailability()` implementada
- ✅ Verificação de estoque funcionando
- ✅ Personagens indisponíveis marcados corretamente
- ✅ Build sem erros
- ✅ Testes passando

### TODO #2
- ✅ Coleções criadas com sucesso
- ✅ Personagens associados corretamente
- ✅ Imagens fazendo upload
- ✅ Validação funcionando
- ✅ Erros tratados adequadamente
- ✅ Build sem erros

---

## 📈 IMPACTO ESPERADO

### Antes
```
❌ Verificação de estoque: FAKE (sempre disponível)
❌ Criação de coleção: NÃO FUNCIONA (apenas console.log)
```

### Depois
```
✅ Verificação de estoque: REAL (verifica disponibilidade)
✅ Criação de coleção: FUNCIONA (salva no banco)
```

---

## ⏱️ CRONOGRAMA

| Tarefa | Tempo Estimado | Status |
|--------|----------------|--------|
| TODO #1: Verificação de Estoque | 30-45 min | ⏳ Próximo |
| TODO #2: Criação de Coleção | 45-60 min | ⏳ Aguardando |
| Testes e Validação | 30 min | ⏳ Aguardando |
| **TOTAL** | **2-2.5 horas** | **0% completo** |

---

## 🚨 RISCOS E MITIGAÇÕES

### Risco 1: Verificação de Estoque Complexa
**Probabilidade:** Média
**Impacto:** Médio
**Mitigação:** Implementar verificação simples primeiro, otimizar depois

### Risco 2: Upload de Imagens Falhar
**Probabilidade:** Baixa
**Impacto:** Alto
**Mitigação:** Adicionar tratamento de erros robusto, permitir criação sem imagem

### Risco 3: Validação de Dados Insuficiente
**Probabilidade:** Baixa
**Impacto:** Médio
**Mitigação:** Usar validação existente do formulário, adicionar validação no backend

---

## 📝 NOTAS TÉCNICAS

### Verificação de Estoque
- Considerar limite de personagens por coleção
- Verificar se personagem já foi escolhido por outro cliente
- Implementar cache para melhorar performance

### Criação de Coleção
- Usar transação para garantir consistência
- Validar dados antes de inserir
- Fazer rollback em caso de erro
- Adicionar logs para debugging

---

## 🎉 PRÓXIMOS PASSOS

1. ✅ Implementar TODO #1 (Verificação de Estoque)
2. ⏳ Implementar TODO #2 (Criação de Coleção)
3. ⏳ Testar ambas as funcionalidades
4. ⏳ Validar build
5. ⏳ Criar relatório final

---

**Responsável:** Kiro AI
**Data de Início:** 29 de Abril de 2026
**Previsão de Conclusão:** 29 de Abril de 2026 (2-2.5 horas)

🚀 **Iniciando implementação do TODO #1...**
