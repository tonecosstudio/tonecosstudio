-- =====================================================
-- SEED DATA - Payment Methods
-- =====================================================
-- Este script insere métodos de pagamento padrão
-- Execute no SQL Editor do Supabase Dashboard

-- =====================================================
-- LIMPAR DADOS EXISTENTES (OPCIONAL)
-- =====================================================

-- CUIDADO: Descomente apenas se quiser remover métodos existentes
-- DELETE FROM admin_payment_methods;

-- =====================================================
-- INSERIR MÉTODOS DE PAGAMENTO PADRÃO
-- =====================================================

-- Método 1: PIX (Padrão)
INSERT INTO admin_payment_methods (
    name, 
    type, 
    instructions, 
    pix_key, 
    is_active, 
    is_default, 
    display_order
)
VALUES (
    'PIX',
    'pix',
    'Faça o pagamento via PIX usando a chave abaixo. Após realizar o pagamento, envie o comprovante nesta página.

**Chave PIX:** contato@ordax.com.br
**Tipo:** Email
**Favorecido:** Ordax Colecionáveis LTDA

**Importante:**
- O pagamento é processado instantaneamente
- Envie o comprovante logo após o pagamento
- Seu pedido será aprovado em até 24 horas úteis',
    'contato@ordax.com.br',
    true,
    true,
    1
)
ON CONFLICT (name) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    pix_key = EXCLUDED.pix_key,
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    display_order = EXCLUDED.display_order,
    updated_at = now();

-- Método 2: Transferência Bancária
INSERT INTO admin_payment_methods (
    name, 
    type, 
    instructions, 
    account_details,
    is_active, 
    is_default, 
    display_order
)
VALUES (
    'Transferência Bancária',
    'bank_transfer',
    'Faça uma transferência bancária para a conta abaixo e envie o comprovante.

**Dados Bancários:**
- Banco: Banco do Brasil (001)
- Agência: 1234-5
- Conta Corrente: 12345-6
- CNPJ: 12.345.678/0001-90
- Favorecido: Ordax Colecionáveis LTDA

**Importante:**
- Transferências podem levar até 1 dia útil para compensar
- Envie o comprovante após realizar a transferência
- Seu pedido será aprovado após a compensação bancária',
    jsonb_build_object(
        'banco', 'Banco do Brasil',
        'codigo_banco', '001',
        'agencia', '1234-5',
        'conta', '12345-6',
        'tipo_conta', 'Corrente',
        'cnpj', '12.345.678/0001-90',
        'favorecido', 'Ordax Colecionáveis LTDA'
    ),
    true,
    false,
    2
)
ON CONFLICT (name) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    account_details = EXCLUDED.account_details,
    is_active = EXCLUDED.is_active,
    is_default = EXCLUDED.is_default,
    display_order = EXCLUDED.display_order,
    updated_at = now();

-- Método 3: PagSeguro (Desativado por padrão - ativar quando configurado)
INSERT INTO admin_payment_methods (
    name, 
    type, 
    instructions, 
    payment_link,
    is_active, 
    is_default, 
    display_order
)
VALUES (
    'PagSeguro',
    'pagseguro',
    'Clique no link abaixo para ser redirecionado ao PagSeguro e realizar o pagamento.

Após o pagamento, o comprovante será gerado automaticamente pelo PagSeguro.

**Importante:**
- Você será redirecionado para o site do PagSeguro
- Aceita cartão de crédito, débito e boleto
- Aprovação automática após confirmação do pagamento',
    'https://pagseguro.uol.com.br/checkout/YOUR_CHECKOUT_CODE',
    false,  -- Desativado até configurar o link real
    false,
    3
)
ON CONFLICT (name) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    payment_link = EXCLUDED.payment_link,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order,
    updated_at = now();

-- Método 4: PicPay (Desativado por padrão - ativar quando configurado)
INSERT INTO admin_payment_methods (
    name, 
    type, 
    instructions, 
    payment_link,
    is_active, 
    is_default, 
    display_order
)
VALUES (
    'PicPay',
    'picpay',
    'Clique no link abaixo para pagar via PicPay.

Após o pagamento, envie o comprovante gerado pelo aplicativo.

**Importante:**
- Pagamento instantâneo via aplicativo PicPay
- Envie o comprovante após o pagamento
- Aprovação em até 24 horas úteis',
    'https://picpay.me/ordax',
    false,  -- Desativado até configurar o link real
    false,
    4
)
ON CONFLICT (name) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    payment_link = EXCLUDED.payment_link,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order,
    updated_at = now();

-- Método 5: PayPal (Desativado por padrão - ativar quando configurado)
INSERT INTO admin_payment_methods (
    name, 
    type, 
    instructions, 
    payment_link,
    account_details,
    is_active, 
    is_default, 
    display_order
)
VALUES (
    'PayPal',
    'paypal',
    'Envie o pagamento via PayPal para o email abaixo ou use o link de pagamento.

Após o pagamento, envie o comprovante gerado pelo PayPal.

**Email PayPal:** pagamentos@ordax.com.br

**Importante:**
- Aceita pagamentos internacionais
- Taxas de conversão podem ser aplicadas
- Envie o comprovante após o pagamento
- Aprovação em até 48 horas úteis',
    'https://paypal.me/ordax',
    jsonb_build_object(
        'email', 'pagamentos@ordax.com.br',
        'tipo', 'business'
    ),
    false,  -- Desativado até configurar
    false,
    5
)
ON CONFLICT (name) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    payment_link = EXCLUDED.payment_link,
    account_details = EXCLUDED.account_details,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order,
    updated_at = now();

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar métodos inseridos
SELECT 
    id,
    name,
    type,
    is_active,
    is_default,
    display_order,
    CASE 
        WHEN is_active THEN '✓ Ativo'
        ELSE '✗ Inativo'
    END as status,
    CASE 
        WHEN is_default THEN '★ Padrão'
        ELSE ''
    END as default_flag,
    created_at
FROM admin_payment_methods
ORDER BY display_order;

-- Contar métodos ativos
SELECT 
    COUNT(*) as total_methods,
    COUNT(*) FILTER (WHERE is_active = true) as active_methods,
    COUNT(*) FILTER (WHERE is_default = true) as default_methods,
    CASE 
        WHEN COUNT(*) FILTER (WHERE is_default = true) = 1 THEN 'OK: Exatamente 1 método padrão'
        WHEN COUNT(*) FILTER (WHERE is_default = true) = 0 THEN 'AVISO: Nenhum método padrão definido'
        ELSE 'ERRO: Mais de 1 método padrão!'
    END as default_status
FROM admin_payment_methods;

-- Verificar se PIX é o padrão
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM admin_payment_methods 
            WHERE name = 'PIX' AND is_default = true AND is_active = true
        ) THEN 'OK: PIX é o método padrão e está ativo'
        ELSE 'AVISO: PIX não é o método padrão ou não está ativo'
    END as pix_status;

-- =====================================================
-- CUSTOMIZAÇÃO
-- =====================================================

-- Para customizar os métodos de pagamento:

-- 1. Atualizar instruções:
-- UPDATE admin_payment_methods 
-- SET instructions = 'Suas novas instruções aqui'
-- WHERE name = 'PIX';

-- 2. Atualizar chave PIX:
-- UPDATE admin_payment_methods 
-- SET pix_key = 'nova.chave@email.com'
-- WHERE name = 'PIX';

-- 3. Ativar/desativar método:
-- UPDATE admin_payment_methods 
-- SET is_active = true
-- WHERE name = 'PagSeguro';

-- 4. Definir como padrão:
-- UPDATE admin_payment_methods 
-- SET is_default = false;  -- Remove padrão de todos
-- UPDATE admin_payment_methods 
-- SET is_default = true
-- WHERE name = 'PIX';  -- Define PIX como padrão

-- 5. Atualizar link de pagamento:
-- UPDATE admin_payment_methods 
-- SET payment_link = 'https://seu-link-aqui.com'
-- WHERE name = 'PagSeguro';

-- 6. Reordenar métodos:
-- UPDATE admin_payment_methods SET display_order = 1 WHERE name = 'PIX';
-- UPDATE admin_payment_methods SET display_order = 2 WHERE name = 'Transferência Bancária';
-- UPDATE admin_payment_methods SET display_order = 3 WHERE name = 'PagSeguro';

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

-- 1. Sempre mantenha pelo menos um método ativo
-- 2. Sempre mantenha exatamente um método como padrão
-- 3. Atualize as instruções com informações reais antes de ativar
-- 4. Teste cada método antes de ativá-lo para clientes
-- 5. Links de pagamento devem ser válidos e testados
-- 6. Chaves PIX devem ser verificadas e ativas

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- Se nenhum método aparecer para clientes:
-- 1. Verifique se pelo menos um método está ativo (is_active = true)
-- 2. Verifique as políticas RLS da tabela admin_payment_methods
-- 3. Verifique se o usuário está autenticado

-- Para ver logs de acesso:
-- SELECT * FROM admin_payment_methods WHERE is_active = true ORDER BY display_order;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
