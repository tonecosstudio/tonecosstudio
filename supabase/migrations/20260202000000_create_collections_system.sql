-- Sistema de ColeÃƒÂ§ÃƒÂµes TemÃƒÂ¡ticas
-- Permite criar coleÃƒÂ§ÃƒÂµes organizadas de modelos

-- Criar tabela de coleÃƒÂ§ÃƒÂµes
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de itens das coleÃƒÂ§ÃƒÂµes
CREATE TABLE IF NOT EXISTS collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, model_id)
);

-- ÃƒÂndices para performance
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_active);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_model_id ON collection_items(model_id);

-- RLS para collections (pÃƒÂºblico para leitura)
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ColeÃƒÂ§ÃƒÂµes ativas sÃƒÂ£o pÃƒÂºblicas"
  ON collections FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins podem ver todas as coleÃƒÂ§ÃƒÂµes"
  ON collections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem gerenciar coleÃƒÂ§ÃƒÂµes"
  ON collections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- RLS para collection_items
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Itens de coleÃƒÂ§ÃƒÂµes ativas sÃƒÂ£o pÃƒÂºblicos"
  ON collection_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_items.collection_id 
      AND collections.is_active = true
    )
  );

CREATE POLICY "Admins podem ver todos os itens"
  ON collection_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem gerenciar itens"
  ON collection_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collections_updated_at();
