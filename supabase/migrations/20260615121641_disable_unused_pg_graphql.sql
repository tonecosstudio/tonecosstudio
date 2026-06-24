BEGIN;

-- The application has no GraphQL consumers. Keep the production API surface
-- aligned with Supabase's security-first default for new projects.
DROP EXTENSION IF EXISTS pg_graphql;

NOTIFY pgrst, 'reload schema';

COMMIT;
