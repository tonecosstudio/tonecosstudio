# Performance Tests - Manual Payment System

## Overview

This document describes the performance tests for the Manual Payment System, implemented as part of Task 29.2.

## Test Coverage

The performance tests validate the following requirements (18.1-18.15):

### 1. Dashboard Load Performance
- **Requirement 18.1**: Dashboard loads in ≤ 2 seconds with 100 pending payments
- Tests dashboard query performance with 100+ payments
- Tests filter application efficiency
- Tests search by reference number

### 2. Payment Details Load Performance
- **Requirement 18.2**: Payment details view loads in ≤ 1 second
- Tests loading payment with all related data (files, audit logs, etc.)
- Tests audit trail query performance

### 3. File Upload Performance
- **Requirement 18.3**: 5MB file uploads and processes in ≤ 10 seconds
- Tests maximum file size upload (5MB)
- Tests multiple sequential file uploads
- Tests file storage and database record creation

### 4. Pagination Performance
- **Requirement 18.5**: Pagination: 25 items per page
- Tests pagination limit enforcement
- Tests second page load efficiency
- Tests total count query performance

### 5. Concurrent Operations
- **Requirement 18.15**: Handle 50 concurrent file uploads without degradation
- Tests 50 concurrent file uploads
- Tests concurrent status updates
- Measures average time per operation

### 6. Bulk Operations
- Tests bulk status updates on 50+ payments
- Tests bulk queries
- Tests bulk delete operations

### 7. Database Index Performance
- **Requirement 18.8**: Database indexes on payment_id, user_id, status, created_at, payment_method_id
- Tests query performance for each indexed field
- Validates index effectiveness

### 8. React Query Caching
- **Requirement 18.7**: React Query caching (5 minutes for payment methods)
- Demonstrates cache benefit for repeated queries

### 9. Load Testing
- Simulates 100 concurrent users querying dashboard
- Tests mixed concurrent operations (queries, counts, filters)

## Running the Tests

### Prerequisites

1. **Test Database**: You need a Supabase test database with:
   - All migrations applied
   - Test user authenticated
   - Payment methods configured

2. **Environment Setup**: Set the environment variable to enable performance tests:
   ```bash
   export VITEST_PERFORMANCE=true
   ```

### Running All Performance Tests

```bash
# Set environment variable
export VITEST_PERFORMANCE=true

# Run performance tests
npm run test -- src/test/performance.test.ts
```

### Running Specific Test Suites

```bash
# Dashboard performance only
npm run test -- src/test/performance.test.ts -t "Dashboard Load"

# File upload performance only
npm run test -- src/test/performance.test.ts -t "File Upload"

# Concurrent operations only
npm run test -- src/test/performance.test.ts -t "Concurrent"
```

## Performance Thresholds

The tests use the following performance thresholds:

| Metric | Threshold | Requirement |
|--------|-----------|-------------|
| Dashboard Load | 2000ms | 18.1 |
| Payment Details Load | 1000ms | 18.2 |
| File Upload (5MB) | 10000ms | 18.3 |
| Pagination Limit | 25 items | 18.5 |
| Concurrent Uploads | 50 uploads | 18.15 |

## Test Data Management

The tests automatically:
- Create test data before each test suite
- Clean up test data after each test suite
- Use unique identifiers to avoid conflicts

**Important**: These tests create and delete data in the database. Always run against a test database, never production!

## Interpreting Results

### Success Criteria

Tests pass if:
- All operations complete within threshold times
- No errors occur during concurrent operations
- Database indexes provide expected performance benefits
- Pagination limits are enforced correctly

### Performance Metrics

Each test logs:
- Execution duration in milliseconds
- Number of items processed
- Average time per operation (for bulk/concurrent tests)

Example output:
```
Dashboard load time: 1234.56ms
Loaded 100 payments
✓ should load dashboard with 100 pending payments in ≤ 2 seconds
```

## Troubleshooting

### Tests are Skipped

If you see "SKIPPED" for all tests:
- Ensure `VITEST_PERFORMANCE=true` is set
- Check that the environment variable is exported in your shell

### Tests Fail Due to Timeout

If tests timeout:
- Check your database connection
- Verify indexes are created (run migrations)
- Check network latency to Supabase
- Consider increasing thresholds for slower environments

### Authentication Errors

If you see "No authenticated user" errors:
- Ensure you're authenticated with Supabase
- Check your `.env` file has correct Supabase credentials
- Verify the test user has appropriate permissions

### Performance Below Threshold

If tests fail performance thresholds:
1. **Check Database Indexes**: Run `EXPLAIN ANALYZE` on slow queries
2. **Network Latency**: Test from a location closer to your Supabase region
3. **Database Load**: Ensure test database isn't under heavy load
4. **Connection Pooling**: Verify Supabase connection pooling is configured

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *' # Run nightly
  workflow_dispatch: # Allow manual trigger

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run performance tests
        env:
          VITEST_PERFORMANCE: true
          VITE_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
        run: npm run test -- src/test/performance.test.ts
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: test-results/
```

## Best Practices

1. **Run Regularly**: Schedule performance tests to run nightly or weekly
2. **Track Trends**: Monitor performance over time to catch regressions
3. **Isolate Tests**: Run performance tests separately from unit tests
4. **Use Test Data**: Always use dedicated test data, never production data
5. **Clean Environment**: Ensure consistent test environment for reliable results
6. **Document Changes**: If thresholds need adjustment, document why

## Related Documentation

- [Requirements Document](../../.kiro/specs/manual-payment-system/requirements.md) - See Requirement 18
- [Design Document](../../.kiro/specs/manual-payment-system/design.md) - Performance architecture
- [E2E Integration Tests](./E2E_INTEGRATION_TESTS.md) - Functional testing
- [Database Optimizations](../../docs/database-optimizations.md) - Index and query optimization

## Support

If you encounter issues with performance tests:
1. Check this documentation first
2. Review test logs for specific error messages
3. Verify database indexes are created
4. Check Supabase dashboard for query performance
5. Contact the development team for assistance
