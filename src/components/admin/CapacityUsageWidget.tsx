import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, Package } from "lucide-react";
import { getCapacityUsage } from "@/services/capacity-service";

/**
 * Props for the CapacityUsageWidget component
 */
interface CapacityUsageWidgetProps {
  /**
   * The ID of the cycle to display capacity for
   */
  cycleId: string;
  /**
   * Optional title for the widget (defaults to "Capacity Usage")
   */
  title?: string;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * Gets the appropriate Tailwind CSS color classes for the progress bar
 * @param percentage - The capacity usage percentage (0-100)
 * @returns Tailwind CSS class string for the progress bar color
 */
function getProgressBarColor(percentage: number): string {
  if (percentage < 70) return "bg-green-500";
  if (percentage <= 90) return "bg-yellow-500";
  return "bg-red-500";
}

/**
 * CapacityUsageWidget Component
 * 
 * Displays production capacity usage for a specific cycle with visual indicators.
 * Shows current capacity percentage, numerical values, and color-coded status.
 * 
 * Color coding:
 * - Green (<70%): Healthy capacity
 * - Yellow (70-90%): Warning - approaching capacity limit
 * - Red (>90%): Critical - near or at capacity limit
 * 
 * @example
 * ```tsx
 * <CapacityUsageWidget cycleId="cycle-123" />
 * ```
 * 
 * @example
 * ```tsx
 * <CapacityUsageWidget 
 *   cycleId="cycle-456" 
 *   title="Cycle 1 Capacity"
 *   className="mb-4"
 * />
 * ```
 */
export function CapacityUsageWidget({ 
  cycleId, 
  title = "Capacity Usage",
  className = ""
}: CapacityUsageWidgetProps) {
  // Fetch capacity data using React Query
  const { data: capacity, isLoading, error } = useQuery({
    queryKey: ["capacity-usage", cycleId],
    queryFn: () => getCapacityUsage(cycleId),
    // Refetch every 30 seconds to keep data fresh
    refetchInterval: 30000,
    // Keep previous data while refetching
    placeholderData: (previousData) => previousData,
  });

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !capacity) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">
              {error instanceof Error ? error.message : "Failed to load capacity data"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressBarColor = getProgressBarColor(capacity.percentage);

  // Determine status text and icon
  const getStatusInfo = () => {
    if (capacity.percentage < 70) {
      return {
        text: "Healthy",
        icon: <TrendingUp className="h-4 w-4" />,
        badgeVariant: "default" as const
      };
    }
    if (capacity.percentage <= 90) {
      return {
        text: "Warning",
        icon: <AlertCircle className="h-4 w-4" />,
        badgeVariant: "secondary" as const
      };
    }
    return {
      text: "Critical",
      icon: <AlertCircle className="h-4 w-4" />,
      badgeVariant: "destructive" as const
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {title}
          </span>
          <Badge variant={statusInfo.badgeVariant} className="flex items-center gap-1">
            {statusInfo.icon}
            {statusInfo.text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Usage</span>
            <span className="font-semibold">{capacity.percentage}%</span>
          </div>
          {/* Custom progress bar with color coding */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-all ${progressBarColor}`}
              style={{ width: `${capacity.percentage}%` }}
            />
          </div>
        </div>

        {/* Numerical Values */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-center flex-1">
            <p className="text-2xl font-bold">{capacity.current}</p>
            <p className="text-xs text-muted-foreground">Current</p>
          </div>
          <div className="text-center flex-1 border-l">
            <p className="text-2xl font-bold">{capacity.max}</p>
            <p className="text-xs text-muted-foreground">Maximum</p>
          </div>
          <div className="text-center flex-1 border-l">
            <p className="text-2xl font-bold">{capacity.available}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </div>
        </div>

        {/* Summary Text */}
        <div className="text-sm text-center text-muted-foreground pt-2 border-t">
          {capacity.current} / {capacity.max} pieces ({capacity.percentage}%)
        </div>
      </CardContent>
    </Card>
  );
}
