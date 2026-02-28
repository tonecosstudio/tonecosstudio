-- Seed file: Brazilian holidays for 2026-2027
-- Task: 3.2 Seed initial holiday data
-- Requirements: 1.6, 24.2, 24.3
-- Timezone: America/Bahia (UTC-3)

-- This seed file populates the holidays table with Brazilian national holidays
-- and Bahia state holidays for 2026-2027 to support business day calculations.

-- ============================================================================
-- 2026 HOLIDAYS
-- ============================================================================

-- Fixed National Holidays 2026
INSERT INTO holidays (holiday_date, name, description, type, state_code, is_recurring) VALUES
  ('2026-01-01', 'Ano Novo', 'New Year''s Day', 'national', NULL, true),
  ('2026-04-21', 'Tiradentes', 'Tiradentes Day', 'national', NULL, true),
  ('2026-05-01', 'Dia do Trabalho', 'Labor Day', 'national', NULL, true),
  ('2026-09-07', 'Independência do Brasil', 'Independence Day', 'national', NULL, true),
  ('2026-10-12', 'Nossa Senhora Aparecida', 'Nossa Senhora Aparecida', 'national', NULL, true),
  ('2026-11-02', 'Finados', 'All Souls'' Day', 'national', NULL, true),
  ('2026-11-15', 'Proclamação da República', 'Republic Day', 'national', NULL, true),
  ('2026-12-25', 'Natal', 'Christmas', 'national', NULL, true)
ON CONFLICT (holiday_date, type, state_code) DO NOTHING;

-- Variable National Holidays 2026
-- Carnival: 47 days before Easter (February 16-17, 2026)
-- Good Friday: Friday before Easter (April 3, 2026)
-- Corpus Christi: 60 days after Easter (June 4, 2026)
INSERT INTO holidays (holiday_date, name, description, type, state_code, is_recurring) VALUES
  ('2026-02-16', 'Carnaval', 'Carnival Monday', 'national', NULL, false),
  ('2026-02-17', 'Carnaval', 'Carnival Tuesday', 'national', NULL, false),
  ('2026-04-03', 'Sexta-Feira Santa', 'Good Friday', 'national', NULL, false),
  ('2026-06-04', 'Corpus Christi', 'Corpus Christi', 'national', NULL, false)
ON CONFLICT (holiday_date, type, state_code) DO NOTHING;

-- Bahia State Holiday 2026
INSERT INTO holidays (holiday_date, name, description, type, state_code, is_recurring) VALUES
  ('2026-07-02', 'Independência da Bahia', 'Independence of Bahia', 'state', 'BA', true)
ON CONFLICT (holiday_date, type, state_code) DO NOTHING;

-- ============================================================================
-- 2027 HOLIDAYS
-- ============================================================================

-- Fixed National Holidays 2027
INSERT INTO holidays (holiday_date, name, description, type, state_code, is_recurring) VALUES
  ('2027-01-01', 'Ano Novo', 'New Year''s Day', 'national', NULL, true),
  ('2027-04-21', 'Tiradentes', 'Tiradentes Day', 'national', NULL, true),
  ('2027-05-01', 'Dia do Trabalho', 'Labor Day', 'national', NULL, true),
  ('2027-09-07', 'Independência do Brasil', 'Independence Day', 'national', NULL, true),
  ('2027-10-12', 'Nossa Senhora Aparecida', 'Nossa Senhora Aparecida', 'national', NULL, true),
  ('2027-11-02', 'Finados', 'All Souls'' Day', 'national', NULL, true),
  ('2027-11-15', 'Proclamação da República', 'Republic Day', 'national', NULL, true),
  ('2027-12-25', 'Natal', 'Christmas', 'national', NULL, true)
ON CONFLICT (holiday_date, type, state_code) DO NOTHING;

-- Variable National Holidays 2027
-- Carnival: 47 days before Easter (February 8-9, 2027)
-- Good Friday: Friday before Easter (March 26, 2027)
-- Corpus Christi: 60 days after Easter (May 27, 2027)
INSERT INTO holidays (holiday_date, name, description, type, state_code, is_recurring) VALUES
  ('2027-02-08', 'Carnaval', 'Carnival Monday', 'national', NULL, false),
  ('2027-02-09', 'Carnaval', 'Carnival Tuesday', 'national', NULL, false),
  ('2027-03-26', 'Sexta-Feira Santa', 'Good Friday', 'national', NULL, false),
  ('2027-05-27', 'Corpus Christi', 'Corpus Christi', 'national', NULL, false)
ON CONFLICT (holiday_date, type, state_code) DO NOTHING;

-- Bahia State Holiday 2027
INSERT INTO holidays (holiday_date, name, description, type, state_code, is_recurring) VALUES
  ('2027-07-02', 'Independência da Bahia', 'Independence of Bahia', 'state', 'BA', true)
ON CONFLICT (holiday_date, type, state_code) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Uncomment to verify the seeded data:
-- SELECT 
--   holiday_date,
--   name,
--   type,
--   state_code,
--   is_recurring
-- FROM holidays
-- WHERE EXTRACT(YEAR FROM holiday_date) IN (2026, 2027)
-- ORDER BY holiday_date;
