# 🚀 Guia Rápido de Migração - Constantes Centralizadas

## 📖 Para Desenvolvedores

### Como Usar as Novas Constantes

#### 1. Importar Constantes

```typescript
// ❌ ANTES - Valores hardcoded
const price = 500;
const discount = 0.95;
const email = "suporte@ordax.com.br";

// ✅ DEPOIS - Usar constantes
import { PRICING, CONTACT } from "@/config/constants";

const price = PRICING.DEFAULT_PRICE_FULL;
const discount = PRICING.PIX_DISCOUNT_MULTIPLIER;
const email = CONTACT.SUPPORT_EMAIL;
```

#### 2. Categorias Disponíveis

```typescript
import {
  ENV, // Ambiente (Supabase, Sentry, versão)
  PRICING, // Preços e pagamentos
  BATCH, // Produção e lotes
  CONTACT, // Emails e contato
  NOTIFICATIONS, // Notificações
  UI, // Interface
  SECURITY, // Segurança
  ANALYTICS, // Analytics
  PLANS, // Planos
  LOCALE, // Localização
  ROUTES, // Rotas
  THEME, // Tema
  VALIDATION, // Validações
} from "@/config/constants";
```

#### 3. Exemplos Práticos

**Preços:**

```typescript
import { PRICING } from "@/config/constants";

// Preço padrão
const price = PRICING.DEFAULT_PRICE_FULL; // 500

// Desconto PIX
const pixPrice = price * PRICING.PIX_DISCOUNT_MULTIPLIER; // 475

// Parcelamento
const installments = PRICING.MAX_INSTALLMENTS_NO_INTEREST; // 6
```

**Emails:**

```typescript
import { CONTACT } from "@/config/constants";

// Email de suporte
const supportEmail = CONTACT.SUPPORT_EMAIL;

// Link para site
const website = CONTACT.WEBSITE_URL;

// Nome da empresa
const company = CONTACT.COMPANY_NAME;
```

**Produção:**

```typescript
import { BATCH } from "@/config/constants";

// Dias úteis para envio
const shippingDays = BATCH.SHIPPING_BUSINESS_DAYS; // 5

// Ciclos futuros
const futureCycles = BATCH.FUTURE_BATCHES_COUNT; // 12
```

### Adicionar Nova Configuração

1. **Editar `src/config/constants.ts`:**

```typescript
export const NOVA_CATEGORIA = {
  VALOR_1: import.meta.env.VITE_VALOR_1 || "padrão",
  VALOR_2: Number(import.meta.env.VITE_VALOR_2) || 100,

  // Valores calculados
  get VALOR_CALCULADO() {
    return this.VALOR_1 + this.VALOR_2;
  },
} as const;
```

2. **Adicionar ao export default:**

```typescript
export default {
  ENV,
  PRICING,
  // ... outras categorias
  NOVA_CATEGORIA, // ← Adicionar aqui
} as const;
```

3. **Adicionar variável ao `.env.example`:**

```env
# Nova Categoria
VITE_VALOR_1="valor"
VITE_VALOR_2=100
```

## 🔧 Para DevOps/Deploy

### Configurar Variáveis de Ambiente

#### Desenvolvimento Local

```bash
# 1. Copiar exemplo
cp .env.example .env

# 2. Editar valores
nano .env

# 3. Configurar valores necessários
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sua-chave-aqui"
```

#### Produção (Vercel/Netlify)

```bash
# Variáveis obrigatórias
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-aqui

# Variáveis de negócio (opcional - usa padrões)
VITE_DEFAULT_PRICE_FULL=500
VITE_DEFAULT_PRICE_PIX=475
VITE_PIX_DISCOUNT_PERCENTAGE=5

# Variáveis de contato (opcional - usa padrões)
VITE_SUPPORT_EMAIL=suporte@seudominio.com
VITE_CONTACT_EMAIL=contato@seudominio.com
VITE_WEBSITE_URL=https://seudominio.com
VITE_COMPANY_NAME="Sua Empresa"
```

#### Docker

```dockerfile
# Dockerfile
ENV VITE_SUPABASE_URL=https://seu-projeto.supabase.co
ENV VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-aqui
ENV VITE_DEFAULT_PRICE_FULL=500
```

Ou via `docker-compose.yml`:

```yaml
services:
  app:
    environment:
      - VITE_SUPABASE_URL=https://seu-projeto.supabase.co
      - VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-aqui
      - VITE_DEFAULT_PRICE_FULL=500
```

### Variáveis Obrigatórias vs Opcionais

#### ✅ Obrigatórias (sem padrão)

```env
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

#### 🔵 Opcionais (com padrão)

Todas as outras variáveis têm valores padrão sensatos. Configure apenas se precisar customizar.

### Validação de Configuração

```typescript
// Verificar se variáveis obrigatórias estão definidas
if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  throw new Error("Variáveis de ambiente obrigatórias não configuradas");
}
```

## 🎯 Casos de Uso Comuns

### 1. Alterar Preço Padrão

**Opção A: Via Variável de Ambiente (Recomendado)**

```env
# .env
VITE_DEFAULT_PRICE_FULL=600
VITE_DEFAULT_PRICE_PIX=570
```

**Opção B: Via Código (Não Recomendado)**

```typescript
// src/config/constants.ts
DEFAULT_PRICE_FULL: Number(import.meta.env.VITE_DEFAULT_PRICE_FULL) || 600,
```

### 2. Alterar Email de Suporte

```env
# .env
VITE_SUPPORT_EMAIL=ajuda@meudominio.com
VITE_CONTACT_EMAIL=contato@meudominio.com
```

### 3. Alterar Dias de Envio

```env
# .env
VITE_SHIPPING_BUSINESS_DAYS=7
```

### 4. Ambiente de Staging

```env
# .env.staging
VITE_SUPABASE_URL=https://staging-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=staging-key
VITE_WEBSITE_URL=https://staging.meudominio.com
VITE_ENABLE_DEBUG_LOGS=true
```

## 🔍 Troubleshooting

### Problema: Valor não está sendo usado

**Solução:**

1. Verificar se a variável está no `.env`
2. Reiniciar o servidor de desenvolvimento
3. Verificar se o import está correto

```typescript
// ❌ Errado
import { PRICING } from "src/config/constants";

// ✅ Correto
import { PRICING } from "@/config/constants";
```

### Problema: Valor undefined em produção

**Solução:**

1. Verificar se a variável está configurada no painel de deploy
2. Variáveis devem começar com `VITE_` para serem expostas ao cliente
3. Rebuild após adicionar variáveis

### Problema: TypeScript não reconhece constante

**Solução:**

1. Verificar se o arquivo foi salvo
2. Reiniciar TypeScript server (VS Code: Cmd+Shift+P → "Restart TS Server")
3. Verificar se o export está correto

## 📚 Referências

- **Arquivo de Constantes:** `src/config/constants.ts`
- **Exemplo de Env:** `.env.example`
- **Documentação Completa:** `REMOCAO_HARDCODED_COMPLETA.md`

## ✅ Checklist de Migração

Ao adicionar nova funcionalidade:

- [ ] Verificar se há valores hardcoded
- [ ] Adicionar constantes em `src/config/constants.ts`
- [ ] Adicionar variáveis em `.env.example`
- [ ] Importar e usar constantes no código
- [ ] Testar com valores padrão
- [ ] Testar com valores customizados via .env
- [ ] Documentar se necessário

## 🎉 Benefícios

✅ **Manutenção:** Um único lugar para todas as configurações  
✅ **Flexibilidade:** Fácil customização por ambiente  
✅ **Segurança:** Sem credenciais hardcoded  
✅ **Type-safe:** TypeScript garante tipos corretos  
✅ **Documentação:** Inline comments explicam cada valor

---

**Dúvidas?** Consulte `REMOCAO_HARDCODED_COMPLETA.md` para documentação detalhada.
