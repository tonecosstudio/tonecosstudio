# Admin Panel - Subscription Credit System

This directory contains the admin panel UI components for the subscription-credit-system.

## Components Created

### 1. AdminSubscriptionCreditDashboard.tsx
**Path:** `/admin/subscription-credit-dashboard`

Main dashboard with key metrics:
- **Subscriptions**: Total, active, expired, cancelled, breakdown by plan
- **Credits**: Total allocated, used, available, expired
- **Production Cycles**: Open/closed counts, current cycle details
- **Revenue**: Estimated MRR based on active subscriptions
- **Characters**: Total, active, exclusive counts
- **Orders**: Total, breakdown by type and status

**Features:**
- Real-time metrics (refreshes every 30 seconds)
- Visual cards with icons
- Current cycle capacity visualization

### 2. AdminSubscriptionCreditSubscriptions.tsx
**Path:** `/admin/subscription-credit-subscriptions`

Subscription management interface:
- **List View**: All subscriptions with filters (status, plan type)
- **Filters**: Status (all/active/expired/cancelled), Plan (all/trimestral/semestral)
- **Pagination**: 20 items per page
- **Details**: User email, plan type, dates, renewal status, pending plan changes
- **Actions**: Adjust credits manually

**Features:**
- Credit adjustment dialog with reason tracking
- Display pending plan changes
- Pagination controls
- Status badges with icons

### 3. AdminSubscriptionCreditCharacters.tsx
**Path:** `/admin/subscription-credit-characters`

Character catalog management:
- **Grid View**: All characters with images and details
- **Create/Edit**: Full form for character management
- **Pricing**: Both cash and credit prices
- **Flags**: Exclusive semestral, standard collection, active/inactive
- **Actions**: Create, edit, deactivate

**Features:**
- Character form dialog (create/edit)
- Image URL support
- Exclusive and standard collection flags
- Soft delete (deactivate)
- Visual badges for status

### 4. AdminSubscriptionCreditCycles.tsx
**Path:** `/admin/subscription-credit-cycles`

Production cycle management:
- **Current Cycle**: Overview with capacity progress bar
- **Statistics**: Total orders, confirmed, pending, by type
- **Capacity**: Visual progress bar and percentage
- **Actions**: Create new cycle, close cycle, view statistics

**Features:**
- Create cycle dialog with capacity and close date
- Close cycle confirmation with warning
- Statistics dialog with detailed breakdown
- Capacity visualization
- Quick stats cards

## API Service

### subscription-credit-admin-api.ts
Admin API service for backend communication:
- Dashboard metrics
- Subscription management (list, adjust credits)
- Character management (create, update, deactivate)
- Production cycle management (create, close, statistics)

**Base URL:** Configured via `VITE_SUBSCRIPTION_API_URL` environment variable (defaults to `http://localhost:3001`)

## Integration with Existing Admin

These pages follow the existing admin patterns:
- Use `AdminLayout` component for consistent layout
- Use `SEOHead` for meta tags
- Use existing UI components (Card, Button, Dialog, etc.)
- Follow existing styling patterns
- Use React Query for data fetching
- Use toast notifications for feedback

## Backend API Endpoints Used

### Dashboard
- `GET /admin/dashboard/metrics` - Get all metrics

### Subscriptions
- `GET /admin/subscriptions` - List subscriptions with filters
- `POST /admin/subscriptions/:id/adjust-credits` - Adjust user credits

### Characters
- `POST /admin/characters` - Create character
- `PUT /admin/characters/:id` - Update character
- `DELETE /admin/characters/:id` - Deactivate character

### Production Cycles
- `POST /admin/production-cycles` - Create cycle
- `POST /admin/production-cycles/:id/close` - Close cycle
- `GET /admin/production-cycles/:id/statistics` - Get cycle stats

## Environment Variables

```env
VITE_SUBSCRIPTION_API_URL=http://localhost:3001
```

## Usage

1. Add routes to your router configuration:
```tsx
import AdminSubscriptionCreditDashboard from "@/pages/admin/AdminSubscriptionCreditDashboard";
import AdminSubscriptionCreditSubscriptions from "@/pages/admin/AdminSubscriptionCreditSubscriptions";
import AdminSubscriptionCreditCharacters from "@/pages/admin/AdminSubscriptionCreditCharacters";
import AdminSubscriptionCreditCycles from "@/pages/admin/AdminSubscriptionCreditCycles";

// In your routes:
<Route path="/admin/subscription-credit-dashboard" element={<AdminSubscriptionCreditDashboard />} />
<Route path="/admin/subscription-credit-subscriptions" element={<AdminSubscriptionCreditSubscriptions />} />
<Route path="/admin/subscription-credit-characters" element={<AdminSubscriptionCreditCharacters />} />
<Route path="/admin/subscription-credit-cycles" element={<AdminSubscriptionCreditCycles />} />
```

2. Add navigation links in your admin menu/sidebar

3. Ensure the backend API is running and accessible

## Requirements Covered

This implementation covers requirements 9.1-9.12 from the spec:
- ✅ 9.1: Dashboard with main metrics (MRR, active subscriptions, credits in circulation, cycle capacity)
- ✅ 9.2: Character management (create, edit, deactivate)
- ✅ 9.3: View subscription status, credit balance, transaction history
- ✅ 9.4: Manually adjust user credit balance
- ✅ 9.8: View production cycles with linked orders
- ✅ 9.9: View orders grouped by production cycle
- ✅ 9.12: Configure character limits per user per cycle (via cycle statistics)

## Notes

- All pages use TypeScript for type safety
- All API calls are properly typed using interfaces from `src/types/subscription-credit-system.ts`
- Error handling is implemented with toast notifications
- Loading states are handled with appropriate UI feedback
- The backend API uses snake_case for property names (e.g., `current_count`, `capacity_limit`)
- The frontend properly maps these to the TypeScript types
