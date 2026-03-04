# Production Environment Preparation - Complete Guide

## Overview

This document provides a comprehensive guide for preparing the production environment for the Production Management System. All necessary scripts, configuration files, and testing guides have been created.

## Created Files and Resources

### 1. Database Migration Scripts

#### `scripts/review-migrations.sql`
- Comprehensive SQL script to review all migrations
- Checks tables, indexes, triggers, RLS policies, cron jobs, and functions
- Provides verification queries and recommendations
- **Usage:** Run in Supabase SQL Editor to verify migration status

#### `scripts/apply-migrations.sh`
- Bash script to apply all migrations in correct order
- Includes backup creation, prerequisite checks, and verification
- Handles 16 migrations in proper sequence
- **Usage:** `./apply-migrations.sh [staging|production]`

#### `scripts/MIGRATION_CHECKLIST.md`
- Detailed checklist for migration process
- Organized by phases: Core Tables, Views/Functions, Automation, etc.
- Includes verification steps and rollback procedures
- **Usage:** Follow step-by-step during migration

### 2. Realtime Configuration

#### `scripts/configure-realtime.sql`
- SQL script to enable Realtime for production tables
- Configures publication for production_queue, character_choices, production_stages
- Includes verification queries and troubleshooting
- **Usage:** Run in Supabase SQL Editor after migrations

#### `scripts/REALTIME_TESTING_GUIDE.md`
- Comprehensive testing guide with 7 test scenarios
- Tests updates, concurrent users, performance, and reconnection
- Includes troubleshooting section and performance benchmarks
- **Usage:** Follow test scenarios to verify Realtime functionality

### 3. Storage Configuration

#### `scripts/setup-storage.sql`
- Creates production-photos storage bucket
- Configures RLS policies for admin and customer access
- Includes helper functions for storage management
- **Usage:** Run in Supabase SQL Editor to set up storage

#### `scripts/STORAGE_TESTING_GUIDE.md`
- 13 comprehensive test scenarios for storage
- Tests upload, viewing, deletion, permissions, and performance
- Includes troubleshooting and performance benchmarks
- **Usage:** Follow test scenarios to verify storage functionality

### 4. Email Configuration

#### `scripts/EMAIL_CONFIGURATION_GUIDE.md`
- Complete guide for configuring email service
- Supports SMTP, SendGrid, AWS SES, Mailgun, and Resend
- Includes template configuration and deliverability best practices
- **Usage:** Follow guide to configure email provider

#### `scripts/test-email-service.js`
- Node.js script to test email configuration
- Tests environment variables, templates, Edge Functions, and delivery
- Provides detailed test results and diagnostics
- **Usage:** `node test-email-service.js [test-email@example.com]`

#### `scripts/.env.production.template`
- Complete environment variables template
- Includes all configuration options with descriptions
- Organized by category (Supabase, Email, Realtime, Storage, etc.)
- **Usage:** Copy to .env and fill in actual values

## Quick Start Guide

### Step 1: Database Migrations (30 minutes)

```bash
# 1. Review migration checklist
cat scripts/MIGRATION_CHECKLIST.md

# 2. Create backup
supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql

# 3. Apply migrations
./scripts/apply-migrations.sh staging

# 4. Verify migrations
supabase db execute -f scripts/review-migrations.sql
```

### Step 2: Configure Realtime (15 minutes)

```bash
# 1. Enable Realtime
supabase db execute -f scripts/configure-realtime.sql

# 2. Test Realtime
# Follow REALTIME_TESTING_GUIDE.md
```

### Step 3: Set Up Storage (15 minutes)

```bash
# 1. Create storage bucket
supabase db execute -f scripts/setup-storage.sql

# 2. Test storage
# Follow STORAGE_TESTING_GUIDE.md
```

### Step 4: Configure Email (30 minutes)

```bash
# 1. Set up email provider
# Follow EMAIL_CONFIGURATION_GUIDE.md

# 2. Configure environment variables
cp scripts/.env.production.template .env
# Edit .env with your credentials

# 3. Deploy Edge Functions
supabase functions deploy cron-send-character-choice-reminders
supabase functions deploy cron-expire-character-choices

# 4. Set secrets
supabase secrets set EMAIL_PROVIDER=sendgrid
supabase secrets set SENDGRID_API_KEY=your-key

# 5. Test email service
node scripts/test-email-service.js your-email@example.com
```

## Deployment Checklist

### Pre-Deployment
- [ ] All migration files reviewed
- [ ] Database backup created
- [ ] Environment variables configured
- [ ] Email provider account set up
- [ ] Test accounts created (admin and customer)

### Database Deployment
- [ ] Migrations applied successfully
- [ ] All tables created
- [ ] All indexes created
- [ ] All triggers created
- [ ] All RLS policies created
- [ ] All functions created
- [ ] Cron jobs scheduled and active

### Realtime Configuration
- [ ] Realtime enabled for production_queue
- [ ] Realtime enabled for character_choices
- [ ] Realtime enabled for production_stages
- [ ] Realtime tested with multiple browsers
- [ ] Update latency < 5 seconds

### Storage Configuration
- [ ] Storage bucket created
- [ ] RLS policies configured
- [ ] Admin upload tested
- [ ] Customer viewing tested
- [ ] Anonymous access blocked
- [ ] Photo deletion tested

### Email Configuration
- [ ] Email provider configured
- [ ] Sender email verified
- [ ] Domain authentication set up (SPF, DKIM, DMARC)
- [ ] Edge Functions deployed
- [ ] Secrets configured
- [ ] Test email sent successfully
- [ ] Email templates verified
- [ ] Cron jobs tested

### Testing
- [ ] Migration verification passed
- [ ] Realtime tests passed (7/7)
- [ ] Storage tests passed (13/13)
- [ ] Email tests passed (6/6)
- [ ] Integration tests passed
- [ ] Performance tests passed

### Documentation
- [ ] Deployment log completed
- [ ] Configuration documented
- [ ] Credentials securely stored
- [ ] Team notified of deployment

## File Structure

```
.kiro/specs/production-management-system/
├── scripts/
│   ├── review-migrations.sql
│   ├── apply-migrations.sh
│   ├── MIGRATION_CHECKLIST.md
│   ├── configure-realtime.sql
│   ├── REALTIME_TESTING_GUIDE.md
│   ├── setup-storage.sql
│   ├── STORAGE_TESTING_GUIDE.md
│   ├── EMAIL_CONFIGURATION_GUIDE.md
│   ├── test-email-service.js
│   └── .env.production.template
├── DEPLOYMENT_GUIDE.md (existing)
└── PRODUCTION_ENVIRONMENT_PREPARATION.md (this file)
```

## Environment-Specific Configurations

### Staging Environment

```bash
# Staging-specific settings
VITE_ENVIRONMENT="staging"
VITE_ENABLE_DEBUG_LOGS=true
VITE_SUPABASE_URL="https://staging-project.supabase.co"

# Use test email provider
VITE_EMAIL_PROVIDER="smtp"
VITE_SMTP_HOST="smtp.mailtrap.io"  # Email testing service
```

### Production Environment

```bash
# Production-specific settings
VITE_ENVIRONMENT="production"
VITE_ENABLE_DEBUG_LOGS=false
VITE_SUPABASE_URL="https://production-project.supabase.co"

# Use production email provider
VITE_EMAIL_PROVIDER="sendgrid"
VITE_SENDGRID_API_KEY="your-production-key"
```

## Monitoring and Maintenance

### Daily Checks
- [ ] Check email delivery logs for failures
- [ ] Monitor cron job execution
- [ ] Review error logs
- [ ] Check storage usage

### Weekly Checks
- [ ] Review email deliverability metrics
- [ ] Check database performance
- [ ] Monitor Realtime connection stability
- [ ] Review user feedback

### Monthly Checks
- [ ] Rotate API keys and credentials
- [ ] Review and optimize database indexes
- [ ] Clean up old photos (if needed)
- [ ] Update documentation

## Troubleshooting Resources

### Database Issues
- See `MIGRATION_CHECKLIST.md` - Rollback Procedures
- See `review-migrations.sql` - Verification Queries

### Realtime Issues
- See `REALTIME_TESTING_GUIDE.md` - Common Issues and Solutions
- Check Supabase Dashboard > Logs > Realtime

### Storage Issues
- See `STORAGE_TESTING_GUIDE.md` - Common Issues and Solutions
- Check Supabase Dashboard > Storage > production-photos

### Email Issues
- See `EMAIL_CONFIGURATION_GUIDE.md` - Troubleshooting Section
- Run `node scripts/test-email-service.js` for diagnostics
- Check Edge Function logs: `supabase functions logs cron-send-character-choice-reminders`

## Support Contacts

### Technical Issues
- **Database:** Check Supabase documentation and support
- **Email:** Check email provider documentation
- **Application:** Review application logs and error tracking

### Emergency Contacts
- **Database Admin:** [Contact Info]
- **DevOps Lead:** [Contact Info]
- **Project Manager:** [Contact Info]

## Next Steps After Preparation

1. **Run Integration Tests**
   - Test complete order flow
   - Test character choice workflow
   - Test production stage progression
   - Test customer notifications

2. **Performance Testing**
   - Load test with 1000+ production items
   - Test concurrent user access
   - Measure dashboard load times
   - Test Realtime under load

3. **User Acceptance Testing**
   - Test with admin users
   - Test with customer users
   - Collect feedback
   - Fix any UX issues

4. **Production Deployment**
   - Deploy frontend application
   - Verify all integrations
   - Monitor for 24 hours
   - Document any issues

5. **Post-Deployment**
   - Monitor email delivery
   - Monitor error rates
   - Collect user feedback
   - Plan improvements

## Success Criteria

The production environment is ready when:

- ✅ All 16 migrations applied successfully
- ✅ All verification checks pass
- ✅ Realtime updates work (< 5 second latency)
- ✅ Storage bucket configured with correct permissions
- ✅ Email service sending successfully (> 95% delivery rate)
- ✅ All cron jobs active and running
- ✅ All tests passed (migration, realtime, storage, email)
- ✅ Documentation complete
- ✅ Team trained on new system
- ✅ Monitoring and alerts configured

## Conclusion

All preparation scripts and guides have been created. The production environment can now be configured by following the guides in order:

1. Database Migrations
2. Realtime Configuration
3. Storage Setup
4. Email Configuration

Each step includes comprehensive testing guides to ensure everything works correctly before moving to the next step.

**Estimated Total Time:** 90-120 minutes

**Last Updated:** 2024-01-01
**Version:** 1.0.0
