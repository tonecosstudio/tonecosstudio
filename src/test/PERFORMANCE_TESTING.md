# Performance Testing Guide

## Overview

This document describes how to run performance tests for the Production Management System. These tests validate that the system meets the performance requirements specified in the requirements document.

## Performance Requirements

The system must meet the following performance criteria:

1. **Dashboard Load Time**: < 2 seconds with 1000 items (Requirement 3.1.1)
2. **Real-Time Updates**: Updates appear within 5 seconds (Requirement 3.1.2)
3. **Concurrent Users**: Support 100 concurrent users without degradation (Requirement 3.1.3)
4. **Data Volume**: Handle 50,000 active production items (Requirement 3.2.1)

## Test Suites

### 1. Dashboard Load with 1000 Items
- Tests dashboard loading performance with 1000 production items
- Validates filtering, searching, and pagination performance
- Validates metrics loading performance

### 2. Concurrent Updates from 100 Users
- Simulates 100 concurrent users performing updates
- Tests stage updates, assignments, and dashboard queries
- Validates system stability under load

### 3. Real-Time Update Latency
- Tests Supabase Realtime subscription latency
- Validates that updates appear within 5 seconds

### 4. Database Query Performance with 50k Records
- Tests query performance with large datasets
- Validates index effectiveness
- Tests complex filtered queries

### 5. Bulk Operations Performance
- Tests bulk updates, queries, and deletes
- Validates batch operation efficiency

### 6. Index Performance
- Validates that database indexes are working correctly
- Tests queries on indexed columns

## Running Performance Tests

### Prerequisites

1. **Test Database**: Performance tests should run against a test database, not production
2. **Authentication**: You must be authenticated with a test user account
3. **Test Data**: Some tests create their own data, but the 50k records test assumes pre-existing data

### Environment Setup

Set the environment variable to enable performance tests:

```bash
export VITEST_PERFORMANCE=true
```

Or on Windows:

```powershell
$env:VITEST_PERFORMANCE="true"
```

### Running All Performance Tests

```bash
npm run test -- src/test/production-performance.test.ts
```

Or with Vitest directly:

```bash
npx vitest run src/test/production-performance.test.ts
```

### Running Specific Test Suites

Run only dashboard load tests:

```bash
npx vitest run src/test/production-performance.test.ts -t "Dashboard Load"
```

Run only concurrent update tests:

```bash
npx vitest run src/test/production-performance.test.ts -t "Concurrent Updates"
```

### Running in Watch Mode

For development, you can run tests in watch mode:

```bash
npx vitest src/test/production-performance.test.ts
```

## Test Data Management

### Automatic Cleanup

All tests automatically clean up their test data in the `afterAll` hook. However, if a test fails or is interrupted, some test data may remain in the database.

### Manual Cleanup

To manually clean up test data:

```sql
-- Delete test production queue items
DELETE FROM production_queue 
WHERE customer_name LIKE 'Test Customer%';

-- Delete test collections
DELETE FROM collections 
WHERE name = 'Performance Test Collection';
```

### Pre-populating Data for 50k Test

For the most accurate 50k records test, pre-populate your test database:

```bash
# Run the data generation script (create this script as needed)
npm run generate-test-data -- --count 50000
```

Or use SQL:

```sql
-- Example: Generate 50k test records
-- (Adjust based on your schema and requirements)
INSERT INTO production_queue (
  order_id, order_type, customer_id, customer_name, customer_email,
  collection_id, collection_name, production_status, current_stage,
  choice_status, priority, priority_score
)
SELECT 
  'test-order-' || generate_series,
  CASE WHEN generate_series % 2 = 0 THEN 'subscription_delivery' ELSE 'standalone_purchase' END,
  'test-user-id',
  'Test Customer ' || generate_series,
  'test' || generate_series || '@example.com',
  'test-collection-id',
  'Test Collection',
  CASE generate_series % 3 
    WHEN 0 THEN 'awaiting_choice'
    WHEN 1 THEN 'ready_for_production'
    ELSE 'in_production'
  END,
  CASE generate_series % 5
    WHEN 0 THEN 'awaiting_choice'
    WHEN 1 THEN 'design'
    WHEN 2 THEN 'production'
    WHEN 3 THEN 'quality_check'
    ELSE 'packaging'
  END,
  CASE generate_series % 3
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'submitted'
    ELSE 'approved'
  END,
  CASE generate_series % 4
    WHEN 0 THEN 'critical'
    WHEN 1 THEN 'high'
    WHEN 2 THEN 'normal'
    ELSE 'low'
  END,
  100 - (generate_series % 100)
FROM generate_series(1, 50000);
```

## Performance Thresholds

The tests use the following performance thresholds:

| Metric | Threshold | Requirement |
|--------|-----------|-------------|
| Dashboard Load (1000 items) | 2000ms | 3.1.1 |
| Dashboard Load (50k items) | 5000ms | 3.2.1 |
| Metrics Load | 1000ms | 3.1.1 |
| Concurrent Updates (100 users) | 10000ms | 3.1.3 |
| Real-Time Update Latency | 5000ms | 3.1.2 |
| Individual Query | 500ms | General |

## Interpreting Results

### Successful Test

```
✓ should load dashboard with 1000 items in < 2 seconds (1234ms)
  Dashboard load time (1000 items): 1234.56ms
  Loaded 50 items (page 1 of 20)
  Total items: 1000
```

### Failed Test

```
✗ should load dashboard with 1000 items in < 2 seconds (2345ms)
  Dashboard load time (1000 items): 2345.67ms
  Expected: ≤ 2000
  Received: 2345.67
```

If a test fails, consider:

1. **Database Indexes**: Verify all required indexes are created
2. **Network Latency**: Check connection to Supabase
3. **Database Load**: Ensure test database is not under heavy load
4. **Query Optimization**: Review query plans for slow queries
5. **Hardware**: Ensure test machine has adequate resources

## Continuous Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *' # Run daily at 2 AM
  workflow_dispatch: # Allow manual trigger

jobs:
  performance:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run performance tests
        env:
          VITEST_PERFORMANCE: true
          VITE_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
        run: npm run test -- src/test/production-performance.test.ts
        
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: test-results/
```

## Troubleshooting

### Tests are Skipped

If you see "SKIP" for all tests, ensure the environment variable is set:

```bash
echo $VITEST_PERFORMANCE  # Should output "true"
```

### Authentication Errors

Ensure you're authenticated before running tests:

```typescript
// In your test setup or before running tests
await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'test-password'
});
```

### Timeout Errors

If tests timeout, increase the test timeout in vitest.config.ts:

```typescript
export default defineConfig({
  test: {
    testTimeout: 60000, // 60 seconds
  },
});
```

### Memory Issues

For large dataset tests, you may need to increase Node.js memory:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run test
```

## Best Practices

1. **Run on Dedicated Test Database**: Never run performance tests on production
2. **Consistent Environment**: Run tests in a consistent environment for comparable results
3. **Baseline Metrics**: Establish baseline performance metrics and track changes over time
4. **Regular Execution**: Run performance tests regularly (e.g., nightly) to catch regressions
5. **Monitor Trends**: Track performance metrics over time to identify degradation
6. **Realistic Data**: Use realistic test data that matches production patterns

## Related Documentation

- [Requirements Document](../../.kiro/specs/production-management-system/requirements.md)
- [Design Document](../../.kiro/specs/production-management-system/design.md)
- [Tasks Document](../../.kiro/specs/production-management-system/tasks.md)
