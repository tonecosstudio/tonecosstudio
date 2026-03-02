# Subscription Credit System - User Panel Components

This directory contains the frontend components for the Subscription Credit System user panel, implementing Task 12.1 from the spec.

## Overview

These components integrate with the subscription-credit-system API (located in `subscription-api/`) to provide users with a complete interface to manage their subscriptions, credits, and automatic orders.

## Components

### Main Page
- **SubscriptionCreditPanel.tsx** - Main user panel page that orchestrates all sections

### Sections
- **MySubscriptionSection.tsx** - Displays subscription status, plan info, and action buttons
  - Shows current plan (Trimestral/Semestral)
  - Displays subscription dates (start, end, next billing)
  - Shows pending plan changes if scheduled
  - Provides action buttons for upgrade/downgrade, cancel, and no-renewal

- **MyCreditsSection.tsx** - Displays credit balance with visual bar and transaction history
  - Shows available, used, and total credits
  - Visual progress bar showing credit usage
  - Transaction history dialog with all credit movements

- **MyAutomaticOrderSection.tsx** - Displays automatic order with character list
  - Shows characters in the automatic order
  - Displays total credits required
  - Shows cycle close date
  - Indicates if order is locked or open for modifications

### Dialogs
- **SchedulePlanChangeDialog.tsx** - Schedule upgrade/downgrade for next renewal
  - Clear visualization of current vs new plan
  - Shows effective date (next billing date)
  - Explains that change only takes effect on renewal

- **CancelWithRefundDialog.tsx** - Cancel subscription with proportional refund
  - Calculates and displays estimated refund based on time remaining
  - Shows warnings about immediate cancellation and credit expiration
  - Requires confirmation checkbox

- **NoRenewalDialog.tsx** - Disable auto-renewal without immediate cancellation
  - Explains that subscription remains active until end date
  - Shows that credits remain valid until expiration
  - Warns about pending plan changes being cancelled
  - No refund option

## API Integration

### Service Layer
- **src/services/subscription-credit-api.ts** - API client for all subscription-credit-system endpoints
  - Handles authentication via Bearer token
  - Provides typed methods for all API operations
  - Configurable base URL via environment variable

### Types
- **src/types/subscription-credit-system.ts** - TypeScript types for all API entities
  - Subscription, UserCredits, CreditTransaction
  - Character, ProductionCycle, Order, OrderItem
  - API response types

## Environment Configuration

Add to your `.env` file:

```env
VITE_SUBSCRIPTION_API_URL="http://localhost:3001"
```

For production, set this to your deployed API URL.

## Features Implemented

### Requirements Covered
- ✅ 8.8 - Display subscription status and pending plan changes
- ✅ 10.1-10.14 - Complete user profile with subscription, credits, and order info

### Key Features
1. **Subscription Management**
   - View current plan and status
   - Schedule plan changes (upgrade/downgrade) for next renewal
   - Cancel with proportional refund
   - Disable auto-renewal (no-renewal option)
   - Clear indication of pending plan changes

2. **Credit Management**
   - Visual credit balance with progress bar
   - Detailed transaction history
   - Separation of allocation, debit, and expiration transactions
   - Real-time balance updates

3. **Automatic Order Management**
   - View characters in automatic order
   - See total credits required
   - Cycle close date display
   - Lock status indication
   - Insufficient balance warnings

4. **User Experience**
   - Responsive design for mobile and desktop
   - Clear warnings and confirmations for destructive actions
   - Loading states and error handling
   - Toast notifications for success/error feedback
   - Accessible UI with proper ARIA labels

## Usage

### In Your App Router

```typescript
import SubscriptionCreditPanel from '@/pages/SubscriptionCreditPanel';

// Add to your routes
{
  path: '/minha-assinatura-creditos',
  element: <SubscriptionCreditPanel />,
}
```

### Authentication

The API service expects an auth token in localStorage:

```typescript
localStorage.setItem('auth_token', 'your-jwt-token');
```

Adjust the token retrieval in `subscription-credit-api.ts` to match your auth system.

## Testing

To test these components:

1. Start the subscription-api backend:
   ```bash
   cd subscription-api
   npm run dev
   ```

2. Ensure you have test data seeded in the database

3. Navigate to `/minha-assinatura-creditos` in your app

## Future Enhancements

- [ ] Modify automatic order selection (currently disabled)
- [ ] Reactivate auto-renewal after no-renewal
- [ ] Purchase individual characters with credits
- [ ] View production cycle details
- [ ] Character catalog integration
- [ ] Payment method management

## Notes

- These components are separate from the existing Supabase-based subscription system
- The old `MySubscriptions.tsx` and `SubscriberDashboard.tsx` remain unchanged
- This is a new parallel system for the credit-based subscription model
- All monetary values are in BRL (Brazilian Real)
- Dates are formatted in Brazilian Portuguese (pt-BR)
