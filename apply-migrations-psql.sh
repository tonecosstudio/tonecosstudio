#!/bin/bash

# Apply production migrations using psql
# This script applies the 5 production migrations in order

echo "Applying production migrations..."

# Get the database URL from .env
source .env 2>/dev/null || true

# If DATABASE_URL is not set, construct it from Supabase credentials
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not found in .env, please set it manually"
  exit 1
fi

# Apply each migration
for migration in \
  "supabase/migrations/20260428000000_create_production_queue.sql" \
  "supabase/migrations/20260428000001_create_character_choices.sql" \
  "supabase/migrations/20260428000002_create_production_stages.sql" \
  "supabase/migrations/20260428000003_create_production_views.sql" \
  "supabase/migrations/20260428000004_create_production_functions.sql"
do
  echo "Applying $migration..."
  psql "$DATABASE_URL" -f "$migration"
  
  if [ $? -ne 0 ]; then
    echo "Error applying $migration"
    exit 1
  fi
  
  echo "✅ Successfully applied $migration"
  echo ""
done

echo "✅ All production migrations applied successfully!"
