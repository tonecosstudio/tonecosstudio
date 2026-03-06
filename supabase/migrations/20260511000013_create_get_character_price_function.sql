-- Migration: Create get_character_price function
-- Description: Calculates character price with optional price_multiplier (RN008)
-- Spec: contextual-pricing-system
-- Task: 3.2

CREATE OR REPLACE FUNCTION get_character_price(
  p_character_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_collection_id UUID;
  v_collection_price INTEGER;
  v_character_multiplier DECIMAL(4,2);
  v_final_price INTEGER;
BEGIN
  -- 1. Buscar collection_id e price_multiplier do personagem
  SELECT collection_id, price_multiplier
  INTO v_collection_id, v_character_multiplier
  FROM collection_characters
  WHERE id = p_character_id;
  
  IF v_collection_id IS NULL THEN
    RAISE EXCEPTION 'Character not found: %', p_character_id;
  END IF;
  
  -- 2. Calcular preço da coleção usando função existente
  v_collection_price := get_collection_price(v_collection_id, p_user_id);
  
  -- 3. Aplicar multiplicador do personagem (usa 1.0 se NULL)
  v_character_multiplier := COALESCE(v_character_multiplier, 1.0);
  
  -- 4. Calcular preço final: collection_price × character_multiplier
  v_final_price := ROUND(v_collection_price * v_character_multiplier);
  
  RETURN v_final_price;
END;
$$;

COMMENT ON FUNCTION get_character_price IS 
  'Calculates character price in COINS with two-stage calculation: 1) Collection context price (get_collection_price), 2) Character multiplier (COALESCE(price_multiplier, 1.0)). Returns INTEGER coins.';

