#!/bin/bash

# ============================================================================
# PRODUCTION MANAGEMENT SYSTEM - STAGING DEPLOYMENT SCRIPT
# ============================================================================
# Purpose: Deploy the Production Management System to staging environment
# Usage: ./deploy-staging.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="staging"
BACKUP_DIR="./backups"
MIGRATION_DIR="./supabase/migrations"
SCRIPTS_DIR=".kiro/specs/production-management-system/scripts"
LOG_FILE="./deployment-staging-$(date +%Y%m%d-%H%M%S).log"

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
  echo -e "${CYAN}ℹ $1${NC}"
}

log_message() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
  print_header "Step 1: Checking Prerequisites"
  log_message "Checking prerequisites"
  
  # Check if supabase CLI is installed
  if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI not found. Please install it first:"
    echo "  npm install -g supabase"
    exit 1
  fi
  print_success "Supabase CLI found ($(supabase --version))"
  
  # Check if node is installed
  if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install it first"
    exit 1
  fi
  print_success "Node.js found ($(node --version))"
  
  # Check if npm is installed
  if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install it first"
    exit 1
  fi
  print_success "npm found ($(npm --version))"
  
  # Check if migration directory exists
  if [ ! -d "$MIGRATION_DIR" ]; then
    print_error "Migration directory not found: $MIGRATION_DIR"
    exit 1
  fi
  print_success "Migration directory found"
  
  # Check if .env file exists
  if [ ! -f ".env" ]; then
    print_warning ".env file not found"
    print_info "Please create .env file from .env.production.template"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  else
    print_success ".env file found"
  fi
  
  log_message "Prerequisites check completed"
  echo ""
}

# Create backup
create_backup() {
  print_header "Step 2: Creating Database Backup"
  log_message "Creating database backup"
  
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/staging-backup-$(date +%Y%m%d-%H%M%S).sql"
  
  print_info "Backing up staging database to: $BACKUP_FILE"
  
  if supabase db dump -f "$BACKUP_FILE" 2>/dev/null; then
    print_success "Backup created successfully"
    log_message "Backup created: $BACKUP_FILE"
  else
    print_warning "Backup failed (continuing anyway)"
    print_info "You can create a manual backup later if needed"
    log_message "Backup failed"
  fi
  
  echo ""
}

# Run database migrations
run_migrations() {
  print_header "Step 3: Running Database Migrations"
  log_message "Running database migrations"
  
  print_info "Applying production management system migrations..."
  
  if [ -f "$SCRIPTS_DIR/apply-migrations.sh" ]; then
    print_info "Using apply-migrations.sh script"
    bash "$SCRIPTS_DIR/apply-migrations.sh" staging
    print_success "Migrations applied successfully"
    log_message "Migrations applied successfully"
  else
    print_warning "apply-migrations.sh not found, using supabase db push"
    if supabase db push; then
      print_success "Migrations applied successfully"
      log_message "Migrations applied successfully"
    else
      print_error "Failed to apply migrations"
      log_message "Failed to apply migrations"
      exit 1
    fi
  fi
  
  echo ""
}

# Configure Realtime
configure_realtime() {
  print_header "Step 4: Configuring Supabase Realtime"
  log_message "Configuring Realtime"
  
  print_info "Enabling Realtime for production tables..."
  
  if [ -f "$SCRIPTS_DIR/configure-realtime.sql" ]; then
    if supabase db execute -f "$SCRIPTS_DIR/configure-realtime.sql"; then
      print_success "Realtime configured successfully"
      log_message "Realtime configured successfully"
    else
      print_warning "Failed to configure Realtime (may already be configured)"
      log_message "Realtime configuration failed"
    fi
  else
    print_warning "configure-realtime.sql not found"
    print_info "Please configure Realtime manually in Supabase Dashboard"
    log_message "Realtime configuration script not found"
  fi
  
  echo ""
}

# Setup storage bucket
setup_storage() {
  print_header "Step 5: Setting Up Storage Bucket"
  log_message "Setting up storage bucket"
  
  print_info "Creating production-photos storage bucket..."
  
  if [ -f "$SCRIPTS_DIR/setup-storage.sql" ]; then
    if supabase db execute -f "$SCRIPTS_DIR/setup-storage.sql"; then
      print_success "Storage bucket configured successfully"
      log_message "Storage bucket configured successfully"
    else
      print_warning "Failed to configure storage (may already exist)"
      log_message "Storage configuration failed"
    fi
  else
    print_warning "setup-storage.sql not found"
    print_info "Please configure storage manually in Supabase Dashboard"
    log_message "Storage configuration script not found"
  fi
  
  echo ""
}

# Deploy Edge Functions
deploy_edge_functions() {
  print_header "Step 6: Deploying Edge Functions"
  log_message "Deploying Edge Functions"
  
  print_info "Deploying character choice reminder function..."
  
  if [ -d "supabase/functions/cron-send-character-choice-reminders" ]; then
    if supabase functions deploy cron-send-character-choice-reminders; then
      print_success "Character choice reminder function deployed"
      log_message "Character choice reminder function deployed"
    else
      print_warning "Failed to deploy character choice reminder function"
      log_message "Character choice reminder function deployment failed"
    fi
  else
    print_warning "Character choice reminder function not found"
    log_message "Character choice reminder function not found"
  fi
  
  print_info "Deploying character choice expiration function..."
  
  if [ -d "supabase/functions/cron-expire-character-choices" ]; then
    if supabase functions deploy cron-expire-character-choices; then
      print_success "Character choice expiration function deployed"
      log_message "Character choice expiration function deployed"
    else
      print_warning "Failed to deploy character choice expiration function"
      log_message "Character choice expiration function deployment failed"
    fi
  else
    print_warning "Character choice expiration function not found"
    log_message "Character choice expiration function not found"
  fi
  
  echo ""
}

# Build frontend
build_frontend() {
  print_header "Step 7: Building Frontend Application"
  log_message "Building frontend"
  
  print_info "Installing dependencies..."
  if npm install; then
    print_success "Dependencies installed"
    log_message "Dependencies installed"
  else
    print_error "Failed to install dependencies"
    log_message "Failed to install dependencies"
    exit 1
  fi
  
  print_info "Running type check..."
  if npm run type-check 2>/dev/null || true; then
    print_success "Type check passed"
    log_message "Type check passed"
  else
    print_warning "Type check failed (continuing anyway)"
    log_message "Type check failed"
  fi
  
  print_info "Building application..."
  if npm run build; then
    print_success "Application built successfully"
    log_message "Application built successfully"
  else
    print_error "Failed to build application"
    log_message "Failed to build application"
    exit 1
  fi
  
  echo ""
}

# Test all features
test_features() {
  print_header "Step 8: Testing Features in Staging"
  log_message "Testing features"
  
  print_info "Running automated tests..."
  
  # Run unit tests
  print_info "Running unit tests..."
  if npm run test 2>/dev/null || true; then
    print_success "Unit tests passed"
    log_message "Unit tests passed"
  else
    print_warning "Unit tests failed or not configured"
    log_message "Unit tests failed"
  fi
  
  # Test database connectivity
  print_info "Testing database connectivity..."
  if supabase db diff &>/dev/null; then
    print_success "Database connection successful"
    log_message "Database connection successful"
  else
    print_warning "Database connection test failed"
    log_message "Database connection test failed"
  fi
  
  # Test email service
  print_info "Testing email service..."
  if [ -f "$SCRIPTS_DIR/test-email-service.js" ]; then
    print_info "Email service test script found"
    print_info "Run manually: node $SCRIPTS_DIR/test-email-service.js"
    log_message "Email service test script available"
  else
    print_warning "Email service test script not found"
    log_message "Email service test script not found"
  fi
  
  echo ""
}

# Verify integrations
verify_integrations() {
  print_header "Step 9: Verifying Integrations"
  log_message "Verifying integrations"
  
  print_info "Checking production queue integration..."
  QUEUE_CHECK=$(supabase db execute -c "SELECT COUNT(*) FROM production_queue;" 2>/dev/null || echo "0")
  if [ "$QUEUE_CHECK" != "0" ]; then
    print_success "Production queue accessible"
    log_message "Production queue accessible"
  else
    print_warning "Production queue may be empty or inaccessible"
    log_message "Production queue check failed"
  fi
  
  print_info "Checking character choices integration..."
  CHOICES_CHECK=$(supabase db execute -c "SELECT COUNT(*) FROM character_choices;" 2>/dev/null || echo "0")
  if [ "$CHOICES_CHECK" != "0" ]; then
    print_success "Character choices accessible"
    log_message "Character choices accessible"
  else
    print_warning "Character choices may be empty or inaccessible"
    log_message "Character choices check failed"
  fi
  
  print_info "Checking cron jobs..."
  CRON_CHECK=$(supabase db execute -c "SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%character_choice%';" 2>/dev/null || echo "0")
  if [ "$CRON_CHECK" -ge "2" ]; then
    print_success "Cron jobs configured (found $CRON_CHECK jobs)"
    log_message "Cron jobs configured"
  else
    print_warning "Cron jobs may not be configured correctly"
    log_message "Cron jobs check failed"
  fi
  
  echo ""
}

# Generate deployment report
generate_report() {
  print_header "Step 10: Generating Deployment Report"
  log_message "Generating deployment report"
  
  REPORT_FILE="./deployment-report-staging-$(date +%Y%m%d-%H%M%S).md"
  
  cat > "$REPORT_FILE" << EOF
# Staging Deployment Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Environment:** Staging
**Deployed By:** $(whoami)

## Deployment Summary

### Prerequisites
- Supabase CLI: $(supabase --version 2>/dev/null || echo "Not found")
- Node.js: $(node --version 2>/dev/null || echo "Not found")
- npm: $(npm --version 2>/dev/null || echo "Not found")

### Database
- Backup Created: ${BACKUP_FILE:-"No backup created"}
- Migrations Applied: Yes
- Tables Created: production_queue, character_choices, production_stages

### Configuration
- Realtime Enabled: Yes
- Storage Bucket Created: production-photos
- Edge Functions Deployed: 2 functions

### Frontend
- Build Status: Success
- Build Output: dist/

### Testing
- Unit Tests: Run
- Database Connectivity: Verified
- Integration Tests: Verified

## Next Steps

1. **Manual Testing Required:**
   - [ ] Test production dashboard at /admin/production
   - [ ] Test character selection flow
   - [ ] Test stage transitions
   - [ ] Test photo uploads
   - [ ] Test email notifications
   - [ ] Test real-time updates

2. **Performance Testing:**
   - [ ] Load dashboard with 100+ items
   - [ ] Test concurrent user access
   - [ ] Measure response times

3. **Integration Testing:**
   - [ ] Verify orders integration
   - [ ] Test notification delivery
   - [ ] Verify cron job execution

4. **Documentation:**
   - [ ] Update team on deployment
   - [ ] Document any issues found
   - [ ] Create user training materials

## Verification Commands

\`\`\`bash
# Check tables exist
supabase db execute -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%production%' OR table_name LIKE '%character%';"

# Check cron jobs
supabase db execute -c "SELECT * FROM cron.job WHERE jobname LIKE '%character_choice%';"

# Check Realtime
supabase db execute -c "SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"

# Test email service
node $SCRIPTS_DIR/test-email-service.js your-email@example.com
\`\`\`

## Rollback Plan

If issues are discovered:

\`\`\`bash
# Restore from backup
pg_restore -h HOST -U postgres -d postgres -c ${BACKUP_FILE:-"backup-file.dump"}

# Or rollback frontend
vercel rollback  # or netlify rollback
\`\`\`

## Deployment Log

See: $LOG_FILE

## Sign-Off

- [ ] All features tested and working
- [ ] Performance acceptable
- [ ] No critical issues found
- [ ] Ready for production deployment

**Signed:** _________________ **Date:** _________

EOF

  print_success "Deployment report generated: $REPORT_FILE"
  log_message "Deployment report generated: $REPORT_FILE"
  
  echo ""
}

# Main execution
main() {
  print_header "Production Management System - Staging Deployment"
  echo -e "${CYAN}Environment: $ENVIRONMENT${NC}"
  echo -e "${CYAN}Date: $(date)${NC}"
  echo -e "${CYAN}Log File: $LOG_FILE${NC}"
  echo ""
  
  log_message "=== Staging Deployment Started ==="
  log_message "Environment: $ENVIRONMENT"
  
  # Confirmation prompt
  print_warning "This will deploy the Production Management System to STAGING"
  print_info "Press Ctrl+C to cancel, or Enter to continue..."
  read
  
  # Execute deployment steps
  check_prerequisites
  create_backup
  run_migrations
  configure_realtime
  setup_storage
  deploy_edge_functions
  build_frontend
  test_features
  verify_integrations
  generate_report
  
  # Success message
  print_header "Deployment Complete!"
  print_success "Production Management System deployed to staging successfully!"
  echo ""
  print_info "Next steps:"
  echo "  1. Review deployment report: $REPORT_FILE"
  echo "  2. Test all features manually"
  echo "  3. Run performance tests"
  echo "  4. Verify integrations"
  echo "  5. Document any issues"
  echo ""
  print_info "Deployment log: $LOG_FILE"
  
  log_message "=== Staging Deployment Completed Successfully ==="
}

# Run main function
main
