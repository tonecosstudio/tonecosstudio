# Backup Strategy - Manual Payment System

## Overview

This document outlines the comprehensive backup and recovery strategy for the Manual Payment System. A robust backup strategy ensures business continuity and data protection in case of system failures, data corruption, or accidental deletions.

## Backup Objectives

### RPO (Recovery Point Objective)
- **Database**: Maximum 1 hour data loss
- **Storage**: Maximum 4 hours data loss
- **Configuration**: Real-time version control

### RTO (Recovery Time Objective)
- **Critical Systems**: 4 hours maximum downtime
- **Non-critical Systems**: 24 hours maximum downtime

## Backup Components

### 1. Database Backups

#### Automatic Backups (Supabase Managed)

**Daily Backups:**
- Frequency: Once per day
- Retention: 7 days
- Type: Full database backup
- Storage: Supabase managed storage

**Weekly Backups:**
- Frequency: Once per week (Sunday 02:00 UTC)
- Retention: 4 weeks
- Type: Full database backup
- Storage: Supabase managed storage

**Point-in-Time Recovery:**
- Window: 7 days
- Granularity: 1 minute intervals
- Available via Supabase Dashboard

#### Manual Backups

**Pre-Deployment Backup:**
```bash
#!/bin/bash
# scripts/backup-pre-deployment.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_pre_manual_payment_$DATE.sql"

echo "Creating pre-deployment backup: $BACKUP_FILE"
supabase db dump -f $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully"
    gzip $BACKUP_FILE
    echo "✅ Backup compressed: $BACKUP_FILE.gz"
else
    echo "❌ Backup failed"
    exit 1
fi
```

**Scheduled Manual Backups:**
```bash
#!/bin/bash
# scripts/scheduled-backup.sh

BACKUP_DIR="/backups/manual-payment-system"
DATE=$(date +%Y%m%d)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
supabase db dump -f $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Sync to cloud storage (AWS S3 example)
aws s3 cp "$BACKUP_FILE.gz" "s3://ordax-backups/manual-payment/database/$DATE.sql.gz"

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

### 2. Storage Backups

#### Supabase Storage Bucket Backup

**Manual Backup Script:**
```bash
#!/bin/bash
# scripts/backup-storage.sh

BACKUP_DIR="/backups/storage"
DATE=$(date +%Y%m%d)
BUCKET_NAME="payment-proofs"
BACKUP_PATH="$BACKUP_DIR/$BUCKET_NAME_$DATE"

echo "Starting storage backup for bucket: $BUCKET_NAME"

# Create backup directory
mkdir -p $BACKUP_PATH

# Download all files
supabase storage download $BUCKET_NAME $BACKUP_PATH --recursive

if [ $? -eq 0 ]; then
    echo "✅ Storage download completed"
    
    # Create archive
    tar -czf "$BACKUP_PATH.tar.gz" -C $BACKUP_DIR "$BUCKET_NAME_$DATE"
    
    # Upload to cloud storage
    aws s3 cp "$BACKUP_PATH.tar.gz" "s3://ordax-backups/manual-payment/storage/$DATE.tar.gz"
    
    # Cleanup
    rm -rf $BACKUP_PATH
    
    echo "✅ Storage backup completed: $BACKUP_PATH.tar.gz"
else
    echo "❌ Storage backup failed"
    exit 1
fi
```

**Incremental Backup Strategy:**
```bash
#!/bin/bash
# scripts/incremental-storage-backup.sh

BACKUP_DIR="/backups/storage-incremental"
DATE=$(date +%Y%m%d)
BUCKET_NAME="payment-proofs"
LAST_BACKUP_FILE="$BACKUP_DIR/last_backup.txt"

# Get list of files modified since last backup
if [ -f "$LAST_BACKUP_FILE" ]; then
    LAST_BACKUP=$(cat "$LAST_BACKUP_FILE")
    FILES_TO_BACKUP=$(supabase storage list $BUCKET_NAME --search "updated_at:>$LAST_BACKUP")
else
    FILES_TO_BACKUP=$(supabase storage list $BUCKET_NAME)
fi

if [ -n "$FILES_TO_BACKUP" ]; then
    echo "Backing up $(echo "$FILES_TO_BACKUP" | wc -l) files"
    
    # Download each file
    while IFS= read -r file; do
        supabase storage download $BUCKET_NAME "$file" "$BACKUP_DIR/$DATE/$file"
    done <<< "$FILES_TO_BACKUP"
    
    # Update last backup timestamp
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$LAST_BACKUP_FILE"
fi
```

### 3. Configuration Backups

#### Critical Configuration Files

**Backup List:**
1. Database schema and migrations
2. RLS policies
3. Database functions and triggers
4. Email templates
5. Environment variables
6. Deployment scripts
7. Monitoring configuration
8. Alert rules

**Configuration Backup Script:**
```bash
#!/bin/bash
# scripts/backup-configuration.sh

CONFIG_DIR="/backups/configuration"
DATE=$(date +%Y%m%d)
BACKUP_PATH="$CONFIG_DIR/config_$DATE.tar.gz"

# Files to backup
FILES=(
    "supabase/migrations/"
    "scripts/"
    "docs/"
    ".env.example"
    "package.json"
    "tsconfig.json"
    "vite.config.ts"
)

echo "Backing up configuration files..."

# Create backup
tar -czf $BACKUP_PATH "${FILES[@]}"

# Upload to cloud storage
aws s3 cp $BACKUP_PATH "s3://ordax-backups/manual-payment/configuration/$DATE.tar.gz"

echo "Configuration backup completed: $BACKUP_PATH"
```

### 4. Application Code Backups

**Git as Primary Backup:**
- All code changes committed to Git
- Main branch protected
- Regular tags for releases
- Backup of Git repository to secondary location

**Database Schema in Version Control:**
```sql
-- supabase/migrations/backup_schema.sql
-- Generated: $(date)

-- This file should be committed to Git regularly
-- Use: pg_dump --schema-only > supabase/migrations/backup_schema.sql

-- Tables
\i supabase/migrations/20260216000000_create_manual_payment_system.sql

-- Functions
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname IN (
    'generate_payment_reference',
    'trigger_payment_status_change',
    'trigger_first_file_upload'
);

-- Policies
SELECT pg_get_policydef(oid) 
FROM pg_policy 
WHERE schemaname = 'public';
```

## Backup Schedule

### Daily Backups
- **Time**: 02:00 UTC (off-peak hours)
- **Type**: Full database + incremental storage
- **Retention**: 7 days locally, 30 days in cloud

### Weekly Backups
- **Time**: Sunday 02:00 UTC
- **Type**: Full database + full storage + configuration
- **Retention**: 4 weeks locally, 90 days in cloud

### Monthly Backups
- **Time**: First Sunday of month 02:00 UTC
- **Type**: Complete system backup
- **Retention**: 12 months in cloud storage

### Pre-Deployment Backups
- **When**: Before any deployment or migration
- **Type**: Full system backup
- **Retention**: Until deployment verified successful

## Storage Locations

### Primary Storage (Local)
- **Location**: `/backups/manual-payment-system/`
- **Capacity**: 500GB
- **Access**: System administrators only
- **Encryption**: At-rest encryption enabled

### Secondary Storage (Cloud)
- **Provider**: AWS S3
- **Bucket**: `s3://ordax-backups/manual-payment/`
- **Region**: São Paulo (sa-east-1)
- **Storage Class**: Standard-IA after 30 days
- **Encryption**: SSE-S3 enabled
- **Versioning**: Enabled

### Tertiary Storage (Offsite)
- **Provider**: Backblaze B2
- **Bucket**: `ordax-manual-payment-backups`
- **Region**: US East
- **Frequency**: Monthly full backups
- **Retention**: 12 months

## Backup Verification

### 1. Automated Verification

**Backup Integrity Check:**
```bash
#!/bin/bash
# scripts/verify-backup.sh

BACKUP_FILE=$1

echo "Verifying backup: $BACKUP_FILE"

# Check if file exists and is not empty
if [ ! -s "$BACKUP_FILE" ]; then
    echo "❌ Backup file is empty or doesn't exist"
    exit 1
fi

# Check file integrity (for compressed files)
if [[ "$BACKUP_FILE" == *.gz ]]; then
    if ! gzip -t "$BACKUP_FILE"; then
        echo "❌ Backup file is corrupted (gzip test failed)"
        exit 1
    fi
fi

# Check SQL file structure (for database backups)
if [[ "$BACKUP_FILE" == *.sql* ]]; then
    if ! head -n 100 "$BACKUP_FILE" | grep -q "PostgreSQL database dump"; then
        echo "❌ Backup file doesn't appear to be a valid PostgreSQL dump"
        exit 1
    fi
fi

echo "✅ Backup verification passed"
```

### 2. Regular Restoration Tests

**Monthly Restoration Test:**
```bash
#!/bin/bash
# scripts/test-restoration.sh

TEST_DATE=$(date +%Y%m%d)
TEST_DIR="/tmp/restore_test_$TEST_DATE"

echo "Starting restoration test..."

# 1. Create test database
supabase db reset --db-name "test_restore_$TEST_DATE"

# 2. Restore from backup
BACKUP_FILE=$(find /backups/manual-payment-system -name "*.sql.gz" -mtime -7 | head -1)
if [ -z "$BACKUP_FILE" ]; then
    echo "❌ No recent backup found"
    exit 1
fi

gunzip -c "$BACKUP_FILE" | supabase db push --db-name "test_restore_$TEST_DATE"

# 3. Run verification queries
cat > /tmp/verify_queries.sql << 'EOF'
-- Check tables exist
SELECT 'Tables check' as test,
    COUNT(*) as tables_found,
    CASE WHEN COUNT(*) = 4 THEN 'PASS' ELSE 'FAIL' END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admin_payment_methods', 'manual_payments', 'payment_files', 'payment_audit_log');

-- Check data exists
SELECT 'Data check' as test,
    COUNT(*) as payment_methods,
    CASE WHEN COUNT(*) >= 2 THEN 'PASS' ELSE 'FAIL' END as result
FROM admin_payment_methods;

-- Check functions exist
SELECT 'Functions check' as test,
    COUNT(*) as functions_found,
    CASE WHEN COUNT(*) = 4 THEN 'PASS' ELSE 'FAIL' END as result
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('generate_payment_reference', 'trigger_payment_status_change', 'trigger_first_file_upload', 'ensure_single_default_admin_payment_method');
EOF

# 4. Cleanup
supabase db reset --db-name "test_restore_$TEST_DATE"

echo "✅ Restoration test completed"
```

## Recovery Procedures

### 1. Database Recovery

**Full Database Recovery:**
```bash
#!/bin/bash
# scripts/recover-database.sh

BACKUP_FILE=$1
TEMP_DB="recovery_temp_$(date +%s)"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

echo "Starting database recovery from: $BACKUP_FILE"

# 1. Create temporary database
supabase db reset --db-name "$TEMP_DB"

# 2. Restore backup
gunzip -c "$BACKUP_FILE" | supabase db push --db-name "$TEMP_DB"

# 3. Verify restoration
echo "Verifying restoration..."
supabase db query --db-name "$TEMP_DB" "
    SELECT 'Restoration verification' as step,
        COUNT(*) as tables_found,
        CASE WHEN COUNT(*) = 4 THEN 'SUCCESS' ELSE 'FAILED' END as status
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('admin_payment_methods', 'manual_payments', 'payment_files', 'payment_audit_log');
"

# 4. Prompt for production restoration
read -p "Restoration verified. Restore to production? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
    echo "Restoring to production..."
    # Actual restoration command would go here
    # This is destructive - handle with care
    # supabase db reset && gunzip -c "$BACKUP_FILE" | supabase db push
else
    echo "Recovery aborted. Temporary database: $TEMP_DB"
fi
```

**Point-in-Time Recovery:**
```sql
-- Via Supabase Dashboard
-- 1. Navigate to Database > Backups
-- 2. Select "Point-in-Time Recovery"
-- 3. Choose recovery time
-- 4. Follow prompts to restore

-- Or via CLI (if available)
supabase db recover --time "2026-02-15 14:30:00"
```

### 2. Storage Recovery

**Full Storage Recovery:**
```bash
#!/bin/bash
# scripts/recover-storage.sh

BACKUP_FILE=$1
BUCKET_NAME="payment-proofs"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

echo "Starting storage recovery from: $BACKUP_FILE"

# 1. Extract backup
TEMP_DIR="/tmp/storage_recovery_$(date +%s)"
mkdir -p "$TEMP_DIR"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# 2. Check if bucket exists
if ! supabase storage list $BUCKET_NAME &> /dev/null; then
    echo "Bucket $BUCKET_NAME doesn't exist. Creating..."
    supabase storage create $BUCKET_NAME --public false
fi

# 3. Upload files
find "$TEMP_DIR" -type f | while read -r file; do
    rel_path="${file#$TEMP_DIR/}"
    echo "Uploading: $rel_path"
    supabase storage upload $BUCKET_NAME "$rel_path" "$file"
done

# 4. Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Storage recovery completed"
```

### 3. Configuration Recovery

**Environment Recovery:**
```bash
#!/bin/bash
# scripts/recover-environment.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <config_backup.tar.gz>"
    exit 1
fi

echo "Recovering environment from: $BACKUP_FILE"

# Extract to temporary location
TEMP_DIR="/tmp/env_recovery_$(date +%s)"
mkdir -p "$TEMP_DIR"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Restore critical files
cp "$TEMP_DIR/.env.example" .env.example
cp -r "$TEMP_DIR/scripts/" ./
cp -r "$TEMP_DIR/supabase/migrations/" ./supabase/

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Environment recovery completed"
```

## Disaster Recovery Scenarios

### Scenario 1: Database Corruption

**Symptoms:**
- Queries returning incorrect data
- Constraint violations
- Application errors

**Response:**
1. Immediately stop write operations
2. Identify corruption scope
3. Restore from most recent clean backup
4. Apply transaction logs if available
5. Verify data integrity
6. Resume operations

### Scenario 2: Accidental Data Deletion

**Symptoms:**
- Missing records
- Application errors referencing missing data

**Response:**
1. Identify deletion time
2. Use point-in-time recovery to restore before deletion
3. Export affected tables
4. Merge with current data (if needed)
5. Update application

### Scenario 3: Storage Bucket Failure

**Symptoms:**
- File uploads failing
- File downloads failing
- Storage errors in logs

**Response:**
1. Check bucket status and permissions
2. Restore from storage backup
3. Reconfigure RLS policies
4. Test upload/download functionality

### Scenario 4: Complete System Failure

**Symptoms:**
- Application unavailable
- Database inaccessible
- Storage inaccessible

**Response:**
1. Activate disaster recovery plan
2. Restore database from cloud backup
3. Restore storage from cloud backup
4. Deploy application from Git
5. Configure environment
6. Verify system functionality
7. Update DNS/load balancer

## Backup Monitoring and Alerting

### Backup Success Monitoring

**Daily Backup Check:**
```bash
#!/bin/bash
# scripts/check-backup-status.sh

DATE=$(date +%Y%m%d)
ERRORS=0

# Check database backup
DB_BACKUP="/backups/manual-payment-system/db_backup_$DATE.sql.gz"
if [ ! -f "$DB_BACKUP" ]; then
    echo "❌ Database backup missing for $DATE"
    ERRORS=$((ERRORS + 1))
fi

# Check storage backup (weekly)
if [ $(date +%u) -eq 7 ]; then  # Sunday
    STORAGE_BACKUP="/backups/storage/payment-proofs_$DATE.tar.gz"
    if [ ! -f "$STORAGE_BACKUP" ]; then
        echo "❌ Storage backup missing for $DATE"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Send alert if errors
if [ $ERRORS -gt 0 ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"Backup failures detected: $ERRORS errors on $DATE\"}" \
        $SLACK_WEBHOOK_URL
fi
```

### Backup Size Monitoring

**Alert on Unusual Growth:**
```bash
#!/bin/bash
# scripts/monitor-backup-size.sh

BACKUP_DIR="/backups/manual-payment-system"
DAILY_AVG_SIZE=100  # MB
ALERT_THRESHOLD=200 # MB

# Get today's backup size
TODAY_BACKUP=$(find $BACKUP_DIR -name "*.sql.gz" -mtime -1)
if [ -n "$TODAY_BACKUP" ]; then
    SIZE_MB=$(du -m "$TODAY_BACKUP" | cut -f1)
    
    if [ $SIZE_MB -gt $ALERT_THRESHOLD ]; then
        echo "⚠️ Backup size alert: $SIZE_MB MB (threshold: $ALERT_THRESHOLD MB)"
        # Send alert
    fi
fi
```

## Compliance and Retention

### Data Retention Policy

**Payment Data:**
- Active payments: Indefinite (while active)
- Completed payments: 7 years (legal requirement)
- Audit logs: 7 years
- Payment proofs: 7 years

**Backup Retention:**
- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months
- Yearly backups: 7 years

### Regulatory Compliance

**GDPR Compliance:**
- Right to erasure: Backup data must be purgable
- Data portability: Backups must be exportable
- Privacy by design: Encryption at rest and in transit

**PCI DSS (if applicable):**
- Payment data encryption
- Access controls on backups
- Regular security testing

## Cost Management

### Backup Storage Costs

**Estimated Monthly Costs:**
- Local storage: $50/month (500GB)
- AWS S3: $20/month (100GB)
- Backblaze B2: $5/month (100GB)
- **Total**: ~$75/month

**Cost Optimization:**
- Use lifecycle policies to move to cheaper storage classes
- Implement compression
- Use incremental backups where possible
- Regularly review and purge unnecessary backups

## Documentation and Training

### Runbooks

**Create Runbooks for:**
1. Daily backup verification
2. Monthly restoration test
3. Emergency recovery procedures
4. Backup troubleshooting

### Team Training

**Training Topics:**
1. Backup procedures and schedules
2. Recovery procedures
3. Monitoring and alerting
4. Compliance requirements
5. Cost management

### Regular Reviews

**Quarterly Review:**
1. Backup success rates
2. Restoration test results
3. Storage costs
4. Compliance status
5. Procedure updates

---

**Last Updated**: 2026-02-16  
**Version**: 1.0.0  
**Owner**: DevOps Team  
**Next Review**: 2026-05-16  
**Approval**: [Signature/Date]