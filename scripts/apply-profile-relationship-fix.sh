#!/bin/bash

# Script to apply profile relationship fixes to Supabase database
# This fixes the foreign key relationships so Supabase can properly join with profiles

echo "🔧 Applying profile relationship fixes..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "Please install it first: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory"
    echo "Please run this script from the project root"
    exit 1
fi

echo "📋 Migrations to apply:"
echo "  1. 20260421000000_fix_standalone_purchases_profile_relationship.sql"
echo "  2. 20260421000001_fix_manual_payments_profile_relationship.sql"
echo ""

# Apply migrations
echo "🚀 Applying migrations..."
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations applied successfully!"
    echo ""
    echo "📝 Changes made:"
    echo "  • standalone_purchases.user_id now references profiles(id)"
    echo "  • manual_payments.user_id now references profiles(id)"
    echo ""
    echo "🔄 Please refresh your browser to see the changes"
else
    echo ""
    echo "❌ Migration failed"
    echo "Please check the error messages above"
    exit 1
fi
