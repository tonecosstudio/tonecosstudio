# 👁️ Preview Visual do Sistema de Chaves

**Data:** 26/02/2026  
**Versão:** 1.0

---

## 🎨 Interface Admin

### Página: `/admin/chaves-pagamento`

```
┌─────────────────────────────────────────────────────────────┐
│  Configuração de Chaves de Pagamento                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Chaves PIX] [Links de Cartão]                            │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Compra Avulsa (One-time)                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 123.456.789-00                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Voucher (Entrada R$ 100)                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 987.654.321-00                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Assinatura Trimestral                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 111.222.333-44                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Assinatura Semestral                                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 555.666.777-88                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Assinatura Anual                                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 999.888.777-66                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [Salvar Todas as Chaves]                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 💳 Checkout - Compra Avulsa

### Página: `/orcamento/checkout?quote=xxx`

```
┌─────────────────────────────────────────────────────────────┐
│  Finalizar Pedido                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Forma de Pagamento:                                        │
│  ○ Pré-venda (Entrada de R$ 100,00)                        │
│  ● Pagamento Total (R$ 500,00)                             │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  🔑 Pagamento via PIX                                       │
│                                                              │
│  Chave PIX:                                                 │
│  ┌────────────────────────────────────────────┐ [📋 Copiar]│
│  │ 123.456.789-00                             │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
│  Instruções:                                                │
│  1. Abra o aplicativo do seu banco                         │
│  2. Escolha a opção "Pagar com PIX"                        │
│  3. Cole a chave PIX copiada acima                         │
│  4. Confirme o valor de R$ 500,00                          │
│  5. Finalize o pagamento                                    │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  💳 Pagamento via Cartão                                    │
│                                                              │
│  [Pagar com Cartão de Crédito →]                          │
│                                                              │
│  Você será redirecionado para a página de pagamento        │
│  segura para finalizar sua compra.                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎫 Checkout - Voucher (Entrada)

### Página: `/orcamento/checkout?quote=xxx`

```
┌─────────────────────────────────────────────────────────────┐
│  Finalizar Pedido                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Forma de Pagamento:                                        │
│  ● Pré-venda (Entrada de R$ 100,00)                        │
│  ○ Pagamento Total (R$ 500,00)                             │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  🔑 Pagamento via PIX                                       │
│                                                              │
│  Chave PIX:                                                 │
│  ┌────────────────────────────────────────────┐ [📋 Copiar]│
│  │ 987.654.321-00                             │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
│  Instruções:                                                │
│  1. Abra o aplicativo do seu banco                         │
│  2. Escolha a opção "Pagar com PIX"                        │
│  3. Cole a chave PIX copiada acima                         │
│  4. Confirme o valor de R$ 100,00                          │
│  5. Finalize o pagamento                                    │
│                                                              │
│  ⚠️ Atenção: Este é o pagamento da ENTRADA                 │
│  O saldo restante será cobrado na entrega do produto.      │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  💳 Pagamento via Cartão                                    │
│                                                              │
│  [Pagar Entrada com Cartão →]                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📅 Checkout - Assinatura Trimestral

### Página: `/colecoes/[slug]/assinar`

```
┌─────────────────────────────────────────────────────────────┐
│  Assinar Coleção                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Escolha seu Plano:                                         │
│  ● Trimestral - R$ 150,00 a cada 3 meses                   │
│  ○ Semestral - R$ 280,00 a cada 6 meses                    │
│  ○ Anual - R$ 500,00 por ano                               │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  🔑 Pagamento via PIX                                       │
│                                                              │
│  Chave PIX:                                                 │
│  ┌────────────────────────────────────────────┐ [📋 Copiar]│
│  │ 111.222.333-44                             │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
│  Instruções:                                                │
│  1. Abra o aplicativo do seu banco                         │
│  2. Escolha a opção "Pagar com PIX"                        │
│  3. Cole a chave PIX copiada acima                         │
│  4. Confirme o valor de R$ 150,00                          │
│  5. Finalize o pagamento                                    │
│                                                              │
│  ℹ️ Sua assinatura será renovada automaticamente           │
│  a cada 3 meses. Você pode cancelar a qualquer momento.    │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  💳 Pagamento via Cartão                                    │
│                                                              │
│  [Assinar com Cartão de Crédito →]                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Mobile - Compra Avulsa

```
┌──────────────────────────┐
│  Finalizar Pedido        │
├──────────────────────────┤
│                          │
│  Forma de Pagamento:     │
│  ○ Pré-venda (R$ 100)   │
│  ● Total (R$ 500)       │
│                          │
│  ──────────────────────  │
│                          │
│  🔑 PIX                  │
│                          │
│  ┌──────────────┐ [📋]  │
│  │ 123.456.789  │       │
│  └──────────────┘       │
│                          │
│  1. Abra seu banco       │
│  2. Pague com PIX        │
│  3. Cole a chave         │
│  4. Confirme R$ 500      │
│                          │
│  ──────────────────────  │
│                          │
│  💳 Cartão               │
│                          │
│  [Pagar →]              │
│                          │
└──────────────────────────┘
```

---

## 🎨 Estados do Componente

### Estado 1: Carregando
```
┌─────────────────────────────────────┐
│ 🔑 Pagamento via PIX                │
│                                     │
│ ┌─────────────────────────┐        │
│ │ ⏳ Carregando...        │        │
│ └─────────────────────────┘        │
└─────────────────────────────────────┘
```

### Estado 2: Chave Configurada
```
┌─────────────────────────────────────┐
│ 🔑 Pagamento via PIX                │
│                                     │
│ ┌─────────────────────────┐ [📋]   │
│ │ 123.456.789-00          │        │
│ └─────────────────────────┘        │
│                                     │
│ 1. Abra o app do seu banco         │
│ 2. Escolha pagar com PIX           │
│ 3. Cole a chave PIX copiada        │
│ 4. Confirme o pagamento            │
└─────────────────────────────────────┘
```

### Estado 3: Chave Não Configurada
```
┌─────────────────────────────────────┐
│ 🔑 Pagamento via PIX                │
│                                     │
│ ⚠️ Chave PIX não configurada       │
│                                     │
│ Entre em contato com o suporte     │
│ para mais informações.             │
└─────────────────────────────────────┘
```

### Estado 4: Chave Copiada
```
┌─────────────────────────────────────┐
│ 🔑 Pagamento via PIX                │
│                                     │
│ ┌─────────────────────────┐ [✓]    │
│ │ 123.456.789-00          │        │
│ └─────────────────────────┘        │
│                                     │
│ ✅ Chave copiada!                  │
└─────────────────────────────────────┘
```

---

## 🎯 Fluxo do Usuário

```
┌─────────────┐
│   Cliente   │
│   acessa    │
│  checkout   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Seleciona  │
│   método    │
│ (PIX/Cartão)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Sistema   │
│   detecta   │
│    tipo     │
└──────┬──────┘
       │
       ├─────────────┬─────────────┬─────────────┬─────────────┐
       │             │             │             │             │
       ▼             ▼             ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Compra   │  │ Voucher  │  │Trimestral│  │Semestral │  │  Anual   │
│ Avulsa   │  │ (Entrada)│  │          │  │          │  │          │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │             │             │
     ▼             ▼             ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Chave   │  │  Chave   │  │  Chave   │  │  Chave   │  │  Chave   │
│   PIX    │  │   PIX    │  │   PIX    │  │   PIX    │  │   PIX    │
│ Onetime  │  │ Voucher  │  │Quarterly │  │Semiannual│  │  Annual  │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │             │             │
     └─────────────┴─────────────┴─────────────┴─────────────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │   Exibe     │
                          │   chave     │
                          │  + botão    │
                          │   copiar    │
                          └──────┬──────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │   Cliente   │
                          │    copia    │
                          │     e       │
                          │    paga     │
                          └─────────────┘
```

---

## 🎨 Cores e Estilos

### Chave PIX:
- **Fundo:** Branco
- **Borda:** Cinza claro
- **Texto:** Preto
- **Botão Copiar:** Azul primário
- **Ícone:** 📋 (clipboard)

### Link de Cartão:
- **Fundo:** Azul primário
- **Texto:** Branco
- **Hover:** Azul escuro
- **Ícone:** 💳 (cartão)

### Instruções:
- **Fundo:** Cinza muito claro
- **Texto:** Cinza escuro
- **Numeração:** Azul primário

### Estados:
- **Carregando:** Cinza claro + spinner
- **Sucesso:** Verde + ícone ✓
- **Erro:** Vermelho + ícone ⚠️

---

## 📊 Responsividade

### Desktop (>768px):
- Layout em coluna única
- Chave PIX com largura máxima
- Botão copiar ao lado da chave
- Instruções em lista numerada

### Tablet (768px - 1024px):
- Layout similar ao desktop
- Fonte ligeiramente menor
- Espaçamento reduzido

### Mobile (<768px):
- Layout compacto
- Chave PIX em linha única
- Botão copiar abaixo da chave
- Instruções resumidas

---

## ✅ Acessibilidade

- ✅ Labels descritivos
- ✅ Contraste adequado (WCAG AA)
- ✅ Navegação por teclado
- ✅ Screen reader friendly
- ✅ Feedback visual claro
- ✅ Mensagens de erro descritivas

---

**Criado por:** Kiro AI  
**Data:** 26/02/2026  
**Versão:** 1.0

