# Shipping Service - Implementation Guide

## Overview

The Shipping Service provides integration with Brazilian shipping carriers for label generation and tracking. Currently implements a **mock/stub** that can be easily replaced with real API integration.

## Current Status: MOCK IMPLEMENTATION

⚠️ **Important**: This is a mock implementation for MVP purposes. All API calls are simulated and return fake data.

### Mock Behavior

- **Label Generation**: Returns fake tracking codes in Correios format (BR123456789BR)
- **Tracking Status**: Returns simulated tracking events
- **Cost Calculation**: Uses simple formula based on weight and destination
- **All operations log `[MOCK]` prefix** to console for easy identification

## Supported Carriers

### Correios (Default)
- Brazilian national postal service
- Most common carrier for domestic shipping
- Service codes:
  - `04014` - SEDEX (express delivery)
  - `04510` - PAC (standard delivery)

### Private Carriers (Future)
- Placeholder for private carrier integration
- Can be extended to support carriers like Jadlog, Total Express, etc.

## Environment Variables

Add these to your `.env` file:

```env
# Shipping Carrier Configuration
VITE_SHIPPING_CARRIER="correios"              # 'correios' | 'private'
VITE_SHIPPING_API_KEY="your-api-key"          # API key for carrier
VITE_SHIPPING_API_URL="https://api.correios.com.br"  # Optional: API base URL
VITE_SHIPPING_CONTRACT_CODE="your-contract"   # Optional: Correios contract code
VITE_SHIPPING_ADMIN_CODE="your-admin-code"    # Optional: Correios admin code
VITE_SHIPPING_SERVICE_CODE="04014"            # Service code (04014=SEDEX, 04510=PAC)
VITE_SHIPPING_MAX_RETRIES=3                   # Max retry attempts
VITE_SHIPPING_RETRY_DELAY=2000                # Delay between retries (ms)
```

## Usage Examples

### Generate Shipping Label

```typescript
import { shippingService } from '@/services/shipping-service';

const label = await shippingService.generateLabel('delivery-id-123', {
  name: 'João Silva',
  street: 'Rua das Flores',
  number: '123',
  complement: 'Apt 45',
  neighborhood: 'Centro',
  city: 'Salvador',
  state: 'BA',
  zipCode: '40000-000',
  phone: '71999999999'
});

console.log('Tracking Code:', label.trackingCode);
console.log('Label URL:', label.labelUrl);
console.log('Shipping Cost:', label.cost);
```

### Get Tracking Status

```typescript
const status = await shippingService.getTrackingStatus('BR123456789BR');

console.log('Status:', status.status);
console.log('Delivered:', status.delivered);
console.log('Events:', status.events);
```

### Calculate Shipping Cost

```typescript
const cost = await shippingService.calculateShippingCost(address, 0.5); // 0.5kg
console.log('Shipping Cost:', cost);
```

### Generate Batch Labels

```typescript
const result = await shippingService.generateBatchLabels([
  'delivery-1',
  'delivery-2',
  'delivery-3'
]);

console.log('Successful:', result.successful.length);
console.log('Failed:', result.failed.length);
```

### Update All Tracking Statuses (Cron Job)

```typescript
const updatedCount = await shippingService.updateTrackingStatuses();
console.log(`Updated ${updatedCount} deliveries`);
```

## Replacing Mock with Real Implementation

To integrate with real Correios API or private carrier:

### 1. Update Correios Methods

Replace the mock implementations in `shipping-service.ts`:

```typescript
// Replace this mock method:
private async generateCorreiosLabel(
  deliveryId: string,
  address: Address,
  cost: number
): Promise<LabelResult> {
  // REPLACE WITH REAL API CALL
  const response = await fetch(`${this.config.apiUrl}/shipments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contract: this.config.contractCode,
      admin_code: this.config.adminCode,
      service_code: this.config.serviceCode,
      destination: {
        name: address.name,
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zip_code: address.zipCode,
        phone: address.phone,
      },
      // ... other required fields
    }),
  });

  const data = await response.json();
  
  return {
    trackingCode: data.tracking_code,
    labelUrl: data.label_url,
    cost: data.cost,
  };
}
```

### 2. Update Tracking Method

```typescript
private async getCorreiosTracking(trackingCode: string): Promise<TrackingStatus> {
  // REPLACE WITH REAL API CALL
  const response = await fetch(
    `${this.config.apiUrl}/tracking/${trackingCode}`,
    {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    }
  );

  const data = await response.json();
  
  return {
    trackingCode: data.tracking_code,
    status: this.mapStatus(data.status),
    statusDescription: data.status_description,
    lastUpdate: new Date(data.last_update),
    delivered: data.delivered,
    deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
    events: data.events.map((event: any) => ({
      date: new Date(event.date),
      location: event.location,
      description: event.description,
      status: event.status,
    })),
  };
}
```

### 3. Add Status Mapping

```typescript
private mapStatus(apiStatus: string): TrackingStatus['status'] {
  const statusMap: Record<string, TrackingStatus['status']> = {
    'posted': 'pending',
    'in_transit': 'in_transit',
    'out_for_delivery': 'out_for_delivery',
    'delivered': 'delivered',
    'failed': 'failed',
    'returned': 'returned',
  };
  
  return statusMap[apiStatus] || 'pending';
}
```

### 4. Add Error Handling

```typescript
private async callCarrierAPI<T>(
  url: string,
  options: RequestInit
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < this.config.maxRetries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, this.config.retryDelay)
        );
      }
    }
  }
  
  throw new ShippingServiceError(
    `Failed after ${this.config.maxRetries} attempts: ${lastError?.message}`,
    'API_CALL_FAILED',
    false
  );
}
```

## Correios API Documentation

### Official Resources

- **Correios Web Services**: https://www.correios.com.br/atendimento/developers
- **API Documentation**: Contact Correios for access to official API docs
- **Contract Required**: You need a commercial contract with Correios to use their API

### Common Endpoints

- **Create Shipment**: `POST /shipments`
- **Get Tracking**: `GET /tracking/{code}`
- **Calculate Shipping**: `POST /calculate`
- **Print Label**: `GET /labels/{code}`

### Authentication

Correios typically uses:
- Contract code + Admin code
- Or OAuth 2.0 token-based authentication

## Testing

Run the test suite:

```bash
npm test -- src/services/__tests__/shipping-service.test.ts
```

### Test Coverage

- ✅ Label generation with valid address
- ✅ Address validation (zip code, state, required fields)
- ✅ Tracking status retrieval
- ✅ Cost calculation with regional surcharges
- ✅ Batch label generation
- ✅ Error handling with retry logic
- ✅ All 27 Brazilian state codes
- ✅ Mock implementation indicators

## Integration Checklist

When replacing mock with real implementation:

- [ ] Obtain Correios API credentials (contract code, admin code, API key)
- [ ] Update environment variables with real credentials
- [ ] Replace `generateCorreiosLabel` method with real API call
- [ ] Replace `getCorreiosTracking` method with real API call
- [ ] Implement proper error handling and retry logic
- [ ] Add API response validation
- [ ] Test with real addresses and tracking codes
- [ ] Update cost calculation to use real API pricing
- [ ] Implement label PDF storage in Supabase Storage
- [ ] Add logging for API calls and errors
- [ ] Update tests to use API mocks instead of service mocks
- [ ] Document any API-specific requirements or limitations

## Database Schema

The service expects these fields in `subscription_deliveries` table:

```sql
tracking_code TEXT,
status TEXT,
actual_delivery_date TIMESTAMPTZ,
updated_at TIMESTAMPTZ
```

## Cron Job Integration

For automatic tracking updates, set up a cron job:

```typescript
// In supabase/functions/cron-update-tracking/index.ts
import { shippingService } from '@/services/shipping-service';

export async function handler() {
  const updatedCount = await shippingService.updateTrackingStatuses();
  console.log(`Updated ${updatedCount} deliveries`);
}
```

Schedule to run daily:
```sql
SELECT cron.schedule(
  'update-tracking',
  '0 10 * * *',  -- Run at 10:00 AM daily
  'SELECT net.http_post(...)'
);
```

## Error Codes

The service uses these error codes:

- `DELIVERY_NOT_FOUND` - Delivery ID not found in database
- `INVALID_ADDRESS` - Missing required address fields
- `INVALID_ZIP_CODE` - Invalid Brazilian CEP format
- `INVALID_STATE` - Invalid Brazilian state code
- `INVALID_WEIGHT` - Weight must be greater than 0
- `INVALID_TRACKING_CODE` - Empty or invalid tracking code
- `LABEL_GENERATION_FAILED` - Failed to generate shipping label
- `TRACKING_QUERY_FAILED` - Failed to query tracking status
- `COST_CALCULATION_FAILED` - Failed to calculate shipping cost
- `BATCH_UPDATE_FAILED` - Failed to update tracking statuses

## Support

For questions or issues:
1. Check the mock implementation logs (look for `[MOCK]` prefix)
2. Review test cases for usage examples
3. Consult Correios API documentation
4. Contact the development team

## Future Enhancements

- [ ] Support for multiple carriers (Jadlog, Total Express, etc.)
- [ ] International shipping support
- [ ] Real-time tracking webhooks
- [ ] Automatic label printing
- [ ] Shipping insurance integration
- [ ] Delivery scheduling preferences
- [ ] Package dimensions and weight validation
- [ ] Shipping cost optimization (compare carriers)
