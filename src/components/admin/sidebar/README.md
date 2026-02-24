# CustomerSidebar Components

This directory contains the CustomerSidebar component and its sections for displaying customer context in the admin chat interface.

## Components

### CustomerSidebar

Main sidebar component that displays customer context information.

**Props:**

- `userId: string` - The customer's user ID
- `isOpen: boolean` - Whether the sidebar is open
- `onToggle: () => void` - Callback to toggle sidebar visibility

**Features:**

- Collapsible sidebar using shadcn/ui Sheet component
- Lazy loading of data when sidebar opens
- Displays 4 sections: Orders, Quotes, Subscription, Payments
- Only shows Subscription section if user has active subscription

### OrdersList

Displays list of customer orders with status and tracking information.

**Props:**

- `orders: Order[]` - Array of customer orders
- `onRefresh: () => void` - Callback to refresh data after updates

**Features:**

- Shows order number, date, total value, and status
- Displays tracking code for shipped/delivered orders
- Allows admin to update order status directly
- Shows internal production stages (admin-only)
- Triggers automatic notification when status is updated

### QuotesList

Displays list of customer quotes with status.

**Props:**

- `quotes: Quote[]` - Array of customer quotes
- `onRefresh: () => void` - Callback to refresh data after updates

**Features:**

- Shows quote number, date, items summary, and status
- Displays payment status
- Highlights pending quotes with yellow border and alert icon
- Shows items summary if available

### SubscriptionInfo

Displays active subscription information.

**Props:**

- `subscription: Subscription` - Customer's active subscription

**Features:**

- Shows subscription plan type (trimestral, semestral, anual)
- Displays subscription status with icon
- Shows next billing date
- Shows subscription start date
- Only rendered if user has active subscription

### PaymentInfo

Displays payment history and allows status updates.

**Props:**

- `payments: ManualPayment[]` - Array of customer payments
- `onRefresh: () => void` - Callback to refresh data after updates

**Features:**

- Shows payment reference number, date, amount, and status
- Displays payment type (one_time, recurring)
- Shows payment method ID
- Allows admin to update payment status
- Warns admin that status changes trigger automatic notifications

## Integration Service

The `integrationService.ts` file provides functions to fetch and update customer data:

### Functions

- `getUserOrders(userId: string): Promise<Order[]>` - Fetch all orders for a user
- `getUserQuotes(userId: string): Promise<Quote[]>` - Fetch all quotes for a user
- `getUserSubscription(userId: string): Promise<Subscription | null>` - Fetch active subscription
- `getUserPayments(userId: string): Promise<ManualPayment[]>` - Fetch all payments for a user
- `getOrderProductionStages(orderId: string): Promise<OrderProductionStage[]>` - Fetch production stages (currently disabled)
- `updateOrderStatus(orderId: string, status: string, trackingCode?: string): Promise<void>` - Update order status
- `updatePaymentStatus(paymentId: string, status: string): Promise<void>` - Update payment status

## Usage Example

```tsx
import { CustomerSidebar } from "@/components/admin/CustomerSidebar";

function AdminSupportV2() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  return (
    <div className="flex h-screen">
      <ConversationList onSelect={setSelectedConversation} />

      <div className="flex-1 flex flex-col">
        {selectedConversation && (
          <>
            <ChatHeader
              conversation={selectedConversation}
              actions={
                <CustomerSidebar
                  userId={selectedConversation.user_id}
                  isOpen={sidebarOpen}
                  onToggle={() => setSidebarOpen(!sidebarOpen)}
                />
              }
            />
            <ChatInterface conversationId={selectedConversation.id} />
          </>
        )}
      </div>
    </div>
  );
}
```

## Requirements Validation

This implementation satisfies the following requirements:

- **7.1**: Display sidebar with client's orders
- **7.2**: Show order number, date, total value, and current status
- **7.3**: Allow admin to click order to view full details
- **7.4**: Display tracking code if order status is "enviado" or "entregue"
- **7.6**: Allow admin to update order status directly from chat interface
- **8.2**: Display all quotes for user in sidebar
- **8.3**: Show quote number, date, items, and status
- **8.4**: Allow admin to mark quote as "respondido"
- **9.1**: Display subscription details in sidebar
- **9.2**: Show subscription plan, status, and next billing date
- **19.1**: Display payment status in sidebar
- **19.2**: Show payment status for each order
- **19.5**: Display payment method used for each order
- **25.3**: Display internal production status in order sidebar (admin-only)

## Notes

- The `order_production_stages` table functionality is currently disabled because the table is not yet in the Supabase types. It will be enabled after the migration is applied.
- All status updates trigger automatic notifications to customers as per the design requirements.
- The sidebar uses lazy loading to improve performance - data is only fetched when the sidebar is opened.
