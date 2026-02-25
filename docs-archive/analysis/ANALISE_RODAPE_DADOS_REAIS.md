# 🔍 Análise - Rodapé com Dados Reais

**Data:** 24/02/2026  
**Status:** 🔧 CORREÇÃO NECESSÁRIA

---

## 📋 Problema Identificado

O rodapé (AppFooter.tsx) não está puxando todos os dados reais do banco de dados. Alguns campos estão hardcoded.

---

## 🔍 Análise Detalhada

### Dados Disponíveis no Sistema

**Hook:** `useSystemSettings()`  
**Tabela:** `system_settings`  
**View:** `system_settings_grouped`

#### Campos Disponíveis:

```typescript
interface SystemSettings {
  // Empresa
  company_name: string;
  company_address: string;
  company_logo_url: string;
  cnpj?: string;
  legal_name?: string;

  // Contato
  contact_email: string;          ✅ DISPONÍVEL
  support_email: string;
  privacy_email: string;
  dpo_email: string;
  phone_primary?: string;         ✅ DISPONÍVEL
  phone_whatsapp?: string;        ✅ DISPONÍVEL
  business_hours: string;

  // Website e Redes
  website_url: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
}
```

### Estado Atual do Rodapé

**Arquivo:** `src/components/shell/AppFooter.tsx`

#### O Que Está Funcionando ✅

```tsx
// Email - PUXANDO DO BANCO
<a href={`mailto:${settings?.contact_email || "contato@ordax.com.br"}`}>
  {settings?.contact_email || "contato@ordax.com.br"}
</a>
```

#### O Que Está Hardcoded ❌

```tsx
// Telefone - HARDCODED
<a href="tel:+5511999999999">+55 (11) 9999-9999</a>
```

**Problema:** O telefone não está usando `settings?.phone_primary`

---

## 🎯 Correções Necessárias

### 1. Telefone Principal

**Antes:**

```tsx
<a href="tel:+5511999999999" className="hover:text-background transition-colors">
  +55 (11) 9999-9999
</a>
```

**Depois:**

```tsx
<a
  href={`tel:${settings?.phone_primary || "+5511999999999"}`}
  className="hover:text-background transition-colors"
>
  {settings?.phone_primary || "+55 (11) 9999-9999"}
</a>
```

### 2. WhatsApp (Opcional)

**Adicionar:**

```tsx
{
  settings?.phone_whatsapp && (
    <li>
      <a
        href={`https://wa.me/${settings.phone_whatsapp.replace(/\D/g, "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-background transition-colors flex items-center gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </a>
    </li>
  );
}
```

### 3. Redes Sociais (Opcional)

**Adicionar seção:**

```tsx
{
  /* Redes Sociais */
}
{
  (settings?.facebook_url || settings?.instagram_url || settings?.twitter_url) && (
    <div>
      <h3 className="font-semibold text-background mb-4 text-sm uppercase tracking-wider">
        Redes Sociais
      </h3>
      <div className="flex gap-4">
        {settings?.facebook_url && (
          <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer">
            <Facebook className="h-5 w-5" />
          </a>
        )}
        {settings?.instagram_url && (
          <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer">
            <Instagram className="h-5 w-5" />
          </a>
        )}
        {settings?.twitter_url && (
          <a href={settings.twitter_url} target="_blank" rel="noopener noreferrer">
            <Twitter className="h-5 w-5" />
          </a>
        )}
      </div>
    </div>
  );
}
```

---

## 📊 Dados no Admin

### Onde Configurar

**Página:** `/admin/configuracoes`  
**Tab:** "Geral" ou "Contato"  
**Componente:** `AdminSystemSettings.tsx`

#### Campos Disponíveis para Edição:

```
✅ company_name
✅ company_address
✅ contact_email
✅ support_email
✅ phone_primary        ← PRECISA SER USADO
✅ phone_whatsapp       ← OPCIONAL
✅ facebook_url         ← OPCIONAL
✅ instagram_url        ← OPCIONAL
✅ twitter_url          ← OPCIONAL
```

### Verificar se Admin Tem Interface

**Arquivo:** `src/pages/admin/AdminSystemSettings.tsx`

Precisa verificar se tem campos para:

- ✅ contact_email (provavelmente tem)
- ❓ phone_primary (precisa verificar)
- ❓ phone_whatsapp (precisa verificar)
- ❓ redes sociais (precisa verificar)

---

## 🔧 Plano de Correção

### Prioridade Alta

1. **Corrigir telefone no rodapé**
   - Usar `settings?.phone_primary`
   - Fallback para valor padrão
   - Estimativa: 5 minutos

2. **Verificar interface admin**
   - Confirmar se campos existem
   - Adicionar se necessário
   - Estimativa: 15 minutos

### Prioridade Média

3. **Adicionar WhatsApp (opcional)**
   - Link direto para WhatsApp
   - Ícone do WhatsApp
   - Estimativa: 10 minutos

4. **Adicionar redes sociais (opcional)**
   - Facebook, Instagram, Twitter
   - Ícones das redes
   - Estimativa: 15 minutos

---

## 📝 Checklist de Implementação

### Rodapé (AppFooter.tsx)

- [ ] Corrigir telefone principal
- [ ] Adicionar WhatsApp (opcional)
- [ ] Adicionar redes sociais (opcional)
- [ ] Testar com dados reais
- [ ] Testar com dados vazios (fallback)

### Admin (AdminSystemSettings.tsx)

- [ ] Verificar campo phone_primary
- [ ] Verificar campo phone_whatsapp
- [ ] Verificar campos de redes sociais
- [ ] Adicionar campos faltantes
- [ ] Testar salvamento

### Banco de Dados

- [ ] Verificar se migration tem phone_primary
- [ ] Verificar se migration tem phone_whatsapp
- [ ] Verificar se migration tem redes sociais
- [ ] Inserir dados de exemplo

---

## 🧪 Como Testar

### 1. Verificar Dados no Banco

```sql
SELECT key, value
FROM system_settings
WHERE key IN (
  'contact_email',
  'phone_primary',
  'phone_whatsapp',
  'facebook_url',
  'instagram_url'
);
```

### 2. Testar no Admin

```
1. Acessar /admin/configuracoes
2. Procurar campos de contato
3. Preencher phone_primary
4. Salvar
5. Verificar se salvou no banco
```

### 3. Testar no Rodapé

```
1. Acessar qualquer página pública
2. Rolar até o rodapé
3. Verificar se telefone aparece
4. Clicar no telefone (deve abrir discador)
5. Verificar se email aparece
6. Clicar no email (deve abrir cliente de email)
```

---

## 💡 Recomendações

### Dados Essenciais (Devem Estar no Admin)

```
✅ contact_email
✅ phone_primary
✅ company_name
✅ company_address
```

### Dados Opcionais (Bom Ter)

```
⭐ phone_whatsapp
⭐ facebook_url
⭐ instagram_url
⭐ twitter_url
⭐ youtube_url
```

### Dados Avançados (Futuro)

```
🔮 business_hours (horário de atendimento)
🔮 support_email (email de suporte)
🔮 cnpj (CNPJ da empresa)
🔮 legal_name (razão social)
```

---

## 📊 Impacto

### Antes (Hardcoded)

```
❌ Telefone fixo no código
❌ Precisa alterar código para mudar
❌ Não usa dados do banco
❌ Admin não pode gerenciar
```

### Depois (Dinâmico)

```
✅ Telefone vem do banco
✅ Admin pode alterar via interface
✅ Usa dados reais
✅ Fallback para valor padrão
```

---

## 🎯 Próximos Passos

1. Corrigir telefone no rodapé (5 min)
2. Verificar interface admin (15 min)
3. Testar com dados reais (10 min)
4. Adicionar WhatsApp (opcional, 10 min)
5. Adicionar redes sociais (opcional, 15 min)

**Tempo Total:** 30-55 minutos

---

## ✅ Conclusão

O rodapé está **parcialmente** usando dados reais:

- ✅ Email: funcionando
- ❌ Telefone: hardcoded

**Correção:** Simples, apenas usar `settings?.phone_primary` no lugar do valor fixo.

**Benefício:** Admin poderá gerenciar telefone via interface sem precisar alterar código.

---

**Última atualização:** 24/02/2026  
**Próxima ação:** Implementar correção
