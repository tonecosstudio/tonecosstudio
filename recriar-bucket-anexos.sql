-- Verificar se o bucket existe
SELECT * FROM storage.buckets WHERE id = 'support-attachments';

-- Se não existir, criar
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments', 
  'support-attachments', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

-- Verificar novamente
SELECT * FROM storage.buckets WHERE id = 'support-attachments';
