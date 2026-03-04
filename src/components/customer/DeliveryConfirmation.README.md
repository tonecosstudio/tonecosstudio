# DeliveryConfirmation Component

## Overview

The `DeliveryConfirmation` component allows customers to confirm the delivery of their order with an optional feedback form. It provides a user-friendly interface to select the delivery date, provide feedback, and mark the order as delivered.

## Requirements

- **Requirement 2.4.4**: Order Tracking
  - AC5: Show delivery confirmation when received ✅

## Task

- **Task 5.3.2**: Create DeliveryConfirmation component
  - Show "Mark as Delivered" button ✅
  - Add delivery date picker ✅
  - Add optional feedback form ✅
  - Show confirmation message ✅

## Features

### Core Functionality

1. **Delivery Date Selection**
   - Calendar picker for selecting delivery date
   - Defaults to today's date
   - Prevents selection of future dates
   - Portuguese date formatting

2. **Optional Feedback Form**
   - Textarea for customer feedback
   - 500 character limit with counter
   - Optional field (not required)

3. **Delivery Confirmation**
   - "Mark as Delivered" button
   - Loading state during submission
   - Success confirmation message
   - Displays confirmed delivery information

4. **Confirmed State**
   - Shows confirmation message
   - Displays delivery date
   - Shows customer feedback (if provided)
   - Prevents re-submission

## Props

```typescript
interface DeliveryConfirmationProps {
  orderId: string;                    // Order ID
  orderNumber: string;                // Display order number
  isDelivered?: boolean;              // Whether order is already delivered
  deliveryDate?: string | null;       // ISO date string of delivery
  onConfirmDelivery?: (              // Callback when delivery is confirmed
    deliveryDate: Date,
    feedback?: string
  ) => Promise<void>;
  className?: string;                 // Optional CSS classes
}
```

## Usage

### Basic Usage

```tsx
import { DeliveryConfirmation } from "@/components/customer/DeliveryConfirmation";

function OrderPage() {
  const handleConfirmDelivery = async (deliveryDate: Date, feedback?: string) => {
    await updateOrderDeliveryStatus(orderId, deliveryDate, feedback);
  };

  return (
    <DeliveryConfirmation
      orderId="order-123"
      orderNumber="12345"
      isDelivered={false}
      onConfirmDelivery={handleConfirmDelivery}
    />
  );
}
```

### Already Delivered State

```tsx
<DeliveryConfirmation
  orderId="order-123"
  orderNumber="12345"
  isDelivered={true}
  deliveryDate="2024-05-15T00:00:00Z"
/>
```

### Without Callback (Display Only)

```tsx
<DeliveryConfirmation
  orderId="order-123"
  orderNumber="12345"
  isDelivered={false}
/>
```

### With Custom Styling

```tsx
<DeliveryConfirmation
  orderId="order-123"
  orderNumber="12345"
  isDelivered={false}
  onConfirmDelivery={handleConfirmDelivery}
  className="shadow-lg"
/>
```

## Component States

### 1. Confirmation Form (Not Delivered)

Shows when `isDelivered={false}`:
- Delivery date picker
- Feedback textarea
- "Mark as Delivered" button
- Help text with order number

### 2. Confirmed State (Delivered)

Shows when `isDelivered={true}` or after successful confirmation:
- Success message with green checkmark
- Confirmed delivery date
- Customer feedback (if provided)
- Thank you message

## Integration

### With CustomerOrderProgressPage

The DeliveryConfirmation is designed to be used in the CustomerOrderProgressPage:

```tsx
import { DeliveryConfirmation } from "@/components/customer/DeliveryConfirmation";
import { useMutation } from "@tanstack/react-query";

function CustomerOrderProgressPage() {
  const { data: orderProgress } = useQuery({...});
  
  const confirmDeliveryMutation = useMutation({
    mutationFn: async ({ deliveryDate, feedback }: { 
      deliveryDate: Date; 
      feedback?: string 
    }) => {
      // Call API to update delivery status
      return await updateDeliveryStatus(orderId, deliveryDate, feedback);
    },
    onSuccess: () => {
      // Refetch order data
      queryClient.invalidateQueries(['order', orderId]);
    },
  });

  const handleConfirmDelivery = async (deliveryDate: Date, feedback?: string) => {
    await confirmDeliveryMutation.mutateAsync({ deliveryDate, feedback });
  };

  return (
    <div className="space-y-6">
      {/* Other components */}
      
      {orderProgress.currentStage === 'shipped' && (
        <DeliveryConfirmation
          orderId={orderProgress.orderId}
          orderNumber={orderProgress.orderNumber}
          isDelivered={orderProgress.isDelivered}
          deliveryDate={orderProgress.deliveryDate}
          onConfirmDelivery={handleConfirmDelivery}
        />
      )}
    </div>
  );
}
```

## Date Picker Behavior

- **Default Date**: Today's date
- **Disabled Dates**: Future dates and dates before 2020-01-01
- **Format**: Portuguese format (dd de MMMM de yyyy)
- **Locale**: pt-BR

## Feedback Form

- **Character Limit**: 500 characters
- **Optional**: Not required for confirmation
- **Counter**: Shows character count (e.g., "0/500 caracteres")
- **Placeholder**: "Conte-nos sobre sua experiência com o pedido..."

## Accessibility

- Uses semantic HTML with proper labels
- Keyboard accessible form controls
- Screen reader friendly with descriptive labels
- High contrast colors for readability
- Proper ARIA attributes for calendar

## Localization

- All text is in Portuguese (pt-BR)
- Date formatting uses date-fns with ptBR locale
- Follows Brazilian date format conventions

## Dependencies

- `@/components/ui/card` - Card components
- `@/components/ui/button` - Button component
- `@/components/ui/label` - Label component
- `@/components/ui/textarea` - Textarea component
- `@/components/ui/alert` - Alert component
- `@/components/ui/calendar` - Calendar component
- `@/components/ui/popover` - Popover component
- `date-fns` - Date formatting
- `lucide-react` - Icons

## Future Enhancements

1. **Photo Upload**
   - Allow customers to upload delivery photos
   - Show proof of delivery

2. **Rating System**
   - Add star rating for product quality
   - Add rating for delivery experience

3. **Issue Reporting**
   - Add option to report delivery issues
   - Damaged package reporting
   - Missing items reporting

4. **Delivery Signature**
   - Digital signature capture
   - Proof of receipt

5. **Multiple Packages**
   - Support confirming multiple packages separately
   - Track individual package delivery dates

## Testing

See `DeliveryConfirmation.test.tsx` for comprehensive test coverage including:
- Initial render states
- Delivered state display
- Feedback form functionality
- Delivery confirmation flow
- Date picker behavior
- Loading states
- Error handling
- Accessibility

## Error Handling

The component handles errors gracefully:
- Logs errors to console
- Maintains UI state on error
- Doesn't show error to user (parent should handle)
- Works without callback function

## Performance Considerations

- Calendar component only renders when popover is open
- Minimal re-renders with proper state management
- Efficient date formatting with date-fns
- No unnecessary API calls

## Security Considerations

- Date validation prevents invalid dates
- Character limit prevents excessive data
- Sanitizes user input (handled by textarea component)
- No sensitive data exposed in component
