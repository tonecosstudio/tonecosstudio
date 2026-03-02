-- Migration: Criar triggers para auditoria automática
-- Feature: pricing-system-restructure
-- Requisitos: 9.2, 9.3
-- Descrição: Cria triggers para registrar mudanças automaticamente

-- Função trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para purchase_modes
DROP TRIGGER IF EXISTS update_purchase_modes_updated_at ON purchase_modes;
CREATE TRIGGER update_purchase_modes_updated_at
  BEFORE UPDATE ON purchase_modes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função trigger para auditoria de mudanças em purchase_modes
CREATE OR REPLACE FUNCTION audit_purchase_mode_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar mudança de price_multiplier
  IF OLD.price_multiplier IS DISTINCT FROM NEW.price_multiplier THEN
    INSERT INTO purchase_mode_history (
      mode_key, field_name, old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.mode_key, 'price_multiplier', 
      OLD.price_multiplier::TEXT, NEW.price_multiplier::TEXT,
      auth.uid(), NOW()
    );
  END IF;
  
  -- Registrar mudança de collections_count
  IF OLD.collections_count IS DISTINCT FROM NEW.collections_count THEN
    INSERT INTO purchase_mode_history (
      mode_key, field_name, old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.mode_key, 'collections_count',
      OLD.collections_count::TEXT, NEW.collections_count::TEXT,
      auth.uid(), NOW()
    );
  END IF;
  
  -- Registrar mudança de deliveries_total
  IF OLD.deliveries_total IS DISTINCT FROM NEW.deliveries_total THEN
    INSERT INTO purchase_mode_history (
      mode_key, field_name, old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.mode_key, 'deliveries_total',
      OLD.deliveries_total::TEXT, NEW.deliveries_total::TEXT,
      auth.uid(), NOW()
    );
  END IF;
  
  -- Registrar mudança de includes_bonus
  IF OLD.includes_bonus IS DISTINCT FROM NEW.includes_bonus THEN
    INSERT INTO purchase_mode_history (
      mode_key, field_name, old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.mode_key, 'includes_bonus',
      OLD.includes_bonus::TEXT, NEW.includes_bonus::TEXT,
      auth.uid(), NOW()
    );
  END IF;
  
  -- Registrar mudança de is_active
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    INSERT INTO purchase_mode_history (
      mode_key, field_name, old_value, new_value, changed_by, changed_at
    ) VALUES (
      NEW.mode_key, 'is_active',
      OLD.is_active::TEXT, NEW.is_active::TEXT,
      auth.uid(), NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auditoria de purchase_modes
DROP TRIGGER IF EXISTS audit_purchase_mode_changes_trigger ON purchase_modes;
CREATE TRIGGER audit_purchase_mode_changes_trigger
  AFTER UPDATE ON purchase_modes
  FOR EACH ROW
  EXECUTE FUNCTION audit_purchase_mode_changes();

-- Comentários
COMMENT ON FUNCTION update_updated_at_column IS 'Atualiza automaticamente a coluna updated_at';
COMMENT ON FUNCTION audit_purchase_mode_changes IS 'Registra automaticamente mudanças em purchase_modes no histórico';
