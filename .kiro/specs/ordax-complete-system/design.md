# Design Document: ORDAX Complete System

## Overview

This design document provides the technical architecture and implementation specifications for completing the ORDAX subscription platform from 60-65% to 100% functionality. The system is a premium collectibles subscription platform with a unique made-to-order business model featuring biweekly production cycles, limited monthly capacity, and a controlled freedom system for subscribers.

### System Context

ORDAX operates on a sophisticated business model:
- **Biweekly Cycles**: Two production cycles per month (Cycle 1: days 1-15, Cycle 2: days 16-end)
- **Fixed-Price Subscriptions**: Trimestral (3 deliveries) and Semestral (6 deliveries) plans
- **Standalone Purchases**: Individual pieces with R$100 deposit model
- **Rotating Collections**: Bimonthly availability patterns for themed collections
- **Production Capacity**: Monthly manufacturing limits enforced across all purchase types
- **Automatic Maintenance**: Previous month's collection choice preserved when subscriber doesn't select
- **Timezone**: All operations in America/Bahia (UTC-3)

### Current State

The platform has foundational elements:
- Database structure with cycles, subscriptions, collections, deliveries tables
- Basic cycle system with status management
- Subscription plans (Trimestral, Semestral)
- Manual payment verification system
- Collections management
- React frontend with TypeScript, React Query, Tailwind CSS
- Supabase backend (PostgreSQL + Edge Functions)

### Design Goals

1. Complete all 36 requirements from requirements document
2. Implement timezone-aware operations for Bahia time
3. Build comprehensive admin panel for operational control
4. Automate delivery creation and character revelations
5. Enforce production capacity across all purchase types
6. Implement standalone purchase deposit model
7. Create bimonthly rotating collections system
8. Build collection change audit trail
9. Integrate shipping carrier APIs
10. Implement comprehensive email notification system

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  React + TypeScript + React Query + Tailwind CSS                │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Customer   │  │  Subscriber  │  │    Admin     │          │
│  │    Pages     │  │  Dashboard   │  │    Panel     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API / Business Logic                        │
│                    Supabase Edge Functions                       │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Subscription │  │  Standalone  │  │  Collection  │          │
│  │   Service    │  │   Purchase   │  │   Service    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Capacity   │  │   Delivery   │  │    Email     │          │
│  │   Service    │  │   Service    │  │   Service    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                 │
│                  PostgreSQL (Supabase)                           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    cycles    │  │subscriptions │  │  collections │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  deliveries  │  │   holidays   │  │ audit_trail  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Integrations                         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Shipping   │  │    Email     │  │   Payment    │          │
│  │   Carrier    │  │   Service    │  │   Gateway    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Automation Layer                            │
│                    Cron Jobs (pg_cron)                           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Delivery   │  │  Character   │  │    Cycle     │          │
│  │   Creation   │  │  Revelation  │  │  Transition  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18+ with TypeScript
- React Query for data fetching and caching
- Tailwind CSS for styling
- React Router for navigation
- React Hook Form for form management
- Zod for validation
- date-fns-tz for timezone handling

**Backend:**
- Supabase (PostgreSQL 17)
- Supabase Edge Functions (Deno runtime)
- Row Level Security (RLS) for authorization
- pg_cron for scheduled jobs
- PostGIS for timezone calculations

**External Services:**
- Email: SMTP service (SendGrid, AWS SES, or similar)
- Shipping: Correios API or private carrier
- Storage: Supabase Storage for payment vouchers and images

### Timezone Strategy

All date/time operations use America/Bahia timezone (UTC-3):

1. **Storage**: All timestamps stored in UTC in database
2. **Conversion**: Convert to Bahia time for business logic calculations
3. **Display**: Show Bahia time to users
4. **Cutoff**: Day 15 at 23:59:59 Bahia time
5. **Business Days**: Calculate excluding weekends and holidays in Bahia time

Implementation approach:
```typescript
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';

const BAHIA_TZ = 'America/Bahia';

// Convert user input to UTC for storage
const toUTC = (bahiaDate: Date) => zonedTimeToUtc(bahiaDate, BAHIA_TZ);

// Convert UTC from database to Bahia time for display
const toBahiaTime = (utcDate: Date) => utcToZonedTime(utcDate, BAHIA_TZ);

// Check if before cutoff
const isBeforeCutoff = (currentBahiaTime: Date) => {
  const day = currentBahiaTime.getDate();
  return day <= 15;
};
```

## Components and Interfaces

### Core Domain Models

#### Cycle Model
```typescript
interface Cycle {
  id: string;
  cycle_number: 1 | 2;
  month: number; // 1-12
  year: number;
  open_start: Date; // UTC
  open_end: Date; // UTC
  production_start: Date; // UTC
  production_end: Date; // UTC
  shipping_date: Date; // Date only
  status: 'open' | 'production' | 'shipping' | 'completed';
  status_changed_at: Date | null;
  capacity_max: number;
  capacity_current: number;
  created_at: Date;
  updated_at: Date;
}
```

#### Collection Model
```typescript
interface Collection {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_active: boolean;
  rotation_type: 'fixed' | 'odd_months' | 'even_months';
  character_revelation_date: Date | null;
  revealed: boolean;
  character_name: string | null;
  character_image_url: string | null;
  available_for_plans: ('trimestral' | 'semestral')[];
  is_semestral_exclusive: boolean;
  is_special_edition: boolean;
  is_limited_availability: boolean;
  created_at: Date;
  updated_at: Date;
}
```

#### Subscription Model
```typescript
interface Subscription {
  id: string;
  user_id: string;
  collection_id: string;
  plan_type: 'trimestral' | 'semestral';
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  total_paid: number;
  payment_method: 'pix' | 'credit_card' | 'boleto';
  payment_id: string | null;
  deliveries_total: number;
  deliveries_completed: number;
  next_delivery_date: Date | null;
  next_production_start: Date | null;
  entry_cycle_id: string; // NEW
  current_delivery_number: number; // NEW
  is_legacy_model: boolean; // NEW
  pause_count: number; // NEW (default 0, max 2)
  created_at: Date;
  updated_at: Date;
}
```

#### Delivery Model
```typescript
interface Delivery {
  id: string;
  subscription_id: string;
  character_id: string | null;
  delivery_number: number;
  status: 'scheduled' | 'pending_choice' | 'confirmed' | 
          'in_production' | 'shipped' | 'delivered';
  reveal_date: Date | null;
  expected_delivery_date: Date | null;
  actual_delivery_date: Date | null;
  tracking_code: string | null; // NEW
  cycle_id: string | null; // NEW
  collection_id: string | null; // NEW
  auto_maintained: boolean; // NEW
  bonus_piece_id: string | null; // NEW
  created_at: Date;
  updated_at: Date;
}
```

#### Standalone Purchase Model
```typescript
interface StandalonePurchase {
  id: string;
  user_id: string;
  collection_id: string;
  cycle_id: string;
  status: 'deposit_paid' | 'awaiting_balance' | 'balance_paid' | 
          'shipped' | 'delivered' | 'cancelled';
  deposit_amount: number; // R$100
  balance_amount: number; // collection_price - deposit
  total_amount: number;
  deposit_paid_at: Date | null;
  balance_due_date: Date | null;
  balance_paid_at: Date | null;
  production_complete_at: Date | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
  cancelled_at: Date | null;
  cancellation_reason: string | null;
  tracking_code: string | null;
  payment_voucher_url: string | null;
  created_at: Date;
  updated_at: Date;
}
```

#### Collection Choice History Model
```typescript
interface CollectionChoiceHistory {
  id: string;
  delivery_id: string;
  user_id: string;
  previous_collection_id: string | null;
  new_collection_id: string;
  change_reason: 'manual' | 'automatic_maintenance' | 'admin_override';
  changed_by_admin: boolean;
  admin_user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}
```

#### Holiday Model
```typescript
interface Holiday {
  id: string;
  holiday_date: Date;
  name: string;
  description: string | null;
  type: 'national' | 'state';
  state_code: string | null; // 'BA' for Bahia
  is_recurring: boolean;
  created_at: Date;
  updated_at: Date;
}
```

#### Bonus Piece Model
```typescript
interface BonusPiece {
  id: string;
  subscription_id: string;
  delivery_id: string | null;
  description: string;
  image_url: string | null;
  status: 'pending' | 'prepared' | 'shipped';
  prepared_at: Date | null;
  shipped_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
```

### Service Layer Interfaces

#### Capacity Service
```typescript
interface CapacityService {
  // Check if capacity available for purchase
  checkAvailability(cycleId: string, quantity: number): Promise<boolean>;
  
  // Reserve capacity for subscription or standalone purchase
  reserveCapacity(cycleId: string, quantity: number, referenceId: string): Promise<void>;
  
  // Release capacity (cancellation before cutoff)
  releaseCapacity(cycleId: string, quantity: number, referenceId: string): Promise<void>;
  
  // Get current capacity usage
  getCapacityUsage(cycleId: string): Promise<{
    max: number;
    current: number;
    available: number;
    percentage: number;
  }>;
  
  // Get capacity forecast for next N months
  getCapacityForecast(months: number): Promise<CapacityForecast[]>;
}
```

#### Collection Service
```typescript
interface CollectionService {
  // Get active collections for specific month
  getActiveCollections(month: number, year: number): Promise<Collection[]>;
  
  // Check if collection is active in month
  isCollectionActive(collectionId: string, month: number, year: number): Promise<boolean>;
  
  // Get collection rotation schedule
  getRotationSchedule(collectionId: string): Promise<MonthAvailability[]>;
  
  // Reveal character for collection
  revealCharacter(collectionId: string): Promise<void>;
  
  // Get collections by plan type
  getCollectionsByPlan(planType: 'trimestral' | 'semestral'): Promise<Collection[]>;
}
```

#### Delivery Service
```typescript
interface DeliveryService {
  // Create deliveries for subscription
  createDeliveriesForSubscription(subscriptionId: string): Promise<Delivery[]>;
  
  // Apply automatic maintenance to delivery
  applyAutomaticMaintenance(deliveryId: string): Promise<void>;
  
  // Change collection choice
  changeCollectionChoice(
    deliveryId: string, 
    newCollectionId: string,
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void>;
  
  // Check if changes allowed (before cutoff)
  canChangeCollection(deliveryId: string): Promise<boolean>;
  
  // Schedule consecutive deliveries
  scheduleConsecutiveDeliveries(
    subscriptionId: string,
    startCycleId: string,
    count: number
  ): Promise<Delivery[]>;
  
  // Update delivery status
  updateDeliveryStatus(deliveryId: string, status: DeliveryStatus): Promise<void>;
  
  // Add tracking code
  addTrackingCode(deliveryId: string, trackingCode: string): Promise<void>;
}
```

#### Standalone Purchase Service
```typescript
interface StandalonePurchaseService {
  // Create standalone purchase with deposit
  createWithDeposit(
    userId: string,
    collectionId: string,
    cycleId: string,
    depositVoucherUrl: string
  ): Promise<StandalonePurchase>;
  
  // Process balance payment
  processBalancePayment(
    purchaseId: string,
    balanceVoucherUrl: string
  ): Promise<void>;
  
  // Cancel purchase (non-payment)
  cancelForNonPayment(purchaseId: string): Promise<void>;
  
  // Mark production complete
  markProductionComplete(purchaseId: string): Promise<void>;
  
  // Check balance payment deadline
  checkBalanceDeadlines(): Promise<StandalonePurchase[]>;
}
```

#### Email Service
```typescript
interface EmailService {
  // Send welcome email
  sendWelcomeEmail(subscriptionId: string): Promise<void>;
  
  // Send collection choice reminder
  sendChoiceReminder(userId: string, deliveryId: string, daysUntilCutoff: number): Promise<void>;
  
  // Send character revelation
  sendCharacterRevelation(collectionId: string): Promise<void>;
  
  // Send production started
  sendProductionStarted(deliveryId: string): Promise<void>;
  
  // Send shipping notification
  sendShippingNotification(deliveryId: string, trackingCode: string): Promise<void>;
  
  // Send balance payment reminder
  sendBalanceReminder(purchaseId: string, daysRemaining: number): Promise<void>;
  
  // Send cancellation notice
  sendCancellationNotice(purchaseId: string, reason: string): Promise<void>;
}
```

#### Shipping Service
```typescript
interface ShippingService {
  // Generate shipping label
  generateLabel(deliveryId: string, address: Address): Promise<{
    trackingCode: string;
    labelUrl: string;
    cost: number;
  }>;
  
  // Get tracking status
  getTrackingStatus(trackingCode: string): Promise<TrackingStatus>;
  
  // Update tracking status (called by cron)
  updateTrackingStatuses(): Promise<void>;
  
  // Calculate shipping cost
  calculateShippingCost(address: Address, weight: number): Promise<number>;
  
  // Generate batch labels
  generateBatchLabels(deliveryIds: string[]): Promise<BatchLabelResult>;
}
```

### Frontend Components

#### Admin Panel Components

**Cycle Dashboard**
```typescript
interface CycleDashboardProps {
  month: number;
  year: number;
}

// Displays:
// - Current Cycle 1 and Cycle 2 status
// - Capacity usage with progress bars
// - Time until cutoff countdown
// - Breakdown by collection
// - Pending choices list
// - Manual status transition buttons
```

**Collection Management**
```typescript
interface CollectionManagementProps {
  // CRUD operations for collections
}

// Features:
// - Create/Edit collection form
// - Set rotation type and pattern
// - Upload images
// - Set character revelation date
// - View statistics
// - Deactivate collections
```

**Delivery Management**
```typescript
interface DeliveryManagementProps {
  cycleId?: string;
  status?: DeliveryStatus;
}

// Features:
// - Filter by cycle and status
// - Search by subscriber
// - Update status
// - Add tracking code
// - Bulk operations
// - Export to CSV
```

**Capacity Management**
```typescript
interface CapacityManagementProps {
  // Capacity configuration and monitoring
}

// Features:
// - Set monthly capacity limits
// - View real-time usage
// - Capacity forecast
// - Allocation breakdown
// - Alert configuration
```

#### Subscriber Components

**Subscriber Dashboard**
```typescript
interface SubscriberDashboardProps {
  userId: string;
}

// Displays:
// - Active subscription details
// - Next delivery info
// - Countdown to cutoff
// - Past deliveries with tracking
// - Upcoming deliveries
// - Quick actions (change collection, pause)
// - Payment history
```

**Collection Selection Interface**
```typescript
interface CollectionSelectionProps {
  deliveryId: string;
  currentCollectionId?: string;
}

// Features:
// - Display active collections only
// - Highlight current selection
// - Show character revelation status
// - Rotation schedule display
// - Confirmation dialog
// - Cutoff enforcement
```

## Data Models

### Database Schema Additions

#### New Tables

**standalone_purchases**
```sql
CREATE TABLE standalone_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id),
  cycle_id UUID NOT NULL REFERENCES cycles(id),
  status TEXT NOT NULL CHECK (status IN (
    'deposit_paid', 'awaiting_balance', 'balance_paid', 
    'shipped', 'delivered', 'cancelled'
  )),
  deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  balance_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  deposit_paid_at TIMESTAMPTZ,
  balance_due_date TIMESTAMPTZ,
  balance_paid_at TIMESTAMPTZ,
  production_complete_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  tracking_code TEXT,
  payment_voucher_deposit_url TEXT,
  payment_voucher_balance_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_standalone_purchases_user ON standalone_purchases(user_id);
CREATE INDEX idx_standalone_purchases_cycle ON standalone_purchases(cycle_id);
CREATE INDEX idx_standalone_purchases_status ON standalone_purchases(status);
CREATE INDEX idx_standalone_purchases_balance_due ON standalone_purchases(balance_due_date) 
  WHERE status = 'awaiting_balance';
```

**collection_choice_history**
```sql
CREATE TABLE collection_choice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES subscription_deliveries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  previous_collection_id UUID REFERENCES collections(id),
  new_collection_id UUID NOT NULL REFERENCES collections(id),
  change_reason TEXT NOT NULL CHECK (change_reason IN (
    'manual', 'automatic_maintenance', 'admin_override'
  )),
  changed_by_admin BOOLEAN DEFAULT false,
  admin_user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_choice_history_delivery ON collection_choice_history(delivery_id);
CREATE INDEX idx_choice_history_user ON collection_choice_history(user_id);
CREATE INDEX idx_choice_history_created ON collection_choice_history(created_at DESC);
```

#### Modified Tables

**collections** (add fields)
```sql
ALTER TABLE collections
  ADD COLUMN rotation_type TEXT DEFAULT 'fixed' 
    CHECK (rotation_type IN ('fixed', 'odd_months', 'even_months')),
  ADD COLUMN character_revelation_date TIMESTAMPTZ,
  ADD COLUMN revealed BOOLEAN DEFAULT false,
  ADD COLUMN character_name TEXT,
  ADD COLUMN character_image_url TEXT;

CREATE INDEX idx_collections_rotation ON collections(rotation_type);
CREATE INDEX idx_collections_revelation ON collections(character_revelation_date) 
  WHERE revealed = false;
```

**subscription_deliveries** (add fields)
```sql
ALTER TABLE subscription_deliveries
  ADD COLUMN tracking_code TEXT,
  ADD COLUMN cycle_id UUID REFERENCES cycles(id),
  ADD COLUMN collection_id UUID REFERENCES collections(id),
  ADD COLUMN auto_maintained BOOLEAN DEFAULT false,
  ADD COLUMN bonus_piece_id UUID REFERENCES bonus_pieces(id);

CREATE INDEX idx_deliveries_tracking ON subscription_deliveries(tracking_code);
CREATE INDEX idx_deliveries_cycle ON subscription_deliveries(cycle_id);
CREATE INDEX idx_deliveries_collection ON subscription_deliveries(collection_id);
```

**subscriptions** (add fields)
```sql
ALTER TABLE subscriptions
  ADD COLUMN entry_cycle_id UUID REFERENCES cycles(id),
  ADD COLUMN pause_count INTEGER DEFAULT 0 CHECK (pause_count >= 0 AND pause_count <= 2);

CREATE INDEX idx_subscriptions_entry_cycle ON subscriptions(entry_cycle_id);
```

**cycles** (add field if not exists)
```sql
ALTER TABLE cycles
  ADD COLUMN IF NOT EXISTS capacity_limit INTEGER DEFAULT 100;
```

### Database Functions

#### Get Active Collections for Month
```sql
CREATE OR REPLACE FUNCTION get_active_collections(
  p_month INTEGER,
  p_year INTEGER
) RETURNS SETOF collections AS $
BEGIN
  RETURN QUERY
  SELECT * FROM collections
  WHERE is_active = true
  AND (
    rotation_type = 'fixed'
    OR (rotation_type = 'odd_months' AND p_month % 2 = 1)
    OR (rotation_type = 'even_months' AND p_month % 2 = 0)
  )
  ORDER BY name;
END;
$ LANGUAGE plpgsql;
```

#### Check Capacity Availability
```sql
CREATE OR REPLACE FUNCTION check_capacity_available(
  p_cycle_id UUID,
  p_quantity INTEGER
) RETURNS BOOLEAN AS $
DECLARE
  v_capacity_max INTEGER;
  v_capacity_current INTEGER;
BEGIN
  SELECT capacity_max, capacity_current
  INTO v_capacity_max, v_capacity_current
  FROM cycles
  WHERE id = p_cycle_id;
  
  RETURN (v_capacity_current + p_quantity) <= v_capacity_max;
END;
$ LANGUAGE plpgsql;
```

#### Reserve Capacity
```sql
CREATE OR REPLACE FUNCTION reserve_capacity(
  p_cycle_id UUID,
  p_quantity INTEGER
) RETURNS VOID AS $
BEGIN
  UPDATE cycles
  SET capacity_current = capacity_current + p_quantity,
      updated_at = now()
  WHERE id = p_cycle_id
  AND (capacity_current + p_quantity) <= capacity_max;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Capacity limit exceeded for cycle %', p_cycle_id;
  END IF;
END;
$ LANGUAGE plpgsql;
```

#### Release Capacity
```sql
CREATE OR REPLACE FUNCTION release_capacity(
  p_cycle_id UUID,
  p_quantity INTEGER
) RETURNS VOID AS $
BEGIN
  UPDATE cycles
  SET capacity_current = GREATEST(0, capacity_current - p_quantity),
      updated_at = now()
  WHERE id = p_cycle_id;
END;
$ LANGUAGE plpgsql;
```

#### Calculate Business Days
```sql
CREATE OR REPLACE FUNCTION calculate_business_days(
  p_start_date DATE,
  p_num_days INTEGER
) RETURNS DATE AS $
DECLARE
  v_current_date DATE := p_start_date;
  v_days_counted INTEGER := 0;
  v_day_of_week INTEGER;
  v_is_holiday BOOLEAN;
BEGIN
  WHILE v_days_counted < p_num_days LOOP
    v_current_date := v_current_date + 1;
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    
    -- Skip weekends (0 = Sunday, 6 = Saturday)
    IF v_day_of_week NOT IN (0, 6) THEN
      -- Check if holiday
      SELECT EXISTS(
        SELECT 1 FROM holidays 
        WHERE holiday_date = v_current_date
      ) INTO v_is_holiday;
      
      IF NOT v_is_holiday THEN
        v_days_counted := v_days_counted + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_current_date;
END;
$ LANGUAGE plpgsql;
```

#### Is Before Cutoff (Bahia Time)
```sql
CREATE OR REPLACE FUNCTION is_before_cutoff() RETURNS BOOLEAN AS $
DECLARE
  v_bahia_time TIMESTAMPTZ;
  v_day INTEGER;
  v_hour INTEGER;
  v_minute INTEGER;
BEGIN
  -- Convert current UTC time to Bahia time (UTC-3)
  v_bahia_time := now() AT TIME ZONE 'America/Bahia';
  v_day := EXTRACT(DAY FROM v_bahia_time);
  v_hour := EXTRACT(HOUR FROM v_bahia_time);
  v_minute := EXTRACT(MINUTE FROM v_bahia_time);
  
  -- Before day 15 at 23:59:59
  IF v_day < 15 THEN
    RETURN true;
  ELSIF v_day = 15 AND (v_hour < 23 OR (v_hour = 23 AND v_minute < 60)) THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$ LANGUAGE plpgsql;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies and consolidations:

**Redundant Properties:**
- 1.4 and 1.5 (timezone conversion) can be combined into a single round-trip property
- 6.2 and 10.4 (automatic maintenance) are identical - consolidate into one
- 8.1-8.3 (audit trail fields) can be combined into one comprehensive property
- 20.2 and 20.3 (cycle association by date) can be combined into one property
- Multiple capacity release properties (3.6, 4.7, 23.4, 26.6) can be consolidated

**Combined Properties:**
- Capacity enforcement (3.2, 3.3, 22.1, 22.4) - all verify capacity before operations
- Email notifications (17.1-17.9) - all follow same pattern of event → email
- Delivery scheduling (9.1, 9.2, 9.3) - all about consecutive scheduling logic

**Final Property Count:** 45 unique properties after consolidation

### Correctness Properties


### Property 1: Timezone Round-Trip Preservation

*For any* date/time value in Bahia timezone, converting to UTC for storage and back to Bahia time for display should preserve the original value.

**Validates: Requirements 1.4, 1.5**

### Property 2: Cutoff Calculation Correctness

*For any* date/time in Bahia timezone, the cutoff check should return true if and only if the date is on or before day 15 at 23:59:59.

**Validates: Requirements 1.2**

### Property 3: Business Day Calculation Excludes Non-Working Days

*For any* start date and number of business days N, calculating N business days forward should skip all weekends (Saturday, Sunday) and holidays from the calendar.

**Validates: Requirements 1.3, 1.7, 9.7**

### Property 4: Cycle Status Transitions Follow State Machine

*For any* cycle, status transitions should follow the valid sequence: open → production → shipping → completed, and no other transitions should be allowed.

**Validates: Requirements 2.3, 2.5, 2.6**

### Property 5: Production Status Blocks Modifications

*For any* cycle with status "production", "shipping", or "completed", all attempts to create purchases or change collections should be rejected.

**Validates: Requirements 2.4**


### Property 6: Status Transitions Record Timestamps

*For any* cycle status transition, a timestamp in Bahia timezone should be recorded in the status_changed_at field.

**Validates: Requirements 2.7**

### Property 7: Capacity Check Before Purchase

*For any* subscription or standalone purchase creation attempt, capacity availability must be verified before confirming the purchase.

**Validates: Requirements 3.2, 3.3, 22.1, 22.4**

### Property 8: Capacity Calculation Accuracy

*For any* cycle, the capacity_current value should equal the sum of all subscription deliveries plus standalone purchases scheduled for that cycle.

**Validates: Requirements 3.5**

### Property 9: Capacity Release on Cancellation

*For any* subscription or standalone purchase cancelled before cutoff, the reserved capacity should be released and capacity_current decremented accordingly.

**Validates: Requirements 3.6, 4.7, 23.4, 26.6**

### Property 10: Standalone Purchase Deposit Amount

*For any* standalone purchase, the deposit_amount field should be exactly R$100.00.

**Validates: Requirements 4.1**


### Property 11: Deposit Reserves Capacity

*For any* standalone purchase with confirmed deposit payment, production capacity should be reserved and the purchase should enter production.

**Validates: Requirements 4.2**

### Property 12: Balance Calculation Correctness

*For any* standalone purchase, balance_amount should equal (collection price - deposit_amount).

**Validates: Requirements 4.3**

### Property 13: Balance Payment Deadline Calculation

*For any* standalone purchase with completed production, the balance_due_date should be set to 5 business days after production_complete_at.

**Validates: Requirements 4.4**

### Property 14: Balance Payment Triggers Shipping

*For any* standalone purchase where balance is paid within the deadline, the status should transition to "balance_paid" and shipping should be scheduled.

**Validates: Requirements 4.5**

### Property 15: Deposit Retention on Non-Payment

*For any* standalone purchase where balance is not paid by balance_due_date, the order should be cancelled, deposit retained, and cancellation_reason recorded.

**Validates: Requirements 4.6, 4.8**


### Property 16: Balance Payment Generates Shipping Label

*For any* standalone purchase where balance is paid, a shipping label should be generated and tracking_code populated.

**Validates: Requirements 4.9**

### Property 17: Fixed Collections Always Active

*For any* month and year, all collections with rotation_type = 'fixed' should be included in the active collections list.

**Validates: Requirements 5.2**

### Property 18: Active Collections Match Rotation Pattern

*For any* month M, active collections should include all fixed collections plus rotating collections where (rotation_type = 'odd_months' AND M is odd) OR (rotation_type = 'even_months' AND M is even).

**Validates: Requirements 5.4**

### Property 19: Inactive Collections Hidden from Selection

*For any* collection that is not active in the current month, it should not appear in the collection selection interface.

**Validates: Requirements 5.5, 5.6**

### Property 20: Minimum Fixed Collections Invariant

*At any* point in time, the system should have at least 2 collections with rotation_type = 'fixed' and is_active = true.

**Validates: Requirements 5.8**


### Property 21: Automatic Maintenance Copies Previous Choice

*For any* delivery at cycle start where the subscriber has not made a collection choice, the system should copy the previous month's collection_id to the current delivery and set auto_maintained = true.

**Validates: Requirements 6.2, 10.4**

### Property 22: Automatic Maintenance Flag Set

*For any* delivery where collection choice is automatically maintained, the auto_maintained field should be set to true.

**Validates: Requirements 6.4**

### Property 23: Auto-Maintained Choices Can Be Changed Before Cutoff

*For any* delivery with auto_maintained = true, if the current date is before cutoff, the subscriber should be able to change the collection choice.

**Validates: Requirements 6.6**

### Property 24: Collection Changes Allowed Before Cutoff

*For any* delivery, collection choice changes should be allowed if and only if the current Bahia time is before day 15 at 23:59:59.

**Validates: Requirements 7.1, 7.2**

### Property 25: Cutoff Rule Applies to All Purchase Types

*For any* purchase type (subscription delivery or standalone purchase), the cutoff rule should prevent modifications after day 15 at 23:59:59 Bahia time.

**Validates: Requirements 7.6**


### Property 26: Collection Changes Create Audit Records

*For any* collection choice change, a record should be created in collection_choice_history with delivery_id, user_id, previous_collection_id, new_collection_id, and timestamp.

**Validates: Requirements 8.1, 8.2**

### Property 27: Audit Records Include Request Metadata

*For any* collection choice change, the audit record should include ip_address and user_agent from the request.

**Validates: Requirements 8.3**

### Property 28: Automatic Maintenance Recorded in Audit Trail

*For any* automatically maintained collection choice, an audit record should be created with change_reason = 'automatic_maintenance'.

**Validates: Requirements 8.7**

### Property 29: Cycle 1 Subscriptions Schedule Next Month

*For any* subscription created during Cycle 1 (days 1-15), the first delivery should be scheduled for the next month.

**Validates: Requirements 9.1**

### Property 30: Cycle 2 Subscriptions Schedule Second Subsequent Month

*For any* subscription created during Cycle 2 (days 16-end), the first delivery should be scheduled for the month after next.

**Validates: Requirements 9.2**


### Property 31: Deliveries Scheduled Consecutively

*For any* subscription, all deliveries should be scheduled in consecutive months starting from the first delivery month.

**Validates: Requirements 9.3**

### Property 32: Trimestral Plan Creates Three Deliveries

*For any* subscription with plan_type = 'trimestral', exactly 3 delivery records should be created.

**Validates: Requirements 9.4**

### Property 33: Semestral Plan Creates Six Deliveries

*For any* subscription with plan_type = 'semestral', exactly 6 delivery records should be created.

**Validates: Requirements 9.5**

### Property 34: Deliveries Associated with Correct Cycle

*For any* delivery, the cycle_id should reference the appropriate cycle (1 or 2) for the delivery's scheduled month.

**Validates: Requirements 9.6**

### Property 35: Capacity Check Prevents Over-Scheduling

*For any* subscription, if any scheduled delivery month would exceed capacity, the subscription creation should be rejected.

**Validates: Requirements 9.9**


### Property 36: Scheduled Deliveries Created with Pending Status

*For any* scheduled delivery identified by the cron job, a delivery record should be created with status = 'pending_choice'.

**Validates: Requirements 10.3**

### Property 37: Collection Choice Updates Delivery Status

*For any* delivery with a collection choice determined, the status should be updated to 'confirmed'.

**Validates: Requirements 10.5**

### Property 38: Semestral Sixth Delivery Has Bonus

*For any* subscription with plan_type = 'semestral', the 6th delivery should have bonus_piece_id populated with a bonus piece.

**Validates: Requirements 11.1, 11.3**

### Property 39: Bonus Pieces Not User-Selectable

*For any* bonus piece, it should be assigned by the system and not selectable by the subscriber.

**Validates: Requirements 11.4**

### Property 40: Character Revelation Updates Collection Status

*For any* collection where character_revelation_date is reached, the revealed field should be set to true.

**Validates: Requirements 12.3**


### Property 41: Revelation Notifies All Subscribers

*For any* character revelation, email notifications should be sent to all subscribers who have chosen that collection for any delivery.

**Validates: Requirements 12.4**

### Property 42: Subscription Creation Determines Cycle Association

*For any* subscription, the entry_cycle_id should be set based on the creation date: Cycle 1 if day 1-15, Cycle 2 if day 16-end.

**Validates: Requirements 20.1, 20.2, 20.3, 20.4**

### Property 43: Cycle Association Determines First Delivery

*For any* subscription, the first delivery month should be calculated based on the entry_cycle_id.

**Validates: Requirements 20.5**

### Property 44: Subscription Creation Increments Capacity

*For any* subscription creation, the capacity_current for the entry cycle should be incremented by the number of deliveries.

**Validates: Requirements 20.7**

### Property 45: Pause Request Validates Cutoff

*For any* pause request, the system should verify the current date is before cutoff before allowing the pause.

**Validates: Requirements 23.1**


### Property 46: Valid Pause Marks Delivery and Shifts Schedule

*For any* valid pause request, the next delivery should be marked as paused and all subsequent deliveries should shift by one month.

**Validates: Requirements 23.2, 23.3**

### Property 47: Pause Count Limit Enforced

*For any* subscription, the pause_count should never exceed 2, and pause requests beyond this limit should be rejected.

**Validates: Requirements 23.6**

### Property 48: Cancellation Before Shipment Gets Full Refund

*For any* subscription cancellation requested before the first delivery ships, a full refund (minus R$50 admin fee) should be processed.

**Validates: Requirements 26.1, 26.4**

### Property 49: Cancellation After Shipment Gets Prorated Refund

*For any* subscription cancellation requested after the first delivery ships, the refund should be prorated based on remaining deliveries (minus R$50 admin fee).

**Validates: Requirements 26.2, 26.4**

### Property 50: Cancellation Cancels Future Deliveries

*For any* subscription cancellation, all deliveries with status 'scheduled' or 'pending_choice' should be cancelled.

**Validates: Requirements 26.5**


### Property 51: Refund Processed Within Business Days

*For any* approved cancellation, the refund should be processed within 10 business days of approval.

**Validates: Requirements 26.8**

## Error Handling

### Error Categories

**1. Capacity Errors**
- `CAPACITY_EXCEEDED`: Thrown when attempting to reserve capacity beyond limit
- `CAPACITY_UNAVAILABLE`: Thrown when capacity check fails before purchase
- `CAPACITY_RACE_CONDITION`: Thrown when capacity becomes unavailable between check and reservation

**2. Cutoff Errors**
- `CUTOFF_PASSED`: Thrown when attempting modifications after day 15 23:59:59
- `CYCLE_CLOSED`: Thrown when attempting operations on closed cycles

**3. Business Rule Errors**
- `INVALID_COLLECTION_CHOICE`: Thrown when selecting inactive collection
- `PAUSE_LIMIT_EXCEEDED`: Thrown when attempting more than 2 pauses
- `INVALID_CYCLE_TRANSITION`: Thrown when attempting invalid status transition
- `BALANCE_PAYMENT_OVERDUE`: Thrown when balance payment deadline passed

**4. Data Validation Errors**
- `INVALID_TIMEZONE`: Thrown when timezone conversion fails
- `INVALID_DATE_RANGE`: Thrown when date range is invalid
- `MISSING_REQUIRED_FIELD`: Thrown when required field is null


### Error Handling Strategy

**Frontend Error Handling:**
```typescript
try {
  await changeCollectionChoice(deliveryId, newCollectionId);
  toast.success('Collection choice updated successfully');
} catch (error) {
  if (error.code === 'CUTOFF_PASSED') {
    toast.error('Changes blocked', {
      description: 'Production has started. Changes are no longer allowed.'
    });
  } else if (error.code === 'INVALID_COLLECTION_CHOICE') {
    toast.error('Invalid collection', {
      description: 'This collection is not available this month.'
    });
  } else {
    toast.error('Failed to update choice', {
      description: error.message
    });
  }
}
```

**Backend Error Handling:**
```typescript
// Edge Function error handling
export async function reserveCapacity(cycleId: string, quantity: number) {
  const { data: cycle, error } = await supabase
    .from('cycles')
    .select('capacity_max, capacity_current')
    .eq('id', cycleId)
    .single();
    
  if (error) throw new DatabaseError(error.message);
  
  if (cycle.capacity_current + quantity > cycle.capacity_max) {
    throw new CapacityError('CAPACITY_EXCEEDED', 
      `Cannot reserve ${quantity} units. Only ${cycle.capacity_max - cycle.capacity_current} available.`);
  }
  
  // Attempt reservation with optimistic locking
  const { error: updateError } = await supabase.rpc('reserve_capacity', {
    p_cycle_id: cycleId,
    p_quantity: quantity
  });
  
  if (updateError) {
    if (updateError.message.includes('Capacity limit exceeded')) {
      throw new CapacityError('CAPACITY_RACE_CONDITION',
        'Capacity was reserved by another transaction. Please try again.');
    }
    throw new DatabaseError(updateError.message);
  }
}
```


### Retry Logic

**Transient Failures:**
- Database connection errors: Retry up to 3 times with exponential backoff
- External API failures (shipping, email): Retry up to 5 times with exponential backoff
- Capacity race conditions: Retry up to 2 times immediately

**Non-Retryable Failures:**
- Business rule violations (cutoff passed, pause limit exceeded)
- Data validation errors
- Authorization failures

**Implementation:**
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    retryableErrors: string[];
    backoff: 'exponential' | 'immediate';
  }
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!options.retryableErrors.includes(error.code)) {
        throw error;
      }
      
      if (attempt < options.maxRetries) {
        const delay = options.backoff === 'exponential' 
          ? Math.pow(2, attempt) * 1000 
          : 0;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```


## Testing Strategy

### Dual Testing Approach

The ORDAX system requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples and edge cases
- Integration points between components
- Error conditions and boundary cases
- UI component rendering and interactions

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Business rules that apply across all data
- State machine transitions
- Data integrity constraints

### Property-Based Testing Configuration

**Library:** fast-check (JavaScript/TypeScript property-based testing library)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: ordax-complete-system, Property {N}: {description}`

**Example Property Test:**
```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { calculateBusinessDays } from './business-days';

describe('Business Day Calculation', () => {
  it('Property 3: Business day calculation excludes weekends and holidays', () => {
    // Feature: ordax-complete-system, Property 3
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31') }),
        fc.integer({ min: 1, max: 30 }),
        (startDate, numDays) => {
          const result = calculateBusinessDays(startDate, numDays);
          
          // Verify no weekends in result
          let current = new Date(startDate);
          let count = 0;
          
          while (count < numDays) {
            current.setDate(current.getDate() + 1);
            const dayOfWeek = current.getDay();
            
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday(current)) {
              count++;
            }
          }
          
          expect(result).toEqual(current);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```


### Unit Test Examples

**Timezone Conversion:**
```typescript
describe('Timezone Conversion', () => {
  it('should convert Bahia time to UTC correctly', () => {
    const bahiaTime = new Date('2026-03-15T23:59:59');
    const utc = toUTC(bahiaTime);
    
    // Bahia is UTC-3, so 23:59:59 Bahia = 02:59:59 UTC next day
    expect(utc.getUTCHours()).toBe(2);
    expect(utc.getUTCMinutes()).toBe(59);
  });
  
  it('should handle cutoff edge case', () => {
    const cutoffTime = new Date('2026-03-15T23:59:59');
    expect(isBeforeCutoff(cutoffTime)).toBe(true);
    
    const afterCutoff = new Date('2026-03-16T00:00:00');
    expect(isBeforeCutoff(afterCutoff)).toBe(false);
  });
});
```

**Capacity Management:**
```typescript
describe('Capacity Management', () => {
  it('should reject purchase when capacity exceeded', async () => {
    const cycle = await createCycle({ capacity_max: 100, capacity_current: 100 });
    
    await expect(
      reserveCapacity(cycle.id, 1)
    ).rejects.toThrow('CAPACITY_EXCEEDED');
  });
  
  it('should handle race condition gracefully', async () => {
    const cycle = await createCycle({ capacity_max: 100, capacity_current: 99 });
    
    // Simulate two concurrent reservations
    const results = await Promise.allSettled([
      reserveCapacity(cycle.id, 1),
      reserveCapacity(cycle.id, 1)
    ]);
    
    // One should succeed, one should fail
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    expect(succeeded).toBe(1);
    expect(failed).toBe(1);
  });
});
```


### Integration Tests

**Subscription Creation Flow:**
```typescript
describe('Subscription Creation Integration', () => {
  it('should create subscription with all deliveries and reserve capacity', async () => {
    const user = await createTestUser();
    const collection = await createTestCollection();
    const cycle = await createCycle({ 
      cycle_number: 1, 
      month: 3, 
      year: 2026,
      capacity_max: 100,
      capacity_current: 0
    });
    
    const subscription = await createSubscription({
      user_id: user.id,
      collection_id: collection.id,
      plan_type: 'trimestral'
    });
    
    // Verify subscription created
    expect(subscription.entry_cycle_id).toBe(cycle.id);
    expect(subscription.deliveries_total).toBe(3);
    
    // Verify deliveries created
    const deliveries = await getDeliveriesForSubscription(subscription.id);
    expect(deliveries).toHaveLength(3);
    expect(deliveries[0].delivery_number).toBe(1);
    expect(deliveries[1].delivery_number).toBe(2);
    expect(deliveries[2].delivery_number).toBe(3);
    
    // Verify capacity reserved
    const updatedCycle = await getCycle(cycle.id);
    expect(updatedCycle.capacity_current).toBe(3);
  });
});
```

**Standalone Purchase Deposit Flow:**
```typescript
describe('Standalone Purchase Deposit Flow', () => {
  it('should complete full deposit to delivery flow', async () => {
    const user = await createTestUser();
    const collection = await createTestCollection({ price: 300 });
    const cycle = await createCycle();
    
    // Create purchase with deposit
    const purchase = await createStandalonePurchase({
      user_id: user.id,
      collection_id: collection.id,
      cycle_id: cycle.id
    });
    
    expect(purchase.deposit_amount).toBe(100);
    expect(purchase.balance_amount).toBe(200);
    expect(purchase.status).toBe('deposit_paid');
    
    // Mark production complete
    await markProductionComplete(purchase.id);
    
    const updated = await getStandalonePurchase(purchase.id);
    expect(updated.status).toBe('awaiting_balance');
    expect(updated.balance_due_date).toBeDefined();
    
    // Pay balance
    await processBalancePayment(purchase.id, 'voucher_url');
    
    const final = await getStandalonePurchase(purchase.id);
    expect(final.status).toBe('balance_paid');
    expect(final.tracking_code).toBeDefined();
  });
});
```


### End-to-End Tests

**Complete Subscription Lifecycle:**
```typescript
describe('Complete Subscription Lifecycle E2E', () => {
  it('should handle full subscription from creation to delivery', async () => {
    // 1. User creates subscription
    const subscription = await createSubscriptionViaUI({
      plan: 'trimestral',
      collection: 'Marvel Heroes'
    });
    
    // 2. System creates deliveries
    await runCronJob('create-deliveries');
    
    // 3. User changes collection choice
    const deliveries = await getDeliveries(subscription.id);
    await changeCollectionChoice(deliveries[0].id, 'DC Heroes');
    
    // 4. Verify audit trail
    const history = await getCollectionHistory(deliveries[0].id);
    expect(history).toHaveLength(1);
    expect(history[0].previous_collection_id).toBe('Marvel Heroes');
    expect(history[0].new_collection_id).toBe('DC Heroes');
    
    // 5. Cutoff passes, cycle transitions
    await advanceTimeTo('2026-03-16T00:00:00');
    await runCronJob('transition-cycles');
    
    // 6. Attempt to change after cutoff (should fail)
    await expect(
      changeCollectionChoice(deliveries[0].id, 'Marvel Heroes')
    ).rejects.toThrow('CUTOFF_PASSED');
    
    // 7. Production completes, shipping scheduled
    await markDeliveryStatus(deliveries[0].id, 'in_production');
    await markDeliveryStatus(deliveries[0].id, 'shipped');
    
    // 8. Verify email notifications sent
    const emails = await getEmailsSentTo(subscription.user_id);
    expect(emails).toContainEqual(
      expect.objectContaining({ type: 'welcome' })
    );
    expect(emails).toContainEqual(
      expect.objectContaining({ type: 'shipping', tracking_code: expect.any(String) })
    );
  });
});
```


### Test Coverage Requirements

**Minimum Coverage Targets:**
- Overall code coverage: 80%
- Critical paths (capacity, cutoff, payments): 95%
- Business logic functions: 90%
- UI components: 70%
- Database functions: 85%

**Critical Paths to Test:**
1. Subscription creation with capacity check
2. Standalone purchase deposit and balance flow
3. Collection choice changes with audit trail
4. Automatic maintenance of collection choices
5. Cutoff enforcement
6. Cycle status transitions
7. Business day calculations
8. Timezone conversions
9. Capacity reservation and release
10. Email notification triggers

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Database Migrations:**
- Create standalone_purchases table
- Create collection_choice_history table
- Add rotation_type, character_revelation_date, revealed fields to collections
- Add tracking_code, cycle_id, collection_id, auto_maintained, bonus_piece_id to subscription_deliveries
- Add entry_cycle_id, pause_count to subscriptions
- Create database functions for capacity management, business days, active collections

**Timezone Configuration:**
- Implement timezone utility functions (toUTC, toBahiaTime, isBeforeCutoff)
- Add timezone handling to all date/time operations
- Update existing code to use Bahia timezone

**Code Cleanup:**
- Remove commented code blocks
- Uncomment and fix collection change history code at MySubscriptions.tsx:605
- Add TypeScript types for new tables
- Add JSDoc comments to functions


### Phase 2: Core Features (Weeks 3-5)

**Bimonthly Rotating Collections:**
- Implement collection rotation logic
- Create getActiveCollections function
- Update collection selection UI to show only active collections
- Add rotation schedule display in admin panel

**Automatic Maintenance:**
- Implement automatic collection choice maintenance
- Create cron job to apply maintenance at cycle start
- Add auto_maintained flag handling
- Update UI to show auto-maintained choices

**Collection Change Audit Trail:**
- Implement audit trail recording on all changes
- Add IP address and user agent capture
- Create audit trail view in subscriber dashboard
- Create admin audit trail viewer

**Cycle Cutoff Enforcement:**
- Implement isBeforeCutoff checks in all modification endpoints
- Add cutoff countdown timer to UI
- Disable UI elements after cutoff
- Add error messages for post-cutoff attempts

**Production Capacity Enforcement:**
- Implement capacity checks before all purchases
- Add capacity reservation on subscription creation
- Add capacity release on cancellation
- Create capacity monitoring dashboard

### Phase 3: Standalone Purchases (Weeks 6-7)

**Deposit Model:**
- Create standalone purchase creation endpoint
- Implement deposit payment verification
- Add capacity reservation for standalone purchases
- Create standalone purchase status tracking

**Balance Payment:**
- Implement balance due date calculation
- Create balance payment processing
- Add balance payment reminders
- Implement deposit retention on non-payment

**Admin Interface:**
- Create standalone purchase management UI
- Add payment voucher verification interface
- Create standalone purchase status updates
- Add standalone purchase reporting


### Phase 4: Automation (Weeks 8-9)

**Cron Jobs:**
- Create delivery creation cron job (daily at 00:01 Bahia time)
- Create character revelation cron job (daily at 10:00 Bahia time)
- Create cycle transition cron job (daily at 00:01 Bahia time)
- Create balance payment deadline checker (daily at 10:00 Bahia time)
- Create tracking status updater (daily at 14:00 Bahia time)

**Consecutive Delivery Scheduling:**
- Implement delivery scheduling logic
- Add cycle association on delivery creation
- Calculate shipping deadlines using business days
- Handle capacity checks for all scheduled deliveries

**Subscription-Cycle Association:**
- Implement cycle determination on subscription creation
- Add entry_cycle_id population
- Use cycle association for first delivery calculation
- Update capacity for entry cycle

### Phase 5: Admin Panel (Weeks 10-11)

**Cycle Dashboard:**
- Create cycle overview component
- Add capacity usage visualization
- Display pending choices list
- Add manual status transition controls
- Create collection breakdown view
- Add CSV export functionality

**Collection Management:**
- Create collection CRUD interface
- Add rotation type configuration
- Implement character revelation date setting
- Add collection statistics display
- Create collection activation/deactivation

**Delivery Management:**
- Create delivery list with filters
- Add search functionality
- Implement status update interface
- Add tracking code management
- Create bulk operations
- Add delivery detail view

**Capacity Management:**
- Create capacity configuration interface
- Add real-time usage monitoring
- Implement capacity forecast
- Create allocation breakdown
- Add alert configuration


### Phase 6: Notifications & Integration (Weeks 12-13)

**Email Notification System:**
- Set up email service integration (SendGrid/AWS SES)
- Create email templates for all notification types
- Implement notification trigger functions
- Add notification preference management
- Create email sending queue
- Add email delivery tracking

**Shipping Carrier Integration:**
- Integrate with Correios or private carrier API
- Implement label generation
- Add tracking code retrieval
- Create tracking status polling
- Implement batch label generation
- Add shipping cost calculation

**Tracking Management:**
- Add tracking code to deliveries
- Create tracking status update cron job
- Implement automatic status updates from carrier
- Add tracking link in notifications
- Create tracking history view

### Phase 7: Enhancements (Weeks 14-15)

**Bonus Piece System:**
- Create bonus_pieces table and management
- Implement bonus piece assignment for Semestral 6th delivery
- Add bonus piece catalog
- Create bonus piece inventory tracking
- Update UI to show bonus piece information

**Subscription Pause:**
- Implement pause request validation
- Add pause count tracking
- Create delivery schedule shifting logic
- Implement capacity release on pause
- Add pause confirmation emails
- Update UI with pause controls

**Subscriber Dashboard:**
- Enhance dashboard with all subscription info
- Add next delivery countdown
- Display past deliveries with tracking
- Show upcoming deliveries
- Add quick action buttons
- Display payment history
- Show bonus piece eligibility

**Collection Selection Interface:**
- Enhance collection selection UI
- Add character revelation status display
- Show rotation schedule
- Implement confirmation dialogs
- Add cutoff enforcement UI
- Display auto-maintained indicator


### Phase 8: Quality & Launch (Weeks 16-17)

**Testing:**
- Write unit tests for all critical functions
- Implement property-based tests for business rules
- Create integration tests for key flows
- Write end-to-end tests for complete lifecycles
- Achieve 80% code coverage minimum
- Perform manual testing on staging

**Performance Optimization:**
- Add database indexes on frequently queried fields
- Implement query optimization
- Add caching for active collections
- Optimize image loading
- Implement pagination for large lists
- Add connection pooling

**Security:**
- Implement input validation and sanitization
- Add rate limiting on API endpoints
- Ensure HTTPS for all communications
- Encrypt payment vouchers at rest
- Implement CSRF protection
- Add security headers
- Perform security audit

**Mobile Responsiveness:**
- Test all pages on mobile devices
- Optimize for 320px+ screens
- Ensure touch-friendly interactions
- Test on iOS Safari and Android Chrome
- Optimize mobile image sizes

**Accessibility:**
- Add alt text to all images
- Ensure keyboard navigation
- Verify color contrast ratios
- Add ARIA labels
- Test with screen readers
- Add skip navigation links
- Ensure 200% zoom support

**Monitoring & Logging:**
- Set up logging infrastructure
- Implement error tracking
- Add performance monitoring
- Create alerting for critical errors
- Set up log retention
- Create admin log viewer

**Deployment:**
- Prepare production environment
- Run database migrations
- Deploy backend services
- Deploy frontend application
- Configure cron jobs
- Set up monitoring
- Perform smoke tests
- Enable feature flags gradually


## API Endpoints

### Subscription Endpoints

**POST /api/subscriptions**
```typescript
Request:
{
  user_id: string;
  collection_id: string;
  plan_type: 'trimestral' | 'semestral';
  payment_method: 'pix' | 'credit_card' | 'boleto';
  payment_voucher_url?: string;
}

Response:
{
  subscription: Subscription;
  deliveries: Delivery[];
  entry_cycle: Cycle;
}

Errors:
- CAPACITY_EXCEEDED: Capacity not available for all deliveries
- INVALID_COLLECTION: Collection not active
- PAYMENT_REQUIRED: Payment voucher required
```

**PUT /api/subscriptions/:id/pause**
```typescript
Request:
{
  reason?: string;
}

Response:
{
  subscription: Subscription;
  updated_deliveries: Delivery[];
}

Errors:
- CUTOFF_PASSED: Cannot pause after cutoff
- PAUSE_LIMIT_EXCEEDED: Maximum 2 pauses allowed
- INVALID_STATUS: Subscription not active
```

**DELETE /api/subscriptions/:id**
```typescript
Request:
{
  reason: string;
}

Response:
{
  refund_amount: number;
  admin_fee: number;
  cancelled_deliveries: string[];
}

Errors:
- INVALID_STATUS: Subscription already cancelled
```


### Delivery Endpoints

**PUT /api/deliveries/:id/collection**
```typescript
Request:
{
  collection_id: string;
  ip_address: string;
  user_agent: string;
}

Response:
{
  delivery: Delivery;
  audit_record: CollectionChoiceHistory;
}

Errors:
- CUTOFF_PASSED: Changes not allowed after cutoff
- INVALID_COLLECTION: Collection not active this month
- DELIVERY_LOCKED: Delivery already in production
```

**GET /api/deliveries/:id/history**
```typescript
Response:
{
  history: CollectionChoiceHistory[];
}
```

**PUT /api/deliveries/:id/status**
```typescript
Request:
{
  status: DeliveryStatus;
  tracking_code?: string;
}

Response:
{
  delivery: Delivery;
}

Errors:
- INVALID_TRANSITION: Status transition not allowed
- ADMIN_ONLY: Only admins can update status
```

### Standalone Purchase Endpoints

**POST /api/standalone-purchases**
```typescript
Request:
{
  user_id: string;
  collection_id: string;
  cycle_id: string;
  deposit_voucher_url: string;
}

Response:
{
  purchase: StandalonePurchase;
}

Errors:
- CAPACITY_EXCEEDED: Cycle at capacity
- INVALID_COLLECTION: Collection not available
- CUTOFF_PASSED: Cycle closed for purchases
```


**POST /api/standalone-purchases/:id/balance**
```typescript
Request:
{
  balance_voucher_url: string;
}

Response:
{
  purchase: StandalonePurchase;
  tracking_code: string;
}

Errors:
- PAYMENT_OVERDUE: Balance payment deadline passed
- INVALID_STATUS: Purchase not awaiting balance
```

**POST /api/standalone-purchases/:id/cancel**
```typescript
Request:
{
  reason: string;
}

Response:
{
  purchase: StandalonePurchase;
  capacity_released: number;
}
```

### Collection Endpoints

**GET /api/collections/active**
```typescript
Query:
{
  month: number;
  year: number;
  plan_type?: 'trimestral' | 'semestral';
}

Response:
{
  collections: Collection[];
}
```

**GET /api/collections/:id/rotation-schedule**
```typescript
Response:
{
  rotation_type: 'fixed' | 'odd_months' | 'even_months';
  available_months: number[]; // [1, 3, 5, 7, 9, 11] for odd_months
}
```

**POST /api/collections/:id/reveal**
```typescript
Request:
{
  character_name: string;
  character_image_url: string;
}

Response:
{
  collection: Collection;
  notified_subscribers: number;
}

Errors:
- ALREADY_REVEALED: Character already revealed
- ADMIN_ONLY: Only admins can reveal characters
```


### Admin Endpoints

**GET /api/admin/cycles/:id/dashboard**
```typescript
Response:
{
  cycle: Cycle;
  capacity_usage: {
    max: number;
    current: number;
    available: number;
    percentage: number;
  };
  breakdown_by_collection: {
    collection_id: string;
    collection_name: string;
    count: number;
  }[];
  pending_choices: {
    user_id: string;
    delivery_id: string;
    user_name: string;
  }[];
  time_until_cutoff: number; // seconds
}
```

**PUT /api/admin/cycles/:id/transition**
```typescript
Request:
{
  new_status: CycleStatus;
}

Response:
{
  cycle: Cycle;
}

Errors:
- INVALID_TRANSITION: Status transition not allowed
```

**GET /api/admin/capacity**
```typescript
Query:
{
  months?: number; // forecast months
}

Response:
{
  current_month: {
    cycle1: CapacityUsage;
    cycle2: CapacityUsage;
  };
  forecast: {
    month: number;
    year: number;
    projected_usage: number;
    capacity_limit: number;
  }[];
}
```

**POST /api/admin/holidays**
```typescript
Request:
{
  holiday_date: string; // YYYY-MM-DD
  name: string;
  description?: string;
  type: 'national' | 'state';
  state_code?: string;
  is_recurring: boolean;
}

Response:
{
  holiday: Holiday;
}
```


**POST /api/admin/payments/:id/verify**
```typescript
Request:
{
  approved: boolean;
  rejection_reason?: string;
}

Response:
{
  payment: Payment;
  order_status: string;
}
```

**GET /api/admin/deliveries**
```typescript
Query:
{
  cycle_id?: string;
  status?: DeliveryStatus;
  search?: string; // subscriber name or order number
  page?: number;
  limit?: number;
}

Response:
{
  deliveries: Delivery[];
  total: number;
  page: number;
  pages: number;
}
```

**PUT /api/admin/deliveries/bulk-update**
```typescript
Request:
{
  delivery_ids: string[];
  status: DeliveryStatus;
  tracking_code?: string;
}

Response:
{
  updated_count: number;
  failed: string[];
}
```

### Subscriber Dashboard Endpoint

**GET /api/subscriber/dashboard**
```typescript
Response:
{
  active_subscription: Subscription | null;
  next_delivery: {
    delivery: Delivery;
    collection: Collection;
    days_until_cutoff: number;
  } | null;
  past_deliveries: {
    delivery: Delivery;
    collection: Collection;
    tracking_status: string;
  }[];
  upcoming_deliveries: {
    delivery: Delivery;
    expected_month: string;
    auto_maintained: boolean;
  }[];
  pause_count_remaining: number;
  payment_history: Payment[];
  bonus_piece_eligible: boolean;
}
```


## Cron Job Specifications

### Daily Delivery Creation (00:01 Bahia Time)

**Purpose:** Create delivery records for subscriptions scheduled for current month

**Logic:**
```typescript
async function createMonthlyDeliveries() {
  const bahiaTime = toBahiaTime(new Date());
  const day = bahiaTime.getDate();
  
  // Only run on day 1
  if (day !== 1) return;
  
  const month = bahiaTime.getMonth() + 1;
  const year = bahiaTime.getFullYear();
  
  // Find all subscriptions with deliveries scheduled for this month
  const subscriptions = await supabase
    .from('subscriptions')
    .select('*, subscription_deliveries(*)')
    .eq('status', 'active');
  
  for (const subscription of subscriptions) {
    const deliveryNumber = subscription.current_delivery_number;
    
    // Check if delivery already exists
    const existing = subscription.subscription_deliveries.find(
      d => d.delivery_number === deliveryNumber
    );
    
    if (!existing) {
      // Create delivery record
      const delivery = await supabase
        .from('subscription_deliveries')
        .insert({
          subscription_id: subscription.id,
          delivery_number: deliveryNumber,
          status: 'pending_choice',
          expected_delivery_date: calculateShippingDeadline(month, year)
        })
        .select()
        .single();
      
      // Apply automatic maintenance if no choice made
      await applyAutomaticMaintenance(delivery.id, subscription.id);
    }
  }
  
  console.log(`Created deliveries for ${month}/${year}`);
}
```


### Character Revelation (10:00 Bahia Time)

**Purpose:** Reveal characters and notify subscribers when revelation date is reached

**Logic:**
```typescript
async function processCharacterRevelations() {
  const bahiaTime = toBahiaTime(new Date());
  const today = format(bahiaTime, 'yyyy-MM-dd');
  
  // Find collections with revelation date today
  const collections = await supabase
    .from('collections')
    .select('*')
    .eq('revealed', false)
    .lte('character_revelation_date', today);
  
  for (const collection of collections) {
    // Update collection to revealed
    await supabase
      .from('collections')
      .update({ revealed: true })
      .eq('id', collection.id);
    
    // Find all subscribers who chose this collection
    const deliveries = await supabase
      .from('subscription_deliveries')
      .select('*, subscriptions(user_id, users(email))')
      .eq('collection_id', collection.id);
    
    // Send revelation emails
    for (const delivery of deliveries) {
      await sendCharacterRevelationEmail(
        delivery.subscriptions.users.email,
        collection
      );
    }
    
    console.log(`Revealed character for collection ${collection.name}, notified ${deliveries.length} subscribers`);
  }
}
```

### Cycle Transition (00:01 Bahia Time)

**Purpose:** Transition cycle statuses based on dates

**Logic:**
```typescript
async function transitionCycles() {
  const bahiaTime = toBahiaTime(new Date());
  const today = format(bahiaTime, 'yyyy-MM-dd');
  
  // Transition open cycles to production when cutoff passed
  const openCycles = await supabase
    .from('cycles')
    .select('*')
    .eq('status', 'open')
    .lte('open_end', today);
  
  for (const cycle of openCycles) {
    await supabase
      .from('cycles')
      .update({ 
        status: 'production',
        status_changed_at: new Date()
      })
      .eq('id', cycle.id);
    
    console.log(`Transitioned cycle ${cycle.id} to production`);
  }
  
  // Create new cycles for upcoming periods
  await createUpcomingCycles();
}
```


### Balance Payment Deadline Checker (10:00 Bahia Time)

**Purpose:** Check for overdue balance payments and cancel orders

**Logic:**
```typescript
async function checkBalanceDeadlines() {
  const bahiaTime = toBahiaTime(new Date());
  const today = format(bahiaTime, 'yyyy-MM-dd');
  
  // Find standalone purchases with overdue balance
  const overdue = await supabase
    .from('standalone_purchases')
    .select('*')
    .eq('status', 'awaiting_balance')
    .lt('balance_due_date', today);
  
  for (const purchase of overdue) {
    // Cancel purchase and retain deposit
    await supabase
      .from('standalone_purchases')
      .update({
        status: 'cancelled',
        cancelled_at: new Date(),
        cancellation_reason: 'Balance payment not received within deadline (Arras Confirmatórias)'
      })
      .eq('id', purchase.id);
    
    // Release capacity
    await releaseCapacity(purchase.cycle_id, 1);
    
    // Send cancellation notice
    await sendCancellationNotice(purchase.user_id, purchase.id);
    
    console.log(`Cancelled purchase ${purchase.id} for non-payment`);
  }
  
  // Send reminders for purchases due in 1 day
  const dueSoon = await supabase
    .from('standalone_purchases')
    .select('*')
    .eq('status', 'awaiting_balance')
    .eq('balance_due_date', addDays(today, 1));
  
  for (const purchase of dueSoon) {
    await sendUrgentBalanceReminder(purchase.user_id, purchase.id);
  }
}
```

### Tracking Status Updater (14:00 Bahia Time)

**Purpose:** Poll shipping carrier for tracking updates

**Logic:**
```typescript
async function updateTrackingStatuses() {
  // Find all deliveries with tracking codes that aren't delivered
  const deliveries = await supabase
    .from('subscription_deliveries')
    .select('*')
    .not('tracking_code', 'is', null)
    .in('status', ['shipped']);
  
  for (const delivery of deliveries) {
    try {
      const status = await shippingCarrier.getTrackingStatus(delivery.tracking_code);
      
      if (status.delivered) {
        await supabase
          .from('subscription_deliveries')
          .update({
            status: 'delivered',
            actual_delivery_date: status.delivered_at
          })
          .eq('id', delivery.id);
        
        console.log(`Delivery ${delivery.id} marked as delivered`);
      }
    } catch (error) {
      console.error(`Failed to update tracking for ${delivery.tracking_code}:`, error);
    }
  }
}
```


## Security Considerations

### Authentication & Authorization

**Row Level Security (RLS) Policies:**

```sql
-- Subscriptions: Users can only see their own
CREATE POLICY "Users view own subscriptions"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Deliveries: Users can only see their own
CREATE POLICY "Users view own deliveries"
  ON subscription_deliveries FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  );

-- Standalone purchases: Users can only see their own
CREATE POLICY "Users view own purchases"
  ON standalone_purchases FOR SELECT
  USING (user_id = auth.uid());

-- Collection choice history: Users can only see their own
CREATE POLICY "Users view own history"
  ON collection_choice_history FOR SELECT
  USING (user_id = auth.uid());

-- Admin policies
CREATE POLICY "Admins manage all"
  ON subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Input Validation

**Zod Schemas:**
```typescript
const CreateSubscriptionSchema = z.object({
  user_id: z.string().uuid(),
  collection_id: z.string().uuid(),
  plan_type: z.enum(['trimestral', 'semestral']),
  payment_method: z.enum(['pix', 'credit_card', 'boleto']),
  payment_voucher_url: z.string().url().optional()
});

const ChangeCollectionSchema = z.object({
  collection_id: z.string().uuid(),
  ip_address: z.string().ip(),
  user_agent: z.string().max(500)
});

const CreateStandalonePurchaseSchema = z.object({
  user_id: z.string().uuid(),
  collection_id: z.string().uuid(),
  cycle_id: z.string().uuid(),
  deposit_voucher_url: z.string().url()
});
```


### Rate Limiting

**Implementation:**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true
});

export async function withRateLimit(
  identifier: string,
  handler: () => Promise<Response>
): Promise<Response> {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
  
  if (!success) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString()
      }
    });
  }
  
  return handler();
}
```

### CSRF Protection

**Implementation:**
```typescript
import { csrf } from '@edge-runtime/csrf';

const csrfProtect = csrf({
  secret: process.env.CSRF_SECRET
});

export async function withCSRF(
  request: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  const valid = await csrfProtect.verify(request);
  
  if (!valid) {
    return new Response('Invalid CSRF token', { status: 403 });
  }
  
  return handler();
}
```

### Data Encryption

**Payment Vouchers:**
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

export function encryptVoucher(data: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptVoucher(encrypted: string): string {
  const [ivHex, authTagHex, data] = encrypted.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```


## Performance Optimization

### Database Indexing Strategy

**Critical Indexes:**
```sql
-- Subscriptions
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_entry_cycle ON subscriptions(entry_cycle_id);

-- Deliveries
CREATE INDEX idx_deliveries_subscription_number ON subscription_deliveries(subscription_id, delivery_number);
CREATE INDEX idx_deliveries_cycle_status ON subscription_deliveries(cycle_id, status);
CREATE INDEX idx_deliveries_tracking ON subscription_deliveries(tracking_code) WHERE tracking_code IS NOT NULL;

-- Standalone Purchases
CREATE INDEX idx_purchases_user_status ON standalone_purchases(user_id, status);
CREATE INDEX idx_purchases_cycle ON standalone_purchases(cycle_id);
CREATE INDEX idx_purchases_balance_due ON standalone_purchases(balance_due_date) WHERE status = 'awaiting_balance';

-- Collections
CREATE INDEX idx_collections_active_rotation ON collections(is_active, rotation_type);
CREATE INDEX idx_collections_revelation ON collections(character_revelation_date) WHERE revealed = false;

-- Audit Trail
CREATE INDEX idx_choice_history_delivery ON collection_choice_history(delivery_id);
CREATE INDEX idx_choice_history_created ON collection_choice_history(created_at DESC);

-- Cycles
CREATE INDEX idx_cycles_status_dates ON cycles(status, open_start, open_end);
CREATE INDEX idx_cycles_month_year ON cycles(year, month, cycle_number);
```

### Query Optimization

**Avoid N+1 Queries:**
```typescript
// Bad: N+1 query
const subscriptions = await getSubscriptions();
for (const sub of subscriptions) {
  const deliveries = await getDeliveries(sub.id); // N queries
}

// Good: Single query with join
const subscriptions = await supabase
  .from('subscriptions')
  .select(`
    *,
    subscription_deliveries (
      *,
      collections (name, image_url)
    )
  `)
  .eq('user_id', userId);
```


### Caching Strategy

**React Query Configuration:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// Active collections - cache for 1 hour
export function useActiveCollections(month: number, year: number) {
  return useQuery({
    queryKey: ['collections', 'active', month, year],
    queryFn: () => getActiveCollections(month, year),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// Current cycle - refetch every minute
export function useCurrentCycle() {
  return useQuery({
    queryKey: ['cycle', 'current'],
    queryFn: getCurrentCycle,
    refetchInterval: 60000, // 1 minute
  });
}
```

### Image Optimization

**Lazy Loading:**
```typescript
import { useLazyImage } from '@/hooks/use-lazy-image';

export function CollectionCard({ collection }: { collection: Collection }) {
  const { ref, isVisible } = useLazyImage();
  
  return (
    <div ref={ref}>
      {isVisible ? (
        <img 
          src={collection.image_url} 
          alt={collection.name}
          loading="lazy"
        />
      ) : (
        <div className="skeleton h-48 w-full" />
      )}
    </div>
  );
}
```

**Responsive Images:**
```typescript
export function CollectionImage({ collection }: { collection: Collection }) {
  return (
    <picture>
      <source 
        media="(max-width: 640px)" 
        srcSet={`${collection.image_url}?w=400`} 
      />
      <source 
        media="(max-width: 1024px)" 
        srcSet={`${collection.image_url}?w=800`} 
      />
      <img 
        src={`${collection.image_url}?w=1200`}
        alt={collection.name}
        loading="lazy"
      />
    </picture>
  );
}
```


## Monitoring and Observability

### Logging Strategy

**Structured Logging:**
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`
});

// Usage
logger.info({ 
  action: 'subscription_created',
  subscription_id: subscription.id,
  user_id: user.id,
  plan_type: subscription.plan_type,
  entry_cycle_id: subscription.entry_cycle_id
}, 'Subscription created successfully');

logger.error({
  action: 'capacity_check_failed',
  cycle_id: cycleId,
  requested: quantity,
  available: available,
  error: error.message
}, 'Capacity check failed');
```

### Metrics Collection

**Key Metrics:**
```typescript
interface Metrics {
  // Business metrics
  subscriptions_created_today: number;
  standalone_purchases_today: number;
  capacity_usage_percentage: number;
  deliveries_shipped_today: number;
  
  // Performance metrics
  api_response_time_p95: number;
  database_query_time_p95: number;
  page_load_time_p95: number;
  
  // Error metrics
  api_error_rate: number;
  cron_job_failures: number;
  payment_verification_failures: number;
  
  // User metrics
  active_users_today: number;
  collection_changes_today: number;
  pause_requests_today: number;
}

export async function collectMetrics(): Promise<Metrics> {
  const today = startOfDay(new Date());
  
  return {
    subscriptions_created_today: await countSubscriptionsCreatedSince(today),
    standalone_purchases_today: await countPurchasesCreatedSince(today),
    capacity_usage_percentage: await getCurrentCapacityUsage(),
    deliveries_shipped_today: await countDeliveriesShippedSince(today),
    // ... other metrics
  };
}
```


### Alerting Configuration

**Critical Alerts:**
```typescript
interface Alert {
  name: string;
  condition: () => Promise<boolean>;
  severity: 'critical' | 'warning' | 'info';
  notification_channels: ('email' | 'sms' | 'slack')[];
}

const alerts: Alert[] = [
  {
    name: 'Capacity Near Limit',
    condition: async () => {
      const usage = await getCurrentCapacityUsage();
      return usage >= 80;
    },
    severity: 'warning',
    notification_channels: ['email', 'slack']
  },
  {
    name: 'Cron Job Failure',
    condition: async () => {
      const lastRun = await getLastCronJobRun('create-deliveries');
      const hoursSinceRun = differenceInHours(new Date(), lastRun);
      return hoursSinceRun > 25; // Should run daily
    },
    severity: 'critical',
    notification_channels: ['email', 'sms', 'slack']
  },
  {
    name: 'High API Error Rate',
    condition: async () => {
      const errorRate = await getAPIErrorRate('1h');
      return errorRate > 5; // More than 5% errors
    },
    severity: 'critical',
    notification_channels: ['email', 'slack']
  },
  {
    name: 'Payment Verification Backlog',
    condition: async () => {
      const pending = await countPendingPaymentVerifications();
      return pending > 50;
    },
    severity: 'warning',
    notification_channels: ['email', 'slack']
  }
];

export async function checkAlerts() {
  for (const alert of alerts) {
    const triggered = await alert.condition();
    
    if (triggered) {
      await sendAlert(alert);
    }
  }
}
```

### Health Check Endpoint

**Implementation:**
```typescript
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
  timestamp: string;
}> {
  const checks = {
    database: await checkDatabaseConnection(),
    email_service: await checkEmailService(),
    shipping_api: await checkShippingAPI(),
    storage: await checkStorageAccess(),
    cron_jobs: await checkCronJobsRunning()
  };
  
  const allHealthy = Object.values(checks).every(c => c);
  const someHealthy = Object.values(checks).some(c => c);
  
  return {
    status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  };
}
```


## Deployment Strategy

### Environment Configuration

**Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Timezone
TZ=America/Bahia

# Email Service
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=...
FROM_EMAIL=noreply@ordax.com

# Shipping Carrier
SHIPPING_API_URL=https://api.correios.com.br
SHIPPING_API_KEY=...

# Security
ENCRYPTION_KEY=...
CSRF_SECRET=...
JWT_SECRET=...

# Rate Limiting
UPSTASH_REDIS_URL=...
UPSTASH_REDIS_TOKEN=...

# Monitoring
SENTRY_DSN=...
LOG_LEVEL=info

# Feature Flags
ENABLE_STANDALONE_PURCHASES=true
ENABLE_BONUS_PIECES=true
ENABLE_CHARACTER_REVELATIONS=true
```

### Database Migration Strategy

**Migration Execution:**
```bash
# 1. Backup production database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migrations in transaction
psql $DATABASE_URL << EOF
BEGIN;

-- Run all migration files
\i migrations/001_add_standalone_purchases.sql
\i migrations/002_add_collection_choice_history.sql
\i migrations/003_add_collection_rotation.sql
\i migrations/004_add_delivery_fields.sql
\i migrations/005_add_subscription_fields.sql

-- Verify migrations
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;

COMMIT;
EOF

# 3. Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM subscriptions;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM subscription_deliveries;"
```


### Rollback Plan

**Rollback Procedure:**
```bash
# 1. Stop application
systemctl stop ordax-app

# 2. Restore database from backup
psql $DATABASE_URL < backup_20260301_120000.sql

# 3. Revert code deployment
git checkout previous-stable-tag
npm run build
npm run deploy

# 4. Restart application
systemctl start ordax-app

# 5. Verify rollback
curl https://api.ordax.com/health
```

**Rollback Decision Criteria:**
- Critical bug affecting > 10% of users
- Data corruption detected
- Performance degradation > 50%
- Security vulnerability discovered
- Cron jobs failing consistently

### Feature Flag Strategy

**Implementation:**
```typescript
interface FeatureFlags {
  standalone_purchases: boolean;
  bonus_pieces: boolean;
  character_revelations: boolean;
  automatic_maintenance: boolean;
  collection_rotation: boolean;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const { data } = await supabase
    .from('feature_flags')
    .select('*')
    .single();
  
  return data;
}

export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const { data } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: getFeatureFlags,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  
  return data?.[flag] ?? false;
}

// Usage
export function StandalonePurchaseButton() {
  const enabled = useFeatureFlag('standalone_purchases');
  
  if (!enabled) return null;
  
  return <Button>Purchase Single Piece</Button>;
}
```

### Gradual Rollout

**Phased Deployment:**
1. **Phase 1 (Week 1):** Deploy to 5% of users
2. **Phase 2 (Week 2):** Deploy to 25% of users if no issues
3. **Phase 3 (Week 3):** Deploy to 50% of users if no issues
4. **Phase 4 (Week 4):** Deploy to 100% of users

**User Segmentation:**
```typescript
export function isUserInRollout(userId: string, percentage: number): boolean {
  const hash = createHash('sha256').update(userId).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  const bucket = hashInt % 100;
  
  return bucket < percentage;
}
```


## Success Criteria

The ORDAX Complete System implementation will be considered successful when:

### Functional Completeness
- ✅ All 36 requirements implemented and verified
- ✅ All 51 correctness properties passing tests
- ✅ Timezone operations working correctly in America/Bahia
- ✅ Production capacity enforced across all purchase types
- ✅ Standalone purchase deposit model fully functional
- ✅ Bimonthly rotating collections working as designed
- ✅ Automatic collection maintenance operating correctly
- ✅ Collection change audit trail complete and accurate
- ✅ Cutoff enforcement preventing post-deadline changes
- ✅ Consecutive delivery scheduling working correctly
- ✅ Bonus pieces assigned to Semestral 6th deliveries
- ✅ Character revelations automated and notifying subscribers
- ✅ All cron jobs running reliably on schedule

### Admin Panel Completeness
- ✅ Cycle dashboard providing full operational visibility
- ✅ Collection management CRUD fully functional
- ✅ Delivery management with search and bulk operations
- ✅ Capacity management with forecasting
- ✅ Payment voucher verification workflow complete
- ✅ Holiday calendar management functional
- ✅ All admin reports and exports working

### Quality Metrics
- ✅ 80% minimum code coverage achieved
- ✅ 95% coverage on critical paths
- ✅ All property-based tests passing (100 iterations each)
- ✅ All integration tests passing
- ✅ All end-to-end tests passing
- ✅ Zero critical security vulnerabilities
- ✅ Performance benchmarks met (< 2s page load, < 500ms API)

### Operational Readiness
- ✅ All database migrations executed successfully
- ✅ All cron jobs scheduled and running
- ✅ Email notifications sending correctly
- ✅ Shipping carrier integration working
- ✅ Monitoring and alerting configured
- ✅ Logging infrastructure operational
- ✅ Health check endpoint responding
- ✅ Rollback procedure tested and documented

### User Experience
- ✅ Subscriber dashboard intuitive and informative
- ✅ Collection selection interface clear and responsive
- ✅ Mobile experience seamless on all devices
- ✅ Accessibility compliance verified (WCAG 2.1 AA)
- ✅ Error messages clear and actionable
- ✅ Loading states and feedback appropriate

### Business Validation
- ✅ Production capacity never exceeded
- ✅ Cutoff enforcement preventing production disruption
- ✅ Deposit retention working for non-payment
- ✅ Refund calculations accurate
- ✅ Audit trail providing complete history
- ✅ Business rules from official structure implemented

## Conclusion

This design document provides comprehensive technical specifications for completing the ORDAX subscription platform. The architecture leverages existing infrastructure (Supabase, React, TypeScript) while adding critical missing functionality including timezone-aware operations, standalone purchases with deposit model, bimonthly rotating collections, automatic maintenance, comprehensive admin panel, and automation systems.

The implementation follows a phased approach over 17 weeks, with each phase building on previous work. The dual testing strategy (unit tests + property-based tests) ensures correctness, while the security, performance, and monitoring considerations ensure production readiness.

Upon completion, ORDAX will be a fully functional premium collectibles subscription platform capable of handling complex business rules, enforcing capacity limits, automating operations, and providing excellent user experience for both subscribers and administrators.

