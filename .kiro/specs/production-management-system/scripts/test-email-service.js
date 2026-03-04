#!/usr/bin/env node

/**
 * Email Service Testing Script
 * 
 * This script tests the email service configuration for the Production Management System.
 * It verifies that emails can be sent successfully and templates are working correctly.
 * 
 * Usage:
 *   node test-email-service.js [test-email@example.com]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL = process.argv[2] || 'test@example.com';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logHeader(message) {
  log('\n' + '='.repeat(80), 'cyan');
  log(message, 'cyan');
  log('='.repeat(80), 'cyan');
}

// Initialize Supabase client
function initializeSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    logError('Missing Supabase credentials in environment variables');
    logInfo('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Test 1: Check environment variables
async function testEnvironmentVariables() {
  logHeader('Test 1: Environment Variables');

  const requiredVars = [
    'VITE_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'VITE_EMAIL_PROVIDER',
    'VITE_EMAIL_FROM',
    'VITE_EMAIL_FROM_NAME'
  ];

  let allPresent = true;

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      logSuccess(`${varName} is set`);
    } else {
      logError(`${varName} is missing`);
      allPresent = false;
    }
  }

  // Check provider-specific variables
  const provider = process.env.VITE_EMAIL_PROVIDER;
  logInfo(`Email provider: ${provider}`);

  if (provider === 'smtp') {
    const smtpVars = ['VITE_SMTP_HOST', 'VITE_SMTP_PORT', 'VITE_SMTP_USER', 'VITE_SMTP_PASSWORD'];
    for (const varName of smtpVars) {
      if (process.env[varName]) {
        logSuccess(`${varName} is set`);
      } else {
        logError(`${varName} is missing`);
        allPresent = false;
      }
    }
  } else if (provider === 'sendgrid') {
    if (process.env.VITE_SENDGRID_API_KEY) {
      logSuccess('VITE_SENDGRID_API_KEY is set');
    } else {
      logError('VITE_SENDGRID_API_KEY is missing');
      allPresent = false;
    }
  }

  return allPresent;
}

// Test 2: Check email templates
async function testEmailTemplates() {
  logHeader('Test 2: Email Templates');

  const templates = [
    'character-choice-reminder-first.html',
    'character-choice-reminder-second.html',
    'character-choice-reminder-final.html',
    'admin-expiration-notice.html'
  ];

  const fs = await import('fs');
  const path = await import('path');
  const templateDir = path.join(process.cwd(), 'src/services/notifications/email-templates');

  let allExist = true;

  for (const template of templates) {
    const templatePath = path.join(templateDir, template);
    if (fs.existsSync(templatePath)) {
      logSuccess(`Template found: ${template}`);
    } else {
      logError(`Template missing: ${template}`);
      allExist = false;
    }
  }

  return allExist;
}

// Test 3: Check Edge Functions
async function testEdgeFunctions(supabase) {
  logHeader('Test 3: Edge Functions');

  try {
    // Test character choice reminder function
    logInfo('Testing cron-send-character-choice-reminders...');
    const { data: reminderData, error: reminderError } = await supabase.functions.invoke(
      'cron-send-character-choice-reminders',
      { body: {} }
    );

    if (reminderError) {
      logWarning(`Reminder function error: ${reminderError.message}`);
    } else {
      logSuccess('Reminder function is accessible');
    }

    // Test character choice expiration function
    logInfo('Testing cron-expire-character-choices...');
    const { data: expirationData, error: expirationError } = await supabase.functions.invoke(
      'cron-expire-character-choices',
      { body: {} }
    );

    if (expirationError) {
      logWarning(`Expiration function error: ${expirationError.message}`);
    } else {
      logSuccess('Expiration function is accessible');
    }

    return true;
  } catch (error) {
    logError(`Edge function test failed: ${error.message}`);
    return false;
  }
}

// Test 4: Send test email
async function sendTestEmail(supabase) {
  logHeader('Test 4: Send Test Email');

  logInfo(`Sending test email to: ${TEST_EMAIL}`);

  const testData = {
    to: TEST_EMAIL,
    subject: 'Test Email - Production Management System',
    template: 'character-choice-reminder-first',
    variables: {
      customerName: 'Test User',
      orderNumber: 'TEST-001',
      collectionName: 'Test Collection',
      deadline: '2024-12-31',
      daysRemaining: 5,
      choiceUrl: 'https://ordax.com.br/test'
    }
  };

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: testData
    });

    if (error) {
      logError(`Failed to send test email: ${error.message}`);
      return false;
    }

    logSuccess('Test email sent successfully');
    logInfo('Please check your inbox (and spam folder)');
    return true;
  } catch (error) {
    logError(`Test email failed: ${error.message}`);
    return false;
  }
}

// Test 5: Check email delivery logs
async function checkEmailLogs(supabase) {
  logHeader('Test 5: Email Delivery Logs');

  try {
    const { data, error } = await supabase
      .from('email_delivery_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      logWarning(`Could not fetch email logs: ${error.message}`);
      return false;
    }

    if (data && data.length > 0) {
      logSuccess(`Found ${data.length} recent email logs`);
      
      // Show statistics
      const statusCounts = data.reduce((acc, log) => {
        acc[log.status] = (acc[log.status] || 0) + 1;
        return acc;
      }, {});

      logInfo('Recent email statistics:');
      for (const [status, count] of Object.entries(statusCounts)) {
        log(`  ${status}: ${count}`, status === 'sent' ? 'green' : 'yellow');
      }

      // Show failed emails
      const failed = data.filter(log => log.status === 'failed');
      if (failed.length > 0) {
        logWarning(`${failed.length} failed emails found:`);
        failed.forEach(log => {
          log(`  - ${log.recipient_email}: ${log.error_message}`, 'red');
        });
      }

      return true;
    } else {
      logInfo('No email logs found (this is normal for new installations)');
      return true;
    }
  } catch (error) {
    logWarning(`Email logs check failed: ${error.message}`);
    return false;
  }
}

// Test 6: Check cron jobs
async function checkCronJobs(supabase) {
  logHeader('Test 6: Cron Jobs');

  try {
    const { data, error } = await supabase.rpc('get_cron_jobs');

    if (error) {
      // Try alternative query
      const { data: cronData, error: cronError } = await supabase
        .from('cron.job')
        .select('*')
        .like('jobname', '%character_choice%');

      if (cronError) {
        logWarning('Could not check cron jobs (may require admin access)');
        return false;
      }

      data = cronData;
    }

    if (data && data.length > 0) {
      logSuccess(`Found ${data.length} cron jobs`);
      data.forEach(job => {
        const status = job.active ? 'ACTIVE' : 'INACTIVE';
        const color = job.active ? 'green' : 'red';
        log(`  - ${job.jobname}: ${status} (${job.schedule})`, color);
      });
      return true;
    } else {
      logWarning('No cron jobs found');
      logInfo('Run the migration scripts to set up cron jobs');
      return false;
    }
  } catch (error) {
    logWarning(`Cron jobs check failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  logHeader('Production Management System - Email Service Test');
  logInfo(`Test email: ${TEST_EMAIL}`);
  logInfo(`Timestamp: ${new Date().toISOString()}`);

  const supabase = initializeSupabase();

  const results = {
    environmentVariables: await testEnvironmentVariables(),
    emailTemplates: await testEmailTemplates(),
    edgeFunctions: await testEdgeFunctions(supabase),
    testEmail: await sendTestEmail(supabase),
    emailLogs: await checkEmailLogs(supabase),
    cronJobs: await checkCronJobs(supabase)
  };

  // Summary
  logHeader('Test Summary');

  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;

  for (const [test, result] of Object.entries(results)) {
    const status = result ? 'PASSED' : 'FAILED';
    const color = result ? 'green' : 'red';
    log(`${test}: ${status}`, color);
  }

  log('\n' + '='.repeat(80), 'cyan');
  log(`Results: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  log('='.repeat(80), 'cyan');

  if (passed === total) {
    logSuccess('All tests passed! Email service is configured correctly.');
  } else {
    logWarning('Some tests failed. Please review the output above.');
  }

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  logError(`Test runner failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
