-- Browser roles have SELECT-only access to system_settings.
-- Administrative writes are routed through service-role-backed RPCs, so this
-- legacy FOR ALL policy only duplicated SELECT evaluation.

DROP POLICY IF EXISTS system_settings_modify_admin
  ON public.system_settings;
