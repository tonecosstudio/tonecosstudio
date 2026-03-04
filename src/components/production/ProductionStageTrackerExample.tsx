/**
 * ProductionStageTracker Example
 *
 * This example demonstrates how to use the ProductionStageTracker component
 * to display production progress for an order.
 */

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProductionStageTracker } from "./ProductionStageTracker";

// Create a query client for the example
const queryClient = new QueryClient();

export const ProductionStageTrackerExample: React.FC = () => {
  // Example production queue ID
  const productionQueueId = "example-queue-id";

  // Callback when a stage is completed
  const handleStageComplete = (stage: any) => {
    console.log("Stage completed:", stage);
    // You can add custom logic here, such as:
    // - Sending notifications
    // - Updating other parts of the UI
    // - Triggering analytics events
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="container mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Production Stage Tracker</h1>
          <p className="text-muted-foreground">
            Track the progress of production orders through all stages from character choice to
            shipping.
          </p>
        </div>

        {/* Basic usage */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Basic Usage</h2>
          <ProductionStageTracker productionQueueId={productionQueueId} />
        </div>

        {/* With callback */}
        <div>
          <h2 className="text-xl font-semibold mb-4">With Stage Complete Callback</h2>
          <ProductionStageTracker
            productionQueueId={productionQueueId}
            onStageComplete={handleStageComplete}
          />
        </div>

        {/* Usage notes */}
        <div className="bg-muted p-6 rounded-lg">
          <h3 className="font-semibold mb-2">Usage Notes:</h3>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>
              <strong>productionQueueId</strong>: The ID of the production queue item to track
            </li>
            <li>
              <strong>onStageComplete</strong>: Optional callback function called when a stage is
              completed
            </li>
            <li>The component automatically refreshes every 30 seconds to show real-time updates</li>
            <li>Completed stages show a checkmark and completion date</li>
            <li>The current stage is highlighted with a blue ring</li>
            <li>Blocked stages are highlighted with a red ring and show the block reason</li>
            <li>Time spent in each stage is displayed below the stage name</li>
            <li>The "Next Stage" button advances the production to the next stage</li>
            <li>The button is disabled when a stage is blocked</li>
          </ul>
        </div>

        {/* Integration example */}
        <div className="bg-muted p-6 rounded-lg">
          <h3 className="font-semibold mb-2">Integration Example:</h3>
          <pre className="bg-background p-4 rounded text-sm overflow-x-auto">
            {`import { ProductionStageTracker } from "@/components/production/ProductionStageTracker";

// In your component
function OrderDetailPage({ orderId }) {
  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(orderId),
  });

  return (
    <div>
      <h1>Order #{order.orderNumber}</h1>
      
      {/* Display production progress */}
      <ProductionStageTracker 
        productionQueueId={order.productionQueueId}
        onStageComplete={(stage) => {
          // Send notification to customer
          notifyCustomer(order.customerId, stage);
        }}
      />
    </div>
  );
}`}
          </pre>
        </div>
      </div>
    </QueryClientProvider>
  );
};

export default ProductionStageTrackerExample;
