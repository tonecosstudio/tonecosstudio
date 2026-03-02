# Character Catalog Components

This directory contains the UI components for the subscription-credit-system character catalog.

## Components

### CharacterCatalog (Main Page)
- **Location**: `src/pages/CharacterCatalog.tsx`
- **Purpose**: Main catalog page that displays characters with credit/cash pricing
- **Features**:
  - Loads user subscription and credit balance
  - Filters characters based on subscription plan (trimestral/semestral)
  - Handles character purchases with credits or cash
  - Pagination support

### CharacterCatalogHero
- **Purpose**: Hero section for the catalog page
- **Features**: Title and description

### CreditBalanceBar
- **Purpose**: Displays user's credit balance with visual progress bar
- **Props**:
  - `totalCredits`: Total credits allocated
  - `usedCredits`: Credits already used
  - `availableCredits`: Credits available for use
  - `planType`: User's subscription plan type
- **Features**:
  - Visual progress bar showing used vs available credits
  - Plan badge (Trimestral/Semestral)
  - Color-coded by plan type

### CharacterFilters
- **Purpose**: Filter controls for the catalog
- **Props**:
  - `showOnlyAvailable`: Filter to show only characters affordable with current credits
  - `showOnlyExclusive`: Filter to show only exclusive characters (semestral only)
  - `isSubscriber`: Whether user has active subscription
  - `isSemestral`: Whether user has semestral plan
  - `hasCredits`: Whether user has credits
- **Features**:
  - "Available with my credits" filter (subscribers only)
  - "Exclusive only" filter (semestral subscribers only)

### CharacterGrid
- **Purpose**: Grid layout for character cards
- **Props**:
  - `characters`: Array of characters to display
  - `isSubscriber`: Whether user has active subscription
  - `planType`: User's subscription plan type
  - `availableCredits`: User's available credits
  - `onPurchase`: Callback for purchase action
- **Features**: Responsive grid (1-4 columns based on screen size)

### CharacterCard
- **Purpose**: Individual character card with pricing and purchase options
- **Props**:
  - `character`: Character data
  - `isSubscriber`: Whether user has active subscription
  - `planType`: User's subscription plan type
  - `availableCredits`: User's available credits
  - `onPurchase`: Callback for purchase action
- **Features**:
  - Character image with hover effects
  - "Exclusive Semestral" badge for exclusive characters
  - Savings percentage badge for subscribers
  - Cash price (always visible)
  - Credit price (subscribers only)
  - Comparison showing savings when using credits
  - Purchase buttons:
    - Subscribers: "Buy with credits" (primary) + "Buy with cash" (secondary)
    - Non-subscribers: "Buy with cash" + call-to-action to subscribe

## Requirements Implemented

This implementation covers the following requirements from the spec:

### Requirement 4.2: Catalog Display
- ✅ Displays `price_cash` for all visitors
- ✅ Displays `price_credit` for logged-in subscribers
- ✅ Shows credit balance for subscribers

### Requirement 4.3: Credit Comparison
- ✅ Shows comparison between `price_cash` and `price_credit`
- ✅ Displays savings percentage

### Requirement 4.4: Exclusive Characters
- ✅ Shows "Exclusive Semestral" badge
- ✅ Filters exclusive characters for trimestral subscribers (handled by API)

### Requirement 4.5: Active Characters
- ✅ Only displays active characters (handled by API)

## Usage

```tsx
import CharacterCatalog from '@/pages/CharacterCatalog';

// In your router
<Route path="/character-catalog" element={<CharacterCatalog />} />
```

## API Integration

The catalog integrates with the subscription-credit-system API:

- `GET /api/characters` - List characters with plan-based filtering
- `GET /api/subscriptions/me` - Get user's subscription
- `GET /api/credits/balance` - Get user's credit balance
- `POST /api/orders/individual` - Create individual character order

## Styling

Components use:
- Tailwind CSS for styling
- shadcn/ui components (Card, Badge, Button)
- Lucide React icons
- Responsive design with mobile-first approach

## Future Enhancements

- [ ] Implement cash purchase flow
- [ ] Add character detail modal/page
- [ ] Add search functionality
- [ ] Add sorting options (price, name, date)
- [ ] Add "complement purchase" option for insufficient credits
- [ ] Add loading skeletons
- [ ] Add error boundaries
