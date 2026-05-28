# TrackingCard Component

## Overview

The `TrackingCard` component displays shipping tracking information for customer orders. It provides a user-friendly interface to view tracking codes, carrier information, and estimated delivery dates, with quick actions to copy the tracking code or open the carrier's tracking page.

## Requirements

- **Requirement 2.4.4**: Order Tracking
  - AC1: Display tracking code once available ✅
  - AC2: Link to carrier tracking page ✅
  - AC3: Show shipping carrier name ✅
  - AC4: Display estimated delivery date from carrier ✅
  - AC5: Show delivery confirmation when received (handled by parent component)

## Task

- **Task 5.3.1**: Create TrackingCard component
  - Display tracking code ✅
  - Add "Copy" button for tracking code ✅
  - Link to carrier tracking page ✅
  - Show carrier name and logo ✅
  - Display estimated delivery date ✅

## Features

### Core Functionality

1. **Tracking Code Display**
   - Shows tracking code in monospace font for easy reading
   - Includes copy-to-clipboard button
   - Shows toast notification on successful copy

2. **Carrier Information**
   - Displays carrier name with emoji logo
   - Supports multiple carriers (Correios, Jadlog, Sedex)
   - Falls back to generic carrier display

3. **Estimated Delivery Date**
   - Shows formatted delivery date in Portuguese
   - Uses date-fns for localization

4. **Quick Actions**
   - Copy tracking code button
   - "Track Order" button that opens carrier website in new tab
   - Carrier-specific tracking URLs

5. **Empty State**
   - Shows placeholder when tracking code is not yet available
   - Provides helpful message to customer

## Props

```typescript
interface TrackingCardProps {
  trackingCode: string | null;          // Tracking code from carrier
  trackingCarrier: string | null;       // Carrier name (correios, jadlog, sedex)
  estimatedDeliveryDate: string | null; // ISO date string
  className?: string;                   // Optional CSS classes
}
```

## Usage

### Basic Usage

```tsx
import { TrackingCard } from "@/components/customer/TrackingCard";

function OrderPage() {
  return (
    <TrackingCard
      trackingCode="BR123456789BR"
      trackingCarrier="correios"
      estimatedDeliveryDate="2024-05-15T00:00:00Z"
    />
  );
}
```

### Without Tracking Code (Empty State)

```tsx
<TrackingCard
  trackingCode={null}
  trackingCarrier={null}
  estimatedDeliveryDate={null}
/>
```

### With Custom Styling

```tsx
<TrackingCard
  trackingCode="BR123456789BR"
  trackingCarrier="correios"
  estimatedDeliveryDate="2024-05-15T00:00:00Z"
  className="shadow-lg"
/>
```

## Supported Carriers

The component supports the following carriers with specific tracking URLs:

1. **Correios** (correios)
   - Logo: 🇧🇷
   - URL: `https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objeto={code}`

2. **Jadlog** (jadlog)
   - Logo: 📦
   - URL: `https://www.jadlog.com.br/tracking/{code}`

3. **Sedex** (sedex)
   - Logo: 🇧🇷
   - URL: `https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objeto={code}`

4. **Default** (any other carrier)
   - Logo: 🚚
   - Generic display

## Integration

### With CustomerOrderProgressPage

The TrackingCard is designed to be used in the CustomerOrderProgressPage:

```tsx
import { TrackingCard } from "@/components/customer/TrackingCard";

function CustomerOrderProgressPage() {
  const { data: orderProgress } = useQuery({...});

  return (
    <div className="space-y-6">
      {/* Other components */}
      
      {orderProgress.trackingCode && (
        <TrackingCard
          trackingCode={orderProgress.trackingCode}
          trackingCarrier={orderProgress.trackingCarrier}
          estimatedDeliveryDate={orderProgress.estimatedDeliveryDate}
        />
      )}
    </div>
  );
}
```

## Accessibility

- Uses semantic HTML with proper ARIA labels
- Keyboard accessible buttons
- Screen reader friendly with descriptive labels
- High contrast colors for readability

## Localization

- All text is in Portuguese (pt-BR)
- Date formatting uses date-fns with ptBR locale
- Follows Brazilian date format conventions

## Dependencies

- `@/components/ui/card` - Card components
- `@/components/ui/button` - Button component
- `@/components/ui/badge` - Badge component
- `@/components/ui/use-toast` - Toast notifications
- `date-fns` - Date formatting
- `lucide-react` - Icons

## Future Enhancements

1. **Real-time Tracking Updates**
   - Integrate with carrier APIs for live status updates
   - Show delivery progress stages

2. **Delivery Confirmation**
   - Add "Mark as Delivered" functionality
   - Collect delivery feedback

3. **Multiple Packages**
   - Support orders with multiple tracking codes
   - Show individual package status

4. **Notification Preferences**
   - Allow customers to opt-in for delivery notifications
   - SMS/email alerts for delivery updates

## Testing

See `TrackingCard.test.tsx` for comprehensive test coverage including:
- Rendering with tracking code
- Empty state rendering
- Copy functionality
- Tracking link opening
- Carrier configuration
- Date formatting
