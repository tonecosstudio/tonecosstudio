-- Add hero_image_url to system_settings
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Add comment
COMMENT ON COLUMN system_settings.hero_image_url IS 'URL da imagem do hero (guerreiro) na página de coleções';
