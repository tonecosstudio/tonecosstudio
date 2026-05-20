/**
 * LazyChart - Wrapper para lazy loading de charts
 *
 * Carrega Recharts dinamicamente apenas quando necessário,
 * reduzindo o bundle size inicial em ~350kB
 */

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { ChartDataPoint, ChartRendererConfig, ChartType } from "./ChartRenderer";

// Lazy load do componente de chart
const ChartComponent = lazy(() => import("./ChartRenderer"));

interface LazyChartProps {
  type: ChartType;
  data: ChartDataPoint[];
  config: ChartRendererConfig;
  height?: number;
}

function ChartLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[300px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function LazyChart({ type, data, config, height = 300 }: LazyChartProps) {
  return (
    <Suspense fallback={<ChartLoader />}>
      <ChartComponent type={type} data={data} config={config} height={height} />
    </Suspense>
  );
}
