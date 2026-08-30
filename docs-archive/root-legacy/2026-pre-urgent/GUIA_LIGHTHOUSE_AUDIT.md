# 🔍 Guia Profissional: Lighthouse Audit

**Data:** 12 de Março de 2026
**Objetivo:** Validar performance e qualidade para produção

---

## 📋 PRÉ-REQUISITOS

### 1. Build de Produção
```bash
npm run build
```

### 2. Preview Local
```bash
npm run preview
```

### 3. Ferramentas
- Chrome DevTools (F12)
- Lighthouse CLI (opcional)

---

## 🎯 MÉTRICAS ALVO

### Performance (>90)
- **First Contentful Paint (FCP):** <1.8s
- **Largest Contentful Paint (LCP):** <2.5s
- **Total Blocking Time (TBT):** <200ms
- **Cumulative Layout Shift (CLS):** <0.1
- **Speed Index:** <3.4s

### Accessibility (>95)
- Contraste de cores adequado
- Alt text em todas as imagens
- ARIA labels apropriados
- Navegação por teclado
- Semantic HTML

### Best Practices (>95)
- HTTPS habilitado
- Sem erros no console
- Imagens com dimensões apropriadas
- Sem bibliotecas vulneráveis
- CSP headers configurados

### SEO (>95)
- Meta tags presentes
- Title único e descritivo
- Meta description
- Viewport configurado
- Links crawleáveis

---

## 🚀 EXECUÇÃO

### Método 1: Chrome DevTools (RECOMENDADO)

1. **Abrir o projeto**
   ```bash
   npm run preview
   ```
   Acesse: http://localhost:4173

2. **Abrir DevTools**
   - Pressione F12
   - Ou clique direito > Inspecionar

3. **Executar Lighthouse**
   - Clique na aba "Lighthouse"
   - Selecione categorias:
     - ✅ Performance
     - ✅ Accessibility
     - ✅ Best Practices
     - ✅ SEO
   - Modo: Desktop ou Mobile
   - Clique em "Generate report"

4. **Aguardar análise** (~30-60 segundos)

5. **Revisar resultados**

### Método 2: Lighthouse CLI

```bash
# Instalar Lighthouse
npm install -g lighthouse

# Executar audit
lighthouse http://localhost:4173 --output html --output-path ./lighthouse-report.html

# Abrir relatório
start lighthouse-report.html
```

---

## 📊 ANÁLISE DE RESULTADOS

### Performance

#### ✅ Bom (90-100)
- Nenhuma ação necessária
- Documentar métricas

#### ⚠️ Médio (50-89)
**Possíveis causas:**
- Imagens não otimizadas
- JavaScript bloqueante
- CSS não minificado
- Fontes não otimizadas

**Soluções:**
- Comprimir imagens
- Code splitting
- Lazy loading
- Preload de recursos críticos

#### ❌ Ruim (<50)
**Ação imediata necessária**
- Revisar bundle size
- Otimizar assets
- Remover código não utilizado

---

### Accessibility

#### Issues Comuns

**1. Contraste Insuficiente**
```css
/* Antes */
color: #999;
background: #fff;

/* Depois */
color: #666;
background: #fff;
```

**2. Imagens sem Alt**
```tsx
/* Antes */
<img src="image.jpg" />

/* Depois */
<img src="image.jpg" alt="Descrição da imagem" />
```

**3. Botões sem Label**
```tsx
/* Antes */
<button><Icon /></button>

/* Depois */
<button aria-label="Fechar">
  <Icon />
</button>
```

---

### Best Practices

#### Issues Comuns

**1. Console Errors**
- Revisar e corrigir todos os erros
- Remover console.log em produção

**2. Imagens sem Dimensões**
```tsx
/* Antes */
<img src="image.jpg" alt="Foto" />

/* Depois */
<img
  src="image.jpg"
  alt="Foto"
  width={800}
  height={600}
/>
```

**3. Links sem rel="noopener"**
```tsx
/* Antes */
<a href="external.com" target="_blank">Link</a>

/* Depois */
<a href="external.com" target="_blank" rel="noopener noreferrer">
  Link
</a>
```

---

### SEO

#### Checklist Essencial

**1. Meta Tags**
```html
<head>
  <title>Título Único - Nome do Site</title>
  <meta name="description" content="Descrição clara e concisa" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="index, follow" />
</head>
```

**2. Heading Hierarchy**
```html
<!-- Correto -->
<h1>Título Principal</h1>
<h2>Subtítulo</h2>
<h3>Seção</h3>

<!-- Incorreto -->
<h1>Título</h1>
<h3>Subtítulo</h3> <!-- Pulou h2 -->
```

**3. Semantic HTML**
```html
<!-- Antes -->
<div class="header">...</div>
<div class="nav">...</div>
<div class="main">...</div>

<!-- Depois -->
<header>...</header>
<nav>...</nav>
<main>...</main>
```

---

## 🔧 CORREÇÕES RÁPIDAS

### 1. Adicionar Meta Tags (5 min)
Editar `index.html`:
```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Plataforma de personagens 3D" />
  <meta name="keywords" content="3D, personagens, modelos" />
  <title>Ordax - Personagens 3D</title>
</head>
```

### 2. Otimizar Imagens (15 min)
```bash
# Comprimir todas as imagens
# Usar TinyPNG ou ImageOptim
```

### 3. Adicionar Alt Text (10 min)
```bash
# Buscar imagens sem alt
grep -r "<img" src/ | grep -v "alt="
```

### 4. Corrigir Contraste (10 min)
```bash
# Usar ferramenta de contraste
# https://webaim.org/resources/contrastchecker/
```

---

## 📈 DOCUMENTAÇÃO DE RESULTADOS

### Template de Relatório

```markdown
# Lighthouse Audit - [Data]

## Scores
- Performance: XX/100
- Accessibility: XX/100
- Best Practices: XX/100
- SEO: XX/100

## Core Web Vitals
- LCP: X.Xs
- FID: XXms
- CLS: X.XX

## Issues Encontrados
1. [Descrição do issue]
   - Severidade: Alta/Média/Baixa
   - Solução: [Como corrigir]

## Ações Tomadas
1. [Ação realizada]
   - Resultado: [Melhoria obtida]

## Próximos Passos
- [ ] [Ação pendente]
```

---

## 🎯 CRITÉRIOS DE APROVAÇÃO

### Mínimo Aceitável
- Performance: >85
- Accessibility: >90
- Best Practices: >90
- SEO: >90

### Ideal (Meta)
- Performance: >90
- Accessibility: >95
- Best Practices: >95
- SEO: >95

### Excelente
- Performance: >95
- Accessibility: >98
- Best Practices: >98
- SEO: >98

---

## 🚨 TROUBLESHOOTING

### Lighthouse não aparece no DevTools
- Atualizar Chrome para última versão
- Usar modo anônimo
- Desabilitar extensões

### Scores muito baixos
- Verificar se está em modo produção
- Limpar cache do navegador
- Testar em modo anônimo

### Resultados inconsistentes
- Executar múltiplas vezes
- Usar média dos resultados
- Testar em diferentes horários

---

## 📚 RECURSOS

### Ferramentas
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [WebPageTest](https://www.webpagetest.org/)
- [GTmetrix](https://gtmetrix.com/)

### Documentação
- [Web.dev](https://web.dev/measure/)
- [Lighthouse Docs](https://developer.chrome.com/docs/lighthouse/)
- [Core Web Vitals](https://web.dev/vitals/)

---

**Status:** ✅ GUIA COMPLETO
**Próxima Ação:** Executar audit

🚀 **Vamos validar a qualidade!**
