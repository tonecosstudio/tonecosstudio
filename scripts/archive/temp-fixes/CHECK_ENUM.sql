-- Check current values in user_notification_type ENUM
SELECT 
    e.enumlabel as enum_value
FROM 
    pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE 
    t.typname = 'user_notification_type'
ORDER BY 
    e.enumsortorder;
