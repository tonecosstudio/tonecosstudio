# Cron Job: Tracking Status Updater

## Overview

This cron job automatically checks with shipping carriers for delivery status updates and updates the database accordingly. It runs daily to poll carrier APIs for all shipped deliveries that have tracking codes.

## Requirements

**Validates:**
- Requirement 18.6: Poll carrier API daily for tracking status updates
- Requirement 18.7: Update delivery status automatically when marked as delivered by carrier

## Functionality

### What It Does

1. **Finds Shipped Deliveries**: Queries all deliveries with `status = 'shipped'` AND `tracking_code IS NOT NULL`
2. **Checks Carrier API**: For each delivery, calls the shipping carrier API to get current tracking status
3. **Updates Status**: If delivered, updates delivery status to `'delivered'` and sets `actual_delivery_date`
4. **Logs Everything**: Records all updates and errors in the cron job logs

### Delivery Status Flow

```
shipped → (carrier API check) → delivered
```

When a delivery is marked as delivered:
- `status` changes from `'shipped'` to `'delivered'`
- `actual_delivery_date` is set to the delivery timestamp from carrier
- `updated_at` is updated to current timestamp

## Mock Implementation

**IMPORTANT**: The current implementation uses a **mock carrier API** for development and testing purposes.

### Mock Behavior

The `getTrackingStatusFromCarrier()` function currently:
- Simulates API call delays
- Returns mock tracking statuses based on tracking code pattern
- Does NOT make real API calls

### Production Integration

To integrate with real carrier APIs, replace the mock function with actual API calls to:

#### Correios (Brazilian Post)
- API Documentation: https://www.correios.com.br/enviar/rastreamento
- Requires: API credentials, tracking code format validation
- Returns: Detailed tracking events with timestamps and locations

#### Private Carriers
- **Jadlog**: https://www.jadlog.com.br/tracking
- **Total Express**: https://www.totalexpress.com.br/rastreamento
- **Azul Cargo**: https://www.azulcargoexpress.com.br/rastreamento

### Integration Example

```typescript
async function getTrackingStatusFromCarrier(trackingCode: string): Promise<TrackingStatus> {
  const carrierApiUrl = Deno.env.get('CARRIER_API_URL');
  const carrierApiKey = Deno.env.get('CARRIER_API_KEY');
  
  const response = await fetch(`${carrierApiUrl}/tracking/${trackingCode}`, {
    headers: {
      'Authorization': `Bearer ${carrierApiKey}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Carrier API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    trackingCode,
    status: mapCarrierStatus(data.status),
    deliveredAt: data.delivered_at,
    lastUpdate: data.last_update,
    location: data.current_location,
    events: data.events.map(e => ({
      date: e.timestamp,
      description: e.description,
      location: e.location,
    })),
  };
}
```

## Scheduling

This function should be scheduled to run daily. The recommended schedule is:

```sql
-- Run daily at 08:00 Bahia Time (11:00 UTC)
SELECT cron.schedule(
  'update-tracking-status',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/cron-update-tracking',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

## Error Handling

The cron job implements robust error handling:

1. **Individual Delivery Errors**: If one delivery fails, others continue processing
2. **Error Logging**: All errors are logged to `cron_job_logs` table
3. **Partial Success**: Job completes successfully even if some deliveries fail
4. **Admin Alerts**: Critical failures trigger email alerts to administrators

## Logging

Uses the shared `cron-logger` utility:

```typescript
import { logCronStart, logCronSuccess, logCronError } from "../_shared/cron-logger.ts";
```

### Log Details

Success logs include:
- `deliveriesChecked`: Number of deliveries checked
- `deliveriesUpdated`: Number of deliveries updated to delivered
- `errors`: Array of any individual delivery errors
- `timestamp`: Execution timestamp in Bahia time

## Testing

### Manual Testing

You can manually trigger the cron job for testing:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/cron-update-tracking \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Test Scenarios

1. **No Shipped Deliveries**: Should complete successfully with 0 deliveries checked
2. **Deliveries Without Tracking**: Should be ignored (not queried)
3. **Carrier API Failure**: Should log error and continue with other deliveries
4. **Delivered Status**: Should update delivery status and set actual_delivery_date

## Database Schema

### Required Tables

- `subscription_deliveries`: Main deliveries table
  - `id`: UUID primary key
  - `tracking_code`: Tracking code from carrier
  - `status`: Current delivery status
  - `actual_delivery_date`: Timestamp when delivered
  - `updated_at`: Last update timestamp

- `cron_job_logs`: Logging table (created in task 12.1)

### Required Indexes

```sql
CREATE INDEX idx_deliveries_tracking ON subscription_deliveries(tracking_code);
CREATE INDEX idx_deliveries_status ON subscription_deliveries(status);
```

## Environment Variables

Required environment variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For production carrier API integration:
CARRIER_API_URL=https://api.carrier.com
CARRIER_API_KEY=your-carrier-api-key
```

## Dependencies

- `@supabase/supabase-js@2`: Supabase client
- `../shared/cron-logger.ts`: Logging utilities
- `../shared/timezone.ts`: Bahia timezone utilities

## Related Functions

- `cron-create-deliveries`: Creates delivery records
- `cron-reveal-characters`: Reveals collection characters
- `cron-transition-cycles`: Manages cycle transitions
- `cron-check-balance-deadlines`: Checks standalone purchase balance deadlines

## Future Enhancements

1. **Multi-Carrier Support**: Handle different carrier APIs based on delivery
2. **Retry Logic**: Implement exponential backoff for failed API calls
3. **Rate Limiting**: Respect carrier API rate limits
4. **Webhook Integration**: Use carrier webhooks instead of polling
5. **Notification System**: Send notifications to customers when delivered
6. **Tracking History**: Store full tracking event history in database
