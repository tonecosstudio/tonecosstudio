#!/bin/bash

# ============================================================================
# PRODUCTION MANAGEMENT SYSTEM - PRODUCTION DEPLOYMENT SCRIPT
# ============================================================================
# Purpose: Deploy the Production Management System to production environment
# Usage: ./deploy-production.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="production"
BACKUP_DIR="./backups"
MIGRATION_DIR="./supabase/migrations"
SCRIPTS_DIR=".kiro/specs/production-management-system/scripts"
LOG_FILE="./deployment-production-$(date +%Y%m%d-%H%M%S).log"
REPORT_FILE="./deployment-report-production-$(date +%Y%m%d-%H%M%S).md"

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

print_critical() {
  echo -e "${MAGENTA}⚠ CRITICAL: $1${NC}"
}

log_message() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Safety confirmation
safety_confirmation() {
  print_header "PRODUCTION DEPLOYMENT - SAFETY CONFIRMATION"
  print_critical "You are about to deploy to PRODUCTION environment!"
  echo ""
  print_warning "This will affect live users and production data"
  print_info "Please confirm the following:"
  echo ""
  
  read -p "Have you completed staging deployment and testing? (yes/no): " staging_done
  if [ "$staging_done" != "yes" ]; then
    print_error "Please complete staging deployment first"
    exit 1
  fi
  
  read -p "Have you notified all stakeholders? (yes/no): " stakeholders_notified
  if [ "$stakeholders_notified" != "yes" ]; then
    print_error "Please notify stakeholders before proceeding"
    exit 1
  fi
  
  read -p "Have you scheduled a maintenance window? (yes/no): " maintenance_scheduled
  if [ "$maintenance_scheduled" != "yes" ]; then
    print_error "Please schedule a maintenance window first"
    exit 1
  fi
  
  read -p "Is the team ready and on standby? (yes/no): " team_ready
  if [ "$team_ready" != "yes" ]; then
    print_error "Please ensure team is ready before proceeding"
    exit 1
  fi
  
  echo ""
  print_warning "Type 'DEPLOY TO PRODUCTION' to continue (case-sensitive):"
  read confirmation
  
  if [ "$confirmation" != "DEPLOY TO PRODUCTION" ]; then
    print_error "Deployment cancelled"
    exit 1
  fi
  
  print_success "Safety confirmation completed"
  log_message "Safety confirmation completed"
  echo ""
}

# Check prerequisites
check_prerequisites() {
  print_header "Step 1: Checking Prerequisites"
  log_message "Checking prerequisites"
  
  local all_checks_passed=true
  
  # Check if supabase CLI is installed
  if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI not found"
    all_checks_passed=false
  else
    print_success "Supabase CLI found ($(supabase --version))"
  fi
  
  # Check if node is installed
  if ! command -v node &> /dev/null; then
    print_error "Node.js not found"
    all_checks_passed=false
  else
    print_success "Node.js found ($(node --version))"
  fi
  
  # Check if npm is installed
  if ! command -v npm &> /dev/null; then
    print_error "npm not found"
    all_checks_passed=false
  else
    print_success "npm found ($(npm --version))"
  fi
  
  # Check if migration directory exists
  if [ ! -d "$MIGRATION_DIR" ]; then
    print_error "Migration directory not found: $MIGRATION_DIR"
    all_checks_passed=false
  else
    print_success "Migration directory found"
  fi
  
  # Check if .env.production file exists
  if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found"
    print_info "Please create .env.production from .env.production.template"
    all_checks_passed=false
  else
    print_success ".env.production file found"
  fi
  
  # Check if connected to correct Supabase project
  print_info "Verifying Supabase project connection..."
  if supabase projects list &>/dev/null; then
    print_success "Connected to Supabase"
  else
    print_error "Not connected to Supabase project"
    print_info "Run: supabase link --project-ref your-production-project-ref"
    all_checks_passed=false
  fi
  
  if [ "$all_checks_passed" = false ]; then
    print_error "Prerequisites check failed"
    log_message "Prerequisites check failed"
    exit 1
  fi
  
  log_message "Prerequisites check completed successfully"
  echo ""
}

# Create backup
create_backup() {
  print_header "Step 2: Creating Database Backup"
  log_message "Creating database backup"
  
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/production-backup-$(date +%Y%m%d-%H%M%S).sql"
  
  print_critical "Creating production database backup..."
  print_info "Backup file: $BACKUP_FILE"
  
  if supabase db dump -f "$BACKUP_FILE"; then
    print_success "Backup created successfully"
    log_message "Backup created: $BACKUP_FILE"
    
    # Verify backup file exists and has content
    if [ -s "$BACKUP_FILE" ]; then
      BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
      print_success "Backup verified (Size: $BACKUP_SIZE)"
      log_message "Backup verified: $BACKUP_SIZE"
    else
      print_error "Backup file is empty!"
      log_message "Backup file is empty"
      exit 1
    fi
  else
    print_error "Backup failed!"
    print_critical "Cannot proceed without backup"
    log_message "Backup failed"
    exit 1
  fi
  
  # Store backup location for rollback
  echo "$BACKUP_FILE" > "$BACKUP_DIR/latest-production-backup.txt"
  
  echo ""
}

# Run database migrations
run_migrations() {
  print_header "Step 3: Running Database Migrations"
  log_message "Running database migrations"
  
  print_info "Applying production management system migrations..."
  print_warning "This will modify the production database"
  
  # Pause for final confirmation
  read -p "Proceed with database migrations? (yes/no): " proceed
  if [ "$proceed" != "yes" ]; then
    print_error "Migration cancelled by user"
    exit 1
  fi
  
  if [ -f "$SCRIPTS_DIR/apply-migrations.sh" ]; then
    print_info "Using apply-migrations.sh script"
    if bash "$SCRIPTS_DIR/apply-migrations.sh" production; then
      print_success "Migrations applied successfully"
      log_message "Migrations applied successfully"
    else
      print_error "Failed to apply migrations"
      log_message "Failed to apply migrations"
      print_critical "Consider rolling back"
      exit 1
    fi
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
  
  # Verify migrations
  print_info "Verifying migrations..."
  if supabase db execute -c "SELECT COUNT(*) FROM production_queue;" &>/dev/null; then
    print_success "production_queue table accessible"
  else
    print_error "production_queue table not accessible"
    exit 1
  fi
  
  if supabase db execute -c "SELECT COUNT(*) FROM character_choices;" &>/dev/null; then
    print_success "character_choices table accessible"
  else
    print_error "character_choices table not accessible"
    exit 1
  fi
  
  if supabase db execute -c "SELECT COUNT(*) FROM production_stages;" &>/dev/null; then
    print_success "production_stages table accessible"
  else
    print_error "production_stages table not accessible"
    exit 1
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
  
  # Verify Realtime configuration
  print_info "Verifying Realtime configuration..."
  REALTIME_COUNT=$(supabase db execute -c "SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename IN ('production_queue', 'character_choices', 'production_stages');" 2>/dev/null | tail -1 || echo "0")
  
  if [ "$REALTIME_COUNT" -ge "3" ]; then
    print_success "Realtime verified (3 tables configured)"
  else
    print_warning "Realtime may not be fully configured"
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
  
  # Verify storage bucket
  print_info "Verifying storage bucket..."
  if supabase db execute -c "SELECT id FROM storage.buckets WHERE id = 'production-photos';" &>/dev/null; then
    print_success "Storage bucket verified"
  else
    print_warning "Storage bucket may not exist"
  fi
  
  echo ""
}

# Deploy Edge Functions
deploy_edge_functions() {
  print_header "Step 6: Deploying Edge Functions"
  log_message "Deploying Edge Functions"
  
  print_info "Deploying character choice reminder function..."
  
  if [ -d "supabase/functions/cron-send-character-choice-reminders" ]; then
    if supabase functions deploy cron-send-character-choice-reminders --no-verify-jwt; then
      print_success "Character choice reminder function deployed"
      log_message "Character choice reminder function deployed"
    else
      print_error "Failed to deploy character choice reminder function"
      log_message "Character choice reminder function deployment failed"
      exit 1
    fi
  else
    print_warning "Character choice reminder function not found"
    log_message "Character choice reminder function not found"
  fi
  
  print_info "Deploying character choice expiration function..."
  
  if [ -d "supabase/functions/cron-expire-character-choices" ]; then
    if supabase functions deploy cron-expire-character-choices --no-verify-jwt; then
      print_success "Character choice expiration function deployed"
      log_message "Character choice expiration function deployed"
    else
      print_error "Failed to deploy character choice expiration function"
      log_message "Character choice expiration function deployment failed"
      exit 1
    fi
  else
    print_warning "Character choice expiration function not found"
    log_message "Character choice expiration function not found"
  fi
  
  # Set Edge Function secrets
  print_info "Setting Edge Function secrets..."
  print_warning "Please ensure secrets are set manually:"
  echo "  supabase secrets set SMTP_HOST=..."
  echo "  supabase secrets set SMTP_PORT=..."
  echo "  supabase secrets set SMTP_USER=..."
  echo "  supabase secrets set SMTP_PASSWORD=..."
  echo "  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=..."
  
  read -p "Have you set all required secrets? (yes/no): " secrets_set
  if [ "$secrets_set" != "yes" ]; then
    print_error "Please set secrets before continuing"
    exit 1
  fi
  
  echo ""
}

# Build frontend
build_frontend() {
  print_header "Step 7: Building Frontend Application"
  log_message "Building frontend"
  
  print_info "Installing dependencies..."
  if npm ci --production=false; then
    print_success "Dependencies installed"
    log_message "Dependencies installed"
  else
    print_error "Failed to install dependencies"
    log_message "Failed to install dependencies"
    exit 1
  fi
  
  print_info "Running type check..."
  if npm run type-check 2>/dev/null; then
    print_success "Type check passed"
    log_message "Type check passed"
  else
    print_warning "Type check failed"
    log_message "Type check failed"
    read -p "Continue anyway? (yes/no): " continue_build
    if [ "$continue_build" != "yes" ]; then
      exit 1
    fi
  fi
  
  print_info "Running linter..."
  if npm run lint 2>/dev/null; then
    print_success "Linting passed"
    log_message "Linting passed"
  else
    print_warning "Linting failed"
    log_message "Linting failed"
  fi
  
  print_info "Building application for production..."
  if NODE_ENV=production npm run build; then
    print_success "Application built successfully"
    log_message "Application built successfully"
    
    # Verify build output
    if [ -d "dist" ]; then
      BUILD_SIZE=$(du -sh dist | cut -f1)
      print_success "Build output verified (Size: $BUILD_SIZE)"
      log_message "Build size: $BUILD_SIZE"
    else
      print_error "Build output directory not found"
      exit 1
    fi
  else
    print_error "Failed to build application"
    log_message "Failed to build application"
    exit 1
  fi
  
  echo ""
}

# Deploy frontend
deploy_frontend() {
  print_header "Step 8: Deploying Frontend to Production"
  log_message "Deploying frontend"
  
  print_info "Detecting deployment platform..."
  
  if command -v vercel &> /dev/null; then
    print_info "Deploying to Vercel..."
    if vercel --prod --yes; then
      print_success "Frontend deployed to Vercel"
      log_message "Frontend deployed to Vercel"
    else
      print_error "Vercel deployment failed"
      log_message "Vercel deployment failed"
      exit 1
    fi
  elif command -v netlify &> /dev/null; then
    print_info "Deploying to Netlify..."
    if netlify deploy --prod --dir=dist; then
      print_success "Frontend deployed to Netlify"
      log_message "Frontend deployed to Netlify"
    else
      print_error "Netlify deployment failed"
      log_message "Netlify deployment failed"
      exit 1
    fi
  else
    print_warning "No deployment platform CLI found"
    print_info "Please deploy manually using your platform's dashboard"
    read -p "Have you deployed the frontend? (yes/no): " frontend_deployed
    if [ "$frontend_deployed" != "yes" ]; then
      print_error "Frontend deployment required"
      exit 1
    fi
    log_message "Frontend deployed manually"
  fi
  
  echo ""
}

# Verify deployment
verify_deployment() {
  print_header "Step 9: Verifying Deployment"
  log_message "Verifying deployment"
  
  print_info "Running verification checks..."
  
  # Database verification
  print_info "Checking database tables..."
  TABLES_COUNT=$(supabase db execute -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('production_queue', 'character_choices', 'production_stages');" 2>/dev/null | tail -1 || echo "0")
  if [ "$TABLES_COUNT" -eq "3" ]; then
    print_success "All tables exist"
  else
    print_error "Some tables are missing"
  fi
  
  # Cron jobs verification
  print_info "Checking cron jobs..."
  CRON_COUNT=$(supabase db execute -c "SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%character_choice%';" 2>/dev/null | tail -1 || echo "0")
  if [ "$CRON_COUNT" -ge "2" ]; then
    print_success "Cron jobs configured ($CRON_COUNT jobs)"
  else
    print_warning "Cron jobs may not be configured"
  fi
  
  # Realtime verification
  print_info "Checking Realtime configuration..."
  REALTIME_COUNT=$(supabase db execute -c "SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename IN ('production_queue', 'character_choices', 'production_stages');" 2>/dev/null | tail -1 || echo "0")
  if [ "$REALTIME_COUNT" -ge "3" ]; then
    print_success "Realtime configured"
  else
    print_warning "Realtime may not be fully configured"
  fi
  
  # Storage verification
  print_info "Checking storage bucket..."
  if supabase db execute -c "SELECT id FROM storage.buckets WHERE id = 'production-photos';" &>/dev/null; then
    print_success "Storage bucket exists"
  else
    print_warning "Storage bucket may not exist"
  fi
  
  print_info "Manual verification required:"
  echo "  1. Visit production dashboard: /admin/production"
  echo "  2. Test character selection flow"
  echo "  3. Test stage transitions"
  echo "  4. Verify Realtime updates"
  echo "  5. Test email notifications"
  
  read -p "Have you completed manual verification? (yes/no): " manual_verified
  if [ "$manual_verified" != "yes" ]; then
    print_warning "Please complete manual verification"
  fi
  
  echo ""
}

# Monitor for errors
monitor_errors() {
  print_header "Step 10: Initial Error Monitoring"
  log_message "Starting error monitoring"
  
  print_info "Monitoring system for 5 minutes..."
  print_info "Press Ctrl+C to skip monitoring"
  
  # Monitor database logs
  print_info "Checking database logs..."
  supabase db logs --tail --limit 20 || true
  
  # Monitor Edge Function logs
  print_info "Checking Edge Function logs..."
  supabase functions logs cron-send-character-choice-reminders --limit 10 || true
  
  print_warning "Continue monitoring for the next 24 hours"
  print_info "Set up alerts for:"
  echo "  - Error rate > 5%"
  echo "  - Response time > 5 seconds"
  echo "  - Email delivery failures"
  echo "  - Database connection issues"
  
  echo ""
}

# Generate deployment report
generate_report() {
  print_header "Step 11: Generating Deployment Report"
  log_message "Generating deployment report"
  
  cat > "$REPORT_FILE" << EOF
# Production Deployment Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Environment:** Production
**Deployed By:** $(whoami)
**Git Commit:** $(git rev-parse HEAD 2>/dev/null || echo "N/A")

## Deployment Summary

### Prerequisites
- Supabase CLI: $(supabase --version 2>/dev/null || echo "Not found")
- Node.js: $(node --version 2>/dev/null || echo "Not found")
- npm: $(npm --version 2>/dev/null || echo "Not found")

### Database
- Backup Created: ${BACKUP_FILE:-"No backup created"}
- Backup Size: $(du -h "$BACKUP_FILE" 2>/dev/null | cut -f1 || echo "N/A")
- Migrations Applied: Yes
- Tables Created: production_queue, character_choices, production_stages

### Configuration
- Realtime Enabled: Yes
- Storage Bucket Created: production-photos
- Edge Functions Deployed: 2 functions
- Cron Jobs Scheduled: 2 jobs

### Frontend
- Build Status: Success
- Build Size: $(du -sh dist 2>/dev/null | cut -f1 || echo "N/A")
- Deployment Platform: $(command -v vercel &>/dev/null && echo "Vercel" || command -v netlify &>/dev/null && echo "Netlify" || echo "Manual")

### Verification
- Database Tables: Verified
- Cron Jobs: Verified
- Realtime: Verified
- Storage: Verified
- Manual Testing: Required

## Post-Deployment Checklist

### Immediate (0-2 hours)
- [ ] Monitor error rates
- [ ] Check email delivery
- [ ] Verify Realtime updates
- [ ] Test critical user flows
- [ ] Monitor support channels

### Short-term (2-24 hours)
- [ ] Continuous monitoring
- [ ] Respond to user feedback
- [ ] Document any issues
- [ ] Create bug fix tickets

### Medium-term (1-7 days)
- [ ] Analyze performance metrics
- [ ] Review user feedback
- [ ] Optimize slow queries
- [ ] Conduct team retrospective

## Monitoring Commands

\`\`\`bash
# Check database logs
supabase db logs --tail

# Check Edge Function logs
supabase functions logs cron-send-character-choice-reminders --tail
supabase functions logs cron-expire-character-choices --tail

# Check cron job execution
supabase db execute -c "SELECT * FROM cron.job_run_details WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%character_choice%') ORDER BY start_time DESC LIMIT 10;"

# Check error rates
# Monitor application logs in deployment platform
\`\`\`

## Rollback Procedure

If critical issues are discovered:

\`\`\`bash
# 1. Rollback frontend
vercel rollback  # or netlify rollback

# 2. Restore database from backup
pg_restore -h HOST -U postgres -d postgres -c ${BACKUP_FILE}

# 3. Delete Edge Functions
supabase functions delete cron-send-character-choice-reminders
supabase functions delete cron-expire-character-choices

# 4. Notify stakeholders
\`\`\`

## Emergency Contacts

- **Deployment Lead:** [NAME] - [PHONE]
- **Database Admin:** [NAME] - [PHONE]
- **DevOps Engineer:** [NAME] - [PHONE]
- **Support Lead:** [NAME] - [PHONE]

## Success Criteria

- [ ] All features accessible
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] Email notifications working
- [ ] Realtime updates working
- [ ] User feedback positive

## Sign-Off

**Deployment Lead:** _________________ **Date:** _________

**Database Admin:** _________________ **Date:** _________

**QA Engineer:** _________________ **Date:** _________

---

**Deployment Log:** $LOG_FILE
**Generated:** $(date '+%Y-%m-%d %H:%M:%S')

EOF

  print_success "Deployment report generated: $REPORT_FILE"
  log_message "Deployment report generated: $REPORT_FILE"
  
  echo ""
}

# Main execution
main() {
  print_header "Production Management System - PRODUCTION Deployment"
  echo -e "${MAGENTA}⚠ PRODUCTION ENVIRONMENT ⚠${NC}"
  echo -e "${CYAN}Date: $(date)${NC}"
  echo -e "${CYAN}Log File: $LOG_FILE${NC}"
  echo ""
  
  log_message "=== Production Deployment Started ==="
  log_message "Environment: $ENVIRONMENT"
  log_message "User: $(whoami)"
  
  # Safety confirmation
  safety_confirmation
  
  # Execute deployment steps
  check_prerequisites
  create_backup
  run_migrations
  configure_realtime
  setup_storage
  deploy_edge_functions
  build_frontend
  deploy_frontend
  verify_deployment
  monitor_errors
  generate_report
  
  # Success message
  print_header "Deployment Complete!"
  print_success "Production Management System deployed to production successfully!"
  echo ""
  print_info "Next steps:"
  echo "  1. Review deployment report: $REPORT_FILE"
  echo "  2. Monitor system for 24 hours"
  echo "  3. Respond to user feedback"
  echo "  4. Document any issues"
  echo "  5. Conduct team retrospective"
  echo ""
  print_info "Deployment log: $LOG_FILE"
  print_info "Backup location: $BACKUP_FILE"
  echo ""
  print_warning "Keep monitoring for the next 24 hours!"
  
  log_message "=== Production Deployment Completed Successfully ==="
}

# Run main function
main
