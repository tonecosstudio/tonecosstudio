# Email Service Configuration Guide

## Overview

This guide provides comprehensive instructions for configuring email notifications in the Production Management System. The system sends automated emails for character choice reminders, production updates, and admin notifications.

## Email Service Options

The system supports multiple email service providers:

1. **SMTP** (Generic - works with any SMTP server)
2. **SendGrid** (Recommended for production)
3. **AWS SES** (Good for high volume)
4. **Mailgun** (Alternative option)
5. **Resend** (Modern alternative)

## Prerequisites

- [ ] Email service provider account created
- [ ] API keys or SMTP credentials obtained
- [ ] Sender email address verified
- [ ] Domain configured (for production)
- [ ] SPF and DKIM records set up (recommended)

---

## Option 1: SMTP Configuration (Generic)

### Step 1: Obtain SMTP Credentials

Get SMTP credentials from your email provider:
- Gmail: App-specific password
- Outlook: Account password
- Custom domain: Check hosting provider

### Step 2: Configure Environment Variables

Add to `.env` file:

```bash
# Email Service Configuration
VITE_EMAIL_PROVIDER="smtp"
VITE_EMAIL_FROM="noreply@ordax.com.br"
VITE_EMAIL_FROM_NAME="ORDAX Production"

# SMTP Configuration
VITE_SMTP_HOST="smtp.gmail.com"  # or your SMTP server
VITE_SMTP_PORT=587
VITE_SMTP_USER="your-email@gmail.com"
VITE_SMTP_PASSWORD="your-app-password"
VITE_SMTP_SECURE=false  # true for port 465, false for port 587
```

### Step 3: Test SMTP Connection

```bash
# Test SMTP connection
node scripts/test-email-connection.js
```

### Common SMTP Providers

**Gmail:**
```bash
VITE_SMTP_HOST="smtp.gmail.com"
VITE_SMTP_PORT=587
VITE_SMTP_SECURE=false
# Note: Enable "Less secure app access" or use App Password
```

**Outlook/Office 365:**
```bash
VITE_SMTP_HOST="smtp.office365.com"
VITE_SMTP_PORT=587
VITE_SMTP_SECURE=false
```

**Custom Domain (cPanel):**
```bash
VITE_SMTP_HOST="mail.yourdomain.com"
VITE_SMTP_PORT=587
VITE_SMTP_SECURE=false
```

---

## Option 2: SendGrid Configuration (Recommended)

### Step 1: Create SendGrid Account

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Verify your email address
3. Complete sender authentication

### Step 2: Create API Key

1. Navigate to Settings → API Keys
2. Click "Create API Key"
3. Name: "Production Management System"
4. Permissions: "Full Access" or "Mail Send"
5. Copy the API key (shown only once!)

### Step 3: Configure Environment Variables

```bash
# Email Service Configuration
VITE_EMAIL_PROVIDER="sendgrid"
VITE_EMAIL_FROM="noreply@ordax.com.br"
VITE_EMAIL_FROM_NAME="ORDAX Production"

# SendGrid Configuration
VITE_SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxxxxxxxx"
```

### Step 4: Verify Sender Email

1. Navigate to Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Enter your sender email (noreply@ordax.com.br)
4. Check email and click verification link

### Step 5: Set Up Domain Authentication (Production)

1. Navigate to Settings → Sender Authentication
2. Click "Authenticate Your Domain"
3. Follow DNS configuration instructions
4. Add CNAME records to your domain DNS
5. Verify domain

---

## Option 3: AWS SES Configuration

### Step 1: Set Up AWS SES

1. Sign in to AWS Console
2. Navigate to Amazon SES
3. Verify email address or domain
4. Request production access (if needed)

### Step 2: Create IAM User

1. Navigate to IAM → Users
2. Create user: "production-management-ses"
3. Attach policy: "AmazonSESFullAccess"
4. Create access key
5. Save Access Key ID and Secret Access Key

### Step 3: Configure Environment Variables

```bash
# Email Service Configuration
VITE_EMAIL_PROVIDER="aws-ses"
VITE_EMAIL_FROM="noreply@ordax.com.br"
VITE_EMAIL_FROM_NAME="ORDAX Production"

# AWS SES Configuration
VITE_AWS_REGION="us-east-1"
VITE_AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
VITE_AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

---

## Email Templates Configuration

### Template Location

Email templates are stored in:
```
src/services/notifications/email-templates/
```

### Available Templates

1. **character-choice-reminder-first.html**
   - Sent 5 days before deadline
   - Friendly reminder to choose character

2. **character-choice-reminder-second.html**
   - Sent 2 days before deadline
   - More urgent tone

3. **character-choice-reminder-final.html**
   - Sent 24 hours before deadline
   - Final warning

4. **admin-expiration-notice.html**
   - Sent to admin when choice expires
   - Requires manual assignment

5. **production-stage-update.html**
   - Sent when production stage changes
   - Includes progress information

6. **order-shipped.html**
   - Sent when order is shipped
   - Includes tracking information

### Template Variables

Templates support the following variables:

```javascript
{
  customerName: "João Silva",
  orderNumber: "ORD-12345",
  collectionName: "Marvel Legends",
  deadline: "2024-05-15",
  daysRemaining: 5,
  choiceUrl: "https://ordax.com.br/orders/123/choose",
  currentStage: "Production",
  estimatedCompletion: "2024-06-01",
  trackingCode: "BR123456789",
  trackingUrl: "https://tracking.com/BR123456789"
}
```

### Customizing Templates

1. Edit HTML files in `src/services/notifications/email-templates/`
2. Use `{{variableName}}` syntax for variables
3. Test templates before deploying
4. Maintain responsive design for mobile

---

## Supabase Edge Functions Configuration

### Deploy Email Edge Functions

```bash
# Deploy character choice reminder function
supabase functions deploy cron-send-character-choice-reminders

# Deploy character choice expiration function
supabase functions deploy cron-expire-character-choices
```

### Set Edge Function Secrets

```bash
# Set email service credentials
supabase secrets set EMAIL_PROVIDER=sendgrid
supabase secrets set SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
supabase secrets set EMAIL_FROM=noreply@ordax.com.br
supabase secrets set EMAIL_FROM_NAME="ORDAX Production"

# Or for SMTP:
supabase secrets set EMAIL_PROVIDER=smtp
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=your-email@gmail.com
supabase secrets set SMTP_PASSWORD=your-app-password
supabase secrets set SMTP_SECURE=false

# Set Supabase service role key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
```

### Verify Secrets

```bash
# List all secrets (values are hidden)
supabase secrets list
```

---

## Email Delivery Logging

### Enable Email Logging

Email delivery is automatically logged to the `email_delivery_logs` table:

```sql
-- Check email delivery logs
SELECT 
  id,
  recipient_email,
  subject,
  template_name,
  status,
  error_message,
  sent_at,
  created_at
FROM email_delivery_logs
ORDER BY created_at DESC
LIMIT 20;
```

### Monitor Email Delivery

```sql
-- Get email delivery statistics
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM email_delivery_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;

-- Find failed emails
SELECT 
  recipient_email,
  subject,
  error_message,
  created_at
FROM email_delivery_logs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## Testing Email Configuration

### Test 1: Send Test Email

Create a test script:

```javascript
// scripts/test-email.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sendTestEmail() {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: 'test@example.com',
      subject: 'Test Email from Production Management System',
      template: 'character-choice-reminder-first',
      variables: {
        customerName: 'Test User',
        orderNumber: 'TEST-001',
        collectionName: 'Test Collection',
        deadline: '2024-12-31',
        daysRemaining: 5,
        choiceUrl: 'https://ordax.com.br/test'
      }
    }
  });

  if (error) {
    console.error('Error sending email:', error);
  } else {
    console.log('Email sent successfully:', data);
  }
}

sendTestEmail();
```

Run the test:
```bash
node scripts/test-email.js
```

### Test 2: Trigger Cron Job Manually

```bash
# Test character choice reminder function
supabase functions invoke cron-send-character-choice-reminders \
  --method POST \
  --body '{}'

# Check logs
supabase functions logs cron-send-character-choice-reminders --tail
```

### Test 3: Verify Email Delivery

1. Check your inbox for test email
2. Verify email formatting
3. Check all links work
4. Test on mobile device
5. Check spam folder

---

## Email Notification Schedule

### Automated Emails

| Email Type | Trigger | Frequency | Cron Schedule |
|------------|---------|-----------|---------------|
| Character Choice Reminder (First) | 5 days before deadline | Once | Daily at 9 AM |
| Character Choice Reminder (Second) | 2 days before deadline | Once | Daily at 9 AM |
| Character Choice Reminder (Final) | 24 hours before deadline | Once | Daily at 9 AM |
| Character Choice Expiration | Deadline passed | Once | Daily at 10 AM |
| Production Stage Update | Stage changes | Immediate | Real-time trigger |
| Order Shipped | Shipping status updated | Immediate | Real-time trigger |

### Cron Job Configuration

```sql
-- Verify cron jobs are scheduled
SELECT 
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%character_choice%'
   OR jobname LIKE '%email%';
```

---

## Email Deliverability Best Practices

### 1. Domain Authentication

**SPF Record:**
```
v=spf1 include:sendgrid.net ~all
```

**DKIM Record:**
```
Add CNAME records provided by your email service
```

**DMARC Record:**
```
v=DMARC1; p=none; rua=mailto:dmarc@ordax.com.br
```

### 2. Email Content Best Practices

- [ ] Use clear, descriptive subject lines
- [ ] Include plain text version
- [ ] Avoid spam trigger words
- [ ] Include unsubscribe link
- [ ] Use responsive design
- [ ] Test on multiple email clients
- [ ] Keep images optimized
- [ ] Include company contact information

### 3. Sender Reputation

- [ ] Use consistent sender email
- [ ] Warm up new sending domain
- [ ] Monitor bounce rates
- [ ] Handle unsubscribes promptly
- [ ] Maintain clean email list
- [ ] Monitor spam complaints

### 4. Compliance

- [ ] Include physical address
- [ ] Provide unsubscribe option
- [ ] Honor unsubscribe requests within 10 days
- [ ] Include privacy policy link
- [ ] Comply with GDPR/LGPD
- [ ] Get consent for marketing emails

---

## Troubleshooting

### Issue 1: Emails Not Sending

**Check:**
1. Verify environment variables are set correctly
2. Check email service credentials
3. Review Edge Function logs
4. Check email_delivery_logs for errors
5. Verify sender email is verified

**Solution:**
```bash
# Check Edge Function logs
supabase functions logs cron-send-character-choice-reminders --tail

# Test email service connection
node scripts/test-email-connection.js
```

### Issue 2: Emails Going to Spam

**Check:**
1. SPF, DKIM, DMARC records
2. Sender reputation
3. Email content (spam trigger words)
4. Unsubscribe link present

**Solution:**
1. Set up domain authentication
2. Warm up sending domain
3. Review email content
4. Use email testing tools (Mail Tester)

### Issue 3: Slow Email Delivery

**Check:**
1. Email service rate limits
2. Queue processing speed
3. Network latency

**Solution:**
1. Upgrade email service plan
2. Implement batch sending
3. Use email queue system

### Issue 4: Template Variables Not Replacing

**Check:**
1. Template syntax ({{variableName}})
2. Variable names match
3. Template loader function

**Solution:**
```javascript
// Verify template loader
import { loadTemplate } from './email-templates/template-loader';

const html = loadTemplate('character-choice-reminder-first', {
  customerName: 'Test',
  orderNumber: 'TEST-001'
});

console.log(html); // Check if variables are replaced
```

---

## Email Configuration Checklist

### Pre-Configuration
- [ ] Email service provider selected
- [ ] Account created and verified
- [ ] API keys or SMTP credentials obtained
- [ ] Sender email verified
- [ ] Domain configured (production)

### Environment Variables
- [ ] EMAIL_PROVIDER set
- [ ] EMAIL_FROM set
- [ ] EMAIL_FROM_NAME set
- [ ] Service-specific credentials set (API key or SMTP)
- [ ] Variables added to .env file
- [ ] Variables added to deployment platform

### Edge Functions
- [ ] Email functions deployed
- [ ] Secrets configured in Supabase
- [ ] Functions tested manually
- [ ] Logs reviewed for errors

### Templates
- [ ] All templates exist in correct location
- [ ] Templates customized with branding
- [ ] Variables tested and working
- [ ] Responsive design verified
- [ ] Links tested

### Cron Jobs
- [ ] Character choice reminder cron scheduled
- [ ] Character choice expiration cron scheduled
- [ ] Cron jobs are active
- [ ] Cron jobs tested manually

### Testing
- [ ] Test email sent successfully
- [ ] Email received in inbox (not spam)
- [ ] All links work correctly
- [ ] Mobile display verified
- [ ] Template variables replaced correctly

### Deliverability
- [ ] SPF record configured
- [ ] DKIM record configured
- [ ] DMARC record configured
- [ ] Sender reputation monitored
- [ ] Bounce rate acceptable (< 5%)
- [ ] Spam complaint rate acceptable (< 0.1%)

### Monitoring
- [ ] Email delivery logs working
- [ ] Failed emails monitored
- [ ] Delivery statistics reviewed
- [ ] Alerts configured for failures

---

## Sign-Off

**Configured By:** _________________  
**Date:** _________________  
**Environment:** Staging / Production  
**Email Provider:** _________________  
**Result:** PASS / FAIL  
**Notes:** _________________

---

## Next Steps

After email configuration is complete:
1. ✓ Run full integration tests
2. ✓ Monitor email delivery for 24 hours
3. ✓ Deploy to production
4. ✓ Set up monitoring and alerts
5. ✓ Document any custom configurations
