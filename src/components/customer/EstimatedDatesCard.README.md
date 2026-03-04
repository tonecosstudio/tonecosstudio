# EstimatedDatesCard Component

## Overview

The `EstimatedDatesCard` component displays estimated production completion, shipping, and delivery dates for customer orders. It provides clear visual indicators of whether the order is on track or delayed, with explanations for any delays.

## Requirements

- **Requirement 2.4.2**: Estimated Dates - Display estimated completion, shipping, and delivery dates
- **Task 5.1.3**: Create EstimatedDatesCard component

## Features

### Core Functionality

1. **Date Display**
   - Shows estimated production completion date
   - Shows estimated shipping date
   - Shows estimated delivery date
   - Displays dates in Portuguese format (dd de MMMM de yyyy)
   - Shows relative time (e.g., "em 5 dias") for future dates

2. **Status Indicators**
   - "No Prazo" (On Track) badge with green styling
   - "Atrasado" (Delayed) badge with red styling
   - Visual icons for each date type (Package, Truck, CheckCircle)

3. **Delay Handling**
   - Displays alert when production is delayed
   - Shows explanation for delays
   - Handles blocked/on-hold production status
   - Provides default messages when no reason is given

4. **Completed Dates**
   - Marks past dates as "Concluído" (Completed)
   - Applies muted styling to completed dates
   - Shows checkmark icon for completed items

5. **Empty State**
   - Shows helpful message when no dates are available
   - Displays clock icon with "dates will be calculated soon" message

## Props

```typescript
interface EstimatedDatesCardProps {
  estimatedCompletionDate: string | null;  // ISO date string for production completion
  estimatedShippingDate: string | null;    // ISO date string for shipping
  estimatedDeliveryDate: string | null;    // ISO date string for delivery
  isOnTrack: boolean;                      // Whether order is on schedule
  delayReason?: string | null;             // Explanation for delays
  productionStatus?: string;               // Production status (e.g., "on_hold")
  className?: string;                      // Additional CSS classes
}
```

## Usage

### Basic Usage

```tsx
import { EstimatedDatesCard } from "@/components/customer/EstimatedDatesCard";

function OrderProgressPage() {
  return (
    <EstimatedDatesCard
      estimatedCompletionDate="2024-02-15T00:00:00Z"
      estimatedShippingDate="2024-02-17T00:00:00Z"
      estimatedDeliveryDate="2024-02-24T00:00:00Z"
      isOnTrack={true}
    />
  );
}
```

### With Delay Information

```tsx
<EstimatedDatesCard
  estimatedCompletionDate="2024-02-20T00:00:00Z"
  estimatedShippingDate="2024-02-22T00:00:00Z"
  estimatedDeliveryDate="2024-02-29T00:00:00Z"
  isOnTrack={false}
  delayReason="Aguardando material especial do fornecedor"
/>
```

### With Blocked Status

```tsx
<EstimatedDatesCard
  estimatedCompletionDate="2024-02-15T00:00:00Z"
  estimatedShippingDate="2024-02-17T00:00:00Z"
  estimatedDeliveryDate="2024-02-24T00:00:00Z"
  isOnTrack={false}
  productionStatus="on_hold"
  delayReason="Aguardando aprovação de design especial"
/>
```

### With No Dates

```tsx
<EstimatedDatesCard
  estimatedCompletionDate={null}
  estimatedShippingDate={null}
  estimatedDeliveryDate={null}
  isOnTrack={true}
/>
```

## Integration with CustomerOrderProgressPage

The component is designed to be used in the `CustomerOrderProgressPage`:

```tsx
import { EstimatedDatesCard } from "@/components/customer/EstimatedDatesCard";

export default function CustomerOrderProgressPage() {
  const { data: orderProgress } = useQuery({
    queryKey: ["customer-order-progress", orderId, orderType],
    queryFn: async () => {
      // Fetch order data...
      return orderData;
    },
  });

  const isOnTrack = orderProgress.productionStatus !== "on_hold";

  return (
    <div className="space-y-6">
      {/* Other components */}
      
      <EstimatedDatesCard
        estimatedCompletionDate={orderProgress.estimatedCompletionDate}
        estimatedShippingDate={orderProgress.estimatedShippingDate}
        estimatedDeliveryDate={orderProgress.estimatedDeliveryDate}
        isOnTrack={isOnTrack}
        delayReason={orderProgress.productionNotes}
        productionStatus={orderProgress.productionStatus}
      />
      
      {/* Other components */}
    </div>
  );
}
```

## Visual Design

### Layout

- Card component with header and content sections
- Header includes title, description, and status badge
- Content displays dates in vertical stack
- Each date has icon, label, formatted date, and relative time

### Color Coding

- **On Track**: Green badge with checkmark icon
- **Delayed**: Red badge with alert icon
- **Completed Dates**: Muted background with green checkmark
- **Future Dates**: Standard styling with relative time
- **Alerts**: Red background for delay/blocked alerts

### Icons

- 📦 Package icon for production completion
- 🚚 Truck icon for shipping date
- ✅ CheckCircle icon for delivery date
- ⏰ Clock icon for empty state
- ⚠️ AlertCircle icon for delays

### Responsive Design

- Mobile-friendly layout
- Proper spacing and padding
- Icons scale appropriately
- Text remains readable on all screen sizes

## Accessibility

- Semantic HTML structure with proper heading hierarchy
- ARIA labels for icons
- Color is not the only indicator (icons + text)
- Proper contrast ratios for all text
- Screen reader friendly date formatting

## Testing

The component includes comprehensive tests covering:

- Date display and formatting
- Status indicators (on track vs delayed)
- Delay reason display
- Edge cases (no dates, past dates, blocked status)
- Accessibility features
- Custom className support

Run tests with:

```bash
npm run test EstimatedDatesCard.test.tsx
```

## Dependencies

- `@/components/ui/card` - Card components
- `@/components/ui/badge` - Badge component
- `@/components/ui/alert` - Alert components
- `lucide-react` - Icons
- `date-fns` - Date formatting and manipulation
- `date-fns/locale` - Portuguese locale for date formatting
- `@/lib/utils` - Utility functions (cn for className merging)

## Date Calculations

The component expects dates in ISO 8601 format (e.g., "2024-02-15T00:00:00Z"). The parent component (CustomerOrderProgressPage) calculates:

- **Estimated Shipping Date**: Completion date + 2 days
- **Estimated Delivery Date**: Shipping date + 7 days

These calculations are performed in the query function before passing to the component.

## Future Enhancements

Potential improvements for future versions:

1. **Interactive Date Picker**: Allow customers to request specific delivery dates
2. **Calendar Integration**: Add to calendar button for delivery date
3. **Notification Preferences**: Let customers set reminders for key dates
4. **Historical Tracking**: Show how dates have changed over time
5. **Carrier Integration**: Real-time tracking updates from shipping carriers
6. **Timezone Support**: Display dates in customer's local timezone

## Related Components

- `ProgressTimeline` - Shows production stage progress
- `CharacterChoiceStatus` - Displays character selection status
- `CustomerOrderProgressPage` - Main page that uses this component

## Support

For issues or questions about this component, please refer to:

- Design Document: `.kiro/specs/production-management-system/design.md`
- Requirements: `.kiro/specs/production-management-system/requirements.md`
- Tasks: `.kiro/specs/production-management-system/tasks.md`
