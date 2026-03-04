-- =====================================================
-- MIGRATION: Add payment notification types to enum
-- Date: 2026-03-02
-- Description: Adicionar tipos de notificaÃƒÂ§ÃƒÂ£o para pagamentos manuais
-- =====================================================

-- Adicionar novos valores ao ENUM user_notification_type
ALTER TYPE user_notification_type ADD VALUE IF NOT EXISTS 'payment_info_request';
ALTER TYPE user_notification_type ADD VALUE IF NOT EXISTS 'payment_approved';
ALTER TYPE user_notification_type ADD VALUE IF NOT EXISTS 'payment_rejected';
