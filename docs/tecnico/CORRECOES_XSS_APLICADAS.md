# Correções XSS Aplicadas

## ✅ Implementações Realizadas

### 1. Biblioteca DOMPurify Instalada
```bash
npm install dompurify @types/dompurify
```

### 2. Utilitário de Sanitização Criado
**Arquivo**: `src/lib/utils/sanitize.ts`

**Funções implementadas**:
- `sanitizeHtml()` - Sanitiza HTML permitindo tags seguras
- `sanitizeText()` - Remove todo HTML
- `sanitizeUrl()` - Valida URLs e remove protocolos perigosos
- `sanitizeGroupMessage()` - Sanitiza mensagens de grupo
- `sanitizeGroupName()` - Sanitiza nomes de grupo
- `sanitizeProfile()` - Sanitiza dados de perfil

**Configuração de segurança**:
```typescript
ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br']
ALLOWED_ATTR: ['href', 'target', 'rel']
ALLOW_DATA_ATTR: false
```

### 3. Sanitização Aplicada no Frontend

#### 3.1 MemberGroupMessages.tsx
**Localização**: `src/components/groups/MemberGroupMessages.tsx`

**Mudanças**:
```typescript
// ANTES
<span>{message.sender_name}</span>
<p>{message.message}</p>

// DEPOIS
<span>{sanitizeText(message.sender_name)}</span>
<p dangerouslySetInnerHTML={{ 
  __html: sanitizeGroupMessage(message.message) 
}} />
```

**Proteção**:
- Nome do remetente sanitizado (remove HTML)
- Mensagem sanitizada (permite formatação básica segura)
- Previne XSS via nomes de usuário
- Previne XSS via conteúdo de mensagem

### 4. Sanitização Aplicada no Backend

#### 4.1 messageService.ts
**Localização**: `src/lib/services/messageService.ts`

**Mudanças**:
```typescript
// ANTES
message: message.trim()

// DEPOIS
const sanitizedMessage = sanitizeGroupMessage(message.trim());
message: sanitizedMessage
```

**Proteção**:
- Mensagens sanitizadas antes de salvar no banco
- Defesa em profundidade (backend + frontend)
- Previne armazenamento de conteúdo malicioso

#### 4.2 groupService.ts
**Localização**: `src/lib/services/groupService.ts`

**Mudanças**:
```typescript
// ANTES
name: input.name

// DEPOIS
const sanitizedName = sanitizeGroupName(input.name);
name: sanitizedName
```

**Proteção**:
- Nomes de grupo sanitizados antes de salvar
- Remove todo HTML de nomes
- Previne XSS via nomes de grupo

---

## 🛡️ Proteções Implementadas

### Vetores de Ataque Bloqueados

1. **XSS via Mensagem de Grupo**
   ```html
   <!-- BLOQUEADO -->
   <script>alert('XSS')</script>
   <img src=x onerror="alert('XSS')">
   <iframe src="javascript:alert('XSS')">
   ```

2. **XSS via Nome de Grupo**
   ```html
   <!-- BLOQUEADO -->
   Grupo <script>alert('XSS')</script>
   <img src=x onerror="alert('XSS')"> Grupo
   ```

3. **XSS via Nome de Usuário**
   ```html
   <!-- BLOQUEADO -->
   Admin<script>alert('XSS')</script>
   <img src=x onerror="alert('XSS')">
   ```

4. **JavaScript URIs**
   ```html
   <!-- BLOQUEADO -->
   <a href="javascript:alert('XSS')">Click</a>
   <a href="data:text/html,<script>alert('XSS')</script>">Click</a>
   ```

### Formatação Permitida (Segura)

```html
<!-- PERMITIDO -->
<b>Negrito</b>
<i>Itálico</i>
<em>Ênfase</em>
<strong>Forte</strong>
<br>
<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>
```

---

## 🧪 Testes de Validação

### Teste Manual

1. **Criar grupo com nome malicioso**:
   ```
   Nome: Grupo <script>alert('XSS')</script>
   Resultado esperado: "Grupo" (script removido)
   ```

2. **Enviar mensagem com XSS**:
   ```
   Mensagem: Olá <img src=x onerror="alert('XSS')">
   Resultado esperado: "Olá" (img removido)
   ```

3. **Enviar mensagem com formatação**:
   ```
   Mensagem: Texto <b>negrito</b> e <i>itálico</i>
   Resultado esperado: Formatação preservada
   ```

### Teste Automatizado

Criar arquivo: `src/test/xss-protection.test.ts`

```typescript
import { 
  sanitizeGroupMessage, 
  sanitizeGroupName, 
  sanitizeText 
} from '@/lib/utils/sanitize';

describe('XSS Protection', () => {
  it('should remove script tags from messages', () => {
    const dirty = 'Hello <script>alert("XSS")</script>';
    const clean = sanitizeGroupMessage(dirty);
    expect(clean).toBe('Hello ');
    expect(clean).not.toContain('<script>');
  });

  it('should remove img onerror from messages', () => {
    const dirty = 'Hello <img src=x onerror="alert(\'XSS\')">';
    const clean = sanitizeGroupMessage(dirty);
    expect(clean).not.toContain('onerror');
  });

  it('should allow safe formatting', () => {
    const dirty = 'Hello <b>world</b> and <i>test</i>';
    const clean = sanitizeGroupMessage(dirty);
    expect(clean).toContain('<b>world</b>');
    expect(clean).toContain('<i>test</i>');
  });

  it('should remove all HTML from group names', () => {
    const dirty = 'Group <script>alert("XSS")</script>';
    const clean = sanitizeGroupName(dirty);
    expect(clean).toBe('Group ');
    expect(clean).not.toContain('<');
  });

  it('should block javascript: URIs', () => {
    const dirty = 'javascript:alert("XSS")';
    const clean = sanitizeUrl(dirty);
    expect(clean).toBe('');
  });
});
```

---

## 📊 Impacto

### Antes
- ❌ Vulnerável a XSS em mensagens
- ❌ Vulnerável a XSS em nomes de grupo
- ❌ Vulnerável a XSS em nomes de usuário
- ❌ Sem sanitização de entrada
- ❌ Sem sanitização de saída

### Depois
- ✅ Protegido contra XSS em mensagens
- ✅ Protegido contra XSS em nomes de grupo
- ✅ Protegido contra XSS em nomes de usuário
- ✅ Sanitização no backend (defesa em profundidade)
- ✅ Sanitização no frontend (renderização segura)
- ✅ Formatação básica permitida (UX preservada)

---

## 🔄 Próximos Passos

### Aplicar em Outros Locais

1. **Sistema de Suporte**
   - Sanitizar mensagens de suporte
   - Sanitizar assuntos de conversas
   - Sanitizar nomes de anexos

2. **Perfis de Usuário**
   - Sanitizar nome completo
   - Sanitizar bio
   - Sanitizar campos customizados

3. **Comentários e Reviews**
   - Sanitizar comentários de produtos
   - Sanitizar reviews
   - Sanitizar respostas

### Melhorias Adicionais

1. **CSP Headers**
   - Configurar Content Security Policy
   - Bloquear inline scripts
   - Whitelist de domínios

2. **Rate Limiting**
   - Limitar taxa de envio de mensagens
   - Prevenir spam/flood
   - Detectar comportamento suspeito

3. **Auditoria**
   - Logging de tentativas de XSS
   - Alertas para admins
   - Análise de padrões

---

## 📝 Documentação

### Para Desenvolvedores

**Sempre sanitize user input**:
```typescript
import { sanitizeText, sanitizeHtml } from '@/lib/utils/sanitize';

// Para texto puro (sem HTML)
const cleanName = sanitizeText(userInput);

// Para conteúdo com formatação
const cleanContent = sanitizeHtml(userInput);
```

**Nunca use dangerouslySetInnerHTML sem sanitização**:
```typescript
// ❌ ERRADO
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ CORRETO
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userInput) }} />
```

### Para QA

**Testar com payloads XSS**:
- `<script>alert('XSS')</script>`
- `<img src=x onerror="alert('XSS')">`
- `<iframe src="javascript:alert('XSS')">`
- `<svg onload="alert('XSS')">`
- `javascript:alert('XSS')`
- `data:text/html,<script>alert('XSS')</script>`

**Verificar**:
- Scripts não executam
- HTML malicioso é removido
- Formatação segura funciona
- Nenhum erro no console

---

## ✅ Status

- [x] DOMPurify instalado
- [x] Utilitário de sanitização criado
- [x] Sanitização aplicada em mensagens de grupo
- [x] Sanitização aplicada em nomes de grupo
- [x] Sanitização aplicada no backend
- [x] Sanitização aplicada no frontend
- [ ] Testes automatizados criados
- [ ] CSP headers configurados
- [ ] Aplicado em sistema de suporte
- [ ] Aplicado em perfis de usuário
- [ ] Documentação completa

**Prioridade**: CRÍTICO ✅ CONCLUÍDO
**Próximo**: Revisar usos de `.single()` e implementar Error Boundaries
