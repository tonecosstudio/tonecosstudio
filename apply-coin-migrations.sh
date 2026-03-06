#!/bin/bash

# ============================================================================
# Script: Apply Coin System Migrations to Supabase
# Description: Aplica migrations do sistema de coins no Supabase
# Author: System
# Date: 2026-05-12
# ============================================================================

set -e  # Exit on error

echo "🚀 Starting Coin System Migration..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${BLUE}📋 Migrations to apply:${NC}"
echo "  1. 20260512000000_create_coin_system.sql"
echo "  2. 20260512000001_create_coin_functions.sql"
echo "  3. 20260512000002_update_user_characters_for_coins.sql"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Create .env file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Load environment variables
source .env

# Check if required variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Missing required environment variables${NC}"
    echo "Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo -e "${YELLOW}⚠️  This will modify your Supabase database${NC}"
echo -e "${YELLOW}⚠️  Make sure you have a backup if needed${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}🔄 Applying migrations...${NC}"
echo ""

# Apply migrations using Supabase CLI
echo -e "${BLUE}📦 Migration 1/3: Creating coin system tables...${NC}"
supabase db push --db-url "$SUPABASE_URL" \
  --include-all \
  --file supabase/migrations/20260512000000_create_coin_system.sql

echo -e "${GREEN}✅ Coin system tables created${NC}"
echo ""

echo -e "${BLUE}📦 Migration 2/3: Creating coin functions...${NC}"
supabase db push --db-url "$SUPABASE_URL" \
  --include-all \
  --file supabase/migrations/20260512000001_create_coin_functions.sql

echo -e "${GREEN}✅ Coin functions created${NC}"
echo ""

echo -e "${BLUE}📦 Migration 3/3: Updating user_characters table...${NC}"
supabase db push --db-url "$SUPABASE_URL" \
  --include-all \
  --file supabase/migrations/20260512000002_update_user_characters_for_coins.sql

echo -e "${GREEN}✅ user_characters table updated${NC}"
echo ""

echo -e "${GREEN}🎉 All migrations applied successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "  ✅ user_coins table created"
echo "  ✅ coin_transactions table created"
echo "  ✅ coin_packages table created"
echo "  ✅ Initial coin packages inserted"
echo "  ✅ RLS policies configured"
echo "  ✅ Coin functions created:"
echo "     - add_coins_to_user()"
echo "     - debit_coins_from_user()"
echo "     - purchase_character_with_coins()"
echo "     - get_user_coin_balance()"
echo "     - validate_coin_balance()"
echo "     - admin_adjust_coins()"
echo "  ✅ user_characters updated for coin purchases"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "  1. Update frontend hooks to use real data (remove mocks)"
echo "  2. Integrate payment gateway (PIX/Stripe)"
echo "  3. Test coin purchase flow end-to-end"
echo "  4. Configure webhooks for payment confirmation"
echo ""
echo -e "${GREEN}✨ Coin system is ready to use!${NC}"
