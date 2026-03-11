-- Create security_incidents table for logging malware detections and other security events
-- Requirements: 14.4

CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES manual_payments(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX idx_security_incidents_user_id ON security_incidents(user_id);
CREATE INDEX idx_security_incidents_payment_id ON security_incidents(payment_id);
CREATE INDEX idx_security_incidents_type ON security_incidents(incident_type);
CREATE INDEX idx_security_incidents_created_at ON security_incidents(created_at DESC);

-- Add RLS policies
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

-- Only admins can view security incidents
CREATE POLICY "Admins can view all security incidents"
  ON security_incidents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::app_role
    )
  );

-- System can insert security incidents (no user restriction)
CREATE POLICY "System can insert security incidents"
  ON security_incidents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE security_incidents IS 'Logs security incidents such as malware detections, suspicious activities, etc.';
COMMENT ON COLUMN security_incidents.incident_type IS 'Type of security incident (e.g., MALWARE_DETECTED, SUSPICIOUS_ACTIVITY)';
COMMENT ON COLUMN security_incidents.details IS 'Additional details about the incident (threats, scanner info, etc.)';

