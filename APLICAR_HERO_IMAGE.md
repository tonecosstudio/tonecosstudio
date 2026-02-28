# Aplicar Migration: Hero Image URL

## ✅ O QUE FOI FEITO

1. **Campo de upload adicionado no Admin**
   - Acesse: Admin > Configurações do Sistema > Tab "Interface"
   - Novo campo: "Imagem do Hero (Página Coleções)"
   - Com preview da imagem atual

2. **Página Collections atualizada**
   - Hero section já configurada para usar `systemSettings?.hero_image_url`
   - Fallback para `/images/hero-warrior.png` se não houver URL configurada

3. **Migration SQL criada**
   - Arquivo: `supabase/migrations/20260228000001_add_hero_image_setting.sql`

## 🔧 APLICAR MIGRATION NO SUPABASE

### Passo 1: Acessar SQL Editor

1. Acesse: https://pabxpvqwtvbjaunjejud.supabase.co
2. Faça login
3. Vá para: **SQL Editor** (menu lateral esquerdo)

### Passo 2: Executar SQL

Cole e execute o seguinte SQL:

```sql
-- Add hero_image_url to system_settings
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Add comment
COMMENT ON COLUMN system_settings.hero_image_url IS 'URL da imagem do hero (guerreiro) na página de coleções';
```

### Passo 3: Verificar

Execute para verificar se a coluna foi criada:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'system_settings' 
AND column_name = 'hero_image_url';
```

## 📸 CONFIGURAR IMAGEM DO HERO

### Opção 1: Usar URL Externa

1. Acesse: **Admin > Configurações do Sistema**
2. Vá para a tab **"Interface"**
3. No campo **"Imagem do Hero (Página Coleções)"**, cole a URL da imagem
4. Clique em **"Salvar Alterações"**

### Opção 2: Upload para Supabase Storage (Recomendado)

1. Acesse: **Storage** no Supabase Dashboard
2. Crie um bucket público chamado `images` (se não existir)
3. Faça upload da imagem do guerreiro
4. Copie a URL pública da imagem
5. Cole no campo de configuração no Admin

## 📐 ESPECIFICAÇÕES DA IMAGEM

- **Proporção**: 3:4 ou 2:3 (vertical/retrato)
- **Exemplos de dimensões**:
  - 600x800px
  - 700x900px
  - 750x1000px
- **Formato**: PNG ou JPG
- **Tamanho**: Máximo 5MB
- **Fundo**: Transparente (PNG) ou que combine com o hero

## 🎨 COMO FICARÁ

A imagem aparecerá na página de Coleções:
- **Desktop**: Lado direito do hero, ocupando ~40% da largura
- **Mobile**: Oculta (apenas texto)
- **Efeito**: Drop shadow para destaque
- **Fallback**: Se a imagem não carregar, fica oculta (sem quebrar o layout)

## ✅ CHECKLIST

- [ ] Migration aplicada no Supabase
- [ ] Coluna `hero_image_url` criada na tabela `system_settings`
- [ ] Imagem do guerreiro preparada (proporção 3:4 ou 2:3)
- [ ] URL da imagem configurada no Admin
- [ ] Página de Coleções testada (desktop e mobile)
- [ ] Preview da imagem funcionando no Admin

## 🔍 TESTAR

1. Acesse: http://localhost:5173/colecoes
2. Verifique se a imagem do guerreiro aparece no hero (desktop)
3. Teste o fallback: remova a URL e veja se não quebra o layout
4. Teste responsividade: mobile deve ocultar a imagem

## 📝 NOTAS

- A imagem é opcional (fallback funciona)
- O campo aceita qualquer URL válida
- Preview no Admin mostra a imagem atual
- Se a imagem não carregar, fica oculta automaticamente
