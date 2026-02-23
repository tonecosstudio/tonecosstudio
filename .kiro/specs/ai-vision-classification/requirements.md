# Requirements: AI Vision Classification System

## 1. Overview

Implementar sistema de classificação automática de imagens usando IA Vision (Gemini Vision / GPT-4 Vision) para reduzir trabalho manual de classificação de produtos em 65%.

**Problema Atual:**
- Admin precisa digitar manualmente o nome de cada modelo
- Processo lento: ~50 minutos para 100 imagens
- Propenso a erros de digitação
- Não escala bem

**Solução Proposta:**
- IA "olha" a imagem e sugere: nome, franquia, categoria, tags
- Admin apenas revisa e confirma
- Processo rápido: ~17 minutos para 100 imagens
- Custo baixo: ~$0.01 USD por 100 imagens

---

## 2. User Stories

### 2.1 Como Admin, quero processar imagens automaticamente

**Descrição:**
Como administrador, quero que a IA analise automaticamente as imagens após o upload, para que eu não precise digitar manualmente o nome de cada modelo.

**Critérios de Aceitação:**
- [ ] Após upload, posso clicar em "Processar com IA"
- [ ] Sistema processa todas as imagens pendentes em background
- [ ] Vejo progresso em tempo real (X de Y processadas)
- [ ] Imagens processadas ficam marcadas como "review_later"
- [ ] Recebo notificação quando processamento terminar

**Prioridade:** Alta  
**Estimativa:** 8 pontos

---

### 2.2 Como Admin, quero revisar sugestões da IA

**Descrição:**
Como administrador, quero ver as sugestões da IA no modo esteira, para que eu possa revisar e confirmar rapidamente.

**Critérios de Aceitação:**
- [ ] No modo esteira, campos vêm pré-preenchidos com sugestões da IA
- [ ] Vejo indicador visual de "Sugestão da IA"
- [ ] Posso editar qualquer campo antes de confirmar
- [ ] Posso aceitar tudo com um clique (ENTER)
- [ ] Posso rejeitar e pedir nova análise

**Prioridade:** Alta  
**Estimativa:** 5 pontos

---

### 2.3 Como Admin, quero escolher o modelo de IA

**Descrição:**
Como administrador, quero escolher entre diferentes modelos de IA (GPT-4o mini, GPT-4o), para balancear custo vs. qualidade.

**Critérios de Aceitação:**
- [ ] Posso selecionar modelo antes de processar
- [ ] Vejo estimativa de custo para cada modelo
- [ ] Vejo tempo estimado de processamento
- [ ] Sistema usa fallback automático se modelo falhar
- [ ] Vejo qual modelo foi usado em cada imagem

**Prioridade:** Média  
**Estimativa:** 3 pontos

---

### 2.4 Como Admin, quero ver estatísticas de processamento

**Descrição:**
Como administrador, quero ver estatísticas de uso da IA, para monitorar custos e qualidade.

**Critérios de Aceitação:**
- [ ] Vejo total de imagens processadas
- [ ] Vejo custo total acumulado
- [ ] Vejo taxa de aceitação das sugestões
- [ ] Vejo modelos mais usados
- [ ] Vejo tempo médio de processamento

**Prioridade:** Baixa  
**Estimativa:** 3 pontos

---

### 2.5 Como Admin, quero processar imagens individualmente

**Descrição:**
Como administrador, quero processar uma imagem específica com IA, para casos onde preciso reanalisar.

**Critérios de Aceitação:**
- [ ] No modo esteira, posso clicar em "Analisar com IA"
- [ ] Sistema processa apenas aquela imagem
- [ ] Vejo loading enquanto processa
- [ ] Campos são atualizados com nova sugestão
- [ ] Posso comparar sugestão antiga vs. nova

**Prioridade:** Média  
**Estimativa:** 2 pontos

---

## 3. Functional Requirements

### 3.1 Processamento de Imagens

**FR-1:** Sistema deve suportar processamento em lote de até 100 imagens simultâneas  
**FR-2:** Sistema deve processar imagens em background (não bloquear UI)  
**FR-3:** Sistema deve mostrar progresso em tempo real  
**FR-4:** Sistema deve salvar resultados em `images_queue`  
**FR-5:** Sistema deve marcar imagens processadas como "review_later"

### 3.2 Integração com IA

**FR-6:** Sistema deve suportar GPT-4o mini como modelo primário  
**FR-7:** Sistema deve suportar GPT-4o para casos especiais  
**FR-8:** Sistema deve fazer retry automático em caso de falha  
**FR-9:** Sistema deve cachear resultados para evitar reprocessamento

### 3.3 Classificação

**FR-11:** IA deve retornar: nome, franquia, categoria, subcategoria, tags  
**FR-12:** IA deve aplicar regras de franquia existentes  
**FR-13:** IA deve normalizar nomes (capitalização, etc.)  
**FR-14:** IA deve gerar no máximo 12 tags por imagem  
**FR-15:** IA deve retornar confiança da classificação (0-100%)

### 3.4 Interface Admin

**FR-16:** Botão "Processar com IA" na página de upload  
**FR-17:** Seletor de modelo de IA (Gemini/GPT-4o mini/GPT-4o)  
**FR-18:** Barra de progresso com contador  
**FR-19:** Indicador visual de "Sugestão da IA" no modo esteira  
**FR-20:** Botão "Reanalisar" para processar novamente

---

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-1:** Processamento deve levar no máximo 5 segundos por imagem  
**NFR-2:** Sistema deve processar 100 imagens em menos de 10 minutos  
**NFR-3:** UI deve permanecer responsiva durante processamento  
**NFR-4:** Cache deve reduzir tempo de reprocessamento em 90%

### 4.2 Custo

**NFR-5:** Custo médio deve ser menor que $0.0002 por imagem (GPT-4o mini)  
**NFR-6:** Custo total mensal deve ser monitorado e alertado  
**NFR-7:** Sistema deve usar modelo mais barato por padrão (GPT-4o mini)  
**NFR-8:** Sistema deve evitar chamadas duplicadas

### 4.3 Qualidade

**NFR-9:** Taxa de aceitação das sugestões deve ser >70%  
**NFR-10:** Precisão de franquia deve ser >85%  
**NFR-11:** Precisão de categoria deve ser >80%  
**NFR-12:** Sistema deve aprender com correções do admin

### 4.4 Segurança

**NFR-13:** Apenas admins podem processar com IA  
**NFR-14:** API keys devem estar em variáveis de ambiente  
**NFR-15:** Logs devem registrar todas as chamadas de IA  
**NFR-16:** Sistema deve validar URLs de imagens

### 4.5 Escalabilidade

**NFR-17:** Sistema deve suportar até 1000 imagens/dia  
**NFR-18:** Sistema deve suportar processamento paralelo  
**NFR-19:** Sistema deve ter rate limiting para evitar sobrecarga  
**NFR-20:** Sistema deve ter queue para processar em ordem

---

## 5. Technical Constraints

### 5.1 APIs Externas

- OpenAI API (GPT-4o, GPT-4o mini)
- Supabase Storage (imagens públicas)

### 5.2 Limites

- Tamanho máximo de imagem: 20MB
- Resolução máxima: 4096x4096px
- Timeout de processamento: 30 segundos
- Rate limit: 100 requisições/minuto

### 5.3 Dependências

- Edge Function: `classify-image-vision`
- Shared helper: `classifyImageWithVision()`
- Tabela: `images_queue` (já existe)
- Tabela: `ai_vision_cache` (nova)

---

## 6. Success Metrics

### 6.1 Eficiência

- **Tempo de classificação:** Redução de 65% (de 63min para 22min por 100 imagens)
- **Taxa de automação:** >80% das imagens aceitas sem edição
- **Throughput:** >10 imagens/minuto

### 6.2 Qualidade

- **Precisão geral:** >80% de sugestões corretas
- **Taxa de rejeição:** <10% de sugestões rejeitadas
- **Satisfação do admin:** >4/5 em pesquisa

### 6.2 Custo

- **Custo por imagem:** <$0.0002 USD (GPT-4o mini)
- **Custo mensal:** <$10 USD para 1000 imagens
- **ROI:** Positivo em 1 mês (economia de tempo)

---

## 7. Out of Scope (Fase 1)

- ❌ Detecção de duplicatas por embeddings
- ❌ Treinamento de modelo customizado
- ❌ Processamento de vídeos
- ❌ OCR de texto em imagens
- ❌ Detecção de qualidade de imagem
- ❌ Sugestão de preços
- ❌ Comparação com catálogo existente

---

## 8. Future Enhancements (Fase 2)

- 🔮 Detecção de duplicatas usando embeddings
- 🔮 Aprendizado com feedback do admin
- 🔮 Sugestão de modelos similares
- 🔮 Análise de qualidade de imagem
- 🔮 Extração de texto (OCR) para nomes
- 🔮 Classificação de múltiplos objetos na mesma imagem
- 🔮 Dashboard de analytics de IA

---

## 9. Acceptance Criteria (Global)

### 9.1 Funcional

- [ ] Admin pode processar 100 imagens com 1 clique
- [ ] Sugestões aparecem automaticamente no modo esteira
- [ ] Taxa de aceitação >70% sem edição
- [ ] Processamento completa em <10 minutos

### 9.2 Técnico

- [ ] Edge Function deployada e funcionando
- [ ] Cache implementado e funcionando
- [ ] Fallback entre modelos funcionando
- [ ] Logs e monitoramento implementados

### 9.3 UX

- [ ] UI intuitiva e responsiva
- [ ] Feedback visual claro
- [ ] Sem bloqueio da interface
- [ ] Mensagens de erro claras

### 9.4 Custo

- [ ] Custo por imagem <$0.0002
- [ ] Monitoramento de custos implementado
- [ ] Alertas de custo configurados

---

## 10. Dependencies

### 10.1 Externas

- OpenAI API (já configurado)
- Supabase Storage (já configurado)

### 10.2 Internas

- Sistema de upload (já existe)
- Modo esteira (já existe)
- Sistema de cache (já existe)
- Sistema de regras de franquia (já existe)

---

## 11. Risks & Mitigations

### 11.1 Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Custo alto de API | Média | Alto | Usar Gemini como primário, monitorar custos |
| Qualidade baixa | Baixa | Alto | Fallback para GPT-4o, permitir reanálise |
| Rate limiting | Média | Médio | Implementar queue, retry com backoff |
| Timeout | Baixa | Médio | Timeout de 30s, processar em lotes |
| Imagens grandes | Média | Baixo | Redimensionar antes de enviar |

---

## 12. Timeline

### Fase 1: MVP (2 semanas)
- Semana 1: Edge Function + helpers
- Semana 2: UI + testes

### Fase 2: Melhorias (1 semana)
- Estatísticas e monitoramento
- Otimizações de performance

### Fase 3: Avançado (futuro)
- Detecção de duplicatas
- Aprendizado com feedback

---

## 13. Stakeholders

- **Product Owner:** Tonecos Studios
- **Tech Lead:** Dev Team
- **End Users:** Administradores do sistema
- **Impacted:** Clientes (indiretamente, via catálogo mais completo)

---

## 14. Glossary

- **IA Vision:** Modelos de IA que analisam imagens (Gemini Vision, GPT-4 Vision)
- **Modo Esteira:** Interface de classificação rápida de imagens
- **images_queue:** Tabela de fila de processamento de imagens
- **Fallback:** Modelo alternativo usado quando o primário falha
- **Token:** Unidade de cobrança das APIs de IA
- **Embedding:** Representação vetorial de imagem para similaridade

---

**Status:** Draft  
**Versão:** 1.0  
**Data:** 31 de Janeiro de 2026  
**Autor:** Kiro AI
