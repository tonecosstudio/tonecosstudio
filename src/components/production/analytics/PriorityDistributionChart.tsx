import { Badge } from "@/components/ui/badge";

interface PriorityDistributionChartProps {
  data: Record<string, number>;
}

const priorityLabels: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const priorityOrder = ["critical", "high", "medium", "low"];

export function PriorityDistributionChart({ data }: PriorityDistributionChartProps) {
  const total = Object.values(data).reduce((sum, count) => sum + count, 0);
  const sortedEntries = priorityOrder
    .map(priority => [priority, data[priority] || 0] as [string, number])
    .filter(([, count]) => count > 0);

  return (
    <div className="space-y-4">
      {/* Donut Chart Simulation */}
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          {sortedEntries.map(([priority], index) => {
            return (
              <div
                key={priority}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div
                  className={`w-full h-full rounded-full ${priorityColors[priority]} opacity-${100 - index * 20}`}
                  style={{
                    width: `${100 - index * 20}%`,
                    height: `${100 - index * 20}%`,
                  }}
                />
              </div>
            );
          })}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold">{total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {sortedEntries.map(([priority, count]) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={priority} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${priorityColors[priority]}`} />
                <span className="text-sm font-medium">
                  {priorityLabels[priority] || priority}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {percentage.toFixed(0)}%
                </span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
