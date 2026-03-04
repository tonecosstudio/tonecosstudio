// @ts-nocheck
/**
 * Capacity Allocation Breakdown Component
 * 
 * Displays capacity allocation breakdown by collection and purchase type
 * (subscription deliveries vs standalone purchases) in both table and chart format.
 * 
 * Requirements: 16.4
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, ShoppingCart, PieChart as PieChartIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CollectionAllocation {
  collectionId: string;
  collectionName: string;
  subscriptionCount: number;
  standaloneCount: number;
  totalCount: number;
}

interface PurchaseTypeAllocation {
  type: string;
  count: number;
  percentage: number;
}

interface CapacityAllocationBreakdownProps {
  cycleId: string;
  cycleName?: string;
}

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export function CapacityAllocationBreakdown({ cycleId, cycleName }: CapacityAllocationBreakdownProps) {
  const [loading, setLoading] = useState(true);
  const [collectionAllocations, setCollectionAllocations] = useState<CollectionAllocation[]>([]);
  const [purchaseTypeAllocations, setPurchaseTypeAllocations] = useState<PurchaseTypeAllocation[]>([]);

  useEffect(() => {
    loadAllocationData();
  }, [cycleId]);

  const loadAllocationData = async () => {
    try {
      setLoading(true);

      // Fetch subscription deliveries for this cycle
      const { data: deliveries, error: deliveriesError } = await supabase
        .from("subscription_deliveries")
        .select(`
          id,
          collection_id,
          collections (
            id,
            name
          )
        `)
        .eq("cycle_id", cycleId);

      if (deliveriesError) throw deliveriesError;

      // Fetch standalone purchases for this cycle
      const { data: standalonePurchases, error: standaloneError } = await supabase
        .from("standalone_purchases")
        .select(`
          id,
          collection_id,
          collections (
            id,
            name
          )
        `)
        .eq("cycle_id", cycleId)
        .neq("status", "cancelled"); // Exclude cancelled purchases

      if (standaloneError) throw standaloneError;

      // Group by collection
      const collectionMap = new Map<string, CollectionAllocation>();

      // Process subscription deliveries
      deliveries?.forEach((delivery: any) => {
        const collectionId = delivery.collection_id;
        const collectionName = delivery.collections?.name || "Unknown Collection";

        if (!collectionMap.has(collectionId)) {
          collectionMap.set(collectionId, {
            collectionId,
            collectionName,
            subscriptionCount: 0,
            standaloneCount: 0,
            totalCount: 0,
          });
        }

        const allocation = collectionMap.get(collectionId)!;
        allocation.subscriptionCount += 1;
        allocation.totalCount += 1;
      });

      // Process standalone purchases
      standalonePurchases?.forEach((purchase: any) => {
        const collectionId = purchase.collection_id;
        const collectionName = purchase.collections?.name || "Unknown Collection";

        if (!collectionMap.has(collectionId)) {
          collectionMap.set(collectionId, {
            collectionId,
            collectionName,
            subscriptionCount: 0,
            standaloneCount: 0,
            totalCount: 0,
          });
        }

        const allocation = collectionMap.get(collectionId)!;
        allocation.standaloneCount += 1;
        allocation.totalCount += 1;
      });

      // Convert map to array and sort by total count descending
      const collectionAllocationsArray = Array.from(collectionMap.values()).sort(
        (a, b) => b.totalCount - a.totalCount
      );

      setCollectionAllocations(collectionAllocationsArray);

      // Calculate purchase type allocations
      const totalSubscriptions = deliveries?.length || 0;
      const totalStandalone = standalonePurchases?.length || 0;
      const total = totalSubscriptions + totalStandalone;

      const purchaseTypes: PurchaseTypeAllocation[] = [
        {
          type: "Subscription Deliveries",
          count: totalSubscriptions,
          percentage: total > 0 ? Math.round((totalSubscriptions / total) * 100) : 0,
        },
        {
          type: "Standalone Purchases",
          count: totalStandalone,
          percentage: total > 0 ? Math.round((totalStandalone / total) * 100) : 0,
        },
      ];

      setPurchaseTypeAllocations(purchaseTypes);
    } catch (error: any) {
      console.error("Error loading allocation data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Capacity Allocation Breakdown</CardTitle>
          <CardDescription>
            {cycleName ? `Breakdown for ${cycleName}` : "Loading breakdown..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCapacity = collectionAllocations.reduce((sum, item) => sum + item.totalCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacity Allocation Breakdown</CardTitle>
        <CardDescription>
          {cycleName
            ? `Breakdown for ${cycleName} - Total: ${totalCapacity} pieces`
            : `Total: ${totalCapacity} pieces`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="chart">Chart View</TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="space-y-6">
            {/* Purchase Type Breakdown */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                By Purchase Type
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Purchase Type</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseTypeAllocations.map((allocation) => (
                    <TableRow key={allocation.type}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {allocation.type === "Subscription Deliveries" ? (
                          <Package className="h-4 w-4 text-blue-600" />
                        ) : (
                          <ShoppingCart className="h-4 w-4 text-green-600" />
                        )}
                        {allocation.type}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {allocation.count}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                          {allocation.percentage}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {purchaseTypeAllocations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No capacity allocated yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Collection Breakdown */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" />
                By Collection
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collection</TableHead>
                    <TableHead className="text-right">Subscriptions</TableHead>
                    <TableHead className="text-right">Standalone</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">% of Capacity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectionAllocations.map((allocation) => {
                    const percentage =
                      totalCapacity > 0
                        ? Math.round((allocation.totalCount / totalCapacity) * 100)
                        : 0;

                    return (
                      <TableRow key={allocation.collectionId}>
                        <TableCell className="font-medium">
                          {allocation.collectionName}
                        </TableCell>
                        <TableCell className="text-right">
                          {allocation.subscriptionCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {allocation.standaloneCount}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {allocation.totalCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                            {percentage}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {collectionAllocations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No collections allocated yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="chart" className="space-y-6">
            {/* Purchase Type Chart */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                By Purchase Type
              </h3>
              {purchaseTypeAllocations.length > 0 && totalCapacity > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={purchaseTypeAllocations}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ type, percentage }) => `${type}: ${percentage}%`}
                    >
                      {purchaseTypeAllocations.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} pieces`, "Count"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data to display
                </div>
              )}
            </div>

            {/* Collection Chart */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                By Collection
              </h3>
              {collectionAllocations.length > 0 && totalCapacity > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={collectionAllocations}
                      dataKey="totalCount"
                      nameKey="collectionName"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ collectionName, totalCount }) =>
                        `${collectionName}: ${totalCount}`
                      }
                    >
                      {collectionAllocations.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => {
                        const data = props.payload;
                        return [
                          `Total: ${value} (Subscriptions: ${data.subscriptionCount}, Standalone: ${data.standaloneCount})`,
                          "Pieces",
                        ];
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No data to display
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
