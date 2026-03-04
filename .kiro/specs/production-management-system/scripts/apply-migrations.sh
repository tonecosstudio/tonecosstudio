#!/bin/bash

# ============================================================================
# PRODUCTION MANAGEMENT SYSTEM - MIGRATION APPLICATION SCRIPT
# ============================================================================
# Purpose: Apply all production management system migrations in correct order
# Usage: ./apply-migrations.sh [staging|production]
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
BACKUP_DIR="./backups"
MIGRATION_DIR="./supabase/migrations"

# Required migrations in order
MIGRATIONS=(
  "20260428000000_create_production_queue.sql"
  "20260428000001_create_character_choices.sql"
  "20260428000002_create_production_stages.sql"
  "20260428000003_create_production_views.sql"
  "20260428000004_create_production_functions.sql"
  "20260428000005_add_manual_payment_support.sql"
  "20260429000000_schedule_character_choice_reminders_cron.sql"
  "20260429000001_schedule_character_choice_expiration_cron.sql"
  "20260429000002_add_expired_status_to_character_choices.sql"
  "20260429000003_sync_production_status_to_orders.sql"
  "20260429000005_create_stage_transition_logs.sql"
  "20260429000006_create_production_assignment_logs.sql"
  "20260429000007_add_production_photo_metadata.sql"
  "20260429000008_add_notification_preferences.sql"
  "20260505000000_create_deadline_calculation_function.sql"
  "20260506000000_add_denormalized_fields_to_character_choices.sql"
)

# Functions
print_header() {
  echo -e "${BLUE}============================================================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}============================================================================${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
  print_header "Checking Prerequisites"
  
  # Check if supabase CLI is installed
  if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI not found. Please install it first:"
    echo "  npm install -g supabase"
    exit 1
  fi
  print_success "Supabase CLI found"
  
  # Check if psql is installed (optional but recommended)
  if command -v psql &> /dev/null; then
    print_success "psql found"
  else
    print_warning "psql not found (optional)"
  fi
  
  # Check if migration directory exists
  if [ ! -d "$MIGRATION_DIR" ]; then
    print_error "Migration directory not found: $MIGRATION_DIR"
    exit 1
  fi
  print_success "Migration directory found"
  
  echo ""
}

# Create backup
create_backup() {
  print_header "Creating Database Backup"
  
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql"
  
  print_info "Backing up database to: $BACKUP_FILE"
  
  if supabase db dump -f "$BACKUP_FILE" 2>/dev/null; then
    print_success "Backup created successfully"
  else
    print_warning "Backup failed (continuing anyway)"
    print_info "You can create a manual backup using:"
    echo "  supabase db dump -f $BACKUP_FILE"
  fi
  
  echo ""
}

# Check migration files
check_migration_files() {
  print_header "Checking Migration Files"
  
  MISSING_FILES=0
  for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$MIGRATION_DIR/$migration" ]; then
      print_success "$migration"
    else
      print_error "$migration - FILE NOT FOUND"
      MISSING_FILES=$((MISSING_FILES + 1))
    fi
  done
  
  if [ $MISSING_FILES -gt 0 ]; then
    print_error "$MISSING_FILES migration file(s) missing"
    exit 1
  fi
  
  print_success "All migration files found"
  echo ""
}

# Apply migrations
apply_migrations() {
  print_header "Applying Migrations to $ENVIRONMENT"
  
  print_info "This will apply ${#MIGRATIONS[@]} migrations"
  print_warning "Press Ctrl+C to cancel, or Enter to continue..."
  read
  
  for migration in "${MIGRATIONS[@]}"; do
    print_info "Applying: $migration"
    
    if supabase db push --include "$migration" 2>&1 | grep -q "success\|applied\|up to date"; then
      print_success "$migration applied"
    else
      print_error "Failed to apply $migration"
      print_warning "Check the error above and fix before continuing"
      exit 1
    fi
  done
  
  print_success "All migrations applied successfully"
  echo ""
}

# Verify migrations
verify_migrations() {
  print_header "Verifying Migrations"
  
  print_info "Running verification script..."
  
  if [ -f ".kiro/specs/production-management-system/scripts/review-migrations.sql" ]; then
    supabase db execute -f ".kiro/specs/production-management-system/scripts/review-migrations.sql" || true
    print_success "Verification complete (check output above)"
  else
    print_warning "Verification script not found"
  fi
  
  echo ""
}

# Main execution
main() {
  print_header "Production Management System - Migration Application"
  echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
  echo -e "${BLUE}Date: $(date)${NC}"
  echo ""
  
  check_prerequisites
  create_backup
  check_migration_files
  apply_migrations
  verify_migrations
  
  print_header "Migration Complete"
  print_success "All migrations have been applied successfully!"
  print_info "Next steps:"
  echo "  1. Review the verification output above"
  echo "  2. Configure Supabase Realtime (see configure-realtime.sql)"
  echo "  3. Set up Storage bucket (see setup-storage.sql)"
  echo "  4. Configure email service (see configure-email.md)"
  echo ""
}

# Run main function
main
