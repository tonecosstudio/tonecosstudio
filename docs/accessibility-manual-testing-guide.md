# Guia de Testes Manuais de Acessibilidade

**Requisitos:** 20.1-20.15  
**Tarefa:** 29.4 Auditoria de acessibilidade  
**Padrão:** WCAG 2.1 Nível AA

## Visão Geral

Este guia fornece instruções passo a passo para realizar testes manuais de acessibilidade no Sistema de Pagamento Manual. Testes manuais são **essenciais** e não podem ser substituídos por testes automatizados.

---

## 1. Teste com NVDA (Windows)

### Instalação

1. Download: https://www.nvaccess.org/download/
2. Instalar versão mais recente
3. Atalho para iniciar: `Ctrl + Alt + N`

### Comandos Básicos

| Comando | Ação |
|---------|------|
| `Tab` / `Shift+Tab` | Navegar entre elementos interativos |
| `↑` / `↓` | Ler linha por linha |
| `Ctrl` | Parar leitura |
| `Insert+F7` | Lista de elementos (links, headings, etc) |
| `Insert+Space` | Alternar modo de navegação |
| `NVDA+Q` | Sair do NVDA |


### Cenários de Teste NVDA

#### Cenário 1: Dashboard de Pagamentos (Cliente)

**Objetivo:** Verificar que cliente pode navegar e entender lista de pagamentos

**Passos:**
1. Iniciar NVDA (`Ctrl+Alt+N`)
2. Navegar para `/meus-pagamentos`
3. Usar `Insert+F7` para ver lista de headings
4. Verificar que headings estão em ordem lógica (h1, h2, h3)
5. Usar `Tab` para navegar entre pagamentos
6. Verificar que cada pagamento anuncia:
   - Número de referência
   - Valor
   - Status
   - Data
7. Pressionar `Enter` em um pagamento
8. Verificar que detalhes são anunciados corretamente

**Critérios de Sucesso:**
- [ ] Headings são anunciados corretamente
- [ ] Informações de pagamento são claras
- [ ] Status é anunciado com contexto
- [ ] Navegação é lógica e intuitiva


#### Cenário 2: Upload de Comprovante

**Objetivo:** Verificar que cliente pode fazer upload de arquivo

**Passos:**
1. Navegar para detalhes de um pagamento pendente
2. Localizar botão "Enviar Comprovante"
3. Verificar que botão é anunciado com label claro
4. Pressionar `Enter` para abrir seletor de arquivo
5. Selecionar arquivo
6. Verificar que progresso de upload é anunciado
7. Verificar que sucesso/erro é anunciado

**Critérios de Sucesso:**
- [ ] Botão de upload tem label descritivo
- [ ] Progresso é anunciado em tempo real
- [ ] Mensagens de sucesso/erro são claras
- [ ] Arquivo enviado é listado com informações

#### Cenário 3: Dashboard Admin

**Objetivo:** Verificar que admin pode gerenciar pagamentos

**Passos:**
1. Login como admin
2. Navegar para dashboard de pagamentos
3. Verificar anúncio de contagem de pagamentos pendentes
4. Usar filtros (status, método, data)
5. Verificar que filtros são anunciados
6. Selecionar um pagamento
7. Verificar detalhes anunciados
8. Testar botões Aprovar/Rejeitar/Solicitar Info

**Critérios de Sucesso:**
- [ ] Contagem de pendentes é anunciada
- [ ] Filtros são acessíveis e claros
- [ ] Botões de ação têm labels descritivos
- [ ] Confirmações são anunciadas


---

## 2. Teste com JAWS (Windows)

### Instalação

1. Download: https://www.freedomscientific.com/products/software/jaws/
2. Trial de 40 minutos disponível
3. Reiniciar após instalação

### Comandos Básicos

| Comando | Ação |
|---------|------|
| `Tab` / `Shift+Tab` | Navegar entre elementos |
| `Insert+F5` | Lista de formulários |
| `Insert+F6` | Lista de headings |
| `Insert+F7` | Lista de links |
| `Insert+F3` | Lista de elementos |
| `Insert+Down` | Ler tudo |

### Cenários de Teste JAWS

#### Cenário 1: Formulário de Método de Pagamento

**Objetivo:** Verificar acessibilidade de formulários

**Passos:**
1. Iniciar JAWS
2. Navegar para configuração de métodos de pagamento (admin)
3. Usar `Insert+F5` para listar formulários
4. Navegar pelos campos do formulário
5. Verificar que cada campo anuncia:
   - Label
   - Tipo de campo
   - Valor atual
   - Se é obrigatório
6. Preencher formulário
7. Verificar mensagens de validação

**Critérios de Sucesso:**
- [ ] Todos os campos têm labels associados
- [ ] Campos obrigatórios são identificados
- [ ] Erros de validação são anunciados
- [ ] Instruções de ajuda são acessíveis


---

## 3. Teste com VoiceOver (iOS)

### Ativação

1. Configurações > Acessibilidade > VoiceOver
2. Ativar VoiceOver
3. Ou usar atalho triplo: Pressionar botão lateral 3 vezes

### Gestos Básicos

| Gesto | Ação |
|-------|------|
| Deslizar direita/esquerda | Navegar entre elementos |
| Tocar duas vezes | Ativar elemento |
| Deslizar 3 dedos | Rolar página |
| Rotor com 2 dedos | Mudar modo de navegação |
| Tocar com 4 dedos no topo | Ir para primeiro elemento |

### Cenários de Teste VoiceOver

#### Cenário 1: Meus Pagamentos (Mobile)

**Objetivo:** Verificar experiência mobile

**Passos:**
1. Ativar VoiceOver no iPhone/iPad
2. Abrir app/site no Safari
3. Navegar para "Meus Pagamentos"
4. Deslizar para navegar entre pagamentos
5. Verificar anúncios de cada elemento
6. Tocar duas vezes para abrir detalhes
7. Verificar navegação dentro dos detalhes

**Critérios de Sucesso:**
- [ ] Todos os elementos são alcançáveis
- [ ] Anúncios são claros e concisos
- [ ] Ordem de navegação é lógica
- [ ] Gestos funcionam corretamente


#### Cenário 2: Captura de Foto de Comprovante

**Objetivo:** Verificar funcionalidade de câmera

**Passos:**
1. Navegar para upload de comprovante
2. Localizar botão "Tirar Foto"
3. Tocar duas vezes para ativar
4. Verificar que câmera é acessível
5. Tirar foto
6. Verificar confirmação

**Critérios de Sucesso:**
- [ ] Botão de câmera é anunciado
- [ ] Controles de câmera são acessíveis
- [ ] Confirmação de foto é anunciada
- [ ] Foto é adicionada à lista

---

## 4. Teste de Navegação por Teclado

### Objetivo

Verificar que TODA funcionalidade é acessível apenas com teclado (sem mouse).

### Teclas Importantes

| Tecla | Função |
|-------|--------|
| `Tab` | Próximo elemento focável |
| `Shift+Tab` | Elemento anterior |
| `Enter` | Ativar link/botão |
| `Space` | Ativar botão/checkbox |
| `Esc` | Fechar modal/diálogo |
| `↑↓←→` | Navegar em listas/menus |


### Checklist de Navegação por Teclado

#### Fluxo Completo: Criar Pagamento (Cliente)

**Passos:**
1. [ ] Navegar para página inicial com `Tab`
2. [ ] Acessar "Meus Pagamentos" com `Enter`
3. [ ] Navegar para botão "Novo Pagamento" com `Tab`
4. [ ] Ativar com `Enter`
5. [ ] Selecionar método de pagamento com `Tab` e `Enter`
6. [ ] Confirmar com `Enter`
7. [ ] Verificar que foco move para próxima etapa
8. [ ] Navegar para upload de arquivo
9. [ ] Ativar seletor de arquivo com `Enter`
10. [ ] Após upload, verificar que foco retorna

**Critérios de Sucesso:**
- [ ] Todos os passos completáveis sem mouse
- [ ] Foco sempre visível
- [ ] Ordem de tabulação lógica
- [ ] Sem "armadilhas de teclado"

#### Fluxo Completo: Aprovar Pagamento (Admin)

**Passos:**
1. [ ] Login como admin
2. [ ] Navegar para dashboard
3. [ ] Usar filtros apenas com teclado
4. [ ] Selecionar pagamento
5. [ ] Navegar para botão "Aprovar"
6. [ ] Ativar modal de confirmação
7. [ ] Confirmar aprovação
8. [ ] Verificar que modal fecha
9. [ ] Verificar que foco retorna ao dashboard

**Critérios de Sucesso:**
- [ ] Filtros acessíveis por teclado
- [ ] Modal captura foco (focus trap)
- [ ] `Esc` fecha modal
- [ ] Foco retorna após fechar modal


---

## 5. Verificação de Contraste de Cores

### Ferramentas

1. **WebAIM Contrast Checker**
   - URL: https://webaim.org/resources/contrastchecker/
   - Uso: Inserir cores de foreground e background

2. **axe DevTools** (Extensão Chrome/Firefox)
   - Instalar extensão
   - Abrir DevTools > axe
   - Executar análise automática

3. **Chrome Lighthouse**
   - DevTools > Lighthouse
   - Selecionar "Accessibility"
   - Gerar relatório

### Elementos a Verificar

#### Badges de Status

| Status | Cor de Fundo | Cor de Texto | Contraste Mínimo |
|--------|--------------|--------------|------------------|
| Pending | Amarelo | Preto | 4.5:1 |
| Under Review | Azul | Branco | 4.5:1 |
| Approved | Verde | Branco | 4.5:1 |
| Rejected | Vermelho | Branco | 4.5:1 |
| Requires Info | Laranja | Preto | 4.5:1 |

**Checklist:**
- [ ] Verificar cada combinação no WebAIM
- [ ] Documentar razões de contraste
- [ ] Testar em modo claro e escuro
- [ ] Verificar texto grande (≥18pt) tem contraste ≥3:1


#### Botões e Links

**Checklist:**
- [ ] Botão primário: texto sobre fundo
- [ ] Botão secundário: texto sobre fundo
- [ ] Botão de perigo: texto sobre fundo
- [ ] Links no texto: contraste com fundo
- [ ] Links visitados: contraste mantido
- [ ] Indicadores de foco: contraste ≥3:1

#### Texto de Corpo

**Checklist:**
- [ ] Texto principal sobre fundo branco
- [ ] Texto secundário (muted) sobre fundo
- [ ] Texto sobre cards/containers
- [ ] Placeholders de formulário
- [ ] Mensagens de erro
- [ ] Mensagens de sucesso

---

## 6. Teste de Redimensionamento de Texto

### Objetivo

Verificar que interface funciona com zoom de até 200% sem perda de funcionalidade.

### Procedimento

1. **Chrome/Edge:**
   - `Ctrl +` para aumentar zoom
   - Ou `Ctrl + Scroll` do mouse
   - Verificar em 150% e 200%

2. **Firefox:**
   - `Ctrl +` para aumentar zoom
   - Ou Menu > Zoom

3. **Safari:**
   - `Cmd +` para aumentar zoom


### Checklist de Zoom

**Em 150% de Zoom:**
- [ ] Todo texto é legível
- [ ] Não há scroll horizontal
- [ ] Botões são clicáveis
- [ ] Formulários são utilizáveis
- [ ] Imagens não quebram layout
- [ ] Modais são acessíveis

**Em 200% de Zoom:**
- [ ] Todo texto é legível
- [ ] Não há scroll horizontal
- [ ] Funcionalidade preservada
- [ ] Navegação funciona
- [ ] Conteúdo não sobrepõe
- [ ] Todos os elementos visíveis

**Páginas Críticas:**
- [ ] Dashboard de pagamentos
- [ ] Detalhes de pagamento
- [ ] Formulário de método de pagamento
- [ ] Upload de arquivo
- [ ] Meus pagamentos (cliente)

---

## 7. Relatório de Testes

### Template de Relatório

```markdown
# Relatório de Teste de Acessibilidade

**Data:** [Data do teste]
**Testador:** [Nome]
**Ferramenta:** [NVDA/JAWS/VoiceOver/Teclado/Contraste]
**Navegador:** [Chrome/Firefox/Safari]
**Versão:** [Versão do navegador]

## Cenários Testados

### [Nome do Cenário]

**Status:** ✅ Passou / ⚠️ Problemas Menores / ❌ Falhou

**Problemas Encontrados:**
1. [Descrição do problema]
   - Severidade: Alta/Média/Baixa
   - Requisito afetado: [20.X]
   - Passos para reproduzir: [...]

**Recomendações:**
- [Sugestão de correção]

## Resumo

- Total de cenários: X
- Passou: X
- Problemas menores: X
- Falhou: X

## Próximos Passos

- [ ] Corrigir problemas de alta severidade
- [ ] Revisar problemas médios
- [ ] Re-testar após correções
```

---

## 8. Recursos Adicionais

### Documentação

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project](https://www.a11yproject.com/)
- [WebAIM](https://webaim.org/)

### Ferramentas

- [NVDA](https://www.nvaccess.org/)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Comunidade

- [WebAIM Discussion List](https://webaim.org/discussion/)
- [A11y Slack](https://web-a11y.slack.com/)
- [Stack Overflow - Accessibility](https://stackoverflow.com/questions/tagged/accessibility)

---

**Nota Final:** Testes de acessibilidade são um processo contínuo. Recomenda-se realizar testes regulares, especialmente após mudanças significativas na interface.
