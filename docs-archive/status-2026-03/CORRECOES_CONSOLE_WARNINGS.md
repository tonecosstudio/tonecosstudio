# Correções de Avisos do Console

> **ARQUIVADO:** snapshot histórico de 11 de março de 2026. Não representa o estado atual de prontidão, observabilidade ou release do ORDAX. Consulte `URGENTE.md` para o estado vigente.

**Data original:** 11 de Março de 2026
**Status original:** ✅ COMPLETO

---

## 🎯 Objetivo

Remover avisos desnecessários do console do navegador para melhorar a experiência de desenvolvimento e produção.

---

## ⚠️ Avisos Identificados

### 1. CSP frame-ancestors em Meta Tag
```
The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.
```

**Problema:** A diretiva `frame-ancestors` do CSP não funciona quando definida em `<meta>` tags HTML. Ela só funciona em HTTP headers.

**Impacto:** Aviso no console, mas sem impacto funcional (a diretiva é simplesmente ignorada).

### 2. Sentry DSN Não Configurado
```
ℹ️ Sentry DSN não configurado. Error tracking desabilitado.
```

**Problema:** Console.log desnecessário informando que Sentry não está configurado (funcionalidade opcional).

**Impacto:** Poluição do console com informação não crítica.

---

## ✅ Correções Aplicadas

### 1. Removido frame-ancestors do CSP Meta Tag

**Arquivo:** `index.html`

**Antes:**
```html
<meta http-equiv="Content-Security-Policy" content="... frame-ancestors 'none'; ..." />
```

**Depois:**
```html
<meta http-equiv="Content-Security-Policy" content="... base-uri 'self'; ..." />
<!-- NOTA: frame-ancestors deve ser configurado no servidor (HTTP header), não funciona em meta tag -->
```

**Nota:** Para configurar `frame-ancestors` corretamente, deve ser adicionado no servidor web via HTTP header.

### 2. Removido Console.log do Sentry

Registro histórico referente ao antigo `src/lib/sentry.tsx`. Esse módulo foi posteriormente removido durante o plano URGENTE porque não havia integração real com um provider de observabilidade.

---

## 📊 Resultado registrado à época

- redução de ruído de console;
- documentação do limite de `frame-ancestors` em meta tag;
- Sentry permanecia opcional e não implementado de fato.

---

## Nota de estado atual

Este documento não deve ser usado como prova de build, monitoramento ou prontidão de produção. O estado atual exige Quality Gate executado, observabilidade real e provas de ambiente conforme `URGENTE.md`.
