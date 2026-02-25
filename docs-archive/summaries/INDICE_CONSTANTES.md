# 📚 Índice Completo de Constantes

## 🔍 Referência Rápida

Todas as constantes disponíveis em `src/config/constants.ts`

---

## 🌐 ENV - Configurações de Ambiente

| Constante               | Tipo    | Padrão  | Descrição                  |
| ----------------------- | ------- | ------- | -------------------------- |
| `ENV.SUPABASE_URL`      | string  | ''      | URL do projeto Supabase    |
| `ENV.SUPABASE_ANON_KEY` | string  | ''      | Chave anônima do Supabase  |
| `ENV.SENTRY_DSN`        | string  | ''      | DSN do Sentry (opcional)   |
| `ENV.APP_VERSION`       | string  | '1.0.0' | Versão da aplicação        |
| `ENV.IS_PRODUCTION`     | boolean | -       | Se está em produção        |
| `ENV.IS_DEVELOPMENT`    | boolean | -       | Se está em desenvolvimento |

**Variáveis de Ambiente:**

```env
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SENTRY_DSN
VITE_APP_VERSION
```

---

## 💰 PRICING - Preços e Pagamentos

| Constante                                | Tipo   | Padrão | Descrição                |
| ---------------------------------------- | ------ | ------ | ------------------------ |
| `PRICING.DEFAULT_PRICE_FULL`             | number | 500    | Preço padrão cartão      |
| `PRICING.DEFAULT_PRICE_PIX`              | number | 475    | Preço padrão PIX         |
| `PRICING.DEFAULT_DEPOSIT_AMOUNT`         | number | 100    | Valor de entrada         |
| `PRICING.PIX_DISCOUNT_PERCENTAGE`        | number | 5      | Desconto PIX (%)         |
| `PRICING.PIX_DISCOUNT_MULTIPLIER`        | number | 0.95   | Multiplicador desconto   |
| `PRICING.MAX_INSTALLMENTS_NO_INTEREST`   | number | 6      | Parcelas sem juros       |
| `PRICING.MAX_INSTALLMENTS_WITH_INTEREST` | number | 10     | Parcelas com juros       |
| `PRICING.DEFAULT_REMAINING_FULL`         | number | 400    | Saldo cartão (calculado) |
| `PRICING.DEFAULT_REMAINING_PIX`          | number | 375    | Saldo PIX (calculado)    |

**Variáveis de Ambiente:**

```env
VITE_DEFAULT_PRICE_FULL=500
VITE_DEFAULT_PRICE_PIX=475
VITE_DEFAULT_DEPOSIT_AMOUNT=100
VITE_PIX_DISCOUNT_PERCENTAGE=5
VITE_MAX_INSTALLMENTS_NO_INTEREST=6
VITE_MAX_INSTALLMENTS_WITH_INTEREST=10
```

**Exemplo de Uso:**

```typescript
import { PRICING } from "@/config/constants";

const price = PRICING.DEFAULT_PRICE_FULL; // 500
const pixPrice = price * PRICING.PIX_DISCOUNT_MULTIPLIER; // 475
const installments = PRICING.MAX_INSTALLMENTS_NO_INTEREST; // 6
```

---

## 📦 BATCH - Produção e Lotes

| Constante                      | Tipo   | Padrão | Descrição                 |
| ------------------------------ | ------ | ------ | ------------------------- |
| `BATCH.SHIPPING_BUSINESS_DAYS` | number | 5      | Dias úteis para envio     |
| `BATCH.CYCLES_PER_MONTH`       | number | 2      | Ciclos por mês (fixo)     |
| `BATCH.CYCLE1_START_DAY`       | number | 1      | Início Ciclo 1            |
| `BATCH.CYCLE1_END_DAY`         | number | 15     | Fim Ciclo 1               |
| `BATCH.CYCLE2_START_DAY`       | number | 16     | Início Ciclo 2            |
| `BATCH.EXCHANGE_DEADLINE_DAYS` | number | 1      | Prazo para troca          |
| `BATCH.FUTURE_BATCHES_COUNT`   | number | 12     | Ciclos futuros a calcular |

**Variáveis de Ambiente:**

```env
VITE_SHIPPING_BUSINESS_DAYS=5
VITE_EXCHANGE_DEADLINE_DAYS=1
VITE_FUTURE_BATCHES_COUNT=12
```

**Exemplo de Uso:**

```typescript
import { BATCH } from "@/config/constants";

const rules = { shippingBusinessDays: BATCH.SHIPPING_BUSINESS_DAYS };
const futureBatches = calculateFutureBatches(rules, BATCH.FUTURE_BATCHES_COUNT);
```

---

## 📧 CONTACT - Emails e Contato

| Constante                 | Tipo   | Padrão                     | Descrição         |
| ------------------------- | ------ | -------------------------- | ----------------- |
| `CONTACT.SUPPORT_EMAIL`   | string | 'suporte@ordax.com.br'     | Email de suporte  |
| `CONTACT.CONTACT_EMAIL`   | string | 'contato@ordax.com.br'     | Email de contato  |
| `CONTACT.PRIVACY_EMAIL`   | string | 'privacidade@ordax.com.br' | Email privacidade |
| `CONTACT.DPO_EMAIL`       | string | 'dpo@ordax.com.br'         | Email DPO         |
| `CONTACT.WEBSITE_URL`     | string | 'https://ordax.com.br'     | URL do site       |
| `CONTACT.COMPANY_NAME`    | string | 'Tonecos Studios'          | Nome da empresa   |
| `CONTACT.COMPANY_ADDRESS` | string | 'São Paulo, Brasil'        | Endereço          |

**Variáveis de Ambiente:**

```env
VITE_SUPPORT_EMAIL="suporte@ordax.com.br"
VITE_CONTACT_EMAIL="contato@ordax.com.br"
VITE_PRIVACY_EMAIL="privacidade@ordax.com.br"
VITE_DPO_EMAIL="dpo@ordax.com.br"
VITE_WEBSITE_URL="https://ordax.com.br"
VITE_COMPANY_NAME="Tonecos Studios"
VITE_COMPANY_ADDRESS="São Paulo, Brasil"
```

**Exemplo de Uso:**

```typescript
import { CONTACT } from "@/config/constants";

const supportLink = `mailto:${CONTACT.SUPPORT_EMAIL}`;
const companyInfo = {
  name: CONTACT.COMPANY_NAME,
  website: CONTACT.WEBSITE_URL,
};
```

---

## 🔔 NOTIFICATIONS - Notificações e Realtime

| Constante                                     | Tipo   | Padrão | Descrição                      |
| --------------------------------------------- | ------ | ------ | ------------------------------ |
| `NOTIFICATIONS.USER_ONLINE_THRESHOLD_MINUTES` | number | 5      | Minutos para considerar online |
| `NOTIFICATIONS.POLLING_INTERVAL_MS`           | number | 30000  | Intervalo de polling (ms)      |
| `NOTIFICATIONS.TOAST_DURATION_MS`             | number | 5000   | Duração do toast (ms)          |

**Variáveis de Ambiente:**

```env
VITE_USER_ONLINE_THRESHOLD=5
VITE_NOTIFICATION_POLLING_INTERVAL=30000
VITE_TOAST_DURATION=5000
```

**Exemplo de Uso:**

```typescript
import { NOTIFICATIONS } from "@/config/constants";

const isOnline = lastActivity < NOTIFICATIONS.USER_ONLINE_THRESHOLD_MINUTES * 60 * 1000;
setInterval(checkNotifications, NOTIFICATIONS.POLLING_INTERVAL_MS);
```

---

## 🎨 UI - Interface e UX

| Constante                      | Tipo     | Padrão         | Descrição             |
| ------------------------------ | -------- | -------------- | --------------------- |
| `UI.DEFAULT_PAGE_SIZE`         | number   | 20             | Itens por página      |
| `UI.ITEMS_PER_PAGE_OPTIONS`    | number[] | [10,20,50,100] | Opções de paginação   |
| `UI.SEARCH_DEBOUNCE_MS`        | number   | 300            | Debounce busca (ms)   |
| `UI.INPUT_DEBOUNCE_MS`         | number   | 500            | Debounce input (ms)   |
| `UI.LAZY_LOAD_THRESHOLD`       | number   | 100            | Threshold lazy load   |
| `UI.IMAGE_COMPRESSION_QUALITY` | number   | 0.8            | Qualidade compressão  |
| `UI.MAX_IMAGE_SIZE_MB`         | number   | 5              | Tamanho máximo imagem |

**Variáveis de Ambiente:**

```env
VITE_DEFAULT_PAGE_SIZE=20
VITE_SEARCH_DEBOUNCE=300
VITE_INPUT_DEBOUNCE=500
VITE_LAZY_LOAD_THRESHOLD=100
VITE_IMAGE_COMPRESSION_QUALITY=0.8
VITE_MAX_IMAGE_SIZE_MB=5
```

**Exemplo de Uso:**

```typescript
import { UI } from "@/config/constants";

const debouncedSearch = useDebounce(searchTerm, UI.SEARCH_DEBOUNCE_MS);
const pageSize = UI.DEFAULT_PAGE_SIZE;
```

---

## 🔒 SECURITY - Segurança

| Constante                          | Tipo   | Padrão | Descrição                  |
| ---------------------------------- | ------ | ------ | -------------------------- |
| `SECURITY.MAX_RETRY_ATTEMPTS`      | number | 3      | Tentativas de retry        |
| `SECURITY.RETRY_DELAY_MS`          | number | 1000   | Delay entre retries (ms)   |
| `SECURITY.REQUEST_TIMEOUT_MS`      | number | 30000  | Timeout de requisição (ms) |
| `SECURITY.MAX_REQUESTS_PER_MINUTE` | number | 60     | Rate limit                 |

**Variáveis de Ambiente:**

```env
VITE_MAX_RETRY_ATTEMPTS=3
VITE_RETRY_DELAY=1000
VITE_REQUEST_TIMEOUT=30000
VITE_MAX_REQUESTS_PER_MINUTE=60
```

**Exemplo de Uso:**

```typescript
import { SECURITY } from "@/config/constants";

for (let i = 0; i < SECURITY.MAX_RETRY_ATTEMPTS; i++) {
  try {
    await fetchData();
    break;
  } catch (error) {
    await sleep(SECURITY.RETRY_DELAY_MS);
  }
}
```

---

## 📊 ANALYTICS - Analytics e Logs

| Constante                      | Tipo    | Padrão | Descrição            |
| ------------------------------ | ------- | ------ | -------------------- |
| `ANALYTICS.ENABLE_SENTRY`      | boolean | false  | Habilitar Sentry     |
| `ANALYTICS.SENTRY_SAMPLE_RATE` | number  | 1.0    | Taxa de amostragem   |
| `ANALYTICS.ENABLE_DEBUG_LOGS`  | boolean | dev    | Habilitar logs debug |

**Variáveis de Ambiente:**

```env
VITE_ENABLE_SENTRY=true
VITE_SENTRY_SAMPLE_RATE=1.0
VITE_ENABLE_DEBUG_LOGS=false
```

**Exemplo de Uso:**

```typescript
import { ANALYTICS } from "@/config/constants";

if (ANALYTICS.ENABLE_DEBUG_LOGS) {
  console.log("Debug info:", data);
}
```

---

## 🎯 PLANS - Planos e Assinaturas

| Constante                             | Tipo     | Padrão                  | Descrição            |
| ------------------------------------- | -------- | ----------------------- | -------------------- |
| `PLANS.TYPES`                         | string[] | ['avulso','mensal',...] | Tipos de planos      |
| `PLANS.DEFAULT_DELIVERIES.avulso`     | number   | 1                       | Entregas avulso      |
| `PLANS.DEFAULT_DELIVERIES.mensal`     | number   | 1                       | Entregas mensal      |
| `PLANS.DEFAULT_DELIVERIES.trimestral` | number   | 3                       | Entregas trimestral  |
| `PLANS.DEFAULT_DELIVERIES.semestral`  | number   | 6                       | Entregas semestral   |
| `PLANS.DEFAULT_DELIVERIES.anual`      | number   | 12                      | Entregas anual       |
| `PLANS.DAYS_TO_NEXT_DELIVERY`         | number   | 30                      | Dias próxima entrega |

**Variáveis de Ambiente:**

```env
VITE_DAYS_TO_NEXT_DELIVERY=30
```

**Exemplo de Uso:**

```typescript
import { PLANS } from "@/config/constants";

const deliveries = PLANS.DEFAULT_DELIVERIES.trimestral; // 3
const nextDelivery = addDays(today, PLANS.DAYS_TO_NEXT_DELIVERY);
```

---

## 🌍 LOCALE - Localização

| Constante                 | Tipo   | Padrão              | Descrição     |
| ------------------------- | ------ | ------------------- | ------------- |
| `LOCALE.DEFAULT_LANGUAGE` | string | 'pt-BR'             | Idioma padrão |
| `LOCALE.CURRENCY`         | string | 'BRL'               | Moeda         |
| `LOCALE.CURRENCY_SYMBOL`  | string | 'R$'                | Símbolo moeda |
| `LOCALE.TIMEZONE`         | string | 'America/Sao_Paulo' | Timezone      |

**Variáveis de Ambiente:**

```env
VITE_DEFAULT_LANGUAGE="pt-BR"
VITE_CURRENCY="BRL"
VITE_CURRENCY_SYMBOL="R$"
VITE_TIMEZONE="America/Sao_Paulo"
```

**Exemplo de Uso:**

```typescript
import { LOCALE } from "@/config/constants";

const formatted = price.toLocaleString(LOCALE.DEFAULT_LANGUAGE, {
  style: "currency",
  currency: LOCALE.CURRENCY,
});
```

---

## 🔗 ROUTES - Rotas da Aplicação

| Constante            | Tipo   | Valor              | Descrição       |
| -------------------- | ------ | ------------------ | --------------- |
| `ROUTES.HOME`        | string | '/'                | Página inicial  |
| `ROUTES.LOGIN`       | string | '/login'           | Login           |
| `ROUTES.COLLECTIONS` | string | '/colecoes'        | Coleções        |
| `ROUTES.PLANS`       | string | '/planos'          | Planos          |
| `ROUTES.DASHBOARD`   | string | '/dashboard'       | Dashboard       |
| `ROUTES.PROFILE`     | string | '/perfil'          | Perfil          |
| `ROUTES.MY_PAYMENTS` | string | '/meus-pagamentos' | Meus pagamentos |
| `ROUTES.ADMIN`       | string | '/admin'           | Admin           |
| ...                  | ...    | ...                | ...             |

**Exemplo de Uso:**

```typescript
import { ROUTES } from "@/config/constants";

<Link to={ROUTES.COLLECTIONS}>Ver Coleções</Link>
navigate(ROUTES.DASHBOARD);
```

---

## 🎨 THEME - Tema e Cores

| Constante                            | Tipo   | Valor            | Descrição              |
| ------------------------------------ | ------ | ---------------- | ---------------------- |
| `THEME.STATUS_COLORS.pending`        | string | 'yellow'         | Cor status pendente    |
| `THEME.STATUS_COLORS.processing`     | string | 'blue'           | Cor status processando |
| `THEME.STATUS_COLORS.completed`      | string | 'green'          | Cor status completo    |
| `THEME.STATUS_COLORS.cancelled`      | string | 'red'            | Cor status cancelado   |
| `THEME.PLAN_BADGES.trimestral.label` | string | 'Mais escolhido' | Badge trimestral       |
| `THEME.PLAN_BADGES.semestral.label`  | string | 'Melhor valor'   | Badge semestral        |

**Exemplo de Uso:**

```typescript
import { THEME } from "@/config/constants";

const color = THEME.STATUS_COLORS[status];
const badge = THEME.PLAN_BADGES.trimestral.label;
```

---

## 📝 VALIDATION - Validações e Limites

| Constante                           | Tipo     | Padrão             | Descrição                |
| ----------------------------------- | -------- | ------------------ | ------------------------ |
| `VALIDATION.MIN_NAME_LENGTH`        | number   | 2                  | Tamanho mínimo nome      |
| `VALIDATION.MAX_NAME_LENGTH`        | number   | 100                | Tamanho máximo nome      |
| `VALIDATION.MAX_DESCRIPTION_LENGTH` | number   | 1000               | Tamanho máximo descrição |
| `VALIDATION.MAX_MESSAGE_LENGTH`     | number   | 5000               | Tamanho máximo mensagem  |
| `VALIDATION.ALLOWED_IMAGE_TYPES`    | string[] | ['image/jpeg',...] | Tipos de imagem          |
| `VALIDATION.MAX_FILE_SIZE_BYTES`    | number   | 5MB                | Tamanho máximo arquivo   |
| `VALIDATION.MIN_PRICE`              | number   | 0                  | Preço mínimo             |
| `VALIDATION.MAX_PRICE`              | number   | 999999             | Preço máximo             |

**Exemplo de Uso:**

```typescript
import { VALIDATION } from "@/config/constants";

if (name.length < VALIDATION.MIN_NAME_LENGTH) {
  throw new Error("Nome muito curto");
}

if (!VALIDATION.ALLOWED_IMAGE_TYPES.includes(file.type)) {
  throw new Error("Tipo de arquivo não permitido");
}
```

---

## 🔍 Como Buscar uma Constante

### Por Funcionalidade

- **Preços?** → `PRICING`
- **Emails?** → `CONTACT`
- **Produção?** → `BATCH`
- **Interface?** → `UI`
- **Rotas?** → `ROUTES`

### Por Valor

Use Ctrl+F neste documento ou busque em `src/config/constants.ts`

### Por Variável de Ambiente

Todas as variáveis começam com `VITE_` e estão documentadas em `.env.example`

---

## 📚 Documentação Relacionada

- **Guia de Migração:** `GUIA_MIGRACAO_CONSTANTES.md`
- **Documentação Completa:** `REMOCAO_HARDCODED_COMPLETA.md`
- **Arquivo de Constantes:** `src/config/constants.ts`
- **Exemplo de Env:** `.env.example`

---

## 🎯 Dica Rápida

**Sempre que for usar um valor fixo, pergunte-se:**

1. Este valor pode mudar entre ambientes? → Use variável de ambiente
2. Este valor pode ser configurado? → Use constante
3. Este valor é único para este contexto? → Pode deixar hardcoded

**Regra de ouro:** Se o valor aparece em mais de um lugar, deve ser uma constante!
