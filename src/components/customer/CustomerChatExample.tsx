/**
 * CustomerChat Integration Example
 * 
 * This example shows how to integrate CustomerChat into your application.
 * The component should be added to the main layout so it's available on all pages.
 * 
 * Requirements: 14.1, 14.3, 14.6
 */

import { CustomerChat } from "./CustomerChat";

/**
 * Example 1: Add to main layout
 * 
 * In your main layout component (e.g., App.tsx or MainLayout.tsx):
 */
export function AppLayoutExample() {
  return (
    <div className="min-h-screen">
      {/* Your app content */}
      <header>Header</header>
      <main>Main Content</main>
      <footer>Footer</footer>

      {/* Add CustomerChat - it will render a floating button */}
      <CustomerChat />
    </div>
  );
}

/**
 * Example 2: Conditional rendering (only for authenticated users)
 * 
 * The CustomerChat component already handles authentication internally,
 * but you can also conditionally render it at the layout level:
 */
export function ConditionalChatExample() {
  // This is optional - CustomerChat already checks authentication
  const isAuthenticated = true; // Replace with your auth check

  return (
    <div className="min-h-screen">
      <main>Main Content</main>

      {/* Only render for authenticated users */}
      {isAuthenticated && <CustomerChat />}
    </div>
  );
}

/**
 * Example 3: Usage in customer dashboard
 * 
 * Add to customer-facing pages:
 */
export function CustomerDashboardExample() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Meu Painel</h1>
      
      <div className="grid gap-6">
        <div className="bg-card p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Meus Pedidos</h2>
          {/* Orders list */}
        </div>

        <div className="bg-card p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Minhas Assinaturas</h2>
          {/* Subscriptions list */}
        </div>
      </div>

      {/* Floating chat button will appear in bottom-right corner */}
      <CustomerChat />
    </div>
  );
}

/**
 * Features:
 * 
 * 1. Floating Button:
 *    - Appears in bottom-right corner
 *    - Shows unread message count badge
 *    - Opens chat panel on click
 * 
 * 2. Chat Panel:
 *    - Slides in from right side
 *    - Shows conversation history
 *    - Allows sending messages
 *    - Auto-scrolls to latest message
 * 
 * 3. Real-time Updates:
 *    - New messages appear instantly
 *    - Unread count updates automatically
 *    - Conversation list updates in real-time
 * 
 * 4. Security:
 *    - Only shows user's own conversations
 *    - Internal notes are hidden from customers
 *    - Requires authentication
 */
