-- Production photo metadata writes are server-authoritative through the
-- validated admin RPC boundary. Keep authenticated SELECT governed by RLS,
-- but remove direct browser DML that can bypass URL/caption validation.

REVOKE INSERT, UPDATE, DELETE
ON TABLE public.production_photo_metadata
FROM authenticated;
