-- =====================================================
-- FIX: Add payment notification types to enum
-- Date: 2026-03-02
-- Description: Adicionar tipos de notificação para pagamentos manuais
--              com verificação de existência
-- =====================================================

-- Função helper para adicionar valor ao ENUM apenas se não existir
DO $$
BEGIN
    -- Adicionar payment_info_request se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'payment_info_request' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_notification_type')
    ) THEN
        ALTER TYPE user_notification_type ADD VALUE 'payment_info_request';
    END IF;

    -- Adicionar payment_approved se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'payment_approved' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_notification_type')
    ) THEN
        ALTER TYPE user_notification_type ADD VALUE 'payment_approved';
    END IF;

    -- Adicionar payment_rejected se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'payment_rejected' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_notification_type')
    ) THEN
        ALTER TYPE user_notification_type ADD VALUE 'payment_rejected';
    END IF;
END$$;

-- Verificar os valores atuais do ENUM
SELECT 
    'user_notification_type values:' as info,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as current_values
FROM 
    pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE 
    t.typname = 'user_notification_type';
