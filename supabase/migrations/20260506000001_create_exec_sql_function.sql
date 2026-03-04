-- Create exec_sql function for executing arbitrary SQL
-- This is a utility function for administrative tasks

CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- Grant execute permission to service_role only
REVOKE ALL ON FUNCTION exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

COMMENT ON FUNCTION exec_sql(text) IS 'Execute arbitrary SQL - restricted to service_role only';
