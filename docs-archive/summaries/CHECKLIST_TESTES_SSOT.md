# ✅ Checklist de Testes: Sistema SSOT

Use este checklist para validar que todas as funcionalidades estão funcionando corretamente.

---

## 🎯 Testes Funcionais

### 1. Acesso ao Painel Admin

- [ ] Fazer login como admin
- [ ] Acessar `/admin`
- [ ] Verificar se o menu lateral aparece
- [ ] Localizar "Configurações" no menu
- [ ] Clicar em "Conteúdo (SSOT)"
- [ ] Verificar se a página carrega corretamente

**Resultado esperado:** Página carrega com 3 abas e preview do lote atual

---

### 2. Preview do Lote Atual

- [ ] Verificar se o card de preview aparece no topo
- [ ] Confirmar que mostra:
  - [ ] Nome do lote
  - [ ] Datas de vendas
  - [ ] Datas de produção
  - [ ] Mês de envio
  - [ ] Prazo de envio

**Resultado esperado:** Todas as informações aparecem formatadas corretamente

---

### 3. Aba "Lote Atual"

- [ ] Clicar na aba "Lote Atual"
- [ ] Verificar se todos os campos aparecem:
  - [ ] Nome do Lote
  - [ ] Início das Vendas
  - [ ] Fim das Vendas
  - [ ] Início da Produção
  - [ ] Fim da Produção
  - [ ] Mês de Envio
  - [ ] Prazo de Envio (dia útil)
- [ ] Verificar se os valores atuais estão preenchidos
- [ ] Verificar se há descrições abaixo de cada campo

**Resultado esperado:** 7 campos visíveis e preenchidos

---

### 4. Aba "Prazos"

- [ ] Clicar na aba "Prazos"
- [ ] Verificar se todos os campos aparecem:
  - [ ] Prazo Mínimo de Produção (dias)
  - [ ] Prazo Máximo de Produção (dias)
  - [ ] Prazo de Envio (dias úteis)
  - [ ] Duração das Vendas (dias)
- [ ] Verificar se os valores atuais estão preenchidos

**Resultado esperado:** 4 campos visíveis e preenchidos

---

### 5. Aba "Políticas"

- [ ] Clicar na aba "Políticas"
- [ ] Verificar se todos os campos aparecem:
  - [ ] Prazo para Troca (dias)
  - [ ] Prazo de Resposta do Suporte (horas)
- [ ] Verificar se os valores atuais estão preenchidos

**Resultado esperado:** 2 campos visíveis e preenchidos

---

### 6. Atualização de Dados

#### Teste 1: Alterar Nome do Lote

- [ ] Ir para aba "Lote Atual"
- [ ] Alterar "Nome do Lote" para "TESTE"
- [ ] Clicar em "Salvar Alterações"
- [ ] Verificar mensagem de sucesso
- [ ] Verificar se o preview atualizou
- [ ] Voltar o nome original
- [ ] Salvar novamente

**Resultado esperado:** Alteração salva com sucesso, preview atualiza

#### Teste 2: Alterar Data

- [ ] Alterar "Início das Vendas" para uma data futura
- [ ] Clicar em "Salvar Alterações"
- [ ] Verificar mensagem de sucesso
- [ ] Verificar se o preview atualizou
- [ ] Voltar a data original
- [ ] Salvar novamente

**Resultado esperado:** Data salva e formatada corretamente

#### Teste 3: Alterar Prazo

- [ ] Ir para aba "Prazos"
- [ ] Alterar "Prazo de Envio" para 7
- [ ] Clicar em "Salvar Alterações"
- [ ] Verificar mensagem de sucesso
- [ ] Voltar o valor original (5)
- [ ] Salvar novamente

**Resultado esperado:** Valor numérico salvo corretamente

---

### 7. Validações

#### Teste 1: Campo Vazio

- [ ] Limpar um campo obrigatório
- [ ] Tentar salvar
- [ ] Verificar se há validação

**Resultado esperado:** Não deve permitir salvar com campos vazios

#### Teste 2: Data Inválida

- [ ] Inserir data em formato errado (ex: "abc")
- [ ] Tentar salvar
- [ ] Verificar se há validação

**Resultado esperado:** Deve mostrar erro de formato

---

## 🎨 Testes de Interface

### 8. Componente ReleaseTimeline

- [ ] Acessar `/colecoes`
- [ ] Rolar até a seção "Cronograma de Lançamento"
- [ ] Verificar se aparecem 4 fases:
  - [ ] Vendas (com datas dinâmicas)
  - [ ] Produção (com datas dinâmicas)
  - [ ] Envio (com prazo dinâmico)
  - [ ] Entrega (com mês dinâmico)
- [ ] Verificar se as datas correspondem ao SSOT
- [ ] Verificar se há skeleton loading ao carregar

**Resultado esperado:** Timeline mostra dados do SSOT, não hardcoded

---

### 9. Banner em Collections

- [ ] Acessar `/colecoes`
- [ ] Verificar banner no topo da página
- [ ] Confirmar que mostra:
  - [ ] Nome do lote atual
  - [ ] Datas de vendas
  - [ ] Datas de produção
  - [ ] Mês de envio
- [ ] Verificar se há botão "Ver Planos"
- [ ] Clicar no botão e verificar se vai para `/planos`

**Resultado esperado:** Banner mostra dados do SSOT

---

### 10. FAQs em Collections

- [ ] Acessar `/colecoes`
- [ ] Rolar até a seção "Perguntas Frequentes"
- [ ] Localizar pergunta "Quando recebo a primeira peça?"
- [ ] Verificar se a resposta contém:
  - [ ] Datas do lote atual
  - [ ] Prazos corretos
  - [ ] Mês de envio correto
- [ ] Verificar se há skeleton loading ao carregar

**Resultado esperado:** FAQ mostra dados do SSOT

---

### 11. FAQs em Plans

- [ ] Acessar `/planos`
- [ ] Rolar até a seção de FAQs
- [ ] Localizar pergunta "Quando recebo a primeira peça?"
- [ ] Verificar se a resposta contém dados do SSOT
- [ ] Comparar com o FAQ em `/colecoes`

**Resultado esperado:** Texto idêntico ao de Collections

---

### 12. FAQs em CollectionDetails

- [ ] Acessar qualquer coleção (ex: `/colecoes/naruto`)
- [ ] Rolar até a seção de FAQs
- [ ] Localizar pergunta "Quando recebo a primeira peça?"
- [ ] Verificar se a resposta contém dados do SSOT
- [ ] Comparar com os FAQs anteriores

**Resultado esperado:** Texto idêntico aos outros FAQs

---

## 🔄 Testes de Integração

### 13. Fluxo Completo de Atualização

- [ ] Anotar valores atuais do SSOT
- [ ] Acessar `/admin/configuracoes-conteudo`
- [ ] Alterar nome do lote para "TESTE INTEGRAÇÃO"
- [ ] Alterar data de início das vendas
- [ ] Salvar alterações
- [ ] Aguardar mensagem de sucesso
- [ ] Abrir `/colecoes` em nova aba
- [ ] Verificar se o banner foi atualizado
- [ ] Verificar se o cronograma foi atualizado
- [ ] Verificar se o FAQ foi atualizado
- [ ] Abrir `/planos` em nova aba
- [ ] Verificar se o FAQ foi atualizado
- [ ] Voltar ao admin e restaurar valores originais
- [ ] Salvar novamente
- [ ] Verificar se tudo voltou ao normal

**Resultado esperado:** Todas as páginas atualizam automaticamente

---

### 14. Teste de Cache

- [ ] Alterar uma configuração no admin
- [ ] Salvar
- [ ] Imediatamente acessar `/colecoes`
- [ ] Verificar se mostra o novo valor
- [ ] Aguardar 6 minutos
- [ ] Recarregar `/colecoes`
- [ ] Verificar se ainda mostra o valor correto

**Resultado esperado:** Cache funciona (5 min) mas dados permanecem corretos

---

### 15. Teste de Múltiplas Abas

- [ ] Abrir admin em uma aba
- [ ] Abrir `/colecoes` em outra aba
- [ ] Alterar configuração no admin
- [ ] Salvar
- [ ] Recarregar a aba de `/colecoes`
- [ ] Verificar se atualizou

**Resultado esperado:** Alterações refletem em todas as abas

---

## 📱 Testes de Responsividade

### 16. Admin em Mobile

- [ ] Abrir DevTools (F12)
- [ ] Ativar modo mobile
- [ ] Acessar `/admin/configuracoes-conteudo`
- [ ] Verificar se o layout se adapta
- [ ] Testar as 3 abas
- [ ] Testar preenchimento de campos
- [ ] Testar botão de salvar

**Resultado esperado:** Interface funcional em mobile

---

### 17. Componentes em Mobile

- [ ] Manter modo mobile ativo
- [ ] Acessar `/colecoes`
- [ ] Verificar banner
- [ ] Verificar cronograma (4 fases)
- [ ] Verificar FAQs
- [ ] Testar em diferentes tamanhos (320px, 375px, 768px)

**Resultado esperado:** Todos os componentes responsivos

---

## 🔐 Testes de Segurança

### 18. Acesso Não Autorizado

- [ ] Fazer logout
- [ ] Tentar acessar `/admin/configuracoes-conteudo`
- [ ] Verificar se redireciona para login

**Resultado esperado:** Acesso negado para não-admins

---

### 19. Usuário Comum

- [ ] Fazer login como usuário comum (não admin)
- [ ] Tentar acessar `/admin/configuracoes-conteudo`
- [ ] Verificar se é bloqueado

**Resultado esperado:** Apenas admins têm acesso

---

## ⚡ Testes de Performance

### 20. Tempo de Carregamento

- [ ] Abrir DevTools → Network
- [ ] Acessar `/admin/configuracoes-conteudo`
- [ ] Verificar tempo de carregamento
- [ ] Verificar número de requests

**Resultado esperado:** Carrega em < 2 segundos

---

### 21. Skeleton Loading

- [ ] Abrir DevTools → Network
- [ ] Ativar "Slow 3G"
- [ ] Acessar `/colecoes`
- [ ] Verificar se aparecem skeletons durante carregamento
- [ ] Aguardar carregamento completo
- [ ] Verificar se skeletons desaparecem

**Resultado esperado:** UX suave com loading states

---

## 🐛 Testes de Erro

### 22. Erro de Conexão

- [ ] Abrir DevTools → Network
- [ ] Ativar "Offline"
- [ ] Tentar salvar alteração no admin
- [ ] Verificar mensagem de erro
- [ ] Desativar "Offline"
- [ ] Tentar novamente

**Resultado esperado:** Mensagem de erro clara

---

### 23. Dados Inválidos

- [ ] Inserir texto em campo numérico
- [ ] Tentar salvar
- [ ] Verificar validação
- [ ] Inserir número negativo
- [ ] Tentar salvar
- [ ] Verificar validação

**Resultado esperado:** Validação impede dados inválidos

---

## 📊 Checklist Final

### Funcionalidades Principais

- [ ] Painel admin acessível
- [ ] 3 abas funcionando
- [ ] Preview em tempo real
- [ ] Salvamento de dados
- [ ] Mensagens de sucesso/erro
- [ ] Validações funcionando

### Componentes Atualizados

- [ ] ReleaseTimeline dinâmico
- [ ] BatchInfoBanner dinâmico
- [ ] DynamicFAQ funcionando
- [ ] FAQs em Collections
- [ ] FAQs em Plans
- [ ] FAQs em CollectionDetails

### Integração

- [ ] Dados salvam no banco
- [ ] Páginas atualizam automaticamente
- [ ] Cache funcionando
- [ ] Formatação consistente

### UX/UI

- [ ] Loading states
- [ ] Error handling
- [ ] Responsividade
- [ ] Acessibilidade

### Segurança

- [ ] Proteção de rota
- [ ] Validação de dados
- [ ] Apenas admins têm acesso

---

## 🎯 Resultado Final

**Total de testes:** 23  
**Testes passados:** **\_/23  
**Taxa de sucesso:** \_**%

### Status

- [ ] ✅ Todos os testes passaram - Pronto para produção
- [ ] ⚠️ Alguns testes falharam - Revisar e corrigir
- [ ] ❌ Muitos testes falharam - Investigar problemas

---

## 📝 Notas

Use este espaço para anotar problemas encontrados ou observações:

```
Data: ___/___/___
Testador: _______________

Problemas encontrados:
1.
2.
3.

Observações:
-
-
-
```

---

**Última atualização:** 24/02/2026  
**Versão:** 1.0
