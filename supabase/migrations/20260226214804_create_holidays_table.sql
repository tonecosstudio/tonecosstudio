-- Migration: Create holidays table for ORDAX Complete System
-- Task: 1.6 Create holidays table migration
-- Requirements: 1.6, 24.1, 24.2, 24.3, 29.7

-- Create holiday_type enum if not exists
DO $$ BEGIN
  CREATE TYPE holiday_type AS ENUM ('national', 'state');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL,
  name text NOT NULL,
  description text,
  type holiday_type NOT NULL,
  state_code text,
  is_recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT state_code_check CHECK (
    (type = 'national' AND state_code IS NULL) OR
    (type = 'state' AND state_code IS NOT NULL)
  ),
  UNIQUE(holiday_date, type, state_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_holidays_holiday_date ON holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type);
CREATE INDEX IF NOT EXISTS idx_holidays_year ON holidays(EXTRACT(YEAR FROM holiday_date));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_holidays_updated_at ON holidays;
CREATE TRIGGER update_holidays_updated_at
  BEFORE UPDATE ON holidays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed Brazilian national holidays (2026-2027) - only if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM holidays LIMIT 1) THEN
    -- Fixed national holidays for 2026
    INSERT INTO holidays (holiday_date, name, type, is_recurring) VALUES
      ('2026-01-01', 'Ano Novo', 'national', true),
      ('2026-04-21', 'Tiradentes', 'national', true),
      ('2026-05-01', 'Dia do Trabalho', 'national', true),
      ('2026-09-07', 'IndependÃƒÂªncia do Brasil', 'national', true),
      ('2026-10-12', 'Nossa Senhora Aparecida', 'national', true),
      ('2026-11-02', 'Finados', 'national', true),
      ('2026-11-15', 'ProclamaÃƒÂ§ÃƒÂ£o da RepÃƒÂºblica', 'national', true),
      ('2026-12-25', 'Natal', 'national', true);

    -- Variable national holidays for 2026
    INSERT INTO holidays (holiday_date, name, type, is_recurring) VALUES
      ('2026-02-16', 'Carnaval', 'national', false),
      ('2026-02-17', 'Carnaval', 'national', false),
      ('2026-04-03', 'Sexta-Feira Santa', 'national', false),
      ('2026-06-04', 'Corpus Christi', 'national', false);

    -- Fixed national holidays for 2027
    INSERT INTO holidays (holiday_date, name, type, is_recurring) VALUES
      ('2027-01-01', 'Ano Novo', 'national', true),
      ('2027-04-21', 'Tiradentes', 'national', true),
      ('2027-05-01', 'Dia do Trabalho', 'national', true),
      ('2027-09-07', 'IndependÃƒÂªncia do Brasil', 'national', true),
      ('2027-10-12', 'Nossa Senhora Aparecida', 'national', true),
      ('2027-11-02', 'Finados', 'national', true),
      ('2027-11-15', 'ProclamaÃƒÂ§ÃƒÂ£o da RepÃƒÂºblica', 'national', true),
      ('2027-12-25', 'Natal', 'national', true);

    -- Variable holidays for 2027
    INSERT INTO holidays (holiday_date, name, type, is_recurring) VALUES
      ('2027-02-08', 'Carnaval', 'national', false),
      ('2027-02-09', 'Carnaval', 'national', false),
      ('2027-03-26', 'Sexta-Feira Santa', 'national', false),
      ('2027-05-27', 'Corpus Christi', 'national', false);

    -- Bahia state holidays
    INSERT INTO holidays (holiday_date, name, type, state_code, is_recurring) VALUES
      ('2026-07-02', 'IndependÃƒÂªncia da Bahia', 'state', 'BA', true),
      ('2027-07-02', 'IndependÃƒÂªncia da Bahia', 'state', 'BA', true);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to holidays" ON holidays;
DROP POLICY IF EXISTS "Allow admin write access to holidays" ON holidays;

-- Allow read access to all
CREATE POLICY "Allow public read access to holidays" ON holidays
  FOR SELECT USING (true);

-- Allow admin write access
CREATE POLICY "Allow admin write access to holidays" ON holidays
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Add comments
COMMENT ON TABLE holidays IS 'Brazilian national and Bahia state holidays for business day calculations';
COMMENT ON COLUMN holidays.type IS 'Type of holiday: national or state';
COMMENT ON COLUMN holidays.state_code IS 'State code (BA for Bahia) for state holidays';
