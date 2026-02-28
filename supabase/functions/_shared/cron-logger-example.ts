/**
 * Example usage of cron-logger utility
 * 
 * This file demonstrates how to use the cron job logging functions
 * in your cron job implementations.
 */

import { logCronStart, logCronSuccess, logCronError } from './cron-logger.ts';

/**
 * Example 1: Basic cron job with success logging
 */
async function exampleSuccessfulCronJob() {
  let logId: string | undefined;

  try {
    // Start logging the cron job execution
    logId = await logCronStart('example-successful-job');

    // Your cron job logic here
    console.log('Executing cron job logic...');
    await performSomeTask();

    // Mark as successful with optional execution details
    await logCronSuccess(logId, {
      recordsProcessed: 42,
      duration: '2.5s',
    });

    console.log('Cron job completed successfully');
  } catch (error) {
    console.error('Cron job failed:', error);
    
    // If we have a log ID, mark it as failed
    if (logId) {
      await logCronError(logId, error as Error, {
        recordsProcessed: 10,
        failedAt: 'data validation',
      });
    }
    
    throw error;
  }
}

/**
 * Example 2: Cron job with error handling
 */
async function exampleFailingCronJob() {
  let logId: string | undefined;

  try {
    // Start logging
    logId = await logCronStart('example-failing-job', {
      scheduledTime: new Date().toISOString(),
    });

    // Simulate some work
    await performSomeTask();

    // Simulate an error
    throw new Error('Database connection failed');

  } catch (error) {
    console.error('Cron job encountered an error:', error);
    
    // Log the error and send alert to admins
    if (logId) {
      await logCronError(logId, error as Error, {
        context: 'database operation',
        attemptedRetries: 3,
      });
    }
    
    // Re-throw if you want the cron job to be marked as failed in pg_cron
    throw error;
  }
}

/**
 * Example 3: Cron job with multiple steps
 */
async function exampleMultiStepCronJob() {
  let logId: string | undefined;

  try {
    logId = await logCronStart('example-multi-step-job');

    // Step 1: Fetch data
    console.log('Step 1: Fetching data...');
    const data = await fetchData();

    // Step 2: Process data
    console.log('Step 2: Processing data...');
    const processed = await processData(data);

    // Step 3: Save results
    console.log('Step 3: Saving results...');
    await saveResults(processed);

    // Log success with details about each step
    await logCronSuccess(logId, {
      steps: {
        fetch: { records: data.length },
        process: { processed: processed.length },
        save: { saved: processed.length },
      },
      totalDuration: '5.2s',
    });

  } catch (error) {
    if (logId) {
      await logCronError(logId, error as Error, {
        failedStep: determineFailedStep(error),
      });
    }
    throw error;
  }
}

/**
 * Example 4: Using in a pg_cron scheduled job
 * 
 * This is how you would use the logger in an actual pg_cron job definition:
 * 
 * ```sql
 * SELECT cron.schedule(
 *   'daily-delivery-creation',
 *   '1 0 * * *',  -- Run at 00:01 daily
 *   $$
 *   SELECT net.http_post(
 *     url := 'https://your-project.supabase.co/functions/v1/create-deliveries',
 *     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
 *     body := '{}'::jsonb
 *   );
 *   $$
 * );
 * ```
 * 
 * And in your Edge Function (create-deliveries/index.ts):
 */
async function exampleEdgeFunctionWithCronLogger() {
  let logId: string | undefined;

  try {
    // Start logging
    logId = await logCronStart('daily-delivery-creation');

    // Your delivery creation logic
    const deliveries = await createScheduledDeliveries();

    // Log success
    await logCronSuccess(logId, {
      deliveriesCreated: deliveries.length,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, deliveries: deliveries.length }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    if (logId) {
      await logCronError(logId, error as Error);
    }

    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Helper functions (mock implementations)
async function performSomeTask() {
  await new Promise(resolve => setTimeout(resolve, 100));
}

async function fetchData() {
  return [1, 2, 3, 4, 5];
}

async function processData(data: number[]) {
  return data.map(x => x * 2);
}

async function saveResults(data: number[]) {
  console.log('Saving:', data);
}

function determineFailedStep(error: Error): string {
  if (error.message.includes('fetch')) return 'fetch';
  if (error.message.includes('process')) return 'process';
  if (error.message.includes('save')) return 'save';
  return 'unknown';
}

async function createScheduledDeliveries() {
  // Mock implementation
  return [{ id: '1' }, { id: '2' }];
}

// Export examples for reference
export {
  exampleSuccessfulCronJob,
  exampleFailingCronJob,
  exampleMultiStepCronJob,
  exampleEdgeFunctionWithCronLogger,
};
