# Diretrizes de Acessibilidade

## Requisitos: 20.1-20.15
## Tarefa: 27.1 Implementar recursos de acessibilidade

Este documento fornece diretrizes para garantir que o sistema de pagamento manual seja acessível a todos os usuários.

## Princípios WCAG 2.1 AA

O sistema deve atender aos critérios de sucesso WCAG 2.1 Nível AA:

### 1. Perceptível
- Fornecer alternativas de texto para conteúdo não textual
- Fornecer legendas e alternativas para mídia
- Criar conteúdo que possa ser apresentado de diferentes formas
- Facilitar a visualização e audição do conteúdo

### 2. Operável
- Tornar toda funcionalidade disponível via teclado
- Dar tempo suficiente para ler e usar o conteúdo
- Não criar conteúdo que possa causar convulsões
- Ajudar usuários a navegar e encontrar conteúdo

### 3. Compreensível
- Tornar o texto legível e compreensível
- Fazer o conteúdo aparecer e operar de forma previsível
- Ajudar usuários a evitar e corrigir erros

### 4. Robusto
- Maximizar compatibilidade com tecnologias assistivas

## Implementações Específicas

### Texto Alternativo (Alt Text)

```tsx
// ✅ Bom: Imagens com alt text descritivo
<img 
  src={proofImage} 
  alt="Comprovante de pagamento PIX no valor de R$ 150,00 para Empresa XYZ"
/>

// ✅ Bom: Ícones decorativos com aria-hidden
<CheckCircle className="h-4 w-4" aria-hidden="true" />
<span className="sr-only">Pagamento aprovado</span>

// ❌ Ruim: Imagem sem alt
<img src={proofImage} />
```

### Elementos Semânticos

```tsx
// ✅ Bom: Uso de elementos HTML semânticos
<nav aria-label="Navegação principal">
  <ul>
    <li><a href="/pagamentos">Meus Pagamentos</a></li>
  </ul>
</nav>

<main>
  <h1>Detalhes do Pagamento</h1>
  <article>
    <h2>Informações do Pagamento</h2>
    <section>
      <h3>Valor</h3>
      <p>R$ 150,00</p>
    </section>
  </article>
</main>

// ❌ Ruim: Uso excessivo de divs
<div class="nav">
  <div class="nav-item">Meus Pagamentos</div>
</div>
```

### Labels ARIA

```tsx
// ✅ Bom: Botões com labels descritivos
<button 
  aria-label="Aprovar pagamento PAY-20240215-1234"
  onClick={handleApprove}
>
  <CheckCircle className="h-4 w-4" aria-hidden="true" />
</button>

// ✅ Bom: Inputs com labels associados
<label htmlFor="payment-amount">Valor do Pagamento</label>
<input 
  id="payment-amount" 
  type="number" 
  aria-describedby="amount-help"
/>
<span id="amount-help" className="text-sm text-muted-foreground">
  Digite o valor em reais
</span>

// ✅ Bom: Status com role e aria-live
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
>
  Pagamento aprovado com sucesso
</div>
```

### Navegação por Teclado

```tsx
// ✅ Bom: Elementos interativos acessíveis por teclado
<button 
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Enviar
</button>

// ✅ Bom: Skip links para navegação rápida
<a href="#main-content" className="sr-only focus:not-sr-only">
  Pular para conteúdo principal
</a>

// ✅ Bom: Trap focus em modais
<Dialog onOpenChange={setOpen}>
  <DialogContent>
    {/* Focus é automaticamente gerenciado */}
  </DialogContent>
</Dialog>
```

### Indicadores de Foco

```css
/* ✅ Bom: Indicadores de foco visíveis */
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
  border-radius: 2px;
}

/* Remove outline para mouse users */
*:focus:not(:focus-visible) {
  outline: none;
}

/* Indicador de foco personalizado para botões */
button:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
  box-shadow: 0 0 0 4px hsl(var(--primary) / 0.2);
}
```

### Ordem de Tabulação

```tsx
// ✅ Bom: Ordem lógica de tabulação
<form>
  <input tabIndex={0} /> {/* Ordem natural */}
  <input tabIndex={0} />
  <button tabIndex={0}>Enviar</button>
</form>

// ❌ Ruim: Ordem de tabulação confusa
<form>
  <input tabIndex={3} />
  <input tabIndex={1} />
  <button tabIndex={2}>Enviar</button>
</form>

// ✅ Bom: Remover elementos da ordem de tabulação
<div tabIndex={-1} aria-hidden="true">
  Conteúdo decorativo
</div>
```

## Regiões ARIA Live

### Implementação de Regiões Live

```tsx
// ✅ Mudanças de status
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
>
  {statusMessage}
</div>

// ✅ Mensagens de erro
<div 
  role="alert" 
  aria-live="assertive" 
  aria-atomic="true"
>
  {errorMessage}
</div>

// ✅ Mensagens de sucesso
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
>
  {successMessage}
</div>

// ✅ Conteúdo dinâmico
<div 
  aria-live="polite" 
  aria-relevant="additions removals"
>
  {dynamicContent}
</div>
```

### Hook para Anúncios de Leitores de Tela

```typescript
// src/hooks/useScreenReaderAnnouncement.ts
import { useEffect, useRef } from 'react';

export function useScreenReaderAnnouncement() {
  const announcementRef = useRef<HTMLDivElement>(null);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcementRef.current) {
      announcementRef.current.setAttribute('aria-live', priority);
      announcementRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  };

  return { announcementRef, announce };
}

// Uso:
const { announcementRef, announce } = useScreenReaderAnnouncement();

// Anunciar mudança de status
announce('Pagamento aprovado com sucesso', 'polite');

// Anunciar erro
announce('Erro ao processar pagamento', 'assertive');

// Renderizar região live
<div 
  ref={announcementRef} 
  className="sr-only" 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
/>
```

## Contraste de Cores

### Requisitos WCAG AA

- **Texto normal**: Contraste mínimo de 4.5:1
- **Texto grande** (18pt+ ou 14pt+ bold): Contraste mínimo de 3:1
- **Componentes UI**: Contraste mínimo de 3:1

### Verificação de Contraste

```typescript
// Função para calcular contraste
function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Verificar se contraste atende WCAG AA
function meetsWCAGAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}
```

### Paleta de Cores Acessível

```css
:root {
  /* Cores primárias com contraste adequado */
  --primary: 221 83% 53%; /* #2563eb - Azul */
  --primary-foreground: 0 0% 100%; /* #ffffff - Branco */
  
  /* Cores de status */
  --success: 142 71% 45%; /* #22c55e - Verde */
  --success-foreground: 0 0% 100%;
  
  --warning: 38 92% 50%; /* #f59e0b - Laranja */
  --warning-foreground: 0 0% 0%;
  
  --error: 0 84% 60%; /* #ef4444 - Vermelho */
  --error-foreground: 0 0% 100%;
  
  /* Texto */
  --foreground: 222 47% 11%; /* #0f172a - Quase preto */
  --muted-foreground: 215 16% 47%; /* #64748b - Cinza */
}
```

## Testes de Acessibilidade

### Ferramentas Recomendadas

1. **axe DevTools** - Extensão do navegador
2. **WAVE** - Avaliação de acessibilidade web
3. **Lighthouse** - Auditoria de acessibilidade
4. **NVDA** - Leitor de tela (Windows)
5. **JAWS** - Leitor de tela (Windows)
6. **VoiceOver** - Leitor de tela (macOS/iOS)
7. **TalkBack** - Leitor de tela (Android)

### Checklist de Testes

- [ ] Navegação completa apenas com teclado
- [ ] Todos os elementos interativos têm foco visível
- [ ] Ordem de tabulação é lógica
- [ ] Imagens têm texto alternativo
- [ ] Formulários têm labels associados
- [ ] Mensagens de erro são anunciadas
- [ ] Mudanças de status são anunciadas
- [ ] Contraste de cores atende WCAG AA
- [ ] Funciona com zoom de 200%
- [ ] Funciona com leitores de tela

### Testes com Leitores de Tela

```bash
# Windows - NVDA
1. Instalar NVDA (gratuito)
2. Iniciar NVDA (Ctrl + Alt + N)
3. Navegar com Tab e Shift+Tab
4. Ler com setas (↑ ↓)
5. Interagir com Enter ou Space

# macOS - VoiceOver
1. Ativar VoiceOver (Cmd + F5)
2. Navegar com VO + setas (VO = Ctrl + Option)
3. Interagir com VO + Space
4. Ler tudo com VO + A

# iOS - VoiceOver
1. Configurações > Acessibilidade > VoiceOver
2. Deslizar para navegar
3. Tocar duas vezes para ativar
4. Deslizar com 3 dedos para rolar

# Android - TalkBack
1. Configurações > Acessibilidade > TalkBack
2. Deslizar para navegar
3. Tocar duas vezes para ativar
4. Deslizar com 2 dedos para rolar
```

## Classes Utilitárias de Acessibilidade

```css
/* Screen reader only - visível apenas para leitores de tela */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Focusable when focused - torna visível quando focado */
.sr-only:focus,
.sr-only:active {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}

/* Skip link - link para pular navegação */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary);
  color: var(--primary-foreground);
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

## Documentação de Componentes

### Exemplo: PaymentCard Acessível

```tsx
/**
 * PaymentCard - Cartão de pagamento acessível
 * 
 * Acessibilidade:
 * - Usa elementos semânticos (article, header, section)
 * - Todos os botões têm labels descritivos
 * - Status é anunciado para leitores de tela
 * - Navegável por teclado
 * - Contraste de cores atende WCAG AA
 */
export function PaymentCard({ payment }: PaymentCardProps) {
  return (
    <article 
      className="payment-card"
      aria-labelledby={`payment-${payment.id}-title`}
    >
      <header>
        <h3 id={`payment-${payment.id}-title`}>
          Pagamento {payment.reference_number}
        </h3>
        <Badge 
          className={getStatusColor(payment.status)}
          role="status"
          aria-label={`Status: ${getStatusLabel(payment.status)}`}
        >
          {getStatusIcon(payment.status)}
          <span>{getStatusLabel(payment.status)}</span>
        </Badge>
      </header>
      
      <section aria-label="Informações do pagamento">
        <dl>
          <dt>Valor</dt>
          <dd>{formatCurrency(payment.amount)}</dd>
          
          <dt>Data</dt>
          <dd>{formatDate(payment.created_at)}</dd>
        </dl>
      </section>
      
      <footer>
        <Button
          onClick={() => navigate(`/pagamentos/${payment.id}`)}
          aria-label={`Ver detalhes do pagamento ${payment.reference_number}`}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          <span>Ver Detalhes</span>
        </Button>
      </footer>
    </article>
  );
}
```

## Referências

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
