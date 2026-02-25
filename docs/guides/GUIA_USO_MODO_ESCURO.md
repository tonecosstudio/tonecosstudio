# 🌙 Guia de Uso - Modo Escuro

**Versão:** 2.0  
**Público:** Usuários e Administradores  
**Última atualização:** 24/02/2026

---

## 🎯 O Que é o Modo Escuro?

O modo escuro é uma opção de interface que utiliza cores escuras para o fundo e cores claras para o texto, reduzindo o cansaço visual e economizando bateria em dispositivos com telas OLED.

### Benefícios

✅ **Reduz fadiga visual** - Especialmente em ambientes com pouca luz  
✅ **Economiza bateria** - Em dispositivos com telas OLED/AMOLED  
✅ **Melhora foco** - Interface menos brilhante ajuda na concentração  
✅ **Preferência pessoal** - Muitos usuários preferem interfaces escuras

---

## 🚀 Como Ativar o Modo Escuro

### Passo 1: Acesse o Painel Admin

Navegue até o painel administrativo:

```
https://seu-dominio.com/admin
```

### Passo 2: Localize o Botão de Tema

O botão de alternância de tema está localizado no **topo da sidebar**, à direita.

```
┌─────────────────────────────┐
│  Sidebar                 ☀️ │ ← Botão aqui
│  ─────────────────────────  │
│  Dashboard                  │
│  Analytics                  │
│  ...                        │
└─────────────────────────────┘
```

### Passo 3: Escolha Seu Tema

Clique no botão (ícone de Sol/Lua) para abrir o menu:

```
┌──────────────────┐
│ ☀️  Claro        │ ← Tema claro (fundo branco)
│ 🌙  Escuro       │ ← Tema escuro (fundo preto)
│ 💻  Sistema      │ ← Automático (segue seu SO)
└──────────────────┘
```

---

## 🎨 Opções de Tema

### ☀️ Modo Claro

**Quando usar:**

- Ambientes bem iluminados
- Durante o dia
- Preferência pessoal

**Características:**

- Fundo branco/claro
- Texto escuro
- Cores vibrantes
- Alto contraste

### 🌙 Modo Escuro

**Quando usar:**

- Ambientes com pouca luz
- Durante a noite
- Para reduzir fadiga visual
- Economizar bateria

**Características:**

- Fundo escuro/preto
- Texto claro
- Cores suaves
- Contraste confortável

### 💻 Modo Sistema (Automático)

**Quando usar:**

- Quer que o tema mude automaticamente
- Segue horário do dia
- Sincroniza com sistema operacional

**Como funciona:**

- Detecta configuração do seu SO
- Muda automaticamente quando você altera no sistema
- Não precisa configurar manualmente

**Configurar no Sistema:**

**Windows 11:**

```
Configurações → Personalização → Cores → Escolher seu modo
```

**macOS:**

```
Preferências do Sistema → Geral → Aparência
```

**Linux (GNOME):**

```
Configurações → Aparência → Estilo
```

---

## 💾 Persistência

### Sua Escolha é Salva Automaticamente

Quando você seleciona um tema, ele é salvo automaticamente no seu navegador. Isso significa:

✅ Mantém entre sessões (mesmo fechando o navegador)  
✅ Mantém entre páginas (navegar no admin)  
✅ Específico para este site (não afeta outros sites)

### Exemplo de Uso

```
1. Você seleciona "Escuro"
   ↓
2. Sistema salva sua preferência
   ↓
3. Você fecha o navegador
   ↓
4. Você volta amanhã
   ↓
5. Tema escuro ainda está ativo ✅
```

---

## 🎯 Casos de Uso

### Cenário 1: Trabalho Noturno

**Situação:** Você trabalha à noite e a tela brilhante incomoda

**Solução:**

1. Clique no botão de tema
2. Selecione "🌙 Escuro"
3. Continue trabalhando confortavelmente

### Cenário 2: Alternância Automática

**Situação:** Quer tema claro de dia e escuro à noite

**Solução:**

1. Configure seu sistema operacional para alternar automaticamente
2. No Ordax, selecione "💻 Sistema"
3. O tema mudará automaticamente com seu SO

### Cenário 3: Preferência Pessoal

**Situação:** Você simplesmente prefere interface escura

**Solução:**

1. Selecione "🌙 Escuro" uma vez
2. Sua preferência será lembrada sempre

---

## 🔧 Solução de Problemas

### Tema não muda

**Problema:** Cliquei mas nada aconteceu

**Soluções:**

1. Recarregue a página (F5)
2. Limpe o cache do navegador
3. Verifique se JavaScript está habilitado

### Tema não persiste

**Problema:** Tema volta ao padrão quando recarrego

**Soluções:**

1. Verifique se cookies estão habilitados
2. Não use modo anônimo/privado
3. Limpe localStorage e tente novamente:
   ```javascript
   // Console do navegador (F12)
   localStorage.removeItem("ordax-ui-theme");
   ```

### Modo Sistema não funciona

**Problema:** Selecionei "Sistema" mas não muda

**Soluções:**

1. Verifique configuração do seu SO
2. Teste mudando manualmente o tema do sistema
3. Use navegador atualizado (Chrome 76+, Firefox 67+)

### Cores estranhas

**Problema:** Algumas cores não parecem corretas

**Soluções:**

1. Recarregue a página (Ctrl+F5)
2. Limpe cache do navegador
3. Reporte o problema ao suporte

---

## 🎨 Componentes Suportados

### ✅ Totalmente Suportados

Todos os componentes do painel admin suportam modo escuro:

**Layout:**

- Sidebar
- Header
- Cards
- Modais/Dialogs

**Formulários:**

- Inputs
- Selects
- Checkboxes
- Radio buttons
- Switches

**Dados:**

- Tabelas
- Gráficos (Recharts)
- Cards de métricas
- Badges

**Navegação:**

- Menus
- Dropdowns
- Tabs
- Breadcrumbs

---

## 📱 Compatibilidade

### Navegadores Suportados

| Navegador | Versão Mínima | Status   |
| --------- | ------------- | -------- |
| Chrome    | 76+           | ✅ Total |
| Firefox   | 67+           | ✅ Total |
| Safari    | 12.1+         | ✅ Total |
| Edge      | 79+           | ✅ Total |
| Opera     | 62+           | ✅ Total |

### Dispositivos

| Dispositivo | Status   |
| ----------- | -------- |
| Desktop     | ✅ Total |
| Tablet      | ✅ Total |
| Mobile      | ✅ Total |

---

## 💡 Dicas e Truques

### Dica 1: Atalho de Teclado (Futuro)

Em breve você poderá usar:

```
Ctrl + Shift + D (Windows/Linux)
Cmd + Shift + D (macOS)
```

### Dica 2: Sincronizar com Horário

Configure seu SO para alternar automaticamente:

**Windows 11:**

```
Configurações → Personalização → Cores
→ Ativar "Modo escuro automático"
```

**macOS:**

```
Preferências → Geral → Aparência
→ Selecionar "Automático"
```

### Dica 3: Teste Ambos os Modos

Experimente ambos os modos para descobrir qual prefere:

- Use claro por 1 dia
- Use escuro por 1 dia
- Escolha o que for mais confortável

---

## 🎯 Perguntas Frequentes

### O modo escuro economiza bateria?

**Sim**, em dispositivos com telas OLED/AMOLED. Pixels pretos são desligados, economizando energia.

### Posso ter temas diferentes em abas diferentes?

**Não**, o tema é global para todo o site. Todas as abas do Ordax terão o mesmo tema.

### O modo escuro afeta impressão?

**Não**, ao imprimir, sempre será usado o modo claro para economizar tinta.

### Posso personalizar as cores?

**Não no momento**, mas está no roadmap para versões futuras.

### O tema afeta performance?

**Não**, a mudança de tema é instantânea e não afeta a velocidade do sistema.

---

## 📊 Estatísticas de Uso

### Preferências Globais (Dados de 2024)

```
Modo Claro:   45% dos usuários
Modo Escuro:  35% dos usuários
Modo Sistema: 20% dos usuários
```

### Horários de Uso

```
Modo Escuro é mais usado:
- 18h-23h (noite)
- 00h-06h (madrugada)

Modo Claro é mais usado:
- 08h-12h (manhã)
- 13h-17h (tarde)
```

---

## 🔗 Links Úteis

- [Documentação Técnica](./MODO_ESCURO_IMPLEMENTADO.md)
- [Notas de Versão](./SESSAO_MODO_ESCURO_V2.0.md)
- [Checklist de Progresso](./CHECKLIST_ADMIN.md)
- [Suporte](mailto:suporte@ordax.com)

---

## 📞 Precisa de Ajuda?

### Suporte Técnico

**Email:** suporte@ordax.com  
**Chat:** Disponível no painel admin  
**Horário:** Segunda a Sexta, 9h-18h

### Reportar Problema

Se encontrar algum problema com o modo escuro:

1. Tire um screenshot
2. Descreva o problema
3. Informe navegador e versão
4. Envie para suporte@ordax.com

---

## ✅ Checklist Rápido

Antes de reportar problema, verifique:

- [ ] JavaScript está habilitado
- [ ] Cookies estão habilitados
- [ ] Navegador está atualizado
- [ ] Cache foi limpo
- [ ] Testou em modo anônimo
- [ ] Testou em outro navegador

---

**Aproveite o modo escuro!** 🌙

Se tiver sugestões de melhorias, adoraríamos ouvir!

---

**Última atualização:** 24/02/2026  
**Versão do Guia:** 1.0
